import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "@remix-run/react";

startTransition(() => {
  hydrateRoot(document, <HydratedRouter />);
});
