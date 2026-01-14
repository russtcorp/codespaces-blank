/**
 * Store Dashboard - Operations API Route
 *
 * Handles business operations:
 * - GET /api/operations/status - Check if diner is open/closed
 * - POST /api/operations/emergency-close - Trigger emergency close
 * - POST /api/operations/clear-emergency - Clear emergency status
 * - GET /api/operations/hours - Get operating hours
 * - PUT /api/operations/hours - Update operating hours
 *
 * Requires authentication and tenant context
 */

import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";

/**
 * GET: Fetch operational data (status, hours, settings)
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "status";

  if (action === "status") {
    // Phase 2 Stub: getOpenStatus would be called here
    return json({
      isOpen: true,
      status: "open",
      currentTime: new Date().toISOString(),
      timeZone: "America/Chicago",
      message: "[Phase 2 Stub] Open status will be calculated in Phase 4",
    });
  }

  if (action === "hours") {
    return json({
      hours: [],
      message: "[Phase 2 Stub] Operating hours will be fetched in Phase 4",
    });
  }

  if (action === "emergency-status") {
    return json({
      isEmergencyClosed: false,
      message: "[Phase 2 Stub] Emergency status will be checked in Phase 4",
    });
  }

  return json({ error: "Unknown action" }, { status: 400 });
}

/**
 * POST/PUT: Modify operational settings
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const method = request.method;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (method === "POST" && action === "emergency-close") {
    // Phase 2: EmergencyButtonService.triggerEmergencyClose would be called
    return json(
      {
        success: true,
        message: "[Phase 2 Stub] Emergency close triggered",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }

  if (method === "POST" && action === "clear-emergency") {
    // Phase 2: EmergencyButtonService.clearEmergencyClose would be called
    return json({
      success: true,
      message: "[Phase 2 Stub] Emergency close cleared",
    });
  }

  if (method === "PUT" && action === "hours") {
    // Phase 2: Update operating hours in D1
    return json({
      success: true,
      message: "[Phase 2 Stub] Operating hours updated",
    });
  }

  if (method === "POST" && action === "holiday") {
    // Phase 2: Add/update special date
    return json({
      success: true,
      message: "[Phase 2 Stub] Holiday added",
    });
  }

  return json({ error: "Unknown action" }, { status: 400 });
}
