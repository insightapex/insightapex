/**
 * LOCALHOST-ONLY synthetic Owner-dashboard demo students / attempts / scores.
 *
 * PURPOSE: Client walkthrough of Owner Students, Results, Overview, Analytics.
 * DATA is clearly labelled demo (emails @example.test, fixed ids demo-owner-*).
 *
 * Safety:
 * - Loads ONLY `.env.localrestore` (never production `.env` / Neon)
 * - Refuse non-localhost hosts and sslmode=require
 * - Does not touch purchases, subscriptions, Stripe, or non-demo users
 * - Remove mode only deletes users with BOTH id + email demo markers
 *
 * Commands:
 *   npm run demo:results:dry
 *   npm run demo:results:create
 *   npm run demo:results:remove
 */

import path from "path";
import { PrismaClient } from "@prisma/client";
import {
  assertLocalDatabaseUrl,
  loadRestoreEnv,
} from "./restore-old-local-data";

// ---------------------------------------------------------------------------
// Demo constants (deterministic — no Math.random)
// ---------------------------------------------------------------------------

const DEMO_ID_PREFIX = "demo-owner-user-";
const DEMO_ATT_PREFIX = "demo-owner-att-";
const DEMO_EMAIL_DOMAIN = "example.test";
const DEMO_EMAIL_PREFIX = "demo.student";
const DEMO_BIO_MARKER = "[DEMO OWNER DASHBOARD]";
const DEMO_STUDENT_COUNT = 12;

/** Fixed bcrypt of "DemoStudent!1" — stable across runs. */
const DEMO_PASSWORD_HASH =
  "$2a$10$SNXmWF5fcJZ2Ee4vJ/BgNuDiHTvqdYz6WCDyJ5UuCfvFzjON4TAui";

/** Anchored timeline so Analytics 7d/30d/90d still see submissions after epoch. */
const DEMO_EPOCH_MS = Date.UTC(2026, 6, 20, 14, 0, 0); // 2026-07-20 14:00 UTC

const STUDENT_NAMES = [
  "Demo Student Alpha",
  "Demo Student Bravo",
  "Demo Student Charlie",
  "Demo Student Delta",
  "Demo Student Echo",
  "Demo Student Foxtrot",
  "Demo Student Golf",
  "Demo Student Hotel",
  "Demo Student India",
  "Demo Student Juliet",
  "Demo Student Kilo",
  "Demo Student Lima",
] as const;

type AttemptSpec = {
  paperCode: string;
  correctRatio: number;
  dayOffset: number;
  durationSec: number;
  attemptSeq: number;
};

type Counts = { created: number; updated: number; skipped: number; failed: number };

type PracticeQuestion = {
  id: string;
  paperId: string;
  paperCode: string;
  options: Array<{ id: string; isCorrect: boolean; order: number }>;
};

function empty(): Counts {
  return { created: 0, updated: 0, skipped: 0, failed: 0 };
}

function studentId(n: number): string {
  return `${DEMO_ID_PREFIX}${String(n).padStart(2, "0")}`;
}

function studentEmail(n: number): string {
  return `${DEMO_EMAIL_PREFIX}${String(n).padStart(2, "0")}@${DEMO_EMAIL_DOMAIN}`;
}

function attemptId(userN: number, paperCode: string, seq: number): string {
  return `${DEMO_ATT_PREFIX}${String(userN).padStart(2, "0")}-${paperCode.toLowerCase()}-${seq}`;
}

function profileId(userN: number): string {
  return `demo-owner-profile-${String(userN).padStart(2, "0")}`;
}

function responseId(attId: string, qIndex: number): string {
  return `${attId}-resp-${String(qIndex).padStart(3, "0")}`;
}

function isDemoUser(user: { id: string; email: string }): boolean {
  return (
    user.id.startsWith(DEMO_ID_PREFIX) &&
    user.email.startsWith(DEMO_EMAIL_PREFIX) &&
    user.email.endsWith(`@${DEMO_EMAIL_DOMAIN}`)
  );
}

/** Deterministic attempt catalogue (no randomness). */
function attemptsForStudent(studentIndex0: number): AttemptSpec[] {
  const papers = ["BT", "MA", "FA", "PM", "FR", "SBR"] as const;
  const paperA = papers[studentIndex0 % papers.length];
  const paperB = papers[(studentIndex0 + 2) % papers.length];
  const paperC = papers[(studentIndex0 + 4) % papers.length];

  const ratioTables: number[][] = [
    [0.4, 0.55, 0.75],
    [0.85, 0.9],
    [0.5, 0.65],
    [0.35, 0.58, 0.82],
    [0.72, 0.78],
    [0.45, 0.62, 0.88],
    [0.95],
    [0.55, 0.7],
    [0.3, 0.5, 0.6],
    [0.68, 0.8],
    [0.42, 0.9],
    [0.75, 0.52, 0.85],
  ];
  const ratios = ratioTables[studentIndex0] ?? [0.6, 0.7];
  const dayBases = [2, 5, 9, 12, 16, 20];
  const paperPick = [paperA, paperB, paperC];

  return ratios.map((correctRatio, s) => ({
    paperCode: paperPick[s % paperPick.length],
    correctRatio,
    dayOffset: dayBases[s % dayBases.length] + studentIndex0,
    durationSec: 480 + studentIndex0 * 25 + s * 90,
    attemptSeq: s + 1,
  }));
}

async function loadPracticePool(prisma: PrismaClient): Promise<Map<string, PracticeQuestion[]>> {
  const questions = await prisma.question.findMany({
    where: {
      purpose: "PRACTICE",
      isActive: true,
      subCategoryId: { not: null },
      options: { some: {} },
    },
    orderBy: { id: "asc" },
    include: {
      options: { orderBy: { order: "asc" }, select: { id: true, isCorrect: true, order: true } },
      subCategory: {
        select: {
          category: { select: { paper: { select: { id: true, code: true } } } },
        },
      },
    },
  });

  const byPaperCode = new Map<string, PracticeQuestion[]>();
  for (const q of questions) {
    const paper = q.subCategory?.category?.paper;
    if (!paper) continue;
    if (!q.options.some((o) => o.isCorrect)) continue;
    const row: PracticeQuestion = {
      id: q.id,
      paperId: paper.id,
      paperCode: paper.code,
      options: q.options,
    };
    const list = byPaperCode.get(paper.code) ?? [];
    list.push(row);
    byPaperCode.set(paper.code, list);
  }
  return byPaperCode;
}

function buildAttemptMath(pool: PracticeQuestion[], correctRatio: number, maxQ: number) {
  const questions = pool.slice(0, Math.min(maxQ, pool.length));
  const total = questions.length;
  if (total === 0) {
    return {
      questions: [] as PracticeQuestion[],
      total: 0,
      correctCount: 0,
      wrongCount: 0,
      scorePercent: 0,
      passed: false,
    };
  }
  let correctCount = Math.round(total * correctRatio);
  correctCount = Math.max(0, Math.min(total, correctCount));
  const wrongCount = total - correctCount;
  const scorePercent = Math.round((correctCount / total) * 1000) / 10;
  return {
    questions,
    total,
    correctCount,
    wrongCount,
    scorePercent,
    passed: scorePercent >= 50,
  };
}

function pickOptionId(q: PracticeQuestion, wantCorrect: boolean): string | null {
  if (wantCorrect) return q.options.find((o) => o.isCorrect)?.id ?? null;
  return q.options.find((o) => !o.isCorrect)?.id ?? q.options[0]?.id ?? null;
}

function printPlan(byPaperCode: Map<string, PracticeQuestion[]>) {
  console.log("Isolation:");
  console.log(`  user id prefix:  ${DEMO_ID_PREFIX}`);
  console.log(`  email pattern:   ${DEMO_EMAIL_PREFIX}NN@${DEMO_EMAIL_DOMAIN}`);
  console.log(`  bio marker:      ${DEMO_BIO_MARKER}`);
  console.log("");
  console.log(`Proposed demo students: ${DEMO_STUDENT_COUNT}`);

  let plannedAttempts = 0;
  let plannedResponses = 0;
  const scores: number[] = [];
  const paperSkips: string[] = [];

  for (let i = 0; i < DEMO_STUDENT_COUNT; i++) {
    const n = i + 1;
    const specs = attemptsForStudent(i);
    console.log(
      `  ${studentId(n)}  ${studentEmail(n)}  "${STUDENT_NAMES[i]}"  plannedAttempts=${specs.length}`
    );
    for (const spec of specs) {
      const pool = byPaperCode.get(spec.paperCode) ?? [];
      const math = buildAttemptMath(pool, spec.correctRatio, 10);
      if (math.total === 0) {
        paperSkips.push(spec.paperCode);
        console.log(`    ! skip ${spec.paperCode} — no PRACTICE questions with correct options`);
        continue;
      }
      plannedAttempts++;
      plannedResponses += math.total;
      scores.push(math.scorePercent);
      console.log(
        `    - ${attemptId(n, spec.paperCode, spec.attemptSeq)}  ${spec.paperCode}  ` +
          `score=${math.scorePercent}%  ${math.correctCount}/${math.total}  ` +
          `${spec.durationSec}s  dayOffset=${spec.dayOffset}`
      );
    }
  }

  const minS = scores.length ? Math.min(...scores) : 0;
  const maxS = scores.length ? Math.max(...scores) : 0;
  console.log("");
  console.log("Plan totals:");
  console.log(`  students:    ${DEMO_STUDENT_COUNT}`);
  console.log(`  attempts:    ${plannedAttempts}`);
  console.log(`  responses:   ${plannedResponses}`);
  console.log(`  score range: ${minS}% – ${maxS}%`);
  if (paperSkips.length) {
    console.log(`  papers without questions: ${[...new Set(paperSkips)].join(", ")}`);
  }
  console.log("");

  return { plannedAttempts, plannedResponses, minS, maxS };
}

function printStats(stats: Record<string, Counts>) {
  console.log(
    `${"entity".padEnd(14)} ${"created".padStart(8)} ${"updated".padStart(8)} ${"skipped".padStart(8)} ${"failed".padStart(8)}`
  );
  let t = empty();
  for (const [k, c] of Object.entries(stats)) {
    console.log(
      `${k.padEnd(14)} ${String(c.created).padStart(8)} ${String(c.updated).padStart(8)} ${String(c.skipped).padStart(8)} ${String(c.failed).padStart(8)}`
    );
    t.created += c.created;
    t.updated += c.updated;
    t.skipped += c.skipped;
    t.failed += c.failed;
  }
  console.log(
    `${"TOTAL".padEnd(14)} ${String(t.created).padStart(8)} ${String(t.updated).padStart(8)} ${String(t.skipped).padStart(8)} ${String(t.failed).padStart(8)}`
  );
  console.log("");
}

async function createDemo(prisma: PrismaClient, dryRun: boolean) {
  const byPaperCode = await loadPracticePool(prisma);
  const plan = printPlan(byPaperCode);

  if (plan.plannedAttempts === 0) {
    throw new Error(
      "No demo attempts can be built — restore local papers/practice questions first."
    );
  }

  const stats = {
    users: empty(),
    profiles: empty(),
    attempts: empty(),
    responses: empty(),
  };

  if (dryRun) {
    console.log("Dry-run complete. No data was written.");
    return stats;
  }

  for (let i = 0; i < DEMO_STUDENT_COUNT; i++) {
    const n = i + 1;
    const id = studentId(n);
    const email = studentEmail(n);
    const name = STUDENT_NAMES[i];

    try {
      const byEmail = await prisma.user.findUnique({ where: { email } });
      if (byEmail && !isDemoUser(byEmail)) {
        console.error(`  FAIL ${email}: owned by non-demo user ${byEmail.id}`);
        stats.users.failed++;
        continue;
      }

      const existing = await prisma.user.findUnique({ where: { id } });
      await prisma.user.upsert({
        where: { id },
        update: {
          name,
          email,
          passwordHash: DEMO_PASSWORD_HASH,
          role: "STUDENT",
          emailVerified: new Date(DEMO_EPOCH_MS),
        },
        create: {
          id,
          name,
          email,
          passwordHash: DEMO_PASSWORD_HASH,
          role: "STUDENT",
          emailVerified: new Date(DEMO_EPOCH_MS),
        },
      });
      if (existing) stats.users.updated++;
      else stats.users.created++;

      const existingProfile = await prisma.studentProfile.findUnique({ where: { userId: id } });
      await prisma.studentProfile.upsert({
        where: { userId: id },
        update: {
          bio: `${DEMO_BIO_MARKER} Synthetic Owner walkthrough student. Remove: npm run demo:results:remove`,
        },
        create: {
          id: profileId(n),
          userId: id,
          bio: `${DEMO_BIO_MARKER} Synthetic Owner walkthrough student. Remove: npm run demo:results:remove`,
        },
      });
      if (existingProfile) stats.profiles.updated++;
      else stats.profiles.created++;
    } catch (e) {
      stats.users.failed++;
      console.error(`  FAIL user ${id}:`, e instanceof Error ? e.message : e);
      continue;
    }

    for (const spec of attemptsForStudent(i)) {
      const attId = attemptId(n, spec.paperCode, spec.attemptSeq);
      const pool = byPaperCode.get(spec.paperCode) ?? [];
      const math = buildAttemptMath(pool, spec.correctRatio, 10);
      if (math.total === 0) {
        stats.attempts.skipped++;
        continue;
      }

      const paperId = math.questions[0].paperId;
      const submittedAt = new Date(
        DEMO_EPOCH_MS - spec.dayOffset * 24 * 60 * 60 * 1000 - n * 3600_000
      );
      const startedAt = new Date(submittedAt.getTime() - spec.durationSec * 1000);

      try {
        const existingAtt = await prisma.quizAttempt.findUnique({ where: { id: attId } });
        if (existingAtt && !existingAtt.id.startsWith(DEMO_ATT_PREFIX)) {
          stats.attempts.failed++;
          continue;
        }

        await prisma.quizAttempt.upsert({
          where: { id: attId },
          update: {
            userId: id,
            paperId,
            status: "SUBMITTED",
            startedAt,
            submittedAt,
            durationSec: spec.durationSec,
            totalQuestions: math.total,
            correctCount: math.correctCount,
            wrongCount: math.wrongCount,
            scorePercent: math.scorePercent,
            passed: math.passed,
            mockExamId: null,
          },
          create: {
            id: attId,
            userId: id,
            paperId,
            status: "SUBMITTED",
            startedAt,
            submittedAt,
            durationSec: spec.durationSec,
            totalQuestions: math.total,
            correctCount: math.correctCount,
            wrongCount: math.wrongCount,
            scorePercent: math.scorePercent,
            passed: math.passed,
          },
        });
        if (existingAtt) stats.attempts.updated++;
        else stats.attempts.created++;

        // Only rewrite responses for this demo attempt id
        await prisma.questionResponse.deleteMany({ where: { attemptId: attId } });

        for (let qi = 0; qi < math.questions.length; qi++) {
          const q = math.questions[qi];
          const wantCorrect = qi < math.correctCount;
          const optionId = pickOptionId(q, wantCorrect);
          if (!optionId) {
            stats.responses.failed++;
            continue;
          }
          await prisma.questionResponse.create({
            data: {
              id: responseId(attId, qi),
              attemptId: attId,
              questionId: q.id,
              selectedOptionId: optionId,
              selectedOptionIds: [optionId],
              isCorrect: wantCorrect,
              answeredAt: new Date(
                startedAt.getTime() + ((qi + 1) / math.total) * spec.durationSec * 1000
              ),
            },
          });
          stats.responses.created++;
        }
      } catch (e) {
        stats.attempts.failed++;
        console.error(`  FAIL attempt ${attId}:`, e instanceof Error ? e.message : e);
      }
    }
  }

  return stats;
}

async function removeDemo(prisma: PrismaClient, dryRun: boolean) {
  const demoUsers = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      id: { startsWith: DEMO_ID_PREFIX },
      email: { startsWith: DEMO_EMAIL_PREFIX, endsWith: `@${DEMO_EMAIL_DOMAIN}` },
    },
    select: {
      id: true,
      email: true,
      name: true,
      _count: { select: { attempts: true } },
    },
  });

  const safe = demoUsers.filter(isDemoUser);
  console.log(`Matched demo students (dual marker): ${safe.length}`);
  for (const u of safe) {
    console.log(`  - ${u.id}  ${u.email}  attempts=${u._count.attempts}`);
  }

  if (dryRun) {
    console.log("Dry-run remove: no rows deleted.");
    return { deleted: 0, failed: 0 };
  }

  let deleted = 0;
  let failed = 0;
  for (const u of safe) {
    try {
      // Cascade: profile, attempts, responses
      await prisma.user.delete({ where: { id: u.id } });
      deleted++;
    } catch (e) {
      failed++;
      console.error(`  FAIL delete ${u.id}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(
    `Deleted demo users: ${deleted} (cascade attempts/responses/profiles). Failed: ${failed}`
  );
  return { deleted, failed };
}

async function run() {
  const argv = process.argv;
  const wantRemove = argv.includes("--remove");
  const dryRun = argv.includes("--dry-run");

  const envPath = loadRestoreEnv();
  const target = assertLocalDatabaseUrl(process.env.DATABASE_URL);

  console.log("");
  console.log("=== create-local-demo-results (LOCALHOST ONLY) ===");
  console.log(
    dryRun
      ? wantRemove
        ? "Mode: DRY-RUN REMOVE"
        : "Mode: DRY-RUN CREATE"
      : wantRemove
        ? "Mode: REMOVE (demo markers only)"
        : "Mode: CREATE / upsert"
  );
  console.log(`Env file: ${envPath} (production .env is NOT used)`);
  console.log(`  host:     ${target.host}`);
  console.log(`  port:     ${target.port}`);
  console.log(`  database: ${target.database}`);
  console.log(`  user:     ${target.user}`);
  console.log(`  url:      ${target.rawUrlMasked}`);
  console.log("");
  console.log("Guarantees:");
  console.log("  - Never reads production .env");
  console.log("  - Never connects to Neon / remote hosts");
  console.log("  - Never creates Stripe / purchase / subscription rows");
  console.log("  - Remove only dual-marked demo-owner-user-* @ example.test");
  console.log("");

  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

  try {
    await prisma.$queryRaw`SELECT 1`;

    if (wantRemove) {
      await removeDemo(prisma, dryRun);
      return;
    }

    const practiceCount = await prisma.question.count({
      where: { purpose: "PRACTICE", isActive: true, options: { some: {} } },
    });
    if (practiceCount === 0) {
      throw new Error(
        "No PRACTICE questions with options found. Seed/restore local content first, then re-run."
      );
    }

    const stats = await createDemo(prisma, dryRun);
    if (!dryRun) {
      console.log("=== Results ===");
      printStats(stats);
      console.log("Local demo password (all): DemoStudent!1");
      console.log("Remove: npm run demo:results:remove");
    } else {
      console.log("Create later: npm run demo:results:create");
      console.log("Remove later: npm run demo:results:remove");
    }
  } finally {
    await prisma.$disconnect();
  }
}

function isExecutedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return /create-local-demo-results(\.[cm]?[jt]s)?$/i.test(path.basename(entry));
}

if (isExecutedDirectly()) {
  run().catch((err) => {
    console.error("");
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
