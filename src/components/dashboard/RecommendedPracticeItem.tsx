import Link from "next/link";
import type { DashboardRecommendedPractice } from "@/types";

interface RecommendedPracticeItemProps {
  item: DashboardRecommendedPractice;
}

function practiceHref(item: DashboardRecommendedPractice): string {
  if (!item.categoryId) return "/dashboard/quiz";
  const params = new URLSearchParams({
    paperId: item.paperId,
    categoryId: item.categoryId,
    subCategoryId: item.subCategoryId,
  });
  return `/dashboard/quiz?${params.toString()}`;
}

export function RecommendedPracticeItem({ item }: RecommendedPracticeItemProps) {
  const href = practiceHref(item);

  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-xl border border-slate-200/60 bg-gradient-brand-soft p-4 transition-all hover:-translate-y-0.5 hover:border-brand-200/60 hover:shadow-panel"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-card transition-transform group-hover:scale-105">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{item.categoryTitle}</p>
        <p className="font-semibold text-ink-900">{item.subCategoryTitle}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.reason}</p>
        <span className="mt-3 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors group-hover:border-brand-300 group-hover:text-brand-700">
          Start Practice →
        </span>
      </div>
    </Link>
  );
}
