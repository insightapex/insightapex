import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const Role = { OWNER: "OWNER", STUDENT: "STUDENT" } as const;
const DifficultyLevel = { EASY: "EASY", MEDIUM: "MEDIUM", HARD: "HARD" } as const;
const AccessLevel = { FREE: "FREE", PREMIUM: "PREMIUM" } as const;
const prisma = new PrismaClient();

/**
 * Seed order (idempotent):
 * Parts → Papers → Categories → Sub Categories → Questions → Plans/Products → Users
 * Then demo partner/school rows (users + papers already exist).
 */
async function main() {
  console.log("Seeding InsightApex database...");

  // ---------------------------------------------------------------------------
  // 1. Parts (resolve by stable unique `code`; never invent paper.partId blindly)
  // ---------------------------------------------------------------------------
  const partDefs = [
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
  ] as const;

  const partIdByCode = new Map<string, string>();

  for (const part of partDefs) {
    const row = await prisma.part.upsert({
      where: { code: part.code },
      update: {
        title: part.title,
        description: part.description,
        order: part.order,
        isActive: true,
      },
      // Do not force a fixed id — migration may already have created PART_* rows
      // with different ids (e.g. part_seed_1). Upsert by code returns the real id.
      create: {
        code: part.code,
        title: part.title,
        description: part.description,
        order: part.order,
        isActive: true,
      },
    });
    partIdByCode.set(part.code, row.id);
  }

  // ---------------------------------------------------------------------------
  // 2–5. Papers → Categories → Sub Categories → Questions
  // ---------------------------------------------------------------------------
  const paperDefs: Array<{
    code: string;
    title: string;
    description: string;
    partCode: (typeof partDefs)[number]["code"];
    premium?: boolean;
  }> = [
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

  let premiumPaperId: string | null = null;

  for (const p of paperDefs) {
    const partId = partIdByCode.get(p.partCode);
    if (!partId) {
      throw new Error(`Seed failed: Part with code "${p.partCode}" was not loaded before papers.`);
    }

    const isPremium = Boolean(p.premium);
    const paper = await prisma.paper.upsert({
      where: { code: p.code },
      update: {
        title: p.title,
        description: p.description,
        partId,
        ...(isPremium
          ? {
              accessLevel: AccessLevel.PREMIUM,
              isPremium: true,
              priceCents: 499,
              currency: "GBP",
            }
          : {
              accessLevel: AccessLevel.FREE,
              isPremium: false,
            }),
        isActive: true,
      },
      create: {
        code: p.code,
        title: p.title,
        description: p.description,
        partId,
        accessLevel: isPremium ? AccessLevel.PREMIUM : AccessLevel.FREE,
        isPremium,
        priceCents: isPremium ? 499 : null,
        currency: "GBP",
        isActive: true,
      },
    });

    if (isPremium) premiumPaperId = paper.id;

    // Idempotent category tree: skip if this paper already has categories
    const existingCategories = await prisma.category.count({ where: { paperId: paper.id } });
    if (existingCategories > 0) continue;

    const categories = [
      { title: `${p.code} Fundamentals`, description: `Introductory concepts for ${p.title}.` },
      { title: `${p.code} Core Techniques`, description: `Key techniques and calculations for ${p.title}.` },
      { title: `${p.code} Applied Scenarios`, description: `Applying ${p.title} concepts to exam-style scenarios.` },
    ];

    for (const c of categories) {
      const category = await prisma.category.create({
        data: { ...c, paperId: paper.id, isActive: true },
      });

      const subCategory = await prisma.subCategory.create({
        data: {
          categoryId: category.id,
          title: "General",
          description: `Default sub category for ${category.title}.`,
          isActive: true,
        },
      });

      for (let i = 1; i <= 4; i++) {
        await prisma.question.create({
          data: {
            subCategoryId: subCategory.id,
            accessLevel: i === 1 ? "FREE_TRIAL" : "PREMIUM",
            purpose: "PRACTICE",
            text: `Sample question ${i} for ${category.title}: which of the following best applies?`,
            explanation:
              "This is a placeholder explanation describing why the correct option is right and why the others are incorrect.",
            difficulty:
              i % 3 === 0
                ? DifficultyLevel.HARD
                : i % 2 === 0
                  ? DifficultyLevel.MEDIUM
                  : DifficultyLevel.EASY,
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

  // ---------------------------------------------------------------------------
  // 6. Plans / Products (+ mock exam content for products)
  // ---------------------------------------------------------------------------
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

  // Premium mock exam with dedicated MOCK_EXAM questions (not practice pool)
  let mockExamId: string | null = null;
  const pmPaper = await prisma.paper.findUnique({ where: { code: "PM" } });
  if (pmPaper) {
    const mockExam = await prisma.mockExam.upsert({
      where: { id: "seed-premium-mock-pm" },
      update: {
        paperId: pmPaper.id,
        title: "PM Full Mock Exam",
        description: "A full-length Performance Management mock exam with timed conditions.",
        status: "PUBLISHED",
        accessLevel: AccessLevel.PREMIUM,
        isPremium: true,
        priceCents: 299,
        currency: "GBP",
        isActive: true,
      },
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
    if (existingLinks === 0) {
      for (let i = 1; i <= 8; i++) {
        const mockQuestion = await prisma.question.create({
          data: {
            purpose: "MOCK_EXAM",
            subCategoryId: null,
            accessLevel: "PREMIUM",
            text: `PM mock exam Q${i}: which statement best reflects performance management under exam conditions?`,
            explanation: "Placeholder mock-exam explanation.",
            difficulty: DifficultyLevel.MEDIUM,
            marks: 2,
            isActive: true,
            options: {
              create: [
                { text: "Option A", isCorrect: i % 4 === 1, order: 0 },
                { text: "Option B", isCorrect: i % 4 === 2, order: 1 },
                { text: "Option C", isCorrect: i % 4 === 3, order: 2 },
                { text: "Option D", isCorrect: i % 4 === 0, order: 3 },
              ],
            },
          },
        });
        await prisma.mockExamQuestion.create({
          data: {
            mockExamId: mockExam.id,
            questionId: mockQuestion.id,
            order: i - 1,
          },
        });
      }
    }
  }

  // One-time products
  if (premiumPaperId) {
    await prisma.product.upsert({
      where: { slug: "sbr-paper-pack" },
      update: { paperId: premiumPaperId, isActive: true },
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
      update: { mockExamId, isActive: true },
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

  // ---------------------------------------------------------------------------
  // 7. Users (after content + billing catalog)
  // ---------------------------------------------------------------------------
  const adminPassword = await bcrypt.hash("Admin@12345", 10);
  const studentPassword = await bcrypt.hash("Student@12345", 10);
  const contentAdminPassword = await bcrypt.hash("Content@12345", 10);

  await prisma.user.upsert({
    where: { email: "admin@insightapex.com" },
    update: { role: Role.OWNER, name: "InsightApex Owner" },
    create: {
      name: "InsightApex Owner",
      email: "admin@insightapex.com",
      passwordHash: adminPassword,
      role: Role.OWNER,
      emailVerified: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "content@insightapex.com" },
    update: { role: "CONTENT_ADMIN" },
    create: {
      name: "Content Admin",
      email: "content@insightapex.com",
      passwordHash: contentAdminPassword,
      role: "CONTENT_ADMIN",
      emailVerified: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "student@insightapex.com" },
    update: { name: "Sarah Johnson", role: Role.STUDENT },
    create: {
      name: "Sarah Johnson",
      email: "student@insightapex.com",
      passwordHash: studentPassword,
      role: Role.STUDENT,
      emailVerified: new Date(),
      profile: { create: { bio: "ACCA student preparing for PM and FR." } },
    },
  });

  // Data-driven registration sources (idempotent). New sources can be added
  // later purely by inserting rows — no code changes required.
  const registrationSources = [
    { slug: "facebook", name: "Facebook", order: 1 },
    { slug: "telegram", name: "Telegram", order: 2 },
    { slug: "viber", name: "Viber", order: 3 },
    { slug: "school-assistant", name: "School Assistant", order: 4 },
    { slug: "direct", name: "Direct Registration", order: 5 },
  ];
  for (const s of registrationSources) {
    await prisma.registrationSource.upsert({
      where: { slug: s.slug },
      update: { name: s.name, order: s.order, isActive: true },
      create: { slug: s.slug, name: s.name, order: s.order, isActive: true },
    });
  }

  // Demo partner org for local Partner Portal testing (idempotent)
  const partnerAdminPassword = await bcrypt.hash("Partner@12345", 10);
  const partner = await prisma.partner.upsert({
    where: { slug: "demo-academy" },
    update: {},
    create: {
      name: "Demo Academy",
      slug: "demo-academy",
      contactEmail: "partner@insightapex.com",
      status: "ACTIVE",
    },
  });

  const partnerAdmin = await prisma.user.upsert({
    where: { email: "partner@insightapex.com" },
    update: { role: "PARTNER_ADMIN" },
    create: {
      name: "Partner Admin",
      email: "partner@insightapex.com",
      passwordHash: partnerAdminPassword,
      role: "PARTNER_ADMIN",
      emailVerified: new Date(),
    },
  });

  await prisma.partnerMember.upsert({
    where: {
      partnerId_userId: { partnerId: partner.id, userId: partnerAdmin.id },
    },
    update: {},
    create: {
      partnerId: partner.id,
      userId: partnerAdmin.id,
      role: "PARTNER_ADMIN",
    },
  });

  // Schools (each is a Partner tenant selectable during public registration).
  const schools = [
    {
      slug: "nlafaa",
      name: "NLAFAA",
      adminEmail: "nlafaa@insightapex.com",
      lecturerEmail: "lecturer.nlafaa@insightapex.com",
      lecturerName: "NLAFAA Lecturer",
      paperCodes: ["BT", "MA", "FA"],
    },
    {
      slug: "nay-linn-aung",
      name: "Nay Linn Aung",
      adminEmail: "naylinnaung@insightapex.com",
      lecturerEmail: "lecturer.nla@insightapex.com",
      lecturerName: "NLA Lecturer",
      paperCodes: ["PM", "FR"],
    },
  ];
  const schoolAdminPassword = await bcrypt.hash("Partner@12345", 10);
  const lecturerPassword = await bcrypt.hash("Lecturer@12345", 10);

  for (const school of schools) {
    const schoolPartner = await prisma.partner.upsert({
      where: { slug: school.slug },
      update: { name: school.name, allowPublicRegistration: true },
      create: {
        name: school.name,
        slug: school.slug,
        contactEmail: school.adminEmail,
        status: "ACTIVE",
        allowPublicRegistration: true,
      },
    });

    const schoolAdmin = await prisma.user.upsert({
      where: { email: school.adminEmail },
      update: { role: "PARTNER_ADMIN" },
      create: {
        name: `${school.name} Admin`,
        email: school.adminEmail,
        passwordHash: schoolAdminPassword,
        role: "PARTNER_ADMIN",
        emailVerified: new Date(),
      },
    });

    await prisma.partnerMember.upsert({
      where: {
        partnerId_userId: { partnerId: schoolPartner.id, userId: schoolAdmin.id },
      },
      update: { role: "PARTNER_ADMIN" },
      create: {
        partnerId: schoolPartner.id,
        userId: schoolAdmin.id,
        role: "PARTNER_ADMIN",
      },
    });

    // Lecturer for this school
    const lecturer = await prisma.user.upsert({
      where: { email: school.lecturerEmail },
      update: { role: "LECTURER", name: school.lecturerName },
      create: {
        name: school.lecturerName,
        email: school.lecturerEmail,
        passwordHash: lecturerPassword,
        role: "LECTURER",
        emailVerified: new Date(),
      },
    });

    await prisma.partnerMember.upsert({
      where: {
        partnerId_userId: { partnerId: schoolPartner.id, userId: lecturer.id },
      },
      update: { role: "LECTURER" },
      create: {
        partnerId: schoolPartner.id,
        userId: lecturer.id,
        role: "LECTURER",
      },
    });

    // Default class for the school
    let cls = await prisma.class.findFirst({
      where: { partnerId: schoolPartner.id, name: `${school.name} Cohort A` },
    });
    if (!cls) {
      cls = await prisma.class.create({
        data: {
          partnerId: schoolPartner.id,
          name: `${school.name} Cohort A`,
          description: `Default class for ${school.name}`,
          status: "ACTIVE",
        },
      });
    }

    await prisma.lecturerClassAssignment.upsert({
      where: {
        lecturerId_classId: { lecturerId: lecturer.id, classId: cls.id },
      },
      update: { partnerId: schoolPartner.id },
      create: {
        partnerId: schoolPartner.id,
        lecturerId: lecturer.id,
        classId: cls.id,
      },
    });

    // Assign papers by code
    for (const code of school.paperCodes) {
      const paper = await prisma.paper.findUnique({ where: { code } });
      if (!paper) continue;
      await prisma.lecturerPaperAssignment.upsert({
        where: {
          lecturerId_paperId: { lecturerId: lecturer.id, paperId: paper.id },
        },
        update: { partnerId: schoolPartner.id },
        create: {
          partnerId: schoolPartner.id,
          lecturerId: lecturer.id,
          paperId: paper.id,
        },
      });
    }

    // Demo student enrolled at this school + class (idempotent)
    const demoStudentEmail = `student.${school.slug}@insightapex.com`;
    const demoStudent = await prisma.user.upsert({
      where: { email: demoStudentEmail },
      update: { partnerId: schoolPartner.id, role: "STUDENT" },
      create: {
        name: `${school.name} Student`,
        email: demoStudentEmail,
        passwordHash: await bcrypt.hash("Student@12345", 10),
        role: "STUDENT",
        emailVerified: new Date(),
        partnerId: schoolPartner.id,
        profile: { create: {} },
      },
    });

    await prisma.classStudent.upsert({
      where: {
        classId_studentId: { classId: cls.id, studentId: demoStudent.id },
      },
      update: {},
      create: { classId: cls.id, studentId: demoStudent.id },
    });

    // Primary demo student Sarah Johnson → NLAFAA + this lecturer's class
    if (school.slug === "nlafaa") {
      const sarah = await prisma.user.upsert({
        where: { email: "student@insightapex.com" },
        update: {
          name: "Sarah Johnson",
          role: "STUDENT",
          partnerId: schoolPartner.id,
          emailVerified: new Date(),
        },
        create: {
          name: "Sarah Johnson",
          email: "student@insightapex.com",
          passwordHash: await bcrypt.hash("Student@12345", 10),
          role: "STUDENT",
          emailVerified: new Date(),
          partnerId: schoolPartner.id,
          profile: { create: { bio: "ACCA student at NLAFAA." } },
        },
      });

      await prisma.classStudent.upsert({
        where: {
          classId_studentId: { classId: cls.id, studentId: sarah.id },
        },
        update: {},
        create: { classId: cls.id, studentId: sarah.id },
      });
    }
  }

  console.log("Seed complete.");
  if (process.env.NODE_ENV !== "production") {
    console.log("Owner login: admin@insightapex.com / Admin@12345");
    console.log("Content admin: content@insightapex.com / Content@12345");
    console.log("Student login: student@insightapex.com / Student@12345");
    console.log("Partner login: partner@insightapex.com / Partner@12345");
    console.log("School logins: nlafaa@insightapex.com / naylinnaung@insightapex.com — Partner@12345");
    console.log("Lecturer logins:");
    console.log("  lecturer.nlafaa@insightapex.com / Lecturer@12345 (NLAFAA — BT/MA/FA)");
    console.log("  lecturer.nla@insightapex.com / Lecturer@12345 (Nay Linn Aung — PM/FR)");
    console.log("Student (Sarah @ NLAFAA): student@insightapex.com / Student@12345");
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
