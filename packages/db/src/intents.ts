// A centralized object for all form submission intents.
// This prevents typos and improves maintainability by providing a single source of truth.

export const INTENTS = {
  // Menu Actions
  createCategory: "create-category",
  updateCategory: "update-category",
  deleteCategory: "delete-category",
  createItem: "create-item",
  updateItem: "update-item",
  deleteItem: "delete-item",
  reorderCategories: "reorder-categories",
  moveItem: "move-item",
  requestUploadUrl: "request-upload-url",
  generateDescription: "generate-description",

  // Review Actions
  approveResponse: "approve-response",
  generateDraft: "generate-draft",

  // Auth Actions
  // (While not in forms, useful for consistency if used in API calls)
  sendMagicLink: "send-magic-link",
  verifyMagicLink: "verify-magic-link",

  // Onboarding Actions
  startWorkflow: "start-workflow",
  checkStatus: "check-status",
  approveOnboarding: "approve",
} as const;
