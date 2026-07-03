import { Resend } from "resend";
import { getEmailConfig } from "./config";
import { EmailServiceError } from "./errors";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  const config = getEmailConfig();

  if (!config.resendApiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new EmailServiceError(
        "MISSING_CONFIG",
        "RESEND_API_KEY is not configured. Email cannot be sent in production."
      );
    }
    console.log(`[email:dev] To: ${to} | From: ${config.emailFrom} | Subject: ${subject}`);
    console.log(`[email:dev] HTML length: ${html.length} chars (open sent link from registration logs if needed)`);
    const linkMatch = html.match(/href="(http[^"]+)"/);
    if (linkMatch?.[1]) {
      console.log(`[email:dev] Action link: ${linkMatch[1]}`);
    }
    return;
  }

  const resend = new Resend(config.resendApiKey);
  const { error } = await resend.emails.send({
    from: config.emailFrom,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[email] Resend API error:", error);
    throw new EmailServiceError(
      "SEND_FAILED",
      error.message || "Failed to send email via Resend."
    );
  }
}
