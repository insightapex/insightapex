/**
 * ============================================================================
 * LECTURER / TEACHER DEMO STATIC DATA
 * ----------------------------------------------------------------------------
 * Client-demo fixtures for the Lecturer Portal. When enabled, lecturer GET APIs
 * return this data instead of live DB results (scoped to school-assigned papers).
 *
 * REMOVE LATER — when told: "remove the data for the lecturer/teacher"
 *   or: "remove all demo static data for lecturer"
 *   1. Delete this file (`src/lib/lecturer-demo-data.ts`)
 *   2. Remove every import / call of:
 *        isLecturerDemoStaticDataEnabled
 *        lecturerDemo*
 *        LECTURER_DEMO_STATIC_DATA_ENABLED
 *        applyLecturerDemoAssignments
 *   from lecturer API routes, services/lecturer/*, and lecturer-auth.ts
 * ============================================================================
 */

/** Flip to false (or delete this module) to restore live Lecturer Portal data. */
export const LECTURER_DEMO_STATIC_DATA_ENABLED = true;

export function isLecturerDemoStaticDataEnabled(): boolean {
  return LECTURER_DEMO_STATIC_DATA_ENABLED;
}

export const LECTURER_DEMO_READ_ONLY_MESSAGE =
  "Lecturer demo mode is on — changes are disabled for the client walkthrough.";

export const LECTURER_DEMO_IDS = {
  school: "demo-lecturer-school",
  part1: "demo-lec-part-applied",
  part2: "demo-lec-part-strategic",
  paperFr: "demo-lec-paper-fr",
  paperAa: "demo-lec-paper-aa",
  paperSbr: "demo-lec-paper-sbr",
  classA: "demo-lec-class-a",
  classB: "demo-lec-class-b",
  /** Real demo student used for client walkthrough (linked to student@insightapex.com). */
  sarah: "demo-lec-student-sarah",
  stu: (n: number) => `demo-lec-student-${n}`,
} as const;

export const LECTURER_DEMO_PAPER_IDS = [
  LECTURER_DEMO_IDS.paperFr,
  LECTURER_DEMO_IDS.paperAa,
  LECTURER_DEMO_IDS.paperSbr,
] as const;

export const LECTURER_DEMO_CLASS_IDS = [
  LECTURER_DEMO_IDS.classA,
  LECTURER_DEMO_IDS.classB,
] as const;

/** Inject school-assigned demo papers/classes onto the lecturer session context. */
export function applyLecturerDemoAssignments<T extends { paperIds: string[]; classIds: string[] }>(
  ctx: T
): T {
  if (!isLecturerDemoStaticDataEnabled()) return ctx;
  return {
    ...ctx,
    paperIds: [...LECTURER_DEMO_PAPER_IDS],
    classIds: [...LECTURER_DEMO_CLASS_IDS],
  };
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

const DEMO_PARTS = [
  {
    id: LECTURER_DEMO_IDS.part1,
    code: "Applied Skills",
    title: "Applied Skills",
    papers: [
      { id: LECTURER_DEMO_IDS.paperFr, code: "FR", title: "Financial Reporting" },
      { id: LECTURER_DEMO_IDS.paperAa, code: "AA", title: "Audit and Assurance" },
    ],
  },
  {
    id: LECTURER_DEMO_IDS.part2,
    code: "Strategic Professional",
    title: "Strategic Professional",
    papers: [
      { id: LECTURER_DEMO_IDS.paperSbr, code: "SBR", title: "Strategic Business Reporting" },
    ],
  },
];

const PAPER_META: Record<
  string,
  { code: string; title: string; partId: string; partCode: string; partTitle: string }
> = {
  [LECTURER_DEMO_IDS.paperFr]: {
    code: "FR",
    title: "Financial Reporting",
    partId: LECTURER_DEMO_IDS.part1,
    partCode: "Applied Skills",
    partTitle: "Applied Skills",
  },
  [LECTURER_DEMO_IDS.paperAa]: {
    code: "AA",
    title: "Audit and Assurance",
    partId: LECTURER_DEMO_IDS.part1,
    partCode: "Applied Skills",
    partTitle: "Applied Skills",
  },
  [LECTURER_DEMO_IDS.paperSbr]: {
    code: "SBR",
    title: "Strategic Business Reporting",
    partId: LECTURER_DEMO_IDS.part2,
    partCode: "Strategic Professional",
    partTitle: "Strategic Professional",
  },
};

type DemoStudent = {
  id: string;
  name: string;
  email: string;
  classIds: string[];
  paperScores: Record<string, number>;
  mockAttempts: Record<string, number>;
  lastActiveDaysAgo: number;
};

const DEMO_STUDENTS: DemoStudent[] = [
  {
    // Keep Sarah for client demos — Notify creates a real in-app message for this email.
    id: LECTURER_DEMO_IDS.sarah,
    name: "Sarah Johnson",
    email: "student@insightapex.com",
    classIds: [LECTURER_DEMO_IDS.classA],
    paperScores: {
      [LECTURER_DEMO_IDS.paperFr]: 42,
      [LECTURER_DEMO_IDS.paperAa]: 48,
      [LECTURER_DEMO_IDS.paperSbr]: 40,
    },
    mockAttempts: {
      [LECTURER_DEMO_IDS.paperFr]: 1,
      [LECTURER_DEMO_IDS.paperAa]: 1,
      [LECTURER_DEMO_IDS.paperSbr]: 0,
    },
    lastActiveDaysAgo: 3,
  },
  {
    id: LECTURER_DEMO_IDS.stu(1),
    name: "Amina Okoro",
    email: "amina.okoro@student.apexdemo.edu",
    classIds: [LECTURER_DEMO_IDS.classA],
    paperScores: {
      [LECTURER_DEMO_IDS.paperFr]: 78,
      [LECTURER_DEMO_IDS.paperAa]: 62,
      [LECTURER_DEMO_IDS.paperSbr]: 55,
    },
    mockAttempts: {
      [LECTURER_DEMO_IDS.paperFr]: 3,
      [LECTURER_DEMO_IDS.paperAa]: 2,
      [LECTURER_DEMO_IDS.paperSbr]: 1,
    },
    lastActiveDaysAgo: 1,
  },
  {
    id: LECTURER_DEMO_IDS.stu(2),
    name: "James Chen",
    email: "james.chen@student.apexdemo.edu",
    classIds: [LECTURER_DEMO_IDS.classA],
    paperScores: {
      [LECTURER_DEMO_IDS.paperFr]: 45,
      [LECTURER_DEMO_IDS.paperAa]: 41,
      [LECTURER_DEMO_IDS.paperSbr]: 38,
    },
    mockAttempts: {
      [LECTURER_DEMO_IDS.paperFr]: 1,
      [LECTURER_DEMO_IDS.paperAa]: 0,
      [LECTURER_DEMO_IDS.paperSbr]: 0,
    },
    lastActiveDaysAgo: 16,
  },
  {
    id: LECTURER_DEMO_IDS.stu(3),
    name: "Priya Patel",
    email: "priya.patel@student.apexdemo.edu",
    classIds: [LECTURER_DEMO_IDS.classA, LECTURER_DEMO_IDS.classB],
    paperScores: {
      [LECTURER_DEMO_IDS.paperFr]: 71,
      [LECTURER_DEMO_IDS.paperAa]: 68,
      [LECTURER_DEMO_IDS.paperSbr]: 64,
    },
    mockAttempts: {
      [LECTURER_DEMO_IDS.paperFr]: 2,
      [LECTURER_DEMO_IDS.paperAa]: 2,
      [LECTURER_DEMO_IDS.paperSbr]: 2,
    },
    lastActiveDaysAgo: 2,
  },
  {
    id: LECTURER_DEMO_IDS.stu(4),
    name: "Oliver Wright",
    email: "oliver.wright@student.apexdemo.edu",
    classIds: [LECTURER_DEMO_IDS.classB],
    paperScores: {
      [LECTURER_DEMO_IDS.paperFr]: 58,
      [LECTURER_DEMO_IDS.paperAa]: 52,
      [LECTURER_DEMO_IDS.paperSbr]: 49,
    },
    mockAttempts: {
      [LECTURER_DEMO_IDS.paperFr]: 1,
      [LECTURER_DEMO_IDS.paperAa]: 1,
      [LECTURER_DEMO_IDS.paperSbr]: 1,
    },
    lastActiveDaysAgo: 8,
  },
  {
    id: LECTURER_DEMO_IDS.stu(5),
    name: "Fatima Hassan",
    email: "fatima.hassan@student.apexdemo.edu",
    classIds: [LECTURER_DEMO_IDS.classB],
    paperScores: {
      [LECTURER_DEMO_IDS.paperFr]: 84,
      [LECTURER_DEMO_IDS.paperAa]: 76,
      [LECTURER_DEMO_IDS.paperSbr]: 72,
    },
    mockAttempts: {
      [LECTURER_DEMO_IDS.paperFr]: 4,
      [LECTURER_DEMO_IDS.paperAa]: 3,
      [LECTURER_DEMO_IDS.paperSbr]: 2,
    },
    lastActiveDaysAgo: 0,
  },
  {
    id: LECTURER_DEMO_IDS.stu(6),
    name: "Noah Brooks",
    email: "noah.brooks@student.apexdemo.edu",
    classIds: [LECTURER_DEMO_IDS.classA],
    paperScores: {
      [LECTURER_DEMO_IDS.paperFr]: 39,
      [LECTURER_DEMO_IDS.paperAa]: 44,
      [LECTURER_DEMO_IDS.paperSbr]: 35,
    },
    mockAttempts: {
      [LECTURER_DEMO_IDS.paperFr]: 0,
      [LECTURER_DEMO_IDS.paperAa]: 1,
      [LECTURER_DEMO_IDS.paperSbr]: 0,
    },
    lastActiveDaysAgo: 21,
  },
];

/** Resolve a demo-list student by id (used by notify to reach live accounts like Sarah). */
export function lecturerDemoStudentById(studentId: string): DemoStudent | null {
  return DEMO_STUDENTS.find((s) => s.id === studentId) ?? null;
}

const PASS_MARK = 50;

function statusFromScore(avg: number): "High Proficiency" | "Average" | "Needs Improvement" {
  if (avg >= 70) return "High Proficiency";
  if (avg >= 50) return "Average";
  return "Needs Improvement";
}

function riskFromScore(
  score: number,
  days: number,
  mocks: number
): "High Risk" | "At Risk" | "Monitor" {
  if (score < 40 || (days >= 14 && score < PASS_MARK) || (mocks === 0 && score < PASS_MARK)) {
    return "High Risk";
  }
  if (score < PASS_MARK || days >= 7) return "At Risk";
  return "Monitor";
}

function paperCategoryRows(paperId: string) {
  if (paperId === LECTURER_DEMO_IDS.paperAa) {
    return [
      {
        categoryId: "demo-aa-cat-1",
        categoryTitle: "Audit framework",
        subCategoryId: "demo-aa-sub-1",
        subCategoryTitle: "Audit risk & response",
        averageScore: 48,
        status: statusFromScore(48),
        studentsBelowPassing: 3,
        attemptCount: 42,
      },
      {
        categoryId: "demo-aa-cat-2",
        categoryTitle: "Internal control",
        subCategoryId: "demo-aa-sub-2",
        subCategoryTitle: "Control testing",
        averageScore: 61,
        status: statusFromScore(61),
        studentsBelowPassing: 2,
        attemptCount: 35,
      },
    ];
  }
  if (paperId === LECTURER_DEMO_IDS.paperSbr) {
    return [
      {
        categoryId: "demo-sbr-cat-1",
        categoryTitle: "Financial instruments",
        subCategoryId: "demo-sbr-sub-1",
        subCategoryTitle: "Complex instruments",
        averageScore: 44,
        status: statusFromScore(44),
        studentsBelowPassing: 4,
        attemptCount: 28,
      },
      {
        categoryId: "demo-sbr-cat-2",
        categoryTitle: "Reporting",
        subCategoryId: "demo-sbr-sub-2",
        subCategoryTitle: "Group reporting",
        averageScore: 57,
        status: statusFromScore(57),
        studentsBelowPassing: 2,
        attemptCount: 31,
      },
    ];
  }
  // FR default
  return [
    {
      categoryId: "demo-fr-cat-1",
      categoryTitle: "Financial statements",
      subCategoryId: "demo-fr-sub-1",
      subCategoryTitle: "Leases (IFRS 16)",
      averageScore: 46,
      status: statusFromScore(46),
      studentsBelowPassing: 3,
      attemptCount: 48,
    },
    {
      categoryId: "demo-fr-cat-2",
      categoryTitle: "Groups",
      subCategoryId: "demo-fr-sub-2",
      subCategoryTitle: "Group financial statements",
      averageScore: 63,
      status: statusFromScore(63),
      studentsBelowPassing: 2,
      attemptCount: 40,
    },
    {
      categoryId: "demo-fr-cat-3",
      categoryTitle: "Interpretation",
      subCategoryId: "demo-fr-sub-3",
      subCategoryTitle: "Ratio analysis",
      averageScore: 74,
      status: statusFromScore(74),
      studentsBelowPassing: 1,
      attemptCount: 36,
    },
  ];
}

export function lecturerDemoAssignedPapers(schoolName?: string) {
  return {
    school: {
      id: LECTURER_DEMO_IDS.school,
      name: schoolName?.trim() || "Apex Business College",
    },
    parts: DEMO_PARTS,
    /** School assigned these — lecturer cannot add others. */
    assignmentNote:
      "Papers and parts are assigned by your school. Choose a paper only when more than one is assigned.",
  };
}

export function lecturerDemoDashboard(paperId: string) {
  const meta = PAPER_META[paperId];
  if (!meta) return null;

  const scores = DEMO_STUDENTS.map((s) => s.paperScores[paperId] ?? 0);
  const avg =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;
  const ready = scores.filter((s) => s >= PASS_MARK).length;
  const withMocks = DEMO_STUDENTS.filter((s) => (s.mockAttempts[paperId] ?? 0) > 0).length;

  return {
    paper: {
      id: paperId,
      code: meta.code,
      title: meta.title,
      part: { id: meta.partId, code: meta.partCode, title: meta.partTitle },
    },
    passMark: PASS_MARK,
    kpis: {
      totalEnrolledStudents: DEMO_STUDENTS.length,
      averageClassScore: avg,
      passProbability: Math.round((ready / DEMO_STUDENTS.length) * 1000) / 10,
      mockParticipationRate: Math.round((withMocks / DEMO_STUDENTS.length) * 1000) / 10,
    },
    categoryPerformance: paperCategoryRows(paperId),
  };
}

export function lecturerDemoAtRisk(paperId: string) {
  if (!PAPER_META[paperId]) return null;
  const students = DEMO_STUDENTS.map((s) => {
    const score = s.paperScores[paperId] ?? 0;
    const mocks = s.mockAttempts[paperId] ?? 0;
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      overallScore: score,
      mockAttempts: mocks,
      lastActive: isoDaysAgo(s.lastActiveDaysAgo),
      riskStatus: riskFromScore(score, s.lastActiveDaysAgo, mocks),
    };
  }).sort((a, b) => (a.overallScore ?? 0) - (b.overallScore ?? 0));

  return { students, passMark: PASS_MARK };
}

export function lecturerDemoPerformanceTrend(paperId: string, range: string) {
  if (!PAPER_META[paperId]) return null;
  const base =
    paperId === LECTURER_DEMO_IDS.paperSbr
      ? [42, 45, 48, 50, 52, 54, 55]
      : paperId === LECTURER_DEMO_IDS.paperAa
        ? [50, 52, 54, 55, 57, 58, 60]
        : [55, 58, 60, 62, 64, 66, 68];
  const labels =
    range === "4w"
      ? ["W1", "W2", "W3", "W4"]
      : range === "3m"
        ? ["M1", "M2", "M3"]
        : range === "6m"
          ? ["M1", "M2", "M3", "M4", "M5", "M6"]
          : range === "12m"
            ? ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"]
            : ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];

  const extendedBase = [...base];
  while (extendedBase.length < labels.length) {
    const last = extendedBase[extendedBase.length - 1] ?? 50;
    extendedBase.push(Math.min(95, last + 1));
  }

  return {
    range,
    points: labels.map((label, i) => ({
      label,
      averageScore: extendedBase[i],
      attempts: 4 + (i % 3),
    })),
  };
}

export function lecturerDemoStudents(opts?: { search?: string; paperId?: string | null }) {
  let list = DEMO_STUDENTS.map((s) => {
    const paperId = opts?.paperId && PAPER_META[opts.paperId] ? opts.paperId : LECTURER_DEMO_IDS.paperFr;
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      overallScore: s.paperScores[paperId] ?? null,
      averageScore: s.paperScores[paperId] ?? null,
      attemptCount: (s.mockAttempts[paperId] ?? 0) + 4,
      lastActive: isoDaysAgo(s.lastActiveDaysAgo),
      classes: s.classIds.map((id) => ({
        id,
        name: id === LECTURER_DEMO_IDS.classA ? "FR Cohort A — Morning" : "AA Cohort B — Intensive",
      })),
    };
  });

  const q = opts?.search?.trim().toLowerCase() ?? "";
  if (q) {
    list = list.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }

  return { students: list };
}

export function lecturerDemoStudentDetail(studentId: string) {
  const s = DEMO_STUDENTS.find((x) => x.id === studentId);
  if (!s) return null;

  const paperResults = LECTURER_DEMO_PAPER_IDS.filter((paperId) => s.paperScores[paperId] != null).map(
    (paperId, idx) => {
      const meta = PAPER_META[paperId];
      const score = s.paperScores[paperId] ?? 0;
      const mockCount = s.mockAttempts[paperId] ?? 0;
      return {
        id: `${s.id}-result-${paperId}`,
        paperCode: meta.code,
        paperTitle: meta.title,
        mockExamTitle: mockCount > 0 ? `${meta.code} Mock Exam` : null,
        scorePercent: score,
        passed: score >= PASS_MARK,
        submittedAt: isoDaysAgo(s.lastActiveDaysAgo + idx * 2),
        questionCount: 10 + idx * 2,
        correctCount: Math.round(((10 + idx * 2) * score) / 100),
      };
    }
  );

  const weakCategories = [
    {
      title: "Core techniques / General",
      paperCode: PAPER_META[LECTURER_DEMO_IDS.paperFr].code,
      missRate: Math.max(35, Math.round(100 - (s.paperScores[LECTURER_DEMO_IDS.paperFr] ?? 50))),
      total: 12,
    },
    {
      title: "Audit risk & response",
      paperCode: PAPER_META[LECTURER_DEMO_IDS.paperAa].code,
      missRate: Math.max(30, Math.round(100 - (s.paperScores[LECTURER_DEMO_IDS.paperAa] ?? 50))),
      total: 10,
    },
  ].sort((a, b) => b.missRate - a.missRate);

  const activityTimeline = [...paperResults]
    .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)))
    .map((r) => ({
      id: `timeline-${r.id}`,
      at: r.submittedAt,
      kind: r.mockExamTitle ? ("mock" as const) : ("practice" as const),
      title: r.mockExamTitle
        ? `${r.paperCode} mock · ${r.mockExamTitle}`
        : `${r.paperCode} practice session`,
      detail:
        r.scorePercent != null
          ? `Scored ${Math.round(r.scorePercent)}% · ${r.correctCount}/${r.questionCount} correct`
          : "Submitted",
      scorePercent: r.scorePercent,
      passed: r.passed,
    }));

  return {
    student: {
      id: s.id,
      name: s.name,
      email: s.email,
      createdAt: isoDaysAgo(90),
      classes: s.classIds.map((id) => ({
        id,
        name: id === LECTURER_DEMO_IDS.classA ? "FR Cohort A — Morning" : "AA Cohort B — Intensive",
      })),
    },
    paperResults,
    recentPractice: paperResults,
    activityTimeline,
    weakCategories,
  };
}

export function lecturerDemoClasses() {
  return {
    classes: [
      {
        id: LECTURER_DEMO_IDS.classA,
        name: "FR Cohort A — Morning",
        studentCount: DEMO_STUDENTS.filter((s) => s.classIds.includes(LECTURER_DEMO_IDS.classA))
          .length,
      },
      {
        id: LECTURER_DEMO_IDS.classB,
        name: "AA Cohort B — Intensive",
        studentCount: DEMO_STUDENTS.filter((s) => s.classIds.includes(LECTURER_DEMO_IDS.classB))
          .length,
      },
    ],
  };
}

export function lecturerDemoMockExams(paperId?: string | null) {
  const ids = paperId && PAPER_META[paperId] ? [paperId] : [...LECTURER_DEMO_PAPER_IDS];
  return {
    mocks: ids.flatMap((pid, idx) => {
      const meta = PAPER_META[pid];
      return [
        {
          id: `demo-mock-${pid}-1`,
          title: `${meta.code} Mock Exam ${idx + 1}`,
          paperId: pid,
          paperCode: meta.code,
          paperTitle: meta.title,
          attemptCount: 12 - idx,
          averageScore: 58 + idx * 3,
          passRate: 55 + idx * 4,
          scores: DEMO_STUDENTS.slice(0, 4).map((s) => ({
            studentId: s.id,
            name: s.name,
            email: s.email,
            scorePercent: s.paperScores[pid],
            passed: s.paperScores[pid] >= PASS_MARK,
          })),
          notAttemptedStudentIds: DEMO_STUDENTS.slice(4).map((s) => s.id),
        },
      ];
    }),
    studentDirectory: DEMO_STUDENTS.map((s) => ({ id: s.id, name: s.name, email: s.email })),
  };
}

export function lecturerDemoQuestions(paperId?: string | null) {
  const pid = paperId && PAPER_META[paperId] ? paperId : LECTURER_DEMO_IDS.paperFr;
  const meta = PAPER_META[pid];
  return {
    questions: [
      {
        id: `demo-q-${pid}-1`,
        stem: `Sample ${meta.code} practice question on core syllabus area 1`,
        paperCode: meta.code,
        difficulty: "MEDIUM",
        purpose: "PRACTICE",
        subCategoryTitle: paperCategoryRows(pid)[0]?.subCategoryTitle ?? "Topic",
      },
      {
        id: `demo-q-${pid}-2`,
        stem: `Sample ${meta.code} practice question on core syllabus area 2`,
        paperCode: meta.code,
        difficulty: "HARD",
        purpose: "PRACTICE",
        subCategoryTitle: paperCategoryRows(pid)[1]?.subCategoryTitle ?? "Topic",
      },
    ],
  };
}

export function lecturerDemoReportsBundle(paperId: string) {
  const dash = lecturerDemoDashboard(paperId);
  const atRisk = lecturerDemoAtRisk(paperId);
  if (!dash || !atRisk) return null;
  return {
    paper: dash.paper,
    kpis: dash.kpis,
    categoryPerformance: dash.categoryPerformance,
    atRiskStudents: atRisk.students,
    passMark: PASS_MARK,
  };
}
