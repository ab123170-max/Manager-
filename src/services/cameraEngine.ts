import { Capacitor } from '@capacitor/core';

export type CameraFacingMode = 'environment' | 'user';

export interface CameraStreamOptions {
  facingMode?: CameraFacingMode;
}

export function stopCameraStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try { track.stop(); } catch {}
  }
}

export function cameraErrorMessage(error: unknown): string {
  const e = error as { name?: string; message?: string };
  const name = e?.name || '';
  const message = (e?.message || '').toLowerCase();

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || message.includes('permission') || message.includes('denied')) {
    return Capacitor.isNativePlatform()
      ? 'Camera permission is required. Tap Allow when Android asks for camera access, then tap Retry Camera.'
      : 'Camera permission is blocked. Allow camera access for ScanMe AI in your browser/site settings, then tap Retry Camera.';
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera was found on this device.';
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is busy or unavailable. Close another camera app and try again.';
  }

  if (name === 'SecurityError') {
    return 'Camera access is blocked by the current app/browser security settings.';
  }

  return e?.message || 'Unable to start the device camera.';
}

/**
 * Single camera entry point for the whole app.
 * Native Android uses the Capacitor WebView permission bridge in MainActivity;
 * the actual preview remains an in-app HTML video stream.
 */
export async function requestCameraStream(options: CameraStreamOptions = {}): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new DOMException('Camera API is unavailable.', 'NotSupportedError');
  }

  const facingMode = options.facingMode || 'environment';

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
      },
      audio: false,
    });
  } catch (firstError: any) {
    // Some devices reject the preferred constraints. Retry with the simplest
    // possible request before reporting a real camera failure.
    if (
      firstError?.name === 'OverconstrainedError' ||
      firstError?.name === 'ConstraintNotSatisfiedError'
    ) {
      return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
    throw firstError;
  }
}
