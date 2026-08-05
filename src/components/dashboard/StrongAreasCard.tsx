"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { WeakSubCategoryItem } from "@/components/dashboard/WeakSubCategoryItem";
import type { DashboardSubCategoryDetail } from "@/types";

export function StrongAreasCard({
  subCategoryDetails,
  hasAttempts,
}: {
  subCategoryDetails: DashboardSubCategoryDetail[];
  hasAttempts: boolean;
}) {
  const strong = subCategoryDetails
    .filter((s) => s.status === "Strong")
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader>
        <h2 className="section-title">Strong areas</h2>
        <p className="section-subtitle">Sub categories where you score 80%+</p>
      </CardHeader>
      <CardBody>
        {!hasAttempts || strong.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            {hasAttempts
              ? "Keep practicing to unlock strong areas."
              : "Complete quizzes to see your strengths."}
          </p>
        ) : (
          <ul className="space-y-3">
            {strong.map((sc) => (
              <WeakSubCategoryItem key={sc.id} subCategory={sc} />
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
