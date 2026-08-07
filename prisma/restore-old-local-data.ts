/**
 * LOCALHOST-ONLY restore of old static student-portal sample content.
 *
 * Safety:
 * - Loads ONLY `.env.localrestore` when this script is executed (never production `.env`)
 * - Refuses DATABASE_URL hosts other than localhost / 127.0.0.1 / ::1
 * - Refuses neon.tech, sslmode=require, and any remote host
 * - Never deletes users, purchases, subscriptions, payments, attempts, or responses
 * - Idempotent via external* IDs and paper codes
 *
 * Prerequisites:
 *   Create `.env.localrestore` in the project root (see .env.example if needed).
 *
 * Usage:
 *   npx tsx prisma/restore-old-local-data.ts --dry-run
 *   npx tsx prisma/restore-old-local-data.ts
 *   npm run restore:old-local:dry
 *   npm run restore:old-local
 */

import { config as loadEnv } from "dotenv";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import {
  DATA_SOURCES,
  MOCK_EXAM,
  PAPERS,
  PARTS,
  PRACTICE_QUESTION_INDEXES,
  TOPIC_DEFS,
  categoryExternalId,
  expectedCounts,
  fillTemplate,
  mockQuestionExternalId,
  optionIsCorrect,
  practiceQuestionExternalId,
  subCategoryExternalId,
  type PaperDef,
} from "./data/old-static-student-content";

/** Env file used only by this CLI (not the Next.js app, not production .env). */
const RESTORE_ENV_FILENAME = ".env.localrestore";

/**
 * Load local restore environment exclusively.
 * Does not read production `.env`. Overrides any inherited DATABASE_URL so a
 * Neon URL from the parent shell cannot accidentally target production.
 */
export function loadRestoreEnv(cwd: string = process.cwd()): string {
  const envPath = path.resolve(cwd, RESTORE_ENV_FILENAME);
  if (!fs.existsSync(envPath)) {
    throw new Error(
      `Missing ${RESTORE_ENV_FILENAME} at ${envPath}.\n` +
        `Create it with a local URL, e.g.\n` +
        `  DATABASE_URL="postgresql://postgres:password@localhost:5432/insightapex"\n` +
        `Do not use Neon. Production .env is left untouched.`
    );
  }

  // override: true so process.env.DATABASE_URL from a parent shell or Next tooling cannot win.
  const result = loadEnv({ path: envPath, override: true });
  if (result.error) {
    throw new Error(
      `Failed to load ${RESTORE_ENV_FILENAME}: ${result.error.message}`
    );
  }

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error(
      `${RESTORE_ENV_FILENAME} loaded but DATABASE_URL is empty. Set a local PostgreSQL URL.`
    );
  }

  return envPath;
}

// Intentionally do NOT load `.env` here — production Neon stays isolated.
// Env is loaded only when this file is executed as the CLI entrypoint (see bottom).

const dryRun = process.argv.includes("--dry-run");

type Counts = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
};

function emptyCounts(): Counts {
  return { created: 0, updated: 0, skipped: 0, failed: 0 };
}

type Stats = {
  parts: Counts;
  papers: Counts;
  categories: Counts;
  subCategories: Counts;
  practiceQuestions: Counts;
  answerOptions: Counts;
  mockExams: Counts;
  mockQuestions: Counts;
  mockLinks: Counts;
};

function emptyStats(): Stats {
  return {
    parts: emptyCounts(),
    papers: emptyCounts(),
    categories: emptyCounts(),
    subCategories: emptyCounts(),
    practiceQuestions: emptyCounts(),
    answerOptions: emptyCounts(),
    mockExams: emptyCounts(),
    mockQuestions: emptyCounts(),
    mockLinks: emptyCounts(),
  };
}

export type DbTarget = {
  host: string;
  port: string;
  database: string;
  user: string;
  rawUrlMasked: string;
};

/**
 * Parse + enforce localhost-only PostgreSQL.
 * Throws if Neon, remote, or sslmode=require.
 */
export function assertLocalDatabaseUrl(databaseUrl: string | undefined): DbTarget {
  if (!databaseUrl?.trim()) {
    throw new Error("DATABASE_URL is not set. Configure a local PostgreSQL URL in .env.");
  }

  const trimmed = databaseUrl.trim();
  const lower = trimmed.toLowerCase();

  if (lower.includes("neon.tech") || lower.includes("neon.database")) {
    throw new Error(
      "REFUSED: DATABASE_URL points at Neon. This script is localhost-only and will not touch production."
    );
  }

  // Explicit remote SSL requirement is a hard stop for this local restore tool.
  if (/[?&]sslmode=require(?:&|$)/i.test(trimmed)) {
    throw new Error(
      "REFUSED: DATABASE_URL uses sslmode=require (typical of remote/managed DBs). Localhost only."
    );
  }

  // Reject common cloud providers by keyword (defense in depth).
  const remoteMarkers = [
    "supabase.co",
    "aws.amazon.com",
    "rds.amazonaws.com",
    "azure.com",
    "digitalocean.com",
    "railway.app",
    "render.com",
    "planetscale.com",
    "cockroachlabs.cloud",
  ];
  for (const marker of remoteMarkers) {
    if (lower.includes(marker)) {
      throw new Error(
        `REFUSED: DATABASE_URL looks remote (${marker}). Only localhost PostgreSQL is allowed.`
      );
    }
  }

  let parsed: URL;
  try {
    // postgres:// schemes work with URL if we normalise
    const normalised = trimmed
      .replace(/^postgresql:/i, "http:")
      .replace(/^postgres:/i, "http:");
    parsed = new URL(normalised);
  } catch {
    throw new Error("REFUSED: DATABASE_URL could not be parsed.");
  }

  const host = (parsed.hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  const allowedHosts = new Set(["localhost", "127.0.0.1", "::1"]);

  if (!host || !allowedHosts.has(host)) {
    throw new Error(
      `REFUSED: database host "${host || "(empty)"}" is not localhost. ` +
        "Only localhost / 127.0.0.1 / ::1 are allowed for this restore."
    );
  }

  const port = parsed.port || "5432";
  const database = decodeURIComponent(
    (parsed.pathname || "").replace(/^\//, "").split("?")[0] || "(unknown)"
  );
  const user = decodeURIComponent(parsed.username || "(unknown)");

  return {
    host,
    port,
    database,
    user,
    rawUrlMasked: `postgresql://${user}:***@${host}:${port}/${database}`,
  };
}

function printPreamble(
  target: DbTarget,
  counts: ReturnType<typeof expectedCounts>,
  envPath: string
) {
  console.log("");
  console.log("=== restore-old-local-data (LOCALHOST ONLY) ===");
  console.log(dryRun ? "Mode: DRY-RUN (no writes)" : "Mode: LIVE WRITE");
  console.log(`Env file: ${envPath} (production .env is NOT used)`);
  console.log("");
  console.log("Detected database:");
  console.log(`  host:     ${target.host}`);
  console.log(`  port:     ${target.port}`);
  console.log(`  database: ${target.database}`);
  console.log(`  user:     ${target.user}`);
  console.log(`  url:      ${target.rawUrlMasked}`);
  console.log("");
  console.log("Source files / commits found:");
  for (const s of DATA_SOURCES) {
    console.log(`  - ${s.commit}  ${s.path}`);
    console.log(`    ${s.note}`);
  }
  console.log("");
  console.log("Proposed mapping (Topic → Category/SubCategory):");
  console.log("  Old Topic.title          → Category.title (same stem)");
  console.log('  (implicit)               → SubCategory "General" under each category');
  console.log("  Paper.code               → Paper.code upsert");
  console.log("  BT/MA/FA                 → Part PART_1 (Applied Knowledge)");
  console.log("  PM/FR                    → Part PART_2 (Applied Skills)");
  console.log("  SBR                      → Part PART_3 (Strategic Professional)");
  console.log("  Practice questions       → purpose=PRACTICE, accessLevel FREE_TRIAL|PREMIUM");
  console.log("  PM mock questions        → purpose=MOCK_EXAM + MockExamQuestion links");
  console.log("  Stable keys              → externalTopicId / externalSubTopicId / externalQuestionId");
  console.log("");
  console.log("Expected record counts (max new content if empty DB):");
  console.log(`  parts:               ${counts.parts}`);
  console.log(`  papers:              ${counts.papers}`);
  console.log(`  categories:          ${counts.categories}`);
  console.log(`  subCategories:       ${counts.subCategories}`);
  console.log(`  practice questions:  ${counts.practiceQuestions}`);
  console.log(`  mock exams:          ${counts.mockExams}`);
  console.log(`  mock questions:      ${counts.mockQuestions}`);
  console.log("");
  console.log("Unmapped / not restored (by design):");
  console.log("  - Users, profiles, sessions, accounts");
  console.log("  - Purchases, subscriptions, payments, UserAccess, Stripe IDs");
  console.log("  - QuizAttempt / QuestionResponse (student results)");
  console.log("  - Excel import batches / partner demo static data");
  console.log("  - Real ACCA bank content (none found in git history)");
  console.log("");
}

async function upsertPart(
  prisma: PrismaClient,
  stats: Stats,
  part: (typeof PARTS)[number]
) {
  if (dryRun) {
    const existing = await prisma.part.findUnique({ where: { code: part.code } });
    if (existing) stats.parts.skipped++;
    else stats.parts.created++;
    return existing?.id ?? `dry-part-${part.code}`;
  }
  try {
    const existing = await prisma.part.findUnique({ where: { code: part.code } });
    const row = await prisma.part.upsert({
      where: { code: part.code },
      update: {
        title: part.title,
        description: part.description,
        order: part.order,
        isActive: true,
      },
      create: {
        code: part.code,
        title: part.title,
        description: part.description,
        order: part.order,
        isActive: true,
      },
    });
    if (existing) stats.parts.updated++;
    else stats.parts.created++;
    return row.id;
  } catch (e) {
    stats.parts.failed++;
    console.error(`  FAIL part ${part.code}:`, e instanceof Error ? e.message : e);
    throw e;
  }
}

async function upsertPaper(
  prisma: PrismaClient,
  stats: Stats,
  paper: PaperDef,
  partId: string
) {
  const isPremium = Boolean(paper.premium);
  if (dryRun) {
    const existing = await prisma.paper.findUnique({ where: { code: paper.code } });
    if (existing) stats.papers.skipped++;
    else stats.papers.created++;
    return existing?.id ?? `dry-paper-${paper.code}`;
  }
  try {
    const existing = await prisma.paper.findUnique({ where: { code: paper.code } });
    const row = await prisma.paper.upsert({
      where: { code: paper.code },
      update: {
        title: paper.title,
        description: paper.description,
        partId,
        accessLevel: isPremium ? "PREMIUM" : "FREE",
        isPremium,
        priceCents: isPremium ? 499 : null,
        currency: "GBP",
        isActive: true,
      },
      create: {
        code: paper.code,
        title: paper.title,
        description: paper.description,
        partId,
        accessLevel: isPremium ? "PREMIUM" : "FREE",
        isPremium,
        priceCents: isPremium ? 499 : null,
        currency: "GBP",
        isActive: true,
      },
    });
    if (existing) stats.papers.updated++;
    else stats.papers.created++;
    return row.id;
  } catch (e) {
    stats.papers.failed++;
    console.error(`  FAIL paper ${paper.code}:`, e instanceof Error ? e.message : e);
    throw e;
  }
}

async function upsertCategoryTree(
  prisma: PrismaClient,
  stats: Stats,
  paper: PaperDef,
  paperId: string
) {
  for (const topic of TOPIC_DEFS) {
    const title = fillTemplate(topic.titleTemplate, paper);
    const description = fillTemplate(topic.descriptionTemplate, paper);
    const externalTopicId = categoryExternalId(paper.code, topic.slug);
    const externalSubTopicId = subCategoryExternalId(paper.code, topic.slug);

    let categoryId: string;
    if (dryRun) {
      const existing = await prisma.category.findFirst({
        where: { paperId, externalTopicId },
      });
      if (existing) stats.categories.skipped++;
      else stats.categories.created++;
      categoryId = existing?.id ?? `dry-cat-${externalTopicId}`;
    } else {
      try {
        const existing = await prisma.category.findFirst({
          where: { paperId, externalTopicId },
        });
        const row = existing
          ? await prisma.category.update({
              where: { id: existing.id },
              data: { title, description, isActive: true },
            })
          : await prisma.category.create({
              data: {
                paperId,
                title,
                description,
                externalTopicId,
                isActive: true,
              },
            });
        if (existing) stats.categories.updated++;
        else stats.categories.created++;
        categoryId = row.id;
      } catch (e) {
        stats.categories.failed++;
        console.error(`  FAIL category ${externalTopicId}:`, e instanceof Error ? e.message : e);
        continue;
      }
    }

    let subCategoryId: string;
    if (dryRun) {
      const existing = await prisma.subCategory.findFirst({
        where: { categoryId, externalSubTopicId },
      });
      if (existing) stats.subCategories.skipped++;
      else stats.subCategories.created++;
      subCategoryId = existing?.id ?? `dry-sub-${externalSubTopicId}`;
    } else {
      try {
        const existing = await prisma.subCategory.findFirst({
          where: { categoryId, externalSubTopicId },
        });
        const row = existing
          ? await prisma.subCategory.update({
              where: { id: existing.id },
              data: {
                title: "General",
                description: `Default sub category for ${title}.`,
                isActive: true,
              },
            })
          : await prisma.subCategory.create({
              data: {
                categoryId,
                title: "General",
                description: `Default sub category for ${title}.`,
                externalSubTopicId,
                isActive: true,
              },
            });
        if (existing) stats.subCategories.updated++;
        else stats.subCategories.created++;
        subCategoryId = row.id;
      } catch (e) {
        stats.subCategories.failed++;
        console.error(
          `  FAIL subCategory ${externalSubTopicId}:`,
          e instanceof Error ? e.message : e
        );
        continue;
      }
    }

    for (const q of PRACTICE_QUESTION_INDEXES) {
      await upsertPracticeQuestion(prisma, stats, {
        paperCode: paper.code,
        topicSlug: topic.slug,
        categoryTitle: title,
        subCategoryId,
        index: q.index,
        accessLevel: q.accessLevel,
        difficulty: q.difficulty,
      });
    }
  }
}

async function upsertPracticeQuestion(
  prisma: PrismaClient,
  stats: Stats,
  args: {
    paperCode: string;
    topicSlug: string;
    categoryTitle: string;
    subCategoryId: string;
    index: number;
    accessLevel: "FREE_TRIAL" | "PREMIUM";
    difficulty: "EASY" | "MEDIUM" | "HARD";
  }
) {
  const externalQuestionId = practiceQuestionExternalId(
    args.paperCode,
    args.topicSlug,
    args.index
  );
  const text = `Sample question ${args.index} for ${args.categoryTitle}: which of the following best applies?`;
  const explanation =
    "This is a placeholder explanation describing why the correct option is right and why the others are incorrect.";

  const optionRows = [0, 1, 2, 3].map((order) => ({
    text: `Option ${String.fromCharCode(65 + order)} description`,
    isCorrect: optionIsCorrect(args.index, order),
    order,
  }));

  // Validate correct answer exists before write
  if (!optionRows.some((o) => o.isCorrect)) {
    stats.practiceQuestions.failed++;
    console.error(`  FAIL question ${externalQuestionId}: no correct option (mapping error)`);
    return;
  }

  if (dryRun) {
    const existing = await prisma.question.findUnique({ where: { externalQuestionId } });
    if (existing) stats.practiceQuestions.skipped++;
    else stats.practiceQuestions.created++;
    return;
  }

  try {
    const existing = await prisma.question.findUnique({
      where: { externalQuestionId },
      include: { options: true },
    });

    if (existing) {
      await prisma.question.update({
        where: { id: existing.id },
        data: {
          subCategoryId: args.subCategoryId,
          text,
          explanation,
          difficulty: args.difficulty,
          marks: 2,
          accessLevel: args.accessLevel,
          purpose: "PRACTICE",
          isActive: true,
        },
      });
      // Replace options only if count mismatches; else update by order
      if (existing.options.length !== 4) {
        await prisma.answerOption.deleteMany({ where: { questionId: existing.id } });
        await prisma.answerOption.createMany({
          data: optionRows.map((o) => ({ ...o, questionId: existing.id })),
        });
        stats.answerOptions.created += 4;
      } else {
        for (const o of optionRows) {
          const match = existing.options.find((x) => x.order === o.order);
          if (match) {
            await prisma.answerOption.update({
              where: { id: match.id },
              data: { text: o.text, isCorrect: o.isCorrect },
            });
            stats.answerOptions.updated++;
          }
        }
      }
      stats.practiceQuestions.updated++;
    } else {
      await prisma.question.create({
        data: {
          externalQuestionId,
          subCategoryId: args.subCategoryId,
          text,
          explanation,
          difficulty: args.difficulty,
          marks: 2,
          accessLevel: args.accessLevel,
          purpose: "PRACTICE",
          isActive: true,
          options: { create: optionRows },
        },
      });
      stats.practiceQuestions.created++;
      stats.answerOptions.created += 4;
    }
  } catch (e) {
    stats.practiceQuestions.failed++;
    console.error(`  FAIL question ${externalQuestionId}:`, e instanceof Error ? e.message : e);
  }
}

async function upsertMockExam(
  prisma: PrismaClient,
  stats: Stats,
  pmPaperId: string
) {
  if (dryRun) {
    const existing = await prisma.mockExam.findUnique({ where: { id: MOCK_EXAM.stableId } });
    if (existing) stats.mockExams.skipped++;
    else stats.mockExams.created++;
  } else {
    try {
      const existing = await prisma.mockExam.findUnique({ where: { id: MOCK_EXAM.stableId } });
      await prisma.mockExam.upsert({
        where: { id: MOCK_EXAM.stableId },
        update: {
          paperId: pmPaperId,
          title: MOCK_EXAM.title,
          description: MOCK_EXAM.description,
          status: "PUBLISHED",
          accessLevel: "PREMIUM",
          isPremium: true,
          priceCents: 299,
          currency: "GBP",
          isActive: true,
          durationMinutes: MOCK_EXAM.durationMinutes,
          passMarkPercent: MOCK_EXAM.passMarkPercent,
        },
        create: {
          id: MOCK_EXAM.stableId,
          paperId: pmPaperId,
          title: MOCK_EXAM.title,
          description: MOCK_EXAM.description,
          durationMinutes: MOCK_EXAM.durationMinutes,
          passMarkPercent: MOCK_EXAM.passMarkPercent,
          status: "PUBLISHED",
          accessLevel: "PREMIUM",
          isPremium: true,
          priceCents: 299,
          currency: "GBP",
          isActive: true,
        },
      });
      if (existing) stats.mockExams.updated++;
      else stats.mockExams.created++;
    } catch (e) {
      stats.mockExams.failed++;
      console.error("  FAIL mock exam:", e instanceof Error ? e.message : e);
      return;
    }
  }

  for (let i = 1; i <= MOCK_EXAM.questionCount; i++) {
    const externalQuestionId = mockQuestionExternalId(i);
    const text = `PM mock exam Q${i}: which statement best reflects performance management under exam conditions?`;
    const optionRows = [0, 1, 2, 3].map((order) => ({
      text: `Option ${String.fromCharCode(65 + order)}`,
      isCorrect: optionIsCorrect(i, order),
      order,
    }));

    if (!optionRows.some((o) => o.isCorrect)) {
      stats.mockQuestions.failed++;
      console.error(`  FAIL mock Q${i}: no correct option`);
      continue;
    }

    if (dryRun) {
      const existing = await prisma.question.findUnique({ where: { externalQuestionId } });
      if (existing) stats.mockQuestions.skipped++;
      else stats.mockQuestions.created++;
      continue;
    }

    try {
      let questionId: string;
      const existing = await prisma.question.findUnique({
        where: { externalQuestionId },
        include: { options: true },
      });

      if (existing) {
        await prisma.question.update({
          where: { id: existing.id },
          data: {
            purpose: "MOCK_EXAM",
            subCategoryId: null,
            text,
            explanation: "Placeholder mock-exam explanation.",
            difficulty: "MEDIUM",
            marks: 2,
            accessLevel: "PREMIUM",
            isActive: true,
          },
        });
        if (existing.options.length !== 4) {
          await prisma.answerOption.deleteMany({ where: { questionId: existing.id } });
          await prisma.answerOption.createMany({
            data: optionRows.map((o) => ({ ...o, questionId: existing.id })),
          });
        }
        questionId = existing.id;
        stats.mockQuestions.updated++;
      } else {
        const created = await prisma.question.create({
          data: {
            externalQuestionId,
            purpose: "MOCK_EXAM",
            subCategoryId: null,
            text,
            explanation: "Placeholder mock-exam explanation.",
            difficulty: "MEDIUM",
            marks: 2,
            accessLevel: "PREMIUM",
            isActive: true,
            options: { create: optionRows },
          },
        });
        questionId = created.id;
        stats.mockQuestions.created++;
        stats.answerOptions.created += 4;
      }

      const link = await prisma.mockExamQuestion.findUnique({
        where: {
          mockExamId_questionId: {
            mockExamId: MOCK_EXAM.stableId,
            questionId,
          },
        },
      });
      if (link) {
        await prisma.mockExamQuestion.update({
          where: { id: link.id },
          data: { order: i - 1 },
        });
        stats.mockLinks.updated++;
      } else {
        await prisma.mockExamQuestion.create({
          data: {
            mockExamId: MOCK_EXAM.stableId,
            questionId,
            order: i - 1,
          },
        });
        stats.mockLinks.created++;
      }
    } catch (e) {
      stats.mockQuestions.failed++;
      console.error(`  FAIL mock Q${i}:`, e instanceof Error ? e.message : e);
    }
  }
}

function printStats(stats: Stats) {
  const keys = Object.keys(stats) as (keyof Stats)[];
  console.log("");
  console.log("=== Results ===");
  console.log(
    `${"entity".padEnd(20)} ${"created".padStart(8)} ${"updated".padStart(8)} ${"skipped".padStart(8)} ${"failed".padStart(8)}`
  );
  let totals = emptyCounts();
  for (const k of keys) {
    const c = stats[k];
    console.log(
      `${k.padEnd(20)} ${String(c.created).padStart(8)} ${String(c.updated).padStart(8)} ${String(c.skipped).padStart(8)} ${String(c.failed).padStart(8)}`
    );
    totals.created += c.created;
    totals.updated += c.updated;
    totals.skipped += c.skipped;
    totals.failed += c.failed;
  }
  console.log(
    `${"TOTAL".padEnd(20)} ${String(totals.created).padStart(8)} ${String(totals.updated).padStart(8)} ${String(totals.skipped).padStart(8)} ${String(totals.failed).padStart(8)}`
  );
  console.log("");
  if (dryRun) {
    console.log("Dry-run complete. No data was written.");
    console.log("Run: npm run restore:old-local");
  } else {
    console.log("Restore complete (content only). Users/billing/results were not modified.");
  }
}

async function main(envPath: string) {
  const target = assertLocalDatabaseUrl(process.env.DATABASE_URL);
  const counts = expectedCounts();
  printPreamble(target, counts, envPath);

  // Confirm incorrect options formula for sanity (question index 1 → option A)
  for (const i of [1, 2, 3, 4]) {
    const correctCount = [0, 1, 2, 3].filter((o) => optionIsCorrect(i, o)).length;
    if (correctCount !== 1) {
      throw new Error(
        `Internal mapping error: practice question index ${i} has ${correctCount} correct options`
      );
    }
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

  const stats = emptyStats();

  try {
    // Connectivity probe (read-only)
    await prisma.$queryRaw`SELECT 1`;

    const partIdByCode = new Map<string, string>();
    for (const part of PARTS) {
      const id = await upsertPart(prisma, stats, part);
      partIdByCode.set(part.code, id);
    }

    let pmPaperId: string | null = null;

    for (const paper of PAPERS) {
      const partId = partIdByCode.get(paper.partCode);
      if (!partId) {
        console.error(`Unmapped paper ${paper.code}: part ${paper.partCode} missing — STOP`);
        process.exit(1);
      }
      const paperId = await upsertPaper(prisma, stats, paper, partId);
      if (paper.code === "PM") pmPaperId = paperId;
      await upsertCategoryTree(prisma, stats, paper, paperId);
    }

    if (!pmPaperId) {
      console.error("PM paper missing after restore — cannot attach mock exam. STOP.");
      process.exit(1);
    }

    await upsertMockExam(prisma, stats, pmPaperId);

    printStats(stats);

    if (stats.parts.failed || stats.papers.failed || stats.practiceQuestions.failed) {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

function isExecutedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  // Only run when this file is the tsx/node entrypoint (not when imported for tests).
  return /restore-old-local-data(\.[cm]?[jt]s)?$/i.test(path.basename(entry));
}

if (isExecutedDirectly()) {
  // Isolate from production Neon (.env is never read by this CLI).
  let envPath: string;
  try {
    envPath = loadRestoreEnv();
  } catch (err) {
    console.error("");
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  main(envPath).catch((err) => {
    console.error("");
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
