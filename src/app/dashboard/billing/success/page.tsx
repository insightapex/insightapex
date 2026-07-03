import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function BillingSuccessPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">✓</div>
      <h1 className="mt-6 text-2xl font-bold text-ink-900">Payment successful</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Thank you for your purchase. Your access has been updated and should be available immediately.
      </p>
      <Card className="mt-8 w-full max-w-md">
        <CardBody className="space-y-3">
          <Link href="/dashboard/billing">
            <Button className="w-full">View billing dashboard</Button>
          </Link>
          <Link href="/dashboard/quiz">
            <Button variant="outline" className="w-full">Start practising</Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
