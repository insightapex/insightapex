"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { LecturerPaperSelectors } from "@/components/lecturer/LecturerPaperSelectors";
import { useLecturerScope } from "@/components/lecturer/LecturerScope";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type CategoryRow = {
  categoryId: string;
  categoryTitle: string;
  subCategoryId: string;
  subCategoryTitle: string;
  averageScore: number;
  status: "High Proficiency" | "Average" | "Needs Improvement";
  studentsBelowPassing: number;
  attemptCount: number;
};

type Overview = {
  kpis: {
    totalEnrolledStudents: number;
    averageClassScore: number;
    passProbability: number;
    mockParticipationRate: number;
  };
  categoryPerformance: CategoryRow[];
  passMark: number;
};

type AtRiskRow = {
  id: string;
  name: string;
  email: string;
  overallScore: number | null;
  mockAttempts: number;
  lastActive: string | null;
  riskStatus: "High Risk" | "At Risk" | "Monitor";
};

type TrendRange = "4w" | "8w" | "3m" | "6m" | "12m";

const TREND_OPTIONS: { id: TrendRange; label: string }[] = [
  { id: "4w", label: "Last 4 weeks" },
  { id: "8w", label: "Last 8 weeks" },
  { id: "3m", label: "Last 3 months" },
  { id: "6m", label: "Last 6 months" },
  { id: "12m", label: "Last 12 months" },
];

function statusTone(status: CategoryRow["status"]) {
  if (status === "High Proficiency") return "success" as const;
  if (status === "Average") return "warning" as const;
  return "danger" as const;
}

function performanceTrackClass(status: CategoryRow["status"]) {
  if (status === "High Proficiency") return "bg-emerald-100";
  if (status === "Average") return "bg-amber-100";
  return "bg-red-100";
}

function performanceLabelClass(status: CategoryRow["status"]) {
  if (status === "High Proficiency") return "bg-emerald-50 text-emerald-700";
  if (status === "Average") return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

function riskTone(status: AtRiskRow["riskStatus"]) {
  if (status === "High Risk") return "danger" as const;
  if (status === "At Risk") return "warning" as const;
  return "neutral" as const;
}

export default function LecturerDashboardPage() {
  const {
    paperId,
    selectedPaper,
    loading: scopeLoading,
    error: scopeError,
    filterSubCategoryId,
    setFilterSubCategoryId,
  } = useLecturerScope();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [atRisk, setAtRisk] = useState<AtRiskRow[]>([]);
  const [trendRange, setTrendRange] = useState<TrendRange>("8w");
  const [trendPoints, setTrendPoints] = useState<
    Array<{ label: string; averageScore: number | null; attempts: number }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifyBusy, setNotifyBusy] = useState<string | null>(null);
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!paperId) {
      setOverview(null);
      setAtRisk([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [oRes, aRes] = await Promise.all([
          fetch(`/api/lecturer/overview?paperId=${paperId}`),
          fetch(`/api/lecturer/at-risk?paperId=${paperId}`),
        ]);
        const oJson = await oRes.json();
        const aJson = await aRes.json();
        if (!oRes.ok) throw new Error(oJson.error ?? "Failed to load dashboard");
        if (!cancelled) {
          setOverview(oJson);
          setAtRisk(aRes.ok ? aJson.students ?? [] : []);
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
  }, [paperId]);

  useEffect(() => {
    if (!paperId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/lecturer/performance-trend?paperId=${paperId}&range=${trendRange}`
      );
      const json = await res.json();
      if (!cancelled && res.ok) setTrendPoints(json.points ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [paperId, trendRange]);

  const filteredCategories = useMemo(() => {
    if (!overview) return [];
    if (!filterSubCategoryId) return overview.categoryPerformance;
    return overview.categoryPerformance.filter(
      (r) => r.subCategoryId === filterSubCategoryId
    );
  }, [overview, filterSubCategoryId]);

  async function quickNotify(studentId: string, name: string) {
    setNotifyBusy(studentId);
    setNotifyMsg(null);
    try {
      const res = await fetch("/api/lecturer/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "students",
          studentIds: [studentId],
          subject: `Check-in: ${selectedPaper?.code ?? "your paper"}`,
          message: `Hi ${name},\n\nPlease review your recent progress on ${selectedPaper?.code ?? "the paper"} and reach out if you need help.\n\n— Your lecturer`,
          sendEmail: false,
          sendInApp: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to notify");
      setNotifyMsg(
        json.liveNotified > 0
          ? `In-app notification sent to ${name}`
          : json.demo
            ? `Demo notification sent to ${name}`
            : `In-app notification sent to ${name}`
      );
    } catch (e) {
      setNotifyMsg(e instanceof Error ? e.message : "Failed to notify");
    } finally {
      setNotifyBusy(null);
    }
  }

  if (scopeLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (scopeError) return <Alert tone="error">{scopeError}</Alert>;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Live class performance for your assigned papers"
      />

      <LecturerPaperSelectors />

      {!paperId ? (
        <EmptyState
          title="No papers assigned"
          description="Ask your partner admin to assign papers and classes to your lecturer account."
        />
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : error ? (
        <Alert tone="error">{error}</Alert>
      ) : !overview ? (
        <EmptyState title="No data" description="Dashboard data is unavailable." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard
              label="Total Enrolled Students"
              value={String(overview.kpis.totalEnrolledStudents)}
              tone="brand"
              icon="students"
            />
            <AdminStatCard
              label="Average Class Score"
              value={`${overview.kpis.averageClassScore}%`}
              tone="brand"
              icon="score"
            />
            <AdminStatCard
              label="Pass Probability / Readiness"
              value={`${overview.kpis.passProbability}%`}
              tone="success"
              icon="results"
            />
            <AdminStatCard
              label="Mock Participation Rate"
              value={`${overview.kpis.mockParticipationRate}%`}
              tone="accent"
              icon="mock"
            />
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Category / Sub Category Performance
                </h2>
                <p className="text-sm text-slate-500">
                  Click a row to filter · Pass mark {overview.passMark}%
                  {filterSubCategoryId && (
                    <>
                      {" · "}
                      <button
                        type="button"
                        className="font-medium text-sky-700 hover:underline"
                        onClick={() => setFilterSubCategoryId(null)}
                      >
                        Clear filter
                      </button>
                    </>
                  )}
                </p>
              </div>
            </CardHeader>
            <CardBody className="overflow-x-auto p-0">
              {filteredCategories.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">No category data yet.</div>
              ) : (
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3">Category / Sub Category</th>
                      <th className="px-5 py-3 text-right">Avg Score</th>
                      <th className="px-5 py-3 min-w-[220px]">Performance</th>
                      <th className="px-5 py-3 text-right">Below Pass</th>
                      <th className="px-5 py-3 text-right">Attempts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCategories.map((row) => (
                      <tr
                        key={row.subCategoryId}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-sky-50/50",
                          filterSubCategoryId === row.subCategoryId && "bg-sky-50"
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
                        <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-800">
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
                                  statusTone(row.status) === "success" && "bg-emerald-500",
                                  statusTone(row.status) === "warning" && "bg-amber-500",
                                  statusTone(row.status) === "danger" && "bg-red-500"
                                )}
                                style={{ width: `${Math.min(100, Math.max(0, row.averageScore))}%` }}
                                role="progressbar"
                                aria-valuenow={row.averageScore}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={row.status}
                              />
                            </div>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2.5 py-0.5 text-xs italic font-medium",
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

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Class Performance Over Time
                  </h2>
                  <p className="text-sm text-slate-500">
                    Average score for {selectedPaper?.code}
                  </p>
                </div>
                <label className="inline-flex shrink-0 items-center gap-2">
                  <span className="sr-only">Timeline</span>
                  <select
                    value={trendRange}
                    onChange={(e) => setTrendRange(e.target.value as TrendRange)}
                    className="h-9 min-w-[10.5rem] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    aria-label="Select timeline"
                  >
                    {TREND_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </CardHeader>
              <CardBody>
                <div className="h-64">
                  {trendPoints.every((p) => p.averageScore == null) ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      No attempts in this period.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendPoints}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 12, fill: "#64748b" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 12, fill: "#64748b" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="averageScore"
                          name="Avg score"
                          stroke="#0284c7"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">At-Risk Students</h2>
                  <p className="text-sm text-slate-500">Students who need support</p>
                </div>
                <Link
                  href="/lecturer/at-risk-students"
                  className="text-sm font-medium text-sky-700 hover:underline"
                >
                  View all →
                </Link>
              </CardHeader>
              <CardBody className="space-y-3">
                {notifyMsg && <Alert tone="success">{notifyMsg}</Alert>}
                {atRisk.length === 0 ? (
                  <p className="text-sm text-slate-500">No at-risk students for this paper.</p>
                ) : (
                  atRisk.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-100 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{s.name}</p>
                        <p className="text-xs text-slate-500">
                          {s.overallScore != null ? `${s.overallScore}%` : "No score"} ·{" "}
                          {s.mockAttempts} mocks
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={riskTone(s.riskStatus)}>{s.riskStatus}</Badge>
                        <Link href={`/lecturer/students/${s.id}`}>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={notifyBusy === s.id}
                          onClick={() => void quickNotify(s.id, s.name)}
                        >
                          {notifyBusy === s.id ? "Sending…" : "Notify"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
