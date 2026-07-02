"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/admin/EmptyState";

interface Analytics {
  mostFailedTopics: { topic: string; failRate: number; attempts: number }[];
  mostAttemptedPapers: { paper: string; title: string; attempts: number }[];
  questionAccuracyRate: number;
  progressTrend: { date: string; score: number }[];
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then((d) => setAnalytics(d.analytics ?? null))
      .finally(() => setLoading(false));
  }, []);

  const hasData =
    analytics &&
    (analytics.mostFailedTopics.length > 0 ||
      analytics.mostAttemptedPapers.length > 0 ||
      analytics.progressTrend.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Platform-wide insights on student performance and content usage.
        </p>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading analytics…</div>
      ) : !hasData ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="↗"
              title="Analytics will appear here"
              description="As students complete quizzes, you'll see topic failure rates, paper popularity, and progress trends."
              actionLabel="View Students"
              actionHref="/admin/students"
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-ink-900">Most Failed Topics</h2>
            </CardHeader>
            <CardBody>
              {analytics!.mostFailedTopics.length === 0 ? (
                <p className="text-sm text-slate-400">Not enough data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics!.mostFailedTopics} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="topic"
                      tick={{ fontSize: 11 }}
                      width={100}
                    />
                    <Tooltip />
                    <Bar dataKey="failRate" fill="#ef4444" radius={[0, 4, 4, 0]} name="Fail rate %" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-ink-900">Most Attempted Papers</h2>
            </CardHeader>
            <CardBody>
              {analytics!.mostAttemptedPapers.length === 0 ? (
                <p className="text-sm text-slate-400">Not enough data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics!.mostAttemptedPapers}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="paper" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="attempts" fill="#2456f5" radius={[4, 4, 0, 0]} name="Attempts" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-ink-900">Question Accuracy Rate</h2>
            </CardHeader>
            <CardBody className="flex flex-col items-center py-8">
              <div className="text-5xl font-bold text-ink-900">
                {analytics!.questionAccuracyRate}%
              </div>
              <p className="mt-2 text-sm text-slate-500">Correct answers across all responses</p>
              <div className="mt-4">
                <Badge tone={analytics!.questionAccuracyRate >= 60 ? "success" : "warning"}>
                  {analytics!.questionAccuracyRate >= 60 ? "Healthy" : "Needs attention"}
                </Badge>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-ink-900">Student Progress Trend</h2>
            </CardHeader>
            <CardBody>
              {analytics!.progressTrend.length === 0 ? (
                <p className="text-sm text-slate-400">No trend data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={analytics!.progressTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#2456f5"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#2456f5" }}
                      name="Score %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
