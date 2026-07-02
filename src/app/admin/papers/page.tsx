"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Paper {
  id: string; code: string; title: string; description: string | null;
  accessLevel: string; isActive: boolean; order: number;
  _count: { topics: number; attempts: number };
}

export default function AdminPapersPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", title: "", description: "", order: "0" });
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/admin/papers").then((r) => r.json()).then(setPapers);
  }
  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/papers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, order: parseInt(form.order) }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ code: "", title: "", description: "", order: "0" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Papers</h1>
          <p className="mt-1 text-sm text-slate-500">Manage ACCA papers available on the platform.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add Paper"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><h2 className="text-base font-semibold text-ink-900">New Paper</h2></CardHeader>
          <CardBody>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <Input label="Code (e.g. PM)" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <div className="sm:col-span-2">
                <Input label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <Input label="Order" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
              <div className="flex items-end">
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create Paper"}</Button>
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
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Topics</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Attempts</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Access</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {papers.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-bold text-brand-600">{p.code}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{p.title}</td>
                  <td className="px-5 py-3 text-slate-500">{p._count.topics}</td>
                  <td className="px-5 py-3 text-slate-500">{p._count.attempts}</td>
                  <td className="px-5 py-3">
                    <Badge tone={p.accessLevel === "FREE" ? "success" : "brand"}>{p.accessLevel}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={p.isActive ? "success" : "neutral"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
