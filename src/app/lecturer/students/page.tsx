"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LecturerPaperSelectors } from "@/components/lecturer/LecturerPaperSelectors";
import { useLecturerScope } from "@/components/lecturer/LecturerScope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";

type StudentRow = {
  id: string;
  name: string;
  email: string;
  classes: Array<{ id: string; name: string }>;
  attemptCount: number;
  averageScore: number | null;
  lastActive: string | null;
};

export default function LecturerStudentsPage() {
  const { paperId, loading: scopeLoading } = useLecturerScope();
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (paperId) params.set("paperId", paperId);
        const res = await fetch(`/api/lecturer/students?${params}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load students");
        if (!cancelled) setStudents(json.students ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search, paperId]);

  if (scopeLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Students"
        description="Students in your assigned classes only"
      />
      <LecturerPaperSelectors />

      <div className="max-w-md">
        <Input
          label="Search"
          placeholder="Name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          title="No students found"
          description="Students appear here once they are enrolled in your assigned classes."
        />
      ) : (
        <Card>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Classes</th>
                  <th className="px-5 py-3 text-right">Attempts</th>
                  <th className="px-5 py-3 text-right">Avg Score</th>
                  <th className="px-5 py-3">Last Active</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.email}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {s.classes.map((c) => c.name).join(", ") || "—"}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{s.attemptCount}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {s.averageScore != null ? `${s.averageScore}%` : "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {s.lastActive
                        ? new Date(s.lastActive).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/lecturer/students/${s.id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
