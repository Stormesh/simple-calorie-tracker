import {
  appendResponseHeader,
  defineEventHandler,
  getRequestHeader,
  setResponseHeader,
  setResponseStatus,
} from "h3";
import { parseAllowedOrigins, planCorsResponse } from "../utils/cors";

/**
 * Apply the CORS decision for the endpoints the native app calls. The branching
 * lives in `server/utils/cors.ts`; this only adapts it to h3.
 */
export default defineEventHandler((event) => {
  const decision = planCorsResponse({
    origin: getRequestHeader(event, "origin") ?? null,
    path: event.path.split("?")[0] ?? "",
    method: event.method,
    allowedOrigins: parseAllowedOrigins(useRuntimeConfig(event).corsOrigins),
  });

  if (!decision) return;

  for (const [name, value] of Object.entries(decision.headers)) {
    // Vary may already be set upstream, so append rather than clobber it.
    if (name === "Vary") appendResponseHeader(event, name, value);
    else setResponseHeader(event, name, value);
  }

  // Preflight: answer here, before the route handler can touch the rate limiter
  // or the database.
  if (decision.status !== null) {
    setResponseStatus(event, decision.status);
    return "";
  }
});
