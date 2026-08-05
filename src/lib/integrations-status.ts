export type IntegrationStatus = {
  configured: boolean;
  label: string;
  detail: string;
};

export type IntegrationsStatusResponse = {
  stripe: IntegrationStatus & { webhookConfigured: boolean; mode: "live" | "test" | "unconfigured" };
  resend: IntegrationStatus;
};

export function getIntegrationsStatus(): IntegrationsStatusResponse {
  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
  const stripeWebhook = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();

  const stripeMode: "live" | "test" | "unconfigured" = !stripeSecret
    ? "unconfigured"
    : stripeSecret.startsWith("sk_live")
      ? "live"
      : "test";

  return {
    stripe: {
      configured: Boolean(stripeSecret),
      webhookConfigured: Boolean(stripeWebhook),
      mode: stripeMode,
      label: stripeMode === "live" ? "Live" : stripeMode === "test" ? "Test" : "Not configured",
      detail: stripeSecret
        ? `Secret key present (${stripeMode} mode). Webhook ${stripeWebhook ? "configured" : "missing"}.`
        : "STRIPE_SECRET_KEY is not set in the server environment.",
    },
    resend: {
      configured: Boolean(resendKey),
      label: resendKey ? "Configured" : "Not configured",
      detail: resendKey
        ? "RESEND_API_KEY is set on the server. API key is never exposed to the browser."
        : "RESEND_API_KEY is not set in the server environment.",
    },
  };
}
