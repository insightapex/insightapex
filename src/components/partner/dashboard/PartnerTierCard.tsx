import { Card } from "@/components/ui/Card";
import type { ResolvedTier } from "@/lib/partner-tiers";

const TIER_STYLES: Record<string, { chip: string; bar: string; ring: string }> = {
  BRONZE: { chip: "bg-amber-100 text-amber-800", bar: "bg-amber-500", ring: "ring-amber-200" },
  SILVER: { chip: "bg-slate-200 text-slate-700", bar: "bg-slate-400", ring: "ring-slate-200" },
  GOLD: { chip: "bg-yellow-100 text-yellow-800", bar: "bg-yellow-500", ring: "ring-yellow-200" },
  PLATINUM: { chip: "bg-violet-100 text-violet-800", bar: "bg-violet-500", ring: "ring-violet-200" },
};

export function PartnerTierCard({ tier }: { tier: ResolvedTier }) {
  const style = TIER_STYLES[tier.current.key] ?? TIER_STYLES.BRONZE;
  const remaining = tier.next ? Math.max(0, tier.nextTierTarget - tier.totalStudents) : 0;

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Partner Tier</p>
          <span
            className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1 ring-inset ${style.chip} ${style.ring}`}
          >
            {tier.current.label}
          </span>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-tight text-slate-900">{tier.totalStudents}</p>
          <p className="text-[11px] leading-tight text-slate-500">Students</p>
        </div>
      </div>

      <div className="mt-4 flex-1">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-500">
          <span>{tier.current.label}</span>
          <span>{tier.next ? tier.next.label : "Max"}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
            style={{ width: `${tier.progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs leading-snug text-slate-600">
          {tier.next ? (
            <>
              <span className="font-semibold text-slate-900">{remaining}</span> more to{" "}
              <span className="font-semibold text-slate-900">{tier.next.label}</span>
            </>
          ) : (
            "Highest tier reached"
          )}
        </p>
      </div>
    </Card>
  );
}
