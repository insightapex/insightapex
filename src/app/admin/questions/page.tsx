"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QUESTION_ACCESS_LEVELS, questionAccessBadgeTone, questionAccessLabel, type QuestionAccessLevel } from "@/lib/question-access";
import {
  QUESTION_TYPES,
  TRUE_FALSE_OPTIONS,
  questionTypeLabel,
  type QuestionType,
} from "@/lib/question-types";

interface Part { id: string; code: string; title: string; }
interface Paper { id: string; code: string; title: string; partId?: string; }
interface Category { id: string; title: string; }
interface SubCategory { id: string; title: string; }
interface Question {
  id: string; text: string; difficulty: string; marks: number; isActive: boolean; accessLevel: QuestionAccessLevel;
  questionType: QuestionType;
  externalQuestionId?: string | null;
  subCategory: {
    title: string;
    category: { title: string; paper: { code: string } };
  };
  options: { id: string; text: string; isCorrect: boolean; order: number }[];
}

interface QuestionForm {
  subCategoryId: string;
  text: string;
  explanation: string;
  questionType: QuestionType;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  marks: number;
  imageUrl: string;
  isActive: boolean;
  accessLevel: QuestionAccessLevel;
  options: { text: string; isCorrect: boolean; order: number }[];
}

const emptyOption = (order: number) => ({ text: "", isCorrect: false, order });

function buildDefaultOptions(type: QuestionType) {
  if (type === "TRUE_FALSE") {
    return TRUE_FALSE_OPTIONS.map((option, index) => ({
      text: option.text,
      isCorrect: index === 0,
      order: option.order,
    }));
  }
  return [emptyOption(0), emptyOption(1), emptyOption(2), emptyOption(3)];
}

const emptyForm = (): QuestionForm => ({
  subCategoryId: "", text: "", explanation: "", questionType: "SINGLE_CHOICE",
  difficulty: "MEDIUM",
  marks: 1, imageUrl: "", isActive: true, accessLevel: "PREMIUM",
  options: buildDefaultOptions("SINGLE_CHOICE"),
});

export default function AdminQuestionsPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [filterPapers, setFilterPapers] = useState<Paper[]>([]);
  const [formPapers, setFormPapers] = useState<Paper[]>([]);
  const [formCategories, setFormCategories] = useState<Category[]>([]);
  const [formSubCategories, setFormSubCategories] = useState<SubCategory[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [filterPartId, setFilterPartId] = useState("");
  const [filterPaperId, setFilterPaperId] = useState("");
  const [formPartId, setFormPartId] = useState("");
  const [formPaperId, setFormPaperId] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/parts")
      .then((r) => r.json())
      .then((d) => setParts(Array.isArray(d?.parts) ? d.parts : []));
  }, []);

  useEffect(() => {
    const url = filterPartId ? `/api/admin/papers?partId=${filterPartId}` : "/api/admin/papers";
    fetch(url)
      .then((r) => r.json())
      .then((d) => setFilterPapers(Array.isArray(d) ? d : []));
  }, [filterPartId]);

  useEffect(() => {
    if (!formPartId) {
      setFormPapers([]);
      return;
    }
    fetch(`/api/admin/papers?partId=${formPartId}`)
      .then((r) => r.json())
      .then((d) => setFormPapers(Array.isArray(d) ? d : []));
  }, [formPartId]);

  useEffect(() => {
    if (!formPaperId) { setFormCategories([]); return; }
    fetch(`/api/admin/categories?paperId=${formPaperId}`)
      .then((r) => r.json())
      .then((d) => setFormCategories(d.categories ?? []));
  }, [formPaperId]);

  useEffect(() => {
    if (!formCategoryId) { setFormSubCategories([]); return; }
    fetch(`/api/admin/subcategories?categoryId=${formCategoryId}`)
      .then((r) => r.json())
      .then((d) => setFormSubCategories(d.subCategories ?? []));
  }, [formCategoryId]);

  const loadQuestions = useCallback(() => {
    const params = new URLSearchParams();
    if (filterPaperId) params.set("paperId", filterPaperId);
    if (search) params.set("q", search);
    fetch(`/api/admin/questions?${params}`)
      .then((r) => r.json())
      .then((d) => { setQuestions(d.questions ?? []); setTotal(d.total ?? 0); });
  }, [filterPaperId, search]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm());
    setFormPartId("");
    setFormPaperId("");
    setFormCategoryId("");
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setFormPartId("");
    setFormPaperId("");
    setFormCategoryId("");
    setFormError(null);
  }

  async function openEditForm(q: Question) {
    setFormError(null);
    const res = await fetch(`/api/admin/questions/${q.id}`);
    const full = await res.json();
    if (!res.ok) {
      setFormError(full.error ?? "Failed to load question.");
      return;
    }
    setFormPaperId(full.subCategory.category.paper.id);
    setFormPartId(full.subCategory.category.paper.partId ?? "");
    setFormCategoryId(full.subCategory.category.id);
    setForm({
      subCategoryId: full.subCategoryId,
      text: full.text,
      explanation: full.explanation ?? "",
      questionType: full.questionType ?? "SINGLE_CHOICE",
      difficulty: full.difficulty,
      marks: full.marks,
      imageUrl: full.imageUrl ?? "",
      isActive: full.isActive,
      accessLevel: full.accessLevel ?? "PREMIUM",
      options: full.options.map((o: { text: string; isCorrect: boolean; order: number }) => ({
        text: o.text,
        isCorrect: o.isCorrect,
        order: o.order,
      })),
    });
    setEditingId(q.id);
    setShowForm(true);
  }

  function handleQuestionTypeChange(type: QuestionType) {
    setForm({
      ...form,
      questionType: type,
      options: buildDefaultOptions(type),
    });
  }

  function setOptionText(idx: number, value: string) {
    setForm({
      ...form,
      options: form.options.map((option, index) =>
        index === idx ? { ...option, text: value } : option
      ),
    });
  }

  function setSingleCorrect(idx: number) {
    setForm({
      ...form,
      options: form.options.map((option, index) => ({
        ...option,
        isCorrect: index === idx,
      })),
    });
  }

  function toggleMultipleCorrect(idx: number) {
    const target = form.options[idx];
    const currentlyCorrect = form.options.filter((option) => option.isCorrect).length;

    if (target.isCorrect) {
      setForm({
        ...form,
        options: form.options.map((option, index) =>
          index === idx ? { ...option, isCorrect: false } : option
        ),
      });
      return;
    }

    if (currentlyCorrect >= 4) {
      setFormError("You can mark at most four options as correct.");
      return;
    }

    setFormError(null);
    setForm({
      ...form,
      options: form.options.map((option, index) =>
        index === idx ? { ...option, isCorrect: true } : option
      ),
    });
  }

  function validateOptionsBeforeSave(): string | null {
    const correctCount = form.options.filter((option) => option.isCorrect).length;
    if (form.questionType === "TRUE_FALSE") {
      if (correctCount !== 1) return "Mark either True or False as correct.";
      return null;
    }
    if (form.questionType === "MULTIPLE_CHOICE") {
      if (correctCount < 2) return "Mark at least two options as correct.";
      return null;
    }
    if (correctCount !== 1) return "Mark one option as correct.";
    return null;
  }

  const optionsHint =
    form.questionType === "MULTIPLE_CHOICE"
      ? "mark exactly two as correct"
      : form.questionType === "TRUE_FALSE"
        ? "mark True or False as correct"
        : "mark one as correct";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!formPartId || !formPaperId || !formCategoryId || !form.subCategoryId) {
      setFormError("Select part, paper, category, and sub category.");
      return;
    }
    const optionError = validateOptionsBeforeSave();
    if (optionError) {
      setFormError(optionError);
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      difficulty: "MEDIUM",
      explanation: form.explanation || null,
      imageUrl: form.imageUrl || null,
    };
    const res = await fetch(
      editingId ? `/api/admin/questions/${editingId}` : "/api/admin/questions",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setFormError(data.error ?? "Failed to save."); return; }
    closeForm();
    loadQuestions();
  }

  async function handleDelete(q: Question) {
    const source = q.externalQuestionId
      ? `\nExcel ID: ${q.externalQuestionId}`
      : "";
    const confirmed = window.confirm(
      `Delete this question?${source}\n\n"${q.text.slice(0, 80)}${q.text.length > 80 ? "…" : ""}"\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(q.id);
    const res = await fetch(`/api/admin/questions/${q.id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json();
      window.alert(data.error ?? "Failed to delete question.");
      return;
    }
    if (editingId === q.id) closeForm();
    loadQuestions();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Practice Questions</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <Link href="/admin/questions/import" className="font-medium text-brand-600 hover:underline">
              Import Excel
            </Link>
            <Link
              href="/admin/questions/import/history"
              className="font-medium text-brand-600 hover:underline"
            >
              Import History
            </Link>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {total} practice questions · Part → Paper → Category → Sub Category
          </p>
        </div>
        <Button onClick={() => (showForm ? closeForm() : openCreateForm())}>
          {showForm ? "Cancel" : "+ Add Practice Question"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">
              {editingId ? "Edit Practice Question" : "New Practice Question"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Practice pool only — these never appear in mock exams.
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Part *</label>
                  <select
                    required
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 transition-all duration-200 hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400"
                    value={formPartId}
                    onChange={(e) => {
                      setFormPartId(e.target.value);
                      setFormPaperId("");
                      setFormCategoryId("");
                      setForm({ ...form, subCategoryId: "" });
                    }}
                  >
                    <option value="">Select part…</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} – {p.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Paper *</label>
                  <select
                    required
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 transition-all duration-200 hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400"
                    value={formPaperId}
                    onChange={(e) => {
                      setFormPaperId(e.target.value);
                      setFormCategoryId("");
                      setForm({ ...form, subCategoryId: "" });
                    }}
                    disabled={!formPartId}
                  >
                    <option value="">Select paper…</option>
                    {formPapers.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} – {p.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Category *</label>
                  <select
                    required
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 transition-all duration-200 hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400"
                    value={formCategoryId}
                    onChange={(e) => {
                      setFormCategoryId(e.target.value);
                      setForm({ ...form, subCategoryId: "" });
                    }}
                    disabled={!formPaperId}
                  >
                    <option value="">Select category…</option>
                    {formCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Sub Category *</label>
                  <select
                    required
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 transition-all duration-200 hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400"
                    value={form.subCategoryId}
                    onChange={(e) => setForm({ ...form, subCategoryId: e.target.value })}
                    disabled={!formCategoryId}
                  >
                    <option value="">Select sub category…</option>
                    {formSubCategories.map((sc) => (
                      <option key={sc.id} value={sc.id}>{sc.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Question type *</label>
                  <select
                    required
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 transition-all duration-200 hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    value={form.questionType}
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
                  value={form.marks}
                  onChange={(e) => setForm({ ...form, marks: parseInt(e.target.value) || 1 })}
                />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Access *</label>
                  <select
                    required
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 transition-all duration-200 hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400"
                    value={form.accessLevel}
                    onChange={(e) => setForm({ ...form, accessLevel: e.target.value as QuestionAccessLevel })}
                  >
                    {QUESTION_ACCESS_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Question Text *</label>
                <textarea
                  required
                  rows={3}
                  disabled={!form.subCategoryId}
                  className="w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 transition-all duration-200 hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  placeholder="Enter the question…"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Answer Options <span className="text-slate-400">({optionsHint})</span>
                </label>
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm font-bold text-slate-400">
                      {form.questionType === "TRUE_FALSE"
                        ? opt.text.slice(0, 1)
                        : ["A", "B", "C", "D"][i]}
                    </span>
                    <input
                      type="text"
                      required
                      className="flex-1 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm text-ink-900 transition-all duration-200 hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      placeholder={
                        form.questionType === "TRUE_FALSE"
                          ? i === 0
                            ? "True"
                            : "False"
                          : `Option ${["A", "B", "C", "D"][i]}`
                      }
                      value={opt.text}
                      onChange={(e) => setOptionText(i, e.target.value)}
                    />
                    <label className="flex items-center gap-1.5 text-sm text-slate-600 whitespace-nowrap">
                      {form.questionType === "MULTIPLE_CHOICE" ? (
                        <input
                          type="checkbox"
                          checked={opt.isCorrect}
                          onChange={() => toggleMultipleCorrect(i)}
                          className="accent-brand-600"
                        />
                      ) : (
                        <input
                          type="radio"
                          name="correctOption"
                          checked={opt.isCorrect}
                          onChange={() => setSingleCorrect(i)}
                          className="accent-brand-600"
                        />
                      )}
                      Correct
                    </label>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Explanation (optional)</label>
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 transition-all duration-200 hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400"
                  value={form.explanation}
                  onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                  placeholder="Why is this the correct answer?"
                />
              </div>

              <Input
                label="Image URL (optional)"
                placeholder="https://…"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              />

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="accent-brand-600"
                />
                Active (visible to students)
              </label>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Save Changes" : "Create Question"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap gap-4">
        <select
          className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 transition-all duration-200 hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          value={filterPartId}
          onChange={(e) => {
            setFilterPartId(e.target.value);
            setFilterPaperId("");
          }}
        >
          <option value="">All parts</option>
          {parts.map((p) => (
            <option key={p.id} value={p.id}>{p.code} – {p.title}</option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 transition-all duration-200 hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          value={filterPaperId}
          onChange={(e) => setFilterPaperId(e.target.value)}
        >
          <option value="">All papers</option>
          {filterPapers.map((p) => (
            <option key={p.id} value={p.id}>{p.code} – {p.title}</option>
          ))}
        </select>
        <div className="flex-1 max-w-sm">
          <Input placeholder="Search questions…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Question</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Paper / Category / Sub Category</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Access</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Options</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {questions.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 max-w-xs">
                    <p className="truncate font-medium text-slate-800">{q.text}</p>
                    {q.externalQuestionId && (
                      <p className="mt-1 text-xs text-slate-400">
                        Excel · {q.externalQuestionId}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    <span className="font-semibold text-brand-600">{q.subCategory.category.paper.code}</span>
                    {" / "}{q.subCategory.category.title} / {q.subCategory.title}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={questionAccessBadgeTone(q.accessLevel)}>
                      {questionAccessLabel(q.accessLevel)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone="neutral">{questionTypeLabel(q.questionType ?? "SINGLE_CHOICE")}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{q.options.length}</td>
                  <td className="px-5 py-3">
                    <Badge tone={q.isActive ? "success" : "neutral"}>{q.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditForm(q)} disabled={deletingId === q.id}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleDelete(q)}
                        disabled={deletingId === q.id}
                      >
                        {deletingId === q.id ? "Deleting…" : "Delete"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {questions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">No questions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
