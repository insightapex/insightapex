/**
 * ============================================================================
 * PARTNER DEMO STATIC DATA
 * ----------------------------------------------------------------------------
 * Client-demo fixtures for the Partner Portal. When enabled, partner GET APIs
 * return this data instead of live DB results.
 *
 * REMOVE LATER — when told: "remove all demo static data for partner"
 *   1. Delete this file (`src/lib/partner-demo-data.ts`)
 *   2. Remove every import / call of:
 *        isPartnerDemoStaticDataEnabled
 *        partnerDemo*
 *        PARTNER_DEMO_STATIC_DATA_ENABLED
 *   from partner API routes + services/partner/*
 * ============================================================================
 */

import { resolvePartnerTier } from "@/lib/partner-tiers";

type PartnerTrendRange = "1m" | "3m" | "6m";
type PartnerAnalyticsPeriod = "30d" | "90d" | "180d" | "365d";

/** Flip to false (or delete this module) to restore live Partner Portal data. */
export const PARTNER_DEMO_STATIC_DATA_ENABLED = true;

export function isPartnerDemoStaticDataEnabled(): boolean {
  return PARTNER_DEMO_STATIC_DATA_ENABLED;
}

export const PARTNER_DEMO_READ_ONLY_MESSAGE =
  "Partner demo mode is on — changes are disabled for the client walkthrough.";

// Stable demo IDs (used across list + detail pages)
const IDS = {
  partner: "demo-partner-apex-college",
  classA: "demo-class-cohort-a",
  classB: "demo-class-cohort-b",
  classC: "demo-class-evening",
  paper1: "demo-paper-fr",
  paper2: "demo-paper-aa",
  paper3: "demo-paper-fm",
  paper4: "demo-paper-sbr",
  lec1: "demo-lecturer-1",
  lec2: "demo-lecturer-2",
  lec3: "demo-lecturer-3",
  stu: (n: number) => `demo-student-${n}`,
} as const;

const DEMO_PARTNER_NAME = "Apex Business College";

const firstNames = [
  "Amina", "James", "Priya", "Oliver", "Fatima", "Noah", "Sofia", "Ethan",
  "Chloe", "Liam", "Maya", "Daniel", "Zoe", "Lucas", "Hannah", "Ryan",
  "Isla", "Marcus", "Elena", "Kai", "Grace", "Theo", "Nina", "Sam",
];
const lastNames = [
  "Okoro", "Chen", "Patel", "Wright", "Hassan", "Brooks", "Silva", "Nguyen",
  "Murray", "Singh", "Walsh", "Torres", "Adams", "Bennett", "Crowley", "Diaz",
];

function studentRow(n: number, classIds: string[], premium: boolean, attempts: number) {
  const fn = firstNames[(n - 1) % firstNames.length];
  const ln = lastNames[(n - 1) % lastNames.length];
  const id = IDS.stu(n);
  const classes = DEMO_CLASSES.filter((c) => classIds.includes(c.id)).map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
  }));
  const daysAgo = 5 + n * 3;
  const created = new Date();
  created.setDate(created.getDate() - daysAgo);

  return {
    id,
    name: `${fn} ${ln}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}@student.apexdemo.edu`,
    createdAt: created.toISOString(),
    emailVerified: true,
    attemptCount: attempts,
    classes,
    isPremium: premium,
  };
}

export const DEMO_CLASSES = [
  {
    id: IDS.classA,
    name: "FR Cohort A — Morning",
    description: "Full-time ACCA Financial Reporting cohort.",
    status: "ACTIVE" as const,
    createdAt: isoDaysAgo(120),
    studentCount: 18,
    passRate: 72.5,
    totalAttempts: 146,
  },
  {
    id: IDS.classB,
    name: "AA Cohort B — Intensive",
    description: "Audit & Assurance revision class.",
    status: "ACTIVE" as const,
    createdAt: isoDaysAgo(90),
    studentCount: 14,
    passRate: 64.2,
    totalAttempts: 98,
  },
  {
    id: IDS.classC,
    name: "Evening Revision Group",
    description: "Part-time evening mixed papers.",
    status: "ACTIVE" as const,
    createdAt: isoDaysAgo(60),
    studentCount: 11,
    passRate: 58.0,
    totalAttempts: 67,
  },
];

export const DEMO_PAPERS = [
  { id: IDS.paper1, code: "FR", title: "Financial Reporting" },
  { id: IDS.paper2, code: "AA", title: "Audit and Assurance" },
  { id: IDS.paper3, code: "FM", title: "Financial Management" },
  { id: IDS.paper4, code: "SBR", title: "Strategic Business Reporting" },
];

export const DEMO_STUDENTS = [
  studentRow(1, [IDS.classA], true, 24),
  studentRow(2, [IDS.classA], true, 19),
  studentRow(3, [IDS.classA], false, 11),
  studentRow(4, [IDS.classA], true, 28),
  studentRow(5, [IDS.classA, IDS.classC], true, 15),
  studentRow(6, [IDS.classA], false, 8),
  studentRow(7, [IDS.classB], true, 21),
  studentRow(8, [IDS.classB], true, 17),
  studentRow(9, [IDS.classB], false, 9),
  studentRow(10, [IDS.classB], true, 22),
  studentRow(11, [IDS.classB], false, 6),
  studentRow(12, [IDS.classC], true, 14),
  studentRow(13, [IDS.classC], false, 7),
  studentRow(14, [IDS.classC], true, 18),
  studentRow(15, [IDS.classA], true, 30),
  studentRow(16, [IDS.classB, IDS.classC], true, 12),
  studentRow(17, [], false, 3),
  studentRow(18, [IDS.classA], true, 16),
  studentRow(19, [IDS.classC], false, 5),
  studentRow(20, [IDS.classB], true, 20),
  studentRow(21, [IDS.classA], true, 25),
  studentRow(22, [IDS.classA], false, 10),
  studentRow(23, [IDS.classB], true, 13),
  studentRow(24, [IDS.classC], true, 11),
];

export const DEMO_LECTURERS = [
  {
    id: IDS.lec1,
    name: "Dr. Sarah Okonkwo",
    email: "sarah.okonkwo@apexdemo.edu",
    createdAt: isoDaysAgo(200),
    papers: [DEMO_PAPERS[0], DEMO_PAPERS[3]],
    classes: [{ id: IDS.classA, name: DEMO_CLASSES[0].name }],
  },
  {
    id: IDS.lec2,
    name: "Michael Trent",
    email: "michael.trent@apexdemo.edu",
    createdAt: isoDaysAgo(150),
    papers: [DEMO_PAPERS[1]],
    classes: [{ id: IDS.classB, name: DEMO_CLASSES[1].name }],
  },
  {
    id: IDS.lec3,
    name: "Aisha Rahman",
    email: "aisha.rahman@apexdemo.edu",
    createdAt: isoDaysAgo(80),
    papers: [DEMO_PAPERS[2], DEMO_PAPERS[0]],
    classes: [
      { id: IDS.classC, name: DEMO_CLASSES[2].name },
      { id: IDS.classA, name: DEMO_CLASSES[0].name },
    ],
  },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

/** Dashboard KPI totals (demo) — student list below stays a smaller sample for browsing. */
const TOTAL_STUDENTS = 240;
const PREMIUM_STUDENTS = 160;
const NEW_SIGNUPS_THIS_MONTH = 70;

export function partnerDemoOverview(partnerName?: string) {
  const totalStudents = TOTAL_STUDENTS;
  return {
    partner: { id: IDS.partner, name: partnerName?.trim() || DEMO_PARTNER_NAME },
    currency: "GBP",
    commissionRatePercent: 20,
    kpis: {
      totalEarningsCents: 1_485_000,
      currentMonthRevenueCents: 246_000,
      pendingCommissionCents: 322_000,
      newSignupsThisMonth: NEW_SIGNUPS_THIS_MONTH,
      totalStudents,
      premiumStudents: PREMIUM_STUDENTS,
      conversionRate: Math.round((PREMIUM_STUDENTS / totalStudents) * 1000) / 10,
    },
    tier: resolvePartnerTier(totalStudents),
    sources: [
      {
        id: "demo-src-school",
        name: "School link",
        slug: "school",
        signups: 110,
        premium: 78,
        conversionRate: 70.9,
      },
      {
        id: "demo-src-referral",
        name: "Student referral",
        slug: "referral",
        signups: 70,
        premium: 48,
        conversionRate: 68.6,
      },
      {
        id: "demo-src-direct",
        name: "Direct registration",
        slug: "direct",
        signups: 40,
        premium: 22,
        conversionRate: 55,
      },
      {
        id: "demo-src-campaign",
        name: "Open day campaign",
        slug: "campaign",
        signups: 20,
        premium: 12,
        conversionRate: 60,
      },
    ],
  };
}

export function partnerDemoGrowth(range: PartnerTrendRange) {
  const series =
    range === "1m"
      ? [
          { label: "1 Jul", signups: 0, premium: 0 },
          { label: "5 Jul", signups: 1, premium: 0 },
          { label: "9 Jul", signups: 2, premium: 1 },
          { label: "13 Jul", signups: 1, premium: 1 },
          { label: "17 Jul", signups: 0, premium: 0 },
          { label: "21 Jul", signups: 2, premium: 1 },
          { label: "26 Jul", signups: 1, premium: 1 },
        ]
      : range === "6m"
        ? [
            { label: "Feb", signups: 4, premium: 2 },
            { label: "Mar", signups: 5, premium: 3 },
            { label: "Apr", signups: 3, premium: 2 },
            { label: "May", signups: 6, premium: 4 },
            { label: "Jun", signups: 4, premium: 3 },
            { label: "Jul", signups: 7, premium: 5 },
          ]
        : [
            { label: "May", signups: 6, premium: 4 },
            { label: "Jun", signups: 4, premium: 3 },
            { label: "Jul", signups: 7, premium: 5 },
          ];

  return { range, points: series };
}

export function partnerDemoCommission(range: PartnerTrendRange) {
  const series =
    range === "1m"
      ? [
          { label: "1 Jul", commissionCents: 12_000 },
          { label: "5 Jul", commissionCents: 28_500 },
          { label: "9 Jul", commissionCents: 41_000 },
          { label: "13 Jul", commissionCents: 19_200 },
          { label: "17 Jul", commissionCents: 8_500 },
          { label: "21 Jul", commissionCents: 52_000 },
          { label: "26 Jul", commissionCents: 36_800 },
        ]
      : range === "6m"
        ? [
            { label: "Feb", commissionCents: 98_000 },
            { label: "Mar", commissionCents: 124_500 },
            { label: "Apr", commissionCents: 110_000 },
            { label: "May", commissionCents: 156_200 },
            { label: "Jun", commissionCents: 142_800 },
            { label: "Jul", commissionCents: 246_000 },
          ]
        : [
            { label: "May", commissionCents: 156_200 },
            { label: "Jun", commissionCents: 142_800 },
            { label: "Jul", commissionCents: 246_000 },
          ];

  return { range, points: series };
}

function demoCategoryStatus(avg: number) {
  if (avg >= 70) return "High Proficiency" as const;
  if (avg >= 50) return "Average" as const;
  return "Needs Improvement" as const;
}

export function partnerDemoAnalytics(period: PartnerAnalyticsPeriod) {
  return {
    period,
    passMark: 50,
    activeStudents: 186,
    inactiveStudents: TOTAL_STUDENTS - 186,
    premiumStudents: PREMIUM_STUDENTS,
    freeStudents: TOTAL_STUDENTS - PREMIUM_STUDENTS,
    papers: [
      { id: IDS.paper1, code: "FR", title: "Financial Reporting" },
      { id: IDS.paper2, code: "AA", title: "Audit and Assurance" },
      { id: IDS.paper3, code: "FM", title: "Financial Management" },
      { id: IDS.paper4, code: "SBR", title: "Strategic Business Reporting" },
    ],
    attemptsByPaper: [
      { code: "FR", title: "Financial Reporting", attempts: 128 },
      { code: "AA", title: "Audit and Assurance", attempts: 94 },
      { code: "FM", title: "Financial Management", attempts: 61 },
      { code: "SBR", title: "Strategic Business Reporting", attempts: 37 },
    ],
    passRateByPaper: [
      { code: "FR", title: "Financial Reporting", attempts: 128, passRate: 74.2 },
      { code: "AA", title: "Audit and Assurance", attempts: 94, passRate: 61.7 },
      { code: "FM", title: "Financial Management", attempts: 61, passRate: 67.2 },
      { code: "SBR", title: "Strategic Business Reporting", attempts: 37, passRate: 48.6 },
    ],
    categoryPerformance: [
      {
        paperId: IDS.paper1,
        paperCode: "FR",
        categoryId: "demo-fr-cat-1",
        categoryTitle: "Financial statements",
        subCategoryId: "demo-sub-1",
        subCategoryTitle: "Leases (IFRS 16)",
        averageScore: 46,
        status: demoCategoryStatus(46),
        studentsBelowPassing: 3,
        attemptCount: 48,
      },
      {
        paperId: IDS.paper1,
        paperCode: "FR",
        categoryId: "demo-fr-cat-2",
        categoryTitle: "Groups",
        subCategoryId: "demo-sub-4",
        subCategoryTitle: "Group financial statements",
        averageScore: 63,
        status: demoCategoryStatus(63),
        studentsBelowPassing: 2,
        attemptCount: 40,
      },
      {
        paperId: IDS.paper1,
        paperCode: "FR",
        categoryId: "demo-fr-cat-3",
        categoryTitle: "Interpretation",
        subCategoryId: "demo-sub-fr-ratio",
        subCategoryTitle: "Ratio analysis",
        averageScore: 74,
        status: demoCategoryStatus(74),
        studentsBelowPassing: 1,
        attemptCount: 36,
      },
      {
        paperId: IDS.paper2,
        paperCode: "AA",
        categoryId: "demo-aa-cat-1",
        categoryTitle: "Audit framework",
        subCategoryId: "demo-sub-2",
        subCategoryTitle: "Audit risk & response",
        averageScore: 48,
        status: demoCategoryStatus(48),
        studentsBelowPassing: 4,
        attemptCount: 42,
      },
      {
        paperId: IDS.paper2,
        paperCode: "AA",
        categoryId: "demo-aa-cat-2",
        categoryTitle: "Internal control",
        subCategoryId: "demo-sub-5",
        subCategoryTitle: "Internal controls",
        averageScore: 58,
        status: demoCategoryStatus(58),
        studentsBelowPassing: 2,
        attemptCount: 38,
      },
      {
        paperId: IDS.paper3,
        paperCode: "FM",
        categoryId: "demo-fm-cat-1",
        categoryTitle: "Working capital",
        subCategoryId: "demo-sub-3",
        subCategoryTitle: "Working capital management",
        averageScore: 55,
        status: demoCategoryStatus(55),
        studentsBelowPassing: 3,
        attemptCount: 34,
      },
      {
        paperId: IDS.paper4,
        paperCode: "SBR",
        categoryId: "demo-sbr-cat-1",
        categoryTitle: "Financial instruments",
        subCategoryId: "demo-sub-sbr-1",
        subCategoryTitle: "Complex instruments",
        averageScore: 44,
        status: demoCategoryStatus(44),
        studentsBelowPassing: 5,
        attemptCount: 28,
      },
    ],
    weakestSubcategories: [
      {
        id: "demo-sub-1",
        title: "Leases (IFRS 16)",
        paperCode: "FR",
        wrongCount: 86,
        total: 140,
        missRate: 61.4,
      },
      {
        id: "demo-sub-2",
        title: "Audit risk & response",
        paperCode: "AA",
        wrongCount: 72,
        total: 125,
        missRate: 57.6,
      },
      {
        id: "demo-sub-3",
        title: "Working capital management",
        paperCode: "FM",
        wrongCount: 54,
        total: 98,
        missRate: 55.1,
      },
      {
        id: "demo-sub-4",
        title: "Group financial statements",
        paperCode: "FR",
        wrongCount: 61,
        total: 118,
        missRate: 51.7,
      },
      {
        id: "demo-sub-5",
        title: "Internal controls",
        paperCode: "AA",
        wrongCount: 45,
        total: 92,
        missRate: 48.9,
      },
    ],
  };
}

export function partnerDemoReports() {
  return {
    totalStudents: TOTAL_STUDENTS,
    activeStudents: 186,
    premiumStudents: PREMIUM_STUDENTS,
    totalQuizAttempts: 2840,
    passRate: 67.8,
    weakestPapers: [
      { code: "SBR", title: "Strategic Business Reporting", passRate: 48.6, attempts: 37 },
      { code: "AA", title: "Audit and Assurance", passRate: 61.7, attempts: 94 },
      { code: "FM", title: "Financial Management", passRate: 67.2, attempts: 61 },
    ],
    strongestPapers: [
      { code: "FR", title: "Financial Reporting", passRate: 74.2, attempts: 128 },
      { code: "FM", title: "Financial Management", passRate: 67.2, attempts: 61 },
      { code: "AA", title: "Audit and Assurance", passRate: 61.7, attempts: 94 },
    ],
  };
}

export function partnerDemoStudents(opts?: {
  q?: string;
  classId?: string | null;
  premium?: string | null;
}) {
  let list = [...DEMO_STUDENTS];
  const q = opts?.q?.trim().toLowerCase() ?? "";
  if (opts?.classId) {
    list = list.filter((s) => s.classes.some((c) => c.id === opts.classId));
  }
  if (q) {
    list = list.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }
  if (opts?.premium === "true") list = list.filter((s) => s.isPremium);
  if (opts?.premium === "false") list = list.filter((s) => !s.isPremium);
  return { students: list };
}

export function partnerDemoStudentDetail(id: string) {
  const base = DEMO_STUDENTS.find((s) => s.id === id);
  if (!base) return null;

  return {
    student: {
      id: base.id,
      name: base.name,
      email: base.email,
      createdAt: base.createdAt,
      emailVerified: base.emailVerified,
      isPremium: base.isPremium,
      classes: base.classes,
      attempts: [
        {
          id: `${id}-att-1`,
          scorePercent: 78,
          passed: true,
          submittedAt: isoHoursAgo(18),
          totalQuestions: 40,
          correctCount: 31,
          paper: DEMO_PAPERS[0],
        },
        {
          id: `${id}-att-2`,
          scorePercent: 62,
          passed: true,
          submittedAt: isoDaysAgo(3),
          totalQuestions: 40,
          correctCount: 25,
          paper: DEMO_PAPERS[1],
        },
        {
          id: `${id}-att-3`,
          scorePercent: 48,
          passed: false,
          submittedAt: isoDaysAgo(8),
          totalQuestions: 40,
          correctCount: 19,
          paper: DEMO_PAPERS[2],
        },
      ],
      weakAreas: [
        {
          id: "demo-weak-1",
          title: "Leases (IFRS 16)",
          paperCode: "FR",
          count: 9,
        },
        {
          id: "demo-weak-2",
          title: "Group financial statements",
          paperCode: "FR",
          count: 7,
        },
        {
          id: "demo-weak-3",
          title: "Audit risk & response",
          paperCode: "AA",
          count: 5,
        },
      ],
    },
  };
}

export function partnerDemoClasses() {
  return { classes: DEMO_CLASSES };
}

export function partnerDemoClassDetail(id: string) {
  const cls = DEMO_CLASSES.find((c) => c.id === id);
  if (!cls) return null;

  const students = DEMO_STUDENTS.filter((s) => s.classes.some((c) => c.id === id)).map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    enrolledAt: s.createdAt,
  }));

  return {
    class: {
      id: cls.id,
      name: cls.name,
      description: cls.description,
      status: cls.status,
      createdAt: cls.createdAt,
      students,
      performance: {
        classId: cls.id,
        name: cls.name,
        studentCount: students.length,
        totalAttempts: cls.totalAttempts,
        passRate: cls.passRate,
        weakPapers: [
          { code: "AA", title: "Audit and Assurance", attempts: 28, passRate: 54.0 },
          { code: "FM", title: "Financial Management", attempts: 18, passRate: 61.1 },
          { code: "FR", title: "Financial Reporting", attempts: 42, passRate: 71.4 },
        ],
      },
    },
  };
}

export function partnerDemoLecturers() {
  return { lecturers: DEMO_LECTURERS };
}

export function partnerDemoSettings(partnerName?: string) {
  return {
    partner: {
      id: IDS.partner,
      name: partnerName?.trim() || DEMO_PARTNER_NAME,
      slug: "apex-business-college",
      logoUrl: null as string | null,
      contactEmail: "partnerships@apexdemo.edu",
      status: "ACTIVE",
      allowPublicRegistration: true,
      createdAt: isoDaysAgo(365),
      studentCount: TOTAL_STUDENTS,
      classCount: DEMO_CLASSES.length,
      adminCount: 2,
    },
  };
}

export function partnerDemoAssignmentOptions() {
  return {
    papers: DEMO_PAPERS,
    classes: DEMO_CLASSES.filter((c) => c.status === "ACTIVE").map((c) => ({
      id: c.id,
      name: c.name,
    })),
  };
}
