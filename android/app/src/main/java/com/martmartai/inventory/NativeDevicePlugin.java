package com.martmartai.inventory;

import android.Manifest;
import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.tts.TextToSpeech;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.Locale;

@CapacitorPlugin(
    name = "NativeDevice",
    permissions = {
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA }),
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }),
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class NativeDevicePlugin extends Plugin {
    private TextToSpeech textToSpeech;

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        requestPermissionForAlias("camera", call, "permissionsResult");
    }

    @PluginMethod
    public void requestCamera(PluginCall call) {
        if (getPermissionState("camera") == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("camera", "granted");
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("camera", call, "cameraPermissionResult");
    }

    @PluginMethod
    public void requestMicrophone(PluginCall call) {
        requestPermissionForAlias("microphone", call, "microphoneResult");
    }

    @PermissionCallback
    private void permissionsResult(PluginCall call) {
        JSObject result = new JSObject();
        result.put("camera", getPermissionState("camera").toString());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            result.put("notifications", getPermissionState("notifications").toString());
        } else {
            result.put("notifications", "granted");
        }
        result.put("microphone", getPermissionState("microphone").toString());
        call.resolve(result);
    }

    @PermissionCallback
    private void cameraPermissionResult(PluginCall call) {
        JSObject result = new JSObject();
        result.put("camera", getPermissionState("camera").toString());
        call.resolve(result);
    }

    @PermissionCallback
    private void microphoneResult(PluginCall call) {
        JSObject result = new JSObject();
        result.put("microphone", getPermissionState("microphone").toString());
        call.resolve(result);
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        if (text == null || text.trim().isEmpty()) {
            call.reject("Speech text is empty");
            return;
        }

        String language = call.getString("language", "en-US");
        float rate = (float) call.getDouble("rate", 1.0);

        if (textToSpeech == null) {
            textToSpeech = new TextToSpeech(getContext(), status -> {
                if (status == TextToSpeech.SUCCESS) {
                    speakNow(call, text, language, rate);
                } else {
                    call.reject("Android Text-to-Speech initialization failed");
                }
            });
        } else {
            speakNow(call, text, language, rate);
        }
    }

    private void speakNow(PluginCall call, String text, String language, float rate) {
        Locale locale = Locale.forLanguageTag(language.replace('_', '-'));
        int result = textToSpeech.setLanguage(locale);
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            locale = Locale.getDefault();
            textToSpeech.setLanguage(locale);
        }
        textToSpeech.setSpeechRate(Math.max(0.5f, Math.min(rate, 2.0f)));
        textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, "manager-" + System.currentTimeMillis());
        call.resolve();
    }

    @PluginMethod
    public void vibrate(PluginCall call) {
        long duration = call.getInt("duration", 120);
        Vibrator vibrator = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                vibrator.vibrate(duration);
            }
        }
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
        }
        super.handleOnDestroy();
    }
}
