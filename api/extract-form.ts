/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { resolveGeminiModel, GEMINI_MODEL } from "./_shared";

function sendJson(res: any, status: number, data: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");
  return res.status(status).json(data);
}

async function getBody(req: any) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  return await new Promise<any>((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: any) => (raw += chunk));
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function cleanImage(value: string, fallbackMime = "image/jpeg") {
  let data = String(value || "").trim();
  let mimeType = fallbackMime;
  const match = data.match(/^data:([^;]+);base64,(.+)$/s);
  if (match) {
    mimeType = match[1];
    data = match[2].trim();
  }
  return { data, mimeType };
}

function normalizeResult(raw: any) {
  const r = raw && typeof raw === "object" ? raw : {};
  return {
    productName: typeof r.productName === "string" ? r.productName : "",
    price: typeof r.price === "number" ? r.price : (r.price ? Number(r.price) || null : null),
    currency: typeof r.currency === "string" ? r.currency : "",
    manufactureDate: typeof r.manufactureDate === "string" ? r.manufactureDate : "",
    expiryDate: typeof r.expiryDate === "string" ? r.expiryDate : "",
    bestBeforeMonths: typeof r.bestBeforeMonths === "number" ? r.bestBeforeMonths : (r.bestBeforeMonths ? Number(r.bestBeforeMonths) || null : null),
    quantity: typeof r.quantity === "number" ? r.quantity : (Number(r.quantity) || 1),
    unit: typeof r.unit === "string" ? r.unit : "pcs",
    detectedLanguage: typeof r.detectedLanguage === "string" ? r.detectedLanguage : "",
    confidence: r.confidence && typeof r.confidence === "object" ? r.confidence : { overall: 0 },
    warnings: Array.isArray(r.warnings) ? r.warnings : [],
  };
}

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "POST") return sendJson(res, 405, { success: false, error: "POST required" });

  try {
    const body = await getBody(req);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return sendJson(res, 500, {
        success: false,
        code: "API_KEY_MISSING",
        error: "GEMINI_API_KEY is not configured in Vercel.",
      });
    }

    const rawImages: any[] = Array.isArray(body.images) ? body.images : (body.imageBase64 ? [body.imageBase64] : []);
    const images = rawImages.map((item) => {
      if (typeof item === "string") return cleanImage(item, body.mimeType || "image/jpeg");
      return cleanImage(item?.imageBase64 || item?.dataUrl || "", item?.mimeType || body.mimeType || "image/jpeg");
    }).filter((x) => x.data);

    if (!images.length) {
      return sendJson(res, 400, { success: false, code: "IMAGE_PROCESSING_FAILED", error: "No valid product image received." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a product package scanner. Analyze all supplied photos as the SAME product and return ONLY valid JSON. Extract only information actually visible on the package. Never invent missing values.

Fields:
productName: exact printed product name, original script/language.
price: numeric printed MRP/price, null if not visible.
currency: currency code such as NPR, INR, USD; only when supported by printed markings.
manufactureDate: MFD/MFG/DOM date exactly as printed.
expiryDate: EXP/EXD/use-by date exactly as printed. If only MFD + Best Before duration is visible, calculate expiry.
bestBeforeMonths: numeric duration in months when printed or reliably calculated.
quantity: package count, not weight. Single package = 1.
unit: package unit such as pcs, bottles, cans, packets, boxes, packs, bags, g, kg, mL, L.
detectedLanguage: primary label language.
confidence: object with field confidence values from 0 to 1 and overall.
warnings: array of short warnings for uncertain fields.

Date rules: distinguish manufacture date from expiry date. Do not swap them. Use the current date only to interpret ambiguous relative date text; do not invent a date. Preserve printed date format when possible.

Return exactly one JSON object with these keys: productName, price, currency, manufactureDate, expiryDate, bestBeforeMonths, quantity, unit, detectedLanguage, confidence, warnings.`;

    const parts: any[] = images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } }));
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: resolveGeminiModel(process.env.GEMINI_MODEL || GEMINI_MODEL),
      contents: [{ role: "user", parts }],
      config: { responseMimeType: "application/json", temperature: 0.1 },
    });

    if (!response?.text) {
      return sendJson(res, 502, { success: false, code: "GEMINI_EMPTY_RESPONSE", error: "Gemini returned no extraction result." });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(response.text);
    } catch {
      const cleaned = response.text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return sendJson(res, 200, {
      success: true,
      model: resolveGeminiModel(process.env.GEMINI_MODEL || GEMINI_MODEL),
      photosAnalyzedCount: images.length,
      data: normalizeResult(parsed),
    });
  } catch (err: any) {
    console.error("[extract-form] Vercel Gemini error:", err);
    return sendJson(res, 502, {
      success: false,
      code: err?.status === 429 ? "GEMINI_QUOTA_OR_RATE_LIMIT" : "GEMINI_REQUEST_FAILED",
      error: err?.message || "Gemini extraction failed on Vercel.",
    });
  }
}
