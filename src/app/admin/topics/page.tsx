"use client";

import { useCallback, useEffect, useState } from "react";
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

interface Topic {
  id: string;
  paperId: string;
  title: string;
  description: string | null;
  order: number;
  isActive: boolean;
  paper: { id: string; code: string; title: string };
  _count: { questions: number };
}

interface TopicForm {
  paperId: string;
  title: string;
  description: string;
  order: number;
  isActive: boolean;
}

const emptyForm = (): TopicForm => ({
  paperId: "",
  title: "",
  description: "",
  order: 0,
  isActive: true,
});

export default function AdminTopicsPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [total, setTotal] = useState(0);
  const [filterPaperId, setFilterPaperId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TopicForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/papers")
      .then((r) => r.json())
      .then(setPapers);
  }, []);

  const loadTopics = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterPaperId) params.set("paperId", filterPaperId);
    if (search) params.set("q", search);
    fetch(`/api/admin/topics?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setTopics(d.topics ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [filterPaperId, search]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm(), paperId: filterPaperId });
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
  }

  function openEdit(topic: Topic) {
    setEditingId(topic.id);
    setForm({
      paperId: topic.paperId,
      title: topic.title,
      description: topic.description ?? "",
      order: topic.order,
      isActive: topic.isActive,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.paperId) {
      setFormError("Select a paper.");
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      description: form.description || null,
    };
    const res = await fetch(
      editingId ? `/api/admin/topics/${editingId}` : "/api/admin/topics",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setFormError(data.error ?? "Failed to save topic.");
      return;
    }

    setAlert({ tone: "success", message: editingId ? "Topic updated." : "Topic created." });
    closeForm();
    loadTopics();
  }

  async function toggleActive(topic: Topic) {
    setTogglingId(topic.id);
    const res = await fetch(`/api/admin/topics/${topic.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paperId: topic.paperId,
        title: topic.title,
        description: topic.description,
        order: topic.order,
        isActive: !topic.isActive,
      }),
    });
    setTogglingId(null);
    if (!res.ok) {
      const data = await res.json();
      setAlert({ tone: "error", message: data.error ?? "Failed to update status." });
      return;
    }
    setAlert({
      tone: "success",
      message: topic.isActive ? "Topic disabled." : "Topic enabled.",
    });
    loadTopics();
  }

  async function handleDelete(topic: Topic) {
    if (
      !window.confirm(
        `Delete topic "${topic.title}"?\n\nThis only works if the topic has no questions.`
      )
    ) {
      return;
    }

    setDeletingId(topic.id);
    const res = await fetch(`/api/admin/topics/${topic.id}`, { method: "DELETE" });
    const data = await res.json();
    setDeletingId(null);

    if (!res.ok) {
      setAlert({ tone: "error", message: data.error ?? "Failed to delete topic." });
      return;
    }

    setAlert({ tone: "success", message: "Topic deleted." });
    if (editingId === topic.id) closeForm();
    loadTopics();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Topics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Organize chapters within ACCA papers. Questions are added under each topic.
          </p>
        </div>
        <Button onClick={() => (showForm ? closeForm() : openCreate())}>
          {showForm ? "Cancel" : "+ Create Topic"}
        </Button>
      </div>

      {alert && (
        <AdminAlert tone={alert.tone} message={alert.message} onDismiss={() => setAlert(null)} />
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">
              {editingId ? "Edit Topic" : "New Topic"}
            </h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
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
                label="Topic Title *"
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
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Description (optional)</label>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief chapter summary…"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="accent-brand-600"
                />
                Active (visible to students in Practice)
              </label>
              {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}
              <div className="flex gap-3 sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Save Changes" : "Create Topic"}
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
            placeholder="Search topics…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardBody className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">
              Loading topics…
            </div>
          ) : topics.length === 0 ? (
            <EmptyState
              icon="◈"
              title="No topics yet"
              description="Create a topic under an ACCA paper, then add questions from the Questions page."
            />
          ) : (
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Topic Name
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Paper
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Questions
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Order
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
                {topics.map((topic) => (
                  <tr key={topic.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800">{topic.title}</p>
                      {topic.description && (
                        <p className="mt-0.5 truncate text-xs text-slate-400 max-w-xs">
                          {topic.description}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-semibold text-brand-600">{topic.paper.code}</span>
                      <p className="text-xs text-slate-400">{topic.paper.title}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{topic._count.questions}</td>
                    <td className="px-5 py-3 text-slate-600">{topic.order}</td>
                    <td className="px-5 py-3">
                      <Badge tone={topic.isActive ? "success" : "neutral"}>
                        {topic.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(topic)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(topic)}
                          disabled={togglingId === topic.id}
                        >
                          {togglingId === topic.id
                            ? "…"
                            : topic.isActive
                              ? "Disable"
                              : "Enable"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(topic)}
                          disabled={deletingId === topic.id}
                        >
                          {deletingId === topic.id ? "…" : "Delete"}
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

      {!loading && topics.length > 0 && (
        <p className="text-xs text-slate-400">{total} topic(s) shown, sorted by display order.</p>
      )}
    </div>
  );
}
