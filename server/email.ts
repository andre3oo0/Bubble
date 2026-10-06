// Sends transactional email (password reset, email verification) over HTTP, through
// Brevo (free, no domain needed) or Resend (needs a verified domain). Brevo wins if
// both are set. Without either, the message is printed to the console instead, which
// is what you want locally; in production that means nobody gets the email.

export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export function emailConfigured() {
  return Boolean((process.env.BREVO_API_KEY || process.env.RESEND_API_KEY) && process.env.EMAIL_FROM);
}

// "Bubble <hello@example.com>" or a bare address
export function parseSender(from: string): { name?: string; email: string } {
  const match = from.match(/^\s*(.*?)\s*<\s*([^>]+?)\s*>\s*$/);
  if (!match) return { email: from.trim() };
  return match[1] ? { name: match[1].replace(/^"|"$/g, ""), email: match[2] } : { email: match[2] };
}

export async function sendEmail(email: Email): Promise<void> {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.error(`Email not sent (BREVO_API_KEY or RESEND_API_KEY, and EMAIL_FROM, not set): "${email.subject}"`);
      return;
    }
    console.log(`\n[email] to ${email.to}: ${email.subject}\n${email.text}\n`);
    return;
  }

  if (process.env.BREVO_API_KEY) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: parseSender(process.env.EMAIL_FROM!),
        to: [{ email: email.to }],
        subject: email.subject,
        textContent: email.text,
        htmlContent: email.html,
      }),
    });

    if (!res.ok) {
      throw new Error(`Brevo rejected the email: ${res.status} ${await res.text()}`);
    }
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend rejected the email: ${res.status} ${await res.text()}`);
  }
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// No names in emails: anyone can sign up with any name and any address, so a name
// here would let a stranger put their own words in an email that comes from Bubble
function linkEmail(to: string, subject: string, intro: string, action: string, url: string, outro: string): Email {
  return {
    to,
    subject,
    text: `Hi,

${intro}

${url}

${outro}

Bubble`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#1b2430;max-width:480px">
<p>Hi,</p>
<p>${intro}</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#0b6bb8;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">${action}</a></p>
<p style="color:#5b6675;font-size:14px">${outro}</p>
<p>Bubble</p>
</div>`,
  };
}

export const resetPasswordEmail = (to: string, url: string) =>
  linkEmail(
    to,
    "Reset your Bubble password",
    "Someone asked to reset the password for your Bubble account. Tap the button to choose a new one.",
    "Choose a new password",
    url,
    "The link works for one hour. If this wasn't you, you can ignore this email and your password stays the same.",
  );

export const verifyEmail = (to: string, url: string) =>
  linkEmail(
    to,
    "Confirm your email for Bubble",
    "Please confirm this is your email address, so you can reset your password if you ever forget it.",
    "Confirm my email",
    url,
    "If you didn't create a Bubble account, you can ignore this email.",
  );

// Sign-up answers the same whether or not an account exists, so the real owner of
// the address hears about it here instead
export const existingAccountEmail = (to: string, url: string) =>
  linkEmail(
    to,
    "Someone tried to sign up to Bubble with your email",
    "Someone tried to create a Bubble account with this email address, but you already have one. If it was you, sign in instead, or reset your password if you've forgotten it.",
    "Open Bubble",
    url,
    "If it wasn't you, you can ignore this email. Nothing has changed on your account.",
  );
