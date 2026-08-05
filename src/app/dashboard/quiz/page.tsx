"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { PageLoading } from "@/components/ui/PageLoading";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { PracticeOptionsModal, type PracticeStartOptions } from "@/components/dashboard/PracticeOptionsModal";
import { PracticeJourney } from "@/components/dashboard/PracticeJourney";
import {
  QuizPracticePanel,
  type QuizAnswerValue,
  type QuizFeatureSettings,
} from "@/components/dashboard/QuizPracticePanel";
import type { QuestionType } from "@/lib/question-types";
import { useTimer } from "@/hooks/useTimer";
import { cn } from "@/lib/utils";

interface Part {
  id: string;
  code: string;
  title: string;
  description: string | null;
  paperCount: number;
}
interface Paper {
  id: string;
  code: string;
  title: string;
  categoryCount: number;
  freeQuestionCount?: number;
  premiumQuestionCount?: number;
  totalQuestionCount?: number;
  accessibleQuestionCount?: number;
  hasFreeTrialQuestions?: boolean;
  hasPremiumQuestionAccess?: boolean;
  isPremiumSubscriber?: boolean;
  isPremium?: boolean;
  isLocked?: boolean;
  hasNoPracticeQuestions?: boolean;
  hasAccess?: boolean;
}
interface Category {
  id: string;
  title: string;
  subCategoryCount: number;
}
interface SubCategory {
  id: string;
  title: string;
  freeQuestionCount: number;
  premiumQuestionCount: number;
  totalQuestionCount: number;
  accessibleQuestionCount: number;
  questionCount: number;
}
interface QuizOption {
  id: string;
  text: string;
  order?: number;
  label?: string;
}
interface QuizQuestion {
  id: string;
  text: string;
  questionType: QuestionType;
  categoryTitle: string;
  subCategoryTitle: string;
  options: QuizOption[];
  imageUrl?: string;
  explanation?: string | null;
  explanationMy?: string | null;
  correctOptionId?: string | null;
  correctOptionIds?: string[];
}

type Stage = "select-part" | "select-paper" | "select-category" | "select-subcategory" | "quiz" | "submitting";

export default function QuizPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("select-part");
  const [parts, setParts] = useState<Part[]>([]);
  const [partsLoading, setPartsLoading] = useState(true);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [papersLoading, setPapersLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [subCategoriesLoading, setSubCategoriesLoading] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const [attemptId, setAttemptId] = useState<string>("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizAnswerValue>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timerPaused, setTimerPaused] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [quizFeatures, setQuizFeatures] = useState<QuizFeatureSettings>({});
  const [startTime, setStartTime] = useState<number>(0);

  const [partsError, setPartsError] = useState<string | null>(null);
  const [papersError, setPapersError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const deepLinkApplied = useRef(false);

  useEffect(() => {
    setPartsLoading(true);
    setPartsError(null);
    fetch("/api/parts", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Could not load parts");
        if (!Array.isArray(data)) throw new Error("Invalid parts response");
        setParts(data);
      })
      .catch((err) => {
        setParts([]);
        setPartsError(err instanceof Error ? err.message : "Could not load parts");
      })
      .finally(() => setPartsLoading(false));
  }, []);

  async function selectPart(part: Part) {
    setSelectedPart(part);
    setSelectedPaper(null);
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setCategories([]);
    setSubCategories([]);
    setPapers([]);
    setPapersLoading(true);
    setPapersError(null);
    setStage("select-paper");

    try {
      const res = await fetch(`/api/papers?partId=${part.id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load papers");
      setPapers(Array.isArray(data) ? data : []);
    } catch (err) {
      setPapers([]);
      setPapersError(err instanceof Error ? err.message : "Could not load papers");
    } finally {
      setPapersLoading(false);
    }
  }

  async function selectPaper(paper: Paper) {
    if (paper.isLocked) return;

    setSelectedPaper(paper);
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setCategories([]);
    setSubCategories([]);
    setCategoriesLoading(true);
    setCategoriesError(null);
    setStage("select-category");

    try {
      const res = await fetch(`/api/papers/${paper.id}/categories`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load categories");
      const categoryList: Category[] = Array.isArray(data) ? data : data.categories ?? [];
      setCategories(categoryList);
    } catch (err) {
      setCategories([]);
      setCategoriesError(err instanceof Error ? err.message : "Could not load categories");
    } finally {
      setCategoriesLoading(false);
    }
  }

  async function selectCategory(category: Category) {
    setSelectedCategory(category);
    setSelectedSubCategory(null);
    setSubCategories([]);
    setSubCategoriesLoading(true);
    setStage("select-subcategory");

    try {
      const res = await fetch(`/api/categories/${category.id}/subcategories`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load sub categories");
      const subCategoryList: SubCategory[] = Array.isArray(data) ? data : data.subCategories ?? [];
      setSubCategories(subCategoryList);
    } catch {
      setSubCategories([]);
    } finally {
      setSubCategoriesLoading(false);
    }
  }

  useEffect(() => {
    if (deepLinkApplied.current || partsLoading || parts.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const partId = params.get("partId");
    const paperId = params.get("paperId");
    const categoryId = params.get("categoryId");
    const subCategoryId = params.get("subCategoryId");

    if (!partId && !paperId) return;

    deepLinkApplied.current = true;

    async function applyDeepLink() {
      try {
        let part = partId ? parts.find((p) => p.id === partId) ?? null : null;

        if (!part && paperId) {
          const allPapersRes = await fetch("/api/papers");
          const allPapers = await allPapersRes.json();
          if (Array.isArray(allPapers)) {
            const match = allPapers.find((p: Paper & { partId?: string }) => p.id === paperId);
            if (match?.partId) {
              part = parts.find((p) => p.id === match.partId) ?? null;
            }
          }
        }

        if (!part) return;

        setSelectedPart(part);
        setPapersLoading(true);
        setPapersError(null);
        setStage("select-paper");

        const papersRes = await fetch(`/api/papers?partId=${part.id}`, { cache: "no-store" });
        const papersData = await papersRes.json();
        if (!papersRes.ok) throw new Error(papersData.error ?? "Could not load papers");
        const paperList: Paper[] = Array.isArray(papersData) ? papersData : [];
        setPapers(paperList);
        setPapersLoading(false);

        if (!paperId) return;

        const paper = paperList.find((p) => p.id === paperId);
        if (!paper || paper.isLocked) return;

        setSelectedPaper(paper);
        setCategoriesLoading(true);
        setCategoriesError(null);
        setStage("select-category");

        const catRes = await fetch(`/api/papers/${paper.id}/categories`);
        const catData = await catRes.json();
        if (!catRes.ok) throw new Error(catData.error ?? "Could not load categories");
        const categoryList: Category[] = Array.isArray(catData) ? catData : catData.categories ?? [];
        setCategories(categoryList);
        setCategoriesLoading(false);

        if (!categoryId) return;

        const category = categoryList.find((c) => c.id === categoryId);
        if (!category) return;

        setSelectedCategory(category);
        setSubCategoriesLoading(true);
        setStage("select-subcategory");

        const subRes = await fetch(`/api/categories/${category.id}/subcategories`);
        const subData = await subRes.json();
        if (!subRes.ok) throw new Error(subData.error ?? "Could not load sub categories");
        const subList: SubCategory[] = Array.isArray(subData) ? subData : subData.subCategories ?? [];
        setSubCategories(subList);
        setSubCategoriesLoading(false);

        if (!subCategoryId) return;

        const sub = subList.find((s) => s.id === subCategoryId);
        if (!sub || sub.accessibleQuestionCount === 0) return;

        setSelectedSubCategory(sub);
        setModalOpen(true);
      } catch {
        // Deep link is best-effort; user can still browse manually.
      }
    }

    void applyDeepLink();
  }, [partsLoading, parts]);

  function openPracticeModal(subCategory: SubCategory) {
    setSelectedSubCategory(subCategory);
    setStartError(null);
    setModalOpen(true);
  }

  function closePracticeModal() {
    if (startLoading) return;
    setModalOpen(false);
    setStartError(null);
  }

  async function startQuiz(options: PracticeStartOptions) {
    if (!selectedPaper || !selectedSubCategory) return;

    setStartLoading(true);
    setStartError(null);

    try {
      const res = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId: selectedPaper.id,
          subCategoryId: selectedSubCategory.id,
          limit: options.questionCount,
          durationSeconds: options.durationSeconds,
          reviewMode: "at_end",
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
      setQuizFeatures(data.quizSettings ?? {});
      setStartTime(Date.now());
      setAnswers({});
      setFlagged(new Set());
      setTimerPaused(false);
      setCurrent(0);
      setModalOpen(false);
      setStage("quiz");
    } catch {
      setStartError("Something went wrong. Please try again.");
    } finally {
      setStartLoading(false);
    }
  }

  function handleSelectOption(questionId: string, optionId: string, questionType: QuestionType) {
    setAnswers((prev) => {
      const q = questions.find((item) => item.id === questionId);
      const correctCount = q?.correctOptionIds?.length ?? 0;
      const multiFromData = correctCount > 1 || questionType === "MULTIPLE_CHOICE";
      if (multiFromData) {
        const current = Array.isArray(prev[questionId])
          ? prev[questionId]
          : typeof prev[questionId] === "string" && prev[questionId]
            ? [prev[questionId] as string]
            : [];
        // Toggle off if already selected
        if (current.includes(optionId)) {
          return { ...prev, [questionId]: current.filter((id) => id !== optionId) };
        }
        // Cap at number of correct answers (usually 2). At the limit, replace
        // the oldest pick so students can change an answer without deselecting first.
        const maxSelect = correctCount > 1 ? correctCount : 2;
        if (current.length >= maxSelect) {
          return { ...prev, [questionId]: [...current.slice(1), optionId] };
        }
        return { ...prev, [questionId]: [...current, optionId] };
      }
      return { ...prev, [questionId]: optionId };
    });
  }

  const submitQuiz = useCallback(async () => {
    if (stage === "submitting") return;
    setStage("submitting");
    setSubmitError(null);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const payload = questions.map((q) => {
      const answer = answers[q.id];
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
          selectedOptionId: null,
          selectedOptionIds: ids,
        };
      }
      return {
        questionId: q.id,
        selectedOptionId: typeof answer === "string" ? answer : null,
        selectedOptionIds: [],
      };
    });
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, answers: payload, durationSec: elapsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not submit quiz.");
      }
      router.push(`/dashboard/quiz/result?attemptId=${attemptId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not submit quiz.");
      setStage("quiz");
    }
  }, [stage, answers, questions, attemptId, startTime, router]);

  const { formatted, isLow } = useTimer(
    durationSeconds,
    durationSeconds > 0 ? submitQuiz : undefined,
    timerPaused
  );

  const q = questions[current];

  function toggleFlag(questionId: string) {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  const isPremiumSubscriber = papers.some((p) => p.isPremiumSubscriber);

  /* ---------- PART SELECTION ---------- */
  if (stage === "select-part") {
    return (
      <div className="space-y-6">
        <PracticeJourney
          steps={[{ label: "Practice" }]}
          currentStep={0}
          title="Practice"
          description="Choose an ACCA qualification part to begin your journey."
        />

        {partsLoading ? (
          <PageLoading message="Loading parts…" className="h-40" />
        ) : partsError ? (
          <Alert tone="error">{partsError}</Alert>
        ) : parts.length === 0 ? (
          <EmptyState
            compact
            title="No parts available"
            description="ACCA parts will appear here once your admin adds them."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {parts.map((part) => (
              <button
                key={part.id}
                onClick={() => selectPart(part)}
                disabled={part.paperCount === 0}
                className={cn(
                  "rounded-xl border bg-white p-5 text-left shadow-card transition-all",
                  part.paperCount === 0
                    ? "cursor-not-allowed border-slate-200 opacity-60"
                    : "border-slate-200 hover:border-brand-300 hover:shadow-panel"
                )}
              >
                <div className="text-lg font-bold text-brand-600">{part.title}</div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {part.code.replace("_", " ")}
                </div>
                {part.description && (
                  <p className="mt-2 text-sm text-slate-500 line-clamp-2">{part.description}</p>
                )}
                <div className="mt-3 text-xs font-medium text-slate-600">
                  {part.paperCount} paper{part.paperCount === 1 ? "" : "s"}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ---------- PAPER SELECTION ---------- */
  if (stage === "select-paper") {
    return (
      <div className="space-y-6">
        <PracticeJourney
          steps={[
            { label: "Parts", onClick: () => setStage("select-part") },
            { label: selectedPart?.title ?? "Paper" },
          ]}
          currentStep={1}
          title={selectedPart?.title ?? "Select Paper"}
          description="Choose a paper to practise."
        />

          {isPremiumSubscriber && (
            <p className="text-sm font-medium text-emerald-700">
              Premium subscriber — full access to all questions on every paper.
            </p>
          )}

        {papersLoading ? (
          <PageLoading message="Loading papers…" className="h-40" />
        ) : papersError ? (
          <Alert tone="error">{papersError}</Alert>
        ) : papers.length === 0 ? (
          <EmptyState compact title="No papers available" description="No papers are available for this part yet." />
        ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {papers.map((p) => {
            const unavailable = Boolean(p.hasNoPracticeQuestions) || (p.accessibleQuestionCount ?? 0) === 0;
            const paywalled = Boolean(p.isLocked);
            return (
            <button
              key={p.id}
              onClick={() => selectPaper(p)}
              disabled={unavailable}
              className={cn(
                "relative rounded-xl border bg-white p-5 text-left shadow-card transition-all",
                unavailable
                  ? "cursor-not-allowed border-slate-200 opacity-70"
                  : "border-slate-200 hover:border-brand-300 hover:shadow-panel"
              )}
            >
              {paywalled && (
                <span className="absolute right-3 top-3">
                  <Badge tone="warning">🔒 Locked</Badge>
                </span>
              )}
              {!unavailable && p.hasPremiumQuestionAccess && (
                <span className="absolute right-3 top-3">
                  <Badge tone="success">Full access</Badge>
                </span>
              )}
              {!unavailable && !p.hasPremiumQuestionAccess && p.hasFreeTrialQuestions && (
                <span className="absolute right-3 top-3">
                  <Badge tone="success">Free trial</Badge>
                </span>
              )}
              <div className="text-2xl font-bold text-brand-600">{p.code}</div>
              <div className="mt-1 text-sm font-medium text-slate-800">{p.title}</div>
              <div className="mt-2 text-xs text-slate-400">{p.categoryCount} categories</div>
              {!unavailable && (p.accessibleQuestionCount ?? 0) > 0 && (
                <div className="mt-2 text-xs font-medium text-slate-600">
                  {p.accessibleQuestionCount} question{(p.accessibleQuestionCount ?? 0) === 1 ? "" : "s"} available to you
                </div>
              )}
              {!unavailable && !p.hasPremiumQuestionAccess && (p.premiumQuestionCount ?? 0) > 0 && (
                <div className="mt-1 text-xs text-slate-400">
                  Free {p.freeQuestionCount ?? 0} · Premium {p.premiumQuestionCount ?? 0} locked
                </div>
              )}
              {paywalled && (
                <p className="mt-2 text-xs font-medium text-amber-600">
                  Premium required —{" "}
                  <Link href="/dashboard/pricing" className="underline hover:text-amber-700">
                    upgrade to unlock
                  </Link>
                </p>
              )}
              {p.hasNoPracticeQuestions && !paywalled && (
                <p className="mt-2 text-xs font-medium text-amber-600">No practice questions available</p>
              )}
            </button>
            );
          })}
        </div>
        )}
        {!isPremiumSubscriber && (
          <p className="text-center text-sm text-slate-500">
            Need premium access?{" "}
            <Link href="/dashboard/pricing" className="font-medium text-brand-600 hover:text-brand-700">
              View pricing
            </Link>
          </p>
        )}
      </div>
    );
  }

  /* ---------- CATEGORY SELECTION ---------- */
  if (stage === "select-category") {
    return (
      <div className="space-y-6">
        <PracticeJourney
          steps={[
            { label: "Parts", onClick: () => setStage("select-part") },
            { label: selectedPart?.title ?? "Part", onClick: () => setStage("select-paper") },
            { label: selectedPaper?.code ?? "Category" },
          ]}
          currentStep={2}
          title={`${selectedPaper?.code} – ${selectedPaper?.title}`}
          description="Pick a category to continue."
        />

        {categoriesLoading ? (
          <PageLoading message="Loading categories…" className="h-40" />
        ) : categoriesError ? (
          <Alert tone="error">{categoriesError}</Alert>
        ) : categories.length === 0 ? (
          <EmptyState
            compact
            title="No categories yet"
            description="No categories are available for this paper yet."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => selectCategory(c)}
                className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-card transition-colors hover:border-brand-300"
              >
                <div className="font-medium text-slate-800">{c.title}</div>
                <div className="mt-2 text-xs font-medium text-slate-500">
                  {c.subCategoryCount} sub categor{c.subCategoryCount === 1 ? "y" : "ies"}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ---------- SUB CATEGORY SELECTION ---------- */
  if (stage === "select-subcategory") {
    return (
      <>
        <div className="space-y-6">
          <PracticeJourney
            steps={[
              { label: "Parts", onClick: () => setStage("select-part") },
              { label: selectedPart?.title ?? "Part", onClick: () => setStage("select-paper") },
              { label: selectedPaper?.code ?? "Paper", onClick: () => setStage("select-category") },
              { label: selectedCategory?.title ?? "Topic" },
            ]}
            currentStep={3}
            title={selectedCategory?.title ?? "Select Topic"}
            description="Pick a sub category to start practising."
          />

          {subCategoriesLoading ? (
            <PageLoading message="Loading sub categories…" className="h-40" />
          ) : subCategories.length === 0 ? (
            <EmptyState
              compact
              title="No sub categories yet"
              description="No sub categories are available for this category yet."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {subCategories.map((sc) => {
                const disabled = sc.accessibleQuestionCount === 0;
                return (
                  <button
                    key={sc.id}
                    onClick={() => !disabled && openPracticeModal(sc)}
                    disabled={disabled}
                    className={cn(
                      "rounded-xl border p-4 text-left shadow-card transition-colors",
                      disabled
                        ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                        : "border-slate-200 bg-white hover:border-brand-300"
                    )}
                  >
                    <div className="font-medium text-slate-800">{sc.title}</div>
                    <div className="mt-2 text-xs font-medium text-slate-500">
                      {disabled
                        ? sc.totalQuestionCount > 0
                          ? sc.premiumQuestionCount > 0 && sc.freeQuestionCount === 0
                            ? "Premium questions only — upgrade required"
                            : "No active practice questions yet"
                        : "No practice questions available"
                        : `${sc.accessibleQuestionCount} available · Free ${sc.freeQuestionCount} · Premium ${sc.premiumQuestionCount} · Total ${sc.totalQuestionCount}`}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedPaper && selectedSubCategory && (
          <PracticeOptionsModal
            open={modalOpen}
            onClose={closePracticeModal}
            paper={{ code: selectedPaper.code, title: selectedPaper.title }}
            subCategoryTitle={selectedSubCategory.title}
            freeQuestionCount={selectedSubCategory.freeQuestionCount}
            premiumQuestionCount={selectedSubCategory.premiumQuestionCount}
            totalQuestionCount={selectedSubCategory.totalQuestionCount}
            availableCount={selectedSubCategory.accessibleQuestionCount}
            hasPremiumAccess={selectedPaper.hasPremiumQuestionAccess}
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
    return (
      <QuizPracticePanel
        questions={questions}
        current={current}
        onCurrentChange={setCurrent}
        answers={answers}
        onAnswer={handleSelectOption}
        flagged={flagged}
        onToggleFlag={toggleFlag}
        durationLabel={durationSeconds > 0 ? `⏱ ${formatted}` : "Untimed"}
        durationLow={durationSeconds > 0 ? isLow : false}
        onSubmit={submitQuiz}
        submitError={submitError}
        onTimerPausedChange={setTimerPaused}
        features={quizFeatures}
      />
    );
  }

  if (stage === "submitting") {
    return <PageLoading message="Grading your answers…" />;
  }

  return null;
}
