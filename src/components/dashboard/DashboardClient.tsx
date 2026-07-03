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
import {
  IconAttempts,
  IconScore,
  IconCompleted,
  IconTrophy,
  IconTarget,
  IconStreak,
} from "@/components/dashboard/DashboardIcons";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { DashboardOverview } from "@/types";

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-40 rounded-2xl bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-slate-200" />
    </div>
  );
}

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const trendLabel = "vs last 30 days";

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
  const trends = data?.trends;

  return (
    <div className="space-y-8">
      <WelcomeHeader
        studentName={data?.studentName ?? "Student"}
        hasAttempts={hasAttempts}
      />

      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Total Attempts"
            value={data?.totalAttempts ?? 0}
            icon={<IconAttempts className="h-6 w-6" />}
            tone="blue"
            trend={
              trends?.attempts != null
                ? { value: trends.attempts, label: trendLabel }
                : undefined
            }
          />
          <StatCard
            label="Average Score"
            value={`${avg}%`}
            icon={<IconScore className="h-6 w-6" />}
            tone="green"
            trend={
              trends?.averageScore != null
                ? { value: trends.averageScore, label: trendLabel }
                : undefined
            }
            sub={
              trends?.averageScore == null
                ? avg >= 50
                  ? "Above pass mark"
                  : "Below pass mark"
                : undefined
            }
          />
          <StatCard
            label="Quizzes Completed"
            value={data?.completedQuizzes ?? 0}
            icon={<IconCompleted className="h-6 w-6" />}
            tone="purple"
            trend={
              trends?.completedQuizzes != null
                ? { value: trends.completedQuizzes, label: trendLabel }
                : undefined
            }
          />
          <StatCard
            label="Best Score"
            value={hasAttempts ? `${data?.bestScore ?? 0}%` : "—"}
            icon={<IconTrophy className="h-6 w-6" />}
            tone="amber"
            sub={hasAttempts ? "Personal best" : "Complete a quiz"}
          />
          <StatCard
            label="Weak Topics"
            value={data?.weakTopicCount ?? 0}
            icon={<IconTarget className="h-6 w-6" />}
            tone="red"
            sub="Focus to improve"
          />
          <StatCard
            label="Study Streak"
            value={hasAttempts ? `${data?.studyStreak ?? 0} Days` : "0 Days"}
            icon={<IconStreak className="h-6 w-6" />}
            tone="orange"
            sub={hasAttempts ? "🔥 Keep it up!" : "Start practising"}
          />
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-ink-900">Continue Practice</h2>
          <Link href="/dashboard/quiz" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View all
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.paperProgress.map((paper, i) => (
              <ContinuePracticeCard key={paper.id} paper={paper} index={i} />
            ))}
          </div>
        )}
      </section>

      <section id="progress" className="scroll-mt-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <h2 className="text-lg font-semibold text-ink-900">Score History</h2>
            <p className="mt-0.5 text-sm text-slate-500">Recent quiz scores and your trend over time.</p>
          </CardHeader>
          <CardBody>
            <ScoreChart data={data?.scoreHistory ?? []} />
          </CardBody>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section id="weak-topics" className="scroll-mt-6">
          <Card className="h-full rounded-2xl">
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
                  description="Start your first practice to see your weak areas."
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
          <Card className="h-full rounded-2xl">
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
                  description="Start your first practice to see your progress."
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
        <Card className="rounded-2xl">
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
                    ? "You're doing well across all topics. Keep practising!"
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
