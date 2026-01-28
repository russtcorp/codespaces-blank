import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { reviews, tenants } from "@diner-saas/db";
import { eq } from "drizzle-orm";

// This is a simulated webhook endpoint to demonstrate receiving a new review.
// In a real-world scenario, this would be protected and called by a service like Google.
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as any;
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  // WARNING: In production, you MUST validate the authenticity of this request.
  const { tenantId, reviewerName, rating, content } = await request.json();
  if (!tenantId || !reviewerName || !rating || !content) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }
  
  const db = drizzle(env.DB);
  try {
    // 1. Save the new review to the database
    await db.insert(reviews).values({
      tenantId,
      reviewerName,
      rating,
      content,
      status: 'new',
      postedAt: new Date().toISOString(),
    }).run();

    // 2. Get tenant owner's email for notification
    const tenant = await db.select({ ownerEmail: tenants.ownerEmail, businessName: tenants.businessName }).from(tenants).where(eq(tenants.id, tenantId)).get();
    if (!tenant) {
      return json({ error: "Tenant not found"}, { status: 404 });
    }

    // 3. Enqueue the email notification
    await env.EMAIL_QUEUE.send({
      type: 'new-review',
      payload: {
        recipientEmail: tenant.ownerEmail,
        tenantName: tenant.businessName,
        reviewerName,
        rating,
      }
    });

    return json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to ingest review:", error);
    return json({ error: "Could not ingest review" }, { status: 500 });
  }
}
