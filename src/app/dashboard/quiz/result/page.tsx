"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/PageLoading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { QuestionExplanations } from "@/components/dashboard/QuestionExplanations";

interface SubCategoryBreakdown {
  subCategoryId: string;
  categoryTitle: string;
  subCategoryTitle: string;
  total: number;
  correct: number;
  percent: number;
}
interface ReviewItem {
  questionId: string;
  questionText: string;
  categoryTitle: string;
  subCategoryTitle: string;
  difficulty: string;
  selectedOptionId: string | null;
  selectedOptionIds?: string[];
  selectedOptionText: string | null;
  correctOptionId: string | null;
  correctOptionText: string | null;
  isCorrect: boolean;
  explanation: string | null;
  explanationMy?: string | null;
  options: { id: string; text: string; isCorrect: boolean }[];
}
interface ResultData {
  attemptId: string;
  paper: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  scorePercent: number;
  passed: boolean;
  submittedAt: string;
  durationSec: number | null;
  subCategoryBreakdown: SubCategoryBreakdown[];
  weakSubCategories: string[];
  review: ReviewItem[];
}

function ResultContent() {
  const params = useSearchParams();
  const attemptId = params.get("attemptId");
  const fromMockExam = params.get("mockExam") === "1";
  const retryHref = fromMockExam ? "/dashboard/mock-exams" : "/dashboard/quiz";
  const retryLabel = fromMockExam ? "Back to Mock Exams" : "Practice Again";
  const [data, setData] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) {
      setError("No attempt ID provided.");
      setLoading(false);
      return;
    }

    fetch(`/api/quiz/result?attemptId=${attemptId}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not load results.");
        setData(json);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load results.");
      })
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return <PageLoading message="Loading results…" />;
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Alert tone="error" title="Unable to load results">
          {error ?? "Something went wrong."}
        </Alert>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard">
            <Button variant="outline">← Dashboard</Button>
          </Link>
          <Link href={retryHref}>
            <Button>{retryLabel}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            {fromMockExam ? "Mock Exam Result" : "Quiz Result"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{data.paper}</p>
        </div>
        <Link href={retryHref} className="shrink-0">
          <Button variant="outline" className="w-full sm:w-auto">
            {retryLabel}
          </Button>
        </Link>
      </div>

      <div
        className={`rounded-2xl border p-6 text-center sm:p-8 ${
          data.passed ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
        }`}
      >
        <div
          className={`text-5xl font-bold sm:text-6xl ${
            data.passed ? "text-emerald-600" : "text-red-500"
          }`}
        >
          {data.scorePercent}%
        </div>
        <div className="mt-2">
          <Badge tone={data.passed ? "success" : "danger"}>
            {data.passed ? "Pass" : "Fail"}
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-600 sm:gap-8">
          <span>
            <strong className="text-emerald-600">{data.correctCount}</strong> correct
          </span>
          <span>
            <strong className="text-red-500">{data.wrongCount}</strong> wrong
          </span>
          <span>
            <strong>{data.totalQuestions}</strong> total
          </span>
          {data.durationSec != null && data.durationSec > 0 && (
            <span>
              {Math.floor(data.durationSec / 60)}m {data.durationSec % 60}s
            </span>
          )}
        </div>
      </div>

      {data.subCategoryBreakdown.length > 0 ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Performance by Sub Category</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            {data.subCategoryBreakdown.map((sc) => (
              <div key={sc.subCategoryId}>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-700">
                    {sc.categoryTitle} / {sc.subCategoryTitle}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">
                      {sc.correct}/{sc.total}
                    </span>
                    <Badge tone={sc.percent >= 60 ? "success" : "danger"}>{sc.percent}%</Badge>
                  </div>
                </div>
                <ProgressBar value={sc.percent} tone={sc.percent >= 60 ? "success" : "danger"} />
              </div>
            ))}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <EmptyState
              compact
              title="No topic breakdown for this attempt"
              description="Score and pass/fail are still saved. Topic breakdown appears when answer details are available."
            />
          </CardBody>
        </Card>
      )}

      {data.weakSubCategories.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Recommended to Revise</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {data.weakSubCategories.map((label) => (
                <Badge key={label} tone="warning">
                  {label}
                </Badge>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Sub categories below 60% accuracy in this attempt.
            </p>
          </CardBody>
        </Card>
      )}

      <div>
        <Button
          variant="outline"
          onClick={() => {
            setShowReview((prev) => !prev);
            setExpandedQuestionId(null);
          }}
        >
          {showReview ? "Hide Answer Review" : "Review All Answers"}
        </Button>
      </div>

      {showReview && (
        <div className="space-y-3">
          {data.review.length === 0 ? (
            <EmptyState
              compact
              title="Answer review unavailable"
              description="Detailed answers for this attempt are no longer available. Your score summary above is still saved."
            />
          ) : (
            data.review.map((r, i) => {
              const expanded = expandedQuestionId === r.questionId;
              return (
                <Card
                  key={r.questionId}
                  className={r.isCorrect ? "border-emerald-200" : "border-red-200"}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedQuestionId((prev) => (prev === r.questionId ? null : r.questionId))
                    }
                    className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors ${
                      r.isCorrect ? "bg-emerald-50 hover:bg-emerald-100/80" : "bg-red-50 hover:bg-red-100/80"
                    }`}
                    aria-expanded={expanded}
                  >
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="shrink-0 text-sm font-semibold text-slate-700">Q{i + 1}</span>
                      <span className="truncate text-sm text-slate-600">{r.questionText}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                          r.isCorrect
                            ? "bg-emerald-500 text-white"
                            : "bg-red-500 text-white"
                        }`}
                        aria-label={r.isCorrect ? "Correct" : "Incorrect"}
                        title={r.isCorrect ? "Correct" : "Incorrect"}
                      >
                        {r.isCorrect ? "✓" : "✗"}
                      </span>
                      <svg
                        className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {expanded && (
                    <>
                      <CardHeader className="border-t border-slate-100 !bg-white">
                        <p className="text-sm font-medium leading-relaxed text-slate-800">
                          {r.questionText}
                        </p>
                      </CardHeader>
                      <CardBody className="space-y-2">
                        {r.options.map((opt, idx) => {
                          const letter = (["A", "B", "C", "D"] as const)[idx] ?? String(idx + 1);
                          const isSelected =
                            (r.selectedOptionIds?.length
                              ? r.selectedOptionIds.includes(opt.id)
                              : opt.id === r.selectedOptionId) ?? false;
                          const isCorrect = opt.isCorrect;
                          return (
                            <div
                              key={opt.id}
                              className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${
                                isCorrect
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                  : isSelected
                                    ? "border-red-300 bg-red-50 text-red-700"
                                    : "border-slate-100 text-slate-600"
                              }`}
                            >
                              <span className="shrink-0 font-bold">
                                {isCorrect ? "✓" : isSelected ? "✗" : "○"}
                              </span>
                              <span className="flex-1">
                                <span className="font-semibold">{letter}.</span> {opt.text}
                              </span>
                              {isSelected && !isCorrect && (
                                <span className="shrink-0 text-xs text-red-400">(your answer)</span>
                              )}
                              {isSelected && isCorrect && (
                                <span className="shrink-0 text-xs text-emerald-600">(your answer)</span>
                              )}
                              {!isSelected && isCorrect && (
                                <span className="shrink-0 text-xs text-emerald-600">(correct)</span>
                              )}
                            </div>
                          );
                        })}
                        {(r.explanation || r.explanationMy) && (
                          <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
                            <QuestionExplanations
                              explanation={r.explanation}
                              explanationMy={r.explanationMy}
                              compact
                            />
                          </div>
                        )}
                      </CardBody>
                    </>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 pb-8 sm:flex-row">
        <Link href="/dashboard">
          <Button variant="outline" className="w-full sm:w-auto">
            ← Dashboard
          </Button>
        </Link>
        <Link href={retryHref}>
          <Button className="w-full sm:w-auto">{retryLabel}</Button>
        </Link>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading results…" />}>
      <ResultContent />
    </Suspense>
  );
}
