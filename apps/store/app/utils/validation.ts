import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

export const menuItemSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional().nullable(),
  price: z.number().min(0, 'Price must be positive').max(9999.99, 'Price too high'),
  dietaryTags: z.string().optional().nullable(),
  dietaryTagsVerified: z.boolean().default(false),
  imageUrl: z.string().url().optional().nullable(),
});

export const operatingHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
}).refine((data) => {
  const start = data.startTime.split(':').map(Number);
  const end = data.endTime.split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  return startMinutes < endMinutes;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export const specialDateSchema = z.object({
  dateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  status: z.enum(['closed', 'open', 'limited']),
  reason: z.string().max(200, 'Reason too long').optional().nullable(),
});

export const businessInfoSchema = z.object({
  address: z.string().max(300).optional().nullable(),
  phonePublic: z.string().max(20).optional().nullable(),
  timezone: z.string(),
});

export const themeConfigSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional().nullable(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional().nullable(),
  fontHeading: z.string().optional().nullable(),
  fontBody: z.string().optional().nullable(),
  layoutStyle: z.enum(['grid', 'list', 'minimal', 'print']).optional().nullable(),
});

// Helper to parse form data into zod schema
export function validateFormData<T>(schema: z.ZodSchema<T>, formData: FormData): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const rawData: Record<string, any> = {};
  
  for (const [key, value] of formData.entries()) {
    if (key === 'intent') continue;
    if (value === 'true') rawData[key] = true;
    else if (value === 'false') rawData[key] = false;
    else if (value && !isNaN(Number(value)) && key.includes('Id') || key === 'price' || key === 'dayOfWeek') {
      rawData[key] = Number(value);
    } else {
      rawData[key] = value;
    }
  }

  const result = schema.safeParse(rawData);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const errors: Record<string, string> = {};
    result.error.errors.forEach((err) => {
      const path = err.path.join('.');
      errors[path] = err.message;
    });
    return { success: false, errors };
  }
}
