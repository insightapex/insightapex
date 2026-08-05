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
interface Category { id: string; title: string; paperId: string; }

interface SubCategory {
  id: string;
  categoryId: string;
  title: string;
  description: string | null;
  order: number;
  isActive: boolean;
  category: { id: string; title: string; paper: { id: string; code: string; title: string } };
  _count: { questions: number };
}

interface SubCategoryForm {
  categoryId: string;
  title: string;
  description: string;
  order: number;
  isActive: boolean;
}

const emptyForm = (): SubCategoryForm => ({
  categoryId: "",
  title: "",
  description: "",
  order: 0,
  isActive: true,
});

export default function AdminSubCategoriesPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [filterCategories, setFilterCategories] = useState<Category[]>([]);
  const [formCategories, setFormCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [filterPaperId, setFilterPaperId] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [formPaperId, setFormPaperId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SubCategoryForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/papers").then((r) => r.json()).then(setPapers);
  }, []);

  useEffect(() => {
    if (!filterPaperId) { setFilterCategories([]); setFilterCategoryId(""); return; }
    fetch(`/api/admin/categories?paperId=${filterPaperId}`)
      .then((r) => r.json())
      .then((d) => setFilterCategories(d.categories ?? []));
  }, [filterPaperId]);

  useEffect(() => {
    if (!formPaperId) { setFormCategories([]); return; }
    fetch(`/api/admin/categories?paperId=${formPaperId}`)
      .then((r) => r.json())
      .then((d) => setFormCategories(d.categories ?? []));
  }, [formPaperId]);

  const loadSubCategories = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCategoryId) params.set("categoryId", filterCategoryId);
    else if (filterPaperId) params.set("paperId", filterPaperId);
    if (search) params.set("q", search);
    fetch(`/api/admin/subcategories?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setSubCategories(d.subCategories ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [filterPaperId, filterCategoryId, search]);

  useEffect(() => { loadSubCategories(); }, [loadSubCategories]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm(), categoryId: filterCategoryId });
    setFormPaperId(filterPaperId);
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

  function openEdit(sc: SubCategory) {
    setEditingId(sc.id);
    setFormPaperId(sc.category.paper.id);
    setForm({
      categoryId: sc.categoryId,
      title: sc.title,
      description: sc.description ?? "",
      order: sc.order,
      isActive: sc.isActive,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.categoryId) {
      setFormError("Select a category.");
      return;
    }

    setSaving(true);
    const payload = { ...form, description: form.description || null };
    const res = await fetch(
      editingId ? `/api/admin/subcategories/${editingId}` : "/api/admin/subcategories",
      { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    );
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setFormError(data.error ?? "Failed to save sub category.");
      return;
    }

    setAlert({ tone: "success", message: editingId ? "Sub category updated." : "Sub category created." });
    closeForm();
    loadSubCategories();
  }

  async function toggleActive(sc: SubCategory) {
    setTogglingId(sc.id);
    const res = await fetch(`/api/admin/subcategories/${sc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: sc.categoryId,
        title: sc.title,
        description: sc.description,
        order: sc.order,
        isActive: !sc.isActive,
      }),
    });
    setTogglingId(null);
    if (!res.ok) {
      const data = await res.json();
      setAlert({ tone: "error", message: data.error ?? "Failed to update status." });
      return;
    }
    setAlert({ tone: "success", message: sc.isActive ? "Sub category disabled." : "Sub category enabled." });
    loadSubCategories();
  }

  async function handleDelete(sc: SubCategory) {
    if (!window.confirm(`Delete sub category "${sc.title}"?\n\nThis only works if it has no questions.`)) return;

    setDeletingId(sc.id);
    const res = await fetch(`/api/admin/subcategories/${sc.id}`, { method: "DELETE" });
    const data = await res.json();
    setDeletingId(null);

    if (!res.ok) {
      setAlert({ tone: "error", message: data.error ?? "Failed to delete sub category." });
      return;
    }

    setAlert({ tone: "success", message: "Sub category deleted." });
    if (editingId === sc.id) closeForm();
    loadSubCategories();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sub Categories"
        description="Group questions within each category. Students practice at the sub category level."
        action={{ label: showForm ? "Cancel" : "+ Create Sub Category", onClick: () => (showForm ? closeForm() : openCreate()) }}
      />

      {alert && <AdminAlert tone={alert.tone} message={alert.message} onDismiss={() => setAlert(null)} />}

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">{editingId ? "Edit Sub Category" : "New Sub Category"}</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Select
                  label="ACCA Paper *"
                  required
                  placeholder="Select paper…"
                  value={formPaperId}
                  onChange={(e) => { setFormPaperId(e.target.value); setForm({ ...form, categoryId: "" }); }}
                  options={papers.map((p) => ({ value: p.id, label: `${p.code} – ${p.title}` }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Select
                  label="Category *"
                  required
                  placeholder="Select category…"
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  disabled={!formPaperId}
                  options={formCategories.map((c) => ({ value: c.id, label: c.title }))}
                />
              </div>
              <Input label="Sub Category Title *" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input label="Display Order" type="number" min={0} value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} />
              <div className="sm:col-span-2">
                <Textarea
                  label="Description (optional)"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save Changes" : "Create Sub Category"}</Button>
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
            onChange={(e) => { setFilterPaperId(e.target.value); setFilterCategoryId(""); }}
            options={[{ value: "", label: "All papers" }, ...papers.map((p) => ({ value: p.id, label: `${p.code} – ${p.title}` }))]}
          />
        </div>
        <div className="w-full sm:max-w-xs">
          <Select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            disabled={!filterPaperId}
            options={[{ value: "", label: "All categories" }, ...filterCategories.map((c) => ({ value: c.id, label: c.title }))]}
          />
        </div>
        <div className="flex-1 sm:max-w-md">
          <Input placeholder="Search sub categories…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <PageLoading message="Loading sub categories…" />
          ) : subCategories.length === 0 ? (
            <EmptyState icon="subcategories" title="No sub categories yet" description="Create sub categories under a category, then add questions from the Questions page." />
          ) : (
            <Table>
              <TableHead>
                <TableHeader>Sub Category</TableHeader>
                <TableHeader>Category</TableHeader>
                <TableHeader>Paper</TableHeader>
                <TableHeader>Questions</TableHeader>
                <TableHeader>Order</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader className="text-right">Actions</TableHeader>
              </TableHead>
              <TableBody>
                {subCategories.map((sc) => (
                  <TableRow key={sc.id}>
                    <TableCell className="font-medium text-slate-800">{sc.title}</TableCell>
                    <TableCell>{sc.category.title}</TableCell>
                    <TableCell><span className="font-semibold text-brand-600">{sc.category.paper.code}</span></TableCell>
                    <TableCell>{sc._count.questions}</TableCell>
                    <TableCell>{sc.order}</TableCell>
                    <TableCell><Badge tone={sc.isActive ? "success" : "neutral"}>{sc.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(sc)}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleActive(sc)} disabled={togglingId === sc.id}>{togglingId === sc.id ? "…" : sc.isActive ? "Disable" : "Enable"}</Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(sc)} disabled={deletingId === sc.id}>{deletingId === sc.id ? "…" : "Delete"}</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {!loading && subCategories.length > 0 && (
        <p className="text-xs text-slate-400">{total} sub categor(ies) shown.</p>
      )}
    </div>
  );
}
