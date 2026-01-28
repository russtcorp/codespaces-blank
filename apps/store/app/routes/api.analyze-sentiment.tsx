import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { reviews } from "@diner-saas/db";
import { eq } from "drizzle-orm";
import { generateObject } from 'ai';
import { getAIProvider } from "@diner-saas/ai/src/provider";
import { z } from "zod";
import { getSession } from "~/services/auth.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as any;
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  // Authenticate the user
  const { user } = await getSession(request, context);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { reviewId, content } = await request.json();
  // ... (validation)
  
  const db = drizzle(env.DB);
  
  // Verify the review exists and belongs to the user's tenant
  const review = await db.select({ tenantId: reviews.tenantId }).from(reviews).where(eq(reviews.id, reviewId)).get();
  if (!review) {
    return json({ error: 'Review not found' }, { status: 404 });
  }
  
  // Validate tenant access
  if (review.tenantId !== user.tenantId) {
    return json({ error: 'Unauthorized access to this review' }, { status: 403 });
  }
  
  const { largeModel } = getAIProvider(env);

  try {
    const { object } = await generateObject({
      model: largeModel,
      schema: z.object({
        sentiment: z.enum(['positive', 'neutral', 'negative']),
      }),
      prompt: `Analyze the sentiment of this review. Review: "${content}"`,
    });

    await db.update(reviews)
      .set({ sentiment: object.sentiment })
      .where(eq(reviews.id, reviewId));
    
    return json({ success: true, sentiment: object.sentiment });

  } catch (error) {
    logger.error("Sentiment analysis failed:", error);
    return json({ error: 'Failed to analyze sentiment' }, { status: 500 });
  }
}
