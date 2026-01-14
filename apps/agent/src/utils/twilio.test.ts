import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyTwilioSignature, generateOtpCode, verifyOtpCode, type OtpRecord } from "./twilio";

// Example from Twilio docs for signature verification (adapted)
// Using known token and params to produce deterministic signature
const AUTH_TOKEN = "12345";
const URL = "https://mycompany.com/myapp";
const PARAMS = { Foo: "1", Bar: "2" }; // will be concatenated as Bar2Foo1 after sorting

const EXPECTED_SIGNATURE = createHmac("sha1", AUTH_TOKEN)
  .update(URL + "Bar2Foo1")
  .digest("base64");

describe("twilio utils", () => {
  it("verifies twilio signature", async () => {
    const ok = await verifyTwilioSignature(AUTH_TOKEN, EXPECTED_SIGNATURE, URL, PARAMS);
    expect(ok).toBe(true);
  });

  it("rejects invalid signature", async () => {
    const ok = await verifyTwilioSignature(AUTH_TOKEN, "bad-signature", URL, PARAMS);
    expect(ok).toBe(false);
  });

  it("generates numeric OTP and verifies before expiry", () => {
    const code = generateOtpCode();
    expect(code).toHaveLength(6);
    expect(/^[0-9]+$/.test(code)).toBe(true);

    const record: OtpRecord = {
      code,
      expiresAt: Date.now() + 60_000,
    };

    expect(verifyOtpCode(code, record)).toBe(true);
    expect(verifyOtpCode("000000", record)).toBe(false);
  });

  it("rejects expired OTP", () => {
    const record: OtpRecord = {
      code: "123456",
      expiresAt: Date.now() - 1000,
    };
    expect(verifyOtpCode("123456", record)).toBe(false);
  });
});
