import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useFetcher, useRouteError, isRouteError, Link } from "@remix-run/react";
import { getAuthenticator } from "~/services/auth.server";
import { eq, and, desc, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { reviews } from "@diner-saas/db";
import { Button } from "@diner-saas/ui/button";
import { Card } from "@diner-saas/ui/card";
import { StarIcon, SparklesIcon, Smile, Meh, Frown } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { INTENTS } from "@diner-saas/db/intents";
import { approveReviewResponse, generateReviewResponseDraft } from "@diner-saas/db/src/reviews-crud";

// ... (loader)

export async function action({ request, context }: ActionFunctionArgs) {
  const authenticator = getAuthenticator(context.cloudflare.env as any);
  const user = await authenticator.isAuthenticated(request);
  if (!user) return redirect("/login");
  
  const db = drizzle(context.cloudflare.env.DB);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const reviewId = parseInt(formData.get("reviewId") as string);
  const response = formData.get("response") as string;

  if (intent === INTENTS.approveResponse) {
    const { success } = await approveReviewResponse(db, user.tenantId, reviewId, response);
    if (success) {
      const review = await db.select({ reviewerName: reviews.reviewerName }).from(reviews).where(eq(reviews.id, reviewId)).get();
      await context.cloudflare.env.EMAIL_QUEUE.send({
        type: 'review-response-confirmation',
        payload: {
          recipientEmail: user.email,
          tenantName: user.name || user.tenantId,
          reviewerName: review?.reviewerName || 'the customer',
        }
      });

  if (intent === "approve-response") {
    const responseText = formData.get("response") as string;
    
    // Update DB
    await db
      .update(reviews)
      .set({ 
        aiDraftResponse: responseText, // Save final text here or a new column 'final_response'
        status: "posted", // Assume success for MVP
        postedAt: new Date().toISOString()
      })
      .where(and(eq(reviews.id, reviewId), eq(reviews.tenantId, user.tenantId)))
      .run();

    // Trigger API call to Google/Yelp (Stubbed)
    console.log(`Posting response to ${reviewId}: ${responseText}`);

    return json({ success: true });
  }

  if (intent === "generate-draft") {
    // Call AI
    const reviewContent = formData.get("content") as string;
    if (!env.AI) return json({ error: "AI not available" }, { status: 500 });
    
    // Validate reviewId is a number
    if (isNaN(reviewId)) {
      return json({ error: "Invalid review ID" }, { status: 400 });
    }

    try {
        const aiResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
            messages: [
                { role: "system", content: "You are a helpful business owner replying to a customer review. Be polite, professional, and concise." },
                { role: "user", content: `Write a response to this review: "${reviewContent}"` }
            ]
        });
        const draft = typeof aiResponse === 'string' ? aiResponse : aiResponse.response;
        
        // Add tenant isolation to prevent cross-tenant manipulation
        await db.update(reviews)
          .set({ aiDraftResponse: draft, status: "drafted" })
          .where(and(eq(reviews.id, reviewId), eq(reviews.tenantId, user.tenantId)))
          .run();
        return json({ success: true, draft });
    } catch (e) {
        return json({ error: "AI Generation failed" }, { status: 500 });
    }
    return json({ success });
  }

  // ... (generateDraft logic)

  return json({ error: "Invalid intent" }, { status: 400 });
}

// ... (rest of the file)