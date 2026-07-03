"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { cn } from "@/lib/utils";

interface MockExam {
  id: string;
  title: string;
  description: string | null;
  paperCode: string;
  paperTitle: string;
  questionCount: number;
  durationMinutes: number;
  passMarkPercent: number;
  accessLevel: string;
  isPremium: boolean;
  hasAccess: boolean;
  isLocked: boolean;
}

export default function MockExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<MockExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mock-exams")
      .then((r) => r.json())
      .then((data) => setExams(data.mockExams ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function startExam(exam: MockExam) {
    if (exam.isLocked) {
      router.push("/dashboard/pricing");
      return;
    }

    setStarting(exam.id);
    setError(null);
    try {
      const res = await fetch(`/api/mock-exams/${exam.id}/start`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "ACCESS_DENIED") {
          router.push(data.upgradeUrl ?? "/dashboard/pricing");
          return;
        }
        throw new Error(data.error ?? "Could not start mock exam");
      }
      router.push(`/dashboard/quiz?attemptId=${data.attemptId}&mockExam=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStarting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-500">
        <Spinner className="h-5 w-5 text-brand-600" />
        Loading mock exams…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Mock Exams</h1>
          <p className="mt-1 text-sm text-slate-500">
            Full-length timed exams to simulate real ACCA test conditions.
          </p>
        </div>
        <Link href="/dashboard/pricing">
          <Button variant="outline">Upgrade</Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {exams.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="📝"
              title="No mock exams available"
              description="Check back soon for full-length timed exams."
              actionLabel="Go to Practice"
              actionHref="/dashboard/quiz"
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {exams.map((exam) => (
            <Card
              key={exam.id}
              className={cn(exam.isLocked && "opacity-90")}
            >
              <CardBody>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-brand-600">{exam.paperCode}</p>
                    <h3 className="mt-1 font-semibold text-ink-900">{exam.title}</h3>
                  </div>
                  <div className="flex gap-1">
                    {exam.isPremium && <Badge tone="brand">Premium</Badge>}
                    {exam.isLocked && <Badge tone="warning">🔒 Locked</Badge>}
                  </div>
                </div>
                {exam.description && (
                  <p className="mt-2 text-sm text-slate-500">{exam.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                  <span>{exam.questionCount} questions</span>
                  <span>{exam.durationMinutes} min</span>
                  <span>Pass: {exam.passMarkPercent}%</span>
                </div>
                <Button
                  className="mt-4 w-full"
                  variant={exam.isLocked ? "outline" : "primary"}
                  disabled={starting === exam.id}
                  onClick={() => startExam(exam)}
                >
                  {starting === exam.id && <Spinner className="h-4 w-4" />}
                  {exam.isLocked ? "Unlock mock exam" : "Start mock exam"}
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
