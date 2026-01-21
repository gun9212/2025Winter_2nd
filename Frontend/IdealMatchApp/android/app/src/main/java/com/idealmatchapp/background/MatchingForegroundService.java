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
import android.os.Handler;
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
import java.util.HashSet;
import java.util.Set;
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
  private static final String KEY_LAST_ACTIVE_COUNT = "last_active_count";
  // iOS와 동일한 "동의 ON 직후 알림 윈도우" 상태
  private static final String KEY_CONSENT_ENABLED_AT_MS = "consent_enabled_at_ms";
  private static final String KEY_CONSENT_WINDOW_MS = "consent_window_ms";
  private static final String KEY_CONSENT_NOTIFICATION_SENT = "consent_notification_sent";

  private static final String SERVICE_CHANNEL_ID = "matching-service";
  private static final String MATCH_CHANNEL_ID = "match-notifications";
  private static final int SERVICE_NOTIFICATION_ID = 2001;
  private static final int MATCH_NOTIFICATION_ID = 2002;
  private static final int COUNT_NOTIFICATION_ID = 2003;

  private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

  private final OkHttpClient http = new OkHttpClient();
  private final ExecutorService executor = Executors.newSingleThreadExecutor();

  private FusedLocationProviderClient fusedLocationClient;
  private LocationCallback locationCallback;

  private volatile String baseUrl;
  private volatile String accessToken;
  private volatile long intervalMs = 60000L; // default 1 min
  private volatile double radiusKm = 0.05;  // default 50m

  // 동의 ON 직후 알림 윈도우 (iOS parity)
  private volatile long consentEnabledAtMs = 0L;
  private volatile long consentWindowMs = 30000L;
  private volatile boolean consentNotificationSent = false;

  // 중복 알림 방지 (iOS: notifiedMatchesRef 대응)
  private final Set<String> notifiedKeys = new HashSet<>();

  private volatile long lastTickMs = 0L;

  private static final class MatchCheckResult {
    final boolean hasNewMatch;
    final JSONObject latestMatch;
    final long matchId;
    final long user1Id;
    final long user2Id;
    final double distanceM;
    final int matchScore;

    MatchCheckResult(
        boolean hasNewMatch,
        JSONObject latestMatch,
        long matchId,
        long user1Id,
        long user2Id,
        double distanceM,
        int matchScore) {
      this.hasNewMatch = hasNewMatch;
      this.latestMatch = latestMatch;
      this.matchId = matchId;
      this.user1Id = user1Id;
      this.user2Id = user2Id;
      this.distanceM = distanceM;
      this.matchScore = matchScore;
    }
  }

  private static final class FatalServiceException extends Exception {
    final int statusCode;

    FatalServiceException(int statusCode, String message) {
      super(message);
      this.statusCode = statusCode;
    }
  }

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
        // 설정이 불완전하면(토큰/URL 없음) 재시작하지 않음
        if (baseUrl == null || baseUrl.isEmpty() || accessToken == null || accessToken.isEmpty()) {
          setEnabledInPrefs(false);
          stopSelf();
          return START_NOT_STICKY;
        }
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
    long consentAt = intent.getLongExtra(KEY_CONSENT_ENABLED_AT_MS, consentEnabledAtMs);
    long consentWindow = intent.getLongExtra(KEY_CONSENT_WINDOW_MS, consentWindowMs);
    boolean consentSent = intent.getBooleanExtra(KEY_CONSENT_NOTIFICATION_SENT, consentNotificationSent);

    if (b != null && !b.trim().isEmpty()) baseUrl = b.trim();
    if (t != null && !t.trim().isEmpty()) accessToken = t.trim();
    if (i > 1000L) intervalMs = i;
    if (r > 0) radiusKm = r;

    consentEnabledAtMs = Math.max(0L, consentAt);
    if (consentWindow > 0) consentWindowMs = consentWindow;

    // 윈도우 시작 시점이 들어오면, iOS처럼 알림 기록/윈도우 상태를 초기화
    if (consentEnabledAtMs > 0L) {
      consentNotificationSent = false;
      notifiedKeys.clear();
    } else {
      consentNotificationSent = consentSent;
    }
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
                    MatchCheckResult matchCheck = checkMatchDetailed(lat, lon, radiusKm);
                    maybeNotifyMatchFromCheck(matchCheck);

                    // ✅ count 증가 알림도 Foreground Service에서 처리(백그라운드에서도 동작)
                    // - JS가 백그라운드에서 멈추는 경우에도 count 증가 알림이 뜨도록 보조 채널로 추가
                    int activeCount = fetchActiveMatchCount(lat, lon, 0.01 /* 10m */);
                    if (activeCount >= 0) {
                      maybeNotifyCountIncrease(activeCount);
                    }
                  } catch (FatalServiceException fatal) {
                    // 토큰 만료/동의 OFF/이메일 미인증 등: iOS와 동일하게 백그라운드 매칭을 중지
                    shutdownService();
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
        int code = response.code();
        if (code == 401 || code == 403) {
          throw new FatalServiceException(code, "location update rejected");
        }
        return; // other errors are ignored
      }
    }
  }

  private MatchCheckResult checkMatchDetailed(double lat, double lon, double radiusKm) throws Exception {
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
      if (!response.isSuccessful()) {
        int code = response.code();
        if (code == 401 || code == 403) {
          throw new FatalServiceException(code, "match check rejected");
        }
        return new MatchCheckResult(false, null, -1L, 0L, 0L, 0d, 0);
      }
      String body = response.body() != null ? response.body().string() : null;
      if (body == null || body.isEmpty()) return new MatchCheckResult(false, null, -1L, 0L, 0L, 0d, 0);
      JSONObject json = new JSONObject(body);
      boolean hasNew = json.optBoolean("has_new_match", false);
      JSONObject latest = json.optJSONObject("latest_match");

      long matchId = -1L;
      long user1Id = 0L;
      long user2Id = 0L;
      double distanceM = 0d;
      int matchScore = 0;

      if (latest != null) {
        matchId = latest.optLong("id", -1L);
        JSONObject u1 = latest.optJSONObject("user1");
        JSONObject u2 = latest.optJSONObject("user2");
        if (u1 != null) user1Id = u1.optLong("id", 0L);
        if (u2 != null) user2Id = u2.optLong("id", 0L);

        JSONObject criteria = latest.optJSONObject("matched_criteria");
        if (criteria != null) {
          distanceM = criteria.optDouble("distance_m", 0d);
          matchScore = criteria.optInt("match_score", 0);
        }
      }

      return new MatchCheckResult(hasNew, latest, matchId, user1Id, user2Id, distanceM, matchScore);
    } catch (IOException ioe) {
      return new MatchCheckResult(false, null, -1L, 0L, 0L, 0d, 0);
    }
  }

  private int fetchActiveMatchCount(double lat, double lon, double maxDistanceKm) throws Exception {
    String url =
        baseUrl
            + "/matching/active-count/?latitude="
            + round6(lat)
            + "&longitude="
            + round6(lon)
            + "&max_distance="
            + maxDistanceKm;

    Request request =
        new Request.Builder()
            .url(url)
            .addHeader("Authorization", "Bearer " + accessToken)
            .addHeader("X-App-State", "background")
            .get()
            .build();

    try (Response response = http.newCall(request).execute()) {
      if (!response.isSuccessful()) {
        int code = response.code();
        if (code == 401 || code == 403) {
          throw new FatalServiceException(code, "active-count rejected");
        }
        return -1;
      }
      String body = response.body() != null ? response.body().string() : null;
      if (body == null || body.isEmpty()) return -1;
      JSONObject json = new JSONObject(body);
      JSONObject data = json.has("data") && json.get("data") instanceof JSONObject ? json.getJSONObject("data") : json;
      return data.optInt("count", 0);
    } catch (IOException ioe) {
      return -1;
    }
  }

  /**
   * iOS(JS)의 알림 조건을 Android 서비스에서도 동일하게 적용
   * - latest_match가 있고,
   *   (1) has_new_match=true 이거나
   *   (2) 동의 ON 직후(consentWindowMs)이며 아직 동의-윈도우 알림을 보내지 않았을 때 -> 1회 알림 허용
   * - 중복 알림 방지: isNewMatch=false일 때만 matchId/userPairId 기반으로 1회로 제한
   */
  private void maybeNotifyMatchFromCheck(MatchCheckResult check) {
    if (check == null || check.latestMatch == null) return;

    long now = System.currentTimeMillis();
    boolean withinConsentWindow =
        consentEnabledAtMs > 0L && (now - consentEnabledAtMs) >= 0L && (now - consentEnabledAtMs) < consentWindowMs;

    boolean shouldShow = check.hasNewMatch || (withinConsentWindow && !consentNotificationSent);
    if (!shouldShow) return;

    String matchKey = buildMatchKey(check.matchId, check.user1Id, check.user2Id);
    String pairKey = buildUserPairKey(check.user1Id, check.user2Id);

    boolean isTrulyNewMatch = check.hasNewMatch;
    if (!isTrulyNewMatch) {
      if (isAlreadyNotified(matchKey, pairKey)) {
        if (withinConsentWindow) {
          clearConsentWindow();
        }
        return;
      }
    }

    notifyMatchSafe();
    markNotified(matchKey, pairKey);

    if (withinConsentWindow) {
      clearConsentWindow();
    }
  }

  private boolean isAlreadyNotified(String matchKey, String pairKey) {
    if (matchKey != null && notifiedKeys.contains(matchKey)) return true;
    return pairKey != null && notifiedKeys.contains(pairKey);
  }

  private void markNotified(String matchKey, String pairKey) {
    if (matchKey != null) notifiedKeys.add(matchKey);
    if (pairKey != null) notifiedKeys.add(pairKey);
  }

  private void clearConsentWindow() {
    consentEnabledAtMs = 0L;
    consentNotificationSent = true;
    prefs()
        .edit()
        .putLong(KEY_CONSENT_ENABLED_AT_MS, consentEnabledAtMs)
        .putLong(KEY_CONSENT_WINDOW_MS, consentWindowMs)
        .putBoolean(KEY_CONSENT_NOTIFICATION_SENT, consentNotificationSent)
        .apply();
  }

  private String buildMatchKey(long matchId, long user1Id, long user2Id) {
    if (matchId > 0) return "m:" + matchId;
    return buildUserPairKey(user1Id, user2Id);
  }

  private String buildUserPairKey(long user1Id, long user2Id) {
    if (user1Id <= 0 || user2Id <= 0) return null;
    long a = Math.min(user1Id, user2Id);
    long b = Math.max(user1Id, user2Id);
    return "p:" + a + "_" + b;
  }

  private void notifyMatchSafe() {
    try {
      notifyMatch();
    } catch (SecurityException se) {
      // Android 13+ POST_NOTIFICATIONS 미허용 등: 알림을 못 띄우면 무시
    } catch (Exception ignored) {
    }
  }

  private void shutdownService() {
    try {
      setEnabledInPrefs(false);
    } catch (Exception ignored) {
    }
    try {
      stopLocationUpdates();
    } catch (Exception ignored) {
    }

    new Handler(Looper.getMainLooper())
        .post(
            () -> {
              try {
                stopForeground(true);
              } catch (Exception ignored) {
              }
              stopSelf();
            });
  }

  private void maybeNotifyCountIncrease(int newCount) {
    try {
      SharedPreferences p = prefs();
      int prev = p.getInt(KEY_LAST_ACTIVE_COUNT, -1);

      // 첫 관측은 기준값만 저장 (초기 스팸 방지)
      if (prev < 0) {
        p.edit().putInt(KEY_LAST_ACTIVE_COUNT, newCount).apply();
        return;
      }

      if (newCount > prev) {
        p.edit().putInt(KEY_LAST_ACTIVE_COUNT, newCount).apply();
        notifyCountIncrease(prev, newCount);
      } else if (newCount != prev) {
        p.edit().putInt(KEY_LAST_ACTIVE_COUNT, newCount).apply();
      }
    } catch (Exception ignored) {
    }
  }

  private void notifyCountIncrease(int previousCount, int newCount) {
    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm == null) return;

    Notification n =
        new NotificationCompat.Builder(this, MATCH_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("📈 매칭 가능 인원 증가!")
            .setContentText("주변에 매칭 가능한 인원이 " + previousCount + "명에서 " + newCount + "명으로 증가했습니다!")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build();

    nm.notify(COUNT_NOTIFICATION_ID, n);
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
    match.enableVibration(true);
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
        .putLong(KEY_CONSENT_ENABLED_AT_MS, consentEnabledAtMs)
        .putLong(KEY_CONSENT_WINDOW_MS, consentWindowMs)
        .putBoolean(KEY_CONSENT_NOTIFICATION_SENT, consentNotificationSent)
        .apply();
  }

  private void restoreConfigFromPrefs() {
    SharedPreferences p = prefs();
    baseUrl = p.getString(KEY_BASE_URL, baseUrl);
    accessToken = p.getString(KEY_ACCESS_TOKEN, accessToken);
    intervalMs = p.getLong(KEY_INTERVAL_MS, intervalMs);
    consentEnabledAtMs = p.getLong(KEY_CONSENT_ENABLED_AT_MS, consentEnabledAtMs);
    consentWindowMs = p.getLong(KEY_CONSENT_WINDOW_MS, consentWindowMs);
    consentNotificationSent = p.getBoolean(KEY_CONSENT_NOTIFICATION_SENT, consentNotificationSent);
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

