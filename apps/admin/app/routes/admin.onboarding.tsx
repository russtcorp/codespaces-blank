import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { useActionData, Form, useNavigation } from "@remix-run/react";
import { useState } from "react";

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const env = (context as any).cloudflare?.env || (request as any).env;

  try {
    switch (intent) {
      case "start-workflow": {
        const businessName = formData.get("businessName") as string;
        const address = formData.get("address") as string;
        const websiteUrl = formData.get("websiteUrl") as string;
        const customDomain = formData.get("customDomain") as string;
        const scrapeGoogle = formData.get("scrapeGoogle") === "on";
        const scrapeWayback = formData.get("scrapeWayback") === "on";
        const scrapeInstagram = formData.get("scrapeInstagram") === "on";

        if (!businessName || !address) {
          return json({ error: "Business name and address are required" }, { status: 400 });
        }

        // Trigger the Cloudflare Workflow via internal service binding
        const workflowResponse = await env.WORKFLOWS_SERVICE.fetch("https://workflows.internal/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessName,
            address,
            websiteUrl: websiteUrl || undefined,
            scrapeGoogle,
            scrapeWayback,
            scrapeInstagram,
            customDomain: customDomain || undefined,
          }),
        });

        const workflowResult: any = await workflowResponse.json();

        if (!workflowResponse.ok) {
          return json({ error: workflowResult.error || "Workflow failed" }, { status: 500 });
        }

        return json({
          success: true,
          workflow_id: workflowResult.workflow_id,
          step: "started",
        });
      }

      case "check-status": {
        const workflowId = formData.get("workflow_id") as string;

        if (!workflowId) {
          return json({ error: "workflow_id is required" }, { status: 400 });
        }

        // Check workflow status
        const statusResponse = await env.WORKFLOWS_SERVICE.fetch(`https://workflows.internal/status/${workflowId}`);
        const statusResult: any = await statusResponse.json();

        if (!statusResponse.ok) {
          return json({ error: "Workflow not found" }, { status: 404 });
        }

        return json({
          success: true,
          status: statusResult.status,
          output: statusResult.output,
          step: "complete",
        });
      }

      case "approve": {
        const previewId = formData.get("preview_id") as string;
        if (!previewId) {
          return json({ error: "preview_id is required" }, { status: 400 });
        }
        const approveResponse = await env.WORKFLOWS_SERVICE.fetch(`https://workflows.internal/approve/${previewId}`, { method: "POST" });
        const approveResult: any = await approveResponse.json();
        if (!approveResponse.ok) {
          return json({ error: approveResult.error || "Approve failed" }, { status: 500 });
        }
        return json({ success: true, approved: true, result: approveResult.result, step: "approved" });
      }

      default:
        return json({ error: "Invalid intent" }, { status: 400 });
    }
  } catch (error) {
    console.error("Onboarding action error:", error);
    return json({ error: String(error) }, { status: 500 });
  }
}

export default function AdminOnboarding() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [workflowId, setWorkflowId] = useState<string | null>(null);

  // Update workflow ID from action data
  if (actionData && "workflow_id" in actionData && actionData.workflow_id && !workflowId) {
    setWorkflowId(actionData.workflow_id);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Magic Start Onboarding</h1>
        <p className="mt-2 text-gray-600">
          Automatically create a new diner website by scraping existing data.
        </p>
      </div>

      {!workflowId && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <Form method="post" className="space-y-6">
            <input type="hidden" name="intent" value="start-workflow" />

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Business Name *
              </label>
              <input
                name="businessName"
                required
                placeholder="Joe's Diner"
                className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Address *
              </label>
              <input
                name="address"
                required
                placeholder="123 Main St, City, State 12345"
                className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Website URL (optional)
              </label>
              <input
                name="websiteUrl"
                type="url"
                placeholder="https://joesdiner.com"
                className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Custom Domain (optional)
              </label>
              <input
                name="customDomain"
                type="text"
                placeholder="joesdiner.com"
                className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Data Sources
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="scrapeGoogle"
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Google Maps (Reviews & Details)
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="scrapeWayback"
                    defaultChecked
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Wayback Machine (if website unavailable)
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="scrapeInstagram"
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Instagram (Photos)
                  </span>
                </label>
              </div>
            </div>

            {actionData && "error" in actionData && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{actionData.error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {isSubmitting ? "Starting Workflow..." : "Start Magic Onboarding"}
            </button>
          </Form>
        </div>
      )}

      {workflowId && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-center">
            <div className="mb-4 text-4xl">⚙️</div>
            <h2 className="mb-2 text-xl font-semibold">Workflow In Progress</h2>
            <p className="mb-4 text-gray-600">Workflow ID: {workflowId}</p>

            <Form method="post">
              <input type="hidden" name="intent" value="check-status" />
              <input type="hidden" name="workflow_id" value={workflowId} />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                Check Status
              </button>
            </Form>

            {actionData && "output" in actionData && (
              <div className="mt-6 text-left space-y-4">
                <h3 className="mb-2 font-semibold">Workflow Result</h3>

                {actionData.output?.preview && (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-gray-700">Source Site Screenshot</h4>
                      {actionData.output.preview.screenshot ? (
                        <img
                          src={`data:image/png;base64,${actionData.output.preview.screenshot}`}
                          alt="Source screenshot"
                          className="w-full rounded border"
                        />
                      ) : (
                        <p className="text-sm text-gray-500">No screenshot available.</p>
                      )}
                    </div>
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-gray-700">Parsed Menu Items ({actionData.output.preview.items?.length || 0})</h4>
                      <div className="rounded border bg-gray-50 p-3 max-h-96 overflow-auto text-xs">
                        <ul className="list-disc pl-5 space-y-1">
                          {(actionData.output.preview.items || []).slice(0, 50).map((it: any, idx: number) => (
                            <li key={idx}><strong>{it.name}</strong>{it.price ? ` - $${Number(it.price).toFixed(2)}` : ""} <span className="text-gray-500">[{it.category || "Menu"}]</span></li>
                          ))}
                        </ul>
                        {(actionData.output.preview.items || []).length > 50 && (
                          <div className="mt-2 text-gray-500">…and more</div>
                        )}
                      </div>
                      <Form method="post" className="mt-4">
                        <input type="hidden" name="intent" value="approve" />
                        <input type="hidden" name="preview_id" value={actionData.output.preview.id} />
                        <button type="submit" className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
                          Approve & Provision
                        </button>
                      </Form>
                    </div>
                  </div>
                )}

                <details className="rounded border bg-gray-50 p-4">
                  <summary className="cursor-pointer text-sm font-medium">Raw Output</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs">{JSON.stringify(actionData.output, null, 2)}</pre>
                </details>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
