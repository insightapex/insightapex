import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/admin/EmptyState";

export default function AdminTopicsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Topics</h1>
        <p className="mt-1 text-sm text-slate-500">Organize chapters within ACCA papers.</p>
      </div>
      <Card>
        <CardBody>
          <EmptyState
            icon="◈"
            title="Topic management coming soon"
            description="Topics are currently managed via database seeding. A full topic editor will be added in a future update. Use the Questions page to assign questions to existing topics."
            actionLabel="Go to Questions"
            actionHref="/admin/questions"
          />
        </CardBody>
      </Card>
    </div>
  );
}
