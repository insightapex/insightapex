import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { productPatchSchema } from "@/lib/validation/billing";

function buildProductPatchData(parsed: {
  name?: string;
  priceCents?: number;
  isActive?: boolean;
  providerProductId?: string | null;
  providerPriceId?: string | null;
}): Prisma.ProductUpdateInput {
  const data: Prisma.ProductUpdateInput = {};

  if (parsed.name !== undefined) data.name = parsed.name;
  if (parsed.priceCents !== undefined) data.priceCents = parsed.priceCents;
  if (parsed.isActive !== undefined) data.isActive = parsed.isActive;
  if (parsed.providerProductId !== undefined) data.providerProductId = parsed.providerProductId;
  if (parsed.providerPriceId !== undefined) {
    data.providerPriceId = parsed.providerPriceId;
    data.provider = parsed.providerPriceId ? "stripe" : null;
  }

  return data;
}

export async function PATCH(req: Request, { params }: { params: { productId: string } }) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.product.findUnique({ where: { id: params.productId } });
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const body = await req.json();
  const parsed = productPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const product = await prisma.product.update({
      where: { id: params.productId },
      data: buildProductPatchData(parsed.data),
      include: {
        paper: { select: { id: true, code: true, title: true } },
        mockExam: { select: { id: true, title: true } },
        _count: { select: { purchases: true } },
      },
    });

    return NextResponse.json(product);
  } catch (err) {
    console.error("Failed to update product:", err);
    const message =
      err instanceof Prisma.PrismaClientValidationError
        ? "Database client is out of date. Stop the dev server, run `npx prisma generate`, then restart."
        : "Failed to update product.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
