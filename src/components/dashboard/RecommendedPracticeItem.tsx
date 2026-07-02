import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { DashboardRecommendedPractice } from "@/types";

interface RecommendedPracticeItemProps {
  item: DashboardRecommendedPractice;
}

export function RecommendedPracticeItem({ item }: RecommendedPracticeItemProps) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-slate-100 bg-gradient-to-r from-brand-50/40 to-white p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-lg">
        💡
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink-900">{item.topic}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.reason}</p>
        <Link href="/dashboard/quiz" className="mt-3 inline-block">
          <Button size="sm" variant="outline">
            Start Practice
          </Button>
        </Link>
      </div>
    </div>
  );
}
