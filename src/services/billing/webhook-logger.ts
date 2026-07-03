const PREFIX = "[stripe:webhook]";

/** Logs webhook activity in development only. */
export function logWebhookDev(message: string, data?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "production") return;

  if (data) {
    console.log(`${PREFIX} ${message}`, data);
    return;
  }

  console.log(`${PREFIX} ${message}`);
}
