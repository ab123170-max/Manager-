import type { VercelRequest, VercelResponse } from '@vercel/node';

const APK_URL =
  'https://github.com/ab123170-max/Manager-/releases/latest/download/app-debug.apk';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).setHeader('Allow', 'GET, HEAD').send('Method Not Allowed');
  }

  try {
    const upstream = await fetch(APK_URL, {
      method: req.method,
      redirect: 'follow',
      headers: { Accept: 'application/vnd.android.package-archive' },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send('APK is temporarily unavailable.');
    }

    const contentType =
      upstream.headers.get('content-type') ||
      'application/vnd.android.package-archive';
    const contentLength = upstream.headers.get('content-length');

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="ScanMe-AI.apk"',
    );
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    if (req.method === 'HEAD') return res.status(200).end();

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.status(200).send(buffer);
  } catch {
    return res.status(502).send('Unable to download the APK right now.');
  }
}
