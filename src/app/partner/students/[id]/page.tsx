"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

type StudentDetail = {
  id: string;
  name: string;
  email: string;
  isPremium: boolean;
  classes: Array<{ id: string; name: string; status: string }>;
  attempts: Array<{
    id: string;
    scorePercent: number | null;
    passed: boolean | null;
    submittedAt: string | null;
    paper: { code: string; title: string };
  }>;
  weakAreas: Array<{ id: string; title: string; paperCode: string; count: number }>;
};

type ClassOption = { id: string; name: string; status: string };

export default function PartnerStudentDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [assignClassId, setAssignClassId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, cRes] = await Promise.all([
        fetch(`/api/partner/students/${id}`),
        fetch("/api/partner/classes"),
      ]);
      const sJson = await sRes.json();
      const cJson = await cRes.json();
      if (!sRes.ok) throw new Error(sJson.error ?? "Failed to load student");
      if (!cRes.ok) throw new Error(cJson.error ?? "Failed to load classes");
      setStudent(sJson.student);
      setClasses(cJson.classes.filter((c: ClassOption) => c.status === "ACTIVE"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function assignClass() {
    if (!assignClassId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/partner/students/${id}/assign-class`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: assignClassId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Assign failed");
      setAssignClassId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assign failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeFromClass(classId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/partner/students/${id}/classes/${classId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Remove failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
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

  if (error && !student) return <Alert tone="error">{error}</Alert>;
  if (!student) return <EmptyState title="Student not found" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm">
        <Link href="/partner/students" className="font-medium text-brand-600 hover:text-brand-700">
          ← Students
        </Link>
      </div>

      <PageHeader title={student.name} description={student.email}>
        <div className="mt-2">
          <Badge tone={student.isPremium ? "premium" : "neutral"}>
            {student.isPremium ? "Paid" : "Free"}
          </Badge>
        </div>
      </PageHeader>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Classes</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {student.classes.length === 0 ? (
              <p className="text-sm text-slate-500">Not assigned to any class.</p>
            ) : (
              student.classes.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink-900">{c.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void removeFromClass(c.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
            <div className="flex gap-2 pt-2">
              <select
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={assignClassId}
                onChange={(e) => setAssignClassId(e.target.value)}
              >
                <option value="">Assign to class…</option>
                {classes
                  .filter((c) => !student.classes.some((sc) => sc.id === c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              <Button
                size="sm"
                variant="gradient"
                disabled={busy || !assignClassId}
                onClick={() => void assignClass()}
              >
                Assign
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Weak areas</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {student.weakAreas.length === 0 ? (
              <p className="text-sm text-slate-500">Not enough wrong answers yet.</p>
            ) : (
              student.weakAreas.map((w) => (
                <div key={w.id} className="flex justify-between text-sm">
                  <span>
                    <span className="font-medium text-ink-900">{w.paperCode}</span> · {w.title}
                  </span>
                  <span className="text-slate-500">{w.count} misses</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-ink-900">Quiz attempts</h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {student.attempts.length === 0 ? (
            <EmptyState compact title="No attempts" description="This student has not submitted quizzes yet." />
          ) : (
            student.attempts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-ink-900">
                    {a.paper.code} · {a.paper.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {a.scorePercent != null ? `${Math.round(a.scorePercent)}%` : "—"}
                  </span>
                  <Badge tone={a.passed ? "success" : "danger"}>
                    {a.passed ? "Pass" : "Fail"}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
