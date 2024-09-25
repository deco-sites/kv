import { ActorRuntime } from "@deco/actors";
import { Counter } from "./counter.ts";
const portEnv = Deno.env.get("PORT");
const port = portEnv ? +portEnv : 8000;

const rt = new ActorRuntime([Counter]);

Deno.serve({ handler: rt.fetch.bind(rt), port });
