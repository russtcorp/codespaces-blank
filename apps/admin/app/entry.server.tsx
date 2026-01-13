import { isbot } from "isbot";
import { type LoaderFunctionArgs } from "@remix-run/cloudflare";

export async function loader({ request }: LoaderFunctionArgs) {
  if (isbot(request.headers.get("user-agent"))) {
    throw new Response("Please don't crawl us", { status: 403 });
  }

  return new Response("OK");
}
