import { build } from "esbuild";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

await mkdir("release", { recursive: true });
const notices = (
  await Promise.all(
    [
      ["jsonc-parser 3.3.1", "node_modules/jsonc-parser/LICENSE.md"],
      ["zod 4.6.7", "node_modules/zod/LICENSE"],
      ["Svelte 5.57.3", "node_modules/svelte/LICENSE.md"],
      ["Press Start 2P (OFL-1.1)", "node_modules/@fontsource/press-start-2p/LICENSE"],
    ].map(async ([name, path]) => `${name}\n${await readFile(path ?? "", "utf8")}`),
  )
).join("\n\n");
await writeFile("dist/THIRD-PARTY-NOTICES.txt", notices);
await writeFile("release/THIRD-PARTY-NOTICES.txt", notices);
await copyFile("LICENSE", "release/LICENSE");
await copyFile("docs/assets.md", "release/ASSETS.md");

// Bundle the already-compiled Svelte app for direct file:// use, without an ESM fetch.
let html = await readFile("dist/index.html", "utf8");
const script = html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const stylesheet = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
if (!script?.[1] || !stylesheet?.[1]) throw new Error("Missing Vite script or stylesheet");
const result = await build({
  entryPoints: [join("dist", script[1])],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
});
const code = result.outputFiles[0]?.text;
if (!code) throw new Error("Missing offline bundle");
let css = await readFile(join("dist", stylesheet[1]), "utf8");
const fontUrls = [...css.matchAll(/url\(([^)]+\.(?:woff2?|ttf))\)/g)];
for (const match of fontUrls) {
  const path = match[1];
  if (!path) continue;
  const font = await readFile(join("dist/assets", basename(path)));
  const mime = path.endsWith("woff2") ? "font/woff2" : "font/woff";
  css = css.replaceAll(match[0], `url(data:${mime};base64,${font.toString("base64")})`);
}
const icon = `data:image/png;base64,${(await readFile("public/app-icon.png")).toString("base64")}`;
html = html
  .replace(script[0], "")
  .replace(
    "</body>",
    () =>
      `<script>${code.replaceAll("./app-icon.png", icon).replaceAll("</script", "<\\/script")}</script></body>`,
  )
  .replace(stylesheet[0], () => `<style>${css}</style>`)
  .replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, "")
  .replaceAll('href="./app-icon.png"', `href="${icon}"`);
await writeFile(
  "release/warhammer-save-patcher.html",
  html + `\n<!--\n${notices.replaceAll("--", "- -")}\n-->\n`,
);
await build({
  entryPoints: ["src/cli.ts"],
  bundle: true,
  outfile: "dist/patch-save.mjs",
  platform: "node",
  format: "esm",
  mainFields: ["module", "main"],
  target: "node26",
  banner: { js: `#!/usr/bin/env node\n/*\n${notices.replaceAll("*/", "* /")}\n*/` },
});
await copyFile("dist/patch-save.mjs", "release/patch-save.mjs");
console.log("Built website, standalone offline HTML, and bundled Node script.");
