import { prisma } from "@/lib/prisma";
import { buildScoreBands, getScoreBandId, type ScoreBandId } from "@/lib/admin-results";
import type {
  AnalyticsKpis,
  AnalyticsPeriod,
  CategoryAnalysisRow,
  FailedSubCategoryRow,
  HeatmapRow,
  PaperPerformanceRow,
  PlatformAnalyticsResponse,
  QuestionAnalyticsRow,
  SubCategoryAnalysisRow,
  TrendPoint,
} from "@/lib/admin-analytics-types";
import type { Prisma } from "@prisma/client";

const PERIOD_DAYS: Record<AnalyticsPeriod, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "365d": 365,
};

function getPeriodStart(period: AnalyticsPeriod): Date {
  const start = new Date();
  start.setDate(start.getDate() - PERIOD_DAYS[period]);
  start.setHours(0, 0, 0, 0);
  return start;
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function attemptCompletionRate(totalQuestions: number, answeredCount: number): number {
  if (totalQuestions <= 0) return 0;
  return Math.round((answeredCount / totalQuestions) * 1000) / 10;
}

function buildAttemptWhere(
  periodStart: Date,
  paperId?: string | null
): Prisma.QuizAttemptWhereInput {
  return {
    status: "SUBMITTED",
    submittedAt: { gte: periodStart },
    user: { role: "STUDENT" },
    ...(paperId ? { paperId } : {}),
  };
}

export async function getPlatformAnalytics(params: {
  period: AnalyticsPeriod;
  paperId?: string | null;
  subCategoryId?: string | null;
}): Promise<PlatformAnalyticsResponse> {
  const { period, paperId = null, subCategoryId = null } = params;
  const periodStart = getPeriodStart(period);
  const attemptWhere = buildAttemptWhere(periodStart, paperId);

  const [
    totalAttempts,
    passedAttempts,
    activeStudentRows,
    totalQuestionsAnswered,
    attemptsForDistribution,
    attemptsDetailed,
    papers,
    selectedPaper,
    selectedSubCategory,
    answeredResponses,
  ] = await Promise.all([
    prisma.quizAttempt.count({ where: attemptWhere }),
    prisma.quizAttempt.count({ where: { ...attemptWhere, passed: true } }),
    prisma.quizAttempt.findMany({
      where: attemptWhere,
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.questionResponse.count({
      where: {
        selectedOptionId: { not: null },
        attempt: attemptWhere,
      },
    }),
    prisma.quizAttempt.findMany({
      where: attemptWhere,
      select: { scorePercent: true },
    }),
    prisma.quizAttempt.findMany({
      where: buildAttemptWhere(periodStart, null),
      select: {
        id: true,
        paperId: true,
        passed: true,
        totalQuestions: true,
        submittedAt: true,
        paper: { select: { id: true, code: true, title: true } },
        responses: { select: { selectedOptionId: true } },
      },
    }),
    prisma.paper.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { code: "asc" }],
      select: { id: true, code: true, title: true },
    }),
    paperId
      ? prisma.paper.findUnique({
          where: { id: paperId },
          select: { id: true, code: true, title: true },
        })
      : Promise.resolve(null),
    subCategoryId
      ? prisma.subCategory.findUnique({
          where: { id: subCategoryId },
          select: {
            id: true,
            title: true,
            category: { select: { title: true, paperId: true } },
          },
        })
      : Promise.resolve(null),
    prisma.questionResponse.findMany({
      where: {
        selectedOptionId: { not: null },
        attempt: attemptWhere,
        ...(paperId
          ? { question: { subCategory: { category: { paperId } } } }
          : {}),
        ...(subCategoryId ? { question: { subCategoryId } } : {}),
      },
      select: {
        attemptId: true,
        isCorrect: true,
        selectedOptionId: true,
        questionId: true,
        question: {
          select: {
            id: true,
            text: true,
            subCategoryId: true,
            subCategory: {
              select: {
                id: true,
                title: true,
                categoryId: true,
                category: {
                  select: {
                    id: true,
                    title: true,
                    paperId: true,
                    paper: { select: { code: true } },
                  },
                },
              },
            },
            options: { select: { id: true, text: true, isCorrect: true } },
          },
        },
        selectedOption: { select: { id: true, text: true, isCorrect: true } },
      },
    }),
  ]);

  const bandCounts: Record<ScoreBandId, number> = {
    under_50: 0,
    "50_59": 0,
    "60_79": 0,
    "80_plus": 0,
  };
  for (const attempt of attemptsForDistribution) {
    bandCounts[getScoreBandId(attempt.scorePercent)]++;
  }

  const kpis: AnalyticsKpis = {
    totalAttempts,
    passRate: pct(passedAttempts, totalAttempts),
    activeStudents: activeStudentRows.length,
    totalQuestionsAnswered,
  };

  const paperStats = new Map<
    string,
    {
      paperId: string;
      paperCode: string;
      paperTitle: string;
      attempts: number;
      passed: number;
      completionTotal: number;
    }
  >();

  for (const attempt of attemptsDetailed) {
    const answered = attempt.responses.filter((r) => r.selectedOptionId).length;
    const completion = attemptCompletionRate(attempt.totalQuestions, answered);
    const existing = paperStats.get(attempt.paperId);
    if (!existing) {
      paperStats.set(attempt.paperId, {
        paperId: attempt.paperId,
        paperCode: attempt.paper.code,
        paperTitle: attempt.paper.title,
        attempts: 1,
        passed: attempt.passed ? 1 : 0,
        completionTotal: completion,
      });
    } else {
      existing.attempts++;
      if (attempt.passed) existing.passed++;
      existing.completionTotal += completion;
    }
  }

  for (const paper of papers) {
    if (!paperStats.has(paper.id)) {
      paperStats.set(paper.id, {
        paperId: paper.id,
        paperCode: paper.code,
        paperTitle: paper.title,
        attempts: 0,
        passed: 0,
        completionTotal: 0,
      });
    }
  }

  const paperPerformance: PaperPerformanceRow[] = Array.from(paperStats.values())
    .map((row) => ({
      paperId: row.paperId,
      paperCode: row.paperCode,
      paperTitle: row.paperTitle,
      label: `${row.paperCode} – ${row.paperTitle}`,
      attempts: row.attempts,
      passRate: pct(row.passed, row.attempts),
      completionRate: pct(row.completionTotal, row.attempts),
    }))
    .sort((a, b) => b.attempts - a.attempts);

  const mostAttemptedPapers = [...paperPerformance]
    .filter((row) => row.attempts > 0)
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 8);

  type SubCategoryAgg = {
    subCategoryId: string;
    categoryId: string;
    categoryTitle: string;
    subCategoryTitle: string;
    paperCode: string;
    attemptIds: Set<string>;
    correct: number;
    total: number;
    answered: number;
    slots: number;
  };

  const subCategoryMap = new Map<string, SubCategoryAgg>();
  const categoryMap = new Map<
    string,
    {
      categoryId: string;
      categoryTitle: string;
      attemptIds: Set<string>;
      correct: number;
      total: number;
      answered: number;
      slots: number;
    }
  >();

  for (const response of answeredResponses) {
    const sc = response.question.subCategory;
    if (!sc) continue;
    const cat = sc.category;
    const scKey = sc.id;
    const catKey = cat.id;

    if (!subCategoryMap.has(scKey)) {
      subCategoryMap.set(scKey, {
        subCategoryId: sc.id,
        categoryId: cat.id,
        categoryTitle: cat.title,
        subCategoryTitle: sc.title,
        paperCode: cat.paper.code,
        attemptIds: new Set(),
        correct: 0,
        total: 0,
        answered: 0,
        slots: 0,
      });
    }
    if (!categoryMap.has(catKey)) {
      categoryMap.set(catKey, {
        categoryId: cat.id,
        categoryTitle: cat.title,
        attemptIds: new Set(),
        correct: 0,
        total: 0,
        answered: 0,
        slots: 0,
      });
    }

    const scAgg = subCategoryMap.get(scKey)!;
    const catAgg = categoryMap.get(catKey)!;
    scAgg.attemptIds.add(response.attemptId);
    catAgg.attemptIds.add(response.attemptId);
    scAgg.total++;
    catAgg.total++;
    scAgg.slots++;
    catAgg.slots++;
    if (response.selectedOptionId) {
      scAgg.answered++;
      catAgg.answered++;
    }
    if (response.isCorrect) {
      scAgg.correct++;
      catAgg.correct++;
    }
  }

  const subCategories: SubCategoryAnalysisRow[] = Array.from(subCategoryMap.values())
    .map((row) => {
      const passRate = pct(row.correct, row.total);
      return {
        subCategoryId: row.subCategoryId,
        categoryId: row.categoryId,
        categoryTitle: row.categoryTitle,
        subCategoryTitle: row.subCategoryTitle,
        label: `${row.categoryTitle} / ${row.subCategoryTitle}`,
        attempts: row.attemptIds.size,
        passRate,
        failureRate: pct(row.total - row.correct, row.total),
        completionRate: pct(row.answered, row.slots),
      };
    })
    .sort((a, b) => b.failureRate - a.failureRate);

  const categories: CategoryAnalysisRow[] = Array.from(categoryMap.values())
    .map((row) => {
      const passRate = pct(row.correct, row.total);
      return {
        categoryId: row.categoryId,
        categoryTitle: row.categoryTitle,
        attempts: row.attemptIds.size,
        passRate,
        failureRate: pct(row.total - row.correct, row.total),
        completionRate: pct(row.answered, row.slots),
      };
    })
    .sort((a, b) => b.failureRate - a.failureRate);

  const mostFailedSubCategories: FailedSubCategoryRow[] = subCategories
    .filter((row) => row.attempts >= 1 && row.passRate < 100)
    .slice(0, 8)
    .map((row) => ({
      subCategoryId: row.subCategoryId,
      label: row.label,
      failureRate: row.failureRate,
      attempts: row.attempts,
    }));

  const heatmap: HeatmapRow[] = subCategories
    .filter((row) => row.attempts > 0)
    .map((row) => {
      const meta = subCategoryMap.get(row.subCategoryId);
      return {
        paperCode: meta?.paperCode ?? selectedPaper?.code ?? "—",
        categoryTitle: row.categoryTitle,
        subCategoryTitle: row.subCategoryTitle,
        label: row.label,
        failureRate: row.failureRate,
        attempts: row.attempts,
      };
    })
    .sort((a, b) => b.failureRate - a.failureRate)
    .slice(0, 24);

  const trendAttempts = await prisma.quizAttempt.findMany({
    where: attemptWhere,
    select: { submittedAt: true, passed: true },
    orderBy: { submittedAt: "asc" },
  });

  const trendBuckets = new Map<string, { attempts: number; passed: number }>();
  for (const attempt of trendAttempts) {
    if (!attempt.submittedAt) continue;
    const date = attempt.submittedAt.toISOString().slice(0, 10);
    const bucket = trendBuckets.get(date) ?? { attempts: 0, passed: 0 };
    bucket.attempts++;
    if (attempt.passed) bucket.passed++;
    trendBuckets.set(date, bucket);
  }

  const trends: TrendPoint[] = Array.from(trendBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      attempts: bucket.attempts,
      passRate: pct(bucket.passed, bucket.attempts),
    }));

  const questionMap = new Map<
    string,
    {
      questionId: string;
      questionText: string;
      total: number;
      correct: number;
      wrongOptionCounts: Map<string, { text: string; count: number }>;
    }
  >();

  for (const response of answeredResponses) {
    if (subCategoryId && response.question.subCategoryId !== subCategoryId) continue;

    const q = response.question;
    if (!questionMap.has(q.id)) {
      questionMap.set(q.id, {
        questionId: q.id,
        questionText: q.text,
        total: 0,
        correct: 0,
        wrongOptionCounts: new Map(),
      });
    }
    const agg = questionMap.get(q.id)!;
    agg.total++;
    if (response.isCorrect) {
      agg.correct++;
    } else if (response.selectedOption && !response.selectedOption.isCorrect) {
      const key = response.selectedOption.id;
      const existing = agg.wrongOptionCounts.get(key) ?? {
        text: response.selectedOption.text,
        count: 0,
      };
      existing.count++;
      agg.wrongOptionCounts.set(key, existing);
    }
  }

  const questionAnalytics: QuestionAnalyticsRow[] = Array.from(questionMap.values())
    .map((row) => {
      const wrong = row.total - row.correct;
      let mostSelectedWrongOption: string | null = null;
      let maxWrong = 0;
      for (const option of row.wrongOptionCounts.values()) {
        if (option.count > maxWrong) {
          maxWrong = option.count;
          mostSelectedWrongOption = option.text;
        }
      }
      return {
        questionId: row.questionId,
        questionText:
          row.questionText.length > 120
            ? `${row.questionText.slice(0, 120)}…`
            : row.questionText,
        attempts: row.total,
        correctRate: pct(row.correct, row.total),
        wrongRate: pct(wrong, row.total),
        mostSelectedWrongOption,
        difficultyVotes: { easy: 0, medium: 0, hard: 0 },
      };
    })
    .sort((a, b) => b.wrongRate - a.wrongRate);

  return {
    period,
    paperId,
    subCategoryId,
    selectedPaper: selectedPaper
      ? {
          id: selectedPaper.id,
          code: selectedPaper.code,
          title: selectedPaper.title,
          label: `${selectedPaper.code} – ${selectedPaper.title}`,
        }
      : null,
    selectedSubCategory: selectedSubCategory
      ? {
          id: selectedSubCategory.id,
          title: selectedSubCategory.title,
          categoryTitle: selectedSubCategory.category.title,
          label: `${selectedSubCategory.category.title} / ${selectedSubCategory.title}`,
        }
      : null,
    kpis,
    scoreDistribution: buildScoreBands(bandCounts),
    paperPerformance,
    mostAttemptedPapers,
    mostFailedSubCategories,
    categories: paperId ? categories : [],
    subCategories: paperId ? subCategories : subCategories.slice(0, 12),
    heatmap,
    trends,
    questionAnalytics: subCategoryId ? questionAnalytics : [],
  };
}
