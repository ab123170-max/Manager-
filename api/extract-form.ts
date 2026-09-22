/**
 * Vercel serverless endpoint: POST /api/extract-form
 * Uses the Gemini REST generateContent endpoint directly so the model
 * identifier is placed in the URL exactly as Google expects.
 */
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

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

function extractJson(text: string) {
  const cleaned = String(text || "").replace(/^\`\`\`json\s*/i, "").replace(/\s*\`\`\`$/i, "").trim();
  return JSON.parse(cleaned);
}

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "POST") return sendJson(res, 405, { success: false, error: "POST required" });

  let usedModel = MODEL;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return sendJson(res, 500, {
        success: false,
        code: "API_KEY_MISSING",
        error: "GEMINI_API_KEY is not configured in Vercel.",
      });
    }

    const body = await getBody(req);
    const rawImages: any[] = Array.isArray(body?.images)
      ? body.images
      : (body?.imageBase64 ? [body.imageBase64] : []);

    const images = rawImages
      .map((item) => typeof item === "string"
        ? cleanImage(item, body?.mimeType || "image/jpeg")
        : cleanImage(item?.imageBase64 || item?.dataUrl || "", item?.mimeType || body?.mimeType || "image/jpeg"))
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
3. currency: currency code only when supported by printed markings.
4. manufactureDate: MFD/MFG/DOM/PKD date exactly as printed.
5. expiryDate: EXP/EXD/USE BY date exactly as printed.
6. bestBeforeMonths: duration in months if printed or reliably derivable from MFD and expiry.

Rules:
- Never invent or hallucinate information.
- Do not swap manufacture and expiry dates.
- If MFD + Best Before duration is visible and expiry is absent, calculate expiry.
- Preserve the printed date format when possible.
- Analyze all photos together as one product.
- Return JSON only.

Local OCR cues (may be incomplete; verify against images):
${cueText}`;

    // Try the configured primary model first. If Google returns a temporary
    // capacity/high-demand response, automatically retry with stable Flash
    // fallbacks so a temporary spike does not break product scanning.
    const models = [MODEL, "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash"].filter((model, index, list) => list.indexOf(model) === index);
    let googleJson: any = {};
    let googleResponse: Response | null = null;
    usedModel = models[0];

    for (const candidateModel of models) {
      const endpoint =
        `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const requestBody = {
        contents: [{
          role: "user",
          parts: [
            ...images.map((img) => ({
              inline_data: {
                mime_type: img.mimeType,
                data: img.data,
              },
            })),
            { text: prompt },
          ],
        }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      };

      googleResponse = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      googleJson = await googleResponse.json().catch(() => ({}));
      usedModel = candidateModel;

      // Retry only transient capacity/rate-limit errors. Do not hide
      // authentication, permission, malformed-request, or quota errors.
      if (googleResponse.ok) break;

      const status = googleResponse.status;
      const apiStatus = String(googleJson?.error?.status || "").toUpperCase();
      const message = String(googleJson?.error?.message || "").toLowerCase();
      const transient =
        status === 429 ||
        status === 503 ||
        apiStatus === "UNAVAILABLE" ||
        message.includes("high demand") ||
        message.includes("temporarily unavailable");

      if (!transient) break;
    }

    if (!googleResponse) {
      return sendJson(res, 502, {
        success: false,
        code: "GEMINI_REQUEST_FAILED",
        error: "Could not reach Gemini.",
      });
    }

    if (!googleResponse.ok) {
      const googleMessage =
        googleJson?.error?.message ||
        `Gemini API returned HTTP ${googleResponse.status}.`;

      console.error("[extract-form] Gemini REST error:", googleJson);

      return sendJson(res, googleResponse.status, {
        success: false,
        code: googleJson?.error?.status || "GEMINI_REQUEST_FAILED",
        error: googleMessage,
        model: usedModel,
        attemptedModels: models,
      });
    }

    const text =
      googleJson?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text || "")
        .join("")
        .trim() || "";

    if (!text) {
      return sendJson(res, 502, {
        success: false,
        code: "GEMINI_EMPTY_RESPONSE",
        error: "Gemini returned no extraction result.",
        model: usedModel,
      });
    }

    let parsed: any;
    try {
      parsed = extractJson(text);
    } catch {
      return sendJson(res, 502, {
        success: false,
        code: "JSON_PARSE_ERROR",
        error: "Gemini returned an invalid JSON extraction result.",
        model: usedModel,
      });
    }

    return sendJson(res, 200, {
      success: true,
      model: usedModel,
      photosAnalyzedCount: images.length,
      data: normalizeResult(parsed),
    });
  } catch (err: any) {
    console.error("[extract-form] Vercel handler error:", err);
    return sendJson(res, 500, {
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      error: err?.message || "Gemini extraction failed on Vercel.",
      model: usedModel,
    });
  }
}
