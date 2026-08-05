import { prisma } from "@/lib/prisma";
import { resolvePartnerTier } from "@/lib/partner-tiers";
import {
  isPartnerDemoStaticDataEnabled,
  partnerDemoCommission,
  partnerDemoGrowth,
  partnerDemoOverview,
} from "@/lib/partner-demo-data";

/** Trend range presets used by growth + commission charts. */
export type PartnerTrendRange = "1m" | "3m" | "6m";

export function parseTrendRange(raw: string | null): PartnerTrendRange {
  if (raw === "1m" || raw === "3m" || raw === "6m") return raw;
  return "3m";
}

// ---------------------------------------------------------------------------
// Date bucketing (daily for the current month, monthly for longer ranges)
// ---------------------------------------------------------------------------

type Bucket = { key: string; label: string; start: Date; end: Date };

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

const MONTH_FMT = new Intl.DateTimeFormat("en", { month: "short" });
const DAY_FMT = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

export function buildBuckets(range: PartnerTrendRange, now = new Date()): Bucket[] {
  if (range === "1m") {
    const first = startOfMonth(now);
    const today = startOfDay(now);
    const buckets: Bucket[] = [];
    for (let day = first; day <= today; day = addDays(day, 1)) {
      const end = addDays(day, 1);
      buckets.push({ key: day.toISOString().slice(0, 10), label: DAY_FMT.format(day), start: day, end });
    }
    return buckets;
  }

  const months = range === "6m" ? 6 : 3;
  const buckets: Bucket[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = addMonths(startOfMonth(now), -i);
    const end = addMonths(start, 1);
    buckets.push({
      key: `${start.getFullYear()}-${start.getMonth() + 1}`,
      label: MONTH_FMT.format(start),
      start,
      end,
    });
  }
  return buckets;
}

function rangeStart(range: PartnerTrendRange, now = new Date()): Date {
  return buildBuckets(range, now)[0].start;
}

function bucketIndex(buckets: Bucket[], date: Date): number {
  for (let i = 0; i < buckets.length; i++) {
    if (date >= buckets[i].start && date < buckets[i].end) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Shared queries
// ---------------------------------------------------------------------------

async function partnerStudents(partnerId: string) {
  return prisma.user.findMany({
    where: { partnerId, role: "STUDENT" },
    select: {
      id: true,
      createdAt: true,
      registrationSourceId: true,
      registrationSource: { select: { id: true, name: true, slug: true } },
    },
  });
}

/** Bulk premium detection — mirrors hasGlobalPremiumAccess without N+1 queries. */
async function premiumStudentIdSet(studentIds: string[]): Promise<Set<string>> {
  if (studentIds.length === 0) return new Set();
  const now = new Date();
  const [subs, access] = await Promise.all([
    prisma.subscription.findMany({
      where: {
        userId: { in: studentIds },
        status: { in: ["ACTIVE", "TRIALING"] },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      select: { userId: true },
    }),
    prisma.userAccess.findMany({
      where: {
        userId: { in: studentIds },
        status: "ACTIVE",
        subscriptionId: { not: null },
        paperId: null,
        mockExamId: null,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      select: { userId: true },
    }),
  ]);
  const set = new Set<string>();
  subs.forEach((s) => set.add(s.userId));
  access.forEach((a) => set.add(a.userId));
  return set;
}

async function partnerCommissionRate(partnerId: string): Promise<number> {
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { commissionRate: true },
  });
  return partner?.commissionRate ?? 0;
}

// ---------------------------------------------------------------------------
// Overview (KPIs + tier + acquisition sources)
// ---------------------------------------------------------------------------

export async function getPartnerOverview(partnerId: string) {
  if (isPartnerDemoStaticDataEnabled()) {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: { name: true },
    });
    return partnerDemoOverview(partner?.name);
  }

  const now = new Date();
  const monthStart = startOfMonth(now);

  const [partner, students, payouts, settings] = await Promise.all([
    prisma.partner.findUnique({
      where: { id: partnerId },
      select: { id: true, name: true, commissionRate: true },
    }),
    partnerStudents(partnerId),
    prisma.partnerPayout.aggregate({
      where: { partnerId },
      _sum: { amountCents: true },
    }),
    prisma.platformSettings.findUnique({
      where: { id: "default" },
      select: { currency: true },
    }),
  ]);

  const commissionRate = partner?.commissionRate ?? 0;
  const studentIds = students.map((s) => s.id);

  const [premiumSet, activeSources, payments] = await Promise.all([
    premiumStudentIdSet(studentIds),
    prisma.registrationSource.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
    studentIds.length
      ? prisma.payment.findMany({
          where: { userId: { in: studentIds }, status: "COMPLETED" },
          select: { amountCents: true, createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  const totalStudents = students.length;
  const premiumStudents = premiumSet.size;
  const conversionRate =
    totalStudents > 0 ? Math.round((premiumStudents / totalStudents) * 1000) / 10 : 0;
  const newSignupsThisMonth = students.filter((s) => s.createdAt >= monthStart).length;

  const lifetimeRevenueCents = payments.reduce((sum, p) => sum + p.amountCents, 0);
  const monthRevenueCents = payments
    .filter((p) => p.createdAt >= monthStart)
    .reduce((sum, p) => sum + p.amountCents, 0);

  const totalEarningsCents = Math.round(lifetimeRevenueCents * commissionRate);
  const currentMonthCommissionCents = Math.round(monthRevenueCents * commissionRate);
  const paidOutCents = payouts._sum.amountCents ?? 0;
  const pendingCommissionCents = Math.max(0, totalEarningsCents - paidOutCents);

  // Acquisition sources — start from all active sources so zero-count sources
  // still render, then fold in each student's source (null → Direct Registration).
  const sourceMap = new Map<
    string,
    { id: string; name: string; slug: string; signups: number; premium: number }
  >();
  for (const s of activeSources) {
    sourceMap.set(s.id, { id: s.id, name: s.name, slug: s.slug, signups: 0, premium: 0 });
  }
  const directFallback =
    activeSources.find((s) => s.slug === "direct") ?? activeSources[activeSources.length - 1] ?? null;

  for (const student of students) {
    const target = student.registrationSource?.id
      ? sourceMap.get(student.registrationSource.id)
      : directFallback
        ? sourceMap.get(directFallback.id)
        : undefined;
    if (!target) continue;
    target.signups += 1;
    if (premiumSet.has(student.id)) target.premium += 1;
  }

  const sources = Array.from(sourceMap.values())
    .map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      signups: s.signups,
      premium: s.premium,
      conversionRate: s.signups > 0 ? Math.round((s.premium / s.signups) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.signups - a.signups);

  const tier = resolvePartnerTier(totalStudents);

  return {
    partner: { id: partner?.id ?? partnerId, name: partner?.name ?? "" },
    currency: settings?.currency ?? "GBP",
    commissionRatePercent: Math.round(commissionRate * 1000) / 10,
    kpis: {
      totalEarningsCents,
      currentMonthRevenueCents: currentMonthCommissionCents,
      pendingCommissionCents,
      newSignupsThisMonth,
      totalStudents,
      premiumStudents,
      conversionRate,
    },
    tier,
    sources,
  };
}

// ---------------------------------------------------------------------------
// Student growth trend (signups + new premium users)
// ---------------------------------------------------------------------------

export async function getPartnerGrowthTrend(partnerId: string, range: PartnerTrendRange) {
  if (isPartnerDemoStaticDataEnabled()) return partnerDemoGrowth(range);

  const buckets = buildBuckets(range);
  const since = rangeStart(range);
  const students = await partnerStudents(partnerId);
  const studentIds = students.map((s) => s.id);

  // Earliest COMPLETED payment per student marks when they became premium.
  const payments = studentIds.length
    ? await prisma.payment.findMany({
        where: { userId: { in: studentIds }, status: "COMPLETED" },
        select: { userId: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const firstPremiumAt = new Map<string, Date>();
  for (const p of payments) {
    if (!firstPremiumAt.has(p.userId)) firstPremiumAt.set(p.userId, p.createdAt);
  }

  const signups = buckets.map(() => 0);
  const newPremium = buckets.map(() => 0);

  for (const student of students) {
    if (student.createdAt >= since) {
      const i = bucketIndex(buckets, student.createdAt);
      if (i >= 0) signups[i] += 1;
    }
  }
  for (const [, date] of firstPremiumAt) {
    if (date >= since) {
      const i = bucketIndex(buckets, date);
      if (i >= 0) newPremium[i] += 1;
    }
  }

  return {
    range,
    points: buckets.map((b, i) => ({
      label: b.label,
      signups: signups[i],
      premium: newPremium[i],
    })),
  };
}

// ---------------------------------------------------------------------------
// Commission trend (commission earned over time)
// ---------------------------------------------------------------------------

export async function getPartnerCommissionTrend(partnerId: string, range: PartnerTrendRange) {
  if (isPartnerDemoStaticDataEnabled()) return partnerDemoCommission(range);

  const buckets = buildBuckets(range);
  const since = rangeStart(range);

  const [rate, students] = await Promise.all([
    partnerCommissionRate(partnerId),
    prisma.user.findMany({
      where: { partnerId, role: "STUDENT" },
      select: { id: true },
    }),
  ]);
  const studentIds = students.map((s) => s.id);

  const payments = studentIds.length
    ? await prisma.payment.findMany({
        where: {
          userId: { in: studentIds },
          status: "COMPLETED",
          createdAt: { gte: since },
        },
        select: { amountCents: true, createdAt: true },
      })
    : [];

  const revenueCents = buckets.map(() => 0);
  for (const p of payments) {
    const i = bucketIndex(buckets, p.createdAt);
    if (i >= 0) revenueCents[i] += p.amountCents;
  }

  return {
    range,
    points: buckets.map((b, i) => ({
      label: b.label,
      commissionCents: Math.round(revenueCents[i] * rate),
    })),
  };
}
