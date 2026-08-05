"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

type ClassRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  studentCount: number;
  passRate: number;
  totalAttempts: number;
};

export default function PartnerClassesPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/partner/classes");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load classes");
      setClasses(json.classes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createClass() {
    setBusy(true);
    try {
      const res = await fetch("/api/partner/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      setOpen(false);
      setName("");
      setDescription("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function archiveClass(id: string, status: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/partner/classes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status === "ACTIVE" ? "ARCHIVED" : "ACTIVE" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        description="Create classes and track cohort performance."
        action={{ label: "Create class", onClick: () => setOpen(true) }}
      />

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          description="Create a class to group students and track performance."
          actionLabel="Create class"
          onAction={() => setOpen(true)}
        />
      ) : (
        <Card>
          <CardBody className="overflow-x-auto p-0">
            <Table>
              <TableHead>
                <TableHeader>Class</TableHeader>
                <TableHeader>Students</TableHeader>
                <TableHeader>Attempts</TableHeader>
                <TableHeader>Pass rate</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader />
              </TableHead>
              <TableBody>
                {classes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-ink-900">{c.name}</p>
                        {c.description && (
                          <p className="text-xs text-slate-500 line-clamp-1">{c.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{c.studentCount}</TableCell>
                    <TableCell>{c.totalAttempts}</TableCell>
                    <TableCell>{c.passRate}%</TableCell>
                    <TableCell>
                      <Badge tone={c.status === "ACTIVE" ? "success" : "neutral"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/partner/classes/${c.id}`}>
                          <Button size="sm" variant="outline">
                            Open
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => void archiveClass(c.id, c.status)}
                        >
                          {c.status === "ACTIVE" ? "Archive" : "Restore"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create class">
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Description</span>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              disabled={busy || !name.trim()}
              onClick={() => void createClass()}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
