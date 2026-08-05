"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { PartnerTierCard } from "@/components/partner/dashboard/PartnerTierCard";
import { GrowthChart } from "@/components/partner/dashboard/GrowthChart";
import { CommissionChart } from "@/components/partner/dashboard/CommissionChart";
import { SourcesCard, type SourceRow } from "@/components/partner/dashboard/SourcesCard";
import { formatCurrencyCents } from "@/lib/utils";
import type { ResolvedTier } from "@/lib/partner-tiers";

type Overview = {
  partner: { id: string; name: string };
  currency: string;
  commissionRatePercent: number;
  kpis: {
    totalEarningsCents: number;
    currentMonthRevenueCents: number;
    pendingCommissionCents: number;
    totalStudents: number;
    premiumStudents: number;
    conversionRate: number;
    newSignupsThisMonth: number;
  };
  tier: ResolvedTier;
  sources: SourceRow[];
};

export default function PartnerDashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/partner/overview");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load dashboard");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <Alert tone="error">{error}</Alert>;
  }

  if (!data) {
    return <EmptyState icon="dashboard" title="No data" description="Dashboard data is unavailable." />;
  }

  const { kpis, currency } = data;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Live performance for ${data.partner.name} · ${data.commissionRatePercent}% commission`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="Total Earnings"
          value={formatCurrencyCents(kpis.totalEarningsCents, currency)}
          tone="success"
          icon="earnings"
        />
        <AdminStatCard
          label="Current Month Revenue"
          value={formatCurrencyCents(kpis.currentMonthRevenueCents, currency)}
          tone="success"
          icon="trend"
        />
        <AdminStatCard
          label="Pending Commission"
          value={formatCurrencyCents(kpis.pendingCommissionCents, currency)}
          tone="warning"
          icon="billing"
        />
        <AdminStatCard
          label="New Signups"
          value={String(kpis.newSignupsThisMonth)}
          sub="Joined this month"
          tone="accent"
          icon="plus"
        />
        <AdminStatCard
          label="Total Registration Students"
          value={String(kpis.totalStudents)}
          tone="success"
          icon="students"
        />
        <AdminStatCard
          label="Paid Students"
          value={String(kpis.premiumStudents)}
          tone="success"
          icon="star"
        />
        <AdminStatCard
          label="Conversion Rate"
          value={`${kpis.conversionRate}%`}
          tone="success"
          icon="percent"
        />
        <PartnerTierCard tier={data.tier} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GrowthChart />
        <CommissionChart currency={currency} />
      </div>

      <SourcesCard sources={data.sources} />

      <div className="flex flex-wrap gap-3">
        <Link href="/partner/students" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
          Manage students →
        </Link>
        <Link href="/partner/analytics" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
          View analytics →
        </Link>
      </div>
    </div>
  );
}
