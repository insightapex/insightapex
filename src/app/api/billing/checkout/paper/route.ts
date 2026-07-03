import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { checkoutProductSchema } from "@/lib/validation/billing";
import { createProductCheckout } from "@/services/billing";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = checkoutProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  if (product.type !== "PAPER") {
    return NextResponse.json({ error: "Invalid product type for paper checkout" }, { status: 400 });
  }

  try {
    const url = await createProductCheckout(user.id, user.email ?? "", parsed.data.productId);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
