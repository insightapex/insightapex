type EmailTemplateParams = {
  title: string;
  previewText: string;
  heading: string;
  bodyHtml: string;
  buttonLabel: string;
  buttonUrl: string;
  footerNote: string;
  appUrl: string;
};

function layout({
  title,
  previewText,
  heading,
  bodyHtml,
  buttonLabel,
  buttonUrl,
  footerNote,
  appUrl,
}: EmailTemplateParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${title}</title>
  <!--[if mso]><style>body,table,td{font-family:Arial,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${previewText}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(16,24,40,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#163fd1 0%,#2456f5 50%,#4d80ff 100%);padding:28px 32px;text-align:center;">
              <div style="display:inline-block;width:48px;height:48px;line-height:48px;border-radius:12px;background:rgba(255,255,255,0.2);color:#ffffff;font-weight:700;font-size:18px;">IA</div>
              <div style="margin-top:12px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.02em;">InsightApex</div>
              <div style="margin-top:4px;color:rgba(255,255,255,0.85);font-size:13px;">ACCA Exam Preparation</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0b1220;font-weight:700;">${heading}</h1>
              <div style="font-size:15px;line-height:1.6;color:#475569;">${bodyHtml}</div>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="border-radius:10px;background:#163fd1;">
                    <a href="${buttonUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${buttonLabel}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#94a3b8;word-break:break-all;">
                Or copy this link:<br />
                <a href="${buttonUrl}" style="color:#163fd1;text-decoration:none;">${buttonUrl}</a>
              </p>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#94a3b8;">${footerNote}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                &copy; ${new Date().getFullYear()} InsightApex &middot;
                <a href="${appUrl}" style="color:#163fd1;text-decoration:none;">${appUrl.replace(/^https?:\/\//, "")}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function verificationEmailHtml(appUrl: string, verifyUrl: string): string {
  return layout({
    title: "Verify your InsightApex account",
    previewText: "Confirm your email to start your ACCA prep with InsightApex.",
    heading: "Welcome to InsightApex",
    bodyHtml: `
      <p style="margin:0 0 12px;">Thanks for signing up. Please confirm your email address to activate your account and start practising ACCA questions.</p>
      <p style="margin:0;">This link expires in <strong>24 hours</strong>.</p>
    `,
    buttonLabel: "Verify email address",
    buttonUrl: verifyUrl,
    footerNote: "If you did not create an InsightApex account, you can safely ignore this email.",
    appUrl,
  });
}

export function passwordResetEmailHtml(appUrl: string, resetUrl: string): string {
  return layout({
    title: "Reset your InsightApex password",
    previewText: "Reset your InsightApex password using the secure link inside.",
    heading: "Reset your password",
    bodyHtml: `
      <p style="margin:0 0 12px;">We received a request to reset the password for your InsightApex account. Click the button below to choose a new password.</p>
      <p style="margin:0;">This link expires in <strong>1 hour</strong>.</p>
    `,
    buttonLabel: "Reset password",
    buttonUrl: resetUrl,
    footerNote: "If you did not request a password reset, you can safely ignore this email. Your password will not change.",
    appUrl,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function lecturerMessageEmailHtml(params: {
  appUrl: string;
  lecturerName: string;
  schoolName: string;
  subject: string;
  message: string;
}): string {
  const lecturer = escapeHtml(params.lecturerName);
  const school = escapeHtml(params.schoolName);
  const subject = escapeHtml(params.subject);
  const message = escapeHtml(params.message).replace(/\n/g, "<br />");
  return layout({
    title: subject,
    previewText: `Message from ${lecturer} at ${school}`,
    heading: subject,
    bodyHtml: `
      <p style="margin:0 0 12px;"><strong>${lecturer}</strong> from <strong>${school}</strong> sent you a message:</p>
      <p style="margin:0;padding:14px 16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">${message}</p>
    `,
    buttonLabel: "Open InsightApex",
    buttonUrl: `${params.appUrl}/dashboard`,
    footerNote: "You received this because you are enrolled with this school on InsightApex.",
    appUrl: params.appUrl,
  });
}

