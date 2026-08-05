import Link from "next/link";
import type { DashboardPaperProgress } from "@/types";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const themes = [
  { badge: "bg-brand-100 text-brand-700", ring: "ring-brand-200" },
  { badge: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-200" },
  { badge: "bg-accent-100 text-accent-700", ring: "ring-accent-200" },
  { badge: "bg-amber-100 text-amber-700", ring: "ring-amber-200" },
];

function daysAgo(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "today";
  if (diff === 1) return "1 day ago";
  return `${diff} days ago`;
}

function coverageStatus(attempted: number, total: number) {
  if (attempted === 0) return { label: "Not started", tone: "neutral" as const };
  if (attempted >= total) return { label: "Complete", tone: "success" as const };
  return { label: "In progress", tone: "brand" as const };
}

interface ContinuePracticeCardProps {
  paper: DashboardPaperProgress;
  index?: number;
  featured?: boolean;
}

export function ContinuePracticeCard({ paper, index = 0, featured }: ContinuePracticeCardProps) {
  const theme = themes[index % themes.length];
  const hasStarted = paper.subCategoriesAttempted > 0;
  const lastPractised = daysAgo(paper.lastPracticeDate);
  const codeShort = paper.code.replace(/^ACCA\s*/i, "").trim() || paper.code;
  const status = coverageStatus(paper.subCategoriesAttempted, paper.totalSubCategories);

  return (
    <div
      className={cn(
        "group flex flex-col rounded-2xl border border-slate-200/60 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-panel",
        featured && "ring-2 ring-brand-200"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold ring-1",
              theme.badge,
              theme.ring
            )}
          >
            {codeShort}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">{paper.code}</p>
            <h3 className="truncate text-sm font-semibold text-ink-900">{paper.title}</h3>
          </div>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div className="mt-4 space-y-2">
        <ProgressBar
          value={paper.progressPercent}
          tone="accent"
          label="Syllabus coverage"
          showValue
        />
        {paper.totalSubCategories > 0 && (
          <p className="text-xs text-slate-400">
            <span className="font-medium text-slate-600">
              {paper.subCategoriesAttempted} of {paper.totalSubCategories}
            </span>{" "}
            topics covered
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-400">
          {lastPractised ? `Last practised ${lastPractised}` : "Ready to begin"}
        </p>
        <Link
          href="/dashboard/quiz"
          className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700"
        >
          {hasStarted ? "Continue →" : "Start →"}
        </Link>
      </div>
    </div>
  );
}
