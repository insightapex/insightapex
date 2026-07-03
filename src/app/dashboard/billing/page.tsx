"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
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

  useEffect(() => {
    fetch("/api/billing/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-500">
        <Spinner className="h-5 w-5 text-brand-600" />
        Loading billing…
      </div>
    );
  }

  if (!data) return null;

  const statusTone = (status: string) => {
    if (status === "ACTIVE" || status === "COMPLETED") return "success" as const;
    if (status === "PAST_DUE" || status === "FAILED") return "danger" as const;
    return "neutral" as const;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Billing</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your subscription and view purchase history.</p>
        </div>
        <Link href="/dashboard/pricing">
          <Button variant="outline">Upgrade plan</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink-900">Current plan</h2>
          </CardHeader>
          <CardBody>
            <p className="text-xl font-bold text-ink-900">{data.currentPlan?.name ?? "Free"}</p>
            {data.subscription && (
              <div className="mt-3 space-y-2">
                <Badge tone={statusTone(data.subscription.status)}>{data.subscription.status}</Badge>
                {data.subscription.currentPeriodEnd && (
                  <p className="text-sm text-slate-500">
                    Renews {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
            <Button variant="ghost" className="mt-4" disabled title="Coming soon">
              Manage subscription
            </Button>
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
            <p className="px-5 py-8 text-center text-sm text-slate-500">No payments yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Description</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3 text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{p.description}</td>
                    <td className="px-5 py-3 text-slate-600">{formatPrice(p.amountCents, p.currency)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
