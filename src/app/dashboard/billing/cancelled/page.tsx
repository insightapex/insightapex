import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export default function BillingCancelledPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Checkout cancelled" description="No payment was taken." />
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl">↩</div>
        <p className="mt-4 max-w-md text-sm text-slate-500">
          You can return to pricing whenever you are ready.
        </p>
        <Card className="mt-8 w-full max-w-md">
          <CardBody className="space-y-3">
            <Link href="/dashboard/pricing">
              <Button className="w-full">Back to pricing</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">Go to dashboard</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
