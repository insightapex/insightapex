import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const partner = await prisma.partner.findUnique({ where: { slug: "nlafaa" } });
  if (!partner) throw new Error("NLAFAA partner not found — run prisma db seed");

  const lecturer = await prisma.user.findUnique({
    where: { email: "lecturer.nlafaa@insightapex.com" },
  });
  if (!lecturer) throw new Error("lecturer.nlafaa not found");

  let cls = await prisma.class.findFirst({
    where: { partnerId: partner.id, name: "NLAFAA Cohort A" },
  });
  if (!cls) {
    cls = await prisma.class.create({
      data: {
        partnerId: partner.id,
        name: "NLAFAA Cohort A",
        description: "Default class for NLAFAA",
        status: "ACTIVE",
      },
    });
  }

  await prisma.lecturerClassAssignment.upsert({
    where: { lecturerId_classId: { lecturerId: lecturer.id, classId: cls.id } },
    update: { partnerId: partner.id },
    create: { partnerId: partner.id, lecturerId: lecturer.id, classId: cls.id },
  });

  // Ensure papers assigned for NLAFAA lecturer
  for (const code of ["BT", "MA", "FA"]) {
    const paper = await prisma.paper.findUnique({ where: { code } });
    if (!paper) continue;
    await prisma.lecturerPaperAssignment.upsert({
      where: { lecturerId_paperId: { lecturerId: lecturer.id, paperId: paper.id } },
      update: { partnerId: partner.id },
      create: { partnerId: partner.id, lecturerId: lecturer.id, paperId: paper.id },
    });
  }

  await prisma.partnerMember.upsert({
    where: {
      partnerId_userId: { partnerId: partner.id, userId: lecturer.id },
    },
    update: { role: "LECTURER" },
    create: { partnerId: partner.id, userId: lecturer.id, role: "LECTURER" },
  });

  const passwordHash = await bcrypt.hash("Student@12345", 10);
  const sarah = await prisma.user.upsert({
    where: { email: "student@insightapex.com" },
    update: {
      name: "Sarah Johnson",
      role: "STUDENT",
      partnerId: partner.id,
      emailVerified: new Date(),
    },
    create: {
      name: "Sarah Johnson",
      email: "student@insightapex.com",
      passwordHash,
      role: "STUDENT",
      emailVerified: new Date(),
      partnerId: partner.id,
      profile: { create: { bio: "ACCA student at NLAFAA." } },
    },
  });

  await prisma.classStudent.upsert({
    where: { classId_studentId: { classId: cls.id, studentId: sarah.id } },
    update: {},
    create: { classId: cls.id, studentId: sarah.id },
  });

  console.log("OK — Sarah linked to NLAFAA under lecturer.nlafaa");
  console.log({
    partner: partner.name,
    lecturer: lecturer.email,
    class: cls.name,
    student: sarah.email,
    studentId: sarah.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
