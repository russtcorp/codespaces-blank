type Env = {
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
};

export async function sendSms(env: Env, to: string, body: string) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn('Twilio env missing, skipping SMS send');
    return { success: false, skipped: true } as const;
  }

  const creds = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const params = new URLSearchParams();
  params.append('To', to);
  params.append('From', TWILIO_PHONE_NUMBER);
  params.append('Body', body);

  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error('Twilio send failed', resp.status, text);
    return { success: false, skipped: false } as const;
  }

  return { success: true } as const;
}