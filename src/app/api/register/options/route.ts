import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public signup dropdown data:
 * - schools: ACTIVE partners open for public registration
 * - sources: active RegistrationSource rows (from seed / admin)
 */
export async function GET() {
  try {
    const [schools, sources] = await Promise.all([
      prisma.partner.findMany({
        where: {
          status: "ACTIVE",
          allowPublicRegistration: true,
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      }),
      prisma.registrationSource.findMany({
        where: { isActive: true },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
        },
      }),
    ]);

    return NextResponse.json({
      schools: schools.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
      })),
      sources: sources.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
      })),
    });
  } catch (err) {
    console.error("[api/register/options]", err);
    return NextResponse.json(
      { error: "Could not load registration options.", schools: [], sources: [] },
      { status: 500 }
    );
  }
}
