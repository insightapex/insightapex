"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export function StudyStreakCard({
  studyStreak,
  studyActivity,
  hasAttempts,
}: {
  studyStreak: number;
  studyActivity: { date: string; count: number }[];
  hasAttempts: boolean;
}) {
  const max = Math.max(1, ...studyActivity.map((d) => d.count));

  return (
    <Card className="h-full">
      <CardHeader>
        <h2 className="section-title">Study streak</h2>
        <p className="section-subtitle">
          {hasAttempts
            ? studyStreak > 0
              ? `${studyStreak}-day streak — keep it going`
              : "Practice today to start a streak"
            : "Submit a quiz to start tracking your streak"}
        </p>
      </CardHeader>
      <CardBody>
        <div className="mb-4 flex items-end gap-2">
          <span className="text-4xl font-bold tracking-tight text-ink-900">{studyStreak}</span>
          <span className="mb-1 text-sm text-slate-500">days</span>
        </div>
        {studyActivity.length === 0 ? (
          <p className="text-sm text-slate-400">No study activity yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {studyActivity.slice(-56).map((day) => {
              const intensity = day.count === 0 ? 0 : Math.max(0.2, day.count / max);
              return (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.count} quiz${day.count === 1 ? "" : "zes"}`}
                  className={cn(
                    "h-3 w-3 rounded-sm",
                    day.count === 0 ? "bg-slate-100" : "bg-emerald-500"
                  )}
                  style={day.count > 0 ? { opacity: intensity } : undefined}
                />
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
