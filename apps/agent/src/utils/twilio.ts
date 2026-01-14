/**
 * Verify Twilio signature using the documented algorithm:
 * signature = Base64(HMAC-SHA1(authToken, url + sortedParams))
 */
export async function verifyTwilioSignature(
  authToken: string,
  signature: string | null,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  if (!signature || !authToken) return false;

  const sorted = Object.keys(params)
    .sort()
    .map((k) => k + params[k])
    .join("");
  const data = url + sorted;

  const expected = await hmacSha1Base64(authToken, data);
  return timingSafeEqual(expected, signature);
}

async function hmacSha1Base64(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  return bufferToBase64(signature);
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Constant-time compare to avoid timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Parse application/x-www-form-urlencoded body into key/value pairs
 */
export async function parseFormBody(request: Request): Promise<Record<string, string>> {
  const text = await request.text();
  const params = new URLSearchParams(text);
  const result: Record<string, string> = {};
  for (const [k, v] of params.entries()) {
    result[k] = v;
  }
  return result;
}

/**
 * Generate a random 6-digit OTP code using Web Crypto
 */
export function generateOtpCode(length = 6): string {
  const digits = "0123456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (n) => digits[n % digits.length]).join("");
}

export interface OtpRecord {
  code: string;
  expiresAt: number;
}

/**
 * Verify an OTP code against a record, ensuring not expired
 */
export function verifyOtpCode(code: string, record?: OtpRecord | null): boolean {
  if (!record) return false;
  const now = Date.now();
  if (now > record.expiresAt) return false;
  return timingSafeEqual(record.code, code);
}
