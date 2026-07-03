"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { AdminAlert } from "@/components/admin/AdminAlert";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  accessType: string;
  priceCents: number;
  currency: string;
  billingInterval: string;
  features: string[];
  isActive: boolean;
  providerProductId: string | null;
  providerPriceId: string | null;
  _count: { subscriptions: number };
}

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  accessType: "MONTHLY_SUBSCRIPTION",
  priceCents: "999",
  billingInterval: "MONTHLY",
  features: "",
  providerProductId: "",
  providerPriceId: "",
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    priceCents: "",
    providerProductId: "",
    providerPriceId: "",
    isActive: true,
  });
  const [form, setForm] = useState(emptyForm);
  const [editError, setEditError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function load() {
    const res = await fetch("/api/admin/billing/plans");
    const data = await res.json();
    if (!res.ok) {
      setAlert({ tone: "error", message: data.error ?? "Failed to load plans." });
      return;
    }
    setPlans(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load();
  }, []);

  function openEdit(plan: Plan) {
    setEditingPlan(plan);
    setEditError(null);
    setEditForm({
      name: plan.name,
      priceCents: String(plan.priceCents),
      providerProductId: plan.providerProductId ?? "",
      providerPriceId: plan.providerPriceId ?? "",
      isActive: plan.isActive,
    });
  }

  function closeEdit() {
    setEditingPlan(null);
    setEditError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/billing/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        priceCents: parseInt(form.priceCents, 10),
        features: form.features.split("\n").map((f) => f.trim()).filter(Boolean),
        providerProductId: form.providerProductId || null,
        providerPriceId: form.providerPriceId || null,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setAlert({ tone: "error", message: data.error ?? "Failed to create plan." });
      return;
    }

    setAlert({ tone: "success", message: "Plan created." });
    setShowForm(false);
    load();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPlan) return;

    const priceCents = parseInt(editForm.priceCents, 10);
    if (Number.isNaN(priceCents)) {
      setEditError("Price must be a valid number.");
      return;
    }

    setSaving(true);
    setEditError(null);

    const res = await fetch(`/api/admin/billing/plans/${editingPlan.id}`, {
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
      setEditError(data.error ?? "Failed to save plan.");
      return;
    }

    setPlans((prev) =>
      prev.map((p) =>
        p.id === data.id
          ? { ...p, ...data, _count: data._count ?? p._count }
          : p
      )
    );
    setAlert({ tone: "success", message: "Plan updated successfully." });
    closeEdit();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Subscription Plans</h1>
          <p className="mt-1 text-sm text-slate-500">Manage subscription plans and Stripe IDs.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "+ Add Plan"}</Button>
      </div>

      {alert && (
        <AdminAlert tone={alert.tone} message={alert.message} onDismiss={() => setAlert(null)} />
      )}

      {showForm && (
        <Card>
          <CardHeader><h2 className="text-base font-semibold text-ink-900">New Plan</h2></CardHeader>
          <CardBody>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label="Slug" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              <div className="sm:col-span-2">
                <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <Input label="Price (pence)" type="number" required value={form.priceCents} onChange={(e) => setForm({ ...form, priceCents: e.target.value })} />
              <Input label="Stripe Product ID" value={form.providerProductId} onChange={(e) => setForm({ ...form, providerProductId: e.target.value })} placeholder="prod_..." />
              <Input label="Stripe Price ID" value={form.providerPriceId} onChange={(e) => setForm({ ...form, providerPriceId: e.target.value })} placeholder="price_..." />
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Features (one per line)</label>
                <textarea
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  rows={4}
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create Plan"}</Button>
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
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Plan Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stripe Product ID</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stripe Price ID</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-400">{p.slug}</div>
                  </td>
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

      <Modal open={editingPlan !== null} onClose={saving ? () => {} : closeEdit} title="Edit Plan">
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
