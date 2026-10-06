/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================================
 * SCANNER AUDIO & HAPTIC FEEDBACK UTILITIES
 * ============================================================================
 * Generates instant, crisp audio tones using the Web Audio API without external MP3s,
 * plus subtle mobile haptic vibrations for clean physical feedback.
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
 * 1. Gentle Detection Chime: Plays when a product is first acquired & tracked
 */
export function playProductDetectedTone(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.085);
  } catch (err) {
    console.debug('Audio feedback unavailable:', err);
  }
}

/**
 * 2. Crisp Camera Shutter / Capture Beep: Plays when a shot is captured
 */
export function playCameraShutterBeep(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Fast high click + tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, ctx.currentTime); // High A6
    osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.03);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.07);

    gain.gain.setValueAtTime(0.20, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.085);

    triggerScanVibrate();
  } catch (err) {
    console.debug('Audio feedback unavailable:', err);
  }
}

/**
 * 3. Extraction Success Chime: Upbeat major triad when AI/OCR extraction finishes
 */
export function playExtractionSuccessChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [1046.5, 1318.5, 1567.98]; // C6, E6, G6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + idx * 0.07;
      const duration = 0.14;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.14, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);
    });

    triggerScanVibrate();
  } catch (err) {
    console.debug('Audio feedback unavailable:', err);
  }
}

/**
 * Standard scan success beep (retail scanner 1850Hz)
 */
export function playScanSuccessBeep(): void {
  playCameraShutterBeep();
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
    osc.frequency.setValueAtTime(600, ctx.currentTime);

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
      navigator.vibrate([35, 25, 35]);
    }
  } catch {
    // Ignore unsupported vibration errors
  }
}
