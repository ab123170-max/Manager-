import { Capacitor, registerPlugin } from '@capacitor/core';

type NativeDevicePlugin = {
  requestPermissions?: () => Promise<{ camera?: string; notifications?: string; microphone?: string }>;
  speak?: (options: { text: string; language?: string; rate?: number }) => Promise<void>;
  vibrate?: (options?: { duration?: number }) => Promise<void>;
};

const NativeDevice = registerPlugin<NativeDevicePlugin>('NativeDevice');

export async function requestNativeCameraPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const result = await NativeDevice.requestCamera?.();
    return result?.camera === 'granted';
  } catch (error) {
    console.warn('[NativeDevice] camera permission request failed:', error);
    return false;
  }
}

export async function initializeNativeDevice(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // Native implementations can request feature-specific permissions when available.
  // Do not request microphone permission automatically: Manager only needs it for
  // an actual recording feature.
  try {
    await NativeDevice.requestPermissions?.();
  } catch (error) {
    console.warn('[NativeDevice] permission request skipped:', error);
  }
}

export async function speakNative(text: string, language?: string): Promise<boolean> {
  if (!text?.trim() || !Capacitor.isNativePlatform()) return false;
  try {
    if (!NativeDevice.speak) return false;
    await NativeDevice.speak({ text, language });
    return true;
  } catch (error) {
    console.warn('[NativeDevice] speech failed:', error);
    return false;
  }
}

export async function vibrateNative(duration = 120): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    if (!NativeDevice.vibrate) return false;
    await NativeDevice.vibrate({ duration });
    return true;
  } catch (error) {
    console.warn('[NativeDevice] vibration failed:', error);
    return false;
  }
}
