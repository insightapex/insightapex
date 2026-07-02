"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";

interface TopicBreakdown { topicId: string; topicTitle: string; total: number; correct: number; percent: number; }
interface ReviewItem {
  questionId: string; questionText: string; topicTitle: string; difficulty: string;
  selectedOptionId: string | null; selectedOptionText: string | null;
  correctOptionId: string | null; correctOptionText: string | null;
  isCorrect: boolean; explanation: string | null;
  options: { id: string; text: string; isCorrect: boolean }[];
}
interface ResultData {
  attemptId: string; paper: string;
  totalQuestions: number; correctCount: number; wrongCount: number;
  scorePercent: number; passed: boolean;
  submittedAt: string; durationSec: number | null;
  topicBreakdown: TopicBreakdown[]; weakTopics: string[];
  review: ReviewItem[];
}

export default function ResultPage() {
  const params = useSearchParams();
  const attemptId = params.get("attemptId");
  const [data, setData] = useState<ResultData | null>(null);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    if (!attemptId) return;
    fetch(`/api/quiz/result?attemptId=${attemptId}`)
      .then((r) => r.json())
      .then(setData);
  }, [attemptId]);

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        Loading results…
      </div>
    );
  }

  const diffTone: Record<string, "success" | "warning" | "danger"> = {
    EASY: "success", MEDIUM: "warning", HARD: "danger",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Quiz Result</h1>
          <p className="mt-1 text-sm text-slate-500">{data.paper}</p>
        </div>
        <Link href="/dashboard/quiz">
          <Button variant="outline">Practice Again</Button>
        </Link>
      </div>

      {/* Score hero */}
      <div className={`rounded-xl2 p-8 text-center ${data.passed ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
        <div className={`text-6xl font-bold ${data.passed ? "text-emerald-600" : "text-red-500"}`}>
          {data.scorePercent}%
        </div>
        <div className="mt-2">
          <Badge tone={data.passed ? "success" : "danger"} >
            {data.passed ? "✓ PASS" : "✗ FAIL"}
          </Badge>
        </div>
        <div className="mt-4 flex items-center justify-center gap-8 text-sm text-slate-600">
          <span><strong className="text-emerald-600">{data.correctCount}</strong> correct</span>
          <span><strong className="text-red-500">{data.wrongCount}</strong> wrong</span>
          <span><strong>{data.totalQuestions}</strong> total</span>
          {data.durationSec && (
            <span>⏱ {Math.floor(data.durationSec / 60)}m {data.durationSec % 60}s</span>
          )}
        </div>
      </div>

      {/* Topic breakdown */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-ink-900">Performance by Topic</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          {data.topicBreakdown.map((t) => (
            <div key={t.topicId}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{t.topicTitle}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">{t.correct}/{t.total}</span>
                  <Badge tone={t.percent >= 60 ? "success" : "danger"}>{t.percent}%</Badge>
                </div>
              </div>
              <ProgressBar value={t.percent} tone={t.percent >= 60 ? "success" : "danger"} />
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Weak topics */}
      {data.weakTopics.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Recommended Topics to Revise</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {data.weakTopics.map((t) => (
                <Badge key={t} tone="warning">{t}</Badge>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">These topics had accuracy below 60% in this attempt.</p>
          </CardBody>
        </Card>
      )}

      {/* Answer review toggle */}
      <div>
        <Button variant="outline" onClick={() => setShowReview(!showReview)}>
          {showReview ? "Hide Answer Review" : "Review All Answers"}
        </Button>
      </div>

      {showReview && (
        <div className="space-y-4">
          {data.review.map((r, i) => (
            <Card key={r.questionId} className={r.isCorrect ? "border-emerald-200" : "border-red-200"}>
              <CardHeader className={r.isCorrect ? "bg-emerald-50" : "bg-red-50"}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-500">Q{i + 1}</span>
                    <Badge tone={diffTone[r.difficulty] ?? "neutral"}>{r.difficulty}</Badge>
                    <span className="text-xs text-slate-400">{r.topicTitle}</span>
                  </div>
                  <Badge tone={r.isCorrect ? "success" : "danger"}>
                    {r.isCorrect ? "Correct" : "Incorrect"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">{r.questionText}</p>
              </CardHeader>
              <CardBody className="space-y-2">
                {r.options.map((opt) => {
                  const isSelected = opt.id === r.selectedOptionId;
                  const isCorrect = opt.isCorrect;
                  return (
                    <div
                      key={opt.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-sm
                        ${isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-800" :
                          isSelected ? "border-red-300 bg-red-50 text-red-700" :
                          "border-slate-100 text-slate-600"}`}
                    >
                      <span className="shrink-0 font-bold">
                        {isCorrect ? "✓" : isSelected ? "✗" : "○"}
                      </span>
                      {opt.text}
                      {isSelected && !isCorrect && (
                        <span className="ml-auto text-xs text-red-400">(your answer)</span>
                      )}
                    </div>
                  );
                })}
                {r.explanation && (
                  <div className="mt-3 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800 border border-brand-100">
                    <strong>Explanation:</strong> {r.explanation}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-3 pb-8">
        <Link href="/dashboard">
          <Button variant="outline">← Dashboard</Button>
        </Link>
        <Link href="/dashboard/quiz">
          <Button>Practice Again</Button>
        </Link>
      </div>
    </div>
  );
}
