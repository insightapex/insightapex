/**
 * InsightApex email service — Resend integration.
 * All secrets are read from environment variables only.
 */

import { getEmailConfig } from "./config";
import { sendEmail } from "./send";
import {
  verificationEmailHtml,
  passwordResetEmailHtml,
  lecturerMessageEmailHtml,
} from "./templates";

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

export async function sendLecturerMessageEmail(input: {
  to: string;
  lecturerName: string;
  schoolName: string;
  subject: string;
  message: string;
}): Promise<void> {
  const { appUrl } = getEmailConfig();
  await sendEmail({
    to: input.to,
    subject: input.subject,
    html: lecturerMessageEmailHtml({
      appUrl,
      lecturerName: input.lecturerName,
      schoolName: input.schoolName,
      subject: input.subject,
      message: input.message,
    }),
  });
}

export async function sendPartnerInvitationEmail(
  to: string,
  token: string,
  partnerName: string
): Promise<void> {
  const { appUrl } = getEmailConfig();
  const inviteUrl = `${appUrl}/invite?token=${token}`;
  await sendEmail({
    to,
    subject: `You're invited to join ${partnerName} on InsightApex`,
    html: verificationEmailHtml(appUrl, inviteUrl),
  });
}

