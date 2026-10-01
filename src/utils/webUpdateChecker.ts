import { Capacitor } from '@capacitor/core';

const CHECK_INTERVAL_MS = 60_000;
let checking = false;

function currentEntryScript(): string | null {
  const script = Array.from(document.scripts).find(
    (item) => item.type === 'module' && item.src.includes('/assets/')
  );
  return script?.src || null;
}

async function checkForNewDeployment(): Promise<void> {
  if (checking || Capacitor.isNativePlatform() || !navigator.onLine) return;
  checking = true;

  try {
    const response = await fetch(`/index.html?update-check=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!response.ok) return;

    const html = await response.text();
    const match = html.match(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/i);
    const latestScript = match?.[1] || null;
    const currentScript = currentEntryScript();

    if (!latestScript || !currentScript) return;

    const latestUrl = new URL(latestScript, window.location.origin).href;

    if (latestUrl !== currentScript) {
      window.location.reload();
    }
  } catch {
    // Update checks are best-effort and must never block app usage.
  } finally {
    checking = false;
  }
}

export function startWebUpdateChecker(): () => void {
  if (Capacitor.isNativePlatform()) return () => {};

  const check = () => {
    void checkForNewDeployment();
  };

  const intervalId = window.setInterval(check, CHECK_INTERVAL_MS);
  window.addEventListener('focus', check);
  window.addEventListener('online', check);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });

  // Check shortly after startup so a newly deployed version is picked up quickly.
  window.setTimeout(check, 3000);

  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener('focus', check);
    window.removeEventListener('online', check);
  };
}
