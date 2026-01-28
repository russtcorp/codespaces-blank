import { z } from "zod";

export const createCategorySchema = z.object({
  intent: z.literal("create-category"),
  name: z.string().min(1, "Name is required"),
  sortOrder: z.coerce.number().default(0),
});

export const updateCategorySchema = z.object({
  intent: z.literal("update-category"),
  id: z.coerce.number(),
  name: z.string().min(1, "Name is required"),
  sortOrder: z.coerce.number(),
});

export const createItemSchema = z.object({
  intent: z.literal("create-item"),
  categoryId: z.coerce.number(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  imageCfId: z.string().optional().nullable(),
});

// Union schema for the action
export const menuActionSchema = z.discriminatedUnion("intent", [
  createCategorySchema,
  updateCategorySchema,
  createItemSchema,
  // Add others as needed or use loose validation for legacy parts
  z.object({ intent: z.literal("delete-category"), id: z.coerce.number() }),
  z.object({ intent: z.literal("delete-item"), id: z.coerce.number() }),
  z.object({ 
    intent: z.literal("update-item"), 
    id: z.coerce.number(),
    name: z.string(),
    description: z.string(),
    price: z.coerce.number(),
    imageCfId: z.string().optional().nullable(),
    isAvailable: z.enum(["true", "false"]).transform(val => val === "true")
  }),
  z.object({ intent: z.literal("reorder-categories"), order: z.string() }), // Parse JSON manually or refine schema
  z.object({ intent: z.literal("move-item"), itemId: z.coerce.number(), newCategoryId: z.coerce.number() }),
  z.object({ intent: z.literal("request-upload-url") }),
  z.object({ intent: z.literal("generate-description"), name: z.string(), ingredients: z.string().optional() }),
]);
