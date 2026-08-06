"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PageLoading } from "@/components/ui/PageLoading";
import {
  QuizPracticePanel,
  type QuizAnswerValue,
  type QuizFeatureSettings,
  type QuizPracticeQuestion,
} from "@/components/dashboard/QuizPracticePanel";
import type { QuestionType } from "@/lib/question-types";
import { useTimer } from "@/hooks/useTimer";
import { useMockExamLeaveGuard } from "@/hooks/useMockExamLeaveGuard";

type Stage = "loading" | "quiz" | "submitting" | "error";

function MockExamSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attemptId");

  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("Mock exam");
  const [questions, setQuestions] = useState<QuizPracticeQuestion[]>([]);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [quizFeatures, setQuizFeatures] = useState<QuizFeatureSettings>({});
  const [startTime, setStartTime] = useState(Date.now());
  const [answers, setAnswers] = useState<Record<string, QuizAnswerValue>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveLeaving, setSaveLeaving] = useState(false);

  // Latest answers/questions for leave-save without stale closures
  const answersRef = useRef(answers);
  const questionsRef = useRef(questions);
  const startTimeRef = useRef(startTime);
  answersRef.current = answers;
  questionsRef.current = questions;
  startTimeRef.current = startTime;

  const guardEnabled = stage === "quiz";
  const { leaveOpen, pending, allowExit, dismissLeave } = useMockExamLeaveGuard(guardEnabled);

  useEffect(() => {
    if (!attemptId) {
      setError("No attempt ID provided.");
      setStage("error");
      return;
    }

    let cancelled = false;
    setStage("loading");
    setError(null);

    fetch(`/api/mock-exams/attempts/${attemptId}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load mock exam session.");

        if (data.status === "SUBMITTED" && data.redirectUrl) {
          allowExit();
          router.replace(data.redirectUrl);
          return;
        }

        if (cancelled) return;

        setTitle(data.title ?? "Mock exam");
        setQuestions(data.questions ?? []);
        setDurationSeconds(typeof data.durationSeconds === "number" ? data.durationSeconds : 0);
        setQuizFeatures(data.quizSettings ?? {});
        if (data.startedAt && data.durationSeconds > 0) {
          const elapsedSec = Math.max(
            0,
            Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000)
          );
          const remaining = Math.max(0, data.durationSeconds - elapsedSec);
          setDurationSeconds(remaining);
          setStartTime(new Date(data.startedAt).getTime());
        } else {
          setStartTime(Date.now());
        }
        setCurrent(0);
        setAnswers({});
        setFlagged(new Set());
        setStage("quiz");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load session.");
        setStage("error");
      });

    return () => {
      cancelled = true;
    };
  }, [attemptId, router, allowExit]);

  function handleSelectOption(questionId: string, optionId: string, questionType: QuestionType) {
    setAnswers((prev) => {
      const q = questions.find((item) => item.id === questionId);
      const correctCount = q?.correctOptionIds?.length ?? 0;
      const multiFromData = correctCount > 1 || questionType === "MULTIPLE_CHOICE";
      if (multiFromData) {
        const currentAns = Array.isArray(prev[questionId])
          ? prev[questionId]
          : typeof prev[questionId] === "string" && prev[questionId]
            ? [prev[questionId] as string]
            : [];
        if (currentAns.includes(optionId)) {
          return { ...prev, [questionId]: currentAns.filter((id) => id !== optionId) };
        }
        const maxSelect = correctCount > 1 ? correctCount : 2;
        if (currentAns.length >= maxSelect) {
          return { ...prev, [questionId]: [...currentAns.slice(1), optionId] };
        }
        return { ...prev, [questionId]: [...currentAns, optionId] };
      }
      return { ...prev, [questionId]: optionId };
    });
  }

  const buildAnswerPayload = useCallback(() => {
    const qs = questionsRef.current;
    const ans = answersRef.current;
    return qs.map((q) => {
      const answer = ans[q.id];
      const isMulti =
        q.questionType === "MULTIPLE_CHOICE" || (q.correctOptionIds?.length ?? 0) > 1;
      if (isMulti) {
        const ids = Array.isArray(answer)
          ? answer
          : typeof answer === "string" && answer
            ? [answer]
            : [];
        return {
          questionId: q.id,
          selectedOptionId: null as string | null,
          selectedOptionIds: ids,
        };
      }
      return {
        questionId: q.id,
        selectedOptionId: typeof answer === "string" ? answer : null,
        selectedOptionIds: [] as string[],
      };
    });
  }, []);

  const persistAttempt = useCallback(async () => {
    if (!attemptId) throw new Error("Missing attempt");
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    const res = await fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attemptId,
        answers: buildAnswerPayload(),
        durationSec: elapsed,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not save mock exam.");
    return data;
  }, [attemptId, buildAnswerPayload]);

  const submitQuiz = useCallback(async () => {
    if (!attemptId || stage === "submitting") return;
    setStage("submitting");
    setSubmitError(null);
    try {
      await persistAttempt();
      allowExit();
      router.push(`/dashboard/quiz/result?attemptId=${attemptId}&mockExam=1`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not submit mock exam.");
      setStage("quiz");
    }
  }, [attemptId, stage, persistAttempt, allowExit, router]);

  /** Confirm leave from popup: record/save answers, then navigate away. */
  async function confirmLeaveAndSave() {
    if (!attemptId) return;
    setSaveLeaving(true);
    setSubmitError(null);
    try {
      setStage("submitting");
      await persistAttempt();
      allowExit();
      dismissLeave();
      if (pending?.kind === "href") {
        window.location.assign(pending.href);
      } else {
        router.push(`/dashboard/quiz/result?attemptId=${attemptId}&mockExam=1`);
      }
    } catch (err) {
      setStage("quiz");
      setSubmitError(err instanceof Error ? err.message : "Could not save your answers.");
      dismissLeave();
    } finally {
      setSaveLeaving(false);
    }
  }

  const { formatted, isLow } = useTimer(
    durationSeconds,
    durationSeconds > 0 ? submitQuiz : undefined,
    timerPaused
  );

  if (stage === "loading") {
    return <PageLoading message="Loading mock exam…" />;
  }

  if (stage === "submitting" && !leaveOpen) {
    return <PageLoading message="Grading your mock exam…" />;
  }

  if (stage === "error" || !attemptId) {
    return (
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <EmptyState
          title="Mock exam session not found"
          description="Start a mock exam from the mock exams list, or go back and try again."
          actionLabel="Back to Mock Exams"
          actionHref="/dashboard/mock-exams"
        />
      </div>
    );
  }

  const q = questions[current];
  if (stage === "quiz" && !q) {
    return (
      <div className="space-y-4">
        <Alert tone="error">This mock exam has no questions to display.</Alert>
        <Link
          href="/dashboard/mock-exams"
          className="inline-flex text-sm font-medium text-brand-600 hover:underline"
        >
          Back to Mock Exams
        </Link>
      </div>
    );
  }

  return (
    <>
      {stage === "quiz" && q && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-brand-700">{title}</p>
          {submitError && <Alert tone="error">{submitError}</Alert>}
          <QuizPracticePanel
            questions={questions}
            current={current}
            onCurrentChange={setCurrent}
            answers={answers}
            onAnswer={handleSelectOption}
            flagged={flagged}
            onToggleFlag={(questionId) => {
              setFlagged((prev) => {
                const next = new Set(prev);
                if (next.has(questionId)) next.delete(questionId);
                else next.add(questionId);
                return next;
              });
            }}
            durationLabel={durationSeconds > 0 ? `⏱ ${formatted}` : "Untimed"}
            durationLow={durationSeconds > 0 ? isLow : false}
            onSubmit={submitQuiz}
            submitError={submitError}
            onTimerPausedChange={setTimerPaused}
            features={{
              ...quizFeatures,
              allowAnswerReview: false,
              allowDifficultyRating: false,
              showExplanationAfterCheck: false,
            }}
            finalSubmitLabel="Submit Mock Exam"
          />
        </div>
      )}

      {stage === "submitting" && leaveOpen && (
        <PageLoading message="Saving your mock exam…" />
      )}

      <Modal
        open={leaveOpen}
        onClose={() => {
          if (!saveLeaving) dismissLeave();
        }}
        title="Leave mock exam?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600">
            Your mock exam is still in progress. If you leave now (sidebar, Back, or another page),
            this attempt will be <span className="font-semibold text-ink-900">recorded</span> and
            your answers so far will be <span className="font-semibold text-ink-900">saved</span>.
          </p>
          <p className="text-sm text-slate-500">
            Closing or refreshing this tab will also show a browser warning — stay until you finish
            or save deliberately.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={dismissLeave} disabled={saveLeaving}>
              Stay on exam
            </Button>
            <Button onClick={() => void confirmLeaveAndSave()} disabled={saveLeaving}>
              {saveLeaving ? "Saving…" : "Leave & save progress"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function MockExamSessionPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading mock exam…" />}>
      <MockExamSessionContent />
    </Suspense>
  );
}
