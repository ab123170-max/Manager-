package com.martmartai.inventory;

import android.Manifest;
import android.content.pm.PackageManager;
import android.graphics.Color;
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

import java.io.File;
import java.io.FileInputStream;
import java.io.ByteArrayOutputStream;

@CapacitorPlugin(
    name = "ScanMeCamera",
    permissions = {
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA })
    }
)
public class ScanMeCameraPlugin extends Plugin {

    private static final String TAG = "ScanMeCameraPlugin";

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
        boolean isGranted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED;
        if (isGranted) {
            ret.put("camera", "granted");
            Log.d(TAG, "[getPermissionStatus] CAMERA is granted");
        } else {
            boolean shouldShowRationale = getActivity().shouldShowRequestPermissionRationale(Manifest.permission.CAMERA);
            if (shouldShowRationale) {
                ret.put("camera", "prompt-with-rationale");
                Log.d(TAG, "[getPermissionStatus] CAMERA prompt-with-rationale");
            } else {
                PermissionState state = getPermissionState("camera");
                if (state == PermissionState.DENIED) {
                    ret.put("camera", "denied");
                    Log.d(TAG, "[getPermissionStatus] CAMERA permanently denied");
                } else {
                    ret.put("camera", "prompt");
                    Log.d(TAG, "[getPermissionStatus] CAMERA prompt");
                }
            }
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestCameraPermission(PluginCall call) {
        boolean isGranted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED;
        if (isGranted) {
            JSObject ret = new JSObject();
            ret.put("camera", "granted");
            call.resolve(ret);
            return;
        }
        Log.d(TAG, "[requestCameraPermission] Requesting native CAMERA permission");
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
            Log.d(TAG, "[permissionCallback] CAMERA permission denied by user, rationale: " + shouldShowRationale);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void openCamera(PluginCall call) {
        boolean isGranted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED;
        if (!isGranted) {
            Log.d(TAG, "[openCamera] Permission not granted, requesting via alias");
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
            Log.d(TAG, "[openCameraPermissionCallback] Permission denied, rationale: " + shouldShowRationale);
            call.reject("Camera permission is required to take a photo. Please allow camera access.", shouldShowRationale ? "PERMISSION_DENIED" : "PERMISSION_PERMANENTLY_DENIED");
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

                        Log.d(TAG, "[startCameraInternal] CameraX preview successfully bound and active");
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

        Log.d(TAG, "[capturePhoto] Taking picture to: " + photoFile.getAbsolutePath());
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

                        Log.d(TAG, "[capturePhoto] Image saved and converted to dataUrl, bytes: " + bytes.length);
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("dataUrl", dataUrl);
                        ret.put("path", photoFile.getAbsolutePath());
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
        if (isCameraOpen) {
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
