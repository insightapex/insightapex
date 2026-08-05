import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sarah = await prisma.user.findUnique({
    where: { email: "student@insightapex.com" },
    select: { id: true, name: true, partnerId: true, partner: { select: { name: true } } },
  });
  console.log("SARAH", sarah);

  if (!sarah) return;

  const notes = await prisma.notification.findMany({
    where: { userId: sarah.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log("NOTIFICATION_COUNT", notes.length);
  for (const n of notes) {
    console.log({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message.slice(0, 80),
      createdAt: n.createdAt.toISOString(),
    });
  }

  const enrollments = await prisma.classStudent.findMany({
    where: { studentId: sarah.id },
    include: { class: { select: { id: true, name: true, partnerId: true } } },
  });
  console.log("ENROLLMENTS", enrollments);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
