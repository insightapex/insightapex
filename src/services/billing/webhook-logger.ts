const PREFIX = "[stripe:webhook]";

/**
 * Log webhook activity in all environments.
 * Production previously skipped logging, which hid silent early-returns
 * while Stripe still recorded HTTP 200 deliveries.
 */
export function logWebhookDev(message: string, data?: Record<string, unknown>): void {
  if (data) {
    console.log(`${PREFIX} ${message}`, data);
    return;
  }

  console.log(`${PREFIX} ${message}`);
}

export function logWebhookError(message: string, data?: Record<string, unknown>): void {
  if (data) {
    console.error(`${PREFIX} ${message}`, data);
    return;
  }

  console.error(`${PREFIX} ${message}`);
}
