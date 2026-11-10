import { defineConfig } from "vite-plus";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  base: "./",
  plugins: [
    svelte(),
    {
      name: "development-csp",
      apply: "serve",
      transformIndexHtml(html, context) {
        // Only the development server needs the HMR WebSocket. Production stays offline.
        return context.server
          ? html.replace("connect-src 'none'", "connect-src 'self' ws: wss:")
          : html;
      },
    },
  ],
  server: { allowedHosts: ["warhammer-save.localhost"], port: Number(process.env["PORT"] ?? 5173) },
  preview: {
    allowedHosts: ["warhammer-save.localhost"],
    port: Number(process.env["PORT"] ?? 4173),
  },
  build: { cssCodeSplit: false, assetsInlineLimit: 0 },
  test: { include: ["test/**/*.test.ts"] },
  lint: { ignorePatterns: ["dist/**", "node_modules/**", "src/**/*.svelte"] },
  fmt: {
    ignorePatterns: [
      "dist/**",
      "node_modules/**",
      "src/**/*.svelte",
      "pnpm-lock.yaml",
      ".impeccable/review/**",
    ],
  },
});
