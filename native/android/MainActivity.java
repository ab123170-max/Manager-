package com.martmartai.inventory;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
 @Override public void onCreate(Bundle savedInstanceState){registerPlugin(NativeDevicePlugin.class);registerPlugin(ScanMeCameraPlugin.class);super.onCreate(savedInstanceState);}
}