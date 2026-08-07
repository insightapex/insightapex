/**
 * LOCALHOST-ONLY attempt to restore old student users + quiz result rows.
 *
 * FINDING (repository / Git history search):
 *   No authentic QuizAttempt, QuestionResponse, or Owner-dashboard score seed data
 *   exists in any commit of this project. Attempts have only ever been created at
 *   runtime via the quiz APIs. Seeds create a few demo User accounts (e.g. Sarah)
 *   but never historical attempts, responses, or scores.
 *
 * Therefore this script NEVER invents students, attempts, answers, or scores.
 * It verifies localhost isolation and exits with a clear “unavailable” report.
 *
 * Usage:
 *   npm run restore:old-results:dry
 *   npm run restore:old-results
 *
 * See also: shared localhost guard via .env.localrestore only.
 */

import { config as loadEnv } from "dotenv";
import fs from "fs";
import path from "path";

const RESTORE_ENV_FILENAME = ".env.localrestore";
const dryRun = process.argv.includes("--dry-run");

/** Auth sources searched (read-only discovery; no result payloads found). */
const SEARCH_REPORT = {
  gitCommitsChecked: [
    "d06ace7 — Initial commit: InsightApex ACCA quiz platform.",
    "0641d50 — first testin",
    "d098043 — Ship InsightApex platform updates…",
    "ea7ebb1 — Complete billing and question import testing",
    "HEAD — current tree",
  ],
  sourceFilesInspected: [
    {
      path: "prisma/seed.ts",
      commits: ["d06ace7", "0641d50", "d098043", "ea7ebb1", "HEAD"],
      finding:
        "Creates demo users (Owner, content admin, student@insightapex.com / Sarah, partners). " +
        "Zero QuizAttempt / QuestionResponse / score rows in every version.",
    },
    {
      path: "src/app/api/quiz/start/route.ts",
      commits: ["0641d50+", "HEAD"],
      finding:
        "Runtime create of QuizAttempt for live practice only — not historical seed data.",
    },
    {
      path: "src/app/api/quiz/submit/route.ts",
      commits: ["HEAD"],
      finding:
        "Runtime scoring/update of QuizAttempt + QuestionResponse — not dumpable history.",
    },
    {
      path: "src/app/api/admin/overview/route.ts",
      commits: ["HEAD"],
      finding:
        "Owner dashboard aggregates live Prisma counts (students, SUBMITTED attempts, avg score). " +
        "No embedded demo fixtures.",
    },
    {
      path: "src/app/api/admin/results/route.ts",
      commits: ["HEAD"],
      finding: "Lists real QuizAttempt rows from DB; no static sample list.",
    },
    {
      path: "src/lib/lecturer-demo-data.ts",
      commits: ["HEAD"],
      finding:
        "Synthetic Lecturer-portal walkthrough scores (UI only). Not Prisma QuizAttempt " +
        "and not used by Owner dashboard. Not valid for this restore.",
    },
    {
      path: "src/lib/partner-demo-data.ts",
      commits: ["HEAD"],
      finding:
        "Synthetic Partner-portal metrics. Not Owner dashboard. Not valid for this restore.",
    },
    {
      path: "scripts/link-sarah-nlafaa.ts",
      commits: ["HEAD"],
      finding: "Links Sarah to NLAFAA school only — no attempts/scores.",
    },
    {
      path: "scripts/check-sarah-notifications.ts",
      commits: ["HEAD"],
      finding: "Notification probe for student@insightapex.com — no attempts.",
    },
    {
      path: "prisma/migrations/**",
      commits: ["schema history"],
      finding: "DDL for QuizAttempt / QuestionResponse tables only — no data inserts.",
    },
  ],
  prismaModels: {
    User: "Seed creates a small fixed set of accounts (not multi-student history).",
    StudentProfile: "Optional bio for demo student only.",
    QuizAttempt: "No seed/createMany in any seed.ts revision.",
    QuestionResponse: "No seed data in any revision.",
    Certificate: "No seed data.",
  },
  countsFound: {
    studentsInSeedData: 1,
    studentEmails: ["student@insightapex.com"],
    quizAttempts: 0,
    questionResponses: 0,
    scoreRecords: 0,
  },
} as const;

type DbTarget = {
  host: string;
  port: string;
  database: string;
  user: string;
  rawUrlMasked: string;
};

function loadRestoreEnv(cwd: string = process.cwd()): string {
  const envPath = path.resolve(cwd, RESTORE_ENV_FILENAME);
  if (!fs.existsSync(envPath)) {
    throw new Error(
      `Missing ${RESTORE_ENV_FILENAME} at ${envPath}.\n` +
        `Create it with local DATABASE_URL only (never Neon / production .env).`
    );
  }
  const result = loadEnv({ path: envPath, override: true });
  if (result.error) {
    throw new Error(`Failed to load ${RESTORE_ENV_FILENAME}: ${result.error.message}`);
  }
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error(`${RESTORE_ENV_FILENAME} loaded but DATABASE_URL is empty.`);
  }
  return envPath;
}

function assertLocalDatabaseUrl(databaseUrl: string | undefined): DbTarget {
  if (!databaseUrl?.trim()) {
    throw new Error("DATABASE_URL is not set.");
  }
  const trimmed = databaseUrl.trim();
  const lower = trimmed.toLowerCase();

  if (lower.includes("neon.tech") || lower.includes("neon.database")) {
    throw new Error(
      "REFUSED: DATABASE_URL points at Neon. This script is localhost-only."
    );
  }
  if (/[?&]sslmode=require(?:&|$)/i.test(trimmed)) {
    throw new Error(
      "REFUSED: DATABASE_URL uses sslmode=require. Localhost only."
    );
  }
  for (const marker of [
    "supabase.co",
    "rds.amazonaws.com",
    "azure.com",
    "railway.app",
    "render.com",
  ]) {
    if (lower.includes(marker)) {
      throw new Error(`REFUSED: DATABASE_URL looks remote (${marker}).`);
    }
  }

  let parsed: URL;
  try {
    const normalised = trimmed
      .replace(/^postgresql:/i, "http:")
      .replace(/^postgres:/i, "http:");
    parsed = new URL(normalised);
  } catch {
    throw new Error("REFUSED: DATABASE_URL could not be parsed.");
  }

  const host = (parsed.hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(
      `REFUSED: host "${host || "(empty)"}" is not localhost / 127.0.0.1 / ::1.`
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

function printReport(envPath: string, target: DbTarget) {
  console.log("");
  console.log("=== restore-old-local-results (LOCALHOST ONLY) ===");
  console.log(dryRun ? "Mode: DRY-RUN (would not write)" : "Mode: LIVE requested");
  console.log(`Env file: ${envPath} (production .env is NOT used)`);
  console.log("");
  console.log("Detected database:");
  console.log(`  host:     ${target.host}`);
  console.log(`  port:     ${target.port}`);
  console.log(`  database: ${target.database}`);
  console.log(`  user:     ${target.user}`);
  console.log(`  url:      ${target.rawUrlMasked}`);
  console.log("");
  console.log("Git commits checked:");
  for (const c of SEARCH_REPORT.gitCommitsChecked) {
    console.log(`  - ${c}`);
  }
  console.log("");
  console.log("Source files / findings:");
  for (const f of SEARCH_REPORT.sourceFilesInspected) {
    console.log(`  • ${f.path}`);
    console.log(`      commits: ${f.commits.join(", ")}`);
    console.log(`      ${f.finding}`);
  }
  console.log("");
  console.log("Model comparison:");
  for (const [model, note] of Object.entries(SEARCH_REPORT.prismaModels)) {
    console.log(`  ${model}: ${note}`);
  }
  console.log("");
  console.log("Extractable historical counts (from repo seeds — not invented):");
  console.log(`  students (seed accounts only): ${SEARCH_REPORT.countsFound.studentsInSeedData}`);
  console.log(
    `  student emails: ${SEARCH_REPORT.countsFound.studentEmails.join(", ") || "(none)"}`
  );
  console.log(`  quiz attempts (seeded):        ${SEARCH_REPORT.countsFound.quizAttempts}`);
  console.log(`  question responses (seeded):   ${SEARCH_REPORT.countsFound.questionResponses}`);
  console.log(`  score records (seeded):        ${SEARCH_REPORT.countsFound.scoreRecords}`);
  console.log("");
  console.log("Unmapped / unavailable:");
  console.log("  - No historical attempt IDs, paper/question FK dumps, or date series in git.");
  console.log("  - Owner dashboard data is live-only (written when users take quizzes).");
  console.log("  - Lecturer/partner demo fixtures are synthetic UI data — not restored here.");
  console.log("");
  console.log("=== Results (writes) ===");
  console.log(
    `${"entity".padEnd(22)} ${"created".padStart(8)} ${"updated".padStart(8)} ${"skipped".padStart(8)} ${"failed".padStart(8)}`
  );
  console.log(
    `${"students".padEnd(22)} ${"0".padStart(8)} ${"0".padStart(8)} ${"0".padStart(8)} ${"0".padStart(8)}`
  );
  console.log(
    `${"quizAttempts".padEnd(22)} ${"0".padStart(8)} ${"0".padStart(8)} ${"0".padStart(8)} ${"0".padStart(8)}`
  );
  console.log(
    `${"questionResponses".padEnd(22)} ${"0".padStart(8)} ${"0".padStart(8)} ${"0".padStart(8)} ${"0".padStart(8)}`
  );
  console.log(
    `${"TOTAL".padEnd(22)} ${"0".padStart(8)} ${"0".padStart(8)} ${"0".padStart(8)} ${"0".padStart(8)}`
  );
  console.log("");
  console.log("UNAVAILABLE: Genuine old student/result/score data was not found in the repository.");
  console.log("This script will not invent attempts or scores (per project safety rules).");
  console.log("");
  console.log("How Owner dashboard results appear:");
  console.log("  1. Students take practice/mock quizzes on the app (creates QuizAttempt).");
  console.log("  2. /api/quiz/submit stores responses + scorePercent/correctCount/wrongCount.");
  console.log("  3. Owner → Results / Overview read those live rows.");
  console.log("");
}

function main() {
  const envPath = loadRestoreEnv();
  const target = assertLocalDatabaseUrl(process.env.DATABASE_URL);
  printReport(envPath, target);

  // Non-zero exit so CI / operators do not treat empty restore as success.
  process.exit(2);
}

function isExecutedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return /restore-old-local-results(\.[cm]?[jt]s)?$/i.test(path.basename(entry));
}

if (isExecutedDirectly()) {
  try {
    main();
  } catch (err) {
    console.error("");
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
