import { PrismaClient } from "@prisma/client";

// Enums as string constants (resolved after `prisma generate`)
const Role = { ADMIN: "ADMIN", STUDENT: "STUDENT" } as const;
const DifficultyLevel = { EASY: "EASY", MEDIUM: "MEDIUM", HARD: "HARD" } as const;
const AccessLevel = { FREE: "FREE", PREMIUM: "PREMIUM" } as const;
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding InsightApex database...");

  const adminPassword = await bcrypt.hash("Admin@12345", 10);
  const studentPassword = await bcrypt.hash("Student@12345", 10);

  const admin = await prisma.user.upsert({
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

  const student = await prisma.user.upsert({
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
  ];

  for (const p of papers) {
    const paper = await prisma.paper.upsert({
      where: { code: p.code },
      update: {},
      create: { ...p, accessLevel: AccessLevel.FREE, isActive: true },
    });

    const topics = [
      { title: `${p.code} Fundamentals`, description: `Introductory concepts for ${p.title}.` },
      { title: `${p.code} Core Techniques`, description: `Key techniques and calculations for ${p.title}.` },
      { title: `${p.code} Applied Scenarios`, description: `Applying ${p.title} concepts to exam-style scenarios.` },
    ];

    for (const t of topics) {
      const topic = await prisma.topic.create({
        data: { ...t, paperId: paper.id, isActive: true },
      });

      // 4 sample questions per topic
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

  console.log("Seed complete.");
  console.log("Admin login: admin@insightapex.com / Admin@12345");
  console.log("Student login: student@insightapex.com / Student@12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
