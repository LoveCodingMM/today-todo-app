import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";


const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(appRoot, "client", "src"),
      "@shared": path.resolve(appRoot, "shared"),
      "@assets": path.resolve(appRoot, "attached_assets"),
    },
  },
  envDir: appRoot,
  root: path.resolve(appRoot, "client"),
  publicDir: path.resolve(appRoot, "client", "public"),
  build: {
    outDir: path.resolve(appRoot, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
