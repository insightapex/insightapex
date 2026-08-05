"use client";

import { LecturerPaperSelectors } from "@/components/lecturer/LecturerPaperSelectors";
import { useLecturerScope } from "@/components/lecturer/LecturerScope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";

export default function LecturerPapersPage() {
  const { parts, loading, error, schoolName, selectedPaper, selectedPart } = useLecturerScope();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error) return <Alert tone="error">{error}</Alert>;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Papers"
        description={`Assigned papers for ${schoolName || "your school"} — read-only`}
      />
      <LecturerPaperSelectors />

      {parts.length === 0 ? (
        <EmptyState
          title="No papers assigned"
          description="Your partner admin has not assigned any papers to you yet."
        />
      ) : (
        <div className="space-y-6">
          {parts.map((part) => (
            <Card key={part.id}>
              <CardBody>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {part.code} — {part.title}
                </h2>
                <ul className="mt-3 divide-y divide-slate-100">
                  {part.papers.map((paper) => (
                    <li
                      key={paper.id}
                      className={`flex items-center justify-between py-3 text-sm ${
                        selectedPaper?.id === paper.id ? "text-sky-800" : "text-slate-800"
                      }`}
                    >
                      <span className="font-medium">
                        {paper.code}{" "}
                        <span className="font-normal text-slate-500">{paper.title}</span>
                      </span>
                      {selectedPart?.id === part.id && selectedPaper?.id === paper.id && (
                        <span className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                          Selected
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
