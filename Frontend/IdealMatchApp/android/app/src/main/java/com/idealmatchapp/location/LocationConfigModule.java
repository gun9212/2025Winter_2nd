package com.idealmatchapp.location;

import android.Manifest;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.gms.tasks.CancellationTokenSource;

/**
 * Android 네이티브 위치 엔진 (iOS 4-A 대응)
 * - JS는 NativeEventEmitter로 locationUpdated 이벤트를 구독
 * - start/stop/getCurrentLocation/configure 제공
 *
 * 주의:
 * - 권한 요청 UI는 JS에서 처리하는 것을 권장 (Android 정책/UX)
 * - 이 모듈은 "프로세스가 살아있는 동안" 위치를 스트리밍함.
 *   백그라운드 장시간 안정 동작은 Foreground Service(이미 프로젝트에 존재)를 권장.
 */
public class LocationConfigModule extends ReactContextBaseJavaModule {
  private static final String NAME = "LocationConfigModule";

  private final ReactApplicationContext reactContext;
  private final FusedLocationProviderClient fusedLocationClient;

  private boolean isRunning = false;
  private long intervalMs = 5000L;
  private long fastestIntervalMs = 5000L;
  private float distanceFilterMeters = 0f;
  private int priority = Priority.PRIORITY_HIGH_ACCURACY;

  private LocationCallback locationCallback;
  private int listenerCount = 0;

  public LocationConfigModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
    this.fusedLocationClient = LocationServices.getFusedLocationProviderClient(reactContext);
    setupLocationCallback();
  }

  @NonNull
  @Override
  public String getName() {
    return NAME;
  }

  // React Native NativeEventEmitter 호환 (경고 제거용)
  @ReactMethod
  public void addListener(String eventName) {
    listenerCount++;
  }

  @ReactMethod
  public void removeListeners(double count) {
    listenerCount = Math.max(0, listenerCount - (int) count);
  }

  private boolean hasLocationPermission() {
    boolean fine =
        ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;
    boolean coarse =
        ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_COARSE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;
    return fine || coarse;
  }

  private void sendEvent(String name, WritableMap body) {
    reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
        .emit(name, body);
  }

  private void emitAuthorizationChanged() {
    WritableMap body = Arguments.createMap();
    body.putBoolean("hasLocationPermission", hasLocationPermission());

    // background permission은 Android 10+(API 29)부터 의미가 있음
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      boolean bg =
          ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
              == PackageManager.PERMISSION_GRANTED;
      body.putBoolean("hasBackgroundLocationPermission", bg);
    } else {
      body.putBoolean("hasBackgroundLocationPermission", true);
    }

    sendEvent("authorizationChanged", body);
  }

  private void emitLocationError(String message) {
    WritableMap body = Arguments.createMap();
    body.putString("message", message);
    sendEvent("locationError", body);
  }

  private WritableMap toPayload(Location location) {
    WritableMap payload = Arguments.createMap();
    payload.putDouble("latitude", location.getLatitude());
    payload.putDouble("longitude", location.getLongitude());
    payload.putDouble("accuracy", location.getAccuracy());
    payload.putDouble("timestamp", (double) location.getTime());
    return payload;
  }

  private void setupLocationCallback() {
    locationCallback =
        new LocationCallback() {
          @Override
          public void onLocationResult(LocationResult result) {
            if (result == null) return;
            Location location = result.getLastLocation();
            if (location == null) return;
            sendEvent("locationUpdated", toPayload(location));
          }
        };
  }

  private LocationRequest buildRequest() {
    return new LocationRequest.Builder(priority, intervalMs)
        .setMinUpdateIntervalMillis(fastestIntervalMs)
        .setMinUpdateDistanceMeters(distanceFilterMeters)
        .setWaitForAccurateLocation(false)
        .build();
  }

  @ReactMethod
  public void configure(ReadableMap options) {
    if (options == null) return;

    if (options.hasKey("intervalMs") && !options.isNull("intervalMs")) {
      intervalMs = (long) options.getDouble("intervalMs");
    }
    if (options.hasKey("fastestIntervalMs") && !options.isNull("fastestIntervalMs")) {
      fastestIntervalMs = (long) options.getDouble("fastestIntervalMs");
    }
    if (options.hasKey("distanceFilterMeters") && !options.isNull("distanceFilterMeters")) {
      distanceFilterMeters = (float) options.getDouble("distanceFilterMeters");
    }

    // iOS의 desiredAccuracy 문자열과 유사하게 맞춤
    if (options.hasKey("desiredAccuracy") && !options.isNull("desiredAccuracy")) {
      String acc = options.getString("desiredAccuracy");
      if ("best".equals(acc)) {
        priority = Priority.PRIORITY_HIGH_ACCURACY;
      } else if ("balanced".equals(acc)) {
        priority = Priority.PRIORITY_BALANCED_POWER_ACCURACY;
      } else {
        // default
        priority = Priority.PRIORITY_HIGH_ACCURACY;
      }
    }
  }

  @ReactMethod
  public void requestAlwaysAuthorization() {
    // Android는 네이티브에서 강제 권한 프롬프트를 띄우는 것이 권장되지 않음.
    // JS(PermissionsAndroid)에서 요청/유도 후, 여기서는 상태 이벤트만 제공.
    emitAuthorizationChanged();
  }

  // mode: "standard" | "significant"
  @ReactMethod
  public void start(ReadableMap options) {
    if (options != null && options.hasKey("mode") && !options.isNull("mode")) {
      String mode = options.getString("mode");
      if ("significant".equals(mode)) {
        // 배터리 절약 성향: 균형 정확도 + 상대적으로 긴 interval 권장
        priority = Priority.PRIORITY_BALANCED_POWER_ACCURACY;
      } else {
        priority = Priority.PRIORITY_HIGH_ACCURACY;
      }
    }

    if (!hasLocationPermission()) {
      emitAuthorizationChanged();
      emitLocationError("Location permission is missing.");
      return;
    }

    try {
      // 중복 시작 방지
      if (isRunning) {
        stop();
      }

      fusedLocationClient.requestLocationUpdates(buildRequest(), locationCallback, reactContext.getMainLooper());
      isRunning = true;
    } catch (SecurityException se) {
      emitLocationError(se.getMessage() != null ? se.getMessage() : "SecurityException");
    } catch (Exception e) {
      emitLocationError(e.getMessage() != null ? e.getMessage() : "Unknown error");
    }
  }

  @ReactMethod
  public void stop() {
    try {
      fusedLocationClient.removeLocationUpdates(locationCallback);
    } catch (Exception ignored) {
    } finally {
      isRunning = false;
    }
  }

  @ReactMethod
  public void getCurrentLocation(Promise promise) {
    if (!hasLocationPermission()) {
      emitAuthorizationChanged();
      promise.reject("E_PERMISSION", "Location permission is missing.");
      return;
    }

    try {
      CancellationTokenSource cts = new CancellationTokenSource();
      fusedLocationClient
          .getCurrentLocation(priority, cts.getToken())
          .addOnSuccessListener(
              location -> {
                if (location == null) {
                  promise.reject("E_LOCATION", "Location is null.");
                  return;
                }
                promise.resolve(toPayload(location));
              })
          .addOnFailureListener(
              e -> promise.reject("E_LOCATION", e.getMessage() != null ? e.getMessage() : "Location error", e));
    } catch (SecurityException se) {
      promise.reject("E_LOCATION", se.getMessage() != null ? se.getMessage() : "SecurityException", se);
    }
  }
}

