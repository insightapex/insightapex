import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { checkoutSubscriptionSchema } from "@/lib/validation/billing";
import { createSubscriptionCheckout } from "@/services/billing";

export async function POST(req: Request) {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = checkoutSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const url = await createSubscriptionCheckout(user.id, user.email ?? "", parsed.data.planId);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
