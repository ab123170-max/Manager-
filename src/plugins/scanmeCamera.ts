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
  openAppSettings(): Promise<{ success: boolean }>;
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
  if (!isScanMeCameraNative()) return 'denied';
  try {
    const status = await ScanMeCamera.getPermissionStatus();
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
  if (!isScanMeCameraNative()) return 'denied';
  try {
    const status = await ScanMeCamera.requestCameraPermission();
    return status.camera;
  } catch (error) {
    console.warn('[ScanMeCamera] requestCameraPermission error:', error);
    return 'denied';
  }
}

export async function openCameraAppSettings(): Promise<boolean> {
  if (!isScanMeCameraNative()) return false;
  try {
    const res = await ScanMeCamera.openAppSettings();
    return Boolean(res?.success);
  } catch (error) {
    console.warn('[ScanMeCamera] openAppSettings error:', error);
    return false;
  }
}

export async function openScanMeCamera(
  options: OpenCameraOptions = { facingMode: 'environment', toBack: true }
): Promise<{ success: boolean; facingMode: string }> {
  if (!isScanMeCameraNative()) {
    throw new Error('ScanMeCamera is only available on Android native APK.');
  }
  return await ScanMeCamera.openCamera(options);
}

export async function closeScanMeCamera(): Promise<{ success: boolean }> {
  if (!isScanMeCameraNative()) {
    return { success: true };
  }
  return await ScanMeCamera.closeCamera();
}

export async function captureScanMePhoto(): Promise<CapturePhotoResult> {
  if (!isScanMeCameraNative()) {
    throw new Error('ScanMeCamera is only available on Android native APK.');
  }
  return await ScanMeCamera.capturePhoto();
}

export async function switchScanMeCamera(): Promise<{ success: boolean; facingMode: string }> {
  if (!isScanMeCameraNative()) {
    throw new Error('ScanMeCamera is only available on Android native APK.');
  }
  return await ScanMeCamera.switchCamera();
}

export async function setScanMeFlashMode(
  flashMode: 'auto' | 'on' | 'off' | 'torch'
): Promise<{ success: boolean; flashMode: string }> {
  if (!isScanMeCameraNative()) {
    throw new Error('ScanMeCamera is only available on Android native APK.');
  }
  return await ScanMeCamera.setFlashMode({ flashMode });
}
