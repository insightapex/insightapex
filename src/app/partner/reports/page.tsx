"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";

type Overview = {
  totalStudents: number;
  activeStudents: number;
  premiumStudents: number;
  totalQuizAttempts: number;
  passRate: number;
  weakestPapers: Array<{ code: string; title: string; passRate: number; attempts: number }>;
  strongestPapers: Array<{ code: string; title: string; passRate: number; attempts: number }>;
};

export default function PartnerReportsPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/partner/reports");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load report");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function downloadCsv() {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Total registration students", String(data.totalStudents)],
      ["Active students (30d)", String(data.activeStudents)],
      ["Paid students", String(data.premiumStudents)],
      ["Total quiz attempts", String(data.totalQuizAttempts)],
      ["Pass rate %", String(data.passRate)],
      [],
      ["Weakest papers"],
      ["Code", "Title", "Pass rate", "Attempts"],
      ...data.weakestPapers.map((p) => [p.code, p.title, String(p.passRate), String(p.attempts)]),
      [],
      ["Strongest papers"],
      ["Code", "Title", "Pass rate", "Attempts"],
      ...data.strongestPapers.map((p) => [p.code, p.title, String(p.passRate), String(p.attempts)]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `partner-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!data) return <EmptyState title="No report data" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Export a snapshot of your organisation’s learning metrics."
        action={{ label: "Download CSV", onClick: downloadCsv }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Summary</h2>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <p className="flex justify-between">
              <span className="text-slate-500">Total registration students</span>
              <span className="font-semibold">{data.totalStudents}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-slate-500">Active (30d)</span>
              <span className="font-semibold">{data.activeStudents}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-slate-500">Paid students</span>
              <span className="font-semibold">{data.premiumStudents}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-slate-500">Quiz attempts</span>
              <span className="font-semibold">{data.totalQuizAttempts}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-slate-500">Pass rate</span>
              <span className="font-semibold">{data.passRate}%</span>
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Export</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-slate-500">
              Download a CSV of summary KPIs plus weakest and strongest papers for offline sharing.
            </p>
            <Button variant="gradient" onClick={downloadCsv}>
              Download CSV
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
