/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import {
  handleExtractForm,
  handleOcr,
  handleScan,
  handleSuperviseBarcodePipeline,
  handleHealth,
  GEMINI_MODEL,
} from "./api/_shared";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware: allow JSON payload up to 25MB for base64 captured images
  app.use(express.json({ limit: "25mb" }));

  // API Routes (Mounted first)
  app.post("/api/extract-form", handleExtractForm);
  app.post("/api/ocr", handleOcr);
  app.post("/api/scan", handleScan);
  app.post("/api/supervise-barcode-pipeline", handleSuperviseBarcodePipeline);
  app.get("/api/health", handleHealth);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} with model ${GEMINI_MODEL}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
