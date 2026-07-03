/**
 * InsightApex email service — Resend integration.
 * All secrets are read from environment variables only.
 */

import { getEmailConfig } from "./config";
import { sendEmail } from "./send";
import { verificationEmailHtml, passwordResetEmailHtml } from "./templates";

export { EmailServiceError } from "./errors";
export { getEmailConfig } from "./config";

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const { appUrl } = getEmailConfig();
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;

  await sendEmail({
    to,
    subject: "Verify your InsightApex account",
    html: verificationEmailHtml(appUrl, verifyUrl),
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const { appUrl } = getEmailConfig();
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  await sendEmail({
    to,
    subject: "Reset your InsightApex password",
    html: passwordResetEmailHtml(appUrl, resetUrl),
  });
}
