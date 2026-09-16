import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { mapProductDateLabels } from "./serverDateMappingEngine";

dotenv.config();

/**
 * ============================================================================
 * CENTRALIZED MODEL CONFIGURATION & SANITIZATION
 * ============================================================================
 * Primary Gemini model identifier: "gemini-3.7-flash"
 * Strictly sanitizes process.env.GEMINI_MODEL to prevent auth tokens or malformed
 * prefixes from causing 400 INVALID_ARGUMENT errors.
 */
function resolveGeminiModel(candidate?: string): string {
  const DEFAULT_MODEL = "gemini-3.7-flash";
  if (!candidate || typeof candidate !== "string") {
    return DEFAULT_MODEL;
  }
  let clean = candidate.trim();
  if (clean.startsWith("models/")) {
    clean = clean.replace(/^models\//, "");
  }
  // Validate model format: starts with gemini- and uses only valid model chars
  if (/^gemini-[a-z0-9\.\-]+$/i.test(clean)) {
    return clean;
  }
  return DEFAULT_MODEL;
}

const GEMINI_MODEL = resolveGeminiModel(process.env.GEMINI_MODEL);

/**
 * Extracts structured status and error message from Google GenAI ApiError
 */
function parseApiErrorMessage(err: unknown): { status?: number; message: string } {
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
async function callGeminiWithBackoff<T>(
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware: allow JSON payload up to 25MB for base64 captured images
  app.use(express.json({ limit: "25mb" }));

  // Initialize Gemini Client
  // Note: Gemini API key is kept strictly server-side (process.env.GEMINI_API_KEY)
  const getAiClient = (overrideKey?: string) => {
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
  };

  /**
   * POST /api/product-lookup
   * Direct product database and Open Food Facts API query by barcode
   */
  app.post("/api/product-lookup", async (req, res) => {
    try {
      const { barcode } = req.body;
      if (!barcode || typeof barcode !== "string") {
        return res.status(400).json({
          success: false,
          error: "Barcode parameter is required.",
        });
      }

      const cleanBarcode = barcode.replace(/[\s\-_]/g, "").trim();

      // Query Open Food Facts API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      try {
        const offResponse = await fetch(
          `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json`,
          {
            headers: { "User-Agent": "InventoryScannerTwoEngine/2.0" },
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);

        if (offResponse.ok) {
          const offData = await offResponse.json();
          if (offData.status === 1 && offData.product) {
            const p = offData.product;
            const productName =
              p.product_name ||
              p.product_name_en ||
              p.generic_name ||
              "";
            const brand = p.brands ? p.brands.split(",")[0].trim() : "";
            const category = p.categories ? p.categories.split(",")[0].trim() : "Food & Grocery";
            const imageUrl = p.image_url || p.image_front_url || p.image_small_url || "";
            const quantity = p.quantity || "";

            return res.json({
              success: true,
              found: true,
              source: "open_food_facts",
              product: {
                barcode: cleanBarcode,
                productName: productName.trim(),
                product_name: productName.trim(),
                brand: brand.trim(),
                category: category.trim(),
                imageUrl,
                image_url: imageUrl,
                quantity,
                package_size: quantity,
                description: p.generic_name || "",
                mrp: "",
              },
            });
          }
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        console.warn(`[Product Lookup] OFF fetch error for ${cleanBarcode}:`, fetchErr);
      }

      return res.json({
        success: true,
        found: false,
        source: "none",
        product: null,
      });
    } catch (err: unknown) {
      const error = err as Error;
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to lookup product.",
      });
    }
  });

  /**
   * POST /api/ocr
   * Server-side OCR route for printed product text recognition
   */
  app.post("/api/ocr", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg" } = req.body;
      if (!imageBase64 || typeof imageBase64 !== "string") {
        return res.status(400).json({
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

      // If Gemini client is available, run rapid vision OCR
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

          const geminiRes = await ai.models.generateContent({
            model: "gemini-3.7-flash",
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

          if (geminiRes?.text) {
            const parsed = JSON.parse(geminiRes.text);
            return res.json({
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

      return res.json({
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
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to process OCR.",
      });
    }
  });

  /**
   * POST /api/scan
   * Combined Two-Engine Pipeline endpoint:
   * Barcode decoder + OCR processing + Label Mapping + Product DB Lookup + Conflict Resolution
   */
  app.post("/api/scan", async (req, res) => {
    try {
      const { imageBase64, barcode: inputBarcode, barcodeFormat = "EAN-13" } = req.body;

      const barcode = inputBarcode ? inputBarcode.replace(/[\s\-_]/g, "").trim() : "";

      // 1. Parallel: Product Database Lookup + OCR
      const lookupPromise = (async () => {
        if (!barcode) return null;
        try {
          const offRes = await fetch(
            `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
            { headers: { "User-Agent": "InventoryScannerTwoEngine/2.0" } }
          );
          if (offRes.ok) {
            const data = await offRes.json();
            if (data.status === 1 && data.product) {
              const p = data.product;
              return {
                barcode,
                product_name: (p.product_name || p.product_name_en || "").trim(),
                brand: p.brands ? p.brands.split(",")[0].trim() : "",
                category: p.categories ? p.categories.split(",")[0].trim() : "Food & Grocery",
                image_url: p.image_url || p.image_front_url || "",
                quantity: p.quantity || "",
                package_size: p.quantity || "",
                description: p.generic_name || "",
                mrp: "",
              };
            }
          }
        } catch (e) {
          console.warn(`[Scan Pipeline] OFF lookup error:`, e);
        }
        return null;
      })();

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
          const gemRes = await ai.models.generateContent({
            model: "gemini-3.7-flash",
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
          if (gemRes?.text) {
            return JSON.parse(gemRes.text);
          }
        } catch (e) {
          console.warn(`[Scan Pipeline] OCR error:`, e);
        }
        return null;
      })();

      const [dbProduct, ocrData] = await Promise.all([lookupPromise, ocrPromise]);

      // 2. Map Normalized Schema
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

      return res.json({
        success: true,
        data: normalizedResult,
      });
    } catch (err: unknown) {
      const error = err as Error;
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to process scan.",
      });
    }
  });

  /**
   * POST /api/extract-form
   * Multimodal Vision Supervisor route powered by Gemini 3.8.
   * Receives single imageBase64 or multiple images array, mimeType, and optional local OCR hypotheses.
   * Cross-synthesizes required information across photos and returns strict structured JSON.
   */
  app.post("/api/extract-form", async (req, res) => {
    try {
      const {
        imageBase64,
        images,
        mimeType = "image/jpeg",
        apiKey,
        localOcrCues,
      } = req.body;

      // 1. Gather all incoming images (supporting single or multi-photo requests)
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
        return res.status(400).json({
          success: false,
          code: "IMAGE_PROCESSING_FAILED",
          error: "Missing or invalid image data in request body. Provide imageBase64 or images array.",
        });
      }

      // Clean Base64 strings and filter empty payloads
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
        return res.status(400).json({
          success: false,
          code: "IMAGE_PROCESSING_FAILED",
          error: "All provided image payloads were empty after Base64 decoding.",
        });
      }

      // 2. Initialize Gemini Client with secure server-side key
      let ai;
      try {
        ai = getAiClient(apiKey);
      } catch (clientErr: unknown) {
        const err = clientErr as Error & { code?: string };
        return res.status(401).json({
          success: false,
          code: err.code || "API_KEY_INVALID",
          error: err.message,
        });
      }

      // 3. Construct Vision Supervisor prompt with multi-photo synthesis instructions
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

      const prompt = `You are a strict PRODUCT LABEL MAPPING ENGINE and Vision Supervisor for an intelligent scanner and auto-fill system.
Analyze the provided ${
        isMultiPhoto
          ? `${cleanImages.length} images of the SAME item (e.g., front face, back label, barcode panel, date markings, or package)`
          : "image"
      } with utmost precision.

CRITICAL PRODUCT DATE LABEL MAPPING RULES:
Your job is NOT to guess, fabricate, or invent missing dates.
Your job is to examine OCR/image-extracted text and determine what each date label means, then map it to the correct standardized field.

STANDARD DATE OUTPUT FIELDS:
- "manufacturingDate": MFD, MFG, MF, MFR, MANF, MAN, DOM, D.O.M, DATE OF MANUFACTURE, MANUFACTURED, MANUFACTURED DATE, MFG DATE, MFD DATE, MF DATE, MANF DATE, DATE MFG, MADE ON, DATE MADE.
  Examples: "MFD 08/2025" -> "08/2025", "MFG: 12-06-2025" -> "12-06-2025", "DOM 05/24" -> "05/24"
- "packedDate": PKD, PKG, PACKED, PACKED ON, PACK DATE, PACKED DATE, DATE PACKED, PACKAGING DATE.
  Examples: "PKD 08/2025" -> "08/2025", "PACKED ON 12/06/2025" -> "12/06/2025".
  IMPORTANT: Do NOT automatically convert PKD into manufacturingDate! Keep packedDate separate.
- "expiryDate": EXP, EXD, EXPD, EXPIRY, EXPIRY DATE, EXP DATE, EXPIRATION, EXPIRATION DATE, USE BY, USE BEFORE, VALID UNTIL, VALID UP TO, BEST BEFORE END.
  Examples: "EXP 08/2027" -> "08/2027", "EXD: 12/06/2027" -> "12/06/2027"
- "bestBefore": BB, BBE, BBD, BEST BEFORE, BEST BEFORE DATE, BEST BEFORE END, BEST BEFORE END DATE, BEST BY, BEST BY DATE.
  IMPORTANT: If it contains an actual calendar date, store that date as bestBefore.
  If it contains a duration (e.g. "BEST BEFORE 12 MONTHS FROM MFD", "USE WITHIN 6 MONTHS OF MANUFACTURE", "SHELF LIFE 24 MONTHS"), store the phrase in bestBefore and the number (e.g. 12 or 24) in bestBeforeMonths.
  Do NOT invent an expiry date unless calculated expiry is explicitly requested.

OCR ERROR HANDLING:
Recognize likely OCR variations (MFD -> MFO, M.F.D; MFG -> M.F.G; EXP -> EXR, EXD; PKD -> PKO, P.K.D; BBE -> B8E, B.B.E).
NEVER invent a date. NEVER change the actual digits of a date merely to make it look correct. Preserve extracted dates exactly.
If a label is uncertain, ambiguous, or corrupted, set confidence accordingly and flag in warnings.

DO NOT CONFUSE THESE:
MFD != EXP
MFG != EXP
PKD != MFD
BBE != MFD
EXP != BEST_BEFORE
BEST BEFORE != automatically EXPIRY

REQUIRED FIELDS:
1. Product & Package:
   - 'productName', 'brand', 'category', 'sku', 'barcode', 'batchNumber' (B.No, LOT), 'manufacturingDate', 'packedDate', 'expiryDate', 'bestBefore', 'bestBeforeMonths', 'quantity', 'unit', 'mrp'.
2. Official Documents:
   - 'fullName', 'documentNumber', 'dateOfBirth', 'issueDate', 'expiryDate', 'email', 'phone', 'address', 'organization', 'nationality'.
3. Confidence & Auditing:
   - Provide field-level confidence scores (0.0 to 1.0) and overall 'confidenceScore'.
   - If a field is not present on the item, return "" (empty string) and add to missingFields.
${localCuesContext}`;

      // 4. Prepare request payload for Gemini Vision processing with multiple image parts
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
                isProductOrPackage: {
                  type: Type.BOOLEAN,
                  description: "True if image is a product package, label, box, or bottle; False if ID/invoice document",
                },
                // Product Label Fields (Requirement 7)
                productName: {
                  type: Type.STRING,
                  description: "Name of the product. Empty string if not found.",
                },
                brand: {
                  type: Type.STRING,
                  description: "Brand name or manufacturer. Empty string if not found.",
                },
                category: {
                  type: Type.STRING,
                  description: "Category of product (e.g. Food & Beverage, Pharmaceuticals, Cosmetics, Retail, Electronics). Empty string if not found.",
                },
                sku: {
                  type: Type.STRING,
                  description: "Stock Keeping Unit or item code. Empty string if not found.",
                },
                barcode: {
                  type: Type.STRING,
                  description: "Barcode numbers (UPC/EAN/Code128) if visible or readable. Empty string if not found.",
                },
                batchNumber: {
                  type: Type.STRING,
                  description: "Batch number or Lot number (e.g., B.No, Lot). Empty string if not found.",
                },
                manufacturingDate: {
                  type: Type.STRING,
                  description: "Manufacturing or production date (MFG/MFD). Empty string if not found.",
                },
                expiryDate: {
                  type: Type.STRING,
                  description: "Expiration date or valid-until date (EXP). Empty string if not found.",
                },
                bestBefore: {
                  type: Type.STRING,
                  description: "Best before date or use-by date. Empty string if not found.",
                },
                quantity: {
                  type: Type.STRING,
                  description: "Net quantity / net weight / volume number. Empty string if not found.",
                },
                unit: {
                  type: Type.STRING,
                  description: "Unit of measurement (e.g., g, kg, ml, l, oz, tablets, pcs). Empty string if not found.",
                },
                mrp: {
                  type: Type.STRING,
                  description: "Maximum Retail Price or item price including currency if visible. Empty string if not found.",
                },
                // Document / Identity Fields
                documentType: {
                  type: Type.STRING,
                  description: "Classification of document or packaging",
                },
                fullName: {
                  type: Type.STRING,
                  description: "Full name of the person or entity (for documents)",
                },
                documentNumber: {
                  type: Type.STRING,
                  description: "ID number, license number, or invoice reference code",
                },
                dateOfBirth: {
                  type: Type.STRING,
                  description: "Date of birth in YYYY-MM-DD format if applicable",
                },
                issueDate: {
                  type: Type.STRING,
                  description: "Issue date or creation date",
                },
                email: {
                  type: Type.STRING,
                  description: "Email address if visible",
                },
                phone: {
                  type: Type.STRING,
                  description: "Telephone number if visible",
                },
                address: {
                  type: Type.STRING,
                  description: "Address or manufacturing facility location",
                },
                organization: {
                  type: Type.STRING,
                  description: "Issuing authority or parent company",
                },
                nationality: {
                  type: Type.STRING,
                  description: "Nationality or country of origin",
                },
                notesOrAdditional: {
                  type: Type.STRING,
                  description: "Additional observations, ingredients, or storage instructions",
                },
                confidenceScore: {
                  type: Type.NUMBER,
                  description: "Overall extraction confidence score from 0.0 to 1.0",
                },
                confidence: {
                  type: Type.OBJECT,
                  description: "Field-by-field confidence mapping",
                  properties: {
                    productName: { type: Type.NUMBER },
                    sku: { type: Type.NUMBER },
                    barcode: { type: Type.NUMBER },
                    batchNumber: { type: Type.NUMBER },
                    manufacturingDate: { type: Type.NUMBER },
                    expiryDate: { type: Type.NUMBER },
                    bestBefore: { type: Type.NUMBER },
                    quantity: { type: Type.NUMBER },
                    unit: { type: Type.NUMBER },
                    brand: { type: Type.NUMBER },
                    category: { type: Type.NUMBER },
                    mrp: { type: Type.NUMBER },
                  },
                },
                warnings: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Specific warnings about low legibility, ambiguity, or missing dates",
                },
                missingFields: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "List of expected fields that could not be reliably determined",
                },
                customFields: {
                  type: Type.ARRAY,
                  description: "Extra key-value pairs found on the item not covered above",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      key: { type: Type.STRING },
                      value: { type: Type.STRING },
                    },
                    required: ["key", "value"],
                  },
                },
              },
              required: [
                "productName",
                "sku",
                "barcode",
                "batchNumber",
                "manufacturingDate",
                "expiryDate",
                "bestBefore",
                "quantity",
                "unit",
                "brand",
                "category",
                "mrp",
                "confidence",
                "warnings",
                "missingFields",
              ],
            },
          },
        };

      // 5. Invoke Gemini with cascade of models and fallback synthesizer on quota limit
      let response;
      let usedModel = GEMINI_MODEL;
      const modelCandidates = [
        GEMINI_MODEL,
        "gemini-3.7-flash",
        "gemini-2.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash-lite",
      ].filter((m, i, arr) => arr.indexOf(m) === i);

      let lastError: unknown = null;
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
          lastError = candidateErr;
          const { status, message } = parseApiErrorMessage(candidateErr);
          console.warn(
            `[Gemini API] Candidate '${candidate}' failed (${status}: ${message}). Trying next candidate in cascade...`
          );
        }
      }

      // If all Gemini remote calls failed (e.g. quota exhausted 429 or network issue), synthesize from local OCR cues
      if (!response?.text) {
        console.warn("[Gemini API] All remote models exhausted. Synthesizing structured data from local OCR cues...");
        const cues = localOcrCues || {
          possibleBarcodes: [],
          possibleBatchNumbers: [],
          possibleDates: [],
          possiblePrices: [],
          possibleQuantities: [],
          extractedKeywords: [],
          rawTextLines: [],
        };

        // Apply Strict Date Mapping Engine to raw OCR lines and extracted dates
        const dateMapping = mapProductDateLabels([
          ...(cues.rawTextLines || []),
          ...(cues.extractedKeywords || []),
          ...(cues.possibleDates || []),
        ]);

        const detectedBarcode = cues.possibleBarcodes?.[0] || "";
        const detectedBatch = cues.possibleBatchNumbers?.[0] || "";
        const detectedMfg = dateMapping.manufacture_date || cues.possibleDates?.[0] || "";
        const detectedPacked = dateMapping.packed_date || "";
        const detectedExp = dateMapping.expiry_date || cues.possibleDates?.[1] || "";
        const detectedBestBefore = dateMapping.best_before || (dateMapping.best_before_months ? `${dateMapping.best_before_months} months from manufacture` : "");
        const detectedPrice = cues.possiblePrices?.[0] || "";
        const detectedQty = cues.possibleQuantities?.[0] || "";

        // Heuristic title extraction from keywords
        const keywords = cues.extractedKeywords || [];
        const productName = keywords.slice(0, 4).join(" ") || "Product Package Item";
        const brand = keywords[0] || "";

        const synthesizedData = {
          isProductOrPackage: true,
          documentType: "Product Package",
          productName: productName,
          sku: detectedBarcode ? `SKU-${detectedBarcode.slice(-6)}` : "",
          barcode: detectedBarcode,
          batchNumber: detectedBatch,
          manufacturingDate: detectedMfg,
          packedDate: detectedPacked,
          expiryDate: detectedExp,
          bestBefore: detectedBestBefore,
          bestBeforeMonths: dateMapping.best_before_months,
          dateMapping: dateMapping,
          quantity: detectedQty.replace(/[^0-9.]/g, "") || "1",
          unit: detectedQty.replace(/[0-9.\s]/g, "") || "units",
          brand: brand,
          category: "General Merchandise",
          mrp: detectedPrice,
          fullName: productName,
          documentNumber: detectedBarcode,
          dateOfBirth: "",
          issueDate: detectedMfg,
          email: "",
          phone: "",
          address: "",
          organization: brand,
          nationality: "",
          notesOrAdditional: `Locally synthesized from ${cleanImages.length} captured photo(s) and optical cues.`,
          confidence: {
            productName: 0.85,
            brand: 0.80,
            category: 0.75,
            sku: detectedBarcode ? 0.90 : 0.40,
            barcode: detectedBarcode ? 0.95 : 0.0,
            batchNumber: detectedBatch ? 0.90 : 0.0,
            manufacturingDate: detectedMfg ? 0.88 : 0.0,
            packedDate: detectedPacked ? 0.88 : 0.0,
            expiryDate: detectedExp ? 0.88 : 0.0,
            bestBefore: detectedBestBefore ? 0.85 : 0.0,
            quantity: detectedQty ? 0.85 : 0.0,
            unit: detectedQty ? 0.85 : 0.0,
            mrp: detectedPrice ? 0.90 : 0.0,
          },
          confidenceScore: dateMapping.confidence || 0.88,
          customFields: [],
          warnings: [
            "Processed using on-device optical character recognition and local heuristic synthesizer.",
            ...(dateMapping.needs_review ? ["Date label interpretation requires manual verification."] : []),
          ],
          missingFields: [
            !detectedBarcode ? "barcode" : "",
            !detectedBatch ? "batchNumber" : "",
            !detectedExp ? "expiryDate" : "",
            !detectedPrice ? "mrp" : "",
          ].filter(Boolean),
        };

        return res.json({
          success: true,
          model: "local-ocr-synthesizer",
          photosAnalyzedCount: cleanImages.length,
          data: synthesizedData,
        });
      }

      // 5. Validate Gemini Response Content
      const text = response?.text;
      if (!text || text.trim().length === 0) {
        return res.status(500).json({
          success: false,
          code: "MALFORMED_RESPONSE",
          error: "Empty or malformed response returned by the Gemini 3.8 supervisor.",
        });
      }

      // 6. JSON Parsing & Validation
      let parsedData;
      try {
        parsedData = JSON.parse(text);
      } catch (parseErr) {
        console.error("Failed to parse JSON response:", text);
        return res.status(500).json({
          success: false,
          code: "JSON_PARSE_ERROR",
          error: "Gemini Vision response could not be parsed as valid JSON.",
          rawText: text,
        });
      }

      return res.json({
        success: true,
        model: usedModel,
        photosAnalyzedCount: cleanImages.length,
        data: parsedData,
      });
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Unhandled error in /api/extract-form:", error);
      return res.status(500).json({
        success: false,
        code: "INTERNAL_SERVER_ERROR",
        error: error.message || "Failed to process image and extract form data.",
      });
    }
  });

  /**
   * POST /api/supervise-barcode-pipeline
   * Dedicated Barcode-to-Product Vision Supervisor route.
   * Cross-correlates scanned barcode, product database query, OCR cues, and label photos.
   */
  app.post("/api/supervise-barcode-pipeline", async (req, res) => {
    try {
      const {
        barcode,
        databaseProduct,
        ocrTextLines = [],
        images = [],
        apiKey,
      } = req.body;

      // Prepare images if provided
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
        // Fallback to local merge without AI
        return res.json({
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

      const modelCandidates = [
        GEMINI_MODEL,
        "gemini-3.7-flash",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
      ].filter((m, i, arr) => arr.indexOf(m) === i);

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
        // Return structured baseline from inputs
        return res.json({
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
      return res.json({
        success: true,
        model: usedModel,
        data: parsedData,
      });
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error in /api/supervise-barcode-pipeline:", error);
      return res.status(500).json({
        success: false,
        code: "INTERNAL_SERVER_ERROR",
        error: error.message || "Failed to supervise barcode pipeline.",
      });
    }
  });

  /**
   * POST /api/extract-invoice
   * Dedicated Invoice & Purchase Bill OCR Supervisor route powered by Gemini 3.8.
   * Extracts supplier details, invoice metadata, line items (Qty, Rate, Amount, Tax, Discount, MFD, EXP), and totals.
   */
  app.post("/api/extract-invoice", async (req, res) => {
    try {
      const { images, imageBase64, mimeType = "image/jpeg", apiKey } = req.body;

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
        return res.status(400).json({
          success: false,
          code: "IMAGE_PROCESSING_FAILED",
          error: "No invoice images provided.",
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
          cleanImages.push({ data: clean, mimeType: detectedMime });
        }
      }

      let ai;
      try {
        ai = getAiClient(apiKey);
      } catch (clientErr: unknown) {
        const err = clientErr as Error & { code?: string };
        return res.status(401).json({
          success: false,
          code: err.code || "API_KEY_INVALID",
          error: err.message,
        });
      }

      const prompt = `You are a strict, expert INVOICE & PURCHASE BILL OCR Extraction Engine.
Analyze the provided ${cleanImages.length} invoice image(s).
Extract all invoice metadata, supplier/vendor info, customer info, and line-item products.

CRITICAL FIELD MAPPING & ABBREVIATION RULES:
1. Header Information:
   - "invoiceNumber": Look for INV#, Invoice No, Bill No, Tax Invoice, Receipt #, Reference #.
   - "invoiceDate": Standardize to YYYY-MM-DD format (or retain original date string if year is unclear).
   - "supplier": Company/store/vendor name issuing the invoice, seller name, wholesale distributor.
   - "customerName": Buyer name, Sold To, Billed To, Consignee (if available, else "").

2. Line Item Extraction (Array of "items"):
   - "productName": Item description, product title, commodity name.
   - "barcode": Barcode number, EAN, UPC, HSN code, or SKU if printed alongside the item.
   - "quantity": Map QTY, Quantity, Units, Pcs, Nos, Bags, Boxes. Convert to number (default 1).
   - "unit": e.g. "pcs", "kg", "units", "boxes", "bags", "bottles".
   - "unitPrice": Map RATE, Rate/Unit, Unit Price, Price, Cost, Price Per Unit. Convert to number.
   - "totalPrice": Map AMT, Amount, Total, Item Total, Line Total, Net Amount. (Number).
   - "taxRate": GST%, VAT%, Tax percentage if listed. (Number, e.g. 5, 12, 18).
   - "taxAmount": Tax dollar/currency amount for this line item. (Number).
   - "discount": Line item discount amount or percentage. (Number).
   - "mfd": Manufacture date if printed on invoice (MFD, MFG, MANF, DOM).
   - "exp": Expiry date if printed on invoice (EXP, EXD, Expiry, Best Before).
   - "batchNumber": Batch / Lot number if printed (Batch No, Lot #, B.No).

3. Summary Financials:
   - "subtotal": Sub total before tax/discounts.
   - "taxAmount": Total VAT / GST / Sales tax.
   - "discountAmount": Total discount.
   - "grandTotal": Map TOTAL, Grand Total, Net Payable, Invoice Total, Total Due.

Return strict JSON only matching this schema. Never invent products or amounts.`;

      const imageParts = cleanImages.map((img) => ({
        inlineData: {
          mimeType: img.mimeType || "image/jpeg",
          data: img.data,
        },
      }));

      const schema = {
        type: Type.OBJECT,
        properties: {
          invoiceNumber: { type: Type.STRING },
          invoiceDate: { type: Type.STRING },
          supplier: { type: Type.STRING },
          customerName: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                productName: { type: Type.STRING },
                barcode: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                unitPrice: { type: Type.NUMBER },
                totalPrice: { type: Type.NUMBER },
                taxRate: { type: Type.NUMBER },
                taxAmount: { type: Type.NUMBER },
                discount: { type: Type.NUMBER },
                mfd: { type: Type.STRING },
                exp: { type: Type.STRING },
                batchNumber: { type: Type.STRING },
              },
              required: ["productName", "quantity", "unitPrice", "totalPrice"],
            },
          },
          subtotal: { type: Type.NUMBER },
          taxAmount: { type: Type.NUMBER },
          discountAmount: { type: Type.NUMBER },
          grandTotal: { type: Type.NUMBER },
          warnings: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["invoiceNumber", "supplier", "items", "grandTotal"],
      };

      const modelCandidates = [
        GEMINI_MODEL,
        "gemini-3.7-flash",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
      ].filter((m, i, arr) => arr.indexOf(m) === i);

      let response;
      let modelUsed = GEMINI_MODEL;
      for (const candidate of modelCandidates) {
        try {
          modelUsed = candidate;
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
          console.warn(`[Invoice API] Candidate '${candidate}' failed. Trying next...`, candidateErr);
        }
      }

      const text = response?.text;
      if (!text) {
        return res.status(500).json({
          success: false,
          code: "EMPTY_RESPONSE",
          error: "Empty response from Gemini Vision for invoice.",
        });
      }

      const parsedData = JSON.parse(text);

      return res.json({
        success: true,
        model: modelUsed,
        data: parsedData,
      });
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error in /api/extract-invoice:", error);
      return res.status(500).json({
        success: false,
        code: "INTERNAL_SERVER_ERROR",
        error: error.message || "Failed to extract invoice data.",
      });
    }
  });

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
