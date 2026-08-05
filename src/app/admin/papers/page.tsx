"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLoading } from "@/components/ui/PageLoading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/Table";
import { AdminAlert } from "@/components/admin/AdminAlert";

interface Part {
  id: string;
  code: string;
  title: string;
}

interface Paper {
  id: string;
  code: string;
  title: string;
  description: string | null;
  partId: string;
  part: Part;
  accessLevel: string;
  isActive: boolean;
  _count: { categories: number; attempts: number };
}

interface PaperForm {
  code: string;
  title: string;
  description: string;
  partId: string;
  accessLevel: "FREE" | "PREMIUM";
  isActive: boolean;
}

const emptyForm = (): PaperForm => ({
  code: "",
  title: "",
  description: "",
  partId: "",
  accessLevel: "FREE",
  isActive: true,
});

export default function AdminPapersPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PaperForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const loadPapers = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/papers")
      .then((r) => r.json())
      .then((data) => setPapers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/admin/parts")
      .then((r) => r.json())
      .then((d) => setParts(d.parts ?? []));
    loadPapers();
  }, [loadPapers]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
  }

  function openEdit(paper: Paper) {
    setEditingId(paper.id);
    setForm({
      code: paper.code,
      title: paper.title,
      description: paper.description ?? "",
      partId: paper.partId,
      accessLevel: paper.accessLevel as "FREE" | "PREMIUM",
      isActive: paper.isActive,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.partId) {
      setFormError("Select a part.");
      return;
    }

    setSaving(true);
    const payload = { ...form, description: form.description || null };
    const res = await fetch(
      editingId ? `/api/admin/papers/${editingId}` : "/api/admin/papers",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setFormError(data.error ?? "Failed to save paper.");
      return;
    }

    setAlert({ tone: "success", message: editingId ? "Paper updated." : "Paper created." });
    closeForm();
    loadPapers();
  }

  async function handleDelete(paper: Paper) {
    if (
      !window.confirm(
        `Delete "${paper.code}"?\n\nThis is only allowed when the paper has no categories.`
      )
    ) {
      return;
    }

    setDeletingId(paper.id);
    const res = await fetch(`/api/admin/papers/${paper.id}`, { method: "DELETE" });
    const data = await res.json();
    setDeletingId(null);

    if (!res.ok) {
      setAlert({ tone: "error", message: data.error ?? "Failed to delete paper." });
      return;
    }

    if (editingId === paper.id) closeForm();
    setAlert({ tone: "success", message: "Paper deleted." });
    loadPapers();
  }

  const partOptions = parts.map((p) => ({ value: p.id, label: `${p.code} – ${p.title}` }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Papers"
        description="Manage ACCA papers available on the platform."
        action={{
          label: showForm ? "Cancel" : "+ Add Paper",
          onClick: () => (showForm ? closeForm() : openCreate()),
        }}
      />

      {alert && <AdminAlert tone={alert.tone} message={alert.message} onDismiss={() => setAlert(null)} />}

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">
              {editingId ? "Edit Paper" : "New Paper"}
            </h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Select
                  label="Part *"
                  required
                  placeholder="Select part…"
                  options={partOptions}
                  value={form.partId}
                  onChange={(e) => setForm({ ...form, partId: e.target.value })}
                />
              </div>
              <Input
                label="Code (e.g. PM)"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
              <Input
                label="Title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Description (optional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <Select
                label="Access level"
                options={[
                  { value: "FREE", label: "Free" },
                  { value: "PREMIUM", label: "Premium" },
                ]}
                value={form.accessLevel}
                onChange={(e) =>
                  setForm({ ...form, accessLevel: e.target.value as "FREE" | "PREMIUM" })
                }
              />
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="accent-brand-600"
                  />
                  Active (visible to students)
                </label>
              </div>
              {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}
              <div className="flex gap-3 sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Save Changes" : "Create Paper"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <PageLoading message="Loading papers…" />
          ) : papers.length === 0 ? (
            <EmptyState
              icon="papers"
              title="No papers yet"
              description="Create your first ACCA paper and assign it to a part."
              actionLabel="Add Paper"
              onAction={openCreate}
            />
          ) : (
            <Table>
              <TableHead>
                <TableHeader>Code</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Part</TableHeader>
                <TableHeader>Categories</TableHeader>
                <TableHeader>Attempts</TableHeader>
                <TableHeader>Access</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader className="text-right">Actions</TableHeader>
              </TableHead>
              <TableBody>
                {papers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold text-brand-600">{p.code}</TableCell>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell>{p.part?.title ?? "—"}</TableCell>
                    <TableCell className="text-slate-500">{p._count.categories}</TableCell>
                    <TableCell className="text-slate-500">{p._count.attempts}</TableCell>
                    <TableCell>
                      <Badge tone={p.accessLevel === "FREE" ? "success" : "brand"}>
                        {p.accessLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge tone={p.isActive ? "success" : "neutral"}>
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          disabled={deletingId === p.id}
                          onClick={() => handleDelete(p)}
                        >
                          {deletingId === p.id ? "…" : "Delete"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
