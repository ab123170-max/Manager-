/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { recordDownloadEvent } from "./_analyticsHandlers";

const APK_URL =
  'https://github.com/ab123170-max/Manager-/releases/latest/download/app-debug.apk';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).setHeader('Allow', 'GET, HEAD').send('Method Not Allowed');
  }

  // 1. Record the real download event
  try {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress;
    const anonId = req.query?.anon_id || req.headers['x-anonymous-id'];

    await recordDownloadEvent({
      anonymous_id: typeof anonId === 'string' ? anonId : undefined,
      platform: 'android',
      app_version: '1.0.0',
      user_agent: req.headers['user-agent'],
      ip,
    });
  } catch (err) {
    console.warn('[download-apk] Download event tracking notice:', err);
  }

  // 2. Stream upstream APK
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
