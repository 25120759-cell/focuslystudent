import { createFileRoute } from "@tanstack/react-router";

// Bump this whenever you publish a new Chrome extension build.
export const EXTENSION_VERSION = "1.0.0";
export const EXTENSION_MIN_SUPPORTED = "1.0.0";
export const EXTENSION_DOWNLOAD_URL = "https://focuslystudent.lovable.app/focusly-extension.zip";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "public, max-age=300",
};

export const Route = createFileRoute("/api/public/extension-version")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () =>
        new Response(
          JSON.stringify({
            version: EXTENSION_VERSION,
            minSupported: EXTENSION_MIN_SUPPORTED,
            downloadUrl: EXTENSION_DOWNLOAD_URL,
            releasedAt: "2026-06-10",
            notes: "Initial public release.",
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...CORS } },
        ),
    },
  },
});
