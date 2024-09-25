import { ActorRuntime } from "@deco/actors";
import { Counter } from "./counter.ts";
const portEnv = Deno.env.get("PORT");
const port = portEnv ? +portEnv : 8000;

const rt = new ActorRuntime([Counter]);

Deno.serve({
  handler: (req) => {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/actors")) {
      return rt.fetch(req);
    }
    return new Response(null, { status: 200 });
  },
  port,
});
