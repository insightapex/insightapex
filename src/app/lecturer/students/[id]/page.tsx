"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type PracticeResult = {
  id: string;
  paperCode: string;
  paperTitle: string;
  mockExamTitle: string | null;
  scorePercent: number | null;
  passed: boolean | null;
  submittedAt: string | null;
  questionCount?: number | null;
  correctCount?: number | null;
};

type TimelineItem = {
  id: string;
  at: string | null;
  kind: "practice" | "mock";
  title: string;
  detail: string;
  scorePercent: number | null;
  passed: boolean | null;
};

type Detail = {
  student: {
    id: string;
    name: string;
    email: string;
    classes: Array<{ id: string; name: string }>;
  };
  paperResults: PracticeResult[];
  recentPractice?: PracticeResult[];
  activityTimeline?: TimelineItem[];
  weakCategories: Array<{
    title: string;
    paperCode: string;
    missRate: number;
    total: number;
  }>;
  livePracticeMerged?: boolean;
};

export default function LecturerStudentDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/lecturer/students/${params.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load student");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function notify() {
    if (!data) return;
    setBusy(true);
    setNotifyMsg(null);
    try {
      const res = await fetch("/api/lecturer/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "students",
          studentIds: [data.student.id],
          subject: "Message from your lecturer",
          message: `Hi ${data.student.name},\n\nPlease review your recent progress and let me know if you need support.\n\n— Your lecturer`,
          sendEmail: false,
          sendInApp: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to notify");
      setNotifyMsg(
        json.liveNotified > 0 ? "In-app notification sent" : "Notification sent"
      );
    } catch (e) {
      setNotifyMsg(e instanceof Error ? e.message : "Failed to notify");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!data) return <EmptyState title="Not found" description="Student not available." />;

  const recentPractice = data.recentPractice ?? data.paperResults ?? [];
  const weakCategories = data.weakCategories ?? [];
  const timeline = data.activityTimeline ?? [];

  return (
    <div className="space-y-8">
      <PageHeader title={data.student.name} description={data.student.email}>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/lecturer/students">
            <Button size="sm" variant="outline">
              ← Back
            </Button>
          </Link>
          <Button size="sm" variant="primary" disabled={busy} onClick={() => void notify()}>
            {busy ? "Sending…" : "Send notification"}
          </Button>
        </div>
      </PageHeader>

      {notifyMsg && <Alert tone="success">{notifyMsg}</Alert>}
      {data.livePracticeMerged && (
        <Alert tone="info">
          Showing live practice results from this student’s real account.
        </Alert>
      )}

      <p className="text-sm text-slate-600">
        Classes: {data.student.classes.map((c) => c.name).join(", ") || "—"}
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Recent practice results</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Brief scores from practice and mocks on assigned papers
            </p>
          </CardHeader>
          <CardBody className="space-y-2">
            {recentPractice.length === 0 ? (
              <p className="text-sm text-slate-500">No submitted practice yet.</p>
            ) : (
              recentPractice.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {r.paperCode}
                      {r.mockExamTitle ? ` · ${r.mockExamTitle}` : " · Practice"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "—"}
                      {r.questionCount != null && r.correctCount != null
                        ? ` · ${r.correctCount}/${r.questionCount} correct`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums">
                      {r.scorePercent != null ? `${Math.round(r.scorePercent)}%` : "—"}
                    </span>
                    {r.passed != null && (
                      <Badge tone={r.passed ? "success" : "danger"}>
                        {r.passed ? "Pass" : "Fail"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Weak categories</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {weakCategories.length === 0 ? (
              <p className="text-sm text-slate-500">Not enough response data yet.</p>
            ) : (
              weakCategories.map((w) => (
                <div key={`${w.paperCode}-${w.title}`} className="flex justify-between text-sm">
                  <span>
                    <span className="font-medium text-slate-900">{w.paperCode}</span>{" "}
                    <span className="text-slate-600">{w.title}</span>
                  </span>
                  <span className="text-slate-600">
                    {w.missRate}% miss · {w.total} Q
                  </span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900">Activity timeline</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            When this student practiced or sat mocks — newest first
          </p>
        </CardHeader>
        <CardBody>
          {timeline.length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            <ol className="relative space-y-0 border-l border-slate-200 ml-3">
              {timeline.map((item) => (
                <li key={item.id} className="relative pb-6 pl-6 last:pb-0">
                  <span
                    className={cn(
                      "absolute -left-1.5 top-1.5 h-3 w-3 rounded-full ring-4 ring-white",
                      item.passed
                        ? "bg-emerald-500"
                        : item.passed === false
                          ? "bg-red-500"
                          : "bg-sky-500"
                    )}
                  />
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.detail}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {item.scorePercent != null && (
                        <span className="text-sm font-semibold tabular-nums text-slate-800">
                          {Math.round(item.scorePercent)}%
                        </span>
                      )}
                      <Badge tone={item.kind === "mock" ? "accent" : "neutral"}>
                        {item.kind === "mock" ? "Mock" : "Practice"}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {item.at ? new Date(item.at).toLocaleString() : "—"}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
