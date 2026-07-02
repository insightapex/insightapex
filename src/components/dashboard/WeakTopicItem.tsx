import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { DashboardTopicDetail } from "@/types";

function statusTone(status: DashboardTopicDetail["status"]) {
  if (status === "Weak") return "danger" as const;
  if (status === "Average") return "warning" as const;
  return "success" as const;
}

function progressTone(status: DashboardTopicDetail["status"]) {
  if (status === "Weak") return "danger" as const;
  if (status === "Average") return "brand" as const;
  return "success" as const;
}

interface WeakTopicItemProps {
  topic: DashboardTopicDetail;
}

export function WeakTopicItem({ topic }: WeakTopicItemProps) {
  return (
    <li className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-800">{topic.title}</p>
          <p className="mt-0.5 text-sm text-slate-500">{topic.accuracy}% accuracy</p>
        </div>
        <Badge tone={statusTone(topic.status)}>{topic.status}</Badge>
      </div>
      <div className="mt-3">
        <ProgressBar value={topic.accuracy} tone={progressTone(topic.status)} />
      </div>
      <Link href="/dashboard/quiz" className="mt-3 inline-block">
        <Button variant="ghost" size="sm" className="px-0 text-brand-600 hover:bg-transparent hover:text-brand-700">
          Study Now →
        </Button>
      </Link>
    </li>
  );
}
