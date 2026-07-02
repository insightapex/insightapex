"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Paper { id: string; code: string; title: string; }
interface Topic { id: string; title: string; }
interface Question {
  id: string; text: string; difficulty: string; marks: number; isActive: boolean;
  topic: { title: string; paper: { code: string } };
  options: { id: string; text: string; isCorrect: boolean; order: number }[];
}

interface QuestionForm {
  topicId: string;
  text: string;
  explanation: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  marks: number;
  imageUrl: string;
  isActive: boolean;
  options: { text: string; isCorrect: boolean; order: number }[];
}

const emptyOption = (order: number) => ({ text: "", isCorrect: false, order });
const emptyForm = (): QuestionForm => ({
  topicId: "", text: "", explanation: "", difficulty: "MEDIUM",
  marks: 1, imageUrl: "", isActive: true,
  options: [emptyOption(0), emptyOption(1), emptyOption(2), emptyOption(3)],
});

export default function AdminQuestionsPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [formTopics, setFormTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [filterPaperId, setFilterPaperId] = useState("");
  const [formPaperId, setFormPaperId] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/papers").then((r) => r.json()).then(setPapers);
  }, []);

  useEffect(() => {
    if (!formPaperId) { setFormTopics([]); return; }
    fetch(`/api/papers/${formPaperId}/topics`).then((r) => r.json()).then(setFormTopics);
  }, [formPaperId]);

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
    setFormPaperId("");
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setFormPaperId("");
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
    setFormPaperId(full.topic.paper.id);
    setForm({
      topicId: full.topicId,
      text: full.text,
      explanation: full.explanation ?? "",
      difficulty: full.difficulty,
      marks: full.marks,
      imageUrl: full.imageUrl ?? "",
      isActive: full.isActive,
      options: full.options.map((o: { text: string; isCorrect: boolean; order: number }) => ({
        text: o.text,
        isCorrect: o.isCorrect,
        order: o.order,
      })),
    });
    setEditingId(q.id);
    setShowForm(true);
  }

  function setOptionField(idx: number, key: "text" | "isCorrect", value: string | boolean) {
    const updated = form.options.map((o, i) => {
      if (i !== idx) return key === "isCorrect" ? { ...o, isCorrect: false } : o;
      return { ...o, [key]: value };
    });
    setForm({ ...form, options: updated });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.topicId) { setFormError("Select a topic."); return; }
    if (!form.options.some((o) => o.isCorrect)) { setFormError("Mark one option as correct."); return; }

    setSaving(true);
    const payload = {
      ...form,
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
    const confirmed = window.confirm(
      `Delete this question?\n\n"${q.text.slice(0, 80)}${q.text.length > 80 ? "…" : ""}"\n\nThis cannot be undone.`
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

  const diffTone: Record<string, "success" | "warning" | "danger"> = {
    EASY: "success", MEDIUM: "warning", HARD: "danger",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Questions</h1>
          <p className="mt-1 text-sm text-slate-500">{total} questions in database</p>
        </div>
        <Button onClick={() => (showForm ? closeForm() : openCreateForm())}>
          {showForm ? "Cancel" : "+ Add Question"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">
              {editingId ? "Edit Question" : "New Question"}
            </h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Paper</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                    value={formPaperId}
                    onChange={(e) => { setFormPaperId(e.target.value); setForm({ ...form, topicId: "" }); }}
                  >
                    <option value="">Select paper…</option>
                    {papers.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} – {p.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Topic *</label>
                  <select
                    required
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                    value={form.topicId}
                    onChange={(e) => setForm({ ...form, topicId: e.target.value })}
                    disabled={!formPaperId}
                  >
                    <option value="">Select topic…</option>
                    {formTopics.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Difficulty</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value as "EASY" | "MEDIUM" | "HARD" })}
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                <Input
                  label="Marks"
                  type="number"
                  min={1}
                  value={form.marks}
                  onChange={(e) => setForm({ ...form, marks: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Question Text *</label>
                <textarea
                  required
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  placeholder="Enter the question…"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Answer Options <span className="text-slate-400">(mark one as correct)</span>
                </label>
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm font-bold text-slate-400">
                      {["A", "B", "C", "D"][i]}
                    </span>
                    <input
                      type="text"
                      required
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                      placeholder={`Option ${["A", "B", "C", "D"][i]}`}
                      value={opt.text}
                      onChange={(e) => setOptionField(i, "text", e.target.value)}
                    />
                    <label className="flex items-center gap-1.5 text-sm text-slate-600 whitespace-nowrap">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={opt.isCorrect}
                        onChange={() => setOptionField(i, "isCorrect", true)}
                        className="accent-brand-600"
                      />
                      Correct
                    </label>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Explanation (optional)</label>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
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

      <div className="flex gap-4">
        <select
          className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          value={filterPaperId}
          onChange={(e) => setFilterPaperId(e.target.value)}
        >
          <option value="">All papers</option>
          {papers.map((p) => (
            <option key={p.id} value={p.id}>{p.code} – {p.title}</option>
          ))}
        </select>
        <div className="flex-1 max-w-sm">
          <Input placeholder="Search questions…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Question</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Paper / Topic</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Difficulty</th>
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
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    <span className="font-semibold text-brand-600">{q.topic.paper.code}</span> / {q.topic.title}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={diffTone[q.difficulty] ?? "neutral"}>{q.difficulty}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{q.options.length}</td>
                  <td className="px-5 py-3">
                    <Badge tone={q.isActive ? "success" : "neutral"}>{q.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditForm(q)}
                        disabled={deletingId === q.id}
                      >
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
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">No questions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
