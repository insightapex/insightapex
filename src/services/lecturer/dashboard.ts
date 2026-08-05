import type { LecturerContext } from "@/lib/lecturer-auth";
import { getLecturerStudentIds } from "@/lib/lecturer-auth";
import { prisma } from "@/lib/prisma";
import {
  isLecturerDemoStaticDataEnabled,
  lecturerDemoAssignedPapers,
  lecturerDemoAtRisk,
  lecturerDemoDashboard,
  lecturerDemoMockExams,
  lecturerDemoPerformanceTrend,
  lecturerDemoQuestions,
  lecturerDemoStudentById,
  lecturerDemoStudentDetail,
  lecturerDemoStudents,
} from "@/lib/lecturer-demo-data";

export type LecturerTrendRange = "4w" | "8w" | "3m" | "6m" | "12m";

export function parseLecturerTrendRange(raw: string | null): LecturerTrendRange {
  if (raw === "4w" || raw === "8w" || raw === "3m" || raw === "6m" || raw === "12m") return raw;
  return "8w";
}

const RANGE_DAYS: Record<LecturerTrendRange, number> = {
  "4w": 28,
  "8w": 56,
  "3m": 90,
  "6m": 180,
  "12m": 365,
};

export type PerformanceStatus = "High Proficiency" | "Average" | "Needs Improvement";
export type RiskStatus = "High Risk" | "At Risk" | "Monitor";

function statusFromScore(avg: number): PerformanceStatus {
  if (avg >= 70) return "High Proficiency";
  if (avg >= 50) return "Average";
  return "Needs Improvement";
}

function riskFromSignals(params: {
  overallScore: number | null;
  daysSinceActive: number | null;
  mockAttempts: number;
  passMark: number;
}): RiskStatus {
  const { overallScore, daysSinceActive, mockAttempts, passMark } = params;
  const inactiveLong = daysSinceActive != null && daysSinceActive >= 14;
  const inactiveMed = daysSinceActive != null && daysSinceActive >= 7;
  const score = overallScore ?? 0;
  const noMocks = mockAttempts === 0;

  if (score < passMark - 15 || (inactiveLong && score < passMark) || (noMocks && score < passMark && inactiveMed)) {
    return "High Risk";
  }
  if (score < passMark || inactiveMed || (noMocks && score < passMark + 10)) {
    return "At Risk";
  }
  return "Monitor";
}

async function getPassMark(): Promise<number> {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
    select: { defaultPassMark: true },
  });
  return settings?.defaultPassMark ?? 50;
}

/** Assigned papers for the lecturer, grouped by part for Part → Paper selectors. */
export async function getLecturerAssignedPapers(ctx: LecturerContext) {
  if (isLecturerDemoStaticDataEnabled()) {
    const { parts } = lecturerDemoAssignedPapers(ctx.partnerName);
    return { parts };
  }

  if (ctx.paperIds.length === 0) {
    return { parts: [] as Array<{ id: string; code: string; title: string; papers: Array<{ id: string; code: string; title: string }> }> };
  }

  const papers = await prisma.paper.findMany({
    where: { id: { in: ctx.paperIds }, isActive: true },
    select: {
      id: true,
      code: true,
      title: true,
      partId: true,
      part: { select: { id: true, code: true, title: true, order: true } },
    },
    orderBy: [{ part: { order: "asc" } }, { order: "asc" }, { code: "asc" }],
  });

  const partMap = new Map<
    string,
    { id: string; code: string; title: string; order: number; papers: Array<{ id: string; code: string; title: string }> }
  >();

  for (const p of papers) {
    const part = partMap.get(p.partId) ?? {
      id: p.part.id,
      code: p.part.code,
      title: p.part.title,
      order: p.part.order,
      papers: [],
    };
    part.papers.push({ id: p.id, code: p.code, title: p.title });
    partMap.set(p.partId, part);
  }

  return {
    parts: Array.from(partMap.values())
      .sort((a, b) => a.order - b.order)
      .map(({ order: _o, ...rest }) => rest),
  };
}

export async function getLecturerDashboard(ctx: LecturerContext, paperId: string) {
  if (isLecturerDemoStaticDataEnabled()) {
    return lecturerDemoDashboard(paperId);
  }

  if (!ctx.paperIds.includes(paperId)) {
    return null;
  }

  const [paper, studentIds, passMark] = await Promise.all([
    prisma.paper.findFirst({
      where: { id: paperId, isActive: true },
      select: {
        id: true,
        code: true,
        title: true,
        partId: true,
        part: { select: { id: true, code: true, title: true } },
        categories: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            subCategories: {
              where: { isActive: true },
              orderBy: { order: "asc" },
              select: { id: true, title: true },
            },
          },
        },
      },
    }),
    getLecturerStudentIds(ctx),
    getPassMark(),
  ]);

  if (!paper) return null;

  const enrolled = studentIds.length;

  const attempts = studentIds.length
    ? await prisma.quizAttempt.findMany({
        where: {
          paperId,
          userId: { in: studentIds },
          status: "SUBMITTED",
        },
        select: {
          id: true,
          userId: true,
          scorePercent: true,
          passed: true,
          submittedAt: true,
          mockExamId: true,
          startedAt: true,
        },
      })
    : [];

  const scored = attempts.filter((a) => a.scorePercent != null);
  const avgClassScore =
    scored.length > 0
      ? Math.round((scored.reduce((s, a) => s + (a.scorePercent ?? 0), 0) / scored.length) * 10) / 10
      : 0;

  // Latest attempt per student for readiness
  const latestByStudent = new Map<string, (typeof attempts)[number]>();
  for (const a of attempts) {
    const prev = latestByStudent.get(a.userId);
    const aTime = a.submittedAt?.getTime() ?? a.startedAt.getTime();
    const pTime = prev ? (prev.submittedAt?.getTime() ?? prev.startedAt.getTime()) : 0;
    if (!prev || aTime > pTime) latestByStudent.set(a.userId, a);
  }

  let readyCount = 0;
  for (const a of latestByStudent.values()) {
    if ((a.scorePercent ?? 0) >= passMark) readyCount += 1;
  }
  const passProbability =
    enrolled > 0 ? Math.round((readyCount / enrolled) * 1000) / 10 : 0;

  const mockParticipants = new Set(
    attempts.filter((a) => a.mockExamId).map((a) => a.userId)
  );
  const mockParticipationRate =
    enrolled > 0 ? Math.round((mockParticipants.size / enrolled) * 1000) / 10 : 0;

  // Category / subcategory performance via question responses
  const responses = studentIds.length
    ? await prisma.questionResponse.findMany({
        where: {
          attempt: {
            paperId,
            userId: { in: studentIds },
            status: "SUBMITTED",
          },
          question: { purpose: "PRACTICE", subCategoryId: { not: null } },
        },
        select: {
          isCorrect: true,
          question: {
            select: {
              subCategoryId: true,
              subCategory: {
                select: {
                  id: true,
                  title: true,
                  categoryId: true,
                  category: { select: { id: true, title: true } },
                },
              },
            },
          },
          attempt: { select: { userId: true, scorePercent: true } },
        },
      })
    : [];

  type SubAgg = {
    subCategoryId: string;
    subCategoryTitle: string;
    categoryId: string;
    categoryTitle: string;
    correct: number;
    total: number;
    studentScores: Map<string, { correct: number; total: number }>;
  };

  const subMap = new Map<string, SubAgg>();
  for (const r of responses) {
    const sub = r.question.subCategory;
    if (!sub) continue;
    const row =
      subMap.get(sub.id) ??
      ({
        subCategoryId: sub.id,
        subCategoryTitle: sub.title,
        categoryId: sub.category.id,
        categoryTitle: sub.category.title,
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

  const categoryPerformance = Array.from(subMap.values()).map((s) => {
    const averageScore = s.total > 0 ? Math.round((s.correct / s.total) * 1000) / 10 : 0;
    let belowPassing = 0;
    for (const ss of s.studentScores.values()) {
      const pct = ss.total > 0 ? (ss.correct / ss.total) * 100 : 0;
      if (pct < passMark) belowPassing += 1;
    }
    return {
      categoryId: s.categoryId,
      categoryTitle: s.categoryTitle,
      subCategoryId: s.subCategoryId,
      subCategoryTitle: s.subCategoryTitle,
      averageScore,
      status: statusFromScore(averageScore),
      studentsBelowPassing: belowPassing,
      attemptCount: s.total,
    };
  });

  // Prefer hierarchy order from paper categories when available
  const ordered: typeof categoryPerformance = [];
  for (const cat of paper.categories) {
    for (const sub of cat.subCategories) {
      const found = categoryPerformance.find((c) => c.subCategoryId === sub.id);
      if (found) ordered.push(found);
      else {
        ordered.push({
          categoryId: cat.id,
          categoryTitle: cat.title,
          subCategoryId: sub.id,
          subCategoryTitle: sub.title,
          averageScore: 0,
          status: "Needs Improvement" as PerformanceStatus,
          studentsBelowPassing: 0,
          attemptCount: 0,
        });
      }
    }
  }
  // Include any orphan performance rows
  for (const row of categoryPerformance) {
    if (!ordered.some((o) => o.subCategoryId === row.subCategoryId)) ordered.push(row);
  }

  return {
    paper: {
      id: paper.id,
      code: paper.code,
      title: paper.title,
      part: paper.part,
    },
    passMark,
    kpis: {
      totalEnrolledStudents: enrolled,
      averageClassScore: avgClassScore,
      passProbability,
      mockParticipationRate,
    },
    categoryPerformance: ordered,
  };
}

export async function getLecturerAtRiskStudents(ctx: LecturerContext, paperId: string) {
  if (isLecturerDemoStaticDataEnabled()) {
    return lecturerDemoAtRisk(paperId);
  }

  if (!ctx.paperIds.includes(paperId)) return null;

  const [studentIds, passMark, students] = await Promise.all([
    getLecturerStudentIds(ctx),
    getPassMark(),
    getLecturerStudentIds(ctx).then(async (ids) =>
      ids.length
        ? prisma.user.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, email: true },
            orderBy: { name: "asc" },
          })
        : []
    ),
  ]);

  if (studentIds.length === 0) {
    return { passMark, students: [] as Array<Record<string, unknown>> };
  }

  const attempts = await prisma.quizAttempt.findMany({
    where: {
      paperId,
      userId: { in: studentIds },
      status: "SUBMITTED",
    },
    select: {
      userId: true,
      scorePercent: true,
      mockExamId: true,
      submittedAt: true,
      startedAt: true,
    },
  });

  const now = Date.now();
  const byStudent = new Map<
    string,
    { scores: number[]; mockAttempts: number; lastActive: Date | null }
  >();

  for (const id of studentIds) {
    byStudent.set(id, { scores: [], mockAttempts: 0, lastActive: null });
  }

  for (const a of attempts) {
    const row = byStudent.get(a.userId)!;
    if (a.scorePercent != null) row.scores.push(a.scorePercent);
    if (a.mockExamId) row.mockAttempts += 1;
    const t = a.submittedAt ?? a.startedAt;
    if (!row.lastActive || t > row.lastActive) row.lastActive = t;
  }

  const result = students
    .map((s) => {
      const row = byStudent.get(s.id)!;
      const overallScore =
        row.scores.length > 0
          ? Math.round((row.scores.reduce((a, b) => a + b, 0) / row.scores.length) * 10) / 10
          : null;
      const daysSinceActive = row.lastActive
        ? Math.floor((now - row.lastActive.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const riskStatus = riskFromSignals({
        overallScore,
        daysSinceActive,
        mockAttempts: row.mockAttempts,
        passMark,
      });

      // Only surface students who need support (not everyone as Monitor with good scores)
      const needsSupport =
        riskStatus === "High Risk" ||
        riskStatus === "At Risk" ||
        (riskStatus === "Monitor" && (overallScore == null || overallScore < passMark + 10));

      if (!needsSupport) return null;

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        overallScore,
        mockAttempts: row.mockAttempts,
        lastActive: row.lastActive?.toISOString() ?? null,
        daysSinceActive,
        riskStatus,
      };
    })
    .filter(Boolean);

  const order: Record<RiskStatus, number> = { "High Risk": 0, "At Risk": 1, Monitor: 2 };
  result.sort((a, b) => {
    const ra = order[(a as { riskStatus: RiskStatus }).riskStatus];
    const rb = order[(b as { riskStatus: RiskStatus }).riskStatus];
    return ra - rb;
  });

  return { passMark, students: result };
}

export async function getLecturerPerformanceTrend(
  ctx: LecturerContext,
  paperId: string,
  range: LecturerTrendRange
) {
  if (isLecturerDemoStaticDataEnabled()) {
    return lecturerDemoPerformanceTrend(paperId, range);
  }

  if (!ctx.paperIds.includes(paperId)) return null;

  const studentIds = await getLecturerStudentIds(ctx);
  const days = RANGE_DAYS[range];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const attempts = studentIds.length
    ? await prisma.quizAttempt.findMany({
        where: {
          paperId,
          userId: { in: studentIds },
          status: "SUBMITTED",
          submittedAt: { gte: since },
          scorePercent: { not: null },
        },
        select: { scorePercent: true, submittedAt: true },
        orderBy: { submittedAt: "asc" },
      })
    : [];

  // Weekly buckets
  const buckets: { label: string; start: Date; end: Date; scores: number[] }[] = [];
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  let cursor = new Date(since);
  const now = new Date();
  let i = 1;
  while (cursor < now) {
    const end = new Date(Math.min(cursor.getTime() + weekMs, now.getTime() + 1));
    buckets.push({
      label: `W${i}`,
      start: new Date(cursor),
      end,
      scores: [],
    });
    cursor = end;
    i += 1;
  }

  for (const a of attempts) {
    if (!a.submittedAt || a.scorePercent == null) continue;
    const b = buckets.find((x) => a.submittedAt! >= x.start && a.submittedAt! < x.end);
    if (b) b.scores.push(a.scorePercent);
  }

  return {
    range,
    points: buckets.map((b) => ({
      label: b.label,
      averageScore:
        b.scores.length > 0
          ? Math.round((b.scores.reduce((s, n) => s + n, 0) / b.scores.length) * 10) / 10
          : null,
      attempts: b.scores.length,
    })),
  };
}

export async function getLecturerMockExams(ctx: LecturerContext, paperId?: string | null) {
  if (isLecturerDemoStaticDataEnabled()) {
    return lecturerDemoMockExams(paperId);
  }

  const paperIds = paperId
    ? ctx.paperIds.includes(paperId)
      ? [paperId]
      : []
    : ctx.paperIds;

  if (paperIds.length === 0) {
    return { mocks: [] as Array<Record<string, unknown>> };
  }

  const studentIds = await getLecturerStudentIds(ctx);

  const mocks = await prisma.mockExam.findMany({
    where: {
      paperId: { in: paperIds },
      isActive: true,
      status: "PUBLISHED",
    },
    select: {
      id: true,
      title: true,
      paperId: true,
      paper: { select: { code: true, title: true } },
      durationMinutes: true,
      passMarkPercent: true,
      _count: { select: { questions: true } },
    },
    orderBy: [{ paper: { code: "asc" } }, { order: "asc" }],
  });

  const attempts = studentIds.length
    ? await prisma.quizAttempt.findMany({
        where: {
          mockExamId: { in: mocks.map((m) => m.id) },
          userId: { in: studentIds },
          status: "SUBMITTED",
        },
        select: {
          mockExamId: true,
          userId: true,
          scorePercent: true,
          passed: true,
          user: { select: { id: true, name: true, email: true } },
        },
      })
    : [];

  return {
    mocks: mocks.map((m) => {
      const mockAttempts = attempts.filter((a) => a.mockExamId === m.id);
      const attemptedIds = new Set(mockAttempts.map((a) => a.userId));
      const notAttempted = studentIds
        .filter((id) => !attemptedIds.has(id))
        .map((id) => {
          // resolve names lazily from attempts' sibling students - fetch from student list
          return { id };
        });

      return {
        id: m.id,
        title: m.title,
        paperId: m.paperId,
        paperCode: m.paper.code,
        paperTitle: m.paper.title,
        durationMinutes: m.durationMinutes,
        passMarkPercent: m.passMarkPercent,
        questionCount: m._count.questions,
        participationCount: attemptedIds.size,
        enrolledCount: studentIds.length,
        participationRate:
          studentIds.length > 0
            ? Math.round((attemptedIds.size / studentIds.length) * 1000) / 10
            : 0,
        scores: mockAttempts.map((a) => ({
          studentId: a.userId,
          name: a.user.name,
          email: a.user.email,
          scorePercent: a.scorePercent,
          passed: a.passed,
        })),
        notAttemptedStudentIds: notAttempted.map((s) => s.id),
      };
    }),
    studentDirectory: studentIds.length
      ? await prisma.user.findMany({
          where: { id: { in: studentIds } },
          select: { id: true, name: true, email: true },
        })
      : [],
  };
}

export async function getLecturerStudents(
  ctx: LecturerContext,
  opts: { search?: string; paperId?: string | null } = {}
) {
  if (isLecturerDemoStaticDataEnabled()) {
    return lecturerDemoStudents(opts);
  }

  const studentIds = await getLecturerStudentIds(ctx);
  if (studentIds.length === 0) return { students: [] };

  const where: {
    id: { in: string[] };
    OR?: Array<{ name?: { contains: string; mode: "insensitive" }; email?: { contains: string; mode: "insensitive" } }>;
  } = { id: { in: studentIds } };

  if (opts.search?.trim()) {
    const q = opts.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const students = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      classEnrollments: {
        where: { classId: { in: ctx.classIds } },
        select: { class: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const paperFilter = opts.paperId && ctx.paperIds.includes(opts.paperId) ? opts.paperId : null;
  const attempts = await prisma.quizAttempt.findMany({
    where: {
      userId: { in: students.map((s) => s.id) },
      status: "SUBMITTED",
      paperId: paperFilter ? paperFilter : { in: ctx.paperIds },
    },
    select: {
      userId: true,
      paperId: true,
      scorePercent: true,
      submittedAt: true,
      paper: { select: { code: true } },
    },
  });

  return {
    students: students.map((s) => {
      const sa = attempts.filter((a) => a.userId === s.id);
      const scores = sa.filter((a) => a.scorePercent != null).map((a) => a.scorePercent!);
      const last = sa.reduce<Date | null>((acc, a) => {
        if (!a.submittedAt) return acc;
        if (!acc || a.submittedAt > acc) return a.submittedAt;
        return acc;
      }, null);

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        classes: s.classEnrollments.map((e) => e.class),
        attemptCount: sa.length,
        averageScore:
          scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
            : null,
        lastActive: last?.toISOString() ?? null,
      };
    }),
  };
}

export async function getLecturerStudentDetail(ctx: LecturerContext, studentId: string) {
  if (isLecturerDemoStaticDataEnabled()) {
    const demo = lecturerDemoStudentDetail(studentId);
    if (!demo) return null;

    // Sarah (and any demo row with a live email) — merge real practice into the demo profile.
    const demoRow = lecturerDemoStudentById(studentId);
    if (demoRow?.email) {
      const live = await loadLiveStudentPracticeByEmail(demoRow.email);
      if (live) {
        return {
          ...demo,
          paperResults: live.paperResults.length ? live.paperResults : demo.paperResults,
          recentPractice: live.recentPractice.length ? live.recentPractice : demo.recentPractice,
          activityTimeline: live.activityTimeline.length
            ? live.activityTimeline
            : demo.activityTimeline,
          weakCategories: live.weakCategories.length ? live.weakCategories : demo.weakCategories,
          livePracticeMerged: true,
        };
      }
    }
    return demo;
  }

  const visible = await getLecturerStudentIds(ctx);
  if (!visible.includes(studentId)) return null;

  const student = await prisma.user.findFirst({
    where: { id: studentId, partnerId: ctx.partnerId, role: "STUDENT" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      classEnrollments: {
        where: { classId: { in: ctx.classIds } },
        select: { class: { select: { id: true, name: true } } },
      },
    },
  });
  if (!student) return null;

  const practice = await loadStudentPracticeBundle({
    studentId,
    paperIds: ctx.paperIds,
  });

  return {
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      createdAt: student.createdAt.toISOString(),
      classes: student.classEnrollments.map((e) => e.class),
    },
    ...practice,
  };
}

async function loadLiveStudentPracticeByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, role: true },
  });
  if (!user || user.role !== "STUDENT") return null;
  return loadStudentPracticeBundle({ studentId: user.id, paperIds: null });
}

async function loadStudentPracticeBundle(opts: {
  studentId: string;
  /** null = all papers (used when enriching demo Sarah with live attempts) */
  paperIds: string[] | null;
}) {
  const attempts = await prisma.quizAttempt.findMany({
    where: {
      userId: opts.studentId,
      status: "SUBMITTED",
      ...(opts.paperIds ? { paperId: { in: opts.paperIds } } : {}),
    },
    select: {
      id: true,
      paperId: true,
      mockExamId: true,
      scorePercent: true,
      passed: true,
      submittedAt: true,
      totalQuestions: true,
      correctCount: true,
      paper: { select: { code: true, title: true } },
      mockExam: { select: { title: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: 40,
  });

  const responses = await prisma.questionResponse.findMany({
    where: {
      attempt: {
        userId: opts.studentId,
        status: "SUBMITTED",
        ...(opts.paperIds ? { paperId: { in: opts.paperIds } } : {}),
      },
      question: { purpose: "PRACTICE", subCategoryId: { not: null } },
    },
    select: {
      isCorrect: true,
      question: {
        select: {
          subCategory: {
            select: {
              id: true,
              title: true,
              category: { select: { title: true, paper: { select: { code: true } } } },
            },
          },
        },
      },
    },
  });

  const weakMap = new Map<string, { title: string; paperCode: string; wrong: number; total: number }>();
  for (const r of responses) {
    const sub = r.question.subCategory;
    if (!sub) continue;
    const row = weakMap.get(sub.id) ?? {
      title: `${sub.category.title} / ${sub.title}`,
      paperCode: sub.category.paper.code,
      wrong: 0,
      total: 0,
    };
    row.total += 1;
    if (!r.isCorrect) row.wrong += 1;
    weakMap.set(sub.id, row);
  }

  const weakCategories = Array.from(weakMap.values())
    .map((w) => ({
      ...w,
      missRate: w.total > 0 ? Math.round((w.wrong / w.total) * 1000) / 10 : 0,
    }))
    .filter((w) => w.total >= 2)
    .sort((a, b) => b.missRate - a.missRate)
    .slice(0, 10);

  const paperResults = attempts.map((a) => ({
    id: a.id,
    paperCode: a.paper.code,
    paperTitle: a.paper.title,
    mockExamTitle: a.mockExam?.title ?? null,
    scorePercent: a.scorePercent,
    passed: a.passed,
    submittedAt: a.submittedAt?.toISOString() ?? null,
    questionCount: a.totalQuestions,
    correctCount: a.correctCount,
  }));

  const recentPractice = paperResults.slice(0, 8);

  const activityTimeline = [...paperResults]
    .filter((r) => r.submittedAt)
    .map((r) => ({
      id: `timeline-${r.id}`,
      at: r.submittedAt,
      kind: r.mockExamTitle ? ("mock" as const) : ("practice" as const),
      title: r.mockExamTitle
        ? `${r.paperCode} mock · ${r.mockExamTitle}`
        : `${r.paperCode} practice · ${r.paperTitle}`,
      detail:
        r.scorePercent != null
          ? `Scored ${Math.round(r.scorePercent)}%${
              r.questionCount != null && r.correctCount != null
                ? ` · ${r.correctCount}/${r.questionCount} correct`
                : ""
            }`
          : "Submitted",
      scorePercent: r.scorePercent,
      passed: r.passed,
    }));

  return {
    paperResults,
    recentPractice,
    activityTimeline,
    weakCategories,
  };
}

export async function getLecturerQuestions(ctx: LecturerContext, paperId?: string | null) {
  if (isLecturerDemoStaticDataEnabled()) {
    return lecturerDemoQuestions(paperId);
  }

  const paperIds = paperId
    ? ctx.paperIds.includes(paperId)
      ? [paperId]
      : []
    : ctx.paperIds;

  if (paperIds.length === 0) return { questions: [] };

  const studentIds = await getLecturerStudentIds(ctx);

  const questions = await prisma.question.findMany({
    where: {
      isActive: true,
      purpose: "PRACTICE",
      subCategory: {
        isActive: true,
        category: { isActive: true, paperId: { in: paperIds } },
      },
    },
    select: {
      id: true,
      text: true,
      subCategory: {
        select: {
          title: true,
          category: {
            select: {
              title: true,
              paper: { select: { id: true, code: true, title: true } },
            },
          },
        },
      },
      options: { select: { id: true, text: true, isCorrect: true, order: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const responses = studentIds.length
    ? await prisma.questionResponse.findMany({
        where: {
          questionId: { in: questions.map((q) => q.id) },
          attempt: { userId: { in: studentIds }, status: "SUBMITTED" },
        },
        select: {
          questionId: true,
          isCorrect: true,
          selectedOptionId: true,
        },
      })
    : [];

  return {
    questions: questions.map((q) => {
      const rs = responses.filter((r) => r.questionId === q.id);
      const attemptCount = rs.length;
      const correctCount = rs.filter((r) => r.isCorrect).length;
      const wrongCount = attemptCount - correctCount;
      const wrongOptionCounts = new Map<string, number>();
      for (const r of rs) {
        if (!r.isCorrect && r.selectedOptionId) {
          wrongOptionCounts.set(
            r.selectedOptionId,
            (wrongOptionCounts.get(r.selectedOptionId) ?? 0) + 1
          );
        }
      }
      let mostWrongOptionId: string | null = null;
      let mostWrongCount = 0;
      for (const [oid, c] of wrongOptionCounts) {
        if (c > mostWrongCount) {
          mostWrongCount = c;
          mostWrongOptionId = oid;
        }
      }
      const mostWrong = q.options.find((o) => o.id === mostWrongOptionId);

      return {
        id: q.id,
        text: q.text,
        paperCode: q.subCategory?.category.paper.code ?? "",
        paperId: q.subCategory?.category.paper.id ?? "",
        category: q.subCategory?.category.title ?? "",
        subCategory: q.subCategory?.title ?? "",
        attemptCount,
        correctRate: attemptCount > 0 ? Math.round((correctCount / attemptCount) * 1000) / 10 : 0,
        wrongRate: attemptCount > 0 ? Math.round((wrongCount / attemptCount) * 1000) / 10 : 0,
        mostSelectedWrongOption: mostWrong?.text ?? null,
      };
    }),
  };
}
