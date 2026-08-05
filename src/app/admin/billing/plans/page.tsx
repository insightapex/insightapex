"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLoading } from "@/components/ui/PageLoading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/Table";
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
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    const res = await fetch("/api/admin/billing/plans");
    const data = await res.json();
    if (!res.ok) {
      setAlert({ tone: "error", message: data.error ?? "Failed to load plans." });
      setPlans([]);
      setLoading(false);
      return;
    }
    setPlans(Array.isArray(data) ? data : []);
    setLoading(false);
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
      <PageHeader
        title="Subscription Plans"
        description="Manage subscription plans and Stripe IDs."
        action={{ label: showForm ? "Cancel" : "+ Add Plan", onClick: () => setShowForm(!showForm) }}
      />

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
                <Textarea
                  label="Features (one per line)"
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
          {loading ? (
            <PageLoading message="Loading plans…" />
          ) : plans.length === 0 ? (
            <EmptyState icon="billing" title="No plans yet" description="Create a subscription plan to get started." />
          ) : (
            <Table>
              <TableHead>
                <TableHeader>Plan Name</TableHeader>
                <TableHeader>Stripe Product ID</TableHeader>
                <TableHeader>Stripe Price ID</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableHead>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.slug}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{p.providerProductId ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{p.providerPriceId ?? "—"}</TableCell>
                    <TableCell>
                      <Badge tone={p.isActive ? "success" : "neutral"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal open={editingPlan !== null} onClose={saving ? () => {} : closeEdit} title="Edit Plan">
        <form onSubmit={handleEdit} className="space-y-4">
          {editError && <Alert tone="error">{editError}</Alert>}
          <Input label="Name" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="Price (pence)" type="number" required value={editForm.priceCents} onChange={(e) => setEditForm({ ...editForm, priceCents: e.target.value })} />
          <Input label="Stripe Product ID" value={editForm.providerProductId} onChange={(e) => setEditForm({ ...editForm, providerProductId: e.target.value })} placeholder="prod_..." />
          <Input label="Stripe Price ID" value={editForm.providerPriceId} onChange={(e) => setEditForm({ ...editForm, providerPriceId: e.target.value })} placeholder="price_..." />
          <Select
            label="Status"
            value={editForm.isActive ? "active" : "inactive"}
            onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === "active" })}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeEdit} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
