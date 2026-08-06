"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLoading } from "@/components/ui/PageLoading";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/format-price";

interface BillingSubscription {
  id: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  endsAt: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  canCancel: boolean;
  canResume: boolean;
}

interface BillingData {
  currentPlan: { name: string; billingInterval: string } | null;
  subscription: BillingSubscription | null;
  purchasedPapers: Array<{
    id: string;
    paper: { code: string; title: string } | null;
    purchasedAt: string;
    amountCents: number;
    currency: string;
  }>;
  purchasedMockExams: Array<{
    id: string;
    mockExam: { title: string } | null;
    purchasedAt: string;
    amountCents: number;
    currency: string;
  }>;
  payments: Array<{
    id: string;
    amountCents: number;
    currency: string;
    status: string;
    createdAt: string;
    description: string;
  }>;
}

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [resuming, setResuming] = useState(false);

  const loadBilling = useCallback(async () => {
    const res = await fetch("/api/billing/dashboard", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Could not load billing data.");
    setData(json);
    return json as BillingData;
  }, []);

  useEffect(() => {
    loadBilling()
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load billing data.");
      })
      .finally(() => setLoading(false));
  }, [loadBilling]);

  async function confirmCancel() {
    if (cancelling) return;
    setCancelling(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch("/api/billing/subscription/cancel", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not cancel subscription.");
      await loadBilling();
      setCancelModalOpen(false);
      setActionSuccess(
        json.message ??
          "Your subscription will cancel at the end of the billing period. You keep premium until then."
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not cancel subscription.");
    } finally {
      setCancelling(false);
    }
  }

  async function resumeSubscription() {
    if (resuming) return;
    setResuming(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch("/api/billing/subscription/resume", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not resume subscription.");
      await loadBilling();
      setActionSuccess(json.message ?? "Your subscription will renew as usual.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not resume subscription.");
    } finally {
      setResuming(false);
    }
  }

  if (loading) {
    return <PageLoading message="Loading billing…" />;
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <PageHeader title="Billing" description="Manage your subscription and view purchase history." />
        <Alert tone="error" title="Unable to load billing">
          {error ?? "Something went wrong. Please refresh the page."}
        </Alert>
      </div>
    );
  }

  const statusTone = (status: string) => {
    if (status === "ACTIVE" || status === "COMPLETED" || status === "TRIALING") return "success" as const;
    if (status === "PAST_DUE" || status === "FAILED") return "danger" as const;
    return "neutral" as const;
  };

  const sub = data.subscription;
  const isPremium = sub && (sub.status === "ACTIVE" || sub.status === "TRIALING");
  const cancelDate = formatDate(sub?.currentPeriodEnd ?? sub?.endsAt);
  const renewDate = formatDate(sub?.currentPeriodEnd);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Manage your subscription and view purchase history."
        action={{
          label: isPremium ? "Change plan" : "Upgrade plan",
          href: "/dashboard/pricing",
        }}
      />

      {actionSuccess && (
        <Alert tone="success" title="Subscription updated">
          {actionSuccess}
        </Alert>
      )}
      {actionError && (
        <Alert tone="error" title="Action failed">
          {actionError}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Current plan</h2>
          </CardHeader>
          <CardBody>
            <p className="text-xl font-bold text-ink-900">{data.currentPlan?.name ?? "Free"}</p>
            {isPremium && sub ? (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(sub.status)}>{sub.status}</Badge>
                  {sub.cancelAtPeriodEnd && (
                    <Badge tone="warning">Scheduled to cancel</Badge>
                  )}
                </div>
                {sub.cancelAtPeriodEnd ? (
                  <p className="text-sm text-slate-600">
                    Cancels on{" "}
                    <span className="font-medium text-ink-900">{cancelDate ?? "period end"}</span>
                    . You keep premium access until that date.
                  </p>
                ) : (
                  renewDate && (
                    <p className="text-sm text-slate-500">
                      Renews {renewDate}
                    </p>
                  )
                )}

                {sub.canCancel && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setActionError(null);
                      setCancelModalOpen(true);
                    }}
                  >
                    Cancel subscription
                  </Button>
                )}

                {sub.canResume && (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-slate-500">
                      Changed your mind? You can keep premium and renew as usual.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={resuming}
                      onClick={() => resumeSubscription()}
                    >
                      {resuming && <Spinner className="h-4 w-4" />}
                      Keep subscription
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <Badge tone="neutral">Free plan</Badge>
                <p className="text-sm text-slate-500">
                  You can subscribe to Premium any time from Pricing.
                </p>
              </div>
            )}
            <Link href="/dashboard/pricing" className="mt-4 inline-block">
              <Button variant="outline" size="sm">
                {isPremium ? "Change plan" : "Upgrade plan"}
              </Button>
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Purchases</h2>
          </CardHeader>
          <CardBody>
            <p className="text-2xl font-bold text-ink-900">
              {data.purchasedPapers.length + data.purchasedMockExams.length}
            </p>
            <p className="text-sm text-slate-500">Total one-time purchases</p>
          </CardBody>
        </Card>
      </div>

      {data.purchasedPapers.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Purchased papers</h2>
          </CardHeader>
          <CardBody className="divide-y divide-slate-100 p-0">
            {data.purchasedPapers.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-slate-800">
                    {p.paper?.code} — {p.paper?.title}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(p.purchasedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-sm font-medium text-slate-600">
                  {formatPrice(p.amountCents, p.currency)}
                </span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {data.purchasedMockExams.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Purchased mock exams</h2>
          </CardHeader>
          <CardBody className="divide-y divide-slate-100 p-0">
            {data.purchasedMockExams.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-slate-800">{p.mockExam?.title}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(p.purchasedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-sm font-medium text-slate-600">
                  {formatPrice(p.amountCents, p.currency)}
                </span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-ink-900">Payment history</h2>
        </CardHeader>
        <CardBody className="p-0">
          {data.payments.length === 0 ? (
            <div className="px-5 py-6">
              <EmptyState
                compact
                title="No payments yet"
                description="Your payment history will appear here after your first purchase."
                actionLabel="View pricing"
                actionHref="/dashboard/pricing"
              />
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableHeader>Date</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableHead>
              <TableBody>
                {data.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium text-slate-800">{p.description}</TableCell>
                    <TableCell>{formatPrice(p.amountCents, p.currency)}</TableCell>
                    <TableCell>
                      <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal
        open={cancelModalOpen}
        onClose={() => {
          if (!cancelling) setCancelModalOpen(false);
        }}
        title="Cancel subscription?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Your premium access will continue until{" "}
            <span className="font-medium text-ink-900">{cancelDate ?? "the end of your billing period"}</span>
            . You will not be charged again after that date. One-time paper and mock exam purchases
            are never removed.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              disabled={cancelling}
              onClick={() => setCancelModalOpen(false)}
            >
              Keep subscription
            </Button>
            <Button
              disabled={cancelling}
              onClick={() => confirmCancel()}
              className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
            >
              {cancelling && <Spinner className="h-4 w-4" />}
              Cancel subscription
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
