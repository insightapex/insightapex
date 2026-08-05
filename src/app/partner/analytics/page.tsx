"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { cn } from "@/lib/utils";

type Period = "30d" | "90d" | "180d" | "365d";

const PERIODS: { id: Period; label: string }[] = [
  { id: "30d", label: "30 days" },
  { id: "90d", label: "3 months" },
  { id: "180d", label: "6 months" },
  { id: "365d", label: "12 months" },
];

type CategoryStatus = "High Proficiency" | "Average" | "Needs Improvement";

type CategoryRow = {
  paperId: string;
  paperCode: string;
  categoryId: string;
  categoryTitle: string;
  subCategoryId: string;
  subCategoryTitle: string;
  averageScore: number;
  status: CategoryStatus;
  studentsBelowPassing: number;
  attemptCount: number;
};

type Analytics = {
  passMark: number;
  activeStudents: number;
  inactiveStudents: number;
  premiumStudents: number;
  freeStudents: number;
  papers: Array<{ id: string; code: string; title: string }>;
  attemptsByPaper: Array<{ code: string; title: string; attempts: number }>;
  passRateByPaper: Array<{ code: string; title: string; passRate: number; attempts: number }>;
  categoryPerformance: CategoryRow[];
  weakestSubcategories: Array<{
    id: string;
    title: string;
    paperCode: string;
    missRate: number;
    total: number;
  }>;
};

function performanceTrackClass(status: CategoryStatus) {
  if (status === "High Proficiency") return "bg-emerald-100";
  if (status === "Average") return "bg-amber-100";
  return "bg-red-100";
}

function performanceLabelClass(status: CategoryStatus) {
  if (status === "High Proficiency") return "bg-emerald-50 text-emerald-700";
  if (status === "Average") return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

function performanceBarClass(status: CategoryStatus) {
  if (status === "High Proficiency") return "bg-emerald-500";
  if (status === "Average") return "bg-amber-500";
  return "bg-red-500";
}

export default function PartnerAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30d");
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paperId, setPaperId] = useState<string>("");
  const [filterSubCategoryId, setFilterSubCategoryId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/partner/analytics?period=${period}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load analytics");
        if (!cancelled) {
          setData(json);
          setPaperId((prev) => {
            const papers: Array<{ id: string }> = json.papers ?? [];
            if (prev && papers.some((p) => p.id === prev)) return prev;
            return papers[0]?.id ?? "";
          });
          setFilterSubCategoryId(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const filteredCategories = useMemo(() => {
    if (!data) return [];
    const byPaper = paperId
      ? data.categoryPerformance.filter((r) => r.paperId === paperId)
      : data.categoryPerformance;
    if (!filterSubCategoryId) return byPaper;
    return byPaper.filter((r) => r.subCategoryId === filterSubCategoryId);
  }, [data, paperId, filterSubCategoryId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Real performance data for your partner students only."
      />

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              period === p.id
                ? "bg-gradient-brand text-white shadow-glow"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading || !data ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard label="Active students" value={data.activeStudents} tone="success" />
            <AdminStatCard label="Inactive students" value={data.inactiveStudents} tone="neutral" />
            <AdminStatCard label="Paid students" value={data.premiumStudents} tone="accent" />
            <AdminStatCard label="Free" value={data.freeStudents} tone="brand" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-ink-900">Attempts by paper</h2>
              </CardHeader>
              <CardBody className="h-72">
                {data.attemptsByPaper.length === 0 ? (
                  <EmptyState compact title="No attempts in this period" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.attemptsByPaper}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="code" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="attempts" fill="#2456f5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-ink-900">Average score by paper</h2>
              </CardHeader>
              <CardBody className="h-72">
                {data.passRateByPaper.length === 0 ? (
                  <EmptyState compact title="No average-score data yet" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.passRateByPaper}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="code" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="passRate" fill="#8b2ff5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Category / Sub Category Performance
                </h2>
                <p className="text-sm text-slate-500">
                  Click a row to filter · Pass mark {data.passMark ?? 50}%
                  {filterSubCategoryId && (
                    <>
                      {" · "}
                      <button
                        type="button"
                        className="font-medium text-emerald-700 hover:underline"
                        onClick={() => setFilterSubCategoryId(null)}
                      >
                        Clear filter
                      </button>
                    </>
                  )}
                </p>
              </div>
              <label className="flex shrink-0 flex-col gap-1 sm:items-end">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Paper
                </span>
                <select
                  value={paperId}
                  onChange={(e) => {
                    setPaperId(e.target.value);
                    setFilterSubCategoryId(null);
                  }}
                  disabled={data.papers.length === 0}
                  className="min-w-[12rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  {data.papers.length === 0 ? (
                    <option value="">No papers yet</option>
                  ) : (
                    data.papers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.title}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </CardHeader>
            <CardBody className="overflow-x-auto p-0">
              {filteredCategories.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">
                  {data.papers.length === 0
                    ? "No category data in this period yet."
                    : "No category data for this paper in the selected period."}
                </div>
              ) : (
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3">Category / Sub Category</th>
                      <th className="px-5 py-3 text-right">Avg Score</th>
                      <th className="min-w-[220px] px-5 py-3">Performance</th>
                      <th className="px-5 py-3 text-right">Below Pass</th>
                      <th className="px-5 py-3 text-right">Attempts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCategories.map((row) => (
                      <tr
                        key={row.subCategoryId}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-emerald-50/40",
                          filterSubCategoryId === row.subCategoryId && "bg-emerald-50"
                        )}
                        onClick={() =>
                          setFilterSubCategoryId(
                            filterSubCategoryId === row.subCategoryId
                              ? null
                              : row.subCategoryId
                          )
                        }
                      >
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">{row.subCategoryTitle}</p>
                          <p className="text-xs text-slate-500">{row.categoryTitle}</p>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-800">
                          {row.averageScore}%
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex min-w-[200px] items-center gap-3">
                            <div
                              className={cn(
                                "h-2.5 flex-1 overflow-hidden rounded-full",
                                performanceTrackClass(row.status)
                              )}
                            >
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  performanceBarClass(row.status)
                                )}
                                style={{
                                  width: `${Math.min(100, Math.max(0, row.averageScore))}%`,
                                }}
                                role="progressbar"
                                aria-valuenow={row.averageScore}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={row.status}
                              />
                            </div>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium italic",
                                performanceLabelClass(row.status)
                              )}
                            >
                              {row.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                          {row.studentsBelowPassing}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                          {row.attemptCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-ink-900">Weakest subcategories</h2>
            </CardHeader>
            <CardBody className="space-y-2">
              {data.weakestSubcategories.length === 0 ? (
                <EmptyState compact title="Not enough subcategory data" />
              ) : (
                data.weakestSubcategories.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium text-ink-900">{s.title}</p>
                      <p className="text-xs text-slate-500">
                        {s.paperCode} · {s.total} responses
                      </p>
                    </div>
                    <span className="font-semibold text-red-600">{s.missRate}% miss</span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
