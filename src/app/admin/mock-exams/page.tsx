import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/admin/EmptyState";

export default function AdminMockExamsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Mock Exams</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure timed practice sessions for students.
        </p>
      </div>
      <Card>
        <CardBody>
          <EmptyState
            icon="⏱"
            title="Mock exam builder coming soon"
            description="Students currently take timed quizzes from the Practice section. A dedicated mock exam configuration tool will let you set duration, question count, and paper scope."
            actionLabel="View Results"
            actionHref="/admin/results"
          />
        </CardBody>
      </Card>
    </div>
  );
}
