import { createFileRoute } from "@tanstack/react-router";
import { readStartupBanner } from "@/lib/banner.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Serves a startup's generated banner image from private storage. The image is abstract
// generated artwork with no private data, so this public route only ever returns image bytes.
export const Route = createFileRoute("/api/public/banner/$startupId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const id = params.startupId;
        if (!UUID.test(id)) return new Response("Not found", { status: 404 });
        const bytes = await readStartupBanner(id, new URL(request.url).searchParams.get("v"));
        if (!bytes) return new Response("Not found", { status: 404 });
        return new Response(bytes.buffer as ArrayBuffer, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
