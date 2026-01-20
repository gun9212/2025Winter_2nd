package com.idealmatchapp.background;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.idealmatchapp.R;

import org.json.JSONObject;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Android Foreground Service:
 * - 위치 수집 (FusedLocationProvider)
 * - 서버로 위치 업데이트 + 매칭 체크
 * - 새 매칭이면 로컬 알림 표시
 */
public class MatchingForegroundService extends Service {
  public static final String ACTION_START = "com.idealmatchapp.matching.START";
  public static final String ACTION_STOP = "com.idealmatchapp.matching.STOP";
  public static final String ACTION_UPDATE = "com.idealmatchapp.matching.UPDATE";

  private static final String PREFS = "matching_service_prefs";
  private static final String KEY_ENABLED = "enabled";
  private static final String KEY_BASE_URL = "base_url";
  private static final String KEY_ACCESS_TOKEN = "access_token";
  private static final String KEY_INTERVAL_MS = "interval_ms";
  private static final String KEY_RADIUS_KM = "radius_km";

  private static final String SERVICE_CHANNEL_ID = "matching-service";
  private static final String MATCH_CHANNEL_ID = "match-notifications";
  private static final int SERVICE_NOTIFICATION_ID = 2001;
  private static final int MATCH_NOTIFICATION_ID = 2002;

  private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

  private final OkHttpClient http = new OkHttpClient();
  private final ExecutorService executor = Executors.newSingleThreadExecutor();

  private FusedLocationProviderClient fusedLocationClient;
  private LocationCallback locationCallback;

  private volatile String baseUrl;
  private volatile String accessToken;
  private volatile long intervalMs = 60000L; // default 1 min
  private volatile double radiusKm = 0.05;  // default 50m

  private volatile long lastTickMs = 0L;

  @Override
  public void onCreate() {
    super.onCreate();
    fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
    ensureChannels();
    setupLocationCallback();
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent == null) {
      // Restart after process kill (START_STICKY). Restore last config.
      restoreConfigFromPrefs();
      if (isEnabledInPrefs()) {
        startForeground(SERVICE_NOTIFICATION_ID, buildServiceNotification());
        startLocationUpdates();
      }
      return START_STICKY;
    }

    String action = intent.getAction();
    if (ACTION_STOP.equals(action)) {
      setEnabledInPrefs(false);
      stopLocationUpdates();
      stopForeground(true);
      stopSelf();
      return START_NOT_STICKY;
    }

    if (ACTION_START.equals(action) || ACTION_UPDATE.equals(action)) {
      applyExtras(intent);
      saveConfigToPrefs();
      setEnabledInPrefs(true);

      // Foreground service must post a notification quickly.
      startForeground(SERVICE_NOTIFICATION_ID, buildServiceNotification());
      startLocationUpdates();
      return START_STICKY;
    }

    return START_STICKY;
  }

  @Override
  public void onDestroy() {
    stopLocationUpdates();
    executor.shutdownNow();
    super.onDestroy();
  }

  @Nullable
  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  private void applyExtras(Intent intent) {
    String b = intent.getStringExtra(KEY_BASE_URL);
    String t = intent.getStringExtra(KEY_ACCESS_TOKEN);
    long i = intent.getLongExtra(KEY_INTERVAL_MS, intervalMs);
    double r = intent.getDoubleExtra(KEY_RADIUS_KM, radiusKm);

    if (b != null && !b.trim().isEmpty()) baseUrl = b.trim();
    if (t != null && !t.trim().isEmpty()) accessToken = t.trim();
    if (i > 1000L) intervalMs = i;
    if (r > 0) radiusKm = r;
  }

  private void setupLocationCallback() {
    locationCallback =
        new LocationCallback() {
          @Override
          public void onLocationResult(LocationResult locationResult) {
            if (locationResult == null) return;
            Location location = locationResult.getLastLocation();
            if (location == null) return;

            long now = System.currentTimeMillis();
            if (now - lastTickMs < intervalMs) {
              return; // debounce
            }
            lastTickMs = now;

            final double lat = location.getLatitude();
            final double lon = location.getLongitude();

            executor.submit(
                () -> {
                  try {
                    if (baseUrl == null || baseUrl.isEmpty()) return;
                    if (accessToken == null || accessToken.isEmpty()) return;

                    postLocationUpdate(lat, lon);
                    boolean hasNewMatch = checkMatch(lat, lon, radiusKm);
                    if (hasNewMatch) {
                      notifyMatch();
                    }
                  } catch (Exception e) {
                    // do not crash service
                    e.printStackTrace();
                  }
                });
          }
        };
  }

  private void startLocationUpdates() {
    try {
      LocationRequest request =
          new LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, intervalMs)
              .setMinUpdateIntervalMillis(Math.max(5000L, intervalMs / 2))
              .setWaitForAccurateLocation(false)
              .build();

      fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
    } catch (SecurityException se) {
      se.printStackTrace();
    }
  }

  private void stopLocationUpdates() {
    try {
      if (fusedLocationClient != null && locationCallback != null) {
        fusedLocationClient.removeLocationUpdates(locationCallback);
      }
    } catch (Exception ignored) {
    }
  }

  private void postLocationUpdate(double lat, double lon) throws Exception {
    JSONObject bodyJson = new JSONObject();
    bodyJson.put("latitude", round6(lat));
    bodyJson.put("longitude", round6(lon));

    RequestBody body = RequestBody.create(bodyJson.toString(), JSON);
    Request request =
        new Request.Builder()
            .url(baseUrl + "/users/location/update/")
            .addHeader("Content-Type", "application/json")
            .addHeader("Authorization", "Bearer " + accessToken)
            .post(body)
            .build();

    try (Response response = http.newCall(request).execute()) {
      if (!response.isSuccessful()) {
        // ignore, server might reject when consent is off, etc.
        return;
      }
    }
  }

  private boolean checkMatch(double lat, double lon, double radiusKm) throws Exception {
    String url =
        baseUrl
            + "/matching/check/?latitude="
            + round6(lat)
            + "&longitude="
            + round6(lon)
            + "&radius="
            + radiusKm;

    Request request =
        new Request.Builder()
            .url(url)
            .addHeader("Authorization", "Bearer " + accessToken)
            .addHeader("X-App-State", "background")
            .get()
            .build();

    try (Response response = http.newCall(request).execute()) {
      if (!response.isSuccessful()) return false;
      String body = response.body() != null ? response.body().string() : null;
      if (body == null || body.isEmpty()) return false;
      JSONObject json = new JSONObject(body);
      return json.optBoolean("has_new_match", false);
    } catch (IOException ioe) {
      return false;
    }
  }

  private void notifyMatch() {
    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm == null) return;

    Notification n =
        new NotificationCompat.Builder(this, MATCH_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("💝 매칭 성공!")
            .setContentText("주변에서 이상형을 발견했습니다! 두근두근 💓")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build();

    nm.notify(MATCH_NOTIFICATION_ID, n);
  }

  private Notification buildServiceNotification() {
    return new NotificationCompat.Builder(this, SERVICE_CHANNEL_ID)
        .setSmallIcon(R.drawable.ic_notification)
        .setContentTitle("이상형 매칭 활성")
        .setContentText("백그라운드에서 주변 이상형을 찾는 중입니다")
        .setOngoing(true)
        .setPriority(NotificationCompat.PRIORITY_MIN)
        .build();
  }

  private void ensureChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm == null) return;

    NotificationChannel svc =
        new NotificationChannel(SERVICE_CHANNEL_ID, "백그라운드 매칭", NotificationManager.IMPORTANCE_MIN);
    nm.createNotificationChannel(svc);

    // Match notification channel should match Notifee's channel id used in JS.
    NotificationChannel match =
        new NotificationChannel(MATCH_CHANNEL_ID, "매칭 알림", NotificationManager.IMPORTANCE_HIGH);
    nm.createNotificationChannel(match);
  }

  private SharedPreferences prefs() {
    return getSharedPreferences(PREFS, MODE_PRIVATE);
  }

  private void saveConfigToPrefs() {
    prefs()
        .edit()
        .putString(KEY_BASE_URL, baseUrl)
        .putString(KEY_ACCESS_TOKEN, accessToken)
        .putLong(KEY_INTERVAL_MS, intervalMs)
        .putString(KEY_RADIUS_KM, String.valueOf(radiusKm))
        .apply();
  }

  private void restoreConfigFromPrefs() {
    SharedPreferences p = prefs();
    baseUrl = p.getString(KEY_BASE_URL, baseUrl);
    accessToken = p.getString(KEY_ACCESS_TOKEN, accessToken);
    intervalMs = p.getLong(KEY_INTERVAL_MS, intervalMs);
    try {
      radiusKm = Double.parseDouble(p.getString(KEY_RADIUS_KM, String.valueOf(radiusKm)));
    } catch (Exception ignored) {
    }
  }

  private boolean isEnabledInPrefs() {
    return prefs().getBoolean(KEY_ENABLED, false);
  }

  private void setEnabledInPrefs(boolean enabled) {
    prefs().edit().putBoolean(KEY_ENABLED, enabled).apply();
  }

  private static double round6(double v) {
    return Math.round(v * 1_000_000d) / 1_000_000d;
  }
}

