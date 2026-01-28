import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import * as Form from '@radix-ui/react-form';
import { Input } from '~/components/Input'; 
import { INTENTS } from '@diner-saas/db/intents';

import { useActionData, Form, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { Logger } from "@diner-saas/logger";

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const env = (context as any).cloudflare?.env || (request as any).env;
  const ctx = (context as any).cloudflare?.ctx;
  const logger = new Logger(request, env, ctx);

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
    logger.error(error instanceof Error ? error : new Error(String(error)));
    return json({ error: String(error) }, { status: 500 });
  }
}

export default function AdminOnboarding() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  // ... state for workflowId

  return (
    <div className="space-y-8">
      <h1>Magic Start Onboarding</h1>

      {!workflowId && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <Form.Root method="post" className="space-y-6">
            <input type="hidden" name="intent" value={INTENTS.startWorkflow} />

            <Form.Field name="businessName">
              <div className="flex justify-between">
                <Form.Label asChild><label className="block text-sm font-medium text-gray-700">Business Name *</label></Form.Label>
                <Form.Message className="text-xs text-red-500" match="valueMissing">Required</Form.Message>
              </div>
              <Form.Control asChild><Input required placeholder="Joe's Diner" /></Form.Control>
            </Form.Field>
            
            <Form.Field name="address">
               <div className="flex justify-between">
                <Form.Label asChild><label className="block text-sm font-medium text-gray-700">Address *</label></Form.Label>
                <Form.Message className="text-xs text-red-500" match="valueMissing">Required</Form.Message>
              </div>
              <Form.Control asChild><Input required placeholder="123 Main St, City, State 12345" /></Form.Control>
            </Form.Field>

            <Form.Field name="websiteUrl">
              <div className="flex justify-between">
                <Form.Label asChild><label className="block text-sm font-medium text-gray-700">Website URL (optional)</label></Form.Label>
                <Form.Message className="text-xs text-red-500" match="typeMismatch">Please enter a valid URL</Form.Message>
              </div>
              <Form.Control asChild><Input type="url" placeholder="https://joesdiner.com" /></Form.Control>
            </Form.Field>
            
            {/* ... other form fields ... */}

            <Form.Submit asChild>
              <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white">
                {isSubmitting ? "Starting Workflow..." : "Start Magic Onboarding"}
              </button>
            </Form.Submit>
          </Form.Root>
        </div>
      )}

      {workflowId && (
        <div>{/* ... UI for displaying workflow status ... */}</div>
      )}
    </div>
  );
}