import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { RemixBrowser } from "@remix-run/react";

startTransition(() => {
  hydrateRoot(document, <RemixBrowser />);
});
