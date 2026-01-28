import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { getAuthenticator } from "~/services/auth.server";
import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { reviews } from "@diner-saas/db";
import { Button } from "@diner-saas/ui/button";
import { Card } from "@diner-saas/ui/card";
import { StarIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const authenticator = getAuthenticator(env);
  const user = await authenticator.isAuthenticated(request);
  const db = drizzle(env.DB);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const tenantReviews = await db
    .select()
    .from(reviews)
    .where(eq(reviews.tenantId, user.tenantId))
    .orderBy(desc(reviews.createdAt))
    .all();

  return json({ reviews: tenantReviews });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const authenticator = getAuthenticator(env);
  const user = await authenticator.isAuthenticated(request);
  const db = drizzle(env.DB);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");
  const reviewId = parseInt(formData.get("reviewId") as string);

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
  }

  return json({ error: "Invalid intent" }, { status: 400 });
}

export default function DashboardReviews() {
  const { reviews } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      toast.success(fetcher.data.draft ? "Draft generated" : "Response posted");
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>
        <p className="mt-2 text-gray-600">Manage and respond to customer feedback.</p>
      </div>

      <div className="grid gap-4">
        {reviews.length === 0 ? (
            <p className="text-gray-500">No reviews found.</p>
        ) : (
            reviews.map((review) => (
            <ReviewCard key={review.id} review={review} fetcher={fetcher} />
            ))
        )}
      </div>
    </div>
  );
}

function ReviewCard({ review, fetcher }: any) {
  const [draft, setDraft] = useState(review.aiDraftResponse || "");
  const isDrafting = fetcher.state === "submitting" && fetcher.formData?.get("intent") === "generate-draft" && fetcher.formData?.get("reviewId") === String(review.id);

  // Update local state if fetcher returns new draft
  useEffect(() => {
    if (fetcher.data?.draft && fetcher.data.success && fetcher.formData?.get("reviewId") === String(review.id)) {
        setDraft(fetcher.data.draft);
    }
  }, [fetcher.data]);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{review.reviewerName || "Anonymous"}</span>
            <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded capitalize">{review.platform}</span>
          </div>
          <div className="flex items-center mt-1 text-yellow-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <StarIcon key={i} className={`h-4 w-4 ${i < review.rating ? "fill-current" : "text-gray-300"}`} />
            ))}
          </div>
          <p className="mt-2 text-gray-700">{review.content}</p>
        </div>
        <span className="text-sm text-gray-500">
            {new Date(review.postedAt || review.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Response Section */}
      <div className="mt-4 border-t pt-4 bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-lg">
        {review.status === "posted" ? (
            <div>
                <p className="text-xs font-semibold text-green-600 mb-1">RESPONSE POSTED</p>
                <p className="text-sm text-gray-600 italic">"{review.aiDraftResponse}"</p>
            </div>
        ) : (
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-700">Your Response</label>
                    <button 
                        onClick={() => {
                            fetcher.submit({ intent: "generate-draft", reviewId: review.id, content: review.content }, { method: "post" });
                        }}
                        disabled={isDrafting}
                        className="text-xs flex items-center gap-1 text-blue-600 hover:underline disabled:opacity-50"
                    >
                        <SparklesIcon className="h-3 w-3" />
                        {isDrafting ? "Drafting..." : "Draft with AI"}
                    </button>
                </div>
                <textarea
                    className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    rows={3}
                    placeholder="Write a response..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                />
                <div className="flex justify-end">
                    <Button 
                        size="sm" 
                        onClick={() => {
                            fetcher.submit({ intent: "approve-response", reviewId: review.id, response: draft }, { method: "post" });
                        }}
                        disabled={!draft}
                    >
                        Post Response
                    </Button>
                </div>
            </div>
        )}
      </div>
    </Card>
  );
}
