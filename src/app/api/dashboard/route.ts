import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type TopicStatus = "Weak" | "Average" | "Strong";

function getTopicStatus(accuracy: number): TopicStatus {
  if (accuracy < 60) return "Weak";
  if (accuracy < 80) return "Average";
  return "Strong";
}

function computeStudyStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const uniqueDays = new Set(dates.map((d) => d.toISOString().slice(0, 10)));

  const checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);

  const todayStr = checkDate.toISOString().slice(0, 10);
  if (!uniqueDays.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (uniqueDays.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const studentName = session.user.name ?? "Student";

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId, status: "SUBMITTED" },
    include: {
      paper: { select: { id: true, code: true, title: true } },
      responses: {
        include: {
          question: {
            include: {
              topic: { select: { id: true, title: true, paperId: true } },
            },
          },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  const papers = await prisma.paper.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: { _count: { select: { topics: true } } },
  });

  const totalAttempts = attempts.length;
  const scores = attempts.map((a) => a.scorePercent ?? 0);
  const averageScore =
    totalAttempts > 0 ? scores.reduce((sum, s) => sum + s, 0) / totalAttempts : 0;
  const bestScore = totalAttempts > 0 ? Math.max(...scores) : 0;

  const studyStreak = computeStudyStreak(
    attempts
      .map((a) => a.submittedAt)
      .filter((d): d is Date => d !== null)
  );

  const topicStats: Record<
    string,
    { id: string; title: string; paperId: string; correct: number; total: number }
  > = {};

  for (const attempt of attempts) {
    for (const resp of attempt.responses) {
      const topic = resp.question.topic;
      if (!topicStats[topic.id]) {
        topicStats[topic.id] = {
          id: topic.id,
          title: topic.title,
          paperId: topic.paperId,
          correct: 0,
          total: 0,
        };
      }
      topicStats[topic.id].total++;
      if (resp.isCorrect) topicStats[topic.id].correct++;
    }
  }

  const topicDetails = Object.values(topicStats)
    .filter((t) => t.total > 0)
    .map((t) => {
      const accuracy = Math.round((t.correct / t.total) * 100);
      return {
        id: t.id,
        title: t.title,
        paperId: t.paperId,
        accuracy,
        status: getTopicStatus(accuracy),
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy);

  const weakTopics = topicDetails.filter((t) => t.status === "Weak").slice(0, 5);

  const paperAttemptMap: Record<string, { lastDate: Date | null; topicsAttempted: Set<string> }> =
    {};
  for (const paper of papers) {
    paperAttemptMap[paper.id] = { lastDate: null, topicsAttempted: new Set() };
  }

  for (const attempt of attempts) {
    const entry = paperAttemptMap[attempt.paperId];
    if (!entry) continue;
    if (attempt.submittedAt && (!entry.lastDate || attempt.submittedAt > entry.lastDate)) {
      entry.lastDate = attempt.submittedAt;
    }
    for (const resp of attempt.responses) {
      entry.topicsAttempted.add(resp.question.topicId);
    }
  }

  const paperProgress = papers.map((p) => {
    const entry = paperAttemptMap[p.id];
    const totalTopics = p._count.topics;
    const topicsAttempted = entry?.topicsAttempted.size ?? 0;
    const progressPercent =
      totalTopics > 0 ? Math.round((topicsAttempted / totalTopics) * 100) : 0;

    return {
      id: p.id,
      code: p.code,
      title: p.title,
      lastPracticeDate: entry?.lastDate?.toISOString() ?? null,
      progressPercent,
      topicsAttempted,
      totalTopics,
    };
  });

  const recommendedPractice = weakTopics.slice(0, 3).map((t) => ({
    topicId: t.id,
    paperId: t.paperId,
    topic: t.title,
    reason: `Your accuracy is ${t.accuracy}% — focus here to reach the 60% pass threshold.`,
  }));

  const recentActivity = attempts.slice(0, 5).map((a) => {
    const topicTitles = [
      ...new Set(a.responses.map((r) => r.question.topic.title)),
    ];
    return {
      id: a.id,
      paper: `${a.paper.code} – ${a.paper.title}`,
      topic: topicTitles[0] ?? null,
      score: a.scorePercent,
      passed: a.passed,
      date: a.submittedAt,
    };
  });

  const scoreHistory = attempts
    .slice(0, 10)
    .reverse()
    .map((a) => ({
      date: a.submittedAt?.toISOString().slice(0, 10) ?? "",
      score: Math.round(a.scorePercent ?? 0),
      paper: a.paper.code,
    }));

  return NextResponse.json({
    studentName,
    totalAttempts,
    completedQuizzes: totalAttempts,
    averageScore: Math.round(averageScore),
    bestScore: Math.round(bestScore),
    weakTopicCount: weakTopics.length,
    studyStreak,
    weakTopics: weakTopics.map((t) => t.title),
    topicDetails,
    paperProgress,
    recommendedPractice,
    recentActivity,
    scoreHistory,
  });
}
