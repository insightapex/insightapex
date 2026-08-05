"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { PageLoading } from "@/components/ui/PageLoading";
import { Alert } from "@/components/ui/Alert";
import {
  IconScore,
  IconStreak,
  IconTrophy,
  IconAttempts,
} from "@/components/dashboard/DashboardIcons";

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;
  const [dashboard, setDashboard] = useState<{
    averageScore: number;
    bestScore: number;
    studyStreak: number;
    totalAttempts: number;
    paperProgress: { progressPercent: number }[];
  } | null>(null);
  const [billing, setBilling] = useState<{ isPremium: boolean; planName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/billing/dashboard", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([dash, bill]) => {
        if (dash.error) throw new Error(dash.error);
        setDashboard(dash);
        const status = bill.subscription?.status;
        setBilling({
          isPremium: status === "ACTIVE" || status === "TRIALING",
          planName: bill.currentPlan?.name ?? "Free",
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load profile.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading message="Loading profile…" />;

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Profile" description="Your account, progress and achievements." />
        <Alert tone="error" title="Unable to load profile">
          {error}
        </Alert>
      </div>
    );
  }

  const overallCoverage = dashboard?.paperProgress?.length
    ? Math.round(
        dashboard.paperProgress.reduce((sum, p) => sum + p.progressPercent, 0) / dashboard.paperProgress.length
      )
    : 0;

  return (
    <div className="space-y-8">
      <PageHeader title="Profile" description="Your account, progress and achievements." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1" variant="elevated">
          <CardBody className="flex flex-col items-center text-center">
            <Avatar name={user?.name ?? "Student"} size="lg" />
            <h2 className="mt-4 text-lg font-bold text-ink-900">{user?.name}</h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <div className="mt-3">
              {billing?.isPremium ? (
                <Badge tone="premium">Premium · {billing.planName}</Badge>
              ) : (
                <Badge tone="neutral">Free plan</Badge>
              )}
            </div>
            {!billing?.isPremium && (
              <Link href="/dashboard/pricing" className="mt-4">
                <Button variant="gradient" size="sm">
                  Upgrade to Premium
                </Button>
              </Link>
            )}
          </CardBody>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <StatCard
            label="Avg Quiz Score"
            value={`${dashboard?.averageScore ?? 0}%`}
            icon={<IconScore className="h-5 w-5" />}
            tone="success"
          />
          <StatCard
            label="Best Score"
            value={`${dashboard?.bestScore ?? 0}%`}
            icon={<IconTrophy className="h-5 w-5" />}
            tone="accent"
          />
          <StatCard
            label="Study Streak"
            value={`${dashboard?.studyStreak ?? 0} days`}
            icon={<IconStreak className="h-5 w-5" />}
            tone="warning"
          />
          <StatCard
            label="Total Attempts"
            value={dashboard?.totalAttempts ?? 0}
            icon={<IconAttempts className="h-5 w-5" />}
            tone="brand"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="section-title">Overall Coverage</h2>
          </CardHeader>
          <CardBody className="flex justify-center">
            <CircularProgress value={overallCoverage} size={140} label="syllabus" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="section-title">Account Settings</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input label="Full name" defaultValue={user?.name ?? ""} disabled />
            <Input label="Email address" type="email" defaultValue={user?.email ?? ""} disabled />
            <p className="text-xs text-slate-400">
              Name and email editing will be available in a future update.
            </p>
            <Button variant="outline" disabled>
              Save changes
            </Button>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="section-title">Password</h2>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-slate-500">
            Use the{" "}
            <a href="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700">
              forgot password
            </a>{" "}
            flow to reset your password via email.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
