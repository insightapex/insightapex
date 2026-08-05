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

type StudentRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  attemptCount: number;
  isPremium: boolean;
  registrationSource: { id: string; name: string } | null;
  classes: Array<{ id: string; name: string }>;
};

type ClassOption = { id: string; name: string; status: string };

function formatJoined(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PartnerStudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState("");
  const [premium, setPremium] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteClassId, setInviteClassId] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (classId) params.set("classId", classId);
      if (premium) params.set("premium", premium);
      const [sRes, cRes] = await Promise.all([
        fetch(`/api/partner/students?${params}`),
        fetch("/api/partner/classes"),
      ]);
      const sJson = await sRes.json();
      const cJson = await cRes.json();
      if (!sRes.ok) throw new Error(sJson.error ?? "Failed to load students");
      if (!cRes.ok) throw new Error(cJson.error ?? "Failed to load classes");
      setStudents(sJson.students);
      setClasses(cJson.classes.filter((c: ClassOption) => c.status === "ACTIVE"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [q, classId, premium]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 200);
    return () => clearTimeout(t);
  }, [load]);

  async function sendInvite() {
    setInviteBusy(true);
    setInviteMsg(null);
    try {
      const res = await fetch("/api/partner/students/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          classId: inviteClassId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Invite failed");
      setInviteMsg("Invitation sent.");
      setInviteEmail("");
      setInviteClassId("");
    } catch (e) {
      setInviteMsg(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setInviteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Students who chose your school on signup appear here automatically, with their acquisition source."
        action={{ label: "Invite student", onClick: () => setInviteOpen(true) }}
      />

      <Card>
        <CardBody className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Search"
            placeholder="Name or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Class</span>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Access</span>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              value={premium}
              onChange={(e) => setPremium(e.target.value)}
            >
              <option value="">All</option>
              <option value="true">Paid</option>
              <option value="false">Free</option>
            </select>
          </label>
        </CardBody>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          icon="students"
          title="No students yet"
          description="Share your signup link from Settings, or invite by email. New students who select your school on /register will show up here."
          actionLabel="Open settings"
          actionHref="/partner/settings"
        />
      ) : (
        <Card>
          <CardBody className="overflow-x-auto p-0">
            <Table>
              <TableHead>
                <TableHeader>Student</TableHeader>
                <TableHeader>Joined</TableHeader>
                <TableHeader>Source</TableHeader>
                <TableHeader>Classes</TableHeader>
                <TableHeader>Attempts</TableHeader>
                <TableHeader>Access</TableHeader>
                <TableHeader />
              </TableHead>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-ink-900">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-slate-600">
                      {formatJoined(s.createdAt)}
                    </TableCell>
                    <TableCell>
                      {s.registrationSource ? (
                        <Badge tone="neutral">{s.registrationSource.name}</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {s.classes.length === 0 ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          s.classes.map((c) => (
                            <Badge key={c.id} tone="neutral">
                              {c.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{s.attemptCount}</TableCell>
                    <TableCell>
                      <Badge tone={s.isPremium ? "premium" : "neutral"}>
                        {s.isPremium ? "Paid" : "Free"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/partner/students/${s.id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite student">
        <div className="space-y-4">
          <Input
            label="Student email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="student@example.com"
          />
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">
              Assign to class (optional)
            </span>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              value={inviteClassId}
              onChange={(e) => setInviteClassId(e.target.value)}
            >
              <option value="">None</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {inviteMsg && (
            <Alert tone={inviteMsg.includes("sent") ? "success" : "error"}>{inviteMsg}</Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              disabled={inviteBusy || !inviteEmail}
              onClick={() => void sendInvite()}
            >
              {inviteBusy ? "Sending…" : "Send invitation"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
