"use client";

import { useEffect, useState } from "react";
import { LecturerPaperSelectors } from "@/components/lecturer/LecturerPaperSelectors";
import { useLecturerScope } from "@/components/lecturer/LecturerScope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

type QuestionRow = {
  id: string;
  text: string;
  paperCode: string;
  category: string;
  subCategory: string;
  attemptCount: number;
  correctRate: number;
  wrongRate: number;
  mostSelectedWrongOption: string | null;
};

export default function LecturerQuestionsPage() {
  const { paperId, loading: scopeLoading } = useLecturerScope();
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const qs = paperId ? `?paperId=${paperId}` : "";
        const res = await fetch(`/api/lecturer/questions${qs}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load questions");
        if (!cancelled) setQuestions(json.questions ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paperId]);

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
        title="Questions"
        description="Read-only question performance for your assigned papers"
      />
      <LecturerPaperSelectors />

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          title="No questions"
          description="Practice questions for your assigned papers will appear here."
        />
      ) : (
        <Card>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Question</th>
                  <th className="px-5 py-3">Paper / Topic</th>
                  <th className="px-5 py-3 text-right">Attempts</th>
                  <th className="px-5 py-3 text-right">Correct</th>
                  <th className="px-5 py-3 text-right">Wrong</th>
                  <th className="px-5 py-3">Most wrong option</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {questions.map((q) => (
                  <tr key={q.id}>
                    <td className="max-w-sm px-5 py-3">
                      <p className="line-clamp-2 text-slate-800">{q.text}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      <p className="font-medium text-slate-800">{q.paperCode}</p>
                      <p className="text-xs">
                        {q.category} / {q.subCategory}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{q.attemptCount}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-emerald-700">
                      {q.correctRate}%
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-rose-600">
                      {q.wrongRate}%
                    </td>
                    <td className="max-w-xs px-5 py-3 text-slate-600">
                      <span className="line-clamp-2">{q.mostSelectedWrongOption ?? "—"}</span>
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
