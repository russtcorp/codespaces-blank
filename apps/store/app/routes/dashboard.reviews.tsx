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
    }
    return json({ success });
  }

  // ... (generateDraft logic)

  return json({ error: "Invalid intent" }, { status: 400 });
}

// ... (rest of the file)