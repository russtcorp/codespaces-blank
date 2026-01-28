import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, Form, useNavigation } from "@remix-run/react";
import { useState } from "react";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  
  // Fetch theme.css from R2
  const object = await env.ASSETS.get("theme.css");
  let css = "";
  
  if (object) {
    css = await object.text();
  } else {
    // Default template if missing
    css = `:root {
  --primary: #dc2626;
  --secondary: #f3f4f6;
  --radius: 0.5rem;
}

body {
  font-family: system-ui, sans-serif;
}`;
  }

  return json({ css });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const formData = await request.formData();
  const css = formData.get("css") as string;

  if (typeof css !== "string") {
    return json({ error: "Invalid CSS" }, { status: 400 });
  }

  // Save to R2
  await env.ASSETS.put("theme.css", css, {
    httpMetadata: { contentType: "text/css" },
  });

  return json({ success: true });
}

export default function AdminTemplate() {
  const { css } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";
  const [value, setValue] = useState(css);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Global Template Editor</h1>
        <p className="mt-2 text-gray-600">
          Edit the base CSS variables and styles applied to all tenant sites.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <Form method="post" className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              theme.css
            </label>
            <textarea
              name="css"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-96 w-full rounded-md border border-gray-300 bg-gray-50 p-4 font-mono text-sm focus:border-blue-500 focus:ring-blue-500"
              spellCheck={false}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Template"}
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
