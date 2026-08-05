import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: { userId: string } }
) {
  const actor = await requireAdminApi();
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (actor.id === params.userId) {
    return NextResponse.json({ error: "You cannot remove your own account." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, role: true },
  });

  if (!user || user.role !== "CONTENT_ADMIN") {
    return NextResponse.json({ error: "Content admin not found." }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "STUDENT" },
  });

  return NextResponse.json({ success: true });
}
