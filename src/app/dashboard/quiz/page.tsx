"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { PracticeOptionsModal, type PracticeStartOptions } from "@/components/dashboard/PracticeOptionsModal";
import { useTimer } from "@/hooks/useTimer";
import type { ReviewMode } from "@/lib/practice";
import { cn } from "@/lib/utils";

interface Paper {
  id: string;
  code: string;
  title: string;
  topicCount: number;
  isPremium?: boolean;
  isLocked?: boolean;
  hasAccess?: boolean;
}
interface Topic { id: string; title: string; questionCount: number; }
interface QuizOption { id: string; text: string; }
interface QuizQuestion {
  id: string;
  text: string;
  topicTitle: string;
  options: QuizOption[];
  imageUrl?: string;
  explanation?: string | null;
  correctOptionId?: string | null;
}

type Stage = "select-paper" | "select-topic" | "quiz" | "submitting";
type ModalTarget = { type: "mixed" } | { type: "topic"; topic: Topic };

export default function QuizPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("select-paper");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [totalQuestionCount, setTotalQuestionCount] = useState(0);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  const [modalTarget, setModalTarget] = useState<ModalTarget | null>(null);
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const [attemptId, setAttemptId] = useState<string>("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [reviewMode, setReviewMode] = useState<ReviewMode>("at_end");
  const [startTime, setStartTime] = useState<number>(0);

  useEffect(() => {
    fetch("/api/papers").then((r) => r.json()).then(setPapers);
  }, []);

  async function selectPaper(paper: Paper) {
    if (paper.isLocked) {
      router.push("/dashboard/pricing");
      return;
    }

    setSelectedPaper(paper);
    setTopics([]);
    setTotalQuestionCount(0);
    setTopicsLoading(true);
    setStage("select-topic");

    try {
      const res = await fetch(`/api/papers/${paper.id}/topics`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load topics");
      const topicList: Topic[] = Array.isArray(data) ? data : data.topics ?? [];
      setTopics(topicList);
      setTotalQuestionCount(topicList.reduce((sum, t) => sum + t.questionCount, 0));
    } catch {
      setTopics([]);
      setTotalQuestionCount(0);
    } finally {
      setTopicsLoading(false);
    }
  }

  function openPracticeModal(target: ModalTarget) {
    setStartError(null);
    setModalTarget(target);
    if (target.type === "topic") {
      setSelectedTopic(target.topic);
    } else {
      setSelectedTopic(null);
    }
  }

  function closePracticeModal() {
    if (startLoading) return;
    setModalTarget(null);
    setStartError(null);
  }

  function getModalAvailableCount(): number {
    if (!modalTarget) return 0;
    if (modalTarget.type === "mixed") return totalQuestionCount;
    return modalTarget.topic.questionCount;
  }

  function getModalTopicTitle(): string {
    if (!modalTarget) return "";
    if (modalTarget.type === "mixed") return "All topics mixed";
    return modalTarget.topic.title;
  }

  async function startQuiz(options: PracticeStartOptions) {
    if (!selectedPaper) return;

    setStartLoading(true);
    setStartError(null);

    try {
      const res = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId: selectedPaper.id,
          topicId: selectedTopic?.id,
          limit: options.questionCount,
          durationSeconds: options.durationSeconds,
          reviewMode: options.reviewMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "ACCESS_DENIED") {
          router.push(data.upgradeUrl ?? "/dashboard/pricing");
          return;
        }
        setStartError(data.error ?? "Could not start practice session.");
        return;
      }

      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setDurationSeconds(data.durationSeconds ?? 0);
      setReviewMode(data.reviewMode ?? "at_end");
      setStartTime(Date.now());
      setAnswers({});
      setFlagged(new Set());
      setCurrent(0);
      setModalTarget(null);
      setStage("quiz");
    } catch {
      setStartError("Something went wrong. Please try again.");
    } finally {
      setStartLoading(false);
    }
  }

  const submitQuiz = useCallback(async () => {
    if (stage === "submitting") return;
    setStage("submitting");
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const payload = questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: answers[q.id] ?? null,
    }));
    await fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId, answers: payload, durationSec: elapsed }),
    });
    router.push(`/dashboard/quiz/result?attemptId=${attemptId}`);
  }, [stage, answers, questions, attemptId, startTime, router]);

  const { formatted, isLow } = useTimer(durationSeconds, durationSeconds > 0 ? submitQuiz : undefined);

  const q = questions[current];
  const answered = Object.keys(answers).length;
  const modalOpen = modalTarget !== null && selectedPaper !== null;

  /* ---------- PAPER SELECTION ---------- */
  if (stage === "select-paper") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Practice</h1>
          <p className="mt-1 text-sm text-slate-500">Choose an ACCA paper to practise.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {papers.map((p) => (
            <button
              key={p.id}
              onClick={() => selectPaper(p)}
              className={cn(
                "relative rounded-xl border bg-white p-5 text-left shadow-card transition-all",
                p.isLocked
                  ? "border-slate-200 hover:border-amber-300"
                  : "border-slate-200 hover:border-brand-300 hover:shadow-panel"
              )}
            >
              {p.isLocked && (
                <span className="absolute right-3 top-3">
                  <Badge tone="warning">🔒 Locked</Badge>
                </span>
              )}
              {p.isPremium && !p.isLocked && (
                <span className="absolute right-3 top-3">
                  <Badge tone="brand">Premium</Badge>
                </span>
              )}
              <div className="text-2xl font-bold text-brand-600">{p.code}</div>
              <div className="mt-1 text-sm font-medium text-slate-800">{p.title}</div>
              <div className="mt-2 text-xs text-slate-400">{p.topicCount} topics</div>
              {p.isLocked && (
                <p className="mt-2 text-xs font-medium text-amber-600">Upgrade to unlock</p>
              )}
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-slate-500">
          Need premium access?{" "}
          <Link href="/dashboard/pricing" className="font-medium text-brand-600 hover:text-brand-700">
            View pricing
          </Link>
        </p>
      </div>
    );
  }

  /* ---------- TOPIC SELECTION ---------- */
  if (stage === "select-topic") {
    const mixedDisabled = totalQuestionCount === 0;

    return (
      <>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setStage("select-paper")} className="text-sm text-brand-600 hover:underline">
              ← Papers
            </button>
            <h1 className="text-2xl font-bold text-ink-900">
              {selectedPaper?.code} – {selectedPaper?.title}
            </h1>
          </div>
          <p className="text-sm text-slate-500">Pick a topic or practise all topics mixed.</p>

          {topicsLoading ? (
            <div className="flex h-40 items-center justify-center gap-2 text-sm text-slate-500">
              <Spinner className="h-5 w-5 text-brand-600" />
              Loading topics…
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => !mixedDisabled && openPracticeModal({ type: "mixed" })}
                disabled={mixedDisabled}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-colors",
                  mixedDisabled
                    ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                    : "border-brand-200 bg-brand-50 hover:border-brand-400"
                )}
              >
                <div className="font-semibold text-brand-700">All topics mixed</div>
                <div className="mt-1 text-sm text-slate-500">Random questions from all chapters</div>
                <div className="mt-2 text-xs font-medium text-slate-500">
                  {mixedDisabled
                    ? "No questions available yet"
                    : `${totalQuestionCount} question${totalQuestionCount === 1 ? "" : "s"} available`}
                </div>
              </button>

              {topics.map((t) => {
                const disabled = t.questionCount === 0;
                return (
                  <button
                    key={t.id}
                    onClick={() => !disabled && openPracticeModal({ type: "topic", topic: t })}
                    disabled={disabled}
                    className={cn(
                      "rounded-xl border p-4 text-left shadow-card transition-colors",
                      disabled
                        ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                        : "border-slate-200 bg-white hover:border-brand-300"
                    )}
                  >
                    <div className="font-medium text-slate-800">{t.title}</div>
                    <div className="mt-2 text-xs font-medium text-slate-500">
                      {disabled
                        ? "No questions available yet"
                        : `${t.questionCount} question${t.questionCount === 1 ? "" : "s"} available`}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedPaper && (
          <PracticeOptionsModal
            open={modalOpen}
            onClose={closePracticeModal}
            paper={{ code: selectedPaper.code, title: selectedPaper.title }}
            topicTitle={getModalTopicTitle()}
            availableCount={getModalAvailableCount()}
            loading={startLoading}
            error={startError}
            onStart={startQuiz}
          />
        )}
      </>
    );
  }

  /* ---------- QUIZ ENGINE ---------- */
  if (stage === "quiz" && q) {
    const selectedAnswer = answers[q.id];
    const showExplanation =
      reviewMode === "after_each" && selectedAnswer && (q.explanation || q.correctOptionId);

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            Question <span className="font-semibold text-slate-800">{current + 1}</span> of{" "}
            <span className="font-semibold">{questions.length}</span>
          </div>
          <div
            className={cn(
              "w-fit rounded-lg px-4 py-1.5 text-sm font-bold",
              durationSeconds > 0
                ? isLow
                  ? "bg-red-50 text-red-600"
                  : "bg-slate-100 text-slate-700"
                : "bg-slate-100 text-slate-500"
            )}
          >
            {durationSeconds > 0 ? `⏱ ${formatted}` : "Untimed"}
          </div>
          <div className="text-sm text-slate-500">
            Answered: {answered}/{questions.length}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="mb-2">
                  <span className="text-xs text-slate-400">{q.topicTitle}</span>
                </div>
                <p className="text-base font-medium leading-relaxed text-slate-800">{q.text}</p>
              </div>
              <button
                onClick={() =>
                  setFlagged((prev) => {
                    const n = new Set(prev);
                    n.has(q.id) ? n.delete(q.id) : n.add(q.id);
                    return n;
                  })
                }
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  flagged.has(q.id)
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-500 hover:bg-amber-50"
                )}
              >
                {flagged.has(q.id) ? "⚑ Flagged" : "⚐ Flag"}
              </button>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {q.options.map((opt, idx) => {
              const selected = answers[q.id] === opt.id;
              const isCorrect = reviewMode === "after_each" && selectedAnswer && opt.id === q.correctOptionId;
              const isWrong =
                reviewMode === "after_each" &&
                selectedAnswer === opt.id &&
                q.correctOptionId &&
                opt.id !== q.correctOptionId;

              return (
                <button
                  key={opt.id}
                  onClick={() => setAnswers({ ...answers, [q.id]: opt.id })}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left text-sm transition-all",
                    isCorrect && "border-emerald-500 bg-emerald-50",
                    isWrong && "border-red-400 bg-red-50",
                    !isCorrect && !isWrong && selected && "border-brand-500 bg-brand-50",
                    !isCorrect && !isWrong && !selected && "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      selected ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {["A", "B", "C", "D"][idx]}
                  </span>
                  <span className={selected ? "font-medium text-brand-800" : "text-slate-700"}>{opt.text}</span>
                </button>
              );
            })}

            {showExplanation && (
              <div className="mt-2 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-slate-700">
                <p className="font-medium text-brand-800">Explanation</p>
                <p className="mt-1">
                  {q.explanation ?? "No explanation provided for this question."}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" disabled={current === 0} onClick={() => setCurrent(current - 1)}>
            ← Previous
          </Button>
          <div className="flex flex-wrap justify-center gap-2">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  "h-7 w-7 rounded-full text-xs font-medium transition-colors",
                  i === current
                    ? "bg-brand-600 text-white"
                    : answers[questions[i].id]
                      ? "bg-emerald-100 text-emerald-700"
                      : flagged.has(questions[i].id)
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {current < questions.length - 1 ? (
            <Button onClick={() => setCurrent(current + 1)}>Next →</Button>
          ) : (
            <Button variant="secondary" onClick={submitQuiz}>
              Submit Quiz
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (stage === "submitting") {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-slate-500">
        <Spinner className="h-6 w-6 text-brand-600" />
        Grading your answers…
      </div>
    );
  }

  return null;
}
