"use client";

import { Card, CardBody } from "@/components/ui/Card";
import { HalfCycleGauge } from "@/components/ui/HalfCycleGauge";
import {
  computeExamInsights,
  type ScoreTrackSummary,
} from "@/lib/exam-insights";
import { cn } from "@/lib/utils";

interface ExamInsightsCardsProps {
  averageScore: number;
  bestScore: number;
  coveragePercent: number;
  studyStreak: number;
  totalAttempts: number;
  paperLabel?: string;
  practiceScores?: ScoreTrackSummary;
  mockScores?: ScoreTrackSummary;
}

function GaugeCard({
  title,
  subtitle,
  value,
  progressClassName,
  empty,
}: {
  title: string;
  subtitle: string;
  value: number;
  progressClassName: string;
  empty?: boolean;
}) {
  return (
    <Card className="h-full">
      <CardBody className="flex flex-col items-center py-5">
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        <p className="mt-0.5 text-center text-xs text-slate-500">{subtitle}</p>
        <div className="mt-4">
          <HalfCycleGauge
            value={empty ? 0 : value}
            progressClassName={empty ? "stroke-slate-200" : progressClassName}
            label={empty ? "—" : `${Math.round(value)}%`}
          />
        </div>
      </CardBody>
    </Card>
  );
}

export function ExamInsightsCards({
  averageScore,
  bestScore,
  coveragePercent,
  studyStreak,
  totalAttempts,
  paperLabel,
  practiceScores,
  mockScores = { latestScore: null, bestScore: null, count: 0 },
}: ExamInsightsCardsProps) {
  const mockAverage =
    mockScores.count > 0 && mockScores.latestScore != null
      ? mockScores.bestScore != null
        ? Math.round((mockScores.bestScore + mockScores.latestScore) / 2)
        : mockScores.latestScore
      : null;

  const insights = computeExamInsights({
    averageScore,
    bestScore,
    coveragePercent,
    studyStreak,
    totalAttempts,
    mockAverageScore: mockAverage,
    mockBestScore: mockScores.bestScore,
    mockAttemptCount: mockScores.count,
  });

  const scope = paperLabel ? ` · ${paperLabel}` : "";
  const empty = !insights.hasData;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <GaugeCard
        title="Exam readiness"
        subtitle={`Based on practice & coverage${scope}`}
        value={insights.examReadyPercent}
        progressClassName="stroke-brand-500"
        empty={empty}
      />
      <GaugeCard
        title="Predicted mark"
        subtitle={
          insights.hasMockData
            ? `Practice + mock exams${scope}`
            : `From practice marks${scope}`
        }
        value={insights.predictedExamMark}
        progressClassName="stroke-violet-500"
        empty={empty}
      />
      <Card className="h-full">
        <CardBody className="flex flex-col items-center py-5">
          <p className="text-sm font-semibold text-ink-900">Pass likelihood</p>
          <p className="mt-0.5 text-center text-xs text-slate-500">
            Chance of scoring 50%+{scope}
          </p>
          <div className="mt-4">
            <HalfCycleGauge
              value={empty ? 0 : insights.passProbabilityPercent}
              progressClassName={
                empty
                  ? "stroke-slate-200"
                  : insights.passLean === "pass"
                    ? "stroke-emerald-500"
                    : insights.passLean === "fail"
                      ? "stroke-rose-500"
                      : "stroke-amber-500"
              }
              label={empty ? "—" : `${Math.round(insights.passProbabilityPercent)}%`}
            />
          </div>
          {!empty && insights.passLean !== "insufficient" && (
            <p
              className={cn(
                "mt-2 text-xs font-semibold",
                insights.passLean === "pass" ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {insights.passLean === "pass" ? "Leaning pass" : "Keep practicing"}
            </p>
          )}
          {practiceScores && practiceScores.count > 0 && practiceScores.latestScore != null && (
            <p className="mt-1 text-[11px] text-slate-400">
              Latest practice {practiceScores.latestScore}%
              {mockScores.count > 0 && mockScores.latestScore != null
                ? ` · Latest mock ${mockScores.latestScore}%`
                : ""}
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
