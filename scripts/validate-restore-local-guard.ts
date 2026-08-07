/**
 * Local smoke checks for restore-old-local-data safety (no DB writes).
 * Run: npx tsx scripts/validate-restore-local-guard.ts
 */
import { assertLocalDatabaseUrl } from "../prisma/restore-old-local-data";
import {
  DATA_SOURCES,
  expectedCounts,
  optionIsCorrect,
} from "../prisma/data/old-static-student-content";

const cases: Array<[string, string, boolean]> = [
  ["postgresql://u:p@localhost:5432/insightapex", "ok local", true],
  ["postgresql://u:p@127.0.0.1:5432/insightapex", "ok 127", true],
  [
    "postgresql://u:p@ep-xx.eu-west-2.aws.neon.tech/neondb?sslmode=require",
    "refuse neon+ssl",
    false,
  ],
  ["postgresql://u:p@db.example.com:5432/x", "refuse remote", false],
  ["postgresql://u:p@localhost:5432/x?sslmode=require", "refuse ssl on local", false],
];

let failed = 0;

for (const [url, label, shouldOk] of cases) {
  try {
    const t = assertLocalDatabaseUrl(url);
    if (!shouldOk) {
      console.error("FAIL expected refuse:", label, t);
      failed++;
    } else {
      console.log("OK allow", label, "->", t.host, t.database);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (shouldOk) {
      console.error("FAIL expected allow:", label, message);
      failed++;
    } else {
      console.log("OK refuse", label, "-", message.slice(0, 100));
    }
  }
}

for (const i of [1, 2, 3, 4]) {
  const n = [0, 1, 2, 3].filter((o) => optionIsCorrect(i, o)).length;
  if (n !== 1) {
    console.error("option formula fail", i);
    failed++;
  } else {
    console.log("OK option formula q", i);
  }
}

console.log("sources", DATA_SOURCES.length);
console.log("expected", JSON.stringify(expectedCounts()));
console.log(failed ? "FAILED" : "ALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
