import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validation/billing";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      paper: { select: { id: true, code: true, title: true } },
      mockExam: { select: { id: true, title: true } },
      _count: { select: { purchases: true } },
    },
  });

  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return NextResponse.json({ error: "A product with this slug already exists." }, { status: 409 });
  }

  const product = await prisma.product.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      type: parsed.data.type,
      accessType: parsed.data.accessType,
      priceCents: parsed.data.priceCents,
      currency: parsed.data.currency,
      isActive: parsed.data.isActive,
      isPremium: parsed.data.isPremium,
      paperId: parsed.data.paperId,
      mockExamId: parsed.data.mockExamId,
      provider: parsed.data.providerPriceId ? "stripe" : null,
      providerProductId: parsed.data.providerProductId,
      providerPriceId: parsed.data.providerPriceId,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
