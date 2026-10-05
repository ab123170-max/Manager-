import { Capacitor } from '@capacitor/core';
import { CameraPreview } from '@capgo/camera-preview';

export type CameraFacingMode = 'environment' | 'user';

export const isNativeCamera = () => Capacitor.isNativePlatform();

export function stopCameraStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  stream.getTracks().forEach(track => { try { track.stop(); } catch {} });
}

export function cameraErrorMessage(error: unknown): string {
  const e = error as { name?: string; message?: string };
  const message = (e?.message || '').toLowerCase();
  if (e?.name === 'NotAllowedError' || message.includes('permission') || message.includes('denied')) {
    return Capacitor.isNativePlatform()
      ? 'Camera permission is required. Please allow camera access and tap Retry Camera.'
      : 'Camera permission is blocked. Allow camera access in browser settings and tap Retry Camera.';
  }
  if (e?.name === 'NotFoundError') return 'No camera was found on this device.';
  if (e?.name === 'NotReadableError') return 'The camera is busy or unavailable.';
  return e?.message || 'Unable to start the device camera.';
}

export async function requestCameraStream(options: { facingMode?: CameraFacingMode } = {}): Promise<MediaStream> {
  if (Capacitor.isNativePlatform()) throw new Error('Native CameraPreview is required on Android.');
  if (!navigator.mediaDevices?.getUserMedia) throw new DOMException('Camera API is unavailable.', 'NotSupportedError');
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: options.facingMode || 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
}

export async function startNativeCamera(parent: string, facingMode: CameraFacingMode) {
  await CameraPreview.requestPermissions({ disableAudio: true });
  await CameraPreview.start({
    parent,
    position: facingMode === 'environment' ? 'rear' : 'front',
    toBack: true,
    aspectRatio: 'fill',
    disableAudio: true,
  });
}

export async function stopNativeCamera() {
  try { await CameraPreview.stop({ force: true }); } catch {}
}

export async function captureNativeSample(): Promise<string> {
  const result = await CameraPreview.captureSample({ quality: 82 });
  return result.value.startsWith('data:') ? result.value : 'data:image/jpeg;base64,' + result.value;
}

export async function setNativeTorch(enabled: boolean) {
  await CameraPreview.setFlashMode({ flashMode: enabled ? 'torch' : 'off' });
}

export async function flipNativeCamera() {
  await CameraPreview.flip();
}
