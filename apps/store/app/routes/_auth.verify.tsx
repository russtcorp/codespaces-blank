import { redirect, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { authenticator } from "~/services/auth.server";
import { commitSession, getSession } from "~/services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const email = url.searchParams.get("email");

  if (!token || !email) {
    return redirect("/auth/login?error=invalid-link");
  }

  // Create a new request with form data
  const formData = new FormData();
  formData.append("email", email);
  formData.append("token", token);

  const newRequest = new Request(request.url, {
    method: "POST",
    body: formData,
    headers: request.headers,
  });

  // Copy the env context
  (newRequest as any).env = (request as any).env;

  try {
    // Manually authenticate and get the user
    const user = await authenticator.authenticate("magic-link", newRequest);
    
    if (!user) {
      return redirect("/auth/login?error=invalid-link");
    }

    // Get or create session
    const session = await getSession(request.headers.get("Cookie"));
    session.set("user", user);

    // Commit session and redirect
    return redirect("/dashboard", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (error) {
    console.error("Magic link verification error:", error);
    return redirect("/auth/login?error=invalid-link");
  }
}

export default function AuthVerify() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Verifying your magic link...</h2>
        <p className="mt-2 text-gray-600">Please wait while we log you in.</p>
      </div>
    </div>
  );
}
