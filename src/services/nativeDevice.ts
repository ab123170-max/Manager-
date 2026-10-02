import { Capacitor, registerPlugin } from '@capacitor/core';
import { Camera } from '@capacitor/camera';

type NativeDevicePlugin = {
  requestPermissions?: () => Promise<{ camera?: string; notifications?: string; microphone?: string }>;
  speak?: (options: { text: string; language?: string; rate?: number }) => Promise<void>;
  vibrate?: (options?: { duration?: number }) => Promise<void>;
};

const NativeDevice = registerPlugin<NativeDevicePlugin>('NativeDevice');

/**
 * Requests Android/iOS camera permission through the official Capacitor Camera plugin.
 * The previous implementation called NativeDevice.requestCamera(), but that method
 * was not implemented by the registered NativeDevice plugin, so it always returned
 * an undefined permission result and blocked getUserMedia().
 */
export async function requestNativeCameraPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    if (!Capacitor.isPluginAvailable('Camera')) {
      console.warn('[Camera] Capacitor Camera plugin is not available.');
      return false;
    }

    const permissions = await Camera.requestPermissions({
      permissions: ['camera'],
    });

    return permissions.camera === 'granted';
  } catch (error) {
    console.warn('[Camera] native permission request failed:', error);
    return false;
  }
}

export async function initializeNativeDevice(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // Do not request camera or microphone automatically at app startup.
  // Camera permission is requested only when the user opens the scanner.
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
