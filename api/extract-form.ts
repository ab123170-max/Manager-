/**
 * Vercel serverless endpoint: POST /api/extract-form
 * Official @google/genai SDK integration with strict model name formatting
 */
import { GoogleGenAI, Type } from "@google/genai";

function cleanModelName(candidate?: string): string {
  const raw = (candidate || process.env.GEMINI_MODEL || "gemini-3.8-flash").trim();
  let clean = raw.replace(/^models\//, "");
  while (clean.startsWith("models/")) {
    clean = clean.replace(/^models\//, "");
  }
  return clean || "gemini-3.8-flash";
}

const MODEL = cleanModelName(process.env.GEMINI_MODEL || "gemini-3.8-flash");

function sendJson(res: any, status: number, data: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");
  return res.status(status).json(data);
}

async function getBody(req: any) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return await new Promise<any>((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: any) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function cleanImage(value: unknown, fallbackMime = "image/jpeg") {
  let data = String(value || "").trim();
  let mimeType = fallbackMime;
  const match = data.match(/^data:([^;]+);base64,(.+)$/s);
  if (match) {
    mimeType = match[1];
    data = match[2].trim();
  }
  return { data, mimeType };
}

function parseDateParts(dateStr: string) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const raw = dateStr.trim();
  if (!raw) return null;
  const dmy = raw.match(/^(\d{1,2})([/\-.])(\d{1,2})\2(\d{2,4})$/);
  if (dmy) {
    const d = parseInt(dmy[1], 10);
    const m = parseInt(dmy[3], 10);
    let y = dmy[4];
    if (y.length === 2) y = `20${y}`;
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return { day: d, month: m, year: parseInt(y, 10), sep: dmy[2], format: "DMY" };
    }
  }
  const my = raw.match(/^(\d{1,2})([/\-.])(\d{2,4})$/);
  if (my) {
    const m = parseInt(my[1], 10);
    let y = my[3];
    if (y.length === 2) y = `20${y}`;
    if (m >= 1 && m <= 12) {
      return { month: m, year: parseInt(y, 10), sep: my[2], format: "MY" };
    }
  }
  const ymd = raw.match(/^(\d{4})([/\-.])(\d{1,2})\2(\d{1,2})$/);
  if (ymd) {
    const y = parseInt(ymd[1], 10);
    const m = parseInt(ymd[3], 10);
    const d = parseInt(ymd[4], 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return { day: d, month: m, year: y, sep: ymd[2], format: "YMD" };
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
  return `${pad(newMonth)}${sep}${newYear}`;
}

function diffMonths(mfdStr: string, expStr: string): number | null {
  const m = parseDateParts(mfdStr);
  const e = parseDateParts(expStr);
  if (!m || !e) return null;
  const d = (e.year - m.year) * 12 + (e.month - m.month);
  return d > 0 && d <= 120 ? d : null;
}

function normalizeResult(raw: any) {
  const r = raw && typeof raw === "object" ? raw : {};
  let price: number | null = null;
  if (typeof r.price === "number" && !isNaN(r.price)) {
    price = r.price;
  } else if (typeof r.price === "string") {
    const num = parseFloat(r.price.replace(/[^0-9.]/g, ""));
    if (!isNaN(num)) price = num;
  }

  let mfd = typeof r.manufactureDate === "string" ? r.manufactureDate.trim() : "";
  let exp = typeof r.expiryDate === "string" ? r.expiryDate.trim() : "";
  let bbMonths: number | null = null;
  if (typeof r.bestBeforeMonths === "number" && !isNaN(r.bestBeforeMonths) && r.bestBeforeMonths > 0) {
    bbMonths = Math.round(r.bestBeforeMonths);
  }

  let isCalculatedExpiry = Boolean(r.isCalculatedExpiry);
  if (mfd && bbMonths && !exp) {
    const calc = addMonths(mfd, bbMonths);
    if (calc) {
      exp = calc;
      isCalculatedExpiry = true;
    }
  } else if (mfd && exp && !bbMonths) {
    bbMonths = diffMonths(mfd, exp);
  }

  let quantity = 1;
  if (typeof r.quantity === "number" && r.quantity > 0) {
    quantity = r.quantity;
  } else if (typeof r.quantity === "string") {
    const num = parseInt(r.quantity, 10);
    if (!isNaN(num) && num > 0) quantity = num;
  }

  return {
    productName: typeof r.productName === "string" ? r.productName.trim() : "",
    price,
    currency: typeof r.currency === "string" ? r.currency.trim().toUpperCase() : "",
    manufactureDate: mfd,
    expiryDate: exp,
    bestBeforeMonths: bbMonths,
    quantity,
    unit: typeof r.unit === "string" && r.unit.trim() ? r.unit.trim() : "pcs",
    detectedLanguage: typeof r.detectedLanguage === "string" && r.detectedLanguage.trim() ? r.detectedLanguage.trim() : "English",
    isCalculatedExpiry,
    confidence: r.confidence && typeof r.confidence === "object" ? r.confidence : {
      productName: r.productName ? 0.95 : 0.0,
      price: price !== null ? 0.90 : 0.0,
      currency: r.currency ? 0.90 : 0.3,
      manufactureDate: mfd ? 0.95 : 0.0,
      expiryDate: exp ? 0.95 : 0.0,
      bestBeforeMonths: bbMonths !== null ? 0.90 : 0.0,
      quantity: 0.90,
      unit: r.unit ? 0.90 : 0.3,
      detectedLanguage: r.detectedLanguage ? 0.95 : 0.5,
      overall: 0.92,
    },
    warnings: Array.isArray(r.warnings) ? r.warnings : [],
  };
}

const productExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    productName: {
      type: Type.STRING,
      description: "Complete product name exactly as printed on packaging without translation.",
    },
    price: {
      type: Type.NUMBER,
      description: "Numeric MRP or selling price value. Null if not visible.",
    },
    currency: {
      type: Type.STRING,
      description: "Detected currency code (e.g., NPR, INR, USD, EUR, GBP). Empty string if not found.",
    },
    manufactureDate: {
      type: Type.STRING,
      description: "Manufacture date (MFD/MFG/DOM/PKD) as printed.",
    },
    expiryDate: {
      type: Type.STRING,
      description: "Expiry date (EXP/EXD/USE BY) as printed or calculated.",
    },
    bestBeforeMonths: {
      type: Type.NUMBER,
      description: "Duration in months if printed as a best before period.",
    },
    quantity: {
      type: Type.NUMBER,
      description: "Inventory count (e.g., 1 for single package, 12 for 12-pack). Default 1.",
    },
    unit: {
      type: Type.STRING,
      description: "Standard unit: 'g', 'kg', 'mg', 'mL', 'L', 'pcs', 'bottles', 'cans', 'packets', 'boxes'.",
    },
    detectedLanguage: {
      type: Type.STRING,
      description: "Detected primary language on package (e.g., English, Nepali, Hindi).",
    },
    confidence: {
      type: Type.OBJECT,
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
      description: "Notices regarding uncertain fields or date calculations.",
    },
  },
  required: ["productName", "manufactureDate", "expiryDate"],
};

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "POST") return sendJson(res, 405, { success: false, error: "POST required" });

  let usedModel = MODEL;

  try {
    const body = await getBody(req);
    const apiKey = body?.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return sendJson(res, 500, {
        success: false,
        code: "API_KEY_MISSING",
        error: "GEMINI_API_KEY is not configured in Vercel environment or settings.",
      });
    }

    const rawImages: any[] = Array.isArray(body?.images)
      ? body.images
      : (body?.imageBase64 ? [body.imageBase64] : []);

    const images = rawImages
      .map((item) =>
        typeof item === "string"
          ? cleanImage(item, body?.mimeType || "image/jpeg")
          : cleanImage(item?.imageBase64 || item?.dataUrl || "", item?.mimeType || body?.mimeType || "image/jpeg")
      )
      .filter((x) => x.data);

    if (!images.length) {
      return sendJson(res, 400, {
        success: false,
        code: "IMAGE_PROCESSING_FAILED",
        error: "No valid product image received.",
      });
    }

    const localOcrCues = body?.localOcrCues || {};
    const cueText = JSON.stringify({
      possibleBarcodes: localOcrCues.possibleBarcodes || [],
      possibleBatchNumbers: localOcrCues.possibleBatchNumbers || [],
      possibleDates: localOcrCues.possibleDates || [],
      possiblePrices: localOcrCues.possiblePrices || [],
      possibleQuantities: localOcrCues.possibleQuantities || [],
      extractedKeywords: localOcrCues.extractedKeywords || [],
      rawTextLines: (localOcrCues.rawTextLines || []).slice(0, 20),
    });

    const prompt = `You are a strict product packaging extraction engine.
Analyze all supplied photos as the SAME product.

Extract ONLY:
1. productName: exact printed product name.
2. price: numeric printed MRP/price, null if not visible.
3. currency: currency code only when supported by printed markings (e.g. NPR, INR, USD, EUR, GBP).
4. manufactureDate: MFD/MFG/DOM/PKD date exactly as printed.
5. expiryDate: EXP/EXD/USE BY date exactly as printed.
6. bestBeforeMonths: duration in months if printed or reliably derivable from MFD and expiry.
7. quantity: inventory count (default 1).
8. unit: package unit (e.g., pcs, g, kg, mL, L).
9. detectedLanguage: detected primary language on label.

Rules:
- Never invent or hallucinate information.
- Do not swap manufacture and expiry dates.
- If MFD + Best Before duration is visible and expiry is absent, calculate expiry.
- Preserve the printed date format when possible.
- Analyze all photos together as one product.
- Return JSON strictly matching the schema.

Local OCR cues (may be incomplete; verify against images):
${cueText}`;

    const ai = new GoogleGenAI({
      apiKey,
    });

    const primaryModel = (process.env.GEMINI_MODEL || "gemini-3.8-flash").replace(/^models\//, "");
    const model = cleanModelName(primaryModel);

    const candidateModels = [
      model,
      "gemini-3.7-flash",
      "gemini-3.1-flash-lite",
    ]
      .map(cleanModelName)
      .filter((m, index, list) => list.indexOf(m) === index);

    const imageParts = images.map((img) => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data,
      },
    }));

    let response: any = null;
    let lastError: any = null;

    for (const candidate of candidateModels) {
      try {
        usedModel = candidate;
        response = await ai.models.generateContent({
          model: candidate,
          contents: [
            {
              role: "user",
              parts: [
                ...imageParts,
                { text: prompt },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: productExtractionSchema,
            temperature: 0.1,
          },
        });

        if (response?.text) {
          break;
        }
      } catch (candidateErr: any) {
        lastError = candidateErr;
        console.warn(`[extract-form] Model '${candidate}' failed:`, candidateErr?.message || candidateErr);
        // Continue to fallback candidate
      }
    }

    if (!response?.text) {
      const errMsg = lastError?.message || "Gemini returned an empty response.";
      const status = lastError?.status || 500;
      return sendJson(res, status >= 400 && status < 600 ? status : 500, {
        success: false,
        code: lastError?.code || "EXTRACTION_FAILED",
        error: errMsg,
        model: usedModel,
      });
    }

    const parsed = JSON.parse(response.text);
    return sendJson(res, 200, {
      success: true,
      model: usedModel,
      photosAnalyzedCount: images.length,
      data: normalizeResult(parsed),
    });
  } catch (err: any) {
    console.error("[extract-form] Handler error:", err);
    return sendJson(res, 500, {
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      error: err?.message || "Gemini extraction failed.",
      model: usedModel,
    });
  }
}
