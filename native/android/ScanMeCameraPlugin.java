package com.martmartai.inventory;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;
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

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * ScanMe AI Unified Native Android CameraX & Runtime Permission Plugin.
 * Supports Android 10 (API 29) through Android 15 (API 35+).
 */
@CapacitorPlugin(
    name = "ScanMeCamera",
    permissions = {
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA })
    }
)
public class ScanMeCameraPlugin extends Plugin {

    private static final String TAG = "ScanMeCameraPlugin";
    private static final String PREF_NAME = "scanme_camera_prefs";
    private static final String KEY_REQUESTED = "has_requested_camera_permission";

    private static final ExecutorService frameAnalysisExecutor = Executors.newSingleThreadExecutor();
    private boolean isFirstFrameCaptured = false;

    private ProcessCameraProvider cameraProvider;
    private PreviewView previewView;
    private ImageCapture imageCapture;
    private Preview preview;
    private CameraSelector backCameraSelector;
    private CameraSelector frontCameraSelector;
    private Bitmap reusableAnalysisBitmap;
    private android.graphics.Canvas reusableAnalysisCanvas;
    private Camera camera;
    private int lensFacing = CameraSelector.LENS_FACING_BACK;
    private int currentFlashMode = ImageCapture.FLASH_MODE_AUTO;
    private boolean isCameraOpen = false;

    private boolean hasRequestedPermissionBefore() {
        Context context = getContext();
        if (context == null) return false;
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        return prefs.getBoolean(KEY_REQUESTED, false);
    }

    private void markPermissionRequested() {
        Context context = getContext();
        if (context == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_REQUESTED, true).apply();
    }

    /**
     * Checks the true Android runtime CAMERA permission state.
     * Returns:
     * - "granted": Permission is active.
     * - "prompt": First-time use (never requested before).
     * - "prompt-with-rationale": Denied once, can be asked again with system prompt.
     * - "denied": Permanently denied ("Don't ask again").
     */
    @PluginMethod
    public void getPermissionStatus(PluginCall call) {
        JSObject ret = new JSObject();
        boolean isGranted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED;

        if (isGranted) {
            ret.put("camera", "granted");
            Log.d(TAG, "[getPermissionStatus] CAMERA is granted");
        } else {
            boolean requestedBefore = hasRequestedPermissionBefore();
            if (!requestedBefore) {
                // First-time camera use
                ret.put("camera", "prompt");
                Log.d(TAG, "[getPermissionStatus] CAMERA prompt (first-time use)");
            } else {
                boolean shouldShowRationale = getActivity().shouldShowRequestPermissionRationale(Manifest.permission.CAMERA);
                if (shouldShowRationale) {
                    // User denied once or temporarily
                    ret.put("camera", "prompt-with-rationale");
                    Log.d(TAG, "[getPermissionStatus] CAMERA prompt-with-rationale (denied once)");
                } else {
                    // Previously requested, not granted, shouldShowRationale is false => Permanently denied
                    ret.put("camera", "denied");
                    Log.d(TAG, "[getPermissionStatus] CAMERA permanently denied (settings required)");
                }
            }
        }
        call.resolve(ret);
    }

    /**
     * Requests native Android CAMERA permission.
     */
    @PluginMethod
    public void requestCameraPermission(PluginCall call) {
        boolean isGranted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED;

        if (isGranted) {
            JSObject ret = new JSObject();
            ret.put("camera", "granted");
            Log.d(TAG, "[requestCameraPermission] CAMERA already granted");
            call.resolve(ret);
            return;
        }

        markPermissionRequested();
        Log.d(TAG, "[requestCameraPermission] Launching native Android permission dialog");
        requestPermissionForAlias("camera", call, "permissionCallback");
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        boolean isGranted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED;

        if (isGranted) {
            ret.put("camera", "granted");
            Log.d(TAG, "[permissionCallback] CAMERA permission granted by user");
        } else {
            boolean shouldShowRationale = getActivity().shouldShowRequestPermissionRationale(Manifest.permission.CAMERA);
            ret.put("camera", shouldShowRationale ? "prompt-with-rationale" : "denied");
            Log.d(TAG, "[permissionCallback] CAMERA permission denied by user (shouldShowRationale=" + shouldShowRationale + ")");
        }
        call.resolve(ret);
    }

    /**
     * Opens the official Android App Settings screen for ScanMe AI
     * using ACTION_APPLICATION_DETAILS_SETTINGS and dynamic package name.
     */
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            String packageName = getActivity().getPackageName();
            Log.d(TAG, "[openAppSettings] Opening application details settings for package: " + packageName);

            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            Uri uri = Uri.fromParts("package", packageName, null);
            intent.setData(uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "[openAppSettings] Error opening details settings: " + e.getMessage(), e);
            try {
                // Secondary fallback to general settings
                Intent fallback = new Intent(Settings.ACTION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(fallback);

                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception ex) {
                Log.e(TAG, "[openAppSettings] General settings fallback also failed: " + ex.getMessage(), ex);
                call.reject("Could not open settings: " + ex.getMessage(), ex);
            }
        }
    }

    /**
     * Opens native CameraX preview view inside the app.
     */
    @PluginMethod
    public void openCamera(PluginCall call) {
        boolean isGranted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED;

        if (!isGranted) {
            Log.d(TAG, "[openCamera] Permission not granted, requesting via alias");
            markPermissionRequested();
            requestPermissionForAlias("camera", call, "openCameraPermissionCallback");
            return;
        }

        startCameraInternal(call);
    }

    @PermissionCallback
    private void openCameraPermissionCallback(PluginCall call) {
        boolean isGranted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED;

        if (isGranted) {
            Log.d(TAG, "[openCameraPermissionCallback] Permission granted, starting camera");
            startCameraInternal(call);
        } else {
            boolean shouldShowRationale = getActivity().shouldShowRequestPermissionRationale(Manifest.permission.CAMERA);
            Log.d(TAG, "[openCameraPermissionCallback] Permission denied (shouldShowRationale=" + shouldShowRationale + ")");
            call.reject("Camera permission is required to take a photo. Please allow camera access.", shouldShowRationale ? "PERMISSION_DENIED" : "PERMISSION_PERMANENTLY_DENIED");
        }
    }

    private void startCameraInternal(PluginCall call) {
        Log.d(TAG, "TIMING: [camera_open_requested]");
        isFirstFrameCaptured = false;

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

                // If ProcessCameraProvider is already cached, bind use cases immediately!
                if (cameraProvider != null) {
                    Log.d(TAG, "TIMING: [camera_provider_ready] (reused cached provider)");
                    bindCameraUseCases();
                    isCameraOpen = true;

                    Log.d(TAG, "TIMING: [camera_bound]");
                    Log.d(TAG, "TIMING: [preview_started]");

                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("facingMode", lensFacing == CameraSelector.LENS_FACING_FRONT ? "user" : "environment");
                    call.resolve(ret);
                    return;
                }

                ListenableFuture<ProcessCameraProvider> cameraProviderFuture =
                    ProcessCameraProvider.getInstance(getContext());

                cameraProviderFuture.addListener(() -> {
                    try {
                        cameraProvider = cameraProviderFuture.get();
                        Log.d(TAG, "TIMING: [camera_provider_ready] (initialized)");
                        bindCameraUseCases();
                        isCameraOpen = true;

                        Log.d(TAG, "TIMING: [camera_bound]");
                        Log.d(TAG, "TIMING: [preview_started]");

                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("facingMode", lensFacing == CameraSelector.LENS_FACING_FRONT ? "user" : "environment");
                        call.resolve(ret);
                    } catch (Exception e) {
                        Log.e(TAG, "[startCameraInternal] Failed to initialize CameraX: " + e.getMessage(), e);
                        removePreviewView();
                        bridge.getWebView().setBackgroundColor(Color.WHITE);
                        call.reject("Failed to initialize CameraX: " + e.getMessage(), e);
                    }
                }, ContextCompat.getMainExecutor(getContext()));

            } catch (Exception e) {
                Log.e(TAG, "[startCameraInternal] Failed to setup camera view: " + e.getMessage(), e);
                call.reject("Failed to setup camera view: " + e.getMessage(), e);
            }
        });
    }

    private void bindCameraUseCases() {
        if (cameraProvider == null || previewView == null) return;

        cameraProvider.unbindAll();

        // 1. Reuse camera selectors
        if (backCameraSelector == null) {
            backCameraSelector = new CameraSelector.Builder()
                .requireLensFacing(CameraSelector.LENS_FACING_BACK)
                .build();
        }
        if (frontCameraSelector == null) {
            frontCameraSelector = new CameraSelector.Builder()
                .requireLensFacing(CameraSelector.LENS_FACING_FRONT)
                .build();
        }
        CameraSelector cameraSelector = (lensFacing == CameraSelector.LENS_FACING_BACK) ? backCameraSelector : frontCameraSelector;

        // 2. Reuse preview use case
        if (preview == null) {
            preview = new Preview.Builder().build();
        }
        preview.setSurfaceProvider(previewView.getSurfaceProvider());

        // 3. Reuse imageCapture use case
        if (imageCapture == null) {
            imageCapture = new ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                .setFlashMode(currentFlashMode)
                .build();
        } else {
            imageCapture.setFlashMode(currentFlashMode);
        }

        camera = cameraProvider.bindToLifecycle(
            (LifecycleOwner) getActivity(),
            cameraSelector,
            preview,
            imageCapture
        );
    }

    /**
     * Closes the in-app CameraX preview and restores WebView background.
     */
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

                Log.d(TAG, "[closeCamera] Camera preview closed and unbound");
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "[closeCamera] Error closing camera: " + e.getMessage(), e);
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

    /**
     * Takes picture using ImageCapture and returns Base64 dataUrl directly.
     * Saved in internal cache directory (no external storage permissions needed).
     */
    @PluginMethod
    public void capturePhoto(PluginCall call) {
        if (imageCapture == null || !isCameraOpen) {
            Log.w(TAG, "[capturePhoto] Camera is not open");
            call.reject("Camera is not open. Please open camera first.");
            return;
        }

        File cacheDir = getContext().getCacheDir();
        File photoFile = new File(cacheDir, "scanme_capture_" + System.currentTimeMillis() + ".jpg");

        ImageCapture.OutputFileOptions outputOptions =
            new ImageCapture.OutputFileOptions.Builder(photoFile).build();

        Log.d(TAG, "[capturePhoto] Taking picture to internal cache: " + photoFile.getAbsolutePath());
        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(getContext()),
            new ImageCapture.OnImageSavedCallback() {
                @Override
                public void onImageSaved(@NonNull ImageCapture.OutputFileResults outputFileResults) {
                    try {
                        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                        try (FileInputStream fis = new FileInputStream(photoFile)) {
                            byte[] chunk = new byte[8192];
                            int bytesRead;
                            while ((bytesRead = fis.read(chunk)) != -1) {
                                buffer.write(chunk, 0, bytesRead);
                            }
                        }
                        byte[] bytes = buffer.toByteArray();
                        String base64 = Base64.encodeToString(bytes, Base64.NO_WRAP);
                        String dataUrl = "data:image/jpeg;base64," + base64;

                        // Clean up temporary cache file
                        try {
                            photoFile.delete();
                        } catch (Exception ignored) {}

                        Log.d(TAG, "[capturePhoto] Photo successfully captured, size bytes: " + bytes.length);
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("dataUrl", dataUrl);
                        ret.put("format", "jpeg");
                        call.resolve(ret);
                    } catch (Exception e) {
                        Log.e(TAG, "[capturePhoto] Error processing captured image: " + e.getMessage(), e);
                        call.reject("Failed to process captured image: " + e.getMessage(), e);
                    }
                }

                @Override
                public void onError(@NonNull ImageCaptureException exception) {
                    Log.e(TAG, "[capturePhoto] takePicture error: " + exception.getMessage(), exception);
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
                Log.d(TAG, "[switchCamera] Switched lensFacing to: " + lensFacing);
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("facingMode", lensFacing == CameraSelector.LENS_FACING_FRONT ? "user" : "environment");
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "[switchCamera] Failed to switch camera: " + e.getMessage(), e);
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

            Log.d(TAG, "[setFlashMode] Set flash mode to: " + mode);
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("flashMode", mode);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "[setFlashMode] Failed to set flash mode: " + e.getMessage(), e);
            call.reject("Failed to set flash mode: " + e.getMessage(), e);
        }
    }

    /**
     * Fast, lightweight frame snapshot (320px) for live real-time detection & tracking
     */
    @PluginMethod
    public void getPreviewFrame(PluginCall call) {
        if (previewView == null || !isCameraOpen) {
            call.reject("Camera is not open.");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                final Bitmap bitmap = previewView.getBitmap();
                if (bitmap == null) {
                    call.reject("Bitmap preview unavailable");
                    return;
                }

                if (!isFirstFrameCaptured) {
                    isFirstFrameCaptured = true;
                    Log.d(TAG, "TIMING: [preview_first_frame]");
                }

                // Offload the heavy bitmap scaling, compression, and base64 operations
                // off the main UI thread to preserve camera preview performance
                frameAnalysisExecutor.execute(() -> {
                    try {
                        int targetW = 320;
                        int targetH = Math.max(1, (bitmap.getHeight() * targetW) / bitmap.getWidth());

                        // Lazy initialization of reusable downscaling canvas and bitmap
                        if (reusableAnalysisBitmap == null || reusableAnalysisBitmap.getWidth() != targetW || reusableAnalysisBitmap.getHeight() != targetH) {
                            if (reusableAnalysisBitmap != null) {
                                try {
                                    reusableAnalysisBitmap.recycle();
                                } catch (Exception ignored) {}
                            }
                            reusableAnalysisBitmap = Bitmap.createBitmap(targetW, targetH, Bitmap.Config.ARGB_8888);
                            reusableAnalysisCanvas = new android.graphics.Canvas(reusableAnalysisBitmap);
                        }

                        // Draw and downscale onto the reusable canvas (zero extra allocation)
                        android.graphics.Rect srcRect = new android.graphics.Rect(0, 0, bitmap.getWidth(), bitmap.getHeight());
                        android.graphics.RectF dstRect = new android.graphics.RectF(0, 0, targetW, targetH);
                        reusableAnalysisCanvas.drawBitmap(bitmap, srcRect, dstRect, new android.graphics.Paint(android.graphics.Paint.FILTER_BITMAP_FLAG));

                        ByteArrayOutputStream out = new ByteArrayOutputStream();
                        reusableAnalysisBitmap.compress(Bitmap.CompressFormat.JPEG, 65, out);
                        byte[] bytes = out.toByteArray();
                        String base64 = Base64.encodeToString(bytes, Base64.NO_WRAP);

                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("dataUrl", "data:image/jpeg;base64," + base64);
                        ret.put("width", targetW);
                        ret.put("height", targetH);
                        call.resolve(ret);
                    } catch (Exception e) {
                        Log.e(TAG, "[getPreviewFrame] Background processing failed: " + e.getMessage(), e);
                        call.reject("Failed to process frame on background thread: " + e.getMessage(), e);
                    } finally {
                        // Recycle source bitmap immediately
                        try {
                            bitmap.recycle();
                        } catch (Exception ignored) {}
                    }
                });
            } catch (Exception e) {
                call.reject("Failed to capture frame: " + e.getMessage(), e);
            }
        });
    }

    @Override
    protected void handleOnPause() {
        if (cameraProvider != null) {
            cameraProvider.unbindAll();
        }
        super.handleOnPause();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        boolean isGranted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED;
        Log.d(TAG, "[handleOnResume] CAMERA granted: " + isGranted + ", isCameraOpen: " + isCameraOpen);
        if (isCameraOpen && isGranted) {
            getActivity().runOnUiThread(this::bindCameraUseCases);
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
