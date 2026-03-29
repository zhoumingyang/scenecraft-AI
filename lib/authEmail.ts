const resendApiKey = process.env.RESEND_API_KEY;
const authEmailFrom = process.env.AUTH_EMAIL_FROM;

type SendAuthEmailArgs = {
  to: string;
  subject: string;
  html: string;
};

async function sendByResend({ to, subject, html }: SendAuthEmailArgs) {
  if (!resendApiKey || !authEmailFrom) {
    throw new Error("Missing RESEND_API_KEY or AUTH_EMAIL_FROM env");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: authEmailFrom,
      to,
      subject,
      html
    })
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Resend send failed: ${response.status} ${payload}`);
  }
}

export async function sendAuthEmail(args: SendAuthEmailArgs) {
  if (resendApiKey && authEmailFrom) {
    await sendByResend(args);
    return;
  }

  // Fallback for local development when email provider is not configured.
  // This keeps auth flows testable by copying the link from server logs.
  // eslint-disable-next-line no-console
  console.info(`[auth-email:fallback] to=${args.to} subject=${args.subject}\\n${args.html}`);
}

export function buildAuthEmailTemplate(params: {
  title: string;
  intro: string;
  actionUrl: string;
  actionText: string;
  expireText: string;
}) {
  const { title, intro, actionUrl, actionText, expireText } = params;

  return `
    <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #dbe8ff; background: #070b19; padding: 28px;">
      <div style="max-width: 560px; margin: 0 auto; background: #0f1730; border: 1px solid #25315a; border-radius: 12px; padding: 24px;">
        <h2 style="margin: 0 0 12px; color: #f2f7ff;">${title}</h2>
        <p style="margin: 0 0 20px; line-height: 1.7; color: #bed2ff;">${intro}</p>
        <a href="${actionUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 999px; text-decoration: none; color: #081327; font-weight: 700; background: linear-gradient(90deg, #8da2ff, #80e4ff);">${actionText}</a>
        <p style="margin: 18px 0 0; font-size: 13px; color: #92a8d8;">${expireText}</p>
        <p style="margin: 10px 0 0; font-size: 12px; color: #7f95c5; word-break: break-all;">${actionUrl}</p>
      </div>
    </div>
  `;
}
