package com.martmartai.inventory;

import android.Manifest;
import android.graphics.Color;
import android.util.Base64;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import androidx.annotation.NonNull;
import androidx.camera.core.Camera;
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

@CapacitorPlugin(name="ScanMeCamera", permissions={@Permission(alias="camera", strings={Manifest.permission.CAMERA})})
public class ScanMeCameraPlugin extends Plugin {
 private ProcessCameraProvider provider; private PreviewView preview; private ImageCapture capture; private Camera camera;
 private int lens=CameraSelector.LENS_FACING_BACK, flash=ImageCapture.FLASH_MODE_AUTO; private boolean open=false;
 @PluginMethod public void requestCameraPermission(PluginCall c){if(getPermissionState("camera")==PermissionState.GRANTED){JSObject r=new JSObject();r.put("camera","granted");c.resolve(r);return;}requestPermissionForAlias("camera",c,"permissionCallback");}
 @PluginMethod public void getPermissionStatus(PluginCall c){JSObject r=new JSObject();r.put("camera",getPermissionState("camera").toString());c.resolve(r);}
 @PermissionCallback private void permissionCallback(PluginCall c){if(getPermissionState("camera")==PermissionState.GRANTED){JSObject r=new JSObject();r.put("camera","granted");c.resolve(r);}else c.reject("Camera permission was not granted.");}
 @PluginMethod public void openCamera(PluginCall c){if(getPermissionState("camera")!=PermissionState.GRANTED){requestPermissionForAlias("camera",c,"openPermissionCallback");return;}start(c);}
 @PermissionCallback private void openPermissionCallback(PluginCall c){if(getPermissionState("camera")==PermissionState.GRANTED)start(c);else c.reject("Camera permission was not granted.");}
 private void start(PluginCall c){getActivity().runOnUiThread(()->{try{removePreview();preview=new PreviewView(getContext());preview.setScaleType(PreviewView.ScaleType.FILL_CENTER);preview.setLayoutParams(new FrameLayout.LayoutParams(-1,-1));ViewGroup parent=(ViewGroup)bridge.getWebView().getParent();bridge.getWebView().setBackgroundColor(Color.TRANSPARENT);parent.addView(preview,0);ListenableFuture<ProcessCameraProvider> f=ProcessCameraProvider.getInstance(getContext());f.addListener(()->{try{provider=f.get();bind();open=true;JSObject r=new JSObject();r.put("success",true);r.put("facingMode",lens==CameraSelector.LENS_FACING_FRONT?"user":"environment");c.resolve(r);}catch(Exception e){removePreview();c.reject("CameraX initialization failed: "+e.getMessage());}},ContextCompat.getMainExecutor(getContext()));}catch(Exception e){c.reject("Could not create in-app camera: "+e.getMessage());}});}
 private void bind(){if(provider==null||preview==null)return;provider.unbindAll();CameraSelector s=new CameraSelector.Builder().requireLensFacing(lens).build();Preview p=new Preview.Builder().build();p.setSurfaceProvider(preview.getSurfaceProvider());capture=new ImageCapture.Builder().setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY).setFlashMode(flash).build();camera=provider.bindToLifecycle((LifecycleOwner)getActivity(),s,p,capture);}
 @PluginMethod public void capturePhoto(PluginCall c){if(!open||capture==null){c.reject("Camera is not open.");return;}File f=new File(getContext().getCacheDir(),"scanme_"+System.currentTimeMillis()+".jpg");capture.takePicture(new ImageCapture.OutputFileOptions.Builder(f).build(),ContextCompat.getMainExecutor(getContext()),new ImageCapture.OnImageSavedCallback(){public void onImageSaved(@NonNull ImageCapture.OutputFileResults x){try{String b=Base64.encodeToString(Files.readAllBytes(f.toPath()),Base64.NO_WRAP);JSObject r=new JSObject();r.put("success",true);r.put("dataUrl","data:image/jpeg;base64,"+b);c.resolve(r);f.delete();}catch(Exception e){c.reject("Could not read photo: "+e.getMessage());}}public void onError(@NonNull ImageCaptureException e){c.reject("Photo capture failed: "+e.getMessage());}});}
 @PluginMethod public void switchCamera(PluginCall c){if(!open){c.reject("Camera is not open.");return;}lens=lens==CameraSelector.LENS_FACING_BACK?CameraSelector.LENS_FACING_FRONT:CameraSelector.LENS_FACING_BACK;getActivity().runOnUiThread(()->{try{bind();JSObject r=new JSObject();r.put("success",true);c.resolve(r);}catch(Exception e){c.reject("Could not switch camera: "+e.getMessage());}});}
 @PluginMethod public void setFlashMode(PluginCall c){String mode=c.getString("flashMode","auto");if(camera==null){c.reject("Camera is not active.");return;}try{if("torch".equals(mode))camera.getCameraControl().enableTorch(true);else{camera.getCameraControl().enableTorch(false);flash="on".equals(mode)?ImageCapture.FLASH_MODE_ON:"off".equals(mode)?ImageCapture.FLASH_MODE_OFF:ImageCapture.FLASH_MODE_AUTO;if(capture!=null)capture.setFlashMode(flash);}JSObject r=new JSObject();r.put("success",true);c.resolve(r);}catch(Exception e){c.reject("Flash error: "+e.getMessage());}}
 @PluginMethod public void closeCamera(PluginCall c){getActivity().runOnUiThread(()->{if(provider!=null)provider.unbindAll();removePreview();open=false;bridge.getWebView().setBackgroundColor(Color.WHITE);JSObject r=new JSObject();r.put("success",true);c.resolve(r);});}
 private void removePreview(){if(preview!=null&&preview.getParent() instanceof ViewGroup)((ViewGroup)preview.getParent()).removeView(preview);preview=null;}
 @Override protected void handleOnDestroy(){if(provider!=null)provider.unbindAll();removePreview();super.handleOnDestroy();}
}