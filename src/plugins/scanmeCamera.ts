/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerPlugin, Capacitor } from '@capacitor/core';

export interface CameraPermissionStatus {
  camera: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';
}

export interface OpenCameraOptions {
  facingMode?: 'environment' | 'user' | 'back' | 'front';
  toBack?: boolean;
}

export interface CapturePhotoResult {
  success: boolean;
  dataUrl: string;
  path?: string;
  format?: string;
}

export interface ScanMeCameraPlugin {
  getPermissionStatus(): Promise<CameraPermissionStatus>;
  requestCameraPermission(): Promise<CameraPermissionStatus>;
  openCamera(options?: OpenCameraOptions): Promise<{ success: boolean; facingMode: string }>;
  closeCamera(): Promise<{ success: boolean }>;
  capturePhoto(): Promise<CapturePhotoResult>;
  switchCamera(): Promise<{ success: boolean; facingMode: string }>;
  setFlashMode(options: { flashMode: 'auto' | 'on' | 'off' | 'torch' }): Promise<{ success: boolean; flashMode: string }>;
}

const ScanMeCameraNative = registerPlugin<ScanMeCameraPlugin>('ScanMeCamera');

export const ScanMeCamera = ScanMeCameraNative;

export function isScanMeCameraNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function getCameraPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'> {
  if (!isScanMeCameraNative()) {
    return 'denied';
  }
  try {
    const status = await ScanMeCamera.getPermissionStatus();
    console.log('[ScanMeCamera] Real Android CAMERA permission status:', status.camera);
    return status.camera;
  } catch (error) {
    console.warn('[ScanMeCamera] getPermissionStatus error:', error);
    return 'denied';
  }
}

export async function checkCameraPermission(): Promise<boolean> {
  const status = await getCameraPermissionStatus();
  return status === 'granted';
}

export async function requestCameraPermission(): Promise<'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'> {
  if (!isScanMeCameraNative()) {
    return 'denied';
  }
  try {
    console.log('[ScanMeCamera] Triggering native Android permission prompt...');
    const status = await ScanMeCamera.requestCameraPermission();
    console.log('[ScanMeCamera] Native Android permission result:', status.camera);
    return status.camera;
  } catch (error) {
    console.warn('[ScanMeCamera] requestCameraPermission error:', error);
    return 'denied';
  }
}

export async function openScanMeCamera(
  options: OpenCameraOptions = { facingMode: 'environment', toBack: true }
): Promise<{ success: boolean; facingMode: string }> {
  if (!isScanMeCameraNative()) {
    throw new Error('ScanMeCamera is only available on Android native APK.');
  }
  console.log('[ScanMeCamera] Opening native CameraX preview view...', options);
  return await ScanMeCamera.openCamera(options);
}

export async function closeScanMeCamera(): Promise<{ success: boolean }> {
  if (!isScanMeCameraNative()) {
    return { success: true };
  }
  console.log('[ScanMeCamera] Closing native CameraX preview view...');
  return await ScanMeCamera.closeCamera();
}

export async function captureScanMePhoto(): Promise<CapturePhotoResult> {
  if (!isScanMeCameraNative()) {
    throw new Error('ScanMeCamera is only available on Android native APK.');
  }
  console.log('[ScanMeCamera] Capturing photo via CameraX ImageCapture...');
  const result = await ScanMeCamera.capturePhoto();
  console.log('[ScanMeCamera] Photo captured successfully. DataUrl length:', result.dataUrl?.length);
  return result;
}

export async function switchScanMeCamera(): Promise<{ success: boolean; facingMode: string }> {
  if (!isScanMeCameraNative()) {
    throw new Error('ScanMeCamera is only available on Android native APK.');
  }
  console.log('[ScanMeCamera] Switching camera lens facing...');
  return await ScanMeCamera.switchCamera();
}

export async function setScanMeFlashMode(
  flashMode: 'auto' | 'on' | 'off' | 'torch'
): Promise<{ success: boolean; flashMode: string }> {
  if (!isScanMeCameraNative()) {
    throw new Error('ScanMeCamera is only available on Android native APK.');
  }
  console.log('[ScanMeCamera] Setting flash mode to:', flashMode);
  return await ScanMeCamera.setFlashMode({ flashMode });
}
