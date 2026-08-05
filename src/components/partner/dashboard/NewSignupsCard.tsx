"use client";

import Link from "next/link";
import { ChartCard } from "./ChartCard";
import { Badge } from "@/components/ui/Badge";
import { PortalIcon } from "@/components/portal/PortalIcons";

export type RecentSignup = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  registrationSource: { id: string; name: string } | null;
  isPremium: boolean;
};

function formatJoined(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function NewSignupsCard({
  signups,
  newThisMonth,
}: {
  signups: RecentSignup[];
  newThisMonth: number;
}) {
  return (
    <ChartCard
      title="New signups"
      description={`${newThisMonth} joined this month · latest students who chose your school`}
      actions={
        <Link
          href="/partner/students"
          className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          View all →
        </Link>
      }
    >
      {signups.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <PortalIcon name="students" className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-800">No signups yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Share your signup link from Settings so students can join your school.
            </p>
          </div>
          <Link
            href="/partner/settings"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            Open settings →
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {signups.map((s) => (
            <li key={s.id}>
              <Link
                href={`/partner/students/${s.id}`}
                className="flex items-start justify-between gap-3 py-3 transition-colors hover:bg-slate-50/80 -mx-1 px-1 rounded-lg"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <PortalIcon name="plus" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{s.name}</p>
                    <p className="truncate text-xs text-slate-500">{s.email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {s.registrationSource && (
                        <Badge tone="neutral">{s.registrationSource.name}</Badge>
                      )}
                      <Badge tone={s.isPremium ? "premium" : "neutral"}>
                        {s.isPremium ? "Paid" : "Free"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{formatJoined(s.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
