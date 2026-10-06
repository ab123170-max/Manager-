#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Prepares the Android project with CameraX dependencies, Camera permissions,
 * and the ScanMeCameraPlugin native bridge for reproducible CI/local builds.
 */

import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const nativeSrcDir = path.join(rootDir, 'native', 'android');
const androidAppDir = path.join(rootDir, 'android', 'app');
const javaPackageDir = path.join(androidAppDir, 'src', 'main', 'java', 'com', 'martmartai', 'inventory');
const manifestPath = path.join(androidAppDir, 'src', 'main', 'AndroidManifest.xml');
const buildGradlePath = path.join(androidAppDir, 'build.gradle');

console.log('[prepare-android] Starting Android project setup and synchronization...');

// 1. Ensure target Java package directory exists
if (!fs.existsSync(javaPackageDir)) {
  fs.mkdirSync(javaPackageDir, { recursive: true });
}

// 2. Copy persistent native source files if they exist in native/android
if (fs.existsSync(nativeSrcDir)) {
  const nativeFiles = fs.readdirSync(nativeSrcDir);
  for (const file of nativeFiles) {
    if (file.endsWith('.java')) {
      const srcFile = path.join(nativeSrcDir, file);
      const destFile = path.join(javaPackageDir, file);
      fs.copyFileSync(srcFile, destFile);
      console.log(`[prepare-android] Copied ${file} -> ${destFile}`);
    }
  }
}

// 3. Fallback check: Ensure MainActivity.java, ScanMeCameraPlugin.java, and NativeDevicePlugin.java exist
const mainActivityPath = path.join(javaPackageDir, 'MainActivity.java');
if (!fs.existsSync(mainActivityPath)) {
  const mainActivityContent = `package com.martmartai.inventory;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/**
 * ScanMe AI Android entry point.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeDevicePlugin.class);
        registerPlugin(ScanMeCameraPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`;
  fs.writeFileSync(mainActivityPath, mainActivityContent, 'utf8');
  console.log('[prepare-android] Created fallback MainActivity.java');
}

// 4. Update AndroidManifest.xml with required permissions cleanly
if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, 'utf8');

  // Permissions to check and insert
  const permissionsToAdd = [
    '<uses-permission android:name="android.permission.INTERNET" />',
    '<uses-permission android:name="android.permission.CAMERA" />',
    '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
    '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
    '<uses-permission android:name="android.permission.VIBRATE" />',
    '<uses-feature android:name="android.hardware.camera.any" android:required="false" />',
  ];

  let missingTags = [];
  for (const perm of permissionsToAdd) {
    // Extract attribute key value to check if already present
    const match = perm.match(/android:name="([^"]+)"/);
    if (match && !manifest.includes(match[1])) {
      missingTags.push(`    ${perm}`);
    }
  }

  if (missingTags.length > 0) {
    if (manifest.includes('</manifest>')) {
      manifest = manifest.replace(
        '</manifest>',
        `${missingTags.join('\n')}\n</manifest>`
      );
      fs.writeFileSync(manifestPath, manifest, 'utf8');
      console.log(`[prepare-android] Injected ${missingTags.length} missing permissions/features into AndroidManifest.xml`);
    }
  }
}

// 5. Update android/app/build.gradle if CameraX dependencies missing
if (fs.existsSync(buildGradlePath)) {
  let gradle = fs.readFileSync(buildGradlePath, 'utf8');
  if (!gradle.includes('androidx.camera:camera-core')) {
    gradle = gradle.replace(
      'dependencies {',
      `dependencies {
    // CameraX Native In-App Camera Dependencies
    def camerax_version = "1.4.1"
    implementation "androidx.camera:camera-core:\${camerax_version}"
    implementation "androidx.camera:camera-camera2:\${camerax_version}"
    implementation "androidx.camera:camera-lifecycle:\${camerax_version}"
    implementation "androidx.camera:camera-view:\${camerax_version}"`
    );
    fs.writeFileSync(buildGradlePath, gradle, 'utf8');
    console.log('[prepare-android] Added CameraX 1.4.1 dependencies to build.gradle');
  }
}

console.log('[prepare-android] Preparation complete.');
