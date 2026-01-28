import { z } from "zod";

const EmailSchema = z.object({
  to: z.object({
    email: z.string().email(),
    name: z.string().optional(),
  }),
  from: z.object({
    email: z.string().email(),
    name: z.string(),
  }),
  subject: z.string(),
  text: z.string().optional(),
  html: z.string().optional(),
});

export type EmailPayload = z.infer<typeof EmailSchema>;

/**
 * Send email via MailChannels (Cloudflare Workers Native Integration)
 * No API Key required if SPF records are set correctly.
 * 
 * SPF Record needed on sending domain:
 * v=spf1 include:relay.mailchannels.net ~all
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const validation = EmailSchema.safeParse(payload);
  if (!validation.success) {
    console.error("Invalid email payload", validation.error);
    return false;
  }

  const { to, from, subject, text, html } = payload;

  // Construct MailChannels body
  const body = {
    personalizations: [
      {
        to: [{ email: to.email, name: to.name }],
      },
    ],
    from: { email: from.email, name: from.name },
    subject: subject,
    content: [] as { type: string; value: string }[],
  };

  if (text) body.content.push({ type: "text/plain", value: text });
  if (html) body.content.push({ type: "text/html", value: html });

  try {
    const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const respText = await response.text();
      console.error(`MailChannels Error: ${response.status} - ${respText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("MailChannels Fetch Error:", error);
    return false;
  }
}
