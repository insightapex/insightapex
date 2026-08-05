import { Suspense } from "react";
import BillingSuccessContent from "./BillingSuccessContent";
import { Spinner } from "@/components/ui/Spinner";

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-slate-500">
          <Spinner className="h-5 w-5 text-brand-600" />
          Loading payment confirmation…
        </div>
      }
    >
      <BillingSuccessContent />
    </Suspense>
  );
}
