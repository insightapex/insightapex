"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageLoading } from "@/components/ui/PageLoading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/Table";

interface PartnerRow {
  id: string;
  name: string;
  slug: string;
  contactEmail: string | null;
  status: string;
  commissionRatePercent: number;
  allowPublicRegistration: boolean;
  studentCount: number;
  memberCount: number;
  classCount: number;
  admins: { id: string; name: string; email: string }[];
  createdAt: string;
}

const emptyForm = {
  name: "",
  slug: "",
  contactEmail: "",
  commissionRatePercent: "30",
  allowPublicRegistration: true,
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);

  async function load(q = search) {
    setLoading(true);
    setError(null);
    try {
      const query = q ? `?q=${encodeURIComponent(q)}` : "";
      const res = await fetch(`/api/admin/partners${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load partners");
      setPartners(data.partners ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setPartners([]);
      setError(e instanceof Error ? e.message : "Failed to load partners");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => load(search), 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAlert(null);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug || undefined,
          contactEmail: form.contactEmail || undefined,
          commissionRatePercent: Number(form.commissionRatePercent) || 30,
          allowPublicRegistration: form.allowPublicRegistration,
          adminName: form.adminName || undefined,
          adminEmail: form.adminEmail || undefined,
          adminPassword: form.adminPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create partner");
      setShowForm(false);
      setForm(emptyForm);
      setAlert(`Created partner “${data.name}”.`);
      await load();
    } catch (err) {
      setAlert(err instanceof Error ? err.message : "Could not create partner");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(partner: PartnerRow) {
    const next = partner.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const res = await fetch(`/api/admin/partners/${partner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAlert(data.error ?? "Could not update status");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partners"
        description={`${total} partner school${total === 1 ? "" : "s"}`}
        action={{ label: "Add partner", onClick: () => setShowForm(true) }}
      />

      {alert && <Alert tone={alert.startsWith("Created") ? "success" : "error"}>{alert}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <div className="max-w-sm">
        <Input
          placeholder="Search by name, slug, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Partner list
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <PageLoading message="Loading partners…" className="h-40" />
          ) : partners.length === 0 ? (
            <div className="p-6">
              <EmptyState
                compact
                title="No partners yet"
                description="Create a partner school to enable partner portal access."
                actionLabel="Add partner"
                onAction={() => setShowForm(true)}
              />
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Students</TableHeader>
                  <TableHeader>Commission</TableHeader>
                  <TableHeader>Public signup</TableHeader>
                  <TableHeader>Admins</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {partners.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-400">/{p.slug}</p>
                    </TableCell>
                    <TableCell>
                      <Badge tone={p.status === "ACTIVE" ? "success" : "warning"}>{p.status}</Badge>
                    </TableCell>
                    <TableCell>{p.studentCount}</TableCell>
                    <TableCell>{p.commissionRatePercent}%</TableCell>
                    <TableCell>
                      <Badge tone={p.allowPublicRegistration ? "brand" : "neutral"}>
                        {p.allowPublicRegistration ? "Open" : "Closed"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-500">
                        {p.admins.length
                          ? p.admins.map((a) => a.email).join(", ")
                          : "None"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" className="text-xs" onClick={() => toggleStatus(p)}>
                        {p.status === "ACTIVE" ? "Suspend" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal open={showForm} onClose={() => !saving && setShowForm(false)} title="Add partner">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="School name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Slug (optional)"
            placeholder="auto-from-name"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <Input
            label="Contact email"
            type="email"
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
          />
          <Input
            label="Commission %"
            type="number"
            min={0}
            max={100}
            value={form.commissionRatePercent}
            onChange={(e) => setForm({ ...form, commissionRatePercent: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.allowPublicRegistration}
              onChange={(e) => setForm({ ...form, allowPublicRegistration: e.target.checked })}
            />
            Allow public registration (school selectable on signup)
          </label>

          <div className="border-t border-slate-100 pt-4">
            <p className="mb-3 text-sm font-medium text-slate-700">
              Partner admin account (optional)
            </p>
            <div className="space-y-3">
              <Input
                label="Admin name"
                value={form.adminName}
                onChange={(e) => setForm({ ...form, adminName: e.target.value })}
              />
              <Input
                label="Admin email"
                type="email"
                value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
              />
              <Input
                label="Admin password"
                type="password"
                value={form.adminPassword}
                onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create partner"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
