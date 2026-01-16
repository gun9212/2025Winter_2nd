# 📱 화면 잠금 상태 위치 추적 가이드

## 🔒 화면 잠금 시 위치 추적 - 상세 분석

### 상황 정의
```
화면 잠금 = 사용자가 전원 버튼을 눌러 화면이 꺼진 상태
- 앱은 여전히 실행 중 (백그라운드)
- 앱이 메모리에서 제거되지 않음
- 시스템이 배터리 절약 모드 진입
```

---

## 📊 iOS - 화면 잠금 시 동작

### ✅ 가능한 것

#### 1. **Significant Location Changes (권장)**
```swift
// 500m 이상 이동 시에만 업데이트
- 화면 잠금: ✅ 작동
- 배터리 소모: 🟢 낮음 (1-2%/시간)
- 정확도: ⚠️ 낮음 (500m 이상 이동 시에만)
- 사용 사례: 대략적인 위치 추적
```

**코드 예시:**
```javascript
import BackgroundGeolocation from 'react-native-background-geolocation';

BackgroundGeolocation.ready({
  desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_LOW,
  distanceFilter: 500, // 500m
  useSignificantChangesOnly: true, // iOS: Significant Changes API 사용
  
  // 화면 잠금 시에도 작동
  pausesLocationUpdatesAutomatically: false,
  locationAuthorizationRequest: 'Always',
});
```

**실제 동작:**
```
00:00 - 화면 잠금
00:05 - 사용자 이동 시작
00:10 - 100m 이동 → ❌ 업데이트 없음
00:15 - 300m 이동 → ❌ 업데이트 없음
00:20 - 600m 이동 → ✅ 위치 업데이트!
```

#### 2. **Standard Location Updates (제한적)**
```swift
// 지속적인 위치 추적
- 화면 잠금: ⚠️ 제한적 작동
- 배터리 소모: 🔴 높음 (5-10%/시간)
- 정확도: 🟢 높음
- 제약: iOS가 자동으로 빈도 조절
```

**실제 동작:**
```
[화면 켜짐]
📍 10초마다 업데이트 (설정대로)
00:00 - 위치 업데이트
00:10 - 위치 업데이트
00:20 - 위치 업데이트

[화면 잠금]
📍 iOS가 자동으로 간격 증가
00:30 - 위치 업데이트
01:00 - 위치 업데이트 (30초 후)
02:00 - 위치 업데이트 (1분 후)
05:00 - 위치 업데이트 (3분 후)
...
```

### ❌ 제약사항

1. **배터리 절약 모드**
```
iOS가 자동으로:
- 업데이트 빈도 감소
- 정확도 자동 조절
- 불필요한 업데이트 건너뛰기
```

2. **Low Power Mode (저전력 모드)**
```
사용자가 활성화 시:
- 위치 업데이트 거의 중단
- Significant Changes만 작동
```

---

## 🤖 Android - 화면 잠금 시 동작

### ✅ 가능한 것

#### 1. **Foreground Service (권장)**
```java
// 알림 표시하면서 계속 실행
- 화면 잠금: ✅ 완전 작동
- 배터리 소모: 🟡 중간 (3-7%/시간)
- 정확도: 🟢 높음
- 요구사항: 지속적인 알림 표시
```

**코드 예시:**
```javascript
BackgroundGeolocation.ready({
  // Android Foreground Service 설정
  foregroundService: true,
  notification: {
    title: "이상형 매칭 활성",
    text: "주변에서 이상형을 찾고 있습니다",
    priority: BackgroundGeolocation.NOTIFICATION_PRIORITY_LOW,
    // 작은 아이콘으로 눈에 덜 띄게
    smallIcon: "ic_notification_small"
  },
  
  // 위치 업데이트 설정
  locationUpdateInterval: 60000, // 1분마다
  fastestLocationUpdateInterval: 30000, // 최소 30초
});
```

**실제 동작:**
```
[화면 켜짐]
🔔 알림: "이상형 매칭 활성"
📍 1분마다 위치 업데이트

[화면 잠금]
🔔 알림 유지 (상태바에 계속 표시)
📍 1분마다 위치 업데이트 (계속 작동!) ✅
```

#### 2. **Doze 모드 제약**
```
화면 잠금 후 시간 경과:
0-30분: ✅ 정상 작동
30-60분: ⚠️ 제한적 (1-2분 간격)
1시간+: 🔴 Doze 모드 진입
```

**Doze 모드 동작:**
```
[Doze 모드 진입]
앱이 "유지 관리 창"에서만 작동:
- 첫 1시간: 15분마다 1번
- 2시간 후: 30분마다 1번
- 4시간 후: 1시간마다 1번

[Foreground Service는 예외]
→ Doze 모드에서도 제한적으로 작동 ✅
```

---

## 🔋 배터리 소모 비교

### iOS (화면 잠금 상태, 8시간 측정)

| 모드 | 업데이트 빈도 | 배터리 소모 | 정확도 |
|------|--------------|------------|--------|
| Significant Changes | 500m+ 이동 시 | 5-10% | 낮음 |
| Standard (High) | 시스템 조절 (1-5분) | 20-30% | 높음 |
| Standard (Low) | 시스템 조절 (5-15분) | 10-15% | 중간 |

### Android (화면 잠금 상태, 8시간 측정)

| 모드 | 업데이트 빈도 | 배터리 소모 | 정확도 |
|------|--------------|------------|--------|
| Foreground Service | 설정대로 (1분) | 25-35% | 높음 |
| Foreground Service | 설정대로 (5분) | 15-20% | 높음 |
| Doze 제외 | 시스템 조절 | 30-40% | 중간 |

---

## 🎯 실전 전략: 3단계 접근법

### **Level 1: 앱 실행 중 (화면 켜짐)**
```javascript
설정: 고빈도, 고정확도
- 업데이트: 10초마다
- 정확도: HIGH (GPS)
- 배터리: 신경 안씀 (사용자가 보는 중)

BackgroundGeolocation.changePace(true); // 고빈도 모드
```

### **Level 2: 백그라운드 (화면 잠금)**
```javascript
설정: 중빈도, 중정확도
- 업데이트: 1-5분마다
- 정확도: MEDIUM
- 배터리: 절약 모드

BackgroundGeolocation.changePace(false); // 절약 모드
```

### **Level 3: 장시간 화면 잠금**
```javascript
설정: 저빈도, Significant Changes
- 업데이트: 500m+ 이동 시
- 정확도: LOW
- 배터리: 최대 절약

// iOS: Significant Changes 자동 전환
// Android: WorkManager로 주기적 체크
```

---

## 💡 현실적인 구현 예시

```javascript
import BackgroundGeolocation from 'react-native-background-geolocation';
import { AppState } from 'react-native';

class LocationManager {
  constructor() {
    this.appState = AppState.currentState;
    this.setupBackgroundLocation();
    this.setupAppStateListener();
  }

  setupBackgroundLocation() {
    BackgroundGeolocation.ready({
      // 기본 설정
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_MEDIUM,
      distanceFilter: 50,
      
      // 화면 잠금 대응
      stopOnTerminate: false,
      startOnBoot: true,
      
      // iOS 설정
      pausesLocationUpdatesAutomatically: false,
      locationAuthorizationRequest: 'Always',
      
      // Android 설정
      foregroundService: true,
      notification: {
        title: "이상형 매칭",
        text: "백그라운드에서 실행 중",
        priority: BackgroundGeolocation.NOTIFICATION_PRIORITY_MIN,
      },
      
      // 적응형 빈도
      locationUpdateInterval: 300000, // 기본 5분
      
      // 서버 전송
      url: 'https://your-server.com/api/location',
      autoSync: true,
    }, (state) => {
      if (!state.enabled) {
        BackgroundGeolocation.start();
      }
    });

    // 위치 업데이트 리스너
    BackgroundGeolocation.onLocation(this.handleLocationUpdate);
  }

  setupAppStateListener() {
    AppState.addEventListener('change', (nextAppState) => {
      if (this.appState.match(/inactive|background/) && 
          nextAppState === 'active') {
        // 앱이 포어그라운드로 돌아옴
        console.log('📱 앱 활성화 - 고빈도 모드');
        this.setHighFrequency();
      } else if (nextAppState.match(/inactive|background/)) {
        // 앱이 백그라운드로 감
        console.log('🔒 백그라운드 - 절약 모드');
        this.setLowFrequency();
      }
      this.appState = nextAppState;
    });
  }

  setHighFrequency() {
    // 포어그라운드: 10초마다, 높은 정확도
    BackgroundGeolocation.setConfig({
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
      locationUpdateInterval: 10000,
      distanceFilter: 10,
    });
  }

  setLowFrequency() {
    // 백그라운드: 5분마다, 중간 정확도
    BackgroundGeolocation.setConfig({
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_MEDIUM,
      locationUpdateInterval: 300000,
      distanceFilter: 50,
    });
  }

  handleLocationUpdate = (location) => {
    console.log('📍 위치 업데이트:', {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: new Date(location.timestamp).toLocaleString(),
      isMoving: location.is_moving,
      battery: location.battery.level,
    });

    // 서버로 자동 전송 (autoSync: true)
  };
}

export default new LocationManager();
```

---

## ⚠️ 사용자 경험 고려사항

### **1. 배터리 불만 방지**
```javascript
// 배터리 레벨 체크
BackgroundGeolocation.onLocation((location) => {
  const batteryLevel = location.battery.level;
  
  if (batteryLevel < 0.20) { // 20% 미만
    // 초절약 모드
    BackgroundGeolocation.setConfig({
      useSignificantChangesOnly: true, // iOS
      locationUpdateInterval: 900000, // 15분
    });
    
    // 사용자에게 알림
    notificationService.showInfo(
      '배터리 절약을 위해 위치 업데이트 빈도를 줄였습니다.'
    );
  }
});
```

### **2. 투명한 안내**
```javascript
// 설정 화면에 명시
"백그라운드 위치 추적 설정"
┌──────────────────────────────┐
│ ⚡ 실시간 모드               │
│ 배터리: 높음 (30%/일)        │
│ 정확도: 매우 높음             │
│                              │
│ 🔋 절약 모드 (권장)         │
│ 배터리: 중간 (15%/일)        │
│ 정확도: 높음                 │
│                              │
│ 🌙 최소 모드                │
│ 배터리: 낮음 (5%/일)         │
│ 정확도: 보통                 │
└──────────────────────────────┘
```

---

## 🎯 결론

### **화면 잠금 상태 위치 추적:**

✅ **가능합니다!**
- iOS: Significant Changes (500m+) 또는 제한적 Standard
- Android: Foreground Service 사용 시 완전 가능

⚠️ **하지만 제약이 있습니다:**
- 배터리 소모 큼 (15-35%/일)
- 시스템이 자동 조절
- 100% 실시간은 아님

💡 **권장 전략:**
1. **앱 실행 중**: 10초마다 실시간
2. **화면 잠금**: 5분마다 제한적
3. **장시간 잠금**: Significant Changes (500m+)
4. **서버**: 마지막 위치 캐싱 + 푸시 알림

이 조합으로 **배터리 효율**과 **매칭 효과**의 균형을 맞출 수 있습니다! 🚀
