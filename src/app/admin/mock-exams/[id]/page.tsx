"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AdminAlert } from "@/components/admin/AdminAlert";

interface Paper {
  id: string;
  code: string;
  title: string;
}

interface Topic {
  id: string;
  title: string;
}

interface QuestionRow {
  id: string;
  text: string;
  topic: { title: string; paper: { code: string } };
}

interface SelectedRow {
  questionId: string;
  order: number;
  question: QuestionRow;
}

interface MockExamDetail {
  id: string;
  paperId: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  passMarkPercent: number;
  order: number;
  status: "DRAFT" | "PUBLISHED";
  accessLevel: "FREE" | "PREMIUM";
  isPremium: boolean;
  isActive: boolean;
  paper: Paper;
  _count: { questions: number };
}

export default function AdminMockExamDetailPage() {
  const params = useParams();
  const mockExamId = params.id as string;

  const [exam, setExam] = useState<MockExamDetail | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selected, setSelected] = useState<SelectedRow[]>([]);
  const [available, setAvailable] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const [form, setForm] = useState({
    paperId: "",
    title: "",
    description: "",
    durationMinutes: 40,
    passMarkPercent: 50,
    order: 0,
    status: "DRAFT" as "DRAFT" | "PUBLISHED",
    accessLevel: "FREE" as "FREE" | "PREMIUM",
    isPremium: false,
    isActive: true,
  });

  const loadExam = useCallback(async () => {
    const res = await fetch(`/api/admin/mock-exams/${mockExamId}`);
    const data = await res.json();
    if (!res.ok) {
      setAlert({ tone: "error", message: data.error ?? "Mock exam not found." });
      setLoading(false);
      return;
    }
    setExam(data);
    setForm({
      paperId: data.paperId,
      title: data.title,
      description: data.description ?? "",
      durationMinutes: data.durationMinutes,
      passMarkPercent: data.passMarkPercent,
      order: data.order,
      status: data.status,
      accessLevel: data.accessLevel,
      isPremium: data.isPremium,
      isActive: data.isActive,
    });
    setLoading(false);
  }, [mockExamId]);

  const loadQuestions = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (topicFilter) params.set("topicId", topicFilter);
    const res = await fetch(`/api/admin/mock-exams/${mockExamId}/questions?${params}`);
    const data = await res.json();
    if (res.ok) {
      setSelected(data.selected ?? []);
      setAvailable(data.available ?? []);
    }
  }, [mockExamId, search, topicFilter]);

  useEffect(() => {
    fetch("/api/admin/papers").then((r) => r.json()).then(setPapers);
    loadExam();
  }, [loadExam]);

  useEffect(() => {
    if (!form.paperId) {
      setTopics([]);
      return;
    }
    fetch(`/api/papers/${form.paperId}/topics`).then((r) => r.json()).then(setTopics);
  }, [form.paperId]);

  useEffect(() => {
    if (!loading && exam) loadQuestions();
  }, [loading, exam, loadQuestions]);

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    const res = await fetch(`/api/admin/mock-exams/${mockExamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        description: form.description || null,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setFormError(data.error ?? "Failed to save.");
      return;
    }

    setAlert({ tone: "success", message: "Mock exam details saved." });
    loadExam();
  }

  function addQuestion(q: QuestionRow) {
    setSelected((prev) => [
      ...prev,
      {
        questionId: q.id,
        order: prev.length,
        question: q,
      },
    ]);
    setAvailable((prev) => prev.filter((a) => a.id !== q.id));
  }

  function removeQuestion(questionId: string) {
    const removed = selected.find((s) => s.questionId === questionId);
    if (!removed) return;
    setSelected((prev) => prev.filter((s) => s.questionId !== questionId));
    setAvailable((prev) => [...prev, removed.question]);
  }

  async function saveQuestions() {
    setSavingQuestions(true);
    const res = await fetch(`/api/admin/mock-exams/${mockExamId}/questions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionIds: selected.map((s) => s.questionId),
      }),
    });
    const data = await res.json();
    setSavingQuestions(false);

    if (!res.ok) {
      setAlert({ tone: "error", message: data.error ?? "Failed to save questions." });
      return;
    }

    setAlert({
      tone: "success",
      message: `Saved ${data.totalSelected} question(s) for this mock exam.`,
    });
    loadExam();
    loadQuestions();
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        Loading mock exam…
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="space-y-4">
        <AdminAlert tone="error" message="Mock exam not found." />
        <Link href="/admin/mock-exams">
          <Button variant="outline">Back to Mock Exams</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/mock-exams" className="text-sm text-brand-600 hover:underline">
            ← Back to Mock Exams
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-ink-900">{exam.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={exam.status === "PUBLISHED" ? "success" : "warning"}>
              {exam.status}
            </Badge>
            <Badge tone="brand">{exam.paper.code}</Badge>
            <Badge tone="neutral">{selected.length} questions selected</Badge>
          </div>
        </div>
      </div>

      {alert && (
        <AdminAlert tone={alert.tone} message={alert.message} onDismiss={() => setAlert(null)} />
      )}

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-ink-900">Exam Details</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSaveDetails} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">ACCA Paper</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                value={form.paperId}
                onChange={(e) => setForm({ ...form, paperId: e.target.value })}
              >
                {papers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} – {p.title}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Title"
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
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <textarea
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as "DRAFT" | "PUBLISHED" })
                }
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Access Level</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                value={form.accessLevel}
                onChange={(e) =>
                  setForm({ ...form, accessLevel: e.target.value as "FREE" | "PREMIUM" })
                }
              >
                <option value="FREE">Free</option>
                <option value="PREMIUM">Premium (Phase 2)</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="accent-brand-600"
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isPremium}
                onChange={(e) => setForm({ ...form, isPremium: e.target.checked })}
                className="accent-brand-600"
              />
              Premium flag (billing not enforced yet)
            </label>
            {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save Details"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Available Questions</h2>
            <p className="mt-1 text-xs text-slate-500">Filter and add to this mock exam</p>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
              >
                <option value="">All topics</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Search questions…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {available.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">No matching questions.</p>
              ) : (
                available.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{q.text}</p>
                      <p className="text-xs text-slate-400">
                        {q.topic.paper.code} / {q.topic.title}
                      </p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={() => addQuestion(q)}>
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink-900">Selected Questions</h2>
              <p className="mt-1 text-xs text-slate-500">{selected.length} in this mock exam</p>
            </div>
            <Button onClick={saveQuestions} disabled={savingQuestions} size="sm">
              {savingQuestions ? "Saving…" : "Save Selection"}
            </Button>
          </CardHeader>
          <CardBody>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {selected.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  No questions selected. Add questions from the left panel.
                </p>
              ) : (
                selected.map((s, idx) => (
                  <div
                    key={s.questionId}
                    className="flex items-start justify-between gap-3 rounded-lg border border-brand-100 bg-brand-50/30 p-3"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-brand-600">Q{idx + 1}</span>
                      <p className="truncate text-sm font-medium text-slate-800">
                        {s.question.text}
                      </p>
                      <p className="text-xs text-slate-400">{s.question.topic.title}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => removeQuestion(s.questionId)}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
