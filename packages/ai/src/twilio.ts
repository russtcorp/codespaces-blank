/**
 * Twilio A2P 10DLC Helper
 * Manages business profiles and campaign registration with Twilio
 */

export interface BusinessProfile {
  businessName: string;
  businessType:
    | "individual"
    | "sole_proprietorship"
    | "non_profit"
    | "partnership"
    | "corporation"
    | "llc";
  businessRegistrationId?: string; // EIN or similar
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  email: string;
  phoneNumber: string;
  website?: string;
}

export interface A2PCampaign {
  businessProfileSid: string;
  campaignDescription: string;
  useCase: string; // e.g., "2FA", "MARKETING", "CUSTOMER_CARE"
  messageSamples: string[];
  messageFlowDescription: string;
  tagLine?: string;
}

/**
 * Helper to validate business profile data before submission
 */
export function validateBusinessProfile(profile: BusinessProfile): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!profile.businessName?.trim()) {
    errors.push("Business name is required");
  }
  if (!profile.businessType) {
    errors.push("Business type is required");
  }
  if (!profile.address?.trim()) {
    errors.push("Business address is required");
  }
  if (!profile.city?.trim()) {
    errors.push("City is required");
  }
  if (!profile.state?.trim()) {
    errors.push("State is required");
  }
  if (!profile.zipCode?.trim()) {
    errors.push("ZIP code is required");
  }
  if (!profile.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    errors.push("Valid email is required");
  }
  if (!profile.phoneNumber?.match(/^\+?1?\d{10}$/)) {
    errors.push("Valid phone number is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Helper to format business profile for Twilio API submission
 */
export function formatBusinessProfileForTwilio(profile: BusinessProfile) {
  return {
    friendly_name: profile.businessName,
    type: profile.businessType,
    business_registration_identity: profile.businessRegistrationId || "",
    address: {
      street: profile.address,
      city: profile.city,
      state: profile.state,
      postal_code: profile.zipCode,
      country_code: profile.country || "US",
    },
    email: profile.email,
    phone_number: profile.phoneNumber,
    website: profile.website || "",
  };
}

/**
 * Helper to format campaign for Twilio API submission
 */
export function formatCampaignForTwilio(campaign: A2PCampaign) {
  return {
    friendly_name: campaign.campaignDescription,
    business_profile_sid: campaign.businessProfileSid,
    use_cases: [campaign.useCase],
    message_samples: campaign.messageSamples,
    description: campaign.messageFlowDescription,
    tag_line: campaign.tagLine || "",
  };
}
