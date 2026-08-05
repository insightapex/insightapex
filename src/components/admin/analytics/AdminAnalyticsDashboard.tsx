"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { ScoreBandId } from "@/lib/admin-results";
import {
  ANALYTICS_PERIODS,
  type AnalyticsPeriod,
  type PlatformAnalyticsResponse,
  type QuestionAnalyticsRow,
} from "@/lib/admin-analytics-types";

const BAND_COLORS: Record<ScoreBandId, string> = {
  under_50: "#ef4444",
  "50_59": "#f97316",
  "60_79": "#eab308",
  "80_plus": "#10b981",
};

function failureIntensity(rate: number): string {
  if (rate >= 70) return "bg-red-700 text-white";
  if (rate >= 50) return "bg-red-500 text-white";
  if (rate >= 35) return "bg-orange-400 text-white";
  if (rate >= 20) return "bg-amber-300 text-slate-900";
  return "bg-emerald-100 text-slate-800";
}

function PeriodSelector({
  period,
  onChange,
}: {
  period: AnalyticsPeriod;
  onChange: (period: AnalyticsPeriod) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ANALYTICS_PERIODS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            period === option.value
              ? "bg-ink-900 text-white"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-panel">
      {label && <p className="mb-1 font-medium text-slate-800">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
          {entry.name.toLowerCase().includes("rate") ? "%" : ""}
        </p>
      ))}
    </div>
  );
}

function QuestionDetailModal({
  questionId,
  onClose,
}: {
  questionId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<{
    text: string;
    explanation: string | null;
    options: { text: string; isCorrect: boolean }[];
    subCategory: { title: string; category: { title: string; paper: { code: string } } };
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/questions/${questionId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load question");
        return r.json();
      })
      .then(setQuestion)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [questionId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-ink-900">Question details</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          {loading ? (
            <p className="text-sm text-slate-400">Loading question…</p>
          ) : error || !question ? (
            <p className="text-sm text-red-500">{error ?? "Question not found."}</p>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                {question.subCategory.category.paper.code} · {question.subCategory.category.title} /{" "}
                {question.subCategory.title}
              </p>
              <p className="text-sm leading-relaxed text-slate-800">{question.text}</p>
              <ul className="space-y-2">
                {question.options.map((option, index) => (
                  <li
                    key={index}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm",
                      option.isCorrect
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    )}
                  >
                    {option.text}
                    {option.isCorrect && (
                      <span className="ml-2 text-xs font-medium text-emerald-700">Correct</span>
                    )}
                  </li>
                ))}
              </ul>
              {question.explanation && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <p className="mb-1 text-xs font-medium uppercase text-slate-500">Explanation</p>
                  {question.explanation}
                </div>
              )}
              <Link
                href="/admin/questions"
                className="inline-flex text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Open Questions admin →
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionAnalyticsTable({
  rows,
  onViewQuestion,
}: {
  rows: QuestionAnalyticsRow[];
  onViewQuestion: (questionId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">
        No answered questions in this sub category for the selected period.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2 font-medium">Question</th>
            <th className="px-3 py-2 font-medium">Attempts</th>
            <th className="px-3 py-2 font-medium">Correct</th>
            <th className="px-3 py-2 font-medium">Wrong</th>
            <th className="px-3 py-2 font-medium">Top wrong option</th>
            <th className="px-3 py-2 font-medium">Difficulty votes</th>
            <th className="px-3 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const totalVotes =
              row.difficultyVotes.easy + row.difficultyVotes.medium + row.difficultyVotes.hard;
            return (
              <tr key={row.questionId} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="max-w-xs px-3 py-3 text-slate-800">{row.questionText}</td>
                <td className="px-3 py-3 text-slate-700">{row.attempts}</td>
                <td className="px-3 py-3 text-emerald-700">{row.correctRate}%</td>
                <td className="px-3 py-3 text-red-600">{row.wrongRate}%</td>
                <td className="max-w-[180px] px-3 py-3 text-slate-600">
                  {row.mostSelectedWrongOption ?? "—"}
                </td>
                <td className="px-3 py-3 text-slate-500">
                  {totalVotes > 0 ? (
                    <span>
                      E {row.difficultyVotes.easy} · M {row.difficultyVotes.medium} · H{" "}
                      {row.difficultyVotes.hard}
                    </span>
                  ) : (
                    <span className="text-xs italic">Not stored yet</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onViewQuestion(row.questionId)}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    View Question
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AdminAnalyticsDashboard() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [paperId, setPaperId] = useState<string | null>(null);
  const [subCategoryId, setSubCategoryId] = useState<string | null>(null);
  const [analysisTab, setAnalysisTab] = useState<"categories" | "subcategories">("subcategories");
  const [data, setData] = useState<PlatformAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewQuestionId, setViewQuestionId] = useState<string | null>(null);

  const loadAnalytics = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ period });
    if (paperId) params.set("paperId", paperId);
    if (subCategoryId) params.set("subCategoryId", subCategoryId);

    fetch(`/api/admin/analytics?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load analytics");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [period, paperId, subCategoryId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const paperChartData = useMemo(
    () =>
      (data?.paperPerformance ?? [])
        .filter((row) => row.attempts > 0)
        .slice(0, 10)
        .map((row) => ({
          ...row,
          shortLabel: row.paperCode,
        })),
    [data?.paperPerformance]
  );

  const hasAnyData =
    data &&
    (data.kpis.totalAttempts > 0 ||
      data.paperPerformance.some((p) => p.attempts > 0) ||
      data.trends.length > 0);

  const selectPaper = (id: string) => {
    setPaperId(id);
    setSubCategoryId(null);
    setAnalysisTab("subcategories");
  };

  const selectSubCategory = (id: string, linkedPaperId?: string) => {
    if (linkedPaperId) setPaperId(linkedPaperId);
    setSubCategoryId(id);
  };

  const clearPaper = () => {
    setPaperId(null);
    setSubCategoryId(null);
  };

  const clearSubCategory = () => setSubCategoryId(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Chart-based performance insights with drill-down from papers to individual questions.
          </p>
        </div>
        <PeriodSelector period={period} onChange={setPeriod} />
      </div>

      {(paperId || subCategoryId) && (
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={clearPaper}
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            All papers
          </button>
          {data?.selectedPaper && (
            <>
              <span className="text-slate-300">/</span>
              {subCategoryId ? (
                <button
                  type="button"
                  onClick={clearSubCategory}
                  className="font-medium text-brand-600 hover:text-brand-700"
                >
                  {data.selectedPaper.label}
                </button>
              ) : (
                <span className="font-medium text-slate-800">{data.selectedPaper.label}</span>
              )}
            </>
          )}
          {data?.selectedSubCategory && (
            <>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-slate-800">{data.selectedSubCategory.label}</span>
            </>
          )}
          {(paperId || subCategoryId) && (
            <button
              type="button"
              onClick={clearPaper}
              className="ml-auto rounded-lg px-2.5 py-1 text-xs text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Clear filters
            </button>
          )}
        </nav>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          Loading analytics…
        </div>
      ) : error ? (
        <Card>
          <CardBody>
            <p className="py-8 text-center text-sm text-red-500">{error}</p>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={loadAnalytics}
                className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white"
              >
                Retry
              </button>
            </div>
          </CardBody>
        </Card>
      ) : !hasAnyData ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="↗"
              title="Analytics will appear here"
              description="As students submit quizzes, you'll see KPIs, paper performance, failure heatmaps, and question-level insights."
              actionLabel="View Students"
              actionHref="/admin/students"
            />
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard
              label="Total attempts"
              value={data!.kpis.totalAttempts.toLocaleString()}
              sub={paperId ? "Filtered to selected paper" : "Submitted student quizzes"}
              tone="brand"
              icon="▣"
            />
            <AdminStatCard
              label="Pass rate"
              value={`${data!.kpis.passRate}%`}
              sub="Attempts meeting pass threshold"
              tone="success"
              icon="✓"
            />
            <AdminStatCard
              label="Active students"
              value={data!.kpis.activeStudents.toLocaleString()}
              sub={`Unique students in period`}
              tone="accent"
              icon="◎"
            />
            <AdminStatCard
              label="Questions answered"
              value={data!.kpis.totalQuestionsAnswered.toLocaleString()}
              sub="Individual responses submitted"
              tone="neutral"
              icon="?"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-ink-900">Paper performance</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Attempts, pass rate, and completion rate per paper. Click a bar to filter the dashboard.
                </p>
              </CardHeader>
              <CardBody>
                {paperChartData.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">No paper attempts in this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={paperChartData} margin={{ top: 8, right: 8, left: -8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="shortLabel" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="attempts"
                        fill="#2456f5"
                        name="Attempts"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        onClick={(bar) => {
                          const payload = bar?.payload as { paperId?: string } | undefined;
                          if (payload?.paperId) selectPaper(payload.paperId);
                        }}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="passRate"
                        fill="#10b981"
                        name="Pass rate %"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="completionRate"
                        fill="#7c3aed"
                        name="Completion rate %"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-ink-900">Most attempted papers</h2>
                <p className="mt-1 text-sm text-slate-500">Top papers by submission count. Click to filter.</p>
              </CardHeader>
              <CardBody>
                {data!.mostAttemptedPapers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">No attempts yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={data!.mostAttemptedPapers.map((row) => ({
                        ...row,
                        shortLabel: row.paperCode,
                      }))}
                      margin={{ top: 8, right: 8, left: -8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="shortLabel" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="attempts"
                        fill="#2456f5"
                        name="Attempts"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        onClick={(bar) => {
                          const payload = bar?.payload as { paperId?: string } | undefined;
                          if (payload?.paperId) selectPaper(payload.paperId);
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </div>

          {paperId && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-ink-900">Category analysis</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Breakdown for {data?.selectedPaper?.label ?? "selected paper"}.
                    </p>
                  </div>
                  <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                    {(["categories", "subcategories"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setAnalysisTab(tab)}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                          analysisTab === tab
                            ? "bg-white text-ink-900 shadow-sm"
                            : "text-slate-600 hover:text-slate-800"
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                {analysisTab === "categories" ? (
                  data!.categories.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">No category data yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart
                        data={data!.categories.map((row) => ({
                          ...row,
                          shortLabel:
                            row.categoryTitle.length > 16
                              ? `${row.categoryTitle.slice(0, 16)}…`
                              : row.categoryTitle,
                        }))}
                        margin={{ top: 8, right: 8, left: -8, bottom: 48 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="shortLabel" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend />
                        <Bar dataKey="passRate" fill="#10b981" name="Pass rate %" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="failureRate" fill="#ef4444" name="Failure rate %" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="completionRate" fill="#94a3b8" name="Completion rate %" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                ) : data!.subCategories.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">No sub category data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={data!.subCategories.map((row) => ({
                        ...row,
                        shortLabel:
                          row.subCategoryTitle.length > 14
                            ? `${row.subCategoryTitle.slice(0, 14)}…`
                            : row.subCategoryTitle,
                      }))}
                      margin={{ top: 8, right: 8, left: -8, bottom: 48 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="shortLabel" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="failureRate"
                        fill="#ef4444"
                        name="Failure rate %"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        onClick={(bar) => {
                          const payload = bar?.payload as { subCategoryId?: string } | undefined;
                          if (payload?.subCategoryId) selectSubCategory(payload.subCategoryId);
                        }}
                      />
                      <Bar dataKey="passRate" fill="#10b981" name="Pass rate %" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completionRate" fill="#94a3b8" name="Completion rate %" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-ink-900">Most failed sub categories</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Ranked by failure rate. Click a row for question-level analytics.
                </p>
              </CardHeader>
              <CardBody>
                {data!.mostFailedSubCategories.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">No failure data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={data!.mostFailedSubCategories.map((row) => ({
                        ...row,
                        shortLabel:
                          row.label.length > 18 ? `${row.label.slice(0, 18)}…` : row.label,
                      }))}
                      margin={{ top: 8, right: 8, left: -8, bottom: 48 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="shortLabel" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: number, name: string, item) => {
                          const payload = item.payload as { attempts?: number };
                          if (name === "Failure rate %") {
                            return [`${value}% (${payload.attempts ?? 0} attempts)`, name];
                          }
                          return [value, name];
                        }}
                      />
                      <Bar
                        dataKey="failureRate"
                        fill="#ef4444"
                        name="Failure rate %"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        onClick={(bar) => {
                          const payload = bar?.payload as {
                            subCategoryId?: string;
                            paperId?: string;
                          } | undefined;
                          if (payload?.subCategoryId) {
                            selectSubCategory(payload.subCategoryId, payload.paperId || undefined);
                          }
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-ink-900">Performance distribution</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Share of submitted attempts by final score band.
                </p>
              </CardHeader>
              <CardBody>
                {data!.kpis.totalAttempts === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">No submissions in this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={data!.scoreDistribution}
                      margin={{ top: 8, right: 8, left: -8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        formatter={(value: number, _name, item) => {
                          const payload = item.payload as { label: string; percent: number };
                          return [`${value} attempts (${payload.percent}%)`, payload.label];
                        }}
                      />
                      <Bar dataKey="count" name="Attempts" radius={[4, 4, 0, 0]}>
                        {data!.scoreDistribution.map((band) => (
                          <Cell key={band.id} fill={BAND_COLORS[band.id]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </div>

          {subCategoryId && (
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-ink-900">Question analytics</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Most missed questions in {data?.selectedSubCategory?.label ?? "selected sub category"}.
                </p>
              </CardHeader>
              <CardBody>
                <QuestionAnalyticsTable
                  rows={data!.questionAnalytics}
                  onViewQuestion={setViewQuestionId}
                />
              </CardBody>
            </Card>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-ink-900">Attempts over time</h2>
              </CardHeader>
              <CardBody>
                {data!.trends.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">No trend data in this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data!.trends} margin={{ top: 8, right: 8, left: -8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => v.slice(5)}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="attempts"
                        fill="#2456f5"
                        name="Attempts"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-ink-900">Pass rate over time</h2>
              </CardHeader>
              <CardBody>
                {data!.trends.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">No trend data in this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data!.trends} margin={{ top: 8, right: 8, left: -8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => v.slice(5)}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="passRate"
                        fill="#10b981"
                        name="Pass rate %"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-ink-900">Failure heatmap</h2>
              <p className="mt-1 text-sm text-slate-500">
                Paper → category → sub category failure intensity. Darker cells indicate higher failure rates.
              </p>
            </CardHeader>
            <CardBody>
              {data!.heatmap.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No heatmap data yet.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {data!.heatmap.map((cell) => (
                    <button
                      key={`${cell.paperCode}-${cell.label}`}
                      type="button"
                      onClick={() => {
                        const match = data!.subCategories.find(
                          (row) => row.subCategoryTitle === cell.subCategoryTitle &&
                            row.categoryTitle === cell.categoryTitle
                        );
                        if (match) selectSubCategory(match.subCategoryId);
                      }}
                      className={cn(
                        "rounded-xl p-3 text-left text-xs transition-transform hover:scale-[1.02]",
                        failureIntensity(cell.failureRate)
                      )}
                      title={`${cell.label}: ${cell.failureRate}% failure (${cell.attempts} attempts)`}
                    >
                      <p className="font-semibold">{cell.paperCode}</p>
                      <p className="mt-1 opacity-90">{cell.categoryTitle}</p>
                      <p className="truncate font-medium">{cell.subCategoryTitle}</p>
                      <p className="mt-2 text-[11px] opacity-90">
                        {cell.failureRate}% fail · {cell.attempts} attempts
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      {viewQuestionId && (
        <QuestionDetailModal questionId={viewQuestionId} onClose={() => setViewQuestionId(null)} />
      )}
    </div>
  );
}
