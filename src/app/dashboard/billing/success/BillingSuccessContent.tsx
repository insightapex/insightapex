"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/PageHeader";

type ConfirmStatus = "loading" | "fulfilled" | "pending" | "error";

export default function BillingSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<ConfirmStatus>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setMessage("Missing checkout session. Please check your billing dashboard.");
      return;
    }

    let cancelled = false;

    async function confirm(attempt = 0) {
      const res = await fetch("/api/billing/confirm-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();

      if (cancelled) return;

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Could not confirm your payment.");
        return;
      }

      if (data.status === "fulfilled") {
        setStatus("fulfilled");
        setMessage(data.message ?? "Your access has been updated.");
        return;
      }

      if (attempt < 3) {
        setStatus("loading");
        setMessage("Confirming your payment…");
        window.setTimeout(() => confirm(attempt + 1), 2000);
        return;
      }

      setStatus("pending");
      setMessage(
        data.message ??
          "Payment successful. Your access may take a few seconds to update."
      );
    }

    confirm();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={status === "error" ? "Payment issue" : "Payment successful"}
        description={
          status === "loading"
            ? "Confirming your payment and updating your access…"
            : message || "Your transaction has been processed."
        }
      />
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${
            status === "error" ? "bg-red-50" : status === "pending" ? "bg-amber-50" : "bg-emerald-50"
          }`}
        >
          {status === "loading" ? (
            <Spinner className="h-8 w-8 text-brand-600" />
          ) : status === "error" ? (
            "!"
          ) : status === "pending" ? (
            "…"
          ) : (
            "✓"
          )}
        </div>
        {status === "error" && (
          <div className="mt-6 w-full max-w-md">
            <Alert tone="error">{message}</Alert>
          </div>
        )}
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
    </div>
  );
}
