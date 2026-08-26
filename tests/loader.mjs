/**
 * Node ESM resolve hook for running the unit tests under plain Node
 * (no bundler). Two gaps it closes:
 *
 * 1. `@/` path alias (tsconfig paths) → project root.
 * 2. Extensionless relative imports (the Next.js/bundler convention) →
 *    probe `.ts` / `.tsx` / `.js` / index files.
 *
 * Load with: `node --import ./tests/loader.mjs --test ...`
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = process.cwd();

const EXT_CANDIDATES = [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json"];
const INDEX_CANDIDATES = ["/index.ts", "/index.tsx", "/index.js"];

function tryFile(base) {
  for (const c of [base, ...EXT_CANDIDATES.map((e) => base + e), ...INDEX_CANDIDATES.map((i) => base + i)]) {
    if (existsSync(c)) return c;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  // @/ alias → project-relative path
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    const found = tryFile(path.join(ROOT, rel));
    if (found) return nextResolve(pathToFileURL(found).href, context);
    return nextResolve(pathToFileURL(path.join(ROOT, rel)).href, context);
  }

  // Extensionless relative / absolute path
  const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
  const isAbsolute = path.isAbsolute(specifier);
  if ((isRelative || isAbsolute) && !path.extname(specifier)) {
    const base = isRelative
      ? path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
      : specifier;
    const found = tryFile(base);
    if (found) return nextResolve(pathToFileURL(found).href, context);
  }

  return nextResolve(specifier, context);
}
