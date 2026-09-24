import { GoogleGenAI, Type } from '@google/genai';

function modelName(): string {
  const value = (process.env.GEMINI_MODEL || 'gemini-3.8-flash').trim();
  let clean = value.replace(/^models\//, '');
  while (clean.startsWith('models/')) {
    clean = clean.replace(/^models\//, '');
  }
  if (
    clean === 'gemini-flash-latest' ||
    clean.includes('latest') ||
    /^gemini-(1\.5|2\.0|2\.5)/i.test(clean) ||
    !/^gemini-[a-z0-9.\-]+$/i.test(clean)
  ) {
    return 'gemini-3.8-flash';
  }
  return clean;
}

function getAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not configured on Vercel.');
  return new GoogleGenAI({ apiKey: key });
}

function cleanImage(value: unknown, fallbackMime = 'image/jpeg') {
  if (typeof value !== 'string' || !value.trim()) return null;
  let data = value.trim();
  let mimeType = fallbackMime;
  const match = data.match(/^data:([a-zA-Z0-9/+.\-]+);base64,(.+)$/s);
  if (match) {
    mimeType = match[1];
    data = match[2].trim();
  }
  return data ? { data, mimeType } : null;
}

function getImages(body: any) {
  const input: any[] = Array.isArray(body?.images) ? body.images : [];
  if (body?.imageBase64) input.push({ imageBase64: body.imageBase64, mimeType: body.mimeType });
  return input
    .map((item) => typeof item === 'string' ? cleanImage(item) : cleanImage(item?.imageBase64 || item?.dataUrl, item?.mimeType || 'image/jpeg'))
    .filter(Boolean) as Array<{ data: string; mimeType: string }>;
}

const productSchema = {
  type: Type.OBJECT,
  properties: {
    productName: {
      type: Type.STRING,
      description: 'Product name as printed on the packaging, or empty string if absent.',
    },
    price: {
      type: Type.NUMBER,
      description: 'Numeric price or MRP value. Null if not printed.',
    },
    manufactureDate: {
      type: Type.STRING,
      description: 'Manufacturing date (MFD / MFG / DOM / PKD) as printed. Empty string if absent.',
    },
    expiryDate: {
      type: Type.STRING,
      description: 'Expiry date (EXP / EXD / USE BY / BEST BEFORE date) as printed. Empty string if absent.',
    },
    bestBeforeMonths: {
      type: Type.NUMBER,
      description: 'Best before duration in months as a number (e.g. 12 or 24). Null if absent.',
    },
  },
  required: ['productName', 'manufactureDate', 'expiryDate'],
};

async function extractForm(body: any) {
  const images = getImages(body);
  if (!images.length) throw Object.assign(new Error('No valid image was provided.'), { status: 400, code: 'IMAGE_PROCESSING_FAILED' });

  const cues = body?.localOcrCues || {};
  const cueText = JSON.stringify({
    possibleBarcodes: cues.possibleBarcodes || [],
    possibleBatchNumbers: cues.possibleBatchNumbers || [],
    possibleDates: cues.possibleDates || [],
    possiblePrices: cues.possiblePrices || [],
    possibleQuantities: cues.possibleQuantities || [],
    extractedKeywords: cues.extractedKeywords || [],
    rawTextLines: (cues.rawTextLines || []).slice(0, 20),
  });

  const prompt = `You are a strict product packaging extraction engine. Analyze the provided ${images.length} image(s) of the product.
Extract ONLY the following 5 fields based strictly on what is visible on the package:
1. productName: Name of the product as printed on the label.
2. price: Numeric price or MRP value. Do not include currency symbols. Null if not visible.
3. manufactureDate: Manufacturing or packaging date (MFD / MFG / DOM / PKD). Format as printed (e.g. DD/MM/YYYY or MM/YYYY). Empty string if absent.
4. expiryDate: Expiry date (EXP / EXD / USE BY / BEST BEFORE date). Format as printed. Empty string if absent.
5. bestBeforeMonths: Duration in months if stated as a best-before period (e.g., "Best before 12 months" -> 12). Null if absent.

Never invent or hallucinate information. If a field is not present on the packaging, return empty string or null.
OCR cues: ${cueText}`;

  const ai = getAI();
  const parts: any[] = images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } }));
  parts.push({ text: prompt });

  const currentModel = modelName();
  const response = await ai.models.generateContent({
    model: currentModel,
    contents: [{ role: 'user', parts }],
    config: { responseMimeType: 'application/json', responseSchema: productSchema, temperature: 0.1 },
  });
  if (!response.text) throw Object.assign(new Error('Gemini returned an empty response.'), { status: 502, code: 'MALFORMED_RESPONSE' });

  const extracted = JSON.parse(response.text);
  const data = {
    productName: String(extracted.productName || '').trim(),
    price: typeof extracted.price === 'number' && !isNaN(extracted.price) ? extracted.price : null,
    manufactureDate: String(extracted.manufactureDate || '').trim(),
    expiryDate: String(extracted.expiryDate || '').trim(),
    bestBeforeMonths: typeof extracted.bestBeforeMonths === 'number' && !isNaN(extracted.bestBeforeMonths) ? extracted.bestBeforeMonths : null,
    confidence: {
      productName: extracted.productName ? 0.95 : 0.0,
      price: extracted.price !== null ? 0.90 : 0.0,
      manufactureDate: extracted.manufactureDate ? 0.95 : 0.0,
      expiryDate: extracted.expiryDate ? 0.95 : 0.0,
      bestBeforeMonths: extracted.bestBeforeMonths !== null ? 0.90 : 0.0,
    },
    warnings: [],
  };
  return { success: true, model: currentModel, photosAnalyzedCount: images.length, data };
}

async function ocr(body: any) {
  const images = getImages(body);
  if (!images.length) throw Object.assign(new Error('imageBase64 is required.'), { status: 400 });
  const prompt = `Extract all visible printed text from this product image. Identify productName, brand, manufactureDate (MFD/MFG/MANF/DOM), expiryDate (EXP/EXD/USE BY), bestBefore, batchNumber, mrp, netWeight and quantity. Do not guess. Return JSON with rawText, lines, productName, brand, manufactureDate, expiryDate, bestBefore, batchNumber, mrp, netWeight, quantity, confidence.`;
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: modelName(),
    contents: [{ role: 'user', parts: [{ text: prompt }, ...images.map((i) => ({ inlineData: { mimeType: i.mimeType, data: i.data } }))] }],
    config: { responseMimeType: 'application/json', temperature: 0.1 },
  });
  const data = response.text ? JSON.parse(response.text) : {};
  return { success: true, source: 'gemini_ocr', data: { rawText: data.rawText || '', lines: Array.isArray(data.lines) ? data.lines : [], mapping: data, confidence: data.confidence || 0 } };
}

async function productLookup(body: any) {
  const barcode = String(body?.barcode || '').replace(/[\s\-_]/g, '').trim();
  if (!barcode) throw Object.assign(new Error('Barcode parameter is required.'), { status: 400 });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, { headers: { 'User-Agent': 'Manager-Inventory-Scanner/1.0' }, signal: controller.signal });
    if (response.ok) {
      const data: any = await response.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const name = p.product_name || p.product_name_en || p.generic_name || '';
        return { success: true, found: true, source: 'open_food_facts', product: { barcode, productName: name.trim(), product_name: name.trim(), brand: (p.brands || '').split(',')[0].trim(), category: (p.categories || 'Food & Grocery').split(',')[0].trim(), imageUrl: p.image_url || p.image_front_url || '', image_url: p.image_url || p.image_front_url || '', quantity: p.quantity || '', package_size: p.quantity || '', description: p.generic_name || '', mrp: '' } };
      }
    }
  } finally { clearTimeout(timeout); }
  return { success: true, found: false, source: 'none', product: null };
}

async function scan(body: any) {
  const result = await extractForm(body);
  const barcode = String(body?.barcode || '').replace(/[\s\-_]/g, '').trim();
  if (barcode && result.data && !(result.data as any).barcode) (result.data as any).barcode = barcode;
  return result;
}

async function supervise(body: any) {
  const images = getImages(body);
  const prompt = `Merge these scanner inputs into one product record. Never invent missing values. Scanned barcode: ${String(body?.barcode || '')}. Database product: ${JSON.stringify(body?.databaseProduct || null)}. OCR lines: ${JSON.stringify(body?.ocrTextLines || [])}. Return JSON with productName, brand, category, manufacturer, packageSize, unit, barcode, batchNumber, mrp, manufactureDate, expiryDate, bestBefore, bestBeforeMonths, ingredients, confidence, warnings.`;
  const ai = getAI();
  const response = await ai.models.generateContent({ model: modelName(), contents: [{ role: 'user', parts: [{ text: prompt }, ...images.map((i) => ({ inlineData: { mimeType: i.mimeType, data: i.data } }))] }], config: { responseMimeType: 'application/json', temperature: 0.1 } });
  return { success: true, model: modelName(), data: response.text ? JSON.parse(response.text) : {} };
}

async function invoice(body: any) {
  const images = getImages(body);
  if (!images.length) throw Object.assign(new Error('No invoice images provided.'), { status: 400 });
  const prompt = `Extract this invoice or purchase bill into strict JSON. Include invoiceNumber, invoiceDate, supplier, customerName, items array (productName, barcode, quantity, unit, unitPrice, totalPrice, taxRate, discount, mfd, exp, batchNumber), subtotal, taxAmount, discountAmount, grandTotal and warnings. Never invent values.`;
  const ai = getAI();
  const response = await ai.models.generateContent({ model: modelName(), contents: [{ role: 'user', parts: [{ text: prompt }, ...images.map((i) => ({ inlineData: { mimeType: i.mimeType, data: i.data } }))] }], config: { responseMimeType: 'application/json', temperature: 0.1 } });
  return { success: true, model: modelName(), data: response.text ? JSON.parse(response.text) : {} };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const route = Array.isArray(req.query?.route) ? req.query.route.join('/') : String(req.query?.route || '');
  try {
    let result: any;
    switch (route) {
      case 'extract-form': result = await extractForm(req.body || {}); break;
      case 'ocr': result = await ocr(req.body || {}); break;
      case 'product-lookup': result = await productLookup(req.body || {}); break;
      case 'scan': result = await scan(req.body || {}); break;
      case 'supervise-barcode-pipeline': result = await supervise(req.body || {}); break;
      case 'extract-invoice': result = await invoice(req.body || {}); break;
      default: return res.status(404).json({ success: false, error: `API route /api/${route} not found.` });
    }
    return res.status(200).json(result);
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    const code = error?.code || (status === 401 ? 'API_KEY_INVALID' : 'INTERNAL_SERVER_ERROR');
    console.error(`[Vercel API] /api/${route}`, error);
    return res.status(status).json({ success: false, code, error: error?.message || 'Server error' });
  }
}
