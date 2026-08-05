import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { buildScoreBands, type ScoreBandId } from "@/lib/admin-results";
import type { Prisma } from "@prisma/client";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePositiveInt(value: string | null, fallback: number, max?: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  if (max != null) return Math.min(parsed, max);
  return parsed;
}

export async function GET(req: Request) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const bandsOnly = url.searchParams.get("bandsOnly") === "1";
  const page = parsePositiveInt(url.searchParams.get("page"), 1);
  const limit = parsePositiveInt(url.searchParams.get("limit"), DEFAULT_LIMIT, MAX_LIMIT);
  const minScore = url.searchParams.get("minScore");
  const search = url.searchParams.get("search")?.trim() ?? "";
  const highScoreFilter = minScore === "80";
  const paperId = url.searchParams.get("paperId");

  if (!paperId) {
    return NextResponse.json({ error: "paperId is required" }, { status: 400 });
  }

  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: { id: true, code: true, title: true, isActive: true },
  });

  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  const submittedWhere = {
    status: "SUBMITTED" as const,
    user: { role: "STUDENT" as const },
    paperId,
  };

  const [under50, band5059, band6079, band80Plus, totalSubmissions] = await Promise.all([
    prisma.quizAttempt.count({
      where: {
        ...submittedWhere,
        OR: [{ scorePercent: { lt: 50 } }, { scorePercent: null }],
      },
    }),
    prisma.quizAttempt.count({
      where: { ...submittedWhere, scorePercent: { gte: 50, lt: 60 } },
    }),
    prisma.quizAttempt.count({
      where: { ...submittedWhere, scorePercent: { gte: 60, lt: 80 } },
    }),
    prisma.quizAttempt.count({
      where: { ...submittedWhere, scorePercent: { gte: 80 } },
    }),
    prisma.quizAttempt.count({ where: submittedWhere }),
  ]);

  const scoreBands = buildScoreBands({
    under_50: under50,
    "50_59": band5059,
    "60_79": band6079,
    "80_plus": band80Plus,
  });

  const selectedPaper = {
    id: paper.id,
    code: paper.code,
    title: paper.title,
    label: `${paper.code} – ${paper.title}`,
  };

  if (bandsOnly) {
    return NextResponse.json({
      scoreBands,
      totalSubmissions,
      selectedPaper,
      filter: null,
      submissions: [],
      pagination: { page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 1 },
    });
  }

  const submissionWhere: Prisma.QuizAttemptWhereInput = {
    ...submittedWhere,
    ...(highScoreFilter ? { scorePercent: { gte: 80 } } : {}),
    ...(search
      ? {
          OR: [
            { user: { name: { contains: search, mode: "insensitive" } } },
            { user: { email: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [filteredTotal, submissions] = await Promise.all([
    prisma.quizAttempt.count({ where: submissionWhere }),
    prisma.quizAttempt.findMany({
      where: submissionWhere,
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
        paper: { select: { code: true, title: true } },
      },
    }),
  ]);

  return NextResponse.json({
    scoreBands,
    totalSubmissions,
    selectedPaper,
    filter: highScoreFilter ? ("80_plus" as ScoreBandId) : null,
    submissions: submissions.map((attempt) => ({
      id: attempt.id,
      studentName: attempt.user.name,
      email: attempt.user.email,
      paper: `${attempt.paper.code} – ${attempt.paper.title}`,
      paperCode: attempt.paper.code,
      score: Math.round(attempt.scorePercent ?? 0),
      passed: attempt.passed,
      submittedAt: attempt.submittedAt,
    })),
    pagination: {
      page,
      limit,
      total: filteredTotal,
      totalPages: Math.max(1, Math.ceil(filteredTotal / limit)),
    },
  });
}
