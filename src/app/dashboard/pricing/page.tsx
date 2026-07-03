"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice } from "@/lib/format-price";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  accessType: string;
  priceCents: number;
  currency: string;
  billingInterval: string;
  features: string[];
  hasStripePrice: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  type: string;
  priceCents: number | null;
  currency: string | null;
  paper?: { code: string; title: string } | null;
  mockExam?: { title: string } | null;
  hasStripePrice: boolean;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/billing/plans").then((r) => r.json()),
      fetch("/api/billing/products").then((r) => r.json()),
    ])
      .then(([plansData, productsData]) => {
        setPlans(plansData);
        setProducts(productsData);
      })
      .finally(() => setLoading(false));
  }, []);

  async function checkoutSubscription(planId: string) {
    setCheckoutLoading(planId);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setCheckoutLoading(null);
    }
  }

  async function checkoutProduct(productId: string, type: "paper" | "mock-exam") {
    setCheckoutLoading(productId);
    setError(null);
    try {
      const endpoint = type === "paper" ? "/api/billing/checkout/paper" : "/api/billing/checkout/mock-exam";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setCheckoutLoading(null);
    }
  }

  const subscriptionPlans = plans.filter((p) => p.accessType !== "FREE");
  const freePlan = plans.find((p) => p.accessType === "FREE");
  const paperProducts = products.filter((p) => p.type === "PAPER");
  const mockExamProducts = products.filter((p) => p.type === "MOCK_EXAM");

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-500">
        <Spinner className="h-5 w-5 text-brand-600" />
        Loading plans…
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Pricing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Choose a subscription or purchase individual papers and mock exams.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <section>
        <h2 className="text-lg font-semibold text-ink-900">Subscription plans</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {freePlan && (
            <Card className="border-slate-200">
              <CardBody>
                <Badge tone="success">Free</Badge>
                <h3 className="mt-3 text-lg font-semibold text-ink-900">{freePlan.name}</h3>
                <p className="mt-1 text-2xl font-bold text-ink-900">
                  {formatPrice(freePlan.priceCents, freePlan.currency)}
                </p>
                <p className="mt-2 text-sm text-slate-500">{freePlan.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {freePlan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-brand-600">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="mt-6 w-full" disabled>
                  Current plan
                </Button>
              </CardBody>
            </Card>
          )}

          {subscriptionPlans.map((plan) => (
            <Card
              key={plan.id}
              className={plan.billingInterval === "YEARLY" ? "border-brand-300 ring-2 ring-brand-100" : ""}
            >
              <CardBody>
                {plan.billingInterval === "YEARLY" && <Badge tone="brand">Best value</Badge>}
                <h3 className="mt-3 text-lg font-semibold text-ink-900">{plan.name}</h3>
                <p className="mt-1 text-2xl font-bold text-ink-900">
                  {formatPrice(plan.priceCents, plan.currency)}
                  <span className="text-sm font-normal text-slate-500">
                    /{plan.billingInterval === "YEARLY" ? "year" : "month"}
                  </span>
                </p>
                <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-brand-600">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  disabled={!plan.hasStripePrice || checkoutLoading === plan.id}
                  onClick={() => checkoutSubscription(plan.id)}
                >
                  {checkoutLoading === plan.id && <Spinner className="h-4 w-4" />}
                  {plan.billingInterval === "YEARLY" ? "Subscribe Yearly" : "Subscribe Monthly"}
                </Button>
                {!plan.hasStripePrice && (
                  <p className="mt-2 text-xs text-amber-600">Stripe Price ID has not been configured for this product.</p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {paperProducts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-ink-900">One-time paper purchases</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paperProducts.map((product) => (
              <Card key={product.id}>
                <CardBody>
                  <Badge tone="brand">Paper</Badge>
                  <h3 className="mt-3 font-semibold text-ink-900">{product.name}</h3>
                  {product.paper && (
                    <p className="text-sm text-brand-600">{product.paper.code} — {product.paper.title}</p>
                  )}
                  <p className="mt-2 text-xl font-bold text-ink-900">
                    {formatPrice(product.priceCents ?? 0, product.currency ?? "GBP")}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">{product.description}</p>
                  <Button
                    className="mt-4 w-full"
                    variant="outline"
                    disabled={!product.hasStripePrice || checkoutLoading === product.id}
                    onClick={() => checkoutProduct(product.id, "paper")}
                  >
                    {checkoutLoading === product.id && <Spinner className="h-4 w-4" />}
                    Buy Paper
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      )}

      {mockExamProducts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-ink-900">One-time mock exam purchases</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockExamProducts.map((product) => (
              <Card key={product.id}>
                <CardBody>
                  <Badge tone="warning">Mock Exam</Badge>
                  <h3 className="mt-3 font-semibold text-ink-900">{product.name}</h3>
                  {product.mockExam && (
                    <p className="text-sm text-slate-500">{product.mockExam.title}</p>
                  )}
                  <p className="mt-2 text-xl font-bold text-ink-900">
                    {formatPrice(product.priceCents ?? 0, product.currency ?? "GBP")}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">{product.description}</p>
                  <Button
                    className="mt-4 w-full"
                    variant="outline"
                    disabled={!product.hasStripePrice || checkoutLoading === product.id}
                    onClick={() => checkoutProduct(product.id, "mock-exam")}
                  >
                    {checkoutLoading === product.id && <Spinner className="h-4 w-4" />}
                    Buy Mock Exam
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      )}

      <p className="text-center text-sm text-slate-500">
        Already subscribed?{" "}
        <Link href="/dashboard/billing" className="font-medium text-brand-600 hover:text-brand-700">
          View billing dashboard
        </Link>
      </p>
    </div>
  );
}
