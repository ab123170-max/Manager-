/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  handleSendOtp,
  handleVerifyOtp,
  handleOAuthLogin,
  handleEmailAuth,
  handleWhatsAppRequest,
  handleGetProfile,
  handleSaveProfile,
  handleUploadAvatar,
  handleGetAvatar,
} from "./authHandlers";

export default async function handler(req: any, res: any) {
  const url = req.url || "";
  if (url.includes("/send-otp")) return handleSendOtp(req, res);
  if (url.includes("/verify-otp")) return handleVerifyOtp(req, res);
  if (url.includes("/oauth-login")) return handleOAuthLogin(req, res);
  if (url.includes("/email-login")) return handleEmailAuth(req, res);
  if (url.includes("/whatsapp-status")) return handleWhatsAppRequest(req, res);
  if (url.includes("/profile")) {
    if (req.method === "GET") return handleGetProfile(req, res);
    return handleSaveProfile(req, res);
  }
  if (url.includes("/upload-avatar")) return handleUploadAvatar(req, res);
  if (url.includes("/avatar")) return handleGetAvatar(req, res);

  res.statusCode = 404;
  res.end(JSON.stringify({ error: "Auth endpoint not found" }));
}
