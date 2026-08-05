import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export default function BookmarksPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookmarks"
        description="Save questions and sub categories to revisit later."
      />

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
