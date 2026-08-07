/**
 * Old static student-portal content extracted from Git history seed scripts.
 *
 * Sources (commit SHAs on this repo):
 * - d06ace7  Initial InsightApex seed — Paper + Topic + 4 sample questions each
 * - 0641d50  First testing seed — + SBR, plans sketch, PM mock exam links
 * - d098043 / HEAD prisma/seed.ts — same sample stems under Part→Category→SubCategory
 *
 * No separate student-portal JSON banks, fixtures, or rich ACCA question dumps exist
 * elsewhere in the repository or history — only these seed placeholders.
 *
 * This module is pure data (no DB I/O).
 */

export const DATA_SOURCES = [
  {
    commit: "d06ace7",
    path: "prisma/seed.ts",
    note: "Initial Topic-based sample papers BT/MA/FA/PM/FR (3 topics × 4 questions)",
  },
  {
    commit: "0641d50",
    path: "prisma/seed.ts",
    note: "Added SBR premium paper + PM mock exam shell",
  },
  {
    commit: "HEAD",
    path: "prisma/seed.ts",
    note: "Current seed maps same sample stems to Category + SubCategory + MOCK_EXAM purpose",
  },
] as const;

/** Stable prefix for all restored external IDs (idempotent upsert keys). */
export const OLD_STATIC_PREFIX = "old-static";

export type PartDef = {
  code: string;
  title: string;
  description: string;
  order: number;
};

export type PaperDef = {
  code: string;
  title: string;
  description: string;
  partCode: string;
  premium?: boolean;
};

export type CategoryTopicDef = {
  /** Title from old Topic rows */
  titleTemplate: string; // uses {code} {title}
  descriptionTemplate: string;
  slug: string;
};

export type PracticeQuestionDef = {
  index: number; // 1..4
  accessLevel: "FREE_TRIAL" | "PREMIUM";
  difficulty: "EASY" | "MEDIUM" | "HARD";
};

export const PARTS: PartDef[] = [
  {
    code: "PART_1",
    title: "Applied Knowledge",
    description:
      "Foundational ACCA papers including Business and Technology, Management Accounting, and Financial Accounting.",
    order: 1,
  },
  {
    code: "PART_2",
    title: "Applied Skills",
    description: "Intermediate ACCA papers building on applied knowledge.",
    order: 2,
  },
  {
    code: "PART_3",
    title: "Strategic Professional",
    description: "Advanced strategic professional level papers.",
    order: 3,
  },
];

/** Old seed papers — same titles/descriptions as d06ace7 + SBR from 0641d50. */
export const PAPERS: PaperDef[] = [
  {
    code: "BT",
    title: "Business and Technology",
    description: "Foundations of business organisation, governance, and technology.",
    partCode: "PART_1",
  },
  {
    code: "MA",
    title: "Management Accounting",
    description: "Core management accounting techniques for planning and control.",
    partCode: "PART_1",
  },
  {
    code: "FA",
    title: "Financial Accounting",
    description: "Principles of double-entry bookkeeping and financial statements.",
    partCode: "PART_1",
  },
  {
    code: "PM",
    title: "Performance Management",
    description: "Advanced management accounting for decision-making and performance.",
    partCode: "PART_2",
  },
  {
    code: "FR",
    title: "Financial Reporting",
    description: "Preparation and interpretation of financial statements under IFRS.",
    partCode: "PART_2",
  },
  {
    code: "SBR",
    title: "Strategic Business Reporting",
    description: "Advanced financial reporting and interpretation.",
    partCode: "PART_3",
    premium: true,
  },
];

/**
 * Old "Topic" rows from the Topic model — mapped to Category + SubCategory "General".
 * Order matches historical seed.
 */
export const TOPIC_DEFS: CategoryTopicDef[] = [
  {
    slug: "fundamentals",
    titleTemplate: "{code} Fundamentals",
    descriptionTemplate: "Introductory concepts for {title}.",
  },
  {
    slug: "core-techniques",
    titleTemplate: "{code} Core Techniques",
    descriptionTemplate: "Key techniques and calculations for {title}.",
  },
  {
    slug: "applied-scenarios",
    titleTemplate: "{code} Applied Scenarios",
    descriptionTemplate: "Applying {title} concepts to exam-style scenarios.",
  },
];

/** 4 sample questions per topic — correct option index = (i % 4) or A for i=1 etc. (seed formula). */
export const PRACTICE_QUESTION_INDEXES: PracticeQuestionDef[] = [1, 2, 3, 4].map((i) => ({
  index: i,
  // Later seed (d098043+) used Q1 free trial + premium remainder for portal browsing.
  accessLevel: i === 1 ? "FREE_TRIAL" : "PREMIUM",
  difficulty: i % 3 === 0 ? "HARD" : i % 2 === 0 ? "MEDIUM" : "EASY",
}));

export const MOCK_EXAM = {
  stableId: "seed-premium-mock-pm",
  paperCode: "PM",
  title: "PM Full Mock Exam",
  description: "A full-length Performance Management mock exam with timed conditions.",
  durationMinutes: 40,
  passMarkPercent: 50,
  questionCount: 8,
} as const;

export function fillTemplate(template: string, paper: PaperDef): string {
  return template.replace(/\{code\}/g, paper.code).replace(/\{title\}/g, paper.title);
}

export function categoryExternalId(paperCode: string, topicSlug: string): string {
  return `${OLD_STATIC_PREFIX}:${paperCode}:topic:${topicSlug}`;
}

export function subCategoryExternalId(paperCode: string, topicSlug: string): string {
  return `${OLD_STATIC_PREFIX}:${paperCode}:topic:${topicSlug}:general`;
}

export function practiceQuestionExternalId(
  paperCode: string,
  topicSlug: string,
  index: number
): string {
  return `${OLD_STATIC_PREFIX}:${paperCode}:${topicSlug}:q${index}`;
}

export function mockQuestionExternalId(index: number): string {
  return `${OLD_STATIC_PREFIX}:mock:pm:q${index}`;
}

/** Correct answer option order 0–3 using original seed formula: isCorrect when i % 4 === order+1 (mod). */
export function optionIsCorrect(questionIndex: number, optionOrder: number): boolean {
  // Seed: isCorrect: i % 4 === 1 for order 0, === 2 for order 1, === 3 for order 2, === 0 for order 3
  const targets = [1, 2, 3, 0];
  return questionIndex % 4 === targets[optionOrder];
}

export function expectedCounts() {
  const papers = PAPERS.length;
  const categories = papers * TOPIC_DEFS.length;
  const subCategories = categories;
  const practiceQuestions = categories * PRACTICE_QUESTION_INDEXES.length;
  const mockQuestions = MOCK_EXAM.questionCount;
  return {
    parts: PARTS.length,
    papers,
    categories,
    subCategories,
    practiceQuestions,
    mockExams: 1,
    mockQuestions,
    optionsPractice: practiceQuestions * 4,
    optionsMock: mockQuestions * 4,
  };
}
