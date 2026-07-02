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

interface AdminOverview {
  totalStudents: number;
  totalPapers: number;
  totalQuestions: number;
  totalTopics: number;
  mockExamsCreated: number;
  averageStudentScore: number;
  weakestTopic: string | null;
  recentActivity: { id: string; type: string; message: string; date: string }[];
  recentQuestions: {
    id: string;
    text: string;
    paper: string;
    topic: string;
    difficulty: string;
    correctAnswer: string;
    status: string;
    isActive: boolean;
  }[];
  studentPerformance: {
    id: string;
    name: string;
    email: string;
    quizzesCompleted: number;
    averageScore: number | null;
    weakestTopic: string | null;
    lastActivity: string;
  }[];
  analytics: {
    mostFailedTopics: { topic: string; failRate: number; attempts: number }[];
    mostAttemptedPapers: { paper: string; title: string; attempts: number }[];
    questionAccuracyRate: number;
    progressTrend: { date: string; score: number }[];
  };
}

const diffTone: Record<string, "success" | "warning" | "danger"> = {
  EASY: "success",
  MEDIUM: "warning",
  HARD: "danger",
};

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelative(date: string | null | undefined) {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(date);
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
        icon="⚠️"
        title="Unable to load dashboard"
        description={error ?? "Something went wrong. Please try again."}
        actionLabel="Retry"
        actionHref="/admin"
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Admin Portal</p>
          <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage content, track student performance, and monitor platform health.
          </p>
        </div>
        <Link href="/admin/questions">
          <Button>+ Add Question</Button>
        </Link>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <AdminStatCard label="Total Students" value={data.totalStudents} icon="◎" accent="brand" />
        <AdminStatCard label="Total Questions" value={data.totalQuestions} icon="✎" accent="violet" />
        <AdminStatCard label="Total Papers" value={data.totalPapers} icon="☰" accent="emerald" />
        <AdminStatCard label="Total Topics" value={data.totalTopics} icon="◈" accent="amber" />
        <AdminStatCard
          label="Mock Exams Created"
          value={data.mockExamsCreated}
          icon="⏱"
          accent="rose"
        />
        <AdminStatCard
          label="Avg Student Score"
          value={data.mockExamsCreated > 0 ? `${data.averageStudentScore}%` : "—"}
          sub={data.mockExamsCreated === 0 ? "No quiz data yet" : undefined}
          icon="↗"
          accent="emerald"
        />
        <AdminStatCard
          label="Weakest Topic"
          value={data.weakestTopic ?? "—"}
          sub={data.weakestTopic ? "Lowest accuracy" : "Need more attempts"}
          icon="⚠"
          accent="amber"
        />
        <AdminStatCard
          label="Recent Activity"
          value={data.recentActivity.length}
          sub="Events tracked"
          icon="▦"
          accent="slate"
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
            icon="✎"
            accent="brand"
          />
          <QuickActionCard
            href="/admin/papers"
            label="Create Paper"
            description="Add ACCA paper"
            icon="☰"
            accent="emerald"
          />
          <QuickActionCard
            href="/admin/topics"
            label="Create Topic"
            description="Organize chapters"
            icon="◈"
            accent="violet"
          />
          <QuickActionCard
            href="/admin/mock-exams"
            label="Create Mock Exam"
            description="Configure timed quiz"
            icon="⏱"
            accent="amber"
          />
          <QuickActionCard
            href="/admin/results"
            label="View Student Results"
            description="Review submissions"
            icon="✓"
            accent="rose"
          />
        </div>
      </section>

      {/* Recent activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">Recent Activity</h2>
          <Link href="/admin/analytics" className="text-xs font-medium text-brand-600 hover:text-brand-700">
            View analytics →
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          {data.recentActivity.length === 0 ? (
            <EmptyState
              icon="📭"
              title="No activity yet"
              description="Student signups and quiz completions will appear here."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentActivity.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm">
                      {item.type === "signup" ? "◎" : "✓"}
                    </span>
                    <p className="truncate text-sm text-slate-700">{item.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{formatRelative(item.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Question preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink-900">Recent Questions</h2>
              <p className="mt-0.5 text-xs text-slate-500">Latest content in the bank</p>
            </div>
            <Link href="/admin/questions">
              <Button variant="outline" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardBody className="p-0 overflow-x-auto">
            {data.recentQuestions.length === 0 ? (
              <EmptyState
                icon="✎"
                title="No questions yet"
                description="Start building your question bank for students."
                actionLabel="Add Question"
                actionHref="/admin/questions"
              />
            ) : (
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Question
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Paper
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Topic
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Difficulty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Answer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentQuestions.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/50">
                      <td className="max-w-[180px] truncate px-4 py-3 font-medium text-slate-800">
                        {q.text}
                      </td>
                      <td className="px-4 py-3 text-brand-600 font-medium">{q.paper}</td>
                      <td className="max-w-[120px] truncate px-4 py-3 text-slate-500">{q.topic}</td>
                      <td className="px-4 py-3">
                        <Badge tone={diffTone[q.difficulty] ?? "neutral"}>{q.difficulty}</Badge>
                      </td>
                      <td className="max-w-[100px] truncate px-4 py-3 text-slate-500">
                        {q.correctAnswer}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={q.isActive ? "success" : "neutral"}>{q.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link href={`/admin/questions`}>
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          </Link>
                          <Link href={`/admin/questions`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" disabled>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        {/* Student performance preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink-900">Student Performance</h2>
              <p className="mt-0.5 text-xs text-slate-500">Top students by recent activity</p>
            </div>
            <Link href="/admin/students">
              <Button variant="outline" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardBody className="p-0 overflow-x-auto">
            {data.studentPerformance.length === 0 ? (
              <EmptyState
                icon="◎"
                title="No students yet"
                description="Registered students and their performance will show here."
                actionLabel="View Students"
                actionHref="/admin/students"
              />
            ) : (
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Quizzes
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Avg Score
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Weakest Topic
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Last Active
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.studentPerformance.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                      <td className="max-w-[140px] truncate px-4 py-3 text-slate-500">{s.email}</td>
                      <td className="px-4 py-3 text-slate-600">{s.quizzesCompleted}</td>
                      <td className="px-4 py-3">
                        {s.averageScore !== null ? (
                          <span
                            className={
                              s.averageScore >= 50 ? "font-semibold text-emerald-600" : "font-semibold text-red-600"
                            }
                          >
                            {s.averageScore}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="max-w-[120px] truncate px-4 py-3 text-slate-500">
                        {s.weakestTopic ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{formatRelative(s.lastActivity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

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
              <h3 className="text-sm font-semibold text-ink-900">Most Failed Topics</h3>
            </CardHeader>
            <CardBody>
              {data.analytics.mostFailedTopics.length === 0 ? (
                <p className="text-sm text-slate-400">Not enough data yet.</p>
              ) : (
                <ul className="space-y-3">
                  {data.analytics.mostFailedTopics.map((t) => (
                    <li key={t.topic} className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-slate-700">{t.topic}</span>
                      <Badge tone="danger">{t.failRate}% fail</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-ink-900">Most Attempted Papers</h3>
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
              <h3 className="text-sm font-semibold text-ink-900">Question Accuracy Rate</h3>
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
              <h3 className="text-sm font-semibold text-ink-900">Student Progress Trend</h3>
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
