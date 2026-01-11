type Env = {
  MAILCHANNELS_API_KEY?: string;
};

export async function sendMagicLinkEmail(
  env: Env,
  to: string,
  verifyUrl: string,
  businessName: string = 'Your Diner'
) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">Sign in to ${businessName}</h1>
        <p style="color: #666; line-height: 1.5;">
          Click the button below to sign in to your dashboard. This link expires in 15 minutes.
        </p>
        <p style="margin: 30px 0;">
          <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #b22222; color: white; text-decoration: none; border-radius: 6px;">
            Sign in to Dashboard
          </a>
        </p>
        <p style="color: #999; font-size: 12px;">
          If you didn't request this email, you can safely ignore it.
        </p>
      </body>
    </html>
  `;

  const text = `Sign in to ${businessName}\n\nClick this link to sign in: ${verifyUrl}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this email, you can safely ignore it.`;

  try {
    // MailChannels API via Cloudflare Workers
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
          },
        ],
        from: {
          email: 'noreply@dinersaas.com',
          name: businessName,
        },
        subject: `Sign in to ${businessName}`,
        content: [
          {
            type: 'text/plain',
            value: text,
          },
          {
            type: 'text/html',
            value: html,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`MailChannels error: ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    // Don't throw - fall back to logging in dev
    return { success: false, error };
  }
}
