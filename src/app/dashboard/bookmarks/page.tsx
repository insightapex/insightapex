import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/dashboard/EmptyState";

export default function BookmarksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Bookmarks</h1>
        <p className="mt-1 text-sm text-slate-500">
          Save questions and topics to revisit later.
        </p>
      </div>

      <Card>
        <CardBody>
          <EmptyState
            icon="🔖"
            title="No bookmarks yet"
            description="When you flag questions during practice, they'll appear here for quick review."
            actionLabel="Start Practice"
            actionHref="/dashboard/quiz"
          />
        </CardBody>
      </Card>
    </div>
  );
}
