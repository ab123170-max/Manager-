package com.martmartai.inventory;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

/**
 * ScanMe AI Android entry point.
 *
 * Camera access is handled by the native Capacitor camera-preview plugin.
 * The app no longer grants WebView getUserMedia camera resources because the
 * Android scanner uses a real native camera preview inside the app.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeDevicePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
