/**
 * Dietary tag types (allergens and preferences)
 */
export const DIETARY_TAGS = {
  VEGETARIAN: 'V', // Vegetarian
  VEGAN: 'VG', // Vegan
  GLUTEN_FREE: 'GF', // Gluten-Free
  DAIRY_FREE: 'DF', // Dairy-Free
  NUT_FREE: 'NF', // Nut-Free
  SOY_FREE: 'SF', // Soy-Free
  HALAL: 'H', // Halal
  KOSHER: 'K', // Kosher
  SPICY: 'S', // Spicy
  LOW_CARB: 'LC', // Low Carb
} as const;

export type DietaryTag = (typeof DIETARY_TAGS)[keyof typeof DIETARY_TAGS];

/**
 * Display names for dietary tags
 */
export const DIETARY_TAG_NAMES: Record<DietaryTag, string> = {
  V: 'Vegetarian',
  VG: 'Vegan',
  GF: 'Gluten-Free',
  DF: 'Dairy-Free',
  NF: 'Nut-Free',
  SF: 'Soy-Free',
  H: 'Halal',
  K: 'Kosher',
  S: 'Spicy',
  LC: 'Low Carb',
};

/**
 * Maximum file sizes for uploads (in bytes)
 */
export const UPLOAD_LIMITS = {
  IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  PDF_MAX_SIZE: 10 * 1024 * 1024, // 10MB
} as const;

/**
 * Supported image formats
 */
export const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;

/**
 * Price range limits (in cents)
 */
export const PRICE_LIMITS = {
  MIN: 0, // Free items allowed
  MAX: 999999, // $9,999.99 max (unlikely for diner food!)
} as const;
