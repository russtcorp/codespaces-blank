import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { getAuthenticator, verifyTurnstile, sendMagicLink } from "~/services/auth.server";
import { Button } from "@diner-saas/ui/button";
import { Input } from "@diner-saas/ui/input";
import { Card } from "@diner-saas/ui/card";
import { useRemixForm, getValidatedFormData, RemixFormProvider } from "remix-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useEffect } from "react";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  "cf-turnstile-response": z.string().optional(),
  intent: z.literal("request-magic-link"),
});

type LoginFormData = z.infer<typeof loginSchema>;
const resolver = zodResolver(loginSchema);

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
  
  // Validate form data with Zod
  const { errors, data, receivedValues: defaultValues } = await getValidatedFormData<LoginFormData>(
    request,
    resolver
  );

  if (errors) {
    return json({ errors, defaultValues }, { status: 400 });
  }

  // Handle magic link request
  if (data.intent === "request-magic-link") {
    const { email } = data;
    const turnstileToken = data["cf-turnstile-response"];

    if (!turnstileToken) {
      // In a real browser this should be set by the widget
      // For dev/test, we might skip strict checking if key is missing
      if (env?.TURNSTILE_SITE_KEY) {
         return json({ errors: { "cf-turnstile-response": "Security check required" }, defaultValues }, { status: 400 });
      }
    }

    if (turnstileToken) {
        // Verify Turnstile token
        const isTurnstileValid = await verifyTurnstile(turnstileToken, env);
        if (!isTurnstileValid) {
          return json({ errors: { "cf-turnstile-response": "Security check failed" }, defaultValues }, { status: 400 });
        }
    }

    // Send magic link
    const result = await sendMagicLink(email, env);

    if (!result.success) {
      return json({ 
        errors: { root: result.error || "Failed to send magic link" }, 
        defaultValues 
      }, { status: 500 });
    }

    return json({ 
      success: true, 
      message: "Check your email for a magic link to sign in." 
    });
  }

  return json({ error: "Invalid request" }, { status: 400 });
}

export default function AuthLogin() {
  const data = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const form = useRemixForm<LoginFormData>({
    mode: "onSubmit",
    resolver,
    defaultValues: {
      email: "",
      intent: "request-magic-link"
    }
  });

  const { register, formState: { errors } } = form;

  useEffect(() => {
    if (data?.success) {
        toast.success(data.message);
    }
    if (data?.errors?.root) {
        toast.error(String(data.errors.root));
    }
  }, [data]);

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

        <RemixFormProvider {...form}>
          <Form method="post" onSubmit={form.handleSubmit} className="mt-8 space-y-6">
            <input type="hidden" {...register("intent")} value="request-magic-link" />
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="mt-1"
                placeholder="you@example.com"
                disabled={isSubmitting}
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Cloudflare Turnstile */}
            {data?.turnstileSiteKey && (
                 <div className="min-h-[65px]">
                    <div 
                        className="cf-turnstile" 
                        data-sitekey={data?.turnstileSiteKey}
                        data-theme="light"
                        data-response-field-name="cf-turnstile-response"
                    />
                    {errors["cf-turnstile-response"] && (
                        <p className="mt-1 text-sm text-red-600">{errors["cf-turnstile-response"].message}</p>
                    )}
                 </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send Magic Link"}
            </Button>
          </Form>
        </RemixFormProvider>

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
