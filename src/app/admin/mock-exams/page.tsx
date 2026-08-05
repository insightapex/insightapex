"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminAlert } from "@/components/admin/AdminAlert";

interface Paper {
  id: string;
  code: string;
  title: string;
}

interface MockExam {
  id: string;
  paperId: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  passMarkPercent: number;
  order: number;
  status: "DRAFT" | "PUBLISHED";
  isActive: boolean;
  accessLevel: string;
  isPremium: boolean;
  paper: { id: string; code: string; title: string };
  _count: { questions: number };
}

interface MockExamForm {
  paperId: string;
  title: string;
  description: string;
  durationMinutes: number;
  passMarkPercent: number;
  order: number;
  status: "DRAFT" | "PUBLISHED";
  accessLevel: "FREE" | "PREMIUM";
  isPremium: boolean;
  isActive: boolean;
}

const emptyForm = (): MockExamForm => ({
  paperId: "",
  title: "",
  description: "",
  durationMinutes: 40,
  passMarkPercent: 50,
  order: 0,
  status: "DRAFT",
  accessLevel: "FREE",
  isPremium: false,
  isActive: true,
});

export default function AdminMockExamsPage() {
  const router = useRouter();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [mockExams, setMockExams] = useState<MockExam[]>([]);
  const [total, setTotal] = useState(0);
  const [filterPaperId, setFilterPaperId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MockExamForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/papers")
      .then((r) => r.json())
      .then((d) => setPapers(Array.isArray(d) ? d : []));
  }, []);

  const loadMockExams = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterPaperId) params.set("paperId", filterPaperId);
    if (search) params.set("q", search);
    fetch(`/api/admin/mock-exams?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setMockExams(d.mockExams ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [filterPaperId, search]);

  useEffect(() => {
    loadMockExams();
  }, [loadMockExams]);

  function openCreate() {
    setForm({ ...emptyForm(), paperId: filterPaperId });
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm(emptyForm());
    setFormError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.paperId) {
      setFormError("Select a paper.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/admin/mock-exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        description: form.description || null,
        status: "DRAFT",
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setFormError(data.error ?? "Failed to create mock exam.");
      return;
    }

    setAlert({ tone: "success", message: "Mock exam created as draft." });
    closeForm();
    loadMockExams();
    router.push(`/admin/mock-exams/${data.id}`);
  }

  async function togglePublish(exam: MockExam) {
    const nextStatus = exam.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    if (nextStatus === "PUBLISHED" && exam._count.questions === 0) {
      setAlert({ tone: "error", message: "Add at least one question before publishing." });
      return;
    }

    setActionId(exam.id);
    const res = await fetch(`/api/admin/mock-exams/${exam.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paperId: exam.paperId,
        title: exam.title,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        passMarkPercent: exam.passMarkPercent,
        order: exam.order,
        status: nextStatus,
        accessLevel: exam.accessLevel,
        isPremium: exam.isPremium,
        isActive: exam.isActive,
      }),
    });
    const data = await res.json();
    setActionId(null);

    if (!res.ok) {
      setAlert({ tone: "error", message: data.error ?? "Failed to update status." });
      return;
    }

    setAlert({
      tone: "success",
      message: nextStatus === "PUBLISHED" ? "Mock exam published." : "Mock exam unpublished.",
    });
    loadMockExams();
  }

  async function toggleActive(exam: MockExam) {
    setActionId(exam.id);
    const res = await fetch(`/api/admin/mock-exams/${exam.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paperId: exam.paperId,
        title: exam.title,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        passMarkPercent: exam.passMarkPercent,
        order: exam.order,
        status: exam.status,
        accessLevel: exam.accessLevel,
        isPremium: exam.isPremium,
        isActive: !exam.isActive,
      }),
    });
    setActionId(null);
    if (!res.ok) {
      const data = await res.json();
      setAlert({ tone: "error", message: data.error ?? "Failed to update." });
      return;
    }
    setAlert({ tone: "success", message: exam.isActive ? "Mock exam deactivated." : "Mock exam activated." });
    loadMockExams();
  }

  async function handleDelete(exam: MockExam) {
    if (!window.confirm(`Delete mock exam "${exam.title}"? This cannot be undone.`)) return;

    setActionId(exam.id);
    const res = await fetch(`/api/admin/mock-exams/${exam.id}`, { method: "DELETE" });
    setActionId(null);

    if (!res.ok) {
      const data = await res.json();
      setAlert({ tone: "error", message: data.error ?? "Failed to delete." });
      return;
    }

    setAlert({ tone: "success", message: "Mock exam deleted." });
    loadMockExams();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Mock Exams</h1>
          <p className="mt-1 text-sm text-slate-500">
            Build timed exams with a fixed set of questions — different from random Practice mode.
          </p>
        </div>
        <Button onClick={() => (showForm ? closeForm() : openCreate())}>
          {showForm ? "Cancel" : "+ Create Mock Exam"}
        </Button>
      </div>

      {alert && (
        <AdminAlert tone={alert.tone} message={alert.message} onDismiss={() => setAlert(null)} />
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">New Mock Exam</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">ACCA Paper *</label>
                <select
                  required
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                  value={form.paperId}
                  onChange={(e) => setForm({ ...form, paperId: e.target.value })}
                >
                  <option value="">Select paper…</option>
                  {papers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} – {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Title *"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <Input
                label="Display Order"
                type="number"
                min={0}
                value={form.order}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
              />
              <Input
                label="Duration (minutes)"
                type="number"
                min={1}
                max={600}
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm({ ...form, durationMinutes: parseInt(e.target.value) || 40 })
                }
              />
              <Input
                label="Pass Mark (%)"
                type="number"
                min={0}
                max={100}
                value={form.passMarkPercent}
                onChange={(e) =>
                  setForm({ ...form, passMarkPercent: parseFloat(e.target.value) || 50 })
                }
              />
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Description (optional)</label>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}
              <div className="flex gap-3 sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating…" : "Create & Add Questions"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          value={filterPaperId}
          onChange={(e) => setFilterPaperId(e.target.value)}
        >
          <option value="">All papers</option>
          {papers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} – {p.title}
            </option>
          ))}
        </select>
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search mock exams…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardBody className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">
              Loading mock exams…
            </div>
          ) : mockExams.length === 0 ? (
            <EmptyState
              icon="⏱"
              title="No mock exams yet"
              description="Create a mock exam, select questions, then publish when ready for students."
            />
          ) : (
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Title
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Paper
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Questions
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Duration
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pass Mark
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mockExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{exam.title}</td>
                    <td className="px-5 py-3">
                      <span className="font-semibold text-brand-600">{exam.paper.code}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{exam._count.questions}</td>
                    <td className="px-5 py-3 text-slate-600">{exam.durationMinutes} min</td>
                    <td className="px-5 py-3 text-slate-600">{exam.passMarkPercent}%</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={exam.status === "PUBLISHED" ? "success" : "warning"}>
                          {exam.status === "PUBLISHED" ? "Published" : "Draft"}
                        </Badge>
                        {!exam.isActive && <Badge tone="neutral">Inactive</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end flex-wrap gap-1">
                        <Link href={`/admin/mock-exams/${exam.id}`}>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </Link>
                        <Link href={`/admin/mock-exams/${exam.id}`}>
                          <Button variant="ghost" size="sm">
                            Manage Questions
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePublish(exam)}
                          disabled={actionId === exam.id}
                        >
                          {exam.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(exam)}
                          disabled={actionId === exam.id}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {!loading && mockExams.length > 0 && (
        <p className="text-xs text-slate-400">{total} mock exam(s), sorted by display order.</p>
      )}
    </div>
  );
}
