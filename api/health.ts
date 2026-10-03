/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  const model = (process.env.GEMINI_MODEL || "gemini-3.8-flash").trim();
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY);

  const payload = {
    status: "ok",
    service: "scanme-ai-backend",
    model,
    hasApiKey,
    timestamp: new Date().toISOString(),
  };

  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(200).json(payload);
  }
  res.statusCode = 200;
  res.end(JSON.stringify(payload));
}
