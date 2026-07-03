import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function BillingCancelledPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl">↩</div>
      <h1 className="mt-6 text-2xl font-bold text-ink-900">Checkout cancelled</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        No payment was taken. You can return to pricing whenever you are ready.
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
  );
}
