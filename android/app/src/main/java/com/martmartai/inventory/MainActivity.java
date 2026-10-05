package com.martmartai.inventory;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

/**
 * WebView camera permission bridge.
 *
 * The scanner uses navigator.mediaDevices.getUserMedia() inside the
 * Capacitor WebView. Android therefore needs BOTH:
 * 1) the Android CAMERA runtime permission, and
 * 2) a WebView VIDEO_CAPTURE grant.
 *
 * Do not grant arbitrary WebView resources. Only camera requests from the
 * ScanMe AI WebView are accepted.
 */
public class MainActivity extends BridgeActivity {
    private static final int CAMERA_PERMISSION_REQUEST = 4101;
    private PermissionRequest pendingCameraRequest;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeDevicePlugin.class);
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        webView.getSettings().setJavaScriptEnabled(true);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> handleWebPermissionRequest(request));
            }
        });
    }

    private void handleWebPermissionRequest(PermissionRequest request) {
        if (request == null) return;

        boolean wantsCamera = false;
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                wantsCamera = true;
                break;
            }
        }

        // This app only needs video capture. Never grant unrelated resources.
        if (!wantsCamera) {
            request.deny();
            return;
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED) {
            grantCameraToWebView(request);
            return;
        }

        pendingCameraRequest = request;
        ActivityCompat.requestPermissions(
                this,
                new String[]{Manifest.permission.CAMERA},
                CAMERA_PERMISSION_REQUEST
        );
    }

    private void grantCameraToWebView(PermissionRequest request) {
        if (request == null) return;

        request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
        pendingCameraRequest = null;
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            @NonNull String[] permissions,
            @NonNull int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode != CAMERA_PERMISSION_REQUEST) return;

        PermissionRequest request = pendingCameraRequest;
        pendingCameraRequest = null;

        if (grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED
                && request != null) {
            grantCameraToWebView(request);
        } else if (request != null) {
            request.deny();
        }
    }

    @Override
    protected void onDestroy() {
        if (pendingCameraRequest != null) {
            pendingCameraRequest.deny();
            pendingCameraRequest = null;
        }
        super.onDestroy();
    }
}
