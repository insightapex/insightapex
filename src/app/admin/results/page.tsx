"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/admin/EmptyState";

interface Attempt {
  id: string;
  student: string;
  paper: string;
  score: number;
  passed: boolean | null;
  date: string;
}

export default function AdminResultsPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then((d) => setAttempts(d.recentAttempts ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Student Results</h1>
        <p className="mt-1 text-sm text-slate-500">Review quiz submissions and pass rates.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recent Submissions
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-400">Loading…</div>
          ) : attempts.length === 0 ? (
            <EmptyState
              icon="✓"
              title="No results yet"
              description="Student quiz submissions will appear here once they complete practice sessions."
              actionLabel="View Students"
              actionHref="/admin/students"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Paper
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Score
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Result
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attempts.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-800">{a.student}</td>
                      <td className="px-5 py-3 text-brand-600 font-medium">{a.paper}</td>
                      <td className="px-5 py-3 font-semibold text-slate-700">{a.score}%</td>
                      <td className="px-5 py-3">
                        <Badge tone={a.passed ? "success" : "danger"}>
                          {a.passed ? "Pass" : "Fail"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        {new Date(a.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <p className="text-center text-xs text-slate-400">
        Detailed per-question review is available on the{" "}
        <Link href="/admin/analytics" className="text-brand-600 hover:underline">
          Analytics
        </Link>{" "}
        page.
      </p>
    </div>
  );
}
