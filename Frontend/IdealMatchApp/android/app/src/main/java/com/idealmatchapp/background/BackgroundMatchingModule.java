package com.idealmatchapp.background;

import android.content.Intent;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

public class BackgroundMatchingModule extends ReactContextBaseJavaModule {
  private static final String NAME = "BackgroundMatching";

  public BackgroundMatchingModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @NonNull
  @Override
  public String getName() {
    return NAME;
  }

  @ReactMethod
  public void start(ReadableMap options) {
    ReactApplicationContext ctx = getReactApplicationContext();

    Intent i = new Intent(ctx, MatchingForegroundService.class);
    i.setAction(MatchingForegroundService.ACTION_START);

    if (options != null) {
      if (options.hasKey("baseUrl") && !options.isNull("baseUrl")) {
        i.putExtra("base_url", options.getString("baseUrl"));
      }
      if (options.hasKey("accessToken") && !options.isNull("accessToken")) {
        i.putExtra("access_token", options.getString("accessToken"));
      }
      if (options.hasKey("intervalMs") && !options.isNull("intervalMs")) {
        i.putExtra("interval_ms", (long) options.getDouble("intervalMs"));
      }
      if (options.hasKey("radiusKm") && !options.isNull("radiusKm")) {
        i.putExtra("radius_km", options.getDouble("radiusKm"));
      }
      // iOS와 동일한 "동의 ON 직후 알림 윈도우" 지원용
      if (options.hasKey("consentEnabledAtMs") && !options.isNull("consentEnabledAtMs")) {
        i.putExtra("consent_enabled_at_ms", (long) options.getDouble("consentEnabledAtMs"));
      }
      if (options.hasKey("consentWindowMs") && !options.isNull("consentWindowMs")) {
        i.putExtra("consent_window_ms", (long) options.getDouble("consentWindowMs"));
      }
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      ContextCompat.startForegroundService(ctx, i);
    } else {
      ctx.startService(i);
    }
  }

  @ReactMethod
  public void stop() {
    ReactApplicationContext ctx = getReactApplicationContext();
    Intent i = new Intent(ctx, MatchingForegroundService.class);
    i.setAction(MatchingForegroundService.ACTION_STOP);
    ctx.startService(i);
  }
}

