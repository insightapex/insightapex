"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LecturerPaperSelectors } from "@/components/lecturer/LecturerPaperSelectors";
import { useLecturerScope } from "@/components/lecturer/LecturerScope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

type Row = {
  id: string;
  name: string;
  email: string;
  overallScore: number | null;
  mockAttempts: number;
  lastActive: string | null;
  riskStatus: "High Risk" | "At Risk" | "Monitor";
};

function riskTone(status: Row["riskStatus"]) {
  if (status === "High Risk") return "danger" as const;
  if (status === "At Risk") return "warning" as const;
  return "neutral" as const;
}

export default function LecturerAtRiskPage() {
  const { paperId, selectedPaper, loading: scopeLoading } = useLecturerScope();
  const [students, setStudents] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!paperId) {
      setStudents([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/lecturer/at-risk?paperId=${paperId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load");
        if (!cancelled) setStudents(json.students ?? []);
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

  async function notify(student: Row) {
    setBusy(student.id);
    setMsg(null);
    try {
      const res = await fetch("/api/lecturer/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "students",
          studentIds: [student.id],
          subject: `Support check-in — ${selectedPaper?.code ?? "your paper"}`,
          message: `Hi ${student.name},\n\nI wanted to check in on your progress for ${selectedPaper?.code ?? "the paper"}. Please review your recent attempts and reach out if you need help.\n\n— Your lecturer`,
          sendEmail: false,
          sendInApp: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to notify");
      setMsg(`Notification sent to ${student.name}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to notify");
    } finally {
      setBusy(null);
    }
  }

  if (scopeLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="At-Risk Students"
        description="Students who need support based on scores, mocks and inactivity"
      />
      <LecturerPaperSelectors />

      {error && <Alert tone="error">{error}</Alert>}
      {msg && <Alert tone="success">{msg}</Alert>}

      {!paperId ? (
        <EmptyState title="Select a paper" description="Choose an assigned paper to view at-risk students." />
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          title="No at-risk students"
          description="Nobody currently meets the risk thresholds for this paper."
        />
      ) : (
        <Card>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3 text-right">Overall score</th>
                  <th className="px-5 py-3 text-right">Mock attempts</th>
                  <th className="px-5 py-3">Last active</th>
                  <th className="px-5 py-3">Risk status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.email}</p>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {s.overallScore != null ? `${s.overallScore}%` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{s.mockAttempts}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {s.lastActive ? new Date(s.lastActive).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={riskTone(s.riskStatus)}>{s.riskStatus}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/lecturer/students/${s.id}`}>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busy === s.id}
                          onClick={() => void notify(s)}
                        >
                          {busy === s.id ? "Sending…" : "Notify"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
