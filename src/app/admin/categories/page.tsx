"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLoading } from "@/components/ui/PageLoading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/Table";
import { AdminAlert } from "@/components/admin/AdminAlert";

interface Paper { id: string; code: string; title: string; }

interface Category {
  id: string;
  paperId: string;
  title: string;
  description: string | null;
  order: number;
  isActive: boolean;
  paper: { id: string; code: string; title: string };
  _count: { subCategories: number };
}

interface CategoryForm {
  paperId: string;
  title: string;
  description: string;
  order: number;
  isActive: boolean;
}

const emptyForm = (): CategoryForm => ({
  paperId: "",
  title: "",
  description: "",
  order: 0,
  isActive: true,
});

export default function AdminCategoriesPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [filterPaperId, setFilterPaperId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/papers").then((r) => r.json()).then(setPapers);
  }, []);

  const loadCategories = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterPaperId) params.set("paperId", filterPaperId);
    if (search) params.set("q", search);
    fetch(`/api/admin/categories?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setCategories(d.categories ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [filterPaperId, search]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

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

  function openEdit(category: Category) {
    setEditingId(category.id);
    setForm({
      paperId: category.paperId,
      title: category.title,
      description: category.description ?? "",
      order: category.order,
      isActive: category.isActive,
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
    const payload = { ...form, description: form.description || null };
    const res = await fetch(
      editingId ? `/api/admin/categories/${editingId}` : "/api/admin/categories",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setFormError(data.error ?? "Failed to save category.");
      return;
    }

    setAlert({ tone: "success", message: editingId ? "Category updated." : "Category created." });
    closeForm();
    loadCategories();
  }

  async function toggleActive(category: Category) {
    setTogglingId(category.id);
    const res = await fetch(`/api/admin/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paperId: category.paperId,
        title: category.title,
        description: category.description,
        order: category.order,
        isActive: !category.isActive,
      }),
    });
    setTogglingId(null);
    if (!res.ok) {
      const data = await res.json();
      setAlert({ tone: "error", message: data.error ?? "Failed to update status." });
      return;
    }
    setAlert({ tone: "success", message: category.isActive ? "Category disabled." : "Category enabled." });
    loadCategories();
  }

  async function handleDelete(category: Category) {
    if (!window.confirm(`Delete category "${category.title}"?\n\nThis only works if it has no sub categories.`)) {
      return;
    }

    setDeletingId(category.id);
    const res = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
    const data = await res.json();
    setDeletingId(null);

    if (!res.ok) {
      setAlert({ tone: "error", message: data.error ?? "Failed to delete category." });
      return;
    }

    setAlert({ tone: "success", message: "Category deleted." });
    if (editingId === category.id) closeForm();
    loadCategories();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Organize content within ACCA papers. Sub categories and questions sit under each category."
        action={{ label: showForm ? "Cancel" : "+ Create Category", onClick: () => (showForm ? closeForm() : openCreate()) }}
      />

      {alert && <AdminAlert tone={alert.tone} message={alert.message} onDismiss={() => setAlert(null)} />}

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">{editingId ? "Edit Category" : "New Category"}</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Select
                  label="ACCA Paper *"
                  required
                  placeholder="Select paper…"
                  value={form.paperId}
                  onChange={(e) => setForm({ ...form, paperId: e.target.value })}
                  options={papers.map((p) => ({ value: p.id, label: `${p.code} – ${p.title}` }))}
                />
              </div>
              <Input label="Category Title *" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input label="Display Order" type="number" min={0} value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} />
              <div className="sm:col-span-2">
                <Textarea
                  label="Description (optional)"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief summary…"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-brand-600" />
                Active (visible to students in Practice)
              </label>
              {formError && (
                <div className="sm:col-span-2">
                  <Alert tone="error">{formError}</Alert>
                </div>
              )}
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save Changes" : "Create Category"}</Button>
                <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="w-full sm:max-w-xs">
          <Select
            value={filterPaperId}
            onChange={(e) => setFilterPaperId(e.target.value)}
            options={[{ value: "", label: "All papers" }, ...papers.map((p) => ({ value: p.id, label: `${p.code} – ${p.title}` }))]}
          />
        </div>
        <div className="flex-1 sm:max-w-md">
          <Input placeholder="Search categories…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <PageLoading message="Loading categories…" />
          ) : categories.length === 0 ? (
            <EmptyState icon="categories" title="No categories yet" description="Create a category under an ACCA paper, then add sub categories and questions." />
          ) : (
            <Table>
              <TableHead>
                <TableHeader>Category</TableHeader>
                <TableHeader>Paper</TableHeader>
                <TableHeader>Sub Categories</TableHeader>
                <TableHeader>Order</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader className="text-right">Actions</TableHeader>
              </TableHead>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium text-slate-800">{category.title}</TableCell>
                    <TableCell><span className="font-semibold text-brand-600">{category.paper.code}</span></TableCell>
                    <TableCell>{category._count.subCategories}</TableCell>
                    <TableCell>{category.order}</TableCell>
                    <TableCell><Badge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(category)}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleActive(category)} disabled={togglingId === category.id}>{togglingId === category.id ? "…" : category.isActive ? "Disable" : "Enable"}</Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(category)} disabled={deletingId === category.id}>{deletingId === category.id ? "…" : "Delete"}</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {!loading && categories.length > 0 && (
        <p className="text-xs text-slate-400">{total} categor(ies) shown, sorted by display order.</p>
      )}
    </div>
  );
}
