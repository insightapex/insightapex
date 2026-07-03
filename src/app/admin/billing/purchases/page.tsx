"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/format-price";

interface Purchase {
  id: string;
  type: string;
  status: string;
  amountCents: number | null;
  currency: string | null;
  createdAt: string;
  user: { name: string; email: string };
  product: { name: string; type: string } | null;
  paper: { code: string; title: string } | null;
  mockExam: { title: string } | null;
}

export default function AdminPurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    fetch("/api/admin/billing/purchases").then((r) => r.json()).then(setPurchases);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Purchases</h1>
        <p className="mt-1 text-sm text-slate-500">View all one-time purchase history.</p>
      </div>

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">User</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Item</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800">{p.user.name}</div>
                    <div className="text-xs text-slate-400">{p.user.email}</div>
                  </td>
                  <td className="px-5 py-3">
                    {p.paper ? `${p.paper.code} — ${p.paper.title}` : p.mockExam?.title ?? p.product?.name ?? p.type}
                  </td>
                  <td className="px-5 py-3">{formatPrice(p.amountCents ?? 0, p.currency ?? "GBP")}</td>
                  <td className="px-5 py-3">
                    <Badge tone={p.status === "COMPLETED" ? "success" : "neutral"}>{p.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
