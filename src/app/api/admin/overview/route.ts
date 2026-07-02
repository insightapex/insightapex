import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    totalStudents,
    totalPapers,
    totalQuestions,
    totalTopics,
    mockExamsCreated,
    avgScoreAgg,
    recentStudents,
    recentAttempts,
    recentQuestionsRaw,
    studentsWithAttempts,
    allResponses,
    paperAttemptCounts,
    progressAttempts,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.paper.count(),
    prisma.question.count(),
    prisma.topic.count(),
    prisma.quizAttempt.count({ where: { status: "SUBMITTED" } }),
    prisma.quizAttempt.aggregate({
      where: { status: "SUBMITTED" },
      _avg: { scorePercent: true },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    prisma.quizAttempt.findMany({
      where: { status: "SUBMITTED" },
      orderBy: { submittedAt: "desc" },
      take: 8,
      include: {
        user: { select: { name: true } },
        paper: { select: { code: true } },
      },
    }),
    prisma.question.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        topic: { include: { paper: { select: { code: true, title: true } } } },
        options: { orderBy: { order: "asc" } },
      },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        updatedAt: true,
        attempts: {
          where: { status: "SUBMITTED" },
          orderBy: { submittedAt: "desc" },
          select: {
            scorePercent: true,
            submittedAt: true,
            responses: {
              select: {
                isCorrect: true,
                question: { select: { topic: { select: { title: true } } } },
              },
            },
          },
        },
      },
    }),
    prisma.questionResponse.findMany({
      select: {
        isCorrect: true,
        question: { select: { topic: { select: { id: true, title: true } } } },
      },
    }),
    prisma.quizAttempt.groupBy({
      by: ["paperId"],
      where: { status: "SUBMITTED" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    prisma.quizAttempt.findMany({
      where: { status: "SUBMITTED", submittedAt: { not: null } },
      orderBy: { submittedAt: "asc" },
      take: 30,
      select: { scorePercent: true, submittedAt: true },
    }),
  ]);

  const averageStudentScore = Math.round(avgScoreAgg._avg.scorePercent ?? 0);

  // Global weakest topic by accuracy
  const topicAccuracy: Record<string, { title: string; correct: number; total: number }> = {};
  for (const r of allResponses) {
    const topic = r.question.topic;
    if (!topicAccuracy[topic.id]) topicAccuracy[topic.id] = { title: topic.title, correct: 0, total: 0 };
    topicAccuracy[topic.id].total++;
    if (r.isCorrect) topicAccuracy[topic.id].correct++;
  }
  const sortedTopics = Object.values(topicAccuracy)
    .filter((t) => t.total >= 3)
    .sort((a, b) => a.correct / a.total - b.correct / b.total);
  const weakestTopic = sortedTopics[0]?.title ?? null;

  const recentQuestions = recentQuestionsRaw.map((q) => {
    const correct = q.options.find((o) => o.isCorrect);
    return {
      id: q.id,
      text: q.text.length > 80 ? `${q.text.slice(0, 80)}…` : q.text,
      paper: q.topic.paper.code,
      topic: q.topic.title,
      difficulty: q.difficulty,
      correctAnswer: correct?.text ?? "—",
      status: q.isActive ? "Active" : "Inactive",
      isActive: q.isActive,
    };
  });

  const studentPerformance = studentsWithAttempts.map((s) => {
    const completed = s.attempts.length;
    const avgScore =
      completed > 0
        ? Math.round(s.attempts.reduce((sum, a) => sum + (a.scorePercent ?? 0), 0) / completed)
        : null;
    const topicStats: Record<string, { correct: number; total: number }> = {};
    for (const attempt of s.attempts) {
      for (const resp of attempt.responses) {
        const title = resp.question.topic.title;
        if (!topicStats[title]) topicStats[title] = { correct: 0, total: 0 };
        topicStats[title].total++;
        if (resp.isCorrect) topicStats[title].correct++;
      }
    }
    const weakest = Object.entries(topicStats)
      .filter(([, v]) => v.total > 0)
      .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)[0]?.[0] ?? null;
    const lastActivity = s.attempts[0]?.submittedAt ?? s.updatedAt;
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      quizzesCompleted: completed,
      averageScore: avgScore,
      weakestTopic: weakest,
      lastActivity,
    };
  });

  const mostFailedTopics = Object.values(topicAccuracy)
    .filter((t) => t.total >= 2)
    .map((t) => ({
      topic: t.title,
      failRate: Math.round((1 - t.correct / t.total) * 100),
      attempts: t.total,
    }))
    .sort((a, b) => b.failRate - a.failRate)
    .slice(0, 5);

  const paperIds = paperAttemptCounts.map((p) => p.paperId);
  const papers = paperIds.length
    ? await prisma.paper.findMany({
        where: { id: { in: paperIds } },
        select: { id: true, code: true, title: true },
      })
    : [];
  const paperMap = Object.fromEntries(papers.map((p) => [p.id, p]));
  const mostAttemptedPapers = paperAttemptCounts.map((p) => ({
    paper: paperMap[p.paperId]?.code ?? "Unknown",
    title: paperMap[p.paperId]?.title ?? "",
    attempts: p._count.id,
  }));

  const totalResponses = allResponses.length;
  const correctResponses = allResponses.filter((r) => r.isCorrect).length;
  const questionAccuracyRate =
    totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0;

  const progressTrend = progressAttempts.map((a) => ({
    date: a.submittedAt?.toISOString().slice(0, 10) ?? "",
    score: Math.round(a.scorePercent ?? 0),
  }));

  const recentActivity = [
    ...recentStudents.slice(0, 3).map((s) => ({
      id: `student-${s.id}`,
      type: "signup" as const,
      message: `${s.name} joined the platform`,
      date: s.createdAt,
    })),
    ...recentAttempts.slice(0, 5).map((a) => ({
      id: `attempt-${a.id}`,
      type: "quiz" as const,
      message: `${a.user.name} completed ${a.paper.code} quiz`,
      date: a.submittedAt,
    })),
  ]
    .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
    .slice(0, 8);

  return NextResponse.json({
    totalStudents,
    totalPapers,
    totalQuestions,
    totalTopics,
    mockExamsCreated,
    averageStudentScore,
    weakestTopic,
    recentActivity,
    recentStudents,
    recentAttempts: recentAttempts.map((a) => ({
      id: a.id,
      student: a.user.name,
      paper: a.paper.code,
      score: Math.round(a.scorePercent ?? 0),
      passed: a.passed,
      date: a.submittedAt,
    })),
    recentQuestions,
    studentPerformance,
    analytics: {
      mostFailedTopics,
      mostAttemptedPapers,
      questionAccuracyRate,
      progressTrend,
    },
  });
}
