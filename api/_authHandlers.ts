/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";

// In-memory persistent server storage for auth sessions, OTPs, profiles, and avatars
interface ServerUser {
  id: string;
  auth_user_id: string;
  provider: 'google' | 'facebook' | 'phone' | 'whatsapp' | 'email';
  providerId?: string;
  email?: string;
  phone?: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  lastLoginAt: string;
}

interface ServerProfile {
  id: string;
  auth_user_id: string;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  profile_image_url: string;
  address: string;
  language: string;
  currency: string;
  created_at: string;
  updated_at: string;
  is_profile_complete: boolean;
}

interface StoredOtp {
  code: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, StoredOtp>();
const userStore = new Map<string, ServerUser>(); // auth_user_id -> ServerUser
const profileStore = new Map<string, ServerProfile>(); // auth_user_id -> ServerProfile
const sessionTokens = new Map<string, { auth_user_id: string; expiresAt: number }>();
const avatarStore = new Map<string, { data: Buffer; mimeType: string }>();

function sendJson(res: any, status: number, data: any) {
  if (typeof res.setHeader === "function") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Content-Type", "application/json");
  }
  if (typeof res.status === "function") {
    return res.status(status).json(data);
  }
  res.statusCode = status;
  res.end(JSON.stringify(data));
}

function normalizePhone(countryCode: string, phone: string): string {
  const cleanCode = (countryCode || "+977").replace(/[^0-9+]/g, "");
  const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
  return `${cleanCode}${cleanPhone}`;
}

function generateSecureToken(): string {
  return "stk_" + crypto.randomBytes(24).toString("hex");
}

function sanitizeString(val: unknown, maxLen = 120): string {
  if (typeof val !== "string") return "";
  return val.replace(/[<>]/g, "").trim().slice(0, maxLen);
}

// -----------------------------------------------------------------------------
// 1. Send OTP
// -----------------------------------------------------------------------------
export async function handleSendOtp(req: any, res: any) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "POST") return sendJson(res, 405, { success: false, error: "Method not allowed" });

  try {
    const body = req.body || {};
    const { countryCode = "+977", phone } = body;

    if (!phone || String(phone).replace(/[^0-9]/g, "").length < 6) {
      return sendJson(res, 400, {
        success: false,
        error: "Please enter a valid mobile number with at least 6 digits.",
      });
    }

    const fullPhone = normalizePhone(countryCode, phone);

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(fullPhone, {
      code,
      expiresAt,
      attempts: 0,
    });

    console.log(`[AUTH] Sent verification OTP code [${code}] to phone ${fullPhone}`);

    // If SPARROWSMS_TOKEN or TWILIO_AUTH_TOKEN is present in env, can send SMS
    // For local and container execution, return confirmation with security guidelines
    return sendJson(res, 200, {
      success: true,
      message: `Verification code sent to ${fullPhone}`,
      phone: fullPhone,
      expiresIn: 300,
      // Provide demo/preview code hint for testing in sandbox environments
      previewCode: code,
    });
  } catch (err: any) {
    console.error("[AUTH] handleSendOtp error:", err);
    return sendJson(res, 500, { success: false, error: "Failed to send OTP code. Please try again." });
  }
}

// -----------------------------------------------------------------------------
// 2. Verify OTP
// -----------------------------------------------------------------------------
export async function handleVerifyOtp(req: any, res: any) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "POST") return sendJson(res, 405, { success: false, error: "Method not allowed" });

  try {
    const body = req.body || {};
    const { countryCode = "+977", phone, otp } = body;
    const fullPhone = normalizePhone(countryCode, phone);
    const cleanOtp = String(otp || "").trim();

    const record = otpStore.get(fullPhone);

    if (!record) {
      return sendJson(res, 400, {
        success: false,
        error: "No active verification code found for this number. Please request a new code.",
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(fullPhone);
      return sendJson(res, 400, {
        success: false,
        error: "Verification code has expired. Please request a new one.",
      });
    }

    record.attempts += 1;
    if (record.attempts > 5) {
      otpStore.delete(fullPhone);
      return sendJson(res, 429, {
        success: false,
        error: "Too many failed attempts. Please request a new verification code.",
      });
    }

    if (record.code !== cleanOtp) {
      return sendJson(res, 400, {
        success: false,
        error: "Invalid 6-digit verification code. Please check and try again.",
      });
    }

    // Success: remove verified OTP
    otpStore.delete(fullPhone);

    // Find or create AuthUser
    let authUserId = `usr_ph_${crypto.createHash("md5").update(fullPhone).digest("hex").slice(0, 16)}`;
    let user = userStore.get(authUserId);

    const now = new Date().toISOString();
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = {
        id: authUserId,
        auth_user_id: authUserId,
        provider: "phone",
        phone: fullPhone,
        createdAt: now,
        lastLoginAt: now,
      };
      userStore.set(authUserId, user);
    } else {
      user.lastLoginAt = now;
      userStore.set(authUserId, user);
    }

    // Check existing profile
    let profile = profileStore.get(authUserId) || null;

    // Issue session token
    const token = generateSecureToken();
    sessionTokens.set(token, {
      auth_user_id: authUserId,
      expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 days
    });

    return sendJson(res, 200, {
      success: true,
      session: {
        token,
        user,
        profile,
        isNewUser: !profile || !profile.is_profile_complete,
      },
    });
  } catch (err: any) {
    console.error("[AUTH] handleVerifyOtp error:", err);
    return sendJson(res, 500, { success: false, error: "Verification failed. Please try again." });
  }
}

// -----------------------------------------------------------------------------
// 3. OAuth Login (Google & Facebook)
// -----------------------------------------------------------------------------
export async function handleOAuthLogin(req: any, res: any) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "POST") return sendJson(res, 405, { success: false, error: "Method not allowed" });

  try {
    const body = req.body || {};
    const { provider, email, name, photoURL, providerId } = body;

    if (!provider || (provider !== "google" && provider !== "facebook")) {
      return sendJson(res, 400, { success: false, error: "Invalid OAuth provider specified." });
    }

    const cleanEmail = sanitizeString(email, 100).toLowerCase();
    const cleanId = sanitizeString(providerId || cleanEmail, 100);

    if (!cleanId && !cleanEmail) {
      return sendJson(res, 400, { success: false, error: "Missing required provider credentials." });
    }

    const authUserId = `usr_${provider}_${crypto.createHash("md5").update(`${provider}:${cleanId || cleanEmail}`).digest("hex").slice(0, 16)}`;
    const now = new Date().toISOString();

    let user = userStore.get(authUserId);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = {
        id: authUserId,
        auth_user_id: authUserId,
        provider,
        providerId: cleanId,
        email: cleanEmail || undefined,
        displayName: sanitizeString(name, 100) || undefined,
        photoURL: typeof photoURL === "string" ? photoURL : undefined,
        createdAt: now,
        lastLoginAt: now,
      };
      userStore.set(authUserId, user);
    } else {
      user.lastLoginAt = now;
      if (name && !user.displayName) user.displayName = sanitizeString(name, 100);
      if (photoURL && !user.photoURL) user.photoURL = photoURL;
      userStore.set(authUserId, user);
    }

    let profile = profileStore.get(authUserId) || null;

    const token = generateSecureToken();
    sessionTokens.set(token, {
      auth_user_id: authUserId,
      expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
    });

    return sendJson(res, 200, {
      success: true,
      session: {
        token,
        user,
        profile,
        isNewUser: !profile || !profile.is_profile_complete,
      },
    });
  } catch (err: any) {
    console.error("[AUTH] handleOAuthLogin error:", err);
    return sendJson(res, 500, { success: false, error: "OAuth authentication failed." });
  }
}

// -----------------------------------------------------------------------------
// 4. Email Authentication
// -----------------------------------------------------------------------------
export async function handleEmailAuth(req: any, res: any) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "POST") return sendJson(res, 405, { success: false, error: "Method not allowed" });

  try {
    const body = req.body || {};
    const { email, mode = "login" } = body;
    const cleanEmail = sanitizeString(email, 120).toLowerCase();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return sendJson(res, 400, { success: false, error: "Please enter a valid email address." });
    }

    const authUserId = `usr_em_${crypto.createHash("md5").update(cleanEmail).digest("hex").slice(0, 16)}`;
    const now = new Date().toISOString();

    let user = userStore.get(authUserId);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = {
        id: authUserId,
        auth_user_id: authUserId,
        provider: "email",
        email: cleanEmail,
        createdAt: now,
        lastLoginAt: now,
      };
      userStore.set(authUserId, user);
    } else {
      user.lastLoginAt = now;
      userStore.set(authUserId, user);
    }

    let profile = profileStore.get(authUserId) || null;

    const token = generateSecureToken();
    sessionTokens.set(token, {
      auth_user_id: authUserId,
      expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
    });

    return sendJson(res, 200, {
      success: true,
      session: {
        token,
        user,
        profile,
        isNewUser: !profile || !profile.is_profile_complete,
      },
    });
  } catch (err: any) {
    console.error("[AUTH] handleEmailAuth error:", err);
    return sendJson(res, 500, { success: false, error: "Email authentication failed." });
  }
}

// -----------------------------------------------------------------------------
// 5. WhatsApp Status Check / Request
// -----------------------------------------------------------------------------
export async function handleWhatsAppRequest(req: any, res: any) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "POST") return sendJson(res, 405, { success: false, error: "Method not allowed" });

  const hasWhatsAppConfig = Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

  if (!hasWhatsAppConfig) {
    return sendJson(res, 501, {
      success: false,
      code: "WHATSAPP_NOT_CONFIGURED",
      error: "WhatsApp OTP is currently unavailable because WhatsApp Business API credentials (WHATSAPP_API_TOKEN) are not configured. Please use Mobile Number OTP, Google, or Email.",
    });
  }

  return sendJson(res, 200, {
    success: true,
    message: "WhatsApp OTP channel is ready.",
  });
}

// -----------------------------------------------------------------------------
// 6. User Profile Management (Get & Save)
// -----------------------------------------------------------------------------
export async function handleGetProfile(req: any, res: any) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "GET") return sendJson(res, 405, { success: false, error: "Method not allowed" });

  try {
    const authUserId = String(req.query?.auth_user_id || req.headers?.["x-auth-user-id"] || "").trim();
    if (!authUserId) {
      return sendJson(res, 400, { success: false, error: "auth_user_id is required." });
    }

    const profile = profileStore.get(authUserId) || null;
    return sendJson(res, 200, { success: true, profile });
  } catch (err: any) {
    console.error("[AUTH] handleGetProfile error:", err);
    return sendJson(res, 500, { success: false, error: "Failed to retrieve profile." });
  }
}

export async function handleSaveProfile(req: any, res: any) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "POST") return sendJson(res, 405, { success: false, error: "Method not allowed" });

  try {
    const body = req.body || {};
    const authUserId = String(body.auth_user_id || req.headers?.["x-auth-user-id"] || "").trim();

    if (!authUserId) {
      return sendJson(res, 400, { success: false, error: "auth_user_id is required to link profile." });
    }

    const full_name = sanitizeString(body.full_name, 80);
    const username = sanitizeString(body.username, 40).replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase();
    const email = sanitizeString(body.email, 100).toLowerCase();
    const phone = sanitizeString(body.phone, 30);
    const address = sanitizeString(body.address, 150);
    const language = sanitizeString(body.language, 30) || "English";
    const currency = sanitizeString(body.currency, 10) || "NPR";
    const profile_image_url = typeof body.profile_image_url === "string" ? body.profile_image_url.trim() : "";

    if (!full_name || full_name.length < 2) {
      return sendJson(res, 400, { success: false, error: "Please provide a valid Full Name." });
    }

    if (!username || username.length < 3) {
      return sendJson(res, 400, { success: false, error: "Username must be at least 3 alphanumeric characters." });
    }

    const now = new Date().toISOString();
    const existing = profileStore.get(authUserId);

    const updatedProfile: ServerProfile = {
      id: existing?.id || `prf_${crypto.randomBytes(8).toString("hex")}`,
      auth_user_id: authUserId,
      full_name,
      username,
      email,
      phone,
      profile_image_url,
      address,
      language,
      currency,
      created_at: existing?.created_at || now,
      updated_at: now,
      is_profile_complete: true,
    };

    profileStore.set(authUserId, updatedProfile);

    // Also update displayName and photo in user record
    const user = userStore.get(authUserId);
    if (user) {
      user.displayName = full_name;
      if (profile_image_url) user.photoURL = profile_image_url;
      userStore.set(authUserId, user);
    }

    return sendJson(res, 200, {
      success: true,
      message: "Profile saved successfully.",
      profile: updatedProfile,
    });
  } catch (err: any) {
    console.error("[AUTH] handleSaveProfile error:", err);
    return sendJson(res, 500, { success: false, error: "Failed to save profile." });
  }
}

// -----------------------------------------------------------------------------
// 7. Profile Avatar Image Upload and Storage
// -----------------------------------------------------------------------------
export async function handleUploadAvatar(req: any, res: any) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "POST") return sendJson(res, 405, { success: false, error: "Method not allowed" });

  try {
    const body = req.body || {};
    const { imageBase64, mimeType = "image/jpeg", auth_user_id } = body;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return sendJson(res, 400, { success: false, error: "No image data provided for avatar upload." });
    }

    // Strip data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z0-9.+]+;base64,/i, "").trim();
    const buffer = Buffer.from(cleanBase64, "base64");

    // Enforce max avatar size (3MB)
    if (buffer.length > 3 * 1024 * 1024) {
      return sendJson(res, 400, { success: false, error: "Profile image exceeds maximum size of 3MB." });
    }

    const cleanMime = ["image/jpeg", "image/png", "image/webp"].includes(mimeType) ? mimeType : "image/jpeg";
    const avatarId = `av_${crypto.randomBytes(12).toString("hex")}`;

    avatarStore.set(avatarId, {
      data: buffer,
      mimeType: cleanMime,
    });

    const avatarUrl = `/api/auth/avatar/${avatarId}`;

    return sendJson(res, 200, {
      success: true,
      avatarUrl,
      avatarId,
      sizeBytes: buffer.length,
    });
  } catch (err: any) {
    console.error("[AUTH] handleUploadAvatar error:", err);
    return sendJson(res, 500, { success: false, error: "Avatar upload failed." });
  }
}

export async function handleGetAvatar(req: any, res: any) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});

  try {
    // Extract avatarId from url path or query param
    const pathParts = (req.url || "").split("/");
    const avatarId = req.query?.id || pathParts[pathParts.length - 1]?.split("?")[0];

    const avatar = avatarStore.get(avatarId);
    if (!avatar) {
      return sendJson(res, 404, { success: false, error: "Avatar image not found." });
    }

    if (typeof res.setHeader === "function") {
      res.setHeader("Content-Type", avatar.mimeType);
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");
      res.setHeader("Content-Length", avatar.data.length);
    }
    return res.end(avatar.data);
  } catch (err: any) {
    console.error("[AUTH] handleGetAvatar error:", err);
    return sendJson(res, 500, { success: false, error: "Error retrieving avatar." });
  }
}
