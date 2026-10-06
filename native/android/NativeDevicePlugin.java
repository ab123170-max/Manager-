package com.martmartai.inventory;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.tts.TextToSpeech;
import androidx.core.app.NotificationCompat;

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
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }),
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class NativeDevicePlugin extends Plugin {
    private static final String NOTIFICATION_CHANNEL_ID = "scanme_alerts";
    private TextToSpeech textToSpeech;

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        requestPermissionForAlias("microphone", call, "allPermissionsMicrophoneResult");
    }

    @PluginMethod
    public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            getPermissionState("notifications") == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("notifications", "granted");
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationResult");
    }

    @PluginMethod
    public void requestMicrophone(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("microphone", "granted");
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("microphone", call, "microphoneResult");
    }

    @PermissionCallback
    private void allPermissionsMicrophoneResult(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissionForAlias("notifications", call, "allPermissionsNotificationResult");
        } else {
            resolveAllPermissions(call);
        }
    }

    @PermissionCallback
    private void allPermissionsNotificationResult(PluginCall call) {
        resolveAllPermissions(call);
    }

    private void resolveAllPermissions(PluginCall call) {
        JSObject result = new JSObject();
        result.put("microphone", getPermissionState("microphone").toString());
        result.put(
            "notifications",
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                ? getPermissionState("notifications").toString()
                : "granted"
        );
        call.resolve(result);
    }

    @PermissionCallback
    private void notificationResult(PluginCall call) {
        JSObject result = new JSObject();
        result.put("notifications", getPermissionState("notifications").toString());
        call.resolve(result);
    }

    @PermissionCallback
    private void microphoneResult(PluginCall call) {
        JSObject result = new JSObject();
        result.put("microphone", getPermissionState("microphone").toString());
        call.resolve(result);
    }

    @PluginMethod
    public void notify(PluginCall call) {
        String title = call.getString("title", "ScanMe AI");
        String body = call.getString("body", "");
        if (body == null || body.trim().isEmpty()) {
            call.reject("Notification body is empty");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            getContext().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Notification permission is not granted");
            return;
        }
        NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            call.reject("Notification service is unavailable");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                NOTIFICATION_CHANNEL_ID, "ScanMe Alerts", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Inventory and expiry alerts");
            manager.createNotificationChannel(channel);
        }
        Notification notification = new NotificationCompat.Builder(getContext(), NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build();
        manager.notify((int) (System.currentTimeMillis() & 0x7fffffff), notification);
        call.resolve();
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
        long duration = Math.max(1, call.getInt("duration", 120));
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
