import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/dashboard/EmptyState";

export default function MockExamsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Mock Exams</h1>
        <p className="mt-1 text-sm text-slate-500">
          Full-length timed exams to simulate real ACCA test conditions.
        </p>
      </div>

      <Card>
        <CardBody>
          <EmptyState
            icon="📝"
            title="Mock exams coming soon"
            description="Timed full-paper mock exams are on the way. For now, use Practice to work through topics and build your skills."
            actionLabel="Go to Practice"
            actionHref="/dashboard/quiz"
          />
        </CardBody>
      </Card>
    </div>
  );
}
