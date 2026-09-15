/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================================
 * SCANNER AUDIO & HAPTIC FEEDBACK UTILITIES
 * ============================================================================
 * Generates an instant high-frequency audio beep using the browser's Web Audio API
 * without relying on external MP3 assets, and triggers subtle haptic vibration
 * for crisp physical feedback upon barcode / QR detection.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a clean, professional retail scanner beep (1850Hz sine tone for 75ms).
 */
export function playScanSuccessBeep(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1850, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.085);
  } catch (err) {
    // Audio may be blocked before first user interaction
    console.debug('Audio feedback unavailable:', err);
  }
}

/**
 * Plays a slightly lower double-tone for already existing / duplicate items.
 */
export function playScanDuplicateTone(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.13);
  } catch (err) {
    console.debug('Audio feedback unavailable:', err);
  }
}

/**
 * Triggers short mobile device haptic vibration if supported by the browser.
 */
export function triggerScanVibrate(): void {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      navigator.vibrate([40, 30, 40]);
    }
  } catch {
    // Ignore unsupported vibration errors
  }
}
