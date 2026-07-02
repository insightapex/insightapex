import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/admin/EmptyState";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Portal configuration and preferences.</p>
      </div>
      <Card>
        <CardBody>
          <EmptyState
            icon="⚙"
            title="Settings panel coming soon"
            description="Account preferences, notification settings, and platform configuration will be available here in a future update."
          />
        </CardBody>
      </Card>
    </div>
  );
}
