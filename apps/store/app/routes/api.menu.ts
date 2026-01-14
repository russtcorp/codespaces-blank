/**
 * Store Dashboard - Menu API Route
 *
 * Handles menu management operations:
 * - GET /api/menu - List all menu items
 * - POST /api/menu - Create new item
 * - PUT /api/menu/:id - Update item
 * - DELETE /api/menu/:id - Delete item
 * - POST /api/menu/:id/toggle-availability - Toggle 86 status
 *
 * Also handles category operations:
 * - GET /api/categories - List categories
 * - POST /api/categories - Create category
 * - PUT /api/categories/:id - Update category
 *
 * Requires authentication and tenant context
 */

import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";

/**
 * GET: Fetch menu items and categories
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  // Phase 2: This would be implemented in Phase 4 when authentication is ready
  // For now, return stub data

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "list";

  if (action === "list") {
    return json({
      items: [],
      categories: [],
      message: "[Phase 2 Stub] Menu items will be fetched from D1 in Phase 4",
    });
  }

  if (action === "get-upload-url") {
    return json({
      uploadURL: "https://api.example.com/upload",
      message: "[Phase 2 Stub] Cloudflare Images upload URL",
    });
  }

  return json({ error: "Unknown action" }, { status: 400 });
}

/**
 * POST/PUT/DELETE: Modify menu items and categories
 */
export async function action({ request, context }: ActionFunctionArgs) {
  // Phase 2: This would be implemented in Phase 4
  // For now, return stub responses

  const method = request.method;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (method === "POST" && action === "create-item") {
    return json(
      {
        success: true,
        message: "[Phase 2 Stub] Menu item created",
        itemId: 1,
      },
      { status: 201 }
    );
  }

  if (method === "PUT" && action === "update-item") {
    return json({
      success: true,
      message: "[Phase 2 Stub] Menu item updated",
    });
  }

  if (method === "DELETE" && action === "delete-item") {
    return json({
      success: true,
      message: "[Phase 2 Stub] Menu item deleted",
    });
  }

  if (method === "POST" && action === "toggle-availability") {
    return json({
      success: true,
      message: "[Phase 2 Stub] Item availability toggled",
    });
  }

  return json({ error: "Unknown action" }, { status: 400 });
}
