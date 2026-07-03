"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface Subscription {
  id: string;
  status: string;
  accessType: string;
  currentPeriodEnd: string | null;
  createdAt: string;
  user: { name: string; email: string };
  plan: { name: string; billingInterval: string } | null;
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    fetch("/api/admin/billing/subscriptions").then((r) => r.json()).then(setSubscriptions);
  }, []);

  const statusTone = (status: string) => {
    if (status === "ACTIVE" || status === "TRIALING") return "success" as const;
    if (status === "PAST_DUE") return "warning" as const;
    if (status === "CANCELED") return "neutral" as const;
    return "neutral" as const;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Subscriptions</h1>
        <p className="mt-1 text-sm text-slate-500">View all user subscriptions.</p>
      </div>

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">User</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Period End</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800">{s.user.name}</div>
                    <div className="text-xs text-slate-400">{s.user.email}</div>
                  </td>
                  <td className="px-5 py-3">{s.plan?.name ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
