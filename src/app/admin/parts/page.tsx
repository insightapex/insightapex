"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLoading } from "@/components/ui/PageLoading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/Table";
import { AdminAlert } from "@/components/admin/AdminAlert";

interface Part {
  id: string;
  code: string;
  title: string;
  description: string | null;
  order: number;
  isActive: boolean;
  _count: { papers: number };
}

interface PartForm {
  code: string;
  title: string;
  description: string;
  order: number;
  isActive: boolean;
}

const emptyForm = (): PartForm => ({
  code: "",
  title: "",
  description: "",
  order: 0,
  isActive: true,
});

export default function AdminPartsPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PartForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const loadParts = useCallback(() => {
    setLoading(true);
    const q = search ? `?q=${encodeURIComponent(search)}` : "";
    fetch(`/api/admin/parts${q}`)
      .then((r) => r.json())
      .then((d) => {
        setParts(d.parts ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    loadParts();
  }, [loadParts]);

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

  function openEdit(part: Part) {
    setEditingId(part.id);
    setForm({
      code: part.code,
      title: part.title,
      description: part.description ?? "",
      order: part.order,
      isActive: part.isActive,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.code.trim() || !form.title.trim()) {
      setFormError("Code and title are required.");
      return;
    }

    setSaving(true);
    const payload = { ...form, description: form.description || null };
    const res = await fetch(
      editingId ? `/api/admin/parts/${editingId}` : "/api/admin/parts",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setFormError(data.error ?? "Failed to save part.");
      return;
    }

    setAlert({ tone: "success", message: editingId ? "Part updated." : "Part created." });
    closeForm();
    loadParts();
  }

  async function handleDelete(part: Part) {
    if (
      !window.confirm(
        `Delete "${part.title}"?\n\nThis is only allowed when no papers are assigned to this part.`
      )
    ) {
      return;
    }

    setDeletingId(part.id);
    const res = await fetch(`/api/admin/parts/${part.id}`, { method: "DELETE" });
    const data = await res.json();
    setDeletingId(null);

    if (!res.ok) {
      setAlert({ tone: "error", message: data.error ?? "Failed to delete part." });
      return;
    }

    if (editingId === part.id) closeForm();
    setAlert({ tone: "success", message: "Part deleted." });
    loadParts();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parts"
        description="Manage ACCA qualification parts. Papers belong to a part."
        action={{
          label: showForm ? "Cancel" : "+ Add Part",
          onClick: () => (showForm ? closeForm() : openCreate()),
        }}
      />

      {alert && (
        <AdminAlert tone={alert.tone} message={alert.message} onDismiss={() => setAlert(null)} />
      )}

      <div className="max-w-sm">
        <Input
          placeholder="Search by code or title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">
              {editingId ? "Edit Part" : "New Part"}
            </h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Code (e.g. PART_1)"
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
              <Input
                label="Order"
                type="number"
                min={0}
                value={form.order}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value, 10) || 0 })}
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
              <div className="sm:col-span-2">
                <Input
                  label="Description (optional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}
              <div className="flex gap-3 sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Save Changes" : "Create Part"}
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
        <CardHeader>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {total} parts
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <PageLoading message="Loading parts…" />
          ) : parts.length === 0 ? (
            <EmptyState
              icon="parts"
              title="No parts yet"
              description="Create your first qualification part, then assign papers to it."
              actionLabel="Add Part"
              onAction={openCreate}
            />
          ) : (
            <Table>
              <TableHead>
                <TableHeader>Code</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Papers</TableHeader>
                <TableHeader>Order</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader className="text-right">Actions</TableHeader>
              </TableHead>
              <TableBody>
                {parts.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-bold text-brand-600">{part.code}</TableCell>
                    <TableCell className="font-medium">{part.title}</TableCell>
                    <TableCell className="text-slate-500">{part._count.papers}</TableCell>
                    <TableCell className="text-slate-500">{part.order}</TableCell>
                    <TableCell>
                      <Badge tone={part.isActive ? "success" : "neutral"}>
                        {part.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(part)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          disabled={deletingId === part.id}
                          onClick={() => handleDelete(part)}
                        >
                          {deletingId === part.id ? "…" : "Delete"}
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
