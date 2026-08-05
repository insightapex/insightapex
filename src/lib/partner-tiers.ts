/**
 * Partner tier thresholds, based on the number of registered students.
 * Defined in one place so thresholds/tiers can be tuned without touching UI or
 * service logic. Ordered ascending by `minStudents`.
 */
export type PartnerTierKey = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export type PartnerTierDef = {
  key: PartnerTierKey;
  label: string;
  minStudents: number;
  /** Tailwind accent tokens for consistent styling. */
  accent: string;
};

export const PARTNER_TIERS: PartnerTierDef[] = [
  { key: "BRONZE", label: "Bronze", minStudents: 0, accent: "amber" },
  { key: "SILVER", label: "Silver", minStudents: 25, accent: "slate" },
  { key: "GOLD", label: "Gold", minStudents: 100, accent: "yellow" },
  { key: "PLATINUM", label: "Platinum", minStudents: 250, accent: "violet" },
];

export type ResolvedTier = {
  current: PartnerTierDef;
  next: PartnerTierDef | null;
  totalStudents: number;
  /** Students required to reach the next tier (0 when already top tier). */
  nextTierTarget: number;
  /** Progress toward the next tier, 0..100. 100 when at top tier. */
  progressPercent: number;
};

export function resolvePartnerTier(totalStudents: number): ResolvedTier {
  const sorted = [...PARTNER_TIERS].sort((a, b) => a.minStudents - b.minStudents);

  let current = sorted[0];
  for (const tier of sorted) {
    if (totalStudents >= tier.minStudents) current = tier;
  }

  const currentIndex = sorted.findIndex((t) => t.key === current.key);
  const next = currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;

  if (!next) {
    return {
      current,
      next: null,
      totalStudents,
      nextTierTarget: 0,
      progressPercent: 100,
    };
  }

  const span = next.minStudents - current.minStudents;
  const gained = totalStudents - current.minStudents;
  const progressPercent = span > 0 ? Math.min(100, Math.round((gained / span) * 100)) : 0;

  return {
    current,
    next,
    totalStudents,
    nextTierTarget: next.minStudents,
    progressPercent,
  };
}
