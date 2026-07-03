"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { AdminAlert } from "@/components/admin/AdminAlert";

interface Product {
  id: string;
  name: string;
  slug: string;
  type: string;
  priceCents: number | null;
  currency: string | null;
  isActive: boolean;
  providerProductId: string | null;
  providerPriceId: string | null;
  paper?: { code: string; title: string } | null;
  mockExam?: { title: string } | null;
  _count: { purchases: number };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    priceCents: "",
    providerProductId: "",
    providerPriceId: "",
    isActive: true,
  });
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    type: "PAPER",
    accessType: "ONE_TIME_PAPER",
    priceCents: "499",
    paperId: "",
    mockExamId: "",
    providerProductId: "",
    providerPriceId: "",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function load() {
    const res = await fetch("/api/admin/billing/products");
    const data = await res.json();
    if (!res.ok) {
      setAlert({ tone: "error", message: data.error ?? "Failed to load products." });
      return;
    }
    setProducts(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load();
  }, []);

  function openEdit(product: Product) {
    setEditingProduct(product);
    setEditError(null);
    setEditForm({
      name: product.name,
      priceCents: String(product.priceCents ?? 0),
      providerProductId: product.providerProductId ?? "",
      providerPriceId: product.providerPriceId ?? "",
      isActive: product.isActive,
    });
  }

  function closeEdit() {
    setEditingProduct(null);
    setEditError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/billing/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        priceCents: parseInt(form.priceCents, 10),
        accessType: form.type === "PAPER" ? "ONE_TIME_PAPER" : "ONE_TIME_MOCK_EXAM",
        paperId: form.type === "PAPER" ? form.paperId || null : null,
        mockExamId: form.type === "MOCK_EXAM" ? form.mockExamId || null : null,
        providerProductId: form.providerProductId || null,
        providerPriceId: form.providerPriceId || null,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setAlert({ tone: "error", message: data.error ?? "Failed to create product." });
      return;
    }

    setAlert({ tone: "success", message: "Product created." });
    setShowForm(false);
    load();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;

    const priceCents = parseInt(editForm.priceCents, 10);
    if (Number.isNaN(priceCents)) {
      setEditError("Price must be a valid number.");
      return;
    }

    setSaving(true);
    setEditError(null);

    const res = await fetch(`/api/admin/billing/products/${editingProduct.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        priceCents,
        providerProductId: editForm.providerProductId || null,
        providerPriceId: editForm.providerPriceId || null,
        isActive: editForm.isActive,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setEditError(data.error ?? "Failed to save product.");
      return;
    }

    setProducts((prev) =>
      prev.map((p) =>
        p.id === data.id
          ? { ...p, ...data, _count: data._count ?? p._count }
          : p
      )
    );
    setAlert({ tone: "success", message: "Product updated successfully." });
    closeEdit();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Products</h1>
          <p className="mt-1 text-sm text-slate-500">Manage one-time paper and mock exam products.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "+ Add Product"}</Button>
      </div>

      {alert && (
        <AdminAlert tone={alert.tone} message={alert.message} onDismiss={() => setAlert(null)} />
      )}

      {showForm && (
        <Card>
          <CardHeader><h2 className="text-base font-semibold text-ink-900">New Product</h2></CardHeader>
          <CardBody>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label="Slug" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="PAPER">Paper</option>
                  <option value="MOCK_EXAM">Mock Exam</option>
                </select>
              </div>
              <Input label="Price (pence)" type="number" required value={form.priceCents} onChange={(e) => setForm({ ...form, priceCents: e.target.value })} />
              {form.type === "PAPER" ? (
                <Input label="Paper ID" value={form.paperId} onChange={(e) => setForm({ ...form, paperId: e.target.value })} placeholder="cuid..." />
              ) : (
                <Input label="Mock Exam ID" value={form.mockExamId} onChange={(e) => setForm({ ...form, mockExamId: e.target.value })} placeholder="cuid..." />
              )}
              <Input label="Stripe Product ID" value={form.providerProductId} onChange={(e) => setForm({ ...form, providerProductId: e.target.value })} placeholder="prod_..." />
              <Input label="Stripe Price ID" value={form.providerPriceId} onChange={(e) => setForm({ ...form, providerPriceId: e.target.value })} placeholder="price_..." />
              <div className="flex items-end">
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create Product"}</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stripe Product ID</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stripe Price ID</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="px-5 py-3"><Badge tone="brand">{p.type}</Badge></td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.providerProductId ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.providerPriceId ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Badge tone={p.isActive ? "success" : "neutral"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Modal open={editingProduct !== null} onClose={saving ? () => {} : closeEdit} title="Edit Product">
        <form onSubmit={handleEdit} className="space-y-4">
          {editError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {editError}
            </div>
          )}
          <Input label="Name" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="Price (pence)" type="number" required value={editForm.priceCents} onChange={(e) => setEditForm({ ...editForm, priceCents: e.target.value })} />
          <Input label="Stripe Product ID" value={editForm.providerProductId} onChange={(e) => setEditForm({ ...editForm, providerProductId: e.target.value })} placeholder="prod_..." />
          <Input label="Stripe Price ID" value={editForm.providerPriceId} onChange={(e) => setEditForm({ ...editForm, providerPriceId: e.target.value })} placeholder="price_..." />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={editForm.isActive ? "active" : "inactive"}
              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === "active" })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeEdit} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
