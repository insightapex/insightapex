import type { ScoreBand } from "@/lib/admin-results";

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "180d" | "365d";

export const ANALYTICS_PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "3 months" },
  { value: "180d", label: "6 months" },
  { value: "365d", label: "12 months" },
];

export interface AnalyticsKpis {
  totalAttempts: number;
  passRate: number;
  activeStudents: number;
  totalQuestionsAnswered: number;
}

export interface PaperPerformanceRow {
  paperId: string;
  paperCode: string;
  paperTitle: string;
  label: string;
  attempts: number;
  passRate: number;
  completionRate: number;
}

export interface CategoryAnalysisRow {
  categoryId: string;
  categoryTitle: string;
  attempts: number;
  passRate: number;
  failureRate: number;
  completionRate: number;
}

export interface SubCategoryAnalysisRow {
  subCategoryId: string;
  categoryId: string;
  categoryTitle: string;
  subCategoryTitle: string;
  label: string;
  attempts: number;
  passRate: number;
  failureRate: number;
  completionRate: number;
}

export interface FailedSubCategoryRow {
  subCategoryId: string;
  label: string;
  failureRate: number;
  attempts: number;
}

export interface QuestionAnalyticsRow {
  questionId: string;
  questionText: string;
  attempts: number;
  correctRate: number;
  wrongRate: number;
  mostSelectedWrongOption: string | null;
  difficultyVotes: { easy: number; medium: number; hard: number };
}

export interface HeatmapRow {
  paperCode: string;
  categoryTitle: string;
  subCategoryTitle: string;
  label: string;
  failureRate: number;
  attempts: number;
}

export interface TrendPoint {
  date: string;
  attempts: number;
  passRate: number;
}

export const DEFAULT_ANALYTICS_PERIOD: AnalyticsPeriod = "30d";

export function parseAnalyticsPeriod(value: string | null): AnalyticsPeriod {
  const valid: AnalyticsPeriod[] = ["7d", "30d", "90d", "180d", "365d"];
  if (value && valid.includes(value as AnalyticsPeriod)) {
    return value as AnalyticsPeriod;
  }
  return DEFAULT_ANALYTICS_PERIOD;
}

export interface PlatformAnalyticsResponse {
  period: AnalyticsPeriod;
  paperId: string | null;
  subCategoryId: string | null;
  selectedPaper: { id: string; code: string; title: string; label: string } | null;
  selectedSubCategory: {
    id: string;
    title: string;
    categoryTitle: string;
    label: string;
  } | null;
  kpis: AnalyticsKpis;
  scoreDistribution: ScoreBand[];
  paperPerformance: PaperPerformanceRow[];
  mostAttemptedPapers: PaperPerformanceRow[];
  mostFailedSubCategories: FailedSubCategoryRow[];
  categories: CategoryAnalysisRow[];
  subCategories: SubCategoryAnalysisRow[];
  heatmap: HeatmapRow[];
  trends: TrendPoint[];
  questionAnalytics: QuestionAnalyticsRow[];
}
