import { GoogleGenAI, Type } from '@google/genai';

function modelName() {
  const value = (process.env.GEMINI_MODEL || 'gemini-3.7-flash').trim().replace(/^models\//, '');
  return /^gemini-[a-z0-9.\-]+$/i.test(value) ? value : 'gemini-3.7-flash';
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
    isProductOrPackage: { type: Type.BOOLEAN },
    productName: { type: Type.STRING },
    brand: { type: Type.STRING },
    category: { type: Type.STRING },
    sku: { type: Type.STRING },
    barcode: { type: Type.STRING },
    batchNumber: { type: Type.STRING },
    manufacturingDate: { type: Type.STRING },
    packedDate: { type: Type.STRING },
    expiryDate: { type: Type.STRING },
    bestBefore: { type: Type.STRING },
    bestBeforeMonths: { type: Type.NUMBER },
    quantity: { type: Type.STRING },
    unit: { type: Type.STRING },
    mrp: { type: Type.STRING },
    documentType: { type: Type.STRING },
    notesOrAdditional: { type: Type.STRING },
    confidenceScore: { type: Type.NUMBER },
    confidence: { type: Type.OBJECT },
    warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
    missingFields: { type: Type.ARRAY, items: { type: Type.STRING } },
    customFields: { type: Type.ARRAY, items: { type: Type.OBJECT } },
  },
  required: ['productName', 'brand', 'category', 'sku', 'barcode', 'batchNumber', 'manufacturingDate', 'expiryDate', 'bestBefore', 'quantity', 'unit', 'mrp', 'confidence', 'warnings', 'missingFields'],
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

  const prompt = `You are a strict product-label mapping and OCR engine. Analyze ${images.length} image(s) of the same product.
Extract only information actually visible in the images or supplied OCR cues. Never invent values.
Map abbreviations accurately: MFD/MFG/MANF/DOM -> manufacturingDate; PKD/PKG -> packedDate; EXP/EXD/EXPIRY/USE BY -> expiryDate; BB/BBD/BBE/BEST BEFORE -> bestBefore.
If best before is a duration such as 12 MONTHS FROM MFD, put the phrase in bestBefore and the number in bestBeforeMonths. Do not convert a duration into an expiry date unless explicitly shown.
Preserve date digits as seen. If a field is absent, return an empty string and include it in missingFields.
OCR cues: ${cueText}`;

  const ai = getAI();
  const parts: any[] = images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } }));
  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: modelName(),
    contents: [{ role: 'user', parts }],
    config: { responseMimeType: 'application/json', responseSchema: productSchema, temperature: 0.1 },
  });
  if (!response.text) throw Object.assign(new Error('Gemini returned an empty response.'), { status: 502, code: 'MALFORMED_RESPONSE' });
  return { success: true, model: modelName(), photosAnalyzedCount: images.length, data: JSON.parse(response.text) };
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
  if (barcode && result.data && !result.data.barcode) result.data.barcode = barcode;
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
