import { prisma } from "@/lib/prisma";
import { hasGlobalPremiumAccess } from "@/services/access-control";
import { getPassMarkPercent } from "@/services/platform-settings";
import {
  isPartnerDemoStaticDataEnabled,
  partnerDemoAnalytics,
  partnerDemoClassDetail,
  partnerDemoReports,
} from "@/lib/partner-demo-data";

export type PartnerAnalyticsPeriod = "30d" | "90d" | "180d" | "365d";

export type PartnerCategoryPerformanceStatus =
  | "High Proficiency"
  | "Average"
  | "Needs Improvement";

export type PartnerCategoryPerformanceRow = {
  paperId: string;
  paperCode: string;
  categoryId: string;
  categoryTitle: string;
  subCategoryId: string;
  subCategoryTitle: string;
  averageScore: number;
  status: PartnerCategoryPerformanceStatus;
  studentsBelowPassing: number;
  attemptCount: number;
};

function statusFromScore(avg: number): PartnerCategoryPerformanceStatus {
  if (avg >= 70) return "High Proficiency";
  if (avg >= 50) return "Average";
  return "Needs Improvement";
}

const PERIOD_DAYS: Record<PartnerAnalyticsPeriod, number> = {
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "365d": 365,
};

export function parsePartnerPeriod(raw: string | null): PartnerAnalyticsPeriod {
  if (raw === "90d" || raw === "180d" || raw === "365d" || raw === "30d") return raw;
  return "30d";
}

function periodStart(period: PartnerAnalyticsPeriod): Date {
  const days = PERIOD_DAYS[period];
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function partnerStudentIds(partnerId: string): Promise<string[]> {
  const students = await prisma.user.findMany({
    where: { partnerId, role: "STUDENT" },
    select: { id: true },
  });
  return students.map((s) => s.id);
}

export async function getPartnerDashboardStats(partnerId: string) {
  if (isPartnerDemoStaticDataEnabled()) return partnerDemoReports();

  const studentIds = await partnerStudentIds(partnerId);
  const activeSince = periodStart("30d");

  const [totalStudents, attempts, recentAttempts, premiumFlags] = await Promise.all([
    Promise.resolve(studentIds.length),
    studentIds.length
      ? prisma.quizAttempt.findMany({
          where: { userId: { in: studentIds }, status: "SUBMITTED" },
          select: {
            id: true,
            userId: true,
            paperId: true,
            passed: true,
            scorePercent: true,
            submittedAt: true,
            paper: { select: { id: true, code: true, title: true } },
          },
        })
      : Promise.resolve([]),
    studentIds.length
      ? prisma.quizAttempt.findMany({
          where: {
            userId: { in: studentIds },
            status: "SUBMITTED",
            submittedAt: { gte: activeSince },
          },
          orderBy: { submittedAt: "desc" },
          take: 8,
          select: {
            id: true,
            scorePercent: true,
            passed: true,
            submittedAt: true,
            user: { select: { id: true, name: true, email: true } },
            paper: { select: { code: true, title: true } },
          },
        })
      : Promise.resolve([]),
    Promise.all(studentIds.map(async (id) => ({ id, premium: await hasGlobalPremiumAccess(id) }))),
  ]);

  const activeStudentIds = new Set(
    attempts
      .filter((a) => a.submittedAt && a.submittedAt >= activeSince)
      .map((a) => a.userId)
  );

  const premiumStudents = premiumFlags.filter((p) => p.premium).length;
  const totalAttempts = attempts.length;
  const passed = attempts.filter((a) => a.passed === true).length;
  const passRate = totalAttempts > 0 ? Math.round((passed / totalAttempts) * 1000) / 10 : 0;

  const byPaper = new Map<
    string,
    { code: string; title: string; attempts: number; passed: number; wrongWeight: number }
  >();
  for (const a of attempts) {
    const key = a.paperId;
    const row = byPaper.get(key) ?? {
      code: a.paper.code,
      title: a.paper.title,
      attempts: 0,
      passed: 0,
      wrongWeight: 0,
    };
    row.attempts += 1;
    if (a.passed) row.passed += 1;
    row.wrongWeight += 100 - (a.scorePercent ?? 0);
    byPaper.set(key, row);
  }

  const paperStats = Array.from(byPaper.values()).map((p) => ({
    code: p.code,
    title: p.title,
    attempts: p.attempts,
    passRate: p.attempts > 0 ? Math.round((p.passed / p.attempts) * 1000) / 10 : 0,
    avgMiss: p.attempts > 0 ? p.wrongWeight / p.attempts : 0,
  }));

  const weakestPapers = [...paperStats].sort((a, b) => a.passRate - b.passRate || b.avgMiss - a.avgMiss).slice(0, 5);
  const strongestPapers = [...paperStats].sort((a, b) => b.passRate - a.passRate || a.avgMiss - b.avgMiss).slice(0, 5);

  return {
    totalStudents,
    activeStudents: activeStudentIds.size,
    premiumStudents,
    totalQuizAttempts: totalAttempts,
    passRate,
    recentActivity: recentAttempts.map((a) => ({
      id: a.id,
      studentName: a.user.name,
      studentEmail: a.user.email,
      paperCode: a.paper.code,
      paperTitle: a.paper.title,
      scorePercent: a.scorePercent,
      passed: a.passed,
      submittedAt: a.submittedAt?.toISOString() ?? null,
    })),
    weakestPapers,
    strongestPapers,
  };
}

export async function getPartnerAnalytics(partnerId: string, period: PartnerAnalyticsPeriod) {
  if (isPartnerDemoStaticDataEnabled()) return partnerDemoAnalytics(period);

  const studentIds = await partnerStudentIds(partnerId);
  const since = periodStart(period);

  if (studentIds.length === 0) {
    const passMark = await getPassMarkPercent();
    return {
      period,
      passMark,
      activeStudents: 0,
      inactiveStudents: 0,
      premiumStudents: 0,
      freeStudents: 0,
      papers: [] as { id: string; code: string; title: string }[],
      attemptsByPaper: [] as { code: string; title: string; attempts: number }[],
      passRateByPaper: [] as { code: string; title: string; passRate: number; attempts: number }[],
      categoryPerformance: [] as PartnerCategoryPerformanceRow[],
      weakestSubcategories: [] as {
        id: string;
        title: string;
        paperCode: string;
        wrongCount: number;
        total: number;
        missRate: number;
      }[],
    };
  }

  const [students, attempts, responses, premiumFlags, passMark] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true },
    }),
    prisma.quizAttempt.findMany({
      where: {
        userId: { in: studentIds },
        status: "SUBMITTED",
        submittedAt: { gte: since },
      },
      select: {
        id: true,
        userId: true,
        paperId: true,
        passed: true,
        paper: {
          select: {
            code: true,
            title: true,
            order: true,
            part: { select: { order: true } },
          },
        },
      },
    }),
    prisma.questionResponse.findMany({
      where: {
        attempt: {
          userId: { in: studentIds },
          status: "SUBMITTED",
          submittedAt: { gte: since },
        },
        question: { subCategoryId: { not: null } },
      },
      select: {
        isCorrect: true,
        attempt: { select: { userId: true, paperId: true } },
        question: {
          select: {
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
                    paper: { select: { id: true, code: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    Promise.all(studentIds.map(async (id) => ({ id, premium: await hasGlobalPremiumAccess(id) }))),
    getPassMarkPercent(),
  ]);

  const activeIds = new Set(attempts.map((a) => a.userId));
  const premiumStudents = premiumFlags.filter((p) => p.premium).length;

  const paperMap = new Map<
    string,
    {
      code: string;
      title: string;
      attempts: number;
      passed: number;
      order: number;
      partOrder: number;
    }
  >();
  for (const a of attempts) {
    const row = paperMap.get(a.paperId) ?? {
      code: a.paper.code,
      title: a.paper.title,
      attempts: 0,
      passed: 0,
      order: a.paper.order,
      partOrder: a.paper.part.order,
    };
    row.attempts += 1;
    if (a.passed) row.passed += 1;
    paperMap.set(a.paperId, row);
  }

  type SubAgg = {
    paperId: string;
    paperCode: string;
    categoryId: string;
    categoryTitle: string;
    subCategoryId: string;
    subCategoryTitle: string;
    correct: number;
    total: number;
    studentScores: Map<string, { correct: number; total: number }>;
  };

  const subMap = new Map<string, SubAgg>();
  for (const r of responses) {
    const sub = r.question.subCategory;
    if (!sub) continue;
    const paperId = sub.category.paperId || r.attempt.paperId;
    const paperCode = sub.category.paper.code;
    const row =
      subMap.get(sub.id) ??
      ({
        paperId,
        paperCode,
        categoryId: sub.categoryId,
        categoryTitle: sub.category.title,
        subCategoryId: sub.id,
        subCategoryTitle: sub.title,
        correct: 0,
        total: 0,
        studentScores: new Map(),
      } satisfies SubAgg);
    row.total += 1;
    if (r.isCorrect) row.correct += 1;
    const ss = row.studentScores.get(r.attempt.userId) ?? { correct: 0, total: 0 };
    ss.total += 1;
    if (r.isCorrect) ss.correct += 1;
    row.studentScores.set(r.attempt.userId, ss);
    subMap.set(sub.id, row);
  }

  const categoryPerformance: PartnerCategoryPerformanceRow[] = Array.from(subMap.values()).map(
    (s) => {
      const averageScore = s.total > 0 ? Math.round((s.correct / s.total) * 1000) / 10 : 0;
      let studentsBelowPassing = 0;
      for (const ss of s.studentScores.values()) {
        const pct = ss.total > 0 ? (ss.correct / ss.total) * 100 : 0;
        if (pct < passMark) studentsBelowPassing += 1;
      }
      return {
        paperId: s.paperId,
        paperCode: s.paperCode,
        categoryId: s.categoryId,
        categoryTitle: s.categoryTitle,
        subCategoryId: s.subCategoryId,
        subCategoryTitle: s.subCategoryTitle,
        averageScore,
        status: statusFromScore(averageScore),
        studentsBelowPassing,
        attemptCount: s.total,
      };
    }
  );

  // Prefer syllabus order when paper categories are available
  const paperIds = Array.from(paperMap.keys());
  const papersWithHierarchy =
    paperIds.length > 0
      ? await prisma.paper.findMany({
          where: { id: { in: paperIds } },
          select: {
            id: true,
            categories: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                subCategories: {
                  orderBy: { order: "asc" },
                  select: { id: true },
                },
              },
            },
          },
        })
      : [];

  const orderedCategoryPerformance: PartnerCategoryPerformanceRow[] = [];
  const seenSubs = new Set<string>();
  for (const paper of papersWithHierarchy) {
    for (const cat of paper.categories) {
      for (const sub of cat.subCategories) {
        const found = categoryPerformance.find((c) => c.subCategoryId === sub.id);
        if (found) {
          orderedCategoryPerformance.push(found);
          seenSubs.add(sub.id);
        }
      }
    }
  }
  for (const row of categoryPerformance) {
    if (!seenSubs.has(row.subCategoryId)) orderedCategoryPerformance.push(row);
  }

  const weakestSubcategories = Array.from(subMap.values())
    .map((s) => ({
      id: s.subCategoryId,
      title: s.subCategoryTitle,
      paperCode: s.paperCode,
      wrongCount: s.total - s.correct,
      total: s.total,
      missRate:
        s.total > 0 ? Math.round(((s.total - s.correct) / s.total) * 1000) / 10 : 0,
    }))
    .filter((s) => s.total >= 3)
    .sort((a, b) => b.missRate - a.missRate)
    .slice(0, 10);

  const papersInOrder = Array.from(paperMap.entries())
    .map(([id, p]) => ({
      id,
      code: p.code,
      title: p.title,
      attempts: p.attempts,
      passed: p.passed,
      order: p.order,
      partOrder: p.partOrder,
    }))
    .sort((a, b) => a.partOrder - b.partOrder || a.order - b.order || a.code.localeCompare(b.code));

  return {
    period,
    passMark,
    activeStudents: activeIds.size,
    inactiveStudents: Math.max(0, students.length - activeIds.size),
    premiumStudents,
    freeStudents: Math.max(0, students.length - premiumStudents),
    papers: papersInOrder.map((p) => ({ id: p.id, code: p.code, title: p.title })),
    attemptsByPaper: papersInOrder.map((p) => ({
      code: p.code,
      title: p.title,
      attempts: p.attempts,
    })),
    passRateByPaper: papersInOrder.map((p) => ({
      code: p.code,
      title: p.title,
      attempts: p.attempts,
      passRate: p.attempts > 0 ? Math.round((p.passed / p.attempts) * 1000) / 10 : 0,
    })),
    categoryPerformance: orderedCategoryPerformance,
    weakestSubcategories,
  };
}

export async function getClassPerformance(partnerId: string, classId: string) {
  if (isPartnerDemoStaticDataEnabled()) {
    return partnerDemoClassDetail(classId)?.class.performance ?? null;
  }

  const cls = await prisma.class.findFirst({
    where: { id: classId, partnerId },
    include: {
      students: { select: { studentId: true } },
    },
  });
  if (!cls) return null;

  const studentIds = cls.students.map((s) => s.studentId);
  const attempts = studentIds.length
    ? await prisma.quizAttempt.findMany({
        where: { userId: { in: studentIds }, status: "SUBMITTED" },
        select: {
          passed: true,
          paperId: true,
          paper: { select: { code: true, title: true } },
        },
      })
    : [];

  const passed = attempts.filter((a) => a.passed === true).length;
  const passRate = attempts.length > 0 ? Math.round((passed / attempts.length) * 1000) / 10 : 0;

  const paperMap = new Map<string, { code: string; title: string; attempts: number; passed: number }>();
  for (const a of attempts) {
    const row = paperMap.get(a.paperId) ?? {
      code: a.paper.code,
      title: a.paper.title,
      attempts: 0,
      passed: 0,
    };
    row.attempts += 1;
    if (a.passed) row.passed += 1;
    paperMap.set(a.paperId, row);
  }

  const weakPapers = Array.from(paperMap.values())
    .map((p) => ({
      code: p.code,
      title: p.title,
      attempts: p.attempts,
      passRate: p.attempts > 0 ? Math.round((p.passed / p.attempts) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.passRate - b.passRate)
    .slice(0, 5);

  return {
    classId: cls.id,
    name: cls.name,
    studentCount: studentIds.length,
    totalAttempts: attempts.length,
    passRate,
    weakPapers,
  };
}
