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

interface ContentAdmin {
  id: string;
  name: string;
  email: string;
  emailVerified: string | null;
  createdAt: string;
}

const emptyForm = { name: "", email: "", password: "" };

export default function AdminContentAdminsPage() {
  const [admins, setAdmins] = useState<ContentAdmin[]>([]);
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
      const res = await fetch(`/api/admin/content-admins${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load content admins");
      setAdmins(data.admins ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setAdmins([]);
      setError(e instanceof Error ? e.message : "Failed to load content admins");
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
      const res = await fetch("/api/admin/content-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create content admin");
      setShowForm(false);
      setForm(emptyForm);
      setAlert(`Created content admin “${data.name}”.`);
      await load();
    } catch (err) {
      setAlert(err instanceof Error ? err.message : "Could not create content admin");
    } finally {
      setSaving(false);
    }
  }

  async function removeAdmin(admin: ContentAdmin) {
    if (!window.confirm(`Remove content admin access for ${admin.email}?`)) return;
    const res = await fetch(`/api/admin/content-admins/${admin.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setAlert(data.error ?? "Could not remove content admin");
      return;
    }
    setAlert(`Removed content admin access for ${admin.email}.`);
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Admins"
        description={`${total} content admin${total === 1 ? "" : "s"} · question & mock exam editors`}
        action={{ label: "Add content admin", onClick: () => setShowForm(true) }}
      />

      {alert && (
        <Alert tone={alert.startsWith("Created") || alert.startsWith("Removed") ? "success" : "error"}>
          {alert}
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      <div className="max-w-sm">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Content admin list
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <PageLoading message="Loading content admins…" className="h-40" />
          ) : admins.length === 0 ? (
            <div className="p-6">
              <EmptyState
                compact
                title="No content admins yet"
                description="Create an account that can manage practice questions and mock exams."
                actionLabel="Add content admin"
                onAction={() => setShowForm(true)}
              />
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Email</TableHeader>
                  <TableHeader>Verified</TableHeader>
                  <TableHeader>Joined</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {admins.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-slate-800">{a.name}</TableCell>
                    <TableCell className="text-slate-500">{a.email}</TableCell>
                    <TableCell>
                      <Badge tone={a.emailVerified ? "success" : "warning"}>
                        {a.emailVerified ? "Verified" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" className="text-xs" onClick={() => removeAdmin(a)}>
                        Remove access
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal
        open={showForm}
        onClose={() => !saving && setShowForm(false)}
        title="Add content admin"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
