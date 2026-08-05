/** Heuristic exam readiness / prediction from practice + recorded mock results. */

export interface ExamInsightInput {
  averageScore: number;
  bestScore: number;
  coveragePercent: number;
  studyStreak: number;
  totalAttempts: number;
  mockAverageScore?: number | null;
  mockBestScore?: number | null;
  mockAttemptCount?: number;
}

export interface ExamInsights {
  examReadyPercent: number;
  predictedExamMark: number;
  passProbabilityPercent: number;
  passLean: "pass" | "fail" | "insufficient";
  hasData: boolean;
  hasMockData: boolean;
}

export type ScoreTrackSummary = {
  latestScore: number | null;
  bestScore: number | null;
  count: number;
};

export type PredictionCompareResult = {
  beatPrediction: boolean;
  delta: number;
  comparable: boolean;
};

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Maps practice (+ optional mock) performance toward exam readiness predictions.
 */
export function computeExamInsights(input: ExamInsightInput): ExamInsights {
  const {
    averageScore,
    bestScore,
    coveragePercent,
    studyStreak,
    totalAttempts,
    mockAverageScore = null,
    mockBestScore = null,
    mockAttemptCount = 0,
  } = input;

  const hasData = totalAttempts > 0;
  const hasMockData = (mockAttemptCount ?? 0) > 0;

  if (!hasData && !hasMockData) {
    return {
      examReadyPercent: 0,
      predictedExamMark: 0,
      passProbabilityPercent: 0,
      passLean: "insufficient",
      hasData: false,
      hasMockData: false,
    };
  }

  const practiceBlend =
    totalAttempts > 0
      ? averageScore * 0.65 + bestScore * 0.35
      : 0;

  const mockBlend =
    hasMockData && mockAverageScore != null
      ? mockAverageScore * 0.55 + (mockBestScore ?? mockAverageScore) * 0.45
      : null;

  // Weight mocks higher when present — closer to exam conditions.
  const performanceCore =
    mockBlend != null
      ? practiceBlend * 0.45 + mockBlend * 0.55
      : practiceBlend;

  const coverageFactor = 0.55 + (coveragePercent / 100) * 0.45;
  const streakBoost = Math.min(8, studyStreak * 0.8);
  const volumeBoost = Math.min(6, Math.log10(Math.max(1, totalAttempts + 1)) * 4);

  const examReadyPercent = clamp(
    Math.round(performanceCore * coverageFactor + streakBoost + volumeBoost * 0.5)
  );

  // Prediction slightly discounts practice optimism.
  const discount = hasMockData ? 0.96 : 0.9;
  const predictedExamMark = clamp(Math.round(performanceCore * discount * coverageFactor));

  const passProbabilityPercent = clamp(
    Math.round(
      predictedExamMark * 0.7 +
        examReadyPercent * 0.2 +
        Math.min(10, studyStreak) +
        (predictedExamMark >= 50 ? 5 : 0)
    )
  );

  let passLean: ExamInsights["passLean"] = "insufficient";
  if (totalAttempts + (mockAttemptCount ?? 0) >= 2) {
    passLean = passProbabilityPercent >= 50 ? "pass" : "fail";
  }

  return {
    examReadyPercent,
    predictedExamMark,
    passProbabilityPercent,
    passLean,
    hasData: hasData || hasMockData,
    hasMockData,
  };
}

/** Compare a score track against the predicted exam mark. */
export function compareScoreToPrediction(
  summary: ScoreTrackSummary | undefined,
  predictedExamMark: number
): PredictionCompareResult {
  if (!summary || summary.count === 0 || summary.latestScore == null) {
    return { beatPrediction: false, delta: 0, comparable: false };
  }
  const delta = summary.latestScore - predictedExamMark;
  return {
    beatPrediction: delta >= 0,
    delta,
    comparable: true,
  };
}
