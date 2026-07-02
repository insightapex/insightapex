/**
 * Email service — Resend-ready.
 *
 * In Phase 1 this logs to the console in development so the app runs with
 * zero external dependencies. Once RESEND_API_KEY is set, swap the
 * `send()` body for the Resend SDK call shown below (commented).
 */

// import { Resend } from "resend";
// const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

async function send({ to, subject, html }: SendEmailParams) {
  if (process.env.RESEND_API_KEY) {
    // await resend.emails.send({
    //   from: process.env.EMAIL_FROM ?? "InsightApex <no-reply@insightapex.com>",
    //   to,
    //   subject,
    //   html,
    // });
    console.log(`[email] Would send via Resend -> ${to}: ${subject}`);
    return;
  }
  // Dev fallback: log instead of sending
  console.log(`[email:dev] To: ${to} | Subject: ${subject}\n${html}`);
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/verify-email?token=${token}`;
  await send({
    to,
    subject: "Verify your InsightApex account",
    html: `<p>Welcome to InsightApex. Confirm your email by visiting:</p><p><a href="${url}">${url}</a></p>`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
  await send({
    to,
    subject: "Reset your InsightApex password",
    html: `<p>Reset your password by visiting:</p><p><a href="${url}">${url}</a></p><p>This link expires in 1 hour.</p>`,
  });
}
