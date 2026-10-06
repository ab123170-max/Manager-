/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  handleRegisterInstallation,
  handleTrackEvent,
  recordDownloadEvent,
} from "./analyticsHandlers";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).json({ ok: true });
  }

  const action = Array.isArray(req.query?.action)
    ? req.query.action[0]
    : String(req.query?.action || req.body?.action || "");

  if (action === "install" || req.url?.includes("/install")) {
    return handleRegisterInstallation(req, res);
  }

  if (action === "download" || req.url?.includes("/download")) {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket?.remoteAddress;
    const result = await recordDownloadEvent({
      anonymous_id: req.body?.anonymous_id,
      platform: req.body?.platform,
      app_version: req.body?.app_version,
      user_agent: req.headers["user-agent"],
      ip,
    });
    return res.status(200).json(result);
  }

  return handleTrackEvent(req, res);
}
