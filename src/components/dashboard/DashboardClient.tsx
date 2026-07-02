"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/StatCard";
import { ScoreChart } from "@/components/dashboard/ScoreChart";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { ContinuePracticeCard } from "@/components/dashboard/ContinuePracticeCard";
import { WeakTopicItem } from "@/components/dashboard/WeakTopicItem";
import { RecommendedPracticeItem } from "@/components/dashboard/RecommendedPracticeItem";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { DashboardOverview } from "@/types";

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-36 rounded-xl2 bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl2 bg-slate-200" />
        ))}
      </div>
      <div className="h-64 rounded-xl2 bg-slate-200" />
    </div>
  );
}

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function DashboardClient() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const timer = window.setTimeout(() => scrollToSection(hash), 100);
    return () => window.clearTimeout(timer);
  }, [loading]);

  if (loading) return <DashboardSkeleton />;

  const avg = data?.averageScore ?? 0;
  const hasAttempts = (data?.totalAttempts ?? 0) > 0;
  const focusTopics = data?.topicDetails?.filter((t) => t.status === "Weak") ?? [];
  const displayTopics = focusTopics.length > 0 ? focusTopics : (data?.topicDetails?.slice(0, 5) ?? []);

  return (
    <div className="space-y-8">
      <WelcomeHeader
        studentName={data?.studentName ?? "Student"}
        hasAttempts={hasAttempts}
      />

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Your Stats
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="Total Attempts" value={data?.totalAttempts ?? 0} icon="📋" tone="brand" />
          <StatCard
            label="Average Score"
            value={`${avg}%`}
            tone={avg >= 50 ? "success" : "warning"}
            sub={avg >= 50 ? "Above pass mark" : "Below pass mark"}
            icon="📊"
          />
          <StatCard label="Quizzes Completed" value={data?.completedQuizzes ?? 0} icon="✅" />
          <StatCard
            label="Best Score"
            value={hasAttempts ? `${data?.bestScore ?? 0}%` : "—"}
            tone={(data?.bestScore ?? 0) >= 50 ? "success" : "default"}
            sub={hasAttempts ? "Personal best" : "Complete a quiz"}
            icon="🏆"
          />
          <StatCard
            label="Weak Topics"
            value={data?.weakTopicCount ?? 0}
            sub="Need attention"
            tone="warning"
            icon="🎯"
          />
          <StatCard
            label="Study Streak"
            value={hasAttempts ? `${data?.studyStreak ?? 0} days` : "0 days"}
            sub={hasAttempts ? "Keep it going!" : "Start practising"}
            tone={(data?.studyStreak ?? 0) >= 3 ? "success" : "brand"}
            icon="🔥"
          />
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Continue Practice</h2>
            <p className="mt-0.5 text-sm text-slate-500">Pick up where you left off on your ACCA papers.</p>
          </div>
          <Link href="/dashboard/quiz" className="hidden text-sm font-medium text-brand-600 hover:text-brand-700 sm:block">
            View all →
          </Link>
        </div>

        {!data?.paperProgress?.length ? (
          <Card>
            <EmptyState
              icon="📚"
              title="No papers available"
              description="ACCA papers will appear here once they are added to the platform."
            />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.paperProgress.map((paper) => (
              <ContinuePracticeCard key={paper.id} paper={paper} />
            ))}
          </div>
        )}
      </section>

      <section id="progress" className="scroll-mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Score History</h2>
              <p className="mt-0.5 text-sm text-slate-500">Recent quiz scores and your trend over time.</p>
            </div>
          </CardHeader>
          <CardBody>
            <ScoreChart data={data?.scoreHistory ?? []} />
          </CardBody>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section id="weak-topics" className="scroll-mt-6">
          <Card className="h-full">
            <CardHeader>
              <h2 className="text-lg font-semibold text-ink-900">Weak Topics</h2>
              <p className="mt-0.5 text-sm text-slate-500">Focus on areas where your accuracy needs improvement.</p>
            </CardHeader>
            <CardBody>
              {!hasAttempts ? (
                <EmptyState
                  compact
                  icon="🎯"
                  title="No topics analysed yet"
                  description="No quiz history yet. Start your first practice to see your weak areas."
                  actionLabel="Start Practice"
                  actionHref="/dashboard/quiz"
                />
              ) : displayTopics.length === 0 ? (
                <EmptyState
                  compact
                  icon="🌟"
                  title="No weak topics detected"
                  description="Great work — you're performing well across all topics!"
                />
              ) : (
                <ul className="space-y-3">
                  {displayTopics.map((topic) => (
                    <WeakTopicItem key={topic.id} topic={topic} />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </section>

        <section>
          <Card className="h-full">
            <CardHeader>
              <h2 className="text-lg font-semibold text-ink-900">Recent Activity</h2>
              <p className="mt-0.5 text-sm text-slate-500">Your latest quiz attempts at a glance.</p>
            </CardHeader>
            <CardBody className="p-0">
              {!data?.recentActivity?.length ? (
                <EmptyState
                  compact
                  icon="📝"
                  title="No activity yet"
                  description="No quiz history yet. Start your first practice to see your progress."
                  actionLabel="Start Practice"
                  actionHref="/dashboard/quiz"
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recentActivity.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{a.paper}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {a.topic && <span>{a.topic} · </span>}
                          {a.date
                            ? new Date(a.date).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <span className="text-sm font-bold text-slate-700">
                          {a.score !== null ? `${Math.round(a.score)}%` : "—"}
                        </span>
                        {a.passed !== null && (
                          <Badge tone={a.passed ? "success" : "danger"}>
                            {a.passed ? "Pass" : "Fail"}
                          </Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </section>
      </div>

      <section>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-ink-900">Recommended Practice</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Suggested topics based on your performance and weak areas.
            </p>
          </CardHeader>
          <CardBody>
            {!data?.recommendedPractice?.length ? (
              <EmptyState
                compact
                icon="💡"
                title={hasAttempts ? "No recommendations right now" : "Get personalised recommendations"}
                description={
                  hasAttempts
                    ? "You're doing well across all topics. Keep practising to maintain your edge."
                    : "Complete a few practice quizzes and we'll suggest topics to focus on."
                }
                actionLabel={hasAttempts ? undefined : "Start Practice"}
                actionHref={hasAttempts ? undefined : "/dashboard/quiz"}
              />
            ) : (
              <div className="space-y-3">
                {data.recommendedPractice.map((item) => (
                  <RecommendedPracticeItem key={item.topicId} item={item} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
