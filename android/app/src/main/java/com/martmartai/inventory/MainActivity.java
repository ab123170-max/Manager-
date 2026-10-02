package com.martmartai.inventory;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(NativeDevicePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
