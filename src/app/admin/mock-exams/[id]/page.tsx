"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AdminAlert } from "@/components/admin/AdminAlert";
import {
  QUESTION_TYPES,
  TRUE_FALSE_OPTIONS,
  questionTypeLabel,
  type QuestionType,
} from "@/lib/question-types";

interface Paper {
  id: string;
  code: string;
  title: string;
  partId?: string;
  part?: { id: string; code: string; title: string };
}

interface Part {
  id: string;
  code: string;
  title: string;
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
  paper: Paper & { partId?: string; part?: Part };
  _count: { questions: number };
}

interface MockQuestionOption {
  text: string;
  isCorrect: boolean;
  order: number;
}

interface SelectedRow {
  questionId: string;
  order: number;
  question: {
    id: string;
    text: string;
    questionType: QuestionType;
    difficulty: string;
    marks: number;
    accessLevel: string;
    explanation: string | null;
    options: { id?: string; text: string; isCorrect: boolean; order: number }[];
  };
}

const emptyOption = (order: number): MockQuestionOption => ({
  text: "",
  isCorrect: order === 0,
  order,
});

function buildDefaultOptions(type: QuestionType): MockQuestionOption[] {
  if (type === "TRUE_FALSE") {
    return TRUE_FALSE_OPTIONS.map((option, index) => ({
      text: option.text,
      isCorrect: index === 0,
      order: option.order,
    }));
  }
  return [emptyOption(0), emptyOption(1), emptyOption(2), emptyOption(3)];
}

function resetQuestionForm() {
  return {
    text: "",
    explanation: "",
    questionType: "SINGLE_CHOICE" as QuestionType,
    marks: 1,
    accessLevel: "PREMIUM" as "FREE_TRIAL" | "PREMIUM",
    options: buildDefaultOptions("SINGLE_CHOICE"),
  };
}

export default function AdminMockExamDetailPage() {
  const params = useParams();
  const mockExamId = params.id as string;

  const [exam, setExam] = useState<MockExamDetail | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selected, setSelected] = useState<SelectedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const [form, setForm] = useState({
    partId: "",
    paperId: "",
    description: "",
    durationMinutes: 40,
    passMarkPercent: 50,
    order: 0,
    status: "DRAFT" as "DRAFT" | "PUBLISHED",
    accessLevel: "FREE" as "FREE" | "PREMIUM",
    isPremium: false,
    isActive: true,
  });

  const [qForm, setQForm] = useState(resetQuestionForm);

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
      partId: data.paper?.partId ?? data.paper?.part?.id ?? "",
      paperId: data.paperId,
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
    const res = await fetch(`/api/admin/mock-exams/${mockExamId}/questions`);
    const data = await res.json();
    if (res.ok) {
      setSelected(data.selected ?? []);
    }
  }, [mockExamId]);

  useEffect(() => {
    fetch("/api/admin/parts")
      .then((r) => r.json())
      .then((d) => setParts(Array.isArray(d) ? d : d.parts ?? []));
    fetch("/api/admin/papers")
      .then((r) => r.json())
      .then((d) => setPapers(Array.isArray(d) ? d : []));
    loadExam();
  }, [loadExam]);

  useEffect(() => {
    if (!loading && exam) void loadQuestions();
  }, [loading, exam, loadQuestions]);

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    const res = await fetch(`/api/admin/mock-exams/${mockExamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paperId: form.paperId,
        description: form.description || null,
        durationMinutes: form.durationMinutes,
        passMarkPercent: form.passMarkPercent,
        order: form.order,
        status: form.status,
        accessLevel: form.accessLevel,
        isPremium: form.isPremium,
        isActive: form.isActive,
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

  async function createMockQuestion(e: React.FormEvent) {
    e.preventDefault();
    setQuestionError(null);

    const correctCount = qForm.options.filter((o) => o.isCorrect).length;
    if (qForm.questionType === "TRUE_FALSE") {
      if (correctCount !== 1) {
        setQuestionError("Mark either True or False as correct.");
        return;
      }
    } else if (qForm.questionType === "MULTIPLE_CHOICE") {
      if (correctCount !== 2) {
        setQuestionError("Mark exactly two options as correct.");
        return;
      }
    } else if (correctCount !== 1) {
      setQuestionError("Mark one option as correct.");
      return;
    }

    setCreating(true);

    const res = await fetch(`/api/admin/mock-exams/${mockExamId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purpose: "MOCK_EXAM",
        text: qForm.text,
        explanation: qForm.explanation || null,
        questionType: qForm.questionType,
        difficulty: "MEDIUM",
        marks: qForm.marks,
        accessLevel: qForm.accessLevel,
        options: qForm.options.map((o, i) => ({ ...o, order: i })),
      }),
    });
    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      setQuestionError(data.error ?? "Could not create mock exam question.");
      return;
    }

    setShowCreateForm(false);
    setQForm(resetQuestionForm());
    setAlert({ tone: "success", message: "Mock exam question added." });
    loadQuestions();
    loadExam();
  }

  function handleQuestionTypeChange(type: QuestionType) {
    setQForm((prev) => ({
      ...prev,
      questionType: type,
      options: buildDefaultOptions(type),
    }));
  }

  const optionsHint =
    qForm.questionType === "MULTIPLE_CHOICE"
      ? "mark exactly two as correct"
      : qForm.questionType === "TRUE_FALSE"
        ? "mark True or False as correct"
        : "mark one as correct";

  async function removeQuestion(questionId: string) {
    const res = await fetch(`/api/admin/mock-exams/${mockExamId}/questions/${questionId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setAlert({ tone: "error", message: data.error ?? "Could not remove question." });
      return;
    }
    setAlert({ tone: "success", message: "Mock exam question removed." });
    loadQuestions();
    loadExam();
  }

  async function saveOrder() {
    setSavingOrder(true);
    const res = await fetch(`/api/admin/mock-exams/${mockExamId}/questions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIds: selected.map((s) => s.questionId) }),
    });
    const data = await res.json();
    setSavingOrder(false);
    if (!res.ok) {
      setAlert({ tone: "error", message: data.error ?? "Could not save order." });
      return;
    }
    setAlert({ tone: "success", message: `Saved order for ${data.totalSelected} question(s).` });
    loadQuestions();
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= selected.length) return;
    setSelected((prev) => {
      const copy = [...prev];
      const tmp = copy[index];
      copy[index] = copy[next];
      copy[next] = tmp;
      return copy.map((row, order) => ({ ...row, order }));
    });
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
            {exam.paper.part?.code && <Badge tone="neutral">{exam.paper.part.code}</Badge>}
            <Badge tone="brand">{exam.paper.code}</Badge>
            <Badge tone="neutral">{selected.length} mock questions</Badge>
          </div>
        </div>
        <Link href="/admin/mock-exams">
          <Button variant="primary">Done</Button>
        </Link>
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
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Part</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                value={form.partId}
                onChange={(e) =>
                  setForm({ ...form, partId: e.target.value, paperId: "" })
                }
              >
                <option value="">Select part…</option>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} – {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Paper</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                value={form.paperId}
                onChange={(e) => setForm({ ...form, paperId: e.target.value })}
              >
                <option value="">Select paper…</option>
                {papers
                  .filter((p) => !form.partId || p.partId === form.partId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} – {p.title}
                    </option>
                  ))}
              </select>
            </div>
            <div className="sm:col-span-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Auto name: <span className="font-semibold text-ink-900">{exam.title}</span>
              <span className="ml-1 text-xs text-slate-400">(updates if you change paper)</span>
            </div>
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
              <label className="block text-sm font-medium text-slate-700">Description (optional)</label>
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
              {form.status === "PUBLISHED" && selected.length === 0 && (
                <p className="text-xs text-amber-600">Add at least one question before publishing.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Access Level</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                value={form.accessLevel}
                onChange={(e) =>
                  setForm({
                    ...form,
                    accessLevel: e.target.value as "FREE" | "PREMIUM",
                    isPremium: e.target.value === "PREMIUM",
                  })
                }
              >
                <option value="FREE">Free</option>
                <option value="PREMIUM">Premium</option>
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
            {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save Details"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink-900">Mock Exam Questions</h2>
            <p className="mt-1 text-xs text-slate-500">
              Dedicated MOCK_EXAM questions for this exam only — not shared with Practice.
              Fixed order below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={savingOrder || selected.length === 0}
              onClick={() => void saveOrder()}
            >
              {savingOrder ? "Saving…" : "Save Order"}
            </Button>
            <Button type="button" size="sm" onClick={() => setShowCreateForm((v) => !v)}>
              {showCreateForm ? "Cancel" : "+ Add Mock Question"}
            </Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {showCreateForm && (
            <form
              onSubmit={createMockQuestion}
              className="space-y-4 rounded-xl border border-brand-100 bg-brand-50/40 p-4"
            >
              <p className="text-sm font-semibold text-brand-800">New Mock Exam Question</p>
              <p className="text-xs text-slate-500">
                Mock Exam → Question details. This will not appear in normal Practice.
              </p>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Question text</label>
                <textarea
                  required
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
                  value={qForm.text}
                  onChange={(e) => setQForm({ ...qForm, text: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Type</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={qForm.questionType}
                    onChange={(e) => handleQuestionTypeChange(e.target.value as QuestionType)}
                  >
                    {QUESTION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Marks"
                  type="number"
                  min={1}
                  value={qForm.marks}
                  onChange={(e) => setQForm({ ...qForm, marks: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  Options <span className="font-normal text-slate-400">({optionsHint})</span>
                </p>
                {qForm.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-center text-sm font-bold text-slate-400">
                      {qForm.questionType === "TRUE_FALSE"
                        ? opt.text.slice(0, 1)
                        : ["A", "B", "C", "D"][idx]}
                    </span>
                    <input
                      className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
                      placeholder={
                        qForm.questionType === "TRUE_FALSE"
                          ? idx === 0
                            ? "True"
                            : "False"
                          : `Option ${["A", "B", "C", "D"][idx]}`
                      }
                      value={opt.text}
                      onChange={(e) =>
                        setQForm((prev) => ({
                          ...prev,
                          options: prev.options.map((o, i) =>
                            i === idx ? { ...o, text: e.target.value } : o
                          ),
                        }))
                      }
                      required
                    />
                    <label className="flex items-center gap-1.5 whitespace-nowrap text-sm text-slate-600">
                      {qForm.questionType === "MULTIPLE_CHOICE" ? (
                        <input
                          type="checkbox"
                          checked={opt.isCorrect}
                          onChange={() => {
                            setQForm((prev) => ({
                              ...prev,
                              options: prev.options.map((o, i) =>
                                i === idx ? { ...o, isCorrect: !o.isCorrect } : o
                              ),
                            }));
                          }}
                          className="accent-brand-600"
                        />
                      ) : (
                        <input
                          type="radio"
                          name="mock-correct"
                          checked={opt.isCorrect}
                          onChange={() => {
                            setQForm((prev) => ({
                              ...prev,
                              options: prev.options.map((o, i) => ({
                                ...o,
                                isCorrect: i === idx,
                              })),
                            }));
                          }}
                          className="accent-brand-600"
                        />
                      )}
                      Correct
                    </label>
                  </div>
                ))}
              </div>
              {questionError && <p className="text-sm text-red-600">{questionError}</p>}
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create Mock Exam Question"}
              </Button>
            </form>
          )}

          <div className="space-y-2">
            {selected.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No mock exam questions yet. Add questions here — do not use the Practice Questions
                screen.
              </p>
            ) : (
              selected.map((s, idx) => (
                <div
                  key={s.questionId}
                  className="flex items-start justify-between gap-3 rounded-lg border border-brand-100 bg-brand-50/30 p-3"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-brand-600">Q{idx + 1}</span>
                    <p className="text-sm font-medium text-slate-800">{s.question.text}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {questionTypeLabel(s.question.questionType)} · {s.question.marks} mark
                      {s.question.marks === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={idx === 0}
                      onClick={() => moveQuestion(idx, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={idx === selected.length - 1}
                      onClick={() => moveQuestion(idx, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => void removeQuestion(s.questionId)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Link href="/admin/mock-exams">
          <Button variant="primary" size="lg">
            Done
          </Button>
        </Link>
      </div>
    </div>
  );
}
