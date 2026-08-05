"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { WeakSubCategoryItem } from "@/components/dashboard/WeakSubCategoryItem";
import type { DashboardSubCategoryDetail } from "@/types";

export function WeakAreasCard({
  subCategoryDetails,
  hasAttempts,
}: {
  subCategoryDetails: DashboardSubCategoryDetail[];
  hasAttempts: boolean;
}) {
  const weak = subCategoryDetails
    .filter((s) => s.status === "Weak" || s.status === "Average")
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader>
        <h2 className="section-title">Weak areas</h2>
        <p className="section-subtitle">Focus here to raise your exam readiness</p>
      </CardHeader>
      <CardBody>
        {!hasAttempts || weak.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            {hasAttempts
              ? "No weak areas flagged for this paper — great work."
              : "Complete quizzes to see topics that need work."}
          </p>
        ) : (
          <ul className="space-y-3">
            {weak.map((sc) => (
              <WeakSubCategoryItem key={sc.id} subCategory={sc} />
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
