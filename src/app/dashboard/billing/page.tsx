"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLoading } from "@/components/ui/PageLoading";
import { Alert } from "@/components/ui/Alert";
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/format-price";

interface BillingData {
  currentPlan: { name: string; billingInterval: string } | null;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    endsAt: string | null;
  } | null;
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

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/dashboard", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not load billing data.");
        setData(json);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load billing data.");
      })
      .finally(() => setLoading(false));
  }, []);

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
    if (status === "ACTIVE" || status === "COMPLETED") return "success" as const;
    if (status === "PAST_DUE" || status === "FAILED") return "danger" as const;
    return "neutral" as const;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Manage your subscription and view purchase history."
        action={{
          label:
            data.subscription?.status === "ACTIVE" || data.subscription?.status === "TRIALING"
              ? "Change plan"
              : "Upgrade plan",
          href: "/dashboard/pricing",
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Current plan</h2>
          </CardHeader>
          <CardBody>
            <p className="text-xl font-bold text-ink-900">{data.currentPlan?.name ?? "Free"}</p>
            {data.subscription?.status === "ACTIVE" || data.subscription?.status === "TRIALING" ? (
              <div className="mt-3 space-y-2">
                <Badge tone={statusTone(data.subscription.status)}>{data.subscription.status}</Badge>
                {data.subscription.currentPeriodEnd && (
                  <p className="text-sm text-slate-500">
                    Renews {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
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
                {data.subscription?.status === "ACTIVE" || data.subscription?.status === "TRIALING"
                  ? "Change plan"
                  : "Upgrade plan"}
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
    </div>
  );
}
