/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { mapProductDateLabels } from "../serverDateMappingEngine";

dotenv.config();

/**
 * ============================================================================
 * CENTRALIZED MODEL CONFIGURATION & SANITIZATION
 * ============================================================================
 */
export function resolveGeminiModel(candidate?: string): string {
  const DEFAULT_MODEL = "gemini-flash-latest";
  if (!candidate || typeof candidate !== "string") {
    return DEFAULT_MODEL;
  }
  let clean = candidate.trim();
  if (clean.startsWith("models/")) {
    clean = clean.replace(/^models\//, "");
  }
  // Ignore deprecated models
  if (/^gemini-(1\.5|2\.0|2\.5)/i.test(clean)) {
    return DEFAULT_MODEL;
  }
  // Validate model format: starts with gemini- and uses only valid model chars
  if (/^gemini-[a-z0-9\.\-]+$/i.test(clean)) {
    return clean;
  }
  return DEFAULT_MODEL;
}

export const GEMINI_MODEL = resolveGeminiModel(process.env.GEMINI_MODEL);

export const VALID_VISION_MODELS = [
  "gemini-flash-latest",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
];

export function getModelCandidateList(overrideModel?: string): string[] {
  const primary = resolveGeminiModel(overrideModel || GEMINI_MODEL);
  return [primary, ...VALID_VISION_MODELS].filter(
    (m, i, arr) => m && arr.indexOf(m) === i && !/^gemini-(1\.5|2\.0|2\.5)/i.test(m)
  );
}

/**
 * Extracts structured status and error message from Google GenAI ApiError
 */
export function parseApiErrorMessage(err: unknown): { status?: number; message: string } {
  const error = err as { status?: number; message?: string };
  let status = error?.status;
  const rawMsg = error?.message || "";
  try {
    const jsonStart = rawMsg.indexOf("{");
    if (jsonStart !== -1) {
      const parsed = JSON.parse(rawMsg.slice(jsonStart));
      if (parsed?.error) {
        if (!status && parsed.error.code) status = parsed.error.code;
        return {
          status,
          message: parsed.error.message ? parsed.error.message.trim() : rawMsg,
        };
      }
    }
  } catch {
    // Fall back to rawMsg
  }
  return { status, message: rawMsg };
}

/**
 * Invokes an async function with exponential backoff on transient errors (429 / 503)
 */
export async function callGeminiWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  let delay = 1500;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const { status, message } = parseApiErrorMessage(err);
      const isTransient =
        status === 429 ||
        status === 503 ||
        /\b(rate[\s\-_]limit|quota|resource_exhausted|unavailable|high demand)\b/i.test(message);

      if (isTransient && attempt < maxRetries) {
        console.warn(
          `[Gemini API] Transient error (status: ${status}, attempt ${attempt + 1}/${maxRetries}): ${message}. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
  throw new Error("Maximum retry attempts exceeded.");
}

/**
 * Helper to safely get the Gemini Client using server-side GEMINI_API_KEY
 */
export function getAiClient(overrideKey?: string) {
  const key = overrideKey || process.env.GEMINI_API_KEY;
  if (!key) {
    const err = new Error(
      "GEMINI_API_KEY environment variable is not configured. Please add it to your environment or Settings panel."
    );
    (err as unknown as { code: string }).code = "API_KEY_MISSING";
    throw err;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

/**
 * Safe HTTP JSON Response Sender compatible with Express & Vercel serverless
 */
export function sendJson(res: any, statusCode: number, data: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

/**
 * Safe Request Body Parser for Express / Node / Vercel
 */
export async function getParsedBody(req: any): Promise<any> {
  if (req.body) {
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch {
        return req.body;
      }
    }
    return req.body;
  }

  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk: any) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

/**
 * GET / POST /api/health
 */
export async function handleHealth(req: any, res: any) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }
  return sendJson(res, 200, {
    status: "ok",
    model: GEMINI_MODEL,
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
}

/**
 * POST /api/product-lookup
 * Barcode API has been removed. Returns not found.
 */
export async function handleProductLookup(req: any, res: any) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }
  return sendJson(res, 200, {
    success: true,
    found: false,
    source: "none",
    product: null,
  });
}

/**
 * POST /api/ocr
 */
export async function handleOcr(req: any, res: any) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }
  try {
    const body = await getParsedBody(req);
    const { imageBase64, mimeType = "image/jpeg" } = body;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return sendJson(res, 400, {
        success: false,
        error: "imageBase64 is required.",
      });
    }

    let cleanBase64 = imageBase64.trim();
    let detectedMime = mimeType;
    const match = cleanBase64.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
    if (match) {
      detectedMime = match[1];
      cleanBase64 = match[2].trim();
    }

    let ai;
    try {
      ai = getAiClient();
    } catch {
      ai = null;
    }

    if (ai) {
      try {
        const prompt = `Extract all visible printed text and label metadata from this product image.
Identify: Product name, Brand, MFD/Manufacturing Date, EXP/Expiry Date, Best Before, Batch Number, MRP/Price, Net Weight, Quantity.
Return strict JSON:
{
  "rawText": "full raw text extracted",
  "lines": ["line 1", "line 2"],
  "productName": "...",
  "brand": "...",
  "manufactureDate": "...",
  "expiryDate": "...",
  "bestBefore": "...",
  "batchNumber": "...",
  "mrp": "...",
  "netWeight": "...",
  "quantity": "...",
  "confidence": 90
}`;

        const candidates = getModelCandidateList();
        let geminiRes: any = null;
        for (const candidate of candidates) {
          try {
            geminiRes = await callGeminiWithBackoff(async () => {
              return await ai.models.generateContent({
                model: candidate,
                contents: [
                  {
                    role: "user",
                    parts: [
                      { text: prompt },
                      {
                        inlineData: {
                          mimeType: detectedMime,
                          data: cleanBase64,
                        },
                      },
                    ],
                  },
                ],
                config: {
                  responseMimeType: "application/json",
                  temperature: 0.1,
                },
              });
            }, 1);
            if (geminiRes?.text) break;
          } catch (modelErr) {
            console.warn(`[Server OCR] Candidate '${candidate}' failed. Trying next candidate...`);
          }
        }

        if (geminiRes?.text) {
          const parsed = JSON.parse(geminiRes.text);
          return sendJson(res, 200, {
            success: true,
            source: "gemini_ocr",
            data: {
              rawText: parsed.rawText || "",
              lines: parsed.lines || (parsed.rawText ? parsed.rawText.split("\n") : []),
              mapping: {
                product_name: parsed.productName || "",
                brand: parsed.brand || "",
                manufacture_date: parsed.manufactureDate || "",
                manufacture_date_precision: "day",
                expiry_date: parsed.expiryDate || "",
                expiry_date_precision: "day",
                best_before: parsed.bestBefore || "",
                best_before_months: null,
                batch_number: parsed.batchNumber || "",
                mrp: parsed.mrp || "",
                net_weight: parsed.netWeight || "",
                quantity: parsed.quantity || "1",
                confidence: {
                  productName: parsed.productName ? 0.9 : 0,
                  brand: parsed.brand ? 0.85 : 0,
                  manufactureDate: parsed.manufactureDate ? 0.95 : 0,
                  expiryDate: parsed.expiryDate ? 0.95 : 0,
                  batchNumber: parsed.batchNumber ? 0.9 : 0,
                  mrp: parsed.mrp ? 0.92 : 0,
                  netWeight: parsed.netWeight ? 0.88 : 0,
                  overall: parsed.confidence ? parsed.confidence / 100 : 0.88,
                },
                rawMatches: {},
                warnings: [],
              },
              confidence: parsed.confidence || 88,
            },
          });
        }
      } catch (visionErr) {
        console.warn("[Server OCR] Vision OCR failed:", visionErr);
      }
    }

    return sendJson(res, 200, {
      success: true,
      source: "fallback",
      data: {
        rawText: "",
        lines: [],
        mapping: null,
        confidence: 0,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return sendJson(res, 500, {
      success: false,
      error: error.message || "Failed to process OCR.",
    });
  }
}

/**
 * POST /api/scan
 */
export async function handleScan(req: any, res: any) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }
  try {
    const body = await getParsedBody(req);
    const { imageBase64, barcode: inputBarcode, barcodeFormat = "EAN-13" } = body;

    const barcode = inputBarcode ? inputBarcode.replace(/[\s\-_]/g, "").trim() : "";

    // No external barcode API lookup
    const lookupPromise = Promise.resolve(null);

    const ocrPromise = (async () => {
      if (!imageBase64) return null;
      try {
        let clean = imageBase64.trim();
        let mime = "image/jpeg";
        const match = clean.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
        if (match) {
          mime = match[1];
          clean = match[2].trim();
        }

        const ai = getAiClient();
        const prompt = `Extract all printed label fields: Product Name, Brand, MFD, EXP, Best Before, Batch Number, MRP (price), Net Weight, Quantity. Return JSON.`;
        const candidates = getModelCandidateList();
        let gemRes: any = null;
        for (const candidate of candidates) {
          try {
            gemRes = await callGeminiWithBackoff(async () => {
              return await ai.models.generateContent({
                model: candidate,
                contents: [
                  {
                    role: "user",
                    parts: [
                      { text: prompt },
                      { inlineData: { mimeType: mime, data: clean } },
                    ],
                  },
                ],
                config: {
                  responseMimeType: "application/json",
                  temperature: 0.1,
                },
              });
            }, 1);
            if (gemRes?.text) break;
          } catch (modelErr) {
            console.warn(`[Scan Pipeline] Candidate '${candidate}' failed. Trying next candidate...`);
          }
        }
        if (gemRes?.text) {
          return JSON.parse(gemRes.text);
        }
      } catch (e) {
        console.warn(`[Scan Pipeline] OCR error:`, e);
      }
      return null;
    })();

    const [dbProduct, ocrData] = await Promise.all([lookupPromise, ocrPromise]);

    const productName = dbProduct?.product_name || ocrData?.productName || "Unknown Product";
    const brand = dbProduct?.brand || ocrData?.brand || "";
    const category = dbProduct?.category || "General Merchandise";
    const manufactureDate = ocrData?.manufactureDate || "";
    const expiryDate = ocrData?.expiryDate || "";
    const bestBefore = ocrData?.bestBefore || "";
    const batchNumber = ocrData?.batchNumber || "";
    const mrp = ocrData?.mrp || dbProduct?.mrp || "";
    const netWeight = ocrData?.netWeight || dbProduct?.package_size || "";
    const quantity = ocrData?.quantity || "1";

    const normalizedResult = {
      barcode: barcode || ocrData?.barcode || "",
      barcodeFormat,
      productName,
      brand,
      category,
      manufactureDate,
      expiryDate,
      bestBefore,
      batchNumber,
      mrp,
      netWeight,
      quantity,
      rawOcrText: ocrData?.rawText || "",
      confidence: {
        barcode: barcode ? 100 : 0,
        productName: dbProduct ? 95 : 75,
        brand: dbProduct ? 95 : 70,
        mrp: mrp ? 90 : 50,
        manufactureDate: manufactureDate ? 90 : 0,
        expiryDate: expiryDate ? 90 : 0,
        overall: 90,
      },
    };

    return sendJson(res, 200, {
      success: true,
      data: normalizedResult,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return sendJson(res, 500, {
      success: false,
      error: error.message || "Failed to process scan.",
    });
  }
}

/**
 * POST /api/extract-form
 */
export async function handleExtractForm(req: any, res: any) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }
  try {
    const body = await getParsedBody(req);
    const {
      imageBase64,
      images,
      mimeType = "image/jpeg",
      apiKey,
      localOcrCues,
    } = body;

    const inputImages: Array<{ imageBase64: string; mimeType?: string }> = [];
    if (Array.isArray(images) && images.length > 0) {
      for (const item of images) {
        if (typeof item === "string") {
          inputImages.push({ imageBase64: item });
        } else if (item && typeof item.imageBase64 === "string") {
          inputImages.push({ imageBase64: item.imageBase64, mimeType: item.mimeType });
        } else if (item && typeof item.dataUrl === "string") {
          inputImages.push({ imageBase64: item.dataUrl, mimeType: item.mimeType });
        }
      }
    } else if (imageBase64 && typeof imageBase64 === "string") {
      inputImages.push({ imageBase64, mimeType });
    }

    if (inputImages.length === 0) {
      return sendJson(res, 400, {
        success: false,
        code: "IMAGE_PROCESSING_FAILED",
        error: "Missing or invalid image data in request body. Provide imageBase64 or images array.",
      });
    }

    const cleanImages: Array<{ data: string; mimeType: string }> = [];
    for (const img of inputImages) {
      let clean = img.imageBase64.trim();
      let detectedMime = img.mimeType || "image/jpeg";
      const match = clean.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
      if (match) {
        detectedMime = match[1];
        clean = match[2].trim();
      } else {
        clean = clean.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, "").trim();
      }
      if (clean.length > 0) {
        cleanImages.push({
          data: clean,
          mimeType: detectedMime,
        });
      }
    }

    if (cleanImages.length === 0) {
      return sendJson(res, 400, {
        success: false,
        code: "IMAGE_PROCESSING_FAILED",
        error: "All provided image payloads were empty after Base64 decoding.",
      });
    }

    let ai;
    try {
      ai = getAiClient(apiKey);
    } catch (clientErr: unknown) {
      const err = clientErr as Error & { code?: string };
      return sendJson(res, 401, {
        success: false,
        code: err.code || "API_KEY_INVALID",
        error: err.message,
      });
    }

    const isMultiPhoto = cleanImages.length > 1;
    const localCuesContext = localOcrCues
      ? `\n\n--- LOCAL OCR / OPENCV FIRST-LAYER PRE-EXTRACTION CUES ---
Potential Barcodes: ${(localOcrCues.possibleBarcodes || []).join(", ") || "None"}
Potential Batch/Lot: ${(localOcrCues.possibleBatchNumbers || []).join(", ") || "None"}
Potential Dates: ${(localOcrCues.possibleDates || []).join(", ") || "None"}
Potential Prices: ${(localOcrCues.possiblePrices || []).join(", ") || "None"}
Potential Quantities: ${(localOcrCues.possibleQuantities || []).join(", ") || "None"}
Keywords: ${(localOcrCues.extractedKeywords || []).join(", ") || "None"}
Raw Text Lines: ${(localOcrCues.rawTextLines || []).slice(0, 10).join(" | ") || "None"}
`
      : "";

    const prompt = `You are an expert PRODUCT SCANNER & PACKAGING VISION SUPERVISOR with automatic Language, Currency, and Unit recognition.
Analyze the provided ${
      isMultiPhoto
        ? `${cleanImages.length} synchronized images of the SAME product (e.g., front face, manufacture/expiry panel, price tag, back/side label)`
        : "product image"
    } to automatically detect and extract ONLY the required product fields.

CRITICAL EXTRACTION DIRECTIVES (STRICT ZERO-HALLUCINATION):
1. AUTOMATIC LANGUAGE DETECTION:
   - Detect the language used on the product label (e.g. "Nepali", "Hindi", "English", "Spanish", "French", "German", "Chinese", "Japanese", etc.).
   - Support English, Nepali (नेपाली), Hindi (हिन्दी), and other commonly detected languages.
   - DO NOT TRANSLATE the original product name. Preserve the product name EXACTLY as printed in its original script and language (e.g., Devanagari script for Nepali/Hindi, or Latin script).
   - If multiple languages appear on the label, detect the language containing the primary product information.

2. AUTOMATIC CURRENCY DETECTION:
   - Detect currency strictly from the printed price/MRP label markings:
     * "Rs", "रू", "NPR", "NRs" -> "NPR"
     * "₹", "INR", "Rs." (with Indian manufacturing/FSSAI/address context) -> "INR"
     * "$", "USD", "US$" -> "USD"
     * "€", "EUR" -> "EUR"
     * "£", "GBP" -> "GBP"
     * "A$", "AUD" -> "AUD"
     * "C$", "CAD" -> "CAD"
     * "¥", "JPY", "CNY" -> "JPY" or "CNY"
   - DO NOT guess currency solely from the product name.
   - If multiple currencies appear on the label, use the currency associated with the primary/local retail price and add a confirmation note in warnings.
   - If no currency can be reliably detected, return "" (empty string) with low confidence score (< 0.5) so the system falls back to the user's default.

3. AUTOMATIC UNIT & QUANTITY DETECTION (DO NOT CONFUSE PACKAGE SIZE WITH INVENTORY QUANTITY):
   - Read package/quantity information (e.g., 500 g, 1 kg, 250 ml, 1 L, 12 pcs, 24 bottles, 6 packets, 10 boxes, 12 × 500 mL).
   - Map to standard unit:
     * Weight: "mg", "g", "kg", "tonne"
     * Volume: "mL", "L"
     * Count: "pcs", "bottles", "cans", "packets", "boxes", "cartons", "packs", "bags", "pieces"
   - CRITICAL QUANTITY RULE:
     * Single package item (e.g., Net Weight 500 g or 1 L Milk) -> quantity: 1, unit: "g" or "L". Inventory quantity is 1!
     * Multi-pack item (e.g., "12 × 500 mL" or "Pack of 24 Cans") -> quantity: 12, unit: "bottles" or "cans".

4. DATE RECOGNITION & CALCULATION:
   - "manufactureDate": Date of Manufacture (MFD, MFG, DOM). Format as printed (e.g. DD/MM/YYYY or MM/YYYY).
   - "expiryDate": Date of Expiry (EXP, EXD, Expiry, Use By). Format as printed or calculated.
   - "bestBeforeMonths": Duration in months (e.g., 12 for "Best before 12 months").
   - If MFD + Best Before months exists and EXP is missing, compute EXP = MFD + Best Before Months.
   - NEVER confuse MFD with EXP or EXP with Best Before.

5. CONFIDENCE & WARNINGS:
   - Assign realistic confidence scores (0.0 to 1.0) for every field.
   - If confidence is low (< 0.7) for currency, unit, or language, add an explicit warning like "Please confirm unit", "Please confirm currency", or "Please confirm language".
${localCuesContext}`;

    const imageParts = cleanImages.map((img) => ({
      inlineData: {
        mimeType: img.mimeType || "image/jpeg",
        data: img.data,
      },
    }));

    const requestPayload = {
      contents: {
        parts: [
          ...imageParts,
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productName: {
              type: Type.STRING,
              description: "Complete product name in original printed language without translation. Empty string if not found.",
            },
            price: {
              type: Type.NUMBER,
              description: "Numeric MRP or selling price value (e.g. 80, 19.99 or 250). Null if not found.",
            },
            currency: {
              type: Type.STRING,
              description: "Recognized currency code (e.g. 'NPR', 'INR', 'USD', 'EUR', 'GBP'). Empty string if not found.",
            },
            manufactureDate: {
              type: Type.STRING,
              description: "Manufacture date (MFD/MFG/DOM) as printed (e.g. 10/05/2026 or 05/2026). Empty string if not found.",
            },
            expiryDate: {
              type: Type.STRING,
              description: "Expiry date (EXP/EXD) as printed or calculated. Empty string if not found.",
            },
            bestBeforeMonths: {
              type: Type.NUMBER,
              description: "Best before duration in months (e.g. 12 or 24). Null if not found.",
            },
            quantity: {
              type: Type.NUMBER,
              description: "Inventory quantity (e.g. 1 for single item, 12 for 12x500ml pack). Default 1.",
            },
            unit: {
              type: Type.STRING,
              description: "Detected standard unit: 'g', 'kg', 'mg', 'tonne', 'mL', 'L', 'pcs', 'bottles', 'cans', 'packets', 'boxes', 'cartons', 'packs', 'bags', 'pieces'.",
            },
            detectedLanguage: {
              type: Type.STRING,
              description: "Detected label language (e.g. 'English', 'Nepali', 'Hindi', 'Spanish', etc.).",
            },
            confidence: {
              type: Type.OBJECT,
              description: "Field-by-field confidence scores between 0.0 and 1.0",
              properties: {
                productName: { type: Type.NUMBER },
                price: { type: Type.NUMBER },
                currency: { type: Type.NUMBER },
                manufactureDate: { type: Type.NUMBER },
                expiryDate: { type: Type.NUMBER },
                bestBeforeMonths: { type: Type.NUMBER },
                quantity: { type: Type.NUMBER },
                unit: { type: Type.NUMBER },
                detectedLanguage: { type: Type.NUMBER },
                overall: { type: Type.NUMBER },
              },
            },
            warnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Specific notices regarding uncertain fields, currency verification, or date calculations",
            },
          },
          required: [
            "productName",
            "currency",
            "manufactureDate",
            "expiryDate",
            "quantity",
            "unit",
            "detectedLanguage",
            "confidence",
          ],
        },
      },
    };

    let response;
    let usedModel = GEMINI_MODEL;
    const modelCandidates = getModelCandidateList();

    for (const candidate of modelCandidates) {
      try {
        usedModel = candidate;
        response = await callGeminiWithBackoff(async () => {
          return await ai.models.generateContent({
            model: candidate,
            ...requestPayload,
          });
        }, 1);
        if (response?.text) {
          break;
        }
      } catch (candidateErr: unknown) {
        const { status, message } = parseApiErrorMessage(candidateErr);
        console.warn(
          `[Gemini API] Candidate '${candidate}' failed (${status}: ${message}). Trying next candidate in cascade...`
        );
      }
    }

    // Helper functions for date calculation & anti-confusion
    function parseDateParts(dateStr: string) {
      if (!dateStr || typeof dateStr !== "string") return null;
      const raw = dateStr.trim();
      if (!raw) return null;
      const dmy = raw.match(/^(\d{1,2})([\/\-\.])(\d{1,2})\2(\d{2,4})$/);
      if (dmy) {
        const d = parseInt(dmy[1], 10);
        const m = parseInt(dmy[3], 10);
        let y = dmy[4];
        if (y.length === 2) y = `20${y}`;
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
          return { day: d, month: m, year: parseInt(y, 10), sep: dmy[2], format: "DMY" };
        }
      }
      const my = raw.match(/^(\d{1,2})([\/\-\.])(\d{2,4})$/);
      if (my) {
        const m = parseInt(my[1], 10);
        let y = my[3];
        if (y.length === 2) y = `20${y}`;
        if (m >= 1 && m <= 12) {
          return { month: m, year: parseInt(y, 10), sep: my[2], format: "MY" };
        }
      }
      const ymd = raw.match(/^(\d{4})([\/\-\.])(\d{1,2})\2(\d{1,2})$/);
      if (ymd) {
        const y = parseInt(ymd[1], 10);
        const m = parseInt(ymd[3], 10);
        const d = parseInt(ymd[4], 10);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
          return { day: d, month: m, year: y, sep: ymd[2], format: "YMD" };
        }
      }
      const ym = raw.match(/^(\d{4})([\/\-\.])(\d{1,2})$/);
      if (ym) {
        const y = parseInt(ym[1], 10);
        const m = parseInt(ym[3], 10);
        if (m >= 1 && m <= 12) {
          return { month: m, year: y, sep: ym[2], format: "YM" };
        }
      }
      return null;
    }

    function addMonths(dateStr: string, monthsToAdd: number): string {
      const p = parseDateParts(dateStr);
      if (!p || !monthsToAdd || monthsToAdd <= 0) return "";
      const totalMonths = p.month - 1 + monthsToAdd;
      const newYear = p.year + Math.floor(totalMonths / 12);
      const newMonth = (totalMonths % 12) + 1;
      const pad = (n: number) => String(n).padStart(2, "0");
      const sep = p.sep || "/";

      if (p.format === "DMY" && p.day !== undefined) {
        const maxD = new Date(newYear, newMonth, 0).getDate();
        return `${pad(Math.min(p.day, maxD))}${sep}${pad(newMonth)}${sep}${newYear}`;
      }
      if (p.format === "YMD" && p.day !== undefined) {
        const maxD = new Date(newYear, newMonth, 0).getDate();
        return `${newYear}${sep}${pad(newMonth)}${sep}${pad(Math.min(p.day, maxD))}`;
      }
      if (p.format === "YM") {
        return `${newYear}${sep}${pad(newMonth)}`;
      }
      return `${pad(newMonth)}${sep}${newYear}`;
    }

    function diffMonths(mfdStr: string, expStr: string): number | null {
      const m = parseDateParts(mfdStr);
      const e = parseDateParts(expStr);
      if (!m || !e) return null;
      const d = (e.year - m.year) * 12 + (e.month - m.month);
      return d > 0 && d <= 120 ? d : null;
    }

    if (!response?.text) {
      console.warn("[Gemini API] All remote models exhausted. Synthesizing 5 fields from local OCR cues...");
      const cues = localOcrCues || {
        possibleBarcodes: [],
        possibleBatchNumbers: [],
        possibleDates: [],
        possiblePrices: [],
        possibleQuantities: [],
        extractedKeywords: [],
        rawTextLines: [],
      };

      const dateMapping = mapProductDateLabels([
        ...(cues.rawTextLines || []),
        ...(cues.extractedKeywords || []),
        ...(cues.possibleDates || []),
      ]);

      const detectedMfg = dateMapping.manufacture_date || cues.possibleDates?.[0] || "";
      let detectedExp = dateMapping.expiry_date || cues.possibleDates?.[1] || "";
      let detectedBbMonths: number | null = dateMapping.best_before_months || null;
      let isCalculatedExpiry = false;

      if (detectedMfg && detectedBbMonths && !detectedExp) {
        const calcExp = addMonths(detectedMfg, detectedBbMonths);
        if (calcExp) {
          detectedExp = calcExp;
          isCalculatedExpiry = true;
        }
      } else if (detectedMfg && detectedExp && !detectedBbMonths) {
        detectedBbMonths = diffMonths(detectedMfg, detectedExp);
      }

      const rawPriceStr = cues.possiblePrices?.[0] || "";
      const priceNum = parseFloat(rawPriceStr.replace(/[^0-9.]/g, "")) || null;
      let detectedCurrency = "";
      if (/Rs|रू|NPR/i.test(rawPriceStr) || cues.rawTextLines?.some(l => /Rs|रू|NPR/i.test(l))) {
        detectedCurrency = "NPR";
      } else if (/₹|INR/i.test(rawPriceStr) || cues.rawTextLines?.some(l => /₹|INR/i.test(l))) {
        detectedCurrency = "INR";
      } else if (/\$|USD/i.test(rawPriceStr) || cues.rawTextLines?.some(l => /\$|USD/i.test(l))) {
        detectedCurrency = "USD";
      } else if (/€|EUR/i.test(rawPriceStr)) {
        detectedCurrency = "EUR";
      } else if (/£|GBP/i.test(rawPriceStr)) {
        detectedCurrency = "GBP";
      }

      // Detect unit from text
      let detectedUnit = "pcs";
      let detectedQty = 1;
      const allText = [...(cues.rawTextLines || []), ...(cues.extractedKeywords || [])].join(" ");
      const weightMatch = allText.match(/(\d+(?:\.\d+)?)\s*(kg|g|mg|tonne|ml|l|ltr|litres?|grams?)/i);
      if (weightMatch) {
        const u = weightMatch[2].toLowerCase();
        if (u.startsWith("kg")) detectedUnit = "kg";
        else if (u.startsWith("g")) detectedUnit = "g";
        else if (u.startsWith("mg")) detectedUnit = "mg";
        else if (u.startsWith("ml")) detectedUnit = "mL";
        else if (u.startsWith("l")) detectedUnit = "L";
      }

      // Check multi-pack
      const multiMatch = allText.match(/(\d+)\s*(?:x|×|pcs|bottles|cans|packets|boxes|packs)/i);
      if (multiMatch) {
        const parsedQ = parseInt(multiMatch[1], 10);
        if (parsedQ > 1 && parsedQ <= 1000) {
          detectedQty = parsedQ;
        }
      }

      // Detect language
      let detectedLang = "English";
      if (/[\u0900-\u097F]/.test(allText)) {
        // Devanagari script - Nepali or Hindi
        detectedLang = /छ|छन्|हो|गर्नु|नेपाल|काठमाडौं|रू/i.test(allText) ? "Nepali" : "Hindi";
      }

      const keywords = cues.extractedKeywords || [];
      const productName = keywords.slice(0, 4).join(" ") || "Product Item";

      const synthesizedFields = {
        productName,
        price: priceNum,
        currency: detectedCurrency || "",
        manufactureDate: detectedMfg,
        expiryDate: detectedExp,
        bestBeforeMonths: detectedBbMonths,
        quantity: detectedQty,
        unit: detectedUnit,
        detectedLanguage: detectedLang,
        isCalculatedExpiry,
        confidence: {
          productName: 0.85,
          price: priceNum ? 0.85 : 0.0,
          currency: detectedCurrency ? 0.85 : 0.4,
          manufactureDate: detectedMfg ? 0.88 : 0.0,
          expiryDate: detectedExp ? 0.88 : 0.0,
          bestBeforeMonths: detectedBbMonths ? 0.85 : 0.0,
          quantity: 0.85,
          unit: detectedUnit !== "pcs" ? 0.85 : 0.5,
          detectedLanguage: 0.85,
          overall: 0.85,
        },
        warnings: [
          "Processed via local optical character cues fallback.",
          ...(isCalculatedExpiry ? ["Expiry date calculated from MFD + Best Before duration."] : []),
          ...(!detectedCurrency ? ["Currency could not be confirmed; please check."] : []),
        ],
      };

      return sendJson(res, 200, {
        success: true,
        model: "local-ocr-synthesizer",
        photosAnalyzedCount: cleanImages.length,
        data: synthesizedFields,
      });
    }

    const text = response?.text;
    if (!text || text.trim().length === 0) {
      return sendJson(res, 500, {
        success: false,
        code: "MALFORMED_RESPONSE",
        error: "Empty or malformed response returned by the Gemini 3.7 supervisor.",
      });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(text);
    } catch (parseErr) {
      console.error("Failed to parse JSON response:", text);
      return sendJson(res, 500, {
        success: false,
        code: "JSON_PARSE_ERROR",
        error: "Gemini Vision response could not be parsed as valid JSON.",
        rawText: text,
      });
    }

    // Strict Post-Processing & Date Reconciliation
    let finalMfg = typeof parsedData.manufactureDate === "string" ? parsedData.manufactureDate.trim() : "";
    let finalExp = typeof parsedData.expiryDate === "string" ? parsedData.expiryDate.trim() : "";
    let finalBbMonths = typeof parsedData.bestBeforeMonths === "number" && !isNaN(parsedData.bestBeforeMonths) && parsedData.bestBeforeMonths > 0
      ? Math.round(parsedData.bestBeforeMonths)
      : null;
    let isCalculated = false;

    // Reconciliation logic
    if (finalMfg && finalBbMonths && !finalExp) {
      const calculatedExp = addMonths(finalMfg, finalBbMonths);
      if (calculatedExp) {
        finalExp = calculatedExp;
        isCalculated = true;
      }
    } else if (finalMfg && finalExp && !finalBbMonths) {
      const calcMonths = diffMonths(finalMfg, finalExp);
      if (calcMonths) {
        finalBbMonths = calcMonths;
      }
    }

    let finalPrice: number | null = null;
    if (typeof parsedData.price === "number" && !isNaN(parsedData.price) && parsedData.price >= 0) {
      finalPrice = parsedData.price;
    } else if (typeof parsedData.price === "string") {
      const parsedNum = parseFloat(parsedData.price.replace(/[^0-9.]/g, ""));
      if (!isNaN(parsedNum)) {
        finalPrice = parsedNum;
      }
    }

    // Process currency cleanly
    let finalCurrency = (parsedData.currency || "").trim().toUpperCase();
    if (finalCurrency === "RS" || finalCurrency === "रू" || finalCurrency === "NRS") {
      finalCurrency = "NPR";
    } else if (finalCurrency === "₹") {
      finalCurrency = "INR";
    } else if (finalCurrency === "$") {
      finalCurrency = "USD";
    } else if (finalCurrency === "€") {
      finalCurrency = "EUR";
    } else if (finalCurrency === "£") {
      finalCurrency = "GBP";
    }

    // Process quantity and unit
    let finalQuantity = typeof parsedData.quantity === "number" && parsedData.quantity > 0
      ? parsedData.quantity
      : 1;
    let finalUnit = (parsedData.unit || "pcs").trim();
    let finalLanguage = (parsedData.detectedLanguage || "English").trim();

    const structuredResult = {
      productName: (parsedData.productName || "").trim(),
      price: finalPrice,
      currency: finalCurrency,
      manufactureDate: finalMfg,
      expiryDate: finalExp,
      bestBeforeMonths: finalBbMonths,
      quantity: finalQuantity,
      unit: finalUnit,
      detectedLanguage: finalLanguage,
      isCalculatedExpiry: isCalculated,
      confidence: parsedData.confidence || {
        productName: parsedData.productName ? 0.95 : 0.0,
        price: finalPrice !== null ? 0.90 : 0.0,
        currency: finalCurrency ? 0.90 : 0.3,
        manufactureDate: finalMfg ? 0.95 : 0.0,
        expiryDate: finalExp ? 0.95 : 0.0,
        bestBeforeMonths: finalBbMonths !== null ? 0.90 : 0.0,
        quantity: 0.90,
        unit: finalUnit ? 0.90 : 0.3,
        detectedLanguage: finalLanguage ? 0.95 : 0.5,
        overall: 0.92,
      },
      warnings: Array.isArray(parsedData.warnings) ? parsedData.warnings : [],
    };

    return sendJson(res, 200, {
      success: true,
      model: usedModel,
      photosAnalyzedCount: cleanImages.length,
      data: structuredResult,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Unhandled error in /api/extract-form:", error);
    return sendJson(res, 500, {
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      error: error.message || "Failed to process image and extract form data.",
    });
  }
}

/**
 * POST /api/supervise-barcode-pipeline
 */
export async function handleSuperviseBarcodePipeline(req: any, res: any) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }
  try {
    const body = await getParsedBody(req);
    const {
      barcode,
      databaseProduct,
      ocrTextLines = [],
      images = [],
      apiKey,
    } = body;

    const cleanImages: Array<{ data: string; mimeType: string }> = [];
    if (Array.isArray(images)) {
      for (const item of images) {
        const raw = typeof item === "string" ? item : item?.imageBase64 || item?.dataUrl || "";
        let clean = raw.trim();
        let detectedMime = typeof item === "object" && item?.mimeType ? item.mimeType : "image/jpeg";
        const match = clean.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
        if (match) {
          detectedMime = match[1];
          clean = match[2].trim();
        } else {
          clean = clean.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, "").trim();
        }
        if (clean.length > 0) {
          cleanImages.push({ data: clean, mimeType: detectedMime });
        }
      }
    }

    const prompt = `You are a strict PRODUCT SUPERVISOR and DATA MERGER for a retail inventory pipeline.
You are given:
1. Scanned Barcode: "${barcode || "Not provided"}"
2. Product Database Lookup Result: ${JSON.stringify(databaseProduct || null, null, 2)}
3. Label OCR Text Lines: ${JSON.stringify(ocrTextLines)}
${cleanImages.length > 0 ? `4. ${cleanImages.length} captured photo(s) of product label / packaging.` : "4. No label images provided."}

YOUR OBJECTIVES:
1. Verify and correlate product identity (Product Name, Brand, Category, Package Size, Unit, Ingredients).
2. Extract or confirm batch / lot number (B.No, LOT).
3. Extract or confirm manufacture date (MFD, MFG, DOM) and expiry date (EXP, EXD, Use By).
4. If Best Before duration (e.g. "12 Months from MFD") is present, extract bestBefore and bestBeforeMonths.
5. Extract MRP / Price.
6. Return confidence scores (0 to 100) per field.
7. CRITICAL: Never fabricate or hallucinate dates, batch numbers, or product details. Return "" or null if absent.

Return strict JSON only matching the schema.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        productName: { type: Type.STRING },
        brand: { type: Type.STRING },
        category: { type: Type.STRING },
        manufacturer: { type: Type.STRING },
        packageSize: { type: Type.STRING },
        unit: { type: Type.STRING },
        barcode: { type: Type.STRING },
        batchNumber: { type: Type.STRING },
        mrp: { type: Type.STRING },
        manufactureDate: { type: Type.STRING },
        expiryDate: { type: Type.STRING },
        bestBefore: { type: Type.STRING },
        bestBeforeMonths: { type: Type.NUMBER },
        ingredients: { type: Type.STRING },
        confidence: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.NUMBER },
            brand: { type: Type.NUMBER },
            barcode: { type: Type.NUMBER },
            batchNumber: { type: Type.NUMBER },
            mrp: { type: Type.NUMBER },
            manufactureDate: { type: Type.NUMBER },
            expiryDate: { type: Type.NUMBER },
          },
        },
        warnings: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: [
        "productName",
        "brand",
        "barcode",
        "batchNumber",
        "manufactureDate",
        "expiryDate",
        "confidence",
        "warnings",
      ],
    };

    let ai;
    try {
      ai = getAiClient(apiKey);
    } catch (clientErr: unknown) {
      return sendJson(res, 200, {
        success: true,
        model: "local-synthesizer",
        data: {
          productName: databaseProduct?.productName || "",
          brand: databaseProduct?.brand || "",
          category: databaseProduct?.category || "General Merchandise",
          manufacturer: databaseProduct?.manufacturer || "",
          packageSize: databaseProduct?.packageSize || "1",
          unit: databaseProduct?.unit || "units",
          barcode: barcode || "",
          batchNumber: "",
          mrp: databaseProduct?.mrp ? String(databaseProduct.mrp) : "",
          manufactureDate: "",
          expiryDate: "",
          bestBefore: "",
          bestBeforeMonths: null,
          ingredients: databaseProduct?.ingredients || "",
          confidence: {
            productName: databaseProduct?.productName ? 95 : 0,
            brand: databaseProduct?.brand ? 95 : 0,
            barcode: 100,
            batchNumber: 0,
            mrp: databaseProduct?.mrp ? 90 : 0,
            manufactureDate: 0,
            expiryDate: 0,
          },
          warnings: ["Processed locally without remote Gemini API key."],
        },
      });
    }

    const imageParts = cleanImages.map((img) => ({
      inlineData: {
        mimeType: img.mimeType || "image/jpeg",
        data: img.data,
      },
    }));

    const modelCandidates = getModelCandidateList();

    let response;
    let usedModel = GEMINI_MODEL;

    for (const candidate of modelCandidates) {
      try {
        usedModel = candidate;
        response = await callGeminiWithBackoff(async () => {
          return await ai.models.generateContent({
            model: candidate,
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }, ...imageParts],
              },
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: schema,
              temperature: 0.1,
            },
          });
        }, 1);
        if (response?.text) break;
      } catch (candidateErr) {
        console.warn(`[Gemini Pipeline] Model ${candidate} failed. Trying cascade...`);
      }
    }

    const text = response?.text;
    if (!text) {
      return sendJson(res, 200, {
        success: true,
        model: "local-baseline",
        data: {
          productName: databaseProduct?.productName || "",
          brand: databaseProduct?.brand || "",
          category: databaseProduct?.category || "General Merchandise",
          manufacturer: databaseProduct?.manufacturer || "",
          packageSize: databaseProduct?.packageSize || "1",
          unit: databaseProduct?.unit || "units",
          barcode: barcode || "",
          batchNumber: "",
          mrp: databaseProduct?.mrp ? String(databaseProduct.mrp) : "",
          manufactureDate: "",
          expiryDate: "",
          bestBefore: "",
          bestBeforeMonths: null,
          ingredients: databaseProduct?.ingredients || "",
          confidence: {
            productName: databaseProduct?.productName ? 95 : 0,
            brand: databaseProduct?.brand ? 95 : 0,
            barcode: 100,
            batchNumber: 0,
            mrp: databaseProduct?.mrp ? 90 : 0,
            manufactureDate: 0,
            expiryDate: 0,
          },
          warnings: [],
        },
      });
    }

    const parsedData = JSON.parse(text);
    return sendJson(res, 200, {
      success: true,
      model: usedModel,
      data: parsedData,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error in /api/supervise-barcode-pipeline:", error);
    return sendJson(res, 500, {
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      error: error.message || "Failed to supervise barcode pipeline.",
    });
  }
}

