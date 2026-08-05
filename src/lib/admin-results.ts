export type ScoreBandId = "under_50" | "50_59" | "60_79" | "80_plus";

export interface ScoreBand {
  id: ScoreBandId;
  label: string;
  count: number;
  percent: number;
}

export const SCORE_BAND_DEFINITIONS: { id: ScoreBandId; label: string }[] = [
  { id: "under_50", label: "Under 50%" },
  { id: "50_59", label: "50%–59%" },
  { id: "60_79", label: "60%–79%" },
  { id: "80_plus", label: "80% and above" },
];

export function roundScore(score: number | null | undefined): number {
  return Math.round(score ?? 0);
}

export function getScoreBandId(score: number | null | undefined): ScoreBandId {
  const value = roundScore(score);
  if (value < 50) return "under_50";
  if (value < 60) return "50_59";
  if (value < 80) return "60_79";
  return "80_plus";
}

export function buildScoreBands(counts: Record<ScoreBandId, number>): ScoreBand[] {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return SCORE_BAND_DEFINITIONS.map((band) => ({
    id: band.id,
    label: band.label,
    count: counts[band.id],
    percent: total > 0 ? Math.round((counts[band.id] / total) * 1000) / 10 : 0,
  }));
}
