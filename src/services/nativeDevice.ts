import { Capacitor, registerPlugin } from '@capacitor/core';
import { Camera } from '@capacitor/camera';

type NativeDevicePlugin = {
  requestPermissions?: () => Promise<{ camera?: string; notifications?: string; microphone?: string }>;
  requestMicrophone?: () => Promise<{ microphone?: string }>;
  requestNotifications?: () => Promise<{ notifications?: string }>;
  speak?: (options: { text: string; language?: string; rate?: number }) => Promise<void>;
  notify?: (options: { title?: string; body: string }) => Promise<void>;
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
  // Native initialization must never trigger permission prompts on app startup.
  // Individual features request their permission only when the user uses them.
  if (!Capacitor.isNativePlatform()) return;
}

export async function requestNativeMicrophonePermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const result = await NativeDevice.requestMicrophone?.();
    return result?.microphone === 'granted';
  } catch (error) {
    console.warn('[Microphone] native permission request failed:', error);
    return false;
  }
}

export async function requestNativeNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const result = await NativeDevice.requestNotifications?.();
    return result?.notifications === 'granted';
  } catch (error) {
    console.warn('[Notifications] native permission request failed:', error);
    return false;
  }
}

export async function notifyNative(title: string, body: string): Promise<boolean> {
  if (!body?.trim() || !Capacitor.isNativePlatform()) return false;
  try {
    if (!NativeDevice.notify) return false;
    await NativeDevice.notify({ title, body });
    return true;
  } catch (error) {
    console.warn('[NativeDevice] notification failed:', error);
    return false;
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
