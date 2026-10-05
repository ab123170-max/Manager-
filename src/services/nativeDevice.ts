import { Capacitor, registerPlugin } from '@capacitor/core';

type NativeDevicePlugin = {
  requestPermissions?: () => Promise<{ notifications?: string; microphone?: string }>;
  requestMicrophone?: () => Promise<{ microphone?: string }>;
  requestNotifications?: () => Promise<{ notifications?: string }>;
  speak?: (options: { text: string; language?: string; rate?: number }) => Promise<void>;
  notify?: (options: { title?: string; body: string }) => Promise<void>;
  vibrate?: (options?: { duration?: number }) => Promise<void>;
};

const NativeDevice = registerPlugin<NativeDevicePlugin>('NativeDevice');

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
