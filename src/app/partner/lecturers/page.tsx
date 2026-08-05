"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

type Lecturer = {
  id: string;
  name: string;
  email: string;
  papers: Array<{ id: string; code: string; title: string }>;
  classes: Array<{ id: string; name: string }>;
};

type PaperOpt = { id: string; code: string; title: string };
type ClassOpt = { id: string; name: string };

const emptyForm = {
  name: "",
  email: "",
  password: "",
  paperIds: [] as string[],
  classIds: [] as string[],
};

export default function PartnerLecturersPage() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [papers, setPapers] = useState<PaperOpt[]>([]);
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPaperIds, setEditPaperIds] = useState<string[]>([]);
  const [editClassIds, setEditClassIds] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [lRes, optRes] = await Promise.all([
        fetch("/api/partner/lecturers"),
        fetch("/api/partner/assignment-options"),
      ]);
      const lJson = await lRes.json();
      const optJson = await optRes.json();
      if (!lRes.ok) throw new Error(lJson.error ?? "Failed to load lecturers");

      setLecturers(lJson.lecturers ?? []);
      setPapers(
        (optJson.papers ?? []).map((p: PaperOpt) => ({
          id: p.id,
          code: p.code,
          title: p.title,
        }))
      );
      setClasses(
        (optJson.classes ?? []).map((c: ClassOpt) => ({
          id: c.id,
          name: c.name,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (form.paperIds.length === 0) {
      setError("Assign at least one paper — lecturers can only teach what you assign.");
      return;
    }
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/partner/lecturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create lecturer");
      setForm(emptyForm);
      setMessage("Lecturer created with school-assigned papers.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(l: Lecturer) {
    setEditingId(l.id);
    setEditPaperIds(l.papers.map((p) => p.id));
    setEditClassIds(l.classes.map((c) => c.id));
    setMessage(null);
    setError(null);
  }

  async function saveAssignments(id: string) {
    if (editPaperIds.length === 0) {
      setError("Keep at least one paper assigned.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner/lecturers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperIds: editPaperIds, classIds: editClassIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update assignments");
      setEditingId(null);
      setMessage("Teaching assignments updated. The lecturer cannot change these.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this lecturer from your school?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/partner/lecturers/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to remove");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Lecturers"
        description="Create lecturer accounts and assign the parts/papers they teach. Lecturers cannot choose papers themselves — if you assign more than one, they can switch between those assigned papers only."
      />

      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Create lecturer</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={create} className="space-y-4">
              <Input
                label="Full name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label="Temporary password"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />

              <div>
                <p className="mb-1 text-sm font-medium text-slate-700">
                  Assign papers <span className="text-red-500">*</span>
                </p>
                <p className="mb-2 text-xs text-slate-500">
                  Required. This is what the lecturer is allowed to teach and see.
                </p>
                {papers.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                    No papers available to assign.
                  </p>
                ) : (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-3">
                    {papers.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.paperIds.includes(p.id)}
                          onChange={() =>
                            setForm({ ...form, paperIds: toggle(form.paperIds, p.id) })
                          }
                        />
                        {p.code} — {p.title}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {classes.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">Assign classes</p>
                  <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-3">
                    {classes.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.classIds.includes(c.id)}
                          onChange={() =>
                            setForm({ ...form, classIds: toggle(form.classIds, c.id) })
                          }
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <Button type="submit" variant="success" disabled={busy || papers.length === 0}>
                {busy ? "Creating…" : "Create lecturer"}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Your lecturers</h2>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : lecturers.length === 0 ? (
              <EmptyState
                title="No lecturers yet"
                description="Create a lecturer and assign the papers they teach."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {lecturers.map((l) => (
                  <li key={l.id} className="space-y-3 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{l.name}</p>
                        <p className="text-xs text-slate-500">{l.email}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          Papers: {l.papers.map((p) => p.code).join(", ") || "—"}
                        </p>
                        <p className="text-xs text-slate-600">
                          Classes: {l.classes.map((c) => c.name).join(", ") || "—"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => startEdit(l)}
                        >
                          Edit teaching
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void remove(l.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>

                    {editingId === l.id && (
                      <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3 space-y-3">
                        <p className="text-xs font-medium text-sky-900">
                          Update assigned papers & classes
                        </p>
                        <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-white bg-white p-2">
                          {papers.map((p) => (
                            <label key={p.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editPaperIds.includes(p.id)}
                                onChange={() => setEditPaperIds(toggle(editPaperIds, p.id))}
                              />
                              {p.code} — {p.title}
                            </label>
                          ))}
                        </div>
                        {classes.length > 0 && (
                          <div className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-white bg-white p-2">
                            {classes.map((c) => (
                              <label key={c.id} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={editClassIds.includes(c.id)}
                                  onChange={() => setEditClassIds(toggle(editClassIds, c.id))}
                                />
                                {c.name}
                              </label>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="success"
                            disabled={busy}
                            onClick={() => void saveAssignments(l.id)}
                          >
                            Save assignments
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
