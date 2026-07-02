"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

interface Student {
  id: string; name: string; email: string;
  emailVerified: string | null; createdAt: string;
  _count: { attempts: number };
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = search ? `&q=${encodeURIComponent(search)}` : "";
    fetch(`/api/admin/students?${q}`)
      .then((r) => r.json())
      .then((d) => { setStudents(d.students ?? []); setTotal(d.total ?? 0); setLoading(false); });
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Students</h1>
          <p className="mt-1 text-sm text-slate-500">{total} registered students</p>
        </div>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Student List
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-400">Loading…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Verified</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Attempts</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-5 py-3 text-slate-500">{s.email}</td>
                    <td className="px-5 py-3">
                      <Badge tone={s.emailVerified ? "success" : "warning"}>
                        {s.emailVerified ? "Verified" : "Pending"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{s._count.attempts}</td>
                    <td className="px-5 py-3 text-slate-400">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">No students found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
