"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { QuickActionCard } from "@/components/admin/QuickActionCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PortalIcon } from "@/components/portal/PortalIcons";

interface AdminOverview {
  totalStudents: number;
  totalPapers: number;
  totalQuestions: number;
  totalCategories: number;
  totalSubCategories: number;
  mockExamsCreated: number;
  averageStudentScore: number;
  weakestSubCategory: string | null;
  analytics: {
    mostFailedSubCategories: { subCategory: string; failRate: number; attempts: number }[];
    mostAttemptedPapers: { paper: string; title: string; attempts: number }[];
    questionAccuracyRate: number;
    progressTrend: { date: string; score: number }[];
  };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load dashboard");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-slate-500">Loading admin dashboard…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon="warning"
        title="Unable to load dashboard"
        description={error ?? "Something went wrong. Please try again."}
        actionLabel="Retry"
        actionHref="/admin"
      />
    );
  }

  return (
    <div className="min-w-0 space-y-8 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Owner Portal</p>
          <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage content, track student performance, and monitor platform health.
          </p>
        </div>
        <Link href="/admin/questions" className="shrink-0 self-start sm:self-auto">
          <Button>+ Add Question</Button>
        </Link>
      </div>

      {/* Overview cards */}
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <AdminStatCard label="Total Students" value={data.totalStudents} icon="students" accent="brand" />
        <AdminStatCard label="Total Questions" value={data.totalQuestions} icon="questions" accent="violet" />
        <AdminStatCard label="Total Papers" value={data.totalPapers} icon="papers" accent="emerald" />
        <AdminStatCard label="Categories" value={data.totalCategories} icon="categories" accent="amber" />
        <AdminStatCard label="Sub Categories" value={data.totalSubCategories} icon="subcategories" accent="violet" />
        <AdminStatCard
          label="Mock Exams Created"
          value={data.mockExamsCreated}
          icon="mock"
          accent="rose"
        />
        <AdminStatCard
          label="Avg Student Score"
          value={data.mockExamsCreated > 0 ? `${data.averageStudentScore}%` : "—"}
          sub={data.mockExamsCreated === 0 ? "No quiz data yet" : undefined}
          icon="trend"
          accent="emerald"
        />
        <AdminStatCard
          label="Weakest Sub Category"
          value={data.weakestSubCategory ?? "—"}
          sub={data.weakestSubCategory ? "Lowest accuracy" : "Need more attempts"}
          icon="warning"
          accent="amber"
        />
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <QuickActionCard
            href="/admin/questions"
            label="Add New Question"
            description="Create MCQ content"
            icon="questions"
            accent="brand"
          />
          <QuickActionCard
            href="/admin/papers"
            label="Create Paper"
            description="Add ACCA paper"
            icon="papers"
            accent="emerald"
          />
          <QuickActionCard
            href="/admin/categories"
            label="Create Category"
            description="Organize paper content"
            icon="categories"
            accent="violet"
          />
          <QuickActionCard
            href="/admin/subcategories"
            label="Create Sub Category"
            description="Group practice questions"
            icon="subcategories"
            accent="amber"
          />
          <QuickActionCard
            href="/admin/mock-exams"
            label="Create Mock Exam"
            description="Configure timed quiz"
            icon="mock"
            accent="amber"
          />
          <QuickActionCard
            href="/admin/results"
            label="View Student Results"
            description="Review submissions"
            icon="results"
            accent="rose"
          />
        </div>
      </section>

      {/* Analytics preview */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            Analytics Preview
          </h2>
          <Link href="/admin/analytics" className="text-xs font-medium text-brand-600 hover:text-brand-700">
            Full analytics →
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <PortalIcon name="fail" className="h-5 w-5" />
                </span>
                <h3 className="text-sm font-semibold text-ink-900">Most Failed Sub Categories</h3>
              </div>
            </CardHeader>
            <CardBody>
              {data.analytics.mostFailedSubCategories.length === 0 ? (
                <p className="text-sm text-slate-400">Not enough data yet.</p>
              ) : (
                <ul className="space-y-3">
                  {data.analytics.mostFailedSubCategories.map((t) => (
                    <li key={t.subCategory} className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-slate-700">{t.subCategory}</span>
                      <Badge tone="danger">{t.failRate}% fail</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <PortalIcon name="papers" className="h-5 w-5" />
                </span>
                <h3 className="text-sm font-semibold text-ink-900">Most Attempted Papers</h3>
              </div>
            </CardHeader>
            <CardBody>
              {data.analytics.mostAttemptedPapers.length === 0 ? (
                <p className="text-sm text-slate-400">No quiz attempts yet.</p>
              ) : (
                <ul className="space-y-3">
                  {data.analytics.mostAttemptedPapers.map((p) => (
                    <li key={p.paper} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-medium text-brand-600">{p.paper}</span>
                        <p className="truncate text-xs text-slate-400">{p.title}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-slate-700">{p.attempts}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <PortalIcon name="score" className="h-5 w-5" />
                </span>
                <h3 className="text-sm font-semibold text-ink-900">Question Accuracy Rate</h3>
              </div>
            </CardHeader>
            <CardBody className="flex flex-col items-center justify-center py-4">
              <div className="text-4xl font-bold text-ink-900">
                {data.analytics.questionAccuracyRate > 0
                  ? `${data.analytics.questionAccuracyRate}%`
                  : "—"}
              </div>
              <p className="mt-2 text-center text-xs text-slate-500">
                Across all student responses
              </p>
            </CardBody>
          </Card>

          <Card className="lg:col-span-2 xl:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <PortalIcon name="trend" className="h-5 w-5" />
                </span>
                <h3 className="text-sm font-semibold text-ink-900">Student Progress Trend</h3>
              </div>
            </CardHeader>
            <CardBody>
              {data.analytics.progressTrend.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-slate-400">
                  Chart will populate as students complete quizzes.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={data.analytics.progressTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={28} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#2456f5"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#2456f5" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>
        </div>
      </section>
    </div>
  );
}
