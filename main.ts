import { ActorRuntime } from "@deco/actors";
import { ExcalidrawCollab } from "./collab.ts";
const portEnv = Deno.env.get("PORT");
const port = portEnv ? +portEnv : 8000;

const rt = new ActorRuntime([ExcalidrawCollab]);

Deno.serve({
  handler: async (req) => {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      const response = new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400",
        },
      });
      return response;
    }

    if (url.pathname.startsWith("/actors")) {
      const response = await rt.fetch(req);
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Access-Control-Allow-Headers", "*");
      response.headers.set("Access-Control-Allow-Methods", "*");
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Max-Age", "86400");
      return response;
    }
    return new Response(null, { status: 200 });
  },
  port,
});
