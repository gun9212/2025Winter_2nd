# Frontend

이상형 매칭 앱 **프론트엔드(React Native)** 프로젝트입니다. 실제 실행/설정은 `Frontend/IdealMatchApp` 기준으로 동작합니다.

## 프로젝트 개요

- **프로젝트명**: IdealMatchApp
- **프레임워크**: React Native 0.72.6 / React 18
- **주요 라이브러리**: React Navigation, AsyncStorage, Geolocation, Notifee(로컬 알림), Haptic Feedback, Vector Icons
- **백엔드 연동**: 기본 API prefix는 **`/api`** (예: `http://127.0.0.1:8000/api`)
- **플랫폼**: iOS/Android 코드가 모두 존재하나, 기능/권한 구성 특성상 **iOS 중심으로 개발·테스트**하는 것을 권장

## 주요 기능(코드 기준)

- ✅ ID/PW 로그인 (JWT Access/Refresh)
- ✅ 회원가입 + **이메일 인증(인증번호)**
- ✅ 비밀번호 재설정(이메일 인증번호 기반)
- ✅ 프로필 입력/수정 + 이상형(선호 조건) 입력/수정
- ✅ 위치 업데이트/추적(포그라운드/백그라운드)
- ✅ 매칭 상태 조회 및 알림(로컬 알림 + 진동)

## 디렉토리 구조

```
Frontend/
├── IdealMatchApp/                # React Native 앱
│   ├── src/                      # 앱 소스(실제 엔트리: src/App.js)
│   ├── ios/                      # iOS 네이티브(Info.plist, LocationConfigModule 등)
│   ├── android/                  # Android 네이티브(권한, Foreground Service 등)
│   ├── package.json              # npm scripts / 의존성
│   └── ... 
└── README.md                     # (현재 문서)
```

## 실행 방법

### 필수 요구사항

- Node.js **16+**
- iOS: Xcode, CocoaPods
- Android: Android Studio/SDK (선택)

### 설치

```bash
cd Frontend/IdealMatchApp
npm install
```

### iOS 실행

```bash
cd Frontend/IdealMatchApp
cd ios && pod install && cd ..
npm start
npm run ios
```

- iOS 초기 설정 스크립트(선택): `Frontend/IdealMatchApp/setup_ios_fixed.sh`

### Android 실행(선택)

```bash
cd Frontend/IdealMatchApp
npm start
npm run android
```

## API 설정(중요)

API 주소는 `Frontend/IdealMatchApp/src/constants/config.js`의 `CONFIG.API_BASE_URL`에서 결정됩니다.

- **개발 모드(`__DEV__ = true`)**
  - `USE_EC2_API_IN_DEV = true`이면 EC2를 사용
  - 아니면 플랫폼/환경에 따라 로컬 주소를 사용
    - iOS 시뮬레이터: `http://127.0.0.1:8000/api` (※ `USE_SIMULATOR = true`일 때)
    - iOS 실기기(로컬 백엔드): `http://{LOCAL_IP}:8000/api` (같은 Wi‑Fi 필요)
    - Android 에뮬레이터: `http://10.0.2.2:8000/api`
- **프로덕션(`__DEV__ = false`)**: EC2(`EC2_API_BASE_URL`)

또한 이 프로젝트는 **HTTP(비암호화)** 통신을 전제로 하므로,

- iOS: `ios/IdealMatchApp/Info.plist`에 ATS 예외(HTTP 허용)가 포함되어 있어야 합니다.
- Android: `android/app/src/main/AndroidManifest.xml`에 `usesCleartextTraffic="true"`가 설정되어 있습니다.

### 개발용 플래그(선택)

아래 값들은 모두 `Frontend/IdealMatchApp/src/constants/config.js`에서 수정합니다.

- **`LOCAL_IP`**: iOS 실기기에서 로컬 백엔드로 붙을 때 사용(같은 Wi‑Fi 필요)
- **`USE_SIMULATOR`**: iOS 시뮬레이터면 `true`로 두고 `127.0.0.1` 경로 사용
- **`USE_EC2_API_IN_DEV`**: 개발 모드에서도 EC2를 쓰고 싶으면 `true`
- **`USE_MOCK_LOCATION`**: 실제 GPS 대신 테스트 위치를 쓰려면 `true`(기본은 `false`)
- **`CONFIG.TEST_USER_ID`**: (디버그 용도) 토큰이 없을 때 일부 요청에 `user_id`를 붙여 테스트할 수 있음  
  - 현재 기본값은 `null`이며, 실제 기기/프로덕션에서는 **로그인(JWT)** 이 필수입니다.

## 인증/토큰(JWT)

- 토큰 저장소: `@react-native-async-storage/async-storage` (`src/services/storage/storage.js`)
- API 클라이언트: `src/services/api/apiClient.js`
  - 요청 시 `Authorization: Bearer <access>` 자동 첨부
  - Access Token 만료 임박 시 사전 갱신 + 401 응답 시 자동 갱신/재시도
  - Refresh Token 만료 시 토큰/사용자 정보 정리 후 로그아웃 흐름으로 처리
  - 이메일 인증 미완료 계정은 로그인/일부 기능에서 차단될 수 있으며, 인증 완료 후 재로그인이 필요합니다.

## 위치(포그라운드/백그라운드)

- **JS 레벨 위치 접근**: `@react-native-community/geolocation`
- **네이티브 위치 엔진**: `LocationConfigModule` 이벤트(`locationUpdated`) 기반 구독
  - 구현 위치: `src/services/location/locationService.js`, `ios/LocationConfigModule.*`, `android/.../LocationConfigModule.java`
- iOS:
  - 권한 문구: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`
  - 백그라운드 모드: `UIBackgroundModes`에 `location` 포함

## 백그라운드 매칭(Android)

Android에는 Foreground Service 기반의 매칭 루프가 포함되어 있습니다.

- 네이티브 서비스: `android/.../background/MatchingForegroundService.java`
- JS 호출: `src/services/background/androidForegroundMatching.js`
  - `NativeModules.BackgroundMatching.start(...)` 사용
  - **로그인(Access Token 보유) + `CONFIG.API_BASE_URL` 설정**이 필수

## 알림

- **로컬 알림(권장/기본)**: `@notifee/react-native`
  - 구현: `src/services/notification/notificationService.js`
  - Android는 채널(`match-notifications`)을 생성합니다.
- **FCM 푸시**: 현재 Firebase 라이브러리를 사용하지 않도록 처리되어 있어 토큰이 `null`입니다.
  - 참고: `src/services/notification/fcmService.js` (stub)

## 화면/흐름(요약)

- 앱 엔트리: `IdealMatchApp/index.js` → `src/App.js`
  - `index.js`에서 Notifee 백그라운드 이벤트 핸들러도 등록합니다.
- 내비게이션: `src/navigation/RootNavigator.js`
  - 로그인 전: `Login` / `Signup` / `PasswordReset`
  - 로그인 후: `Main` + `ProfileInput` + `IdealTypeInput`

## 자주 쓰는 스크립트

`Frontend/IdealMatchApp/package.json`

- `npm start`: Metro 실행
- `npm run ios`: iOS 실행
- `npm run android`: Android 실행
- `npm run lint`: ESLint
- `npm test`: Jest (`__tests__/App.test.tsx`는 템플릿 `App.tsx`를 렌더링)

## 캐시/빌드 문제 해결

- Metro 캐시 정리: `Frontend/IdealMatchApp/clear_cache.sh`
  - 실행 후 `npm start -- --reset-cache` 권장
- 아이콘/빌드 캐시 강제 정리(주의: 삭제/클린 포함): `Frontend/IdealMatchApp/reset_icon_cache.sh`

