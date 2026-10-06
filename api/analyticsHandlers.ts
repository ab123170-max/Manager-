/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// In-memory fallback tracking store for local/dev server or before Supabase tables sync
interface DownloadRecord {
  id: string;
  anonymous_id: string;
  platform: string;
  app_version: string;
  user_agent: string;
  ip_hash: string;
  created_at: string;
}

interface InstallationRecord {
  id: string;
  installation_id: string;
  user_id?: string | null;
  app_version: string;
  platform: string;
  first_seen: string;
  last_seen: string;
  created_at: string;
}

interface UserActivityRecord {
  id: string;
  user_id?: string | null;
  installation_id?: string | null;
  activity_type: string;
  metadata?: any;
  created_at: string;
}

interface AnalyticsEventRecord {
  id: string;
  event_name: string;
  user_id?: string | null;
  installation_id?: string | null;
  app_version?: string | null;
  platform?: string | null;
  metadata?: any;
  created_at: string;
}

const memoryDownloads: DownloadRecord[] = [];
const memoryInstallations = new Map<string, InstallationRecord>(); // installation_id -> Record
const memoryActivities: UserActivityRecord[] = [];
const memoryEvents: AnalyticsEventRecord[] = [];

// Recent download deduplication cache: IP hash + anonId within 15 minutes
const recentDownloadClicks = new Map<string, number>();

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip || "unknown").digest("hex").substring(0, 16);
}

function getClientIp(req: any): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || "127.0.0.1";
}

function getSupabaseServerClient(): SupabaseClient | null {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ""
  ).trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();

  if (url && key && url.startsWith("https://")) {
    try {
      return createClient(url, key, {
        auth: { persistSession: false },
      });
    } catch (e) {
      console.warn("[analytics] Supabase client init error:", e);
    }
  }
  return null;
}

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

// 1. Record Download Click / Download Event
export async function recordDownloadEvent(params: {
  anonymous_id?: string;
  platform?: string;
  app_version?: string;
  user_agent?: string;
  ip?: string;
}) {
  const now = new Date().toISOString();
  const anonId = params.anonymous_id || crypto.randomUUID();
  const ip = params.ip || "127.0.0.1";
  const ipHash = hashIp(ip);
  const dedupeKey = `${ipHash}_${anonId}`;

  // Check 15-minute deduplication window to prevent download spam
  const lastTime = recentDownloadClicks.get(dedupeKey);
  const nowTime = Date.now();
  if (lastTime && nowTime - lastTime < 15 * 60 * 1000) {
    return { success: true, deduped: true, anonymous_id: anonId };
  }
  recentDownloadClicks.set(dedupeKey, nowTime);

  const record: DownloadRecord = {
    id: crypto.randomUUID(),
    anonymous_id: anonId,
    platform: params.platform || "android",
    app_version: params.app_version || "1.0.0",
    user_agent: params.user_agent || "unknown",
    ip_hash: ipHash,
    created_at: now,
  };

  memoryDownloads.push(record);

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("app_downloads").insert([
        {
          id: record.id,
          anonymous_id: record.anonymous_id,
          platform: record.platform,
          app_version: record.app_version,
          user_agent: record.user_agent.substring(0, 500),
          ip_hash: record.ip_hash,
          created_at: record.created_at,
        },
      ]);
    } catch (err) {
      console.warn("[analytics] Supabase app_downloads insert notice:", err);
    }
  }

  return { success: true, anonymous_id: anonId };
}

// 2. Register or Update Native App Installation
export async function handleRegisterInstallation(req: any, res: any) {
  if (req.method === "OPTIONS") return sendJson(res, 200, { ok: true });
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  try {
    const { installation_id, user_id, app_version, platform } = req.body || {};
    if (!installation_id || typeof installation_id !== "string") {
      return sendJson(res, 400, { success: false, error: "installation_id is required" });
    }

    const cleanInstallId = installation_id.trim();
    const cleanUserId = user_id && typeof user_id === "string" ? user_id.trim() : null;
    const now = new Date().toISOString();

    const existing = memoryInstallations.get(cleanInstallId);
    let isFirstInstall = false;

    if (existing) {
      existing.last_seen = now;
      if (cleanUserId) existing.user_id = cleanUserId;
      if (app_version) existing.app_version = app_version;
      memoryInstallations.set(cleanInstallId, existing);
    } else {
      isFirstInstall = true;
      const newRecord: InstallationRecord = {
        id: crypto.randomUUID(),
        installation_id: cleanInstallId,
        user_id: cleanUserId,
        app_version: app_version || "1.0.0",
        platform: platform || "android",
        first_seen: now,
        last_seen: now,
        created_at: now,
      };
      memoryInstallations.set(cleanInstallId, newRecord);
    }

    // Record activity ping
    memoryActivities.push({
      id: crypto.randomUUID(),
      user_id: cleanUserId,
      installation_id: cleanInstallId,
      activity_type: isFirstInstall ? "first_install" : "app_launch",
      metadata: { platform: platform || "android", app_version: app_version || "1.0.0" },
      created_at: now,
    });

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data: existingDb } = await supabase
          .from("app_installations")
          .select("id, installation_id")
          .eq("installation_id", cleanInstallId)
          .maybeSingle();

        if (existingDb) {
          await supabase
            .from("app_installations")
            .update({
              last_seen: now,
              ...(cleanUserId ? { user_id: cleanUserId } : {}),
              ...(app_version ? { app_version } : {}),
            })
            .eq("installation_id", cleanInstallId);
        } else {
          await supabase.from("app_installations").insert([
            {
              installation_id: cleanInstallId,
              user_id: cleanUserId,
              app_version: app_version || "1.0.0",
              platform: platform || "android",
              first_seen: now,
              last_seen: now,
              created_at: now,
            },
          ]);
        }

        // Also record user activity
        await supabase.from("user_activity").insert([
          {
            user_id: cleanUserId,
            installation_id: cleanInstallId,
            activity_type: isFirstInstall ? "first_install" : "app_launch",
            metadata: { platform: platform || "android", app_version: app_version || "1.0.0" },
            created_at: now,
          },
        ]);
      } catch (err) {
        console.warn("[analytics] Supabase installation sync notice:", err);
      }
    }

    return sendJson(res, 200, {
      success: true,
      isFirstInstall,
      installation_id: cleanInstallId,
    });
  } catch (error: any) {
    console.error("[analytics] handleRegisterInstallation error:", error);
    return sendJson(res, 500, { success: false, error: error?.message || "Internal error" });
  }
}

// 3. Track User Activity / Events
export async function handleTrackEvent(req: any, res: any) {
  if (req.method === "OPTIONS") return sendJson(res, 200, { ok: true });
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  try {
    const { event_name, user_id, installation_id, app_version, platform, metadata } = req.body || {};
    if (!event_name || typeof event_name !== "string") {
      return sendJson(res, 400, { success: false, error: "event_name is required" });
    }

    const now = new Date().toISOString();
    const cleanUserId = user_id && typeof user_id === "string" ? user_id.trim() : null;
    const cleanInstallId = installation_id && typeof installation_id === "string" ? installation_id.trim() : null;

    memoryEvents.push({
      id: crypto.randomUUID(),
      event_name,
      user_id: cleanUserId,
      installation_id: cleanInstallId,
      app_version: app_version || "1.0.0",
      platform: platform || "web",
      metadata: metadata || {},
      created_at: now,
    });

    // If there is an installation ID, update last_seen
    if (cleanInstallId && memoryInstallations.has(cleanInstallId)) {
      const inst = memoryInstallations.get(cleanInstallId)!;
      inst.last_seen = now;
      if (cleanUserId) inst.user_id = cleanUserId;
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        await supabase.from("analytics_events").insert([
          {
            event_name,
            user_id: cleanUserId,
            installation_id: cleanInstallId,
            app_version: app_version || "1.0.0",
            platform: platform || "web",
            metadata: metadata || {},
            created_at: now,
          },
        ]);

        if (cleanInstallId) {
          await supabase
            .from("app_installations")
            .update({
              last_seen: now,
              ...(cleanUserId ? { user_id: cleanUserId } : {}),
            })
            .eq("installation_id", cleanInstallId);
        }
      } catch (err) {
        console.warn("[analytics] Supabase event insert notice:", err);
      }
    }

    return sendJson(res, 200, { success: true });
  } catch (error: any) {
    console.error("[analytics] handleTrackEvent error:", error);
    return sendJson(res, 500, { success: false, error: error?.message || "Internal error" });
  }
}

// 4. Compute Real Statistics for Landing Page
let cachedStats: any = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 20_000; // 20-second short cache for high performance

export async function handleGetStats(req: any, res: any) {
  if (req.method === "OPTIONS") return sendJson(res, 200, { ok: true });
  if (req.method !== "GET" && req.method !== "HEAD") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const now = Date.now();
  if (cachedStats && now - lastCacheTime < CACHE_TTL_MS) {
    return sendJson(res, 200, cachedStats);
  }

  try {
    let downloadsCount = memoryDownloads.length;
    let installsCount = memoryInstallations.size;
    let productsScannedCount = memoryEvents.filter((e) => e.event_name === "product_scanned").length;
    let productsAddedCount = memoryEvents.filter((e) => e.event_name === "product_saved").length;
    let registeredUsersCount = 0;

    // Calculate 30-day active users (MAU)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const activeInstallIds = new Set<string>();
    const activeUserIds = new Set<string>();

    for (const inst of memoryInstallations.values()) {
      if (inst.last_seen >= thirtyDaysAgo) {
        activeInstallIds.add(inst.installation_id);
        if (inst.user_id) activeUserIds.add(inst.user_id);
      }
    }

    for (const act of memoryActivities) {
      if (act.created_at >= thirtyDaysAgo) {
        if (act.user_id) activeUserIds.add(act.user_id);
        if (act.installation_id) activeInstallIds.add(act.installation_id);
      }
    }

    let activeUsersCount = activeUserIds.size + activeInstallIds.size;
    if (activeUsersCount === 0 && (downloadsCount > 0 || installsCount > 0)) {
      activeUsersCount = Math.max(installsCount, 1);
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        // Query app_downloads count
        const { count: dbDownloads, error: e1 } = await supabase
          .from("app_downloads")
          .select("*", { count: "exact", head: true });
        if (!e1 && typeof dbDownloads === "number") {
          downloadsCount = Math.max(downloadsCount, dbDownloads);
        }

        // Query app_installations count
        const { count: dbInstalls, error: e2 } = await supabase
          .from("app_installations")
          .select("*", { count: "exact", head: true });
        if (!e2 && typeof dbInstalls === "number") {
          installsCount = Math.max(installsCount, dbInstalls);
        }

        // Query 30-day active installations
        const { count: dbActiveInstalls, error: e3 } = await supabase
          .from("app_installations")
          .select("*", { count: "exact", head: true })
          .gte("last_seen", thirtyDaysAgo);
        if (!e3 && typeof dbActiveInstalls === "number") {
          activeUsersCount = Math.max(activeUsersCount, dbActiveInstalls);
        }

        // Query registered users count from profiles
        const { count: dbProfiles, error: e4 } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });
        if (!e4 && typeof dbProfiles === "number") {
          registeredUsersCount = dbProfiles;
        }

        // Query products count
        const { count: dbProducts, error: e5 } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true });
        if (!e5 && typeof dbProducts === "number") {
          productsAddedCount = Math.max(productsAddedCount, dbProducts);
        }

        // Query product_scanned events
        const { count: dbScans, error: e6 } = await supabase
          .from("analytics_events")
          .select("*", { count: "exact", head: true })
          .eq("event_name", "product_scanned");
        if (!e6 && typeof dbScans === "number") {
          productsScannedCount = Math.max(productsScannedCount, dbScans);
        }
      } catch (err) {
        console.warn("[analytics] Supabase stats aggregation notice:", err);
      }
    }

    // Active users is at least the number of registered users or active installs
    if (registeredUsersCount > 0 && activeUsersCount < registeredUsersCount) {
      activeUsersCount = registeredUsersCount;
    }

    const stats = {
      downloads: downloadsCount,
      installs: installsCount,
      activeUsers: activeUsersCount,
      registeredUsers: registeredUsersCount,
      productsScanned: productsScannedCount,
      productsAdded: productsAddedCount,
      period: "30_days",
      timestamp: new Date().toISOString(),
    };

    cachedStats = stats;
    lastCacheTime = now;

    return sendJson(res, 200, stats);
  } catch (error: any) {
    console.error("[analytics] handleGetStats error:", error);
    return sendJson(res, 500, {
      downloads: 0,
      installs: 0,
      activeUsers: 0,
      registeredUsers: 0,
      productsScanned: 0,
      productsAdded: 0,
      error: error?.message || "Failed to calculate statistics",
    });
  }
}
