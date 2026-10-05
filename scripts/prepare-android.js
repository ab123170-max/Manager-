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
const androidAppDir = path.join(rootDir, 'android', 'app');
const javaPackageDir = path.join(androidAppDir, 'src', 'main', 'java', 'com', 'martmartai', 'inventory');
const manifestPath = path.join(androidAppDir, 'src', 'main', 'AndroidManifest.xml');
const buildGradlePath = path.join(androidAppDir, 'build.gradle');

console.log('[prepare-android] Configuring native Android CameraX and plugins...');

// 1. Ensure package directory exists
if (!fs.existsSync(javaPackageDir)) {
  fs.mkdirSync(javaPackageDir, { recursive: true });
}

// 2. ScanMeCameraPlugin.java
const scanMeCameraPluginContent = `package com.martmartai.inventory;

import android.Manifest;
import android.graphics.Color;
import android.util.Base64;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraControl;
import androidx.camera.core.CameraInfo;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;
import androidx.lifecycle.LifecycleOwner;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.common.util.concurrent.ListenableFuture;

import java.io.File;
import java.nio.file.Files;

@CapacitorPlugin(
    name = "ScanMeCamera",
    permissions = {
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA })
    }
)
public class ScanMeCameraPlugin extends Plugin {

    private ProcessCameraProvider cameraProvider;
    private PreviewView previewView;
    private ImageCapture imageCapture;
    private Camera camera;
    private int lensFacing = CameraSelector.LENS_FACING_BACK;
    private int currentFlashMode = ImageCapture.FLASH_MODE_AUTO;
    private boolean isCameraOpen = false;

    @PluginMethod
    public void getPermissionStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("camera", getPermissionState("camera").toString());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestCameraPermission(PluginCall call) {
        if (getPermissionState("camera") == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("camera", "granted");
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("camera", call, "permissionCallback");
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("camera", getPermissionState("camera").toString());
        call.resolve(ret);
    }

    @PluginMethod
    public void openCamera(PluginCall call) {
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            requestPermissionForAlias("camera", call, "openCameraPermissionCallback");
            return;
        }
        startCameraInternal(call);
    }

    @PermissionCallback
    private void openCameraPermissionCallback(PluginCall call) {
        if (getPermissionState("camera") == PermissionState.GRANTED) {
            startCameraInternal(call);
        } else {
            call.reject("Camera permission is required to take a photo. Please allow camera access in Android settings.");
        }
    }

    private void startCameraInternal(PluginCall call) {
        String facing = call.getString("facingMode", "environment");
        boolean toBack = call.getBoolean("toBack", true);

        if ("user".equalsIgnoreCase(facing) || "front".equalsIgnoreCase(facing)) {
            lensFacing = CameraSelector.LENS_FACING_FRONT;
        } else {
            lensFacing = CameraSelector.LENS_FACING_BACK;
        }

        getActivity().runOnUiThread(() -> {
            try {
                removePreviewView();

                previewView = new PreviewView(getContext());
                FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                );
                previewView.setLayoutParams(params);
                previewView.setScaleType(PreviewView.ScaleType.FILL_CENTER);

                ViewGroup webViewParent = (ViewGroup) bridge.getWebView().getParent();
                if (toBack) {
                    bridge.getWebView().setBackgroundColor(Color.TRANSPARENT);
                    webViewParent.addView(previewView, 0);
                } else {
                    webViewParent.addView(previewView);
                }

                ListenableFuture<ProcessCameraProvider> cameraProviderFuture =
                    ProcessCameraProvider.getInstance(getContext());

                cameraProviderFuture.addListener(() -> {
                    try {
                        cameraProvider = cameraProviderFuture.get();
                        bindCameraUseCases();
                        isCameraOpen = true;

                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("facingMode", lensFacing == CameraSelector.LENS_FACING_FRONT ? "user" : "environment");
                        call.resolve(ret);
                    } catch (Exception e) {
                        removePreviewView();
                        bridge.getWebView().setBackgroundColor(Color.WHITE);
                        call.reject("Failed to initialize CameraX: " + e.getMessage(), e);
                    }
                }, ContextCompat.getMainExecutor(getContext()));

            } catch (Exception e) {
                call.reject("Failed to setup camera view: " + e.getMessage(), e);
            }
        });
    }

    private void bindCameraUseCases() {
        if (cameraProvider == null || previewView == null) return;

        cameraProvider.unbindAll();

        CameraSelector cameraSelector = new CameraSelector.Builder()
            .requireLensFacing(lensFacing)
            .build();

        Preview preview = new Preview.Builder().build();
        preview.setSurfaceProvider(previewView.getSurfaceProvider());

        imageCapture = new ImageCapture.Builder()
            .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
            .setFlashMode(currentFlashMode)
            .build();

        camera = cameraProvider.bindToLifecycle(
            (LifecycleOwner) getActivity(),
            cameraSelector,
            preview,
            imageCapture
        );
    }

    @PluginMethod
    public void closeCamera(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (cameraProvider != null) {
                    cameraProvider.unbindAll();
                }
                removePreviewView();
                bridge.getWebView().setBackgroundColor(Color.WHITE);
                isCameraOpen = false;

                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Failed to close camera: " + e.getMessage(), e);
            }
        });
    }

    private void removePreviewView() {
        if (previewView != null) {
            if (previewView.getParent() != null) {
                ((ViewGroup) previewView.getParent()).removeView(previewView);
            }
            previewView = null;
        }
    }

    @PluginMethod
    public void capturePhoto(PluginCall call) {
        if (imageCapture == null || !isCameraOpen) {
            call.reject("Camera is not open. Please open camera first.");
            return;
        }

        File cacheDir = getContext().getCacheDir();
        File photoFile = new File(cacheDir, "scanme_capture_" + System.currentTimeMillis() + ".jpg");

        ImageCapture.OutputFileOptions outputOptions =
            new ImageCapture.OutputFileOptions.Builder(photoFile).build();

        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(getContext()),
            new ImageCapture.OnImageSavedCallback() {
                @Override
                public void onImageSaved(@NonNull ImageCapture.OutputFileResults outputFileResults) {
                    try {
                        byte[] bytes = Files.readAllBytes(photoFile.toPath());
                        String base64 = Base64.encodeToString(bytes, Base64.NO_WRAP);
                        String dataUrl = "data:image/jpeg;base64," + base64;

                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("dataUrl", dataUrl);
                        ret.put("path", photoFile.getAbsolutePath());
                        ret.put("format", "jpeg");
                        call.resolve(ret);
                    } catch (Exception e) {
                        call.reject("Failed to process captured image: " + e.getMessage(), e);
                    }
                }

                @Override
                public void onError(@NonNull ImageCaptureException exception) {
                    call.reject("Photo capture failed: " + exception.getMessage(), exception);
                }
            }
        );
    }

    @PluginMethod
    public void switchCamera(PluginCall call) {
        if (!isCameraOpen) {
            call.reject("Camera is not currently open.");
            return;
        }

        lensFacing = (lensFacing == CameraSelector.LENS_FACING_BACK)
            ? CameraSelector.LENS_FACING_FRONT
            : CameraSelector.LENS_FACING_BACK;

        getActivity().runOnUiThread(() -> {
            try {
                bindCameraUseCases();
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("facingMode", lensFacing == CameraSelector.LENS_FACING_FRONT ? "user" : "environment");
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Failed to switch camera: " + e.getMessage(), e);
            }
        });
    }

    @PluginMethod
    public void setFlashMode(PluginCall call) {
        String mode = call.getString("flashMode", "auto");
        if (camera == null) {
            call.reject("Camera is not active.");
            return;
        }

        try {
            CameraControl control = camera.getCameraControl();
            if ("torch".equalsIgnoreCase(mode)) {
                control.enableTorch(true);
            } else if ("on".equalsIgnoreCase(mode)) {
                control.enableTorch(false);
                currentFlashMode = ImageCapture.FLASH_MODE_ON;
                if (imageCapture != null) imageCapture.setFlashMode(currentFlashMode);
            } else if ("off".equalsIgnoreCase(mode)) {
                control.enableTorch(false);
                currentFlashMode = ImageCapture.FLASH_MODE_OFF;
                if (imageCapture != null) imageCapture.setFlashMode(currentFlashMode);
            } else {
                control.enableTorch(false);
                currentFlashMode = ImageCapture.FLASH_MODE_AUTO;
                if (imageCapture != null) imageCapture.setFlashMode(currentFlashMode);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("flashMode", mode);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to set flash mode: " + e.getMessage(), e);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (cameraProvider != null) {
            cameraProvider.unbindAll();
        }
        removePreviewView();
        super.handleOnDestroy();
    }
}
`;
fs.writeFileSync(path.join(javaPackageDir, 'ScanMeCameraPlugin.java'), scanMeCameraPluginContent, 'utf8');

// 3. MainActivity.java
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
fs.writeFileSync(path.join(javaPackageDir, 'MainActivity.java'), mainActivityContent, 'utf8');

// 4. Update AndroidManifest.xml if camera permission missing
if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, 'utf8');
  if (!manifest.includes('android.permission.CAMERA')) {
    manifest = manifest.replace(
      '</application>',
      '</application>\n\n    <uses-permission android:name="android.permission.CAMERA" />\n    <uses-feature android:name="android.hardware.camera.any" android:required="false" />'
    );
    fs.writeFileSync(manifestPath, manifest, 'utf8');
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
  }
}

console.log('[prepare-android] Native CameraX setup complete.');
