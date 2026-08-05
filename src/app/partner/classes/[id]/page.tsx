"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { AdminStatCard } from "@/components/admin/AdminStatCard";

type ClassDetail = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  students: Array<{ id: string; name: string; email: string }>;
  performance: {
    studentCount: number;
    totalAttempts: number;
    passRate: number;
    weakPapers: Array<{ code: string; title: string; passRate: number; attempts: number }>;
  } | null;
};

export default function PartnerClassDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [allStudents, setAllStudents] = useState<Array<{ id: string; name: string; email: string }>>(
    []
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [addStudentId, setAddStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch(`/api/partner/classes/${id}`),
        fetch("/api/partner/students"),
      ]);
      const cJson = await cRes.json();
      const sJson = await sRes.json();
      if (!cRes.ok) throw new Error(cJson.error ?? "Failed to load class");
      if (!sRes.ok) throw new Error(sJson.error ?? "Failed to load students");
      setCls(cJson.class);
      setName(cJson.class.name);
      setDescription(cJson.class.description ?? "");
      setAllStudents(sJson.students);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/partner/classes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function addStudent() {
    if (!addStudentId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/partner/classes/${id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: addStudentId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Add failed");
      setAddStudentId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeStudent(studentId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/partner/classes/${id}/students/${studentId}`, {
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

  if (error && !cls) return <Alert tone="error">{error}</Alert>;
  if (!cls) return <EmptyState title="Class not found" />;

  const enrolledIds = new Set(cls.students.map((s) => s.id));
  const available = allStudents.filter((s) => !enrolledIds.has(s.id));

  return (
    <div className="space-y-6">
      <Link href="/partner/classes" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Classes
      </Link>

      <PageHeader title={cls.name} description="Class performance and roster">
        <div className="mt-2">
          <Badge tone={cls.status === "ACTIVE" ? "success" : "neutral"}>{cls.status}</Badge>
        </div>
      </PageHeader>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard label="Students" value={cls.performance?.studentCount ?? 0} />
        <AdminStatCard label="Attempts" value={cls.performance?.totalAttempts ?? 0} />
        <AdminStatCard label="Pass rate" value={`${cls.performance?.passRate ?? 0}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Edit class</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Description</span>
              <textarea
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <Button variant="gradient" disabled={busy} onClick={() => void save()}>
              Save changes
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Weak papers</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {!cls.performance?.weakPapers?.length ? (
              <p className="text-sm text-slate-500">Not enough data yet.</p>
            ) : (
              cls.performance.weakPapers.map((p) => (
                <div key={p.code} className="flex justify-between text-sm">
                  <span className="font-medium text-ink-900">
                    {p.code} <span className="font-normal text-slate-500">{p.title}</span>
                  </span>
                  <span className="text-slate-600">
                    {p.passRate}% · {p.attempts}
                  </span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-ink-900">Students</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <select
              className="min-w-[220px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={addStudentId}
              onChange={(e) => setAddStudentId(e.target.value)}
            >
              <option value="">Add student…</option>
              {available.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
            <Button
              variant="gradient"
              size="sm"
              disabled={busy || !addStudentId}
              onClick={() => void addStudent()}
            >
              Add
            </Button>
          </div>

          {cls.students.length === 0 ? (
            <EmptyState compact title="No students" description="Add partner students to this class." />
          ) : (
            cls.students.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5"
              >
                <div>
                  <Link
                    href={`/partner/students/${s.id}`}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    {s.name}
                  </Link>
                  <p className="text-xs text-slate-500">{s.email}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void removeStudent(s.id)}
                >
                  Remove
                </Button>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
