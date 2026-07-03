import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const Role = { ADMIN: "ADMIN", STUDENT: "STUDENT" } as const;
const DifficultyLevel = { EASY: "EASY", MEDIUM: "MEDIUM", HARD: "HARD" } as const;
const AccessLevel = { FREE: "FREE", PREMIUM: "PREMIUM" } as const;

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding InsightApex database...");

  const adminPassword = await bcrypt.hash("Admin@12345", 10);
  const studentPassword = await bcrypt.hash("Student@12345", 10);

  await prisma.user.upsert({
    where: { email: "admin@insightapex.com" },
    update: {},
    create: {
      name: "InsightApex Admin",
      email: "admin@insightapex.com",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      emailVerified: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "student@insightapex.com" },
    update: {},
    create: {
      name: "Sarah Johnson",
      email: "student@insightapex.com",
      passwordHash: studentPassword,
      role: Role.STUDENT,
      emailVerified: new Date(),
      profile: { create: { bio: "ACCA student preparing for PM and FR." } },
    },
  });

  const papers = [
    { code: "BT", title: "Business and Technology", description: "Foundations of business organisation, governance, and technology." },
    { code: "MA", title: "Management Accounting", description: "Core management accounting techniques for planning and control." },
    { code: "FA", title: "Financial Accounting", description: "Principles of double-entry bookkeeping and financial statements." },
    { code: "PM", title: "Performance Management", description: "Advanced management accounting for decision-making and performance." },
    { code: "FR", title: "Financial Reporting", description: "Preparation and interpretation of financial statements under IFRS." },
    { code: "SBR", title: "Strategic Business Reporting", description: "Advanced financial reporting and interpretation.", premium: true },
  ];

  let premiumPaperId: string | null = null;

  for (const p of papers) {
    const isPremium = "premium" in p && p.premium;
    const paper = await prisma.paper.upsert({
      where: { code: p.code },
      update: isPremium
        ? { accessLevel: AccessLevel.PREMIUM, isPremium: true, priceCents: 499, currency: "GBP" }
        : {},
      create: {
        code: p.code,
        title: p.title,
        description: p.description,
        accessLevel: isPremium ? AccessLevel.PREMIUM : AccessLevel.FREE,
        isPremium: Boolean(isPremium),
        priceCents: isPremium ? 499 : null,
        currency: "GBP",
        isActive: true,
      },
    });

    if (isPremium) premiumPaperId = paper.id;

    const existingTopics = await prisma.topic.count({ where: { paperId: paper.id } });
    if (existingTopics > 0) continue;

    const topics = [
      { title: `${p.code} Fundamentals`, description: `Introductory concepts for ${p.title}.` },
      { title: `${p.code} Core Techniques`, description: `Key techniques and calculations for ${p.title}.` },
      { title: `${p.code} Applied Scenarios`, description: `Applying ${p.title} concepts to exam-style scenarios.` },
    ];

    for (const t of topics) {
      const topic = await prisma.topic.create({
        data: { ...t, paperId: paper.id, isActive: true },
      });

      for (let i = 1; i <= 4; i++) {
        await prisma.question.create({
          data: {
            topicId: topic.id,
            text: `Sample question ${i} for ${topic.title}: which of the following best applies?`,
            explanation:
              "This is a placeholder explanation describing why the correct option is right and why the others are incorrect.",
            difficulty:
              i % 3 === 0 ? DifficultyLevel.HARD : i % 2 === 0 ? DifficultyLevel.MEDIUM : DifficultyLevel.EASY,
            marks: 2,
            isActive: true,
            options: {
              create: [
                { text: "Option A description", isCorrect: i % 4 === 1, order: 0 },
                { text: "Option B description", isCorrect: i % 4 === 2, order: 1 },
                { text: "Option C description", isCorrect: i % 4 === 3, order: 2 },
                { text: "Option D description", isCorrect: i % 4 === 0, order: 3 },
              ],
            },
          },
        });
      }
    }
  }

  // Billing plans
  await prisma.plan.upsert({
    where: { slug: "free" },
    update: {},
    create: {
      name: "Free",
      slug: "free",
      description: "Get started with free ACCA practice content.",
      accessType: "FREE",
      priceCents: 0,
      currency: "GBP",
      billingInterval: "ONE_TIME",
      features: ["Access to free papers", "Basic practice questions", "Progress tracking"],
      isActive: true,
    },
  });

  // Billing plans & products — Stripe IDs are stored in the database.
  // Set providerProductId and providerPriceId via Admin → Billing → Plans / Products.

  await prisma.plan.upsert({
    where: { slug: "premium-monthly" },
    update: {},
    create: {
      name: "Premium Monthly",
      slug: "premium-monthly",
      description: "Full access to all premium papers and mock exams, billed monthly.",
      accessType: "MONTHLY_SUBSCRIPTION",
      priceCents: 999,
      currency: "GBP",
      billingInterval: "MONTHLY",
      features: [
        "All premium papers unlocked",
        "All mock exams included",
        "Unlimited practice sessions",
        "Priority support",
      ],
      isActive: true,
      provider: null,
      providerProductId: null,
      providerPriceId: null,
    },
  });

  await prisma.plan.upsert({
    where: { slug: "premium-yearly" },
    update: {},
    create: {
      name: "Premium Yearly",
      slug: "premium-yearly",
      description: "Best value — full premium access for a full year.",
      accessType: "YEARLY_SUBSCRIPTION",
      priceCents: 9999,
      currency: "GBP",
      billingInterval: "YEARLY",
      features: [
        "All premium papers unlocked",
        "All mock exams included",
        "Unlimited practice sessions",
        "Save vs monthly billing",
      ],
      isActive: true,
      provider: null,
      providerProductId: null,
      providerPriceId: null,
    },
  });

  // Premium mock exam
  let mockExamId: string | null = null;
  if (premiumPaperId) {
    const pmPaper = await prisma.paper.findUnique({ where: { code: "PM" } });
    if (pmPaper) {
      const questions = await prisma.question.findMany({
        where: { topic: { paperId: pmPaper.id }, isActive: true },
        take: 10,
      });

      const mockExam = await prisma.mockExam.upsert({
        where: { id: "seed-premium-mock-pm" },
        update: {},
        create: {
          id: "seed-premium-mock-pm",
          paperId: pmPaper.id,
          title: "PM Full Mock Exam",
          description: "A full-length Performance Management mock exam with timed conditions.",
          durationMinutes: 40,
          passMarkPercent: 50,
          status: "PUBLISHED",
          accessLevel: AccessLevel.PREMIUM,
          isPremium: true,
          priceCents: 299,
          currency: "GBP",
          isActive: true,
        },
      });
      mockExamId = mockExam.id;

      const existingLinks = await prisma.mockExamQuestion.count({ where: { mockExamId: mockExam.id } });
      if (existingLinks === 0 && questions.length > 0) {
        await prisma.mockExamQuestion.createMany({
          data: questions.map((q, i) => ({
            mockExamId: mockExam.id,
            questionId: q.id,
            order: i,
          })),
        });
      }
    }
  }

  // One-time products
  if (premiumPaperId) {
    await prisma.product.upsert({
      where: { slug: "sbr-paper-pack" },
      update: {},
      create: {
        name: "SBR Paper Pack",
        slug: "sbr-paper-pack",
        description: "One-time purchase for Strategic Business Reporting practice content.",
        type: "PAPER",
        accessType: "ONE_TIME_PAPER",
        isPremium: true,
        priceCents: 499,
        currency: "GBP",
        paperId: premiumPaperId,
        isActive: true,
        provider: null,
        providerProductId: null,
        providerPriceId: null,
      },
    });
  }

  if (mockExamId) {
    await prisma.product.upsert({
      where: { slug: "pm-mock-exam" },
      update: {},
      create: {
        name: "PM Mock Exam",
        slug: "pm-mock-exam",
        description: "One-time purchase for the PM Full Mock Exam.",
        type: "MOCK_EXAM",
        accessType: "ONE_TIME_MOCK_EXAM",
        isPremium: true,
        priceCents: 299,
        currency: "GBP",
        mockExamId,
        isActive: true,
        provider: null,
        providerProductId: null,
        providerPriceId: null,
      },
    });
  }

  console.log("Seed complete.");
  if (process.env.NODE_ENV !== "production") {
    console.log("Admin login: admin@insightapex.com / Admin@12345");
    console.log("Student login: student@insightapex.com / Student@12345");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
