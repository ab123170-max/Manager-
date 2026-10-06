#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Automated pre-build validation for ScanMe AI native Android components.
 */

import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const androidAppDir = path.join(rootDir, 'android', 'app');
const javaPackageDir = path.join(androidAppDir, 'src', 'main', 'java', 'com', 'martmartai', 'inventory');
const manifestPath = path.join(androidAppDir, 'src', 'main', 'AndroidManifest.xml');
const buildGradlePath = path.join(androidAppDir, 'build.gradle');

console.log('\n[validate-android] Running automated verification of Android project configuration...');

let errors = [];

// 1. Verify files exist
const scanMeCameraPluginPath = path.join(javaPackageDir, 'ScanMeCameraPlugin.java');
const nativeDevicePluginPath = path.join(javaPackageDir, 'NativeDevicePlugin.java');
const mainActivityPath = path.join(javaPackageDir, 'MainActivity.java');

if (!fs.existsSync(scanMeCameraPluginPath)) {
  errors.push(`Missing native plugin file: ${scanMeCameraPluginPath}`);
}
if (!fs.existsSync(nativeDevicePluginPath)) {
  errors.push(`Missing native plugin file: ${nativeDevicePluginPath}`);
}
if (!fs.existsSync(mainActivityPath)) {
  errors.push(`Missing MainActivity file: ${mainActivityPath}`);
}

// 2. Validate MainActivity
if (fs.existsSync(mainActivityPath)) {
  const content = fs.readFileSync(mainActivityPath, 'utf8');
  if (!content.includes('package com.martmartai.inventory;')) {
    errors.push('MainActivity package is not com.martmartai.inventory');
  }
  if (!content.includes('registerPlugin(ScanMeCameraPlugin.class)')) {
    errors.push('MainActivity does not register ScanMeCameraPlugin.class');
  }
  if (!content.includes('registerPlugin(NativeDevicePlugin.class)')) {
    errors.push('MainActivity does not register NativeDevicePlugin.class');
  }

  // Check duplicate registrations
  const matchesScanMe = content.match(/registerPlugin\(\s*ScanMeCameraPlugin\.class\s*\)/g);
  if (matchesScanMe && matchesScanMe.length > 1) {
    errors.push('Duplicate registerPlugin(ScanMeCameraPlugin.class) found in MainActivity.java');
  }
  const matchesNative = content.match(/registerPlugin\(\s*NativeDevicePlugin\.class\s*\)/g);
  if (matchesNative && matchesNative.length > 1) {
    errors.push('Duplicate registerPlugin(NativeDevicePlugin.class) found in MainActivity.java');
  }
}

// 3. Validate ScanMeCameraPlugin.java
if (fs.existsSync(scanMeCameraPluginPath)) {
  const content = fs.readFileSync(scanMeCameraPluginPath, 'utf8');
  if (!content.includes('package com.martmartai.inventory;')) {
    errors.push('ScanMeCameraPlugin package is not com.martmartai.inventory');
  }
  if (!content.includes('@CapacitorPlugin') || !content.includes('name = "ScanMeCamera"')) {
    errors.push('ScanMeCameraPlugin missing @CapacitorPlugin(name = "ScanMeCamera") annotation');
  }
  if (!content.includes('openCamera') || !content.includes('capturePhoto') || !content.includes('closeCamera')) {
    errors.push('ScanMeCameraPlugin is missing essential camera methods (openCamera, capturePhoto, closeCamera)');
  }
}

// 4. Validate NativeDevicePlugin.java
if (fs.existsSync(nativeDevicePluginPath)) {
  const content = fs.readFileSync(nativeDevicePluginPath, 'utf8');
  if (!content.includes('package com.martmartai.inventory;')) {
    errors.push('NativeDevicePlugin package is not com.martmartai.inventory');
  }
  if (!content.includes('@CapacitorPlugin') || !content.includes('name = "NativeDevice"')) {
    errors.push('NativeDevicePlugin missing @CapacitorPlugin(name = "NativeDevice") annotation');
  }
  if (content.includes('Notification notification =') && !content.includes('import android.app.Notification;')) {
    errors.push('NativeDevicePlugin missing import android.app.Notification;');
  }
}

// 5. Validate build.gradle dependencies
if (fs.existsSync(buildGradlePath)) {
  const gradle = fs.readFileSync(buildGradlePath, 'utf8');
  const requiredDeps = [
    'androidx.camera:camera-core',
    'androidx.camera:camera-camera2',
    'androidx.camera:camera-lifecycle',
    'androidx.camera:camera-view'
  ];
  for (const dep of requiredDeps) {
    if (!gradle.includes(dep)) {
      errors.push(`build.gradle is missing CameraX dependency: ${dep}`);
    }
  }
} else {
  errors.push(`Missing build.gradle at ${buildGradlePath}`);
}

// 6. Validate AndroidManifest.xml
if (fs.existsSync(manifestPath)) {
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  if (!manifest.includes('android.permission.CAMERA')) {
    errors.push('AndroidManifest.xml is missing android.permission.CAMERA');
  }

  // Basic XML validation
  if (!manifest.startsWith('<?xml') && !manifest.includes('<manifest')) {
    errors.push('AndroidManifest.xml does not start with valid XML/manifest declaration');
  }
  if (!manifest.includes('</manifest>')) {
    errors.push('AndroidManifest.xml is missing closing </manifest> tag');
  }
  if (!manifest.includes('</application>')) {
    errors.push('AndroidManifest.xml is missing closing </application> tag');
  }
} else {
  errors.push(`Missing AndroidManifest.xml at ${manifestPath}`);
}

// Check results
if (errors.length > 0) {
  console.error('\n❌ Android Validation Failed with the following errors:');
  errors.forEach((err, idx) => console.error(`  ${idx + 1}. ${err}`));
  process.exit(1);
} else {
  console.log('✅ Android Validation Passed: All native plugins, CameraX dependencies, and permissions verified.');
  process.exit(0);
}
