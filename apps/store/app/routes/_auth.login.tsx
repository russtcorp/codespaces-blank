import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { getAuthenticator, verifyTurnstile, sendMagicLink } from "~/services/auth.server";
import { Button } from "@diner-saas/ui/button";
import { Input } from "@diner-saas/ui/input";
import { Card } from "@diner-saas/ui/card";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const authenticator = getAuthenticator(env);
  
  // If user is already authenticated, redirect to dashboard
  const user = await authenticator.isAuthenticated(request);
  if (user) {
    return redirect("/dashboard");
  }
  
  return json({
    turnstileSiteKey: env?.TURNSTILE_SITE_KEY || "",
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const formData = await request.formData();
  const intent = formData.get("intent");

  // Handle magic link request
  if (intent === "request-magic-link") {
    const email = formData.get("email");
    const turnstileToken = formData.get("cf-turnstile-response");

    if (typeof email !== "string" || !email) {
      return json({ error: "Email is required" }, { status: 400 });
    }

    if (typeof turnstileToken !== "string" || !turnstileToken) {
      return json({ error: "Please complete the security check" }, { status: 400 });
    }

    // Verify Turnstile token
    const isTurnstileValid = await verifyTurnstile(turnstileToken, env);

    if (!isTurnstileValid) {
      return json({ error: "Security check failed. Please try again." }, { status: 400 });
    }

    // Send magic link
    const result = await sendMagicLink(email as string, env);

    if (!result.success) {
      return json({ error: result.error || "Failed to send magic link" }, { status: 500 });
    }

    return json({ 
      success: true, 
      message: "Check your email for a magic link to sign in." 
    });
  }

  // Handle magic link verification
  if (intent === "verify-magic-link") {
    try {
      const authenticator = getAuthenticator(env);
      await authenticator.authenticate("magic-link", request, {
        successRedirect: "/dashboard",
        failureRedirect: "/auth/login?error=invalid-link",
      });
      return redirect("/dashboard");
    } catch (error) {
      console.error("Authentication error:", error);
      return redirect("/auth/login?error=invalid-link");
    }
  }

  return json({ error: "Invalid request" }, { status: 400 });
}

export default function AuthLogin() {
  const data = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to your dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email to receive a magic link
          </p>
        </div>

        {data?.success && (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">{data.message}</p>
          </div>
        )}

        {data?.error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{data.error}</p>
          </div>
        )}

        <Form method="post" className="mt-8 space-y-6">
          <input type="hidden" name="intent" value="request-magic-link" />
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1"
              placeholder="you@example.com"
              disabled={isSubmitting}
            />
          </div>

          {/* Cloudflare Turnstile */}
          <div 
            className="cf-turnstile" 
            data-sitekey={data?.turnstileSiteKey}
            data-theme="light"
          />

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send Magic Link"}
          </Button>
        </Form>

        <p className="mt-4 text-center text-xs text-gray-500">
          Protected by Cloudflare Turnstile
        </p>
      </Card>

      {/* Load Turnstile script */}
      <script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
      />
    </div>
  );
}
