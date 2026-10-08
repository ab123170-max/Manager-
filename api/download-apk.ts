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
    // Do NOT proxy the APK through Vercel. The APK can be large, and buffering
    // the entire GitHub asset inside a serverless function can cause slow/stuck
    // downloads, memory pressure, or platform response-limit failures.
    //
    // Redirect the browser directly to GitHub's latest release asset instead.
    // GitHub then handles the actual binary transfer.
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Location', APK_URL);

    // 302 works for normal browser navigation and preserves the download flow.
    // HEAD is also redirected so availability checks follow the same path.
    return res.status(302).end();
  } catch {
    return res.status(502).send('Unable to download the APK right now.');
  }
}
