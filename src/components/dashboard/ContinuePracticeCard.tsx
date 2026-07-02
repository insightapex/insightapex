import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { DashboardPaperProgress } from "@/types";

interface ContinuePracticeCardProps {
  paper: DashboardPaperProgress;
}

export function ContinuePracticeCard({ paper }: ContinuePracticeCardProps) {
  const hasStarted = paper.topicsAttempted > 0;
  const lastDate = paper.lastPracticeDate
    ? new Date(paper.lastPracticeDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex flex-col rounded-xl2 border border-slate-200/80 bg-white p-5 shadow-card transition-shadow hover:shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            {paper.code}
          </p>
          <h3 className="mt-1 truncate text-base font-semibold text-ink-900">{paper.title}</h3>
        </div>
        {hasStarted && (
          <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
            {paper.progressPercent}%
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-xs text-slate-500">
          <span>{hasStarted ? "Progress" : "Not started"}</span>
          <span>
            {paper.topicsAttempted}/{paper.totalTopics} topics
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500"
            style={{ width: `${paper.progressPercent}%` }}
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {lastDate ? `Last practice: ${lastDate}` : "No practice sessions yet"}
      </p>

      <Link href="/dashboard/quiz" className="mt-4">
        <Button variant={hasStarted ? "primary" : "outline"} size="sm" className="w-full">
          {hasStarted ? "Continue" : "Start"}
        </Button>
      </Link>
    </div>
  );
}
