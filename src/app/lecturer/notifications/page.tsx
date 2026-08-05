"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

type ClassOption = { id: string; name: string; studentCount: number };
type StudentOption = { id: string; name: string; email: string };

export default function LecturerNotificationsPage() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [mode, setMode] = useState<"students" | "class">("students");
  const [classId, setClassId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [sendInApp, setSendInApp] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cRes, sRes] = await Promise.all([
          fetch("/api/lecturer/classes"),
          fetch("/api/lecturer/students"),
        ]);
        const cJson = await cRes.json();
        const sJson = await sRes.json();
        if (!cancelled) {
          setClasses(cJson.classes ?? []);
          setStudents(
            (sJson.students ?? []).map((s: StudentOption) => ({
              id: s.id,
              name: s.name,
              email: s.email,
            }))
          );
        }
      } catch {
        if (!cancelled) setError("Failed to load recipients");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleStudent(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/lecturer/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          classId: mode === "class" ? classId : undefined,
          studentIds: mode === "students" ? selectedIds : undefined,
          subject,
          message,
          sendEmail,
          sendInApp,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send");
      setResult(
        `Sent to ${json.recipientCount} student(s) · ${json.emailed} email(s) · ${json.notified} in-app`
      );
      setSubject("");
      setMessage("");
      setSelectedIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notifications"
        description="Email and in-app messages to your students (audited)"
      />

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900">Compose message</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={submit} className="space-y-4">
            <Select
              label="Recipients"
              value={mode}
              onChange={(e) => setMode(e.target.value as "students" | "class")}
              options={[
                { value: "students", label: "Selected students" },
                { value: "class", label: "Whole class" },
              ]}
            />

            {mode === "class" ? (
              <Select
                label="Class"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                placeholder="Select a class"
                options={classes.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.studentCount})`,
                }))}
              />
            ) : (
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                {students.length === 0 ? (
                  <p className="text-sm text-slate-500">No students in your classes.</p>
                ) : (
                  students.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(s.id)}
                        onChange={() => toggleStudent(s.id)}
                      />
                      <span className="font-medium text-slate-800">{s.name}</span>
                      <span className="text-slate-500">{s.email}</span>
                    </label>
                  ))
                )}
              </div>
            )}

            <Input
              label="Subject"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <Textarea
              label="Message"
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                Send email (Resend)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sendInApp}
                  onChange={(e) => setSendInApp(e.target.checked)}
                />
                In-app notification
              </label>
            </div>

            {error && <Alert tone="error">{error}</Alert>}
            {result && <Alert tone="success">{result}</Alert>}

            <Button type="submit" variant="primary" disabled={busy || (!sendEmail && !sendInApp)}>
              {busy ? "Sending…" : "Send"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
