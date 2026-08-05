"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ScoreChart } from "@/components/dashboard/ScoreChart";

export function PerformanceTrendCard({
  scoreHistory,
}: {
  scoreHistory: { date: string; score: number; paper: string }[];
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <h2 className="section-title">Performance trend</h2>
        <p className="section-subtitle">Score history for this paper</p>
      </CardHeader>
      <CardBody>
        <ScoreChart data={scoreHistory} />
      </CardBody>
    </Card>
  );
}
