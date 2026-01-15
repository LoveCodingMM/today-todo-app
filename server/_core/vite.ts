import { webcrypto } from "crypto";
import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(moduleDir, "../..");
const require = createRequire(import.meta.url);

function ensureWebCrypto() {
  const nodeCrypto = require("crypto") as typeof import("crypto") & {
    getRandomValues?: typeof webcrypto.getRandomValues;
    hash?: (algorithm: string, data: string, outputEncoding: "hex") => string;
  };

  if (typeof nodeCrypto.getRandomValues !== "function") {
    nodeCrypto.getRandomValues = webcrypto.getRandomValues.bind(webcrypto);
  }

  if (typeof nodeCrypto.hash !== "function") {
    nodeCrypto.hash = (algorithm, data, outputEncoding) =>
      nodeCrypto.createHash(algorithm).update(data).digest(outputEncoding);
  }

  if (!(globalThis as { crypto?: Crypto }).crypto) {
    (globalThis as { crypto?: Crypto }).crypto = webcrypto as Crypto;
  }
}

export async function setupVite(app: Express, server: Server) {
  ensureWebCrypto();
  const { createServer: createViteServer } = await import("vite");
  const viteConfigModule = await import("../../vite.config.ts");
  const viteConfig = viteConfigModule.default;

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(appRoot, "client", "index.html");

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(appRoot, "dist", "public")
      : path.resolve(moduleDir, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
