export interface MagicLinkEmail {
  type: 'magic_link';
  to: string;
  token: string;
  link: string;
}

// Add other email types here, e.g., UsageAlertEmail
export type EmailPayload = MagicLinkEmail;

export interface Env {
  EMAIL_FROM_DOMAIN: string;
  EMAIL_FROM_NAME: string;
  SUPPORT_EMAIL: string;
}

export async function handleEmailQueue(
  batch: MessageBatch<EmailPayload>,
  env: Env
) {
  for (const msg of batch.messages) {
    const { body } = msg;

    try {
      switch (body.type) {
        case 'magic_link':
          await sendMagicLinkEmail(body, env);
          break;
        // Add other cases here
        default:
          console.error(`Unknown email type: ${(body as any).type}`);
      }
      msg.ack();
    } catch (error) {
      console.error('Error sending email:', error);
      msg.retry();
    }
  }
}

async function sendMagicLinkEmail(payload: MagicLinkEmail, env: Env) {
  const fromEmail = `noreply@${env.EMAIL_FROM_DOMAIN}`;
  const fromName = env.EMAIL_FROM_NAME || 'Diner SaaS';

  const mailchannelsRequest = {
    personalizations: [
      {
        to: [{ email: payload.to }],
      },
    ],
    from: {
      email: fromEmail,
      name: fromName,
    },
    subject: 'Your Magic Link to Sign In',
    content: [
      {
        type: 'text/html',
        value: `
          <h1>Click to Sign In</h1>
          <p>This link will expire in 15 minutes and can only be used once.</p>
          <a href="${payload.link}">Click here to log in</a>
          <p>If you did not request this, you can safely ignore this email.</p>
        `,
      },
    ],
  };

  const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mailchannelsRequest),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`MailChannels API Error: ${response.status} ${body}`);
  }
}
