import type { Manifest } from "./manifest.gen.ts";
import { proxy as proxy } from "@deco/deco/web";
export const invoke = proxy<Manifest>();
