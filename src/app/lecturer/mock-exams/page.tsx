"use client";

import { useEffect, useMemo, useState } from "react";
import { LecturerPaperSelectors } from "@/components/lecturer/LecturerPaperSelectors";
import { useLecturerScope } from "@/components/lecturer/LecturerScope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

type MockRow = {
  id: string;
  title: string;
  paperCode: string;
  paperTitle: string;
  durationMinutes: number;
  passMarkPercent: number;
  questionCount: number;
  participationCount: number;
  enrolledCount: number;
  participationRate: number;
  scores: Array<{
    studentId: string;
    name: string;
    email: string;
    scorePercent: number | null;
    passed: boolean | null;
  }>;
  notAttemptedStudentIds: string[];
};

export default function LecturerMockExamsPage() {
  const { paperId, loading: scopeLoading } = useLecturerScope();
  const [mocks, setMocks] = useState<MockRow[]>([]);
  const [directory, setDirectory] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const qs = paperId ? `?paperId=${paperId}` : "";
        const res = await fetch(`/api/lecturer/mock-exams${qs}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load mock exams");
        if (!cancelled) {
          setMocks(json.mocks ?? []);
          setDirectory(json.studentDirectory ?? []);
        }
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

  const dir = useMemo(() => new Map(directory.map((s) => [s.id, s])), [directory]);

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
        title="Mock Exams"
        description="View participation and scores for assigned papers (read-only)"
      />
      <LecturerPaperSelectors />

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : mocks.length === 0 ? (
        <EmptyState
          title="No mock exams"
          description="Published mock exams for your assigned papers will appear here."
        />
      ) : (
        <div className="space-y-6">
          {mocks.map((m) => (
            <Card key={m.id}>
              <CardHeader>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{m.title}</h2>
                    <p className="text-sm text-slate-500">
                      {m.paperCode} · {m.paperTitle} · {m.questionCount} questions ·{" "}
                      {m.durationMinutes} min
                    </p>
                  </div>
                  <Badge tone="brand">
                    {m.participationRate}% participation ({m.participationCount}/
                    {m.enrolledCount})
                  </Badge>
                </div>
              </CardHeader>
              <CardBody className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">Student scores</h3>
                  {m.scores.length === 0 ? (
                    <p className="text-sm text-slate-500">No attempts yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {m.scores.map((s) => (
                        <li
                          key={s.studentId}
                          className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm"
                        >
                          <span className="font-medium text-slate-900">{s.name}</span>
                          <span className="flex items-center gap-2">
                            <span className="tabular-nums">
                              {s.scorePercent != null ? `${Math.round(s.scorePercent)}%` : "—"}
                            </span>
                            {s.passed != null && (
                              <Badge tone={s.passed ? "success" : "danger"}>
                                {s.passed ? "Pass" : "Fail"}
                              </Badge>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">Not attempted</h3>
                  {m.notAttemptedStudentIds.length === 0 ? (
                    <p className="text-sm text-slate-500">Everyone has attempted this mock.</p>
                  ) : (
                    <ul className="space-y-2">
                      {m.notAttemptedStudentIds.map((id) => {
                        const s = dir.get(id);
                        return (
                          <li
                            key={id}
                            className="rounded-xl border border-slate-100 px-3 py-2 text-sm text-slate-700"
                          >
                            {s?.name ?? id}
                            {s?.email ? (
                              <span className="ml-2 text-xs text-slate-400">{s.email}</span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
