"use client";

import { useState } from "react";
import { LecturerPaperSelectors } from "@/components/lecturer/LecturerPaperSelectors";
import { useLecturerScope } from "@/components/lecturer/LecturerScope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

const REPORTS = [
  {
    type: "student-progress",
    title: "Student progress",
    description: "Attempts, average scores and last activity for your class students.",
  },
  {
    type: "paper-performance",
    title: "Paper performance",
    description: "Category and sub-category averages, status and below-pass counts.",
  },
  {
    type: "mock-participation",
    title: "Mock participation",
    description: "Who attempted each mock exam, scores, and who has not attempted.",
  },
  {
    type: "at-risk-students",
    title: "At-risk students",
    description: "Students flagged High Risk, At Risk or Monitor for the selected paper.",
  },
] as const;

export default function LecturerReportsPage() {
  const { paperId, selectedPaper, loading: scopeLoading } = useLecturerScope();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(type: string) {
    if (!paperId) return;
    setBusy(type);
    setError(null);
    try {
      const res = await fetch(
        `/api/lecturer/reports?type=${type}&paperId=${encodeURIComponent(paperId)}`
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        `${type}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

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
        title="Reports"
        description="Export CSV reports scoped to your school and assignments"
      />
      <LecturerPaperSelectors />

      {error && <Alert tone="error">{error}</Alert>}

      {!paperId ? (
        <EmptyState
          title="Select a paper"
          description="Choose an assigned paper to export reports."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {REPORTS.map((r) => (
            <Card key={r.type}>
              <CardHeader>
                <h2 className="text-base font-semibold text-slate-900">{r.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{r.description}</p>
              </CardHeader>
              <CardBody>
                <Button
                  variant="primary"
                  disabled={busy === r.type}
                  onClick={() => void download(r.type)}
                >
                  {busy === r.type
                    ? "Exporting…"
                    : `Download CSV (${selectedPaper?.code ?? "paper"})`}
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
