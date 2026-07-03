import Link from "next/link";
import type { DashboardPaperProgress } from "@/types";

const themes = [
  { badge: "bg-blue-100 text-blue-700", bar: "bg-blue-500", tag: "bg-blue-50 text-blue-600" },
  { badge: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500", tag: "bg-emerald-50 text-emerald-600" },
  { badge: "bg-violet-100 text-violet-700", bar: "bg-violet-500", tag: "bg-violet-50 text-violet-600" },
  { badge: "bg-amber-100 text-amber-700", bar: "bg-amber-500", tag: "bg-amber-50 text-amber-600" },
];

function daysAgo(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "today";
  if (diff === 1) return "1 day ago";
  return `${diff} days ago`;
}

interface ContinuePracticeCardProps {
  paper: DashboardPaperProgress;
  index?: number;
}

export function ContinuePracticeCard({ paper, index = 0 }: ContinuePracticeCardProps) {
  const theme = themes[index % themes.length];
  const hasStarted = paper.topicsAttempted > 0;
  const lastPractised = daysAgo(paper.lastPracticeDate);
  const codeShort = paper.code.replace(/^ACCA\s*/i, "").trim() || paper.code;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-shadow hover:shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${theme.badge}`}>
            {codeShort}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">{paper.code}</p>
            <h3 className="truncate text-sm font-semibold text-ink-900">{paper.title}</h3>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${theme.tag}`}>
          Practice
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Progress</span>
          <span className="font-semibold text-slate-700">{paper.progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${theme.bar}`}
            style={{ width: `${paper.progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">
          {lastPractised ? `Last practised ${lastPractised}` : "Not started yet"}
        </p>
        <Link
          href="/dashboard/quiz"
          className="text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          {hasStarted ? "Continue →" : "Start →"}
        </Link>
      </div>
    </div>
  );
}
