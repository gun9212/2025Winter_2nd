# 백그라운드 GPS 데이터 수집 활성화 가이드

## 문제
iOS에서 앱이 백그라운드로 전환되면 위치 업데이트가 중단됩니다.

## 원인
iOS는 배터리 절약을 위해 백그라운드에서 JavaScript 실행을 제한하며, `allowsBackgroundLocationUpdates`와 `pausesLocationUpdatesAutomatically` 설정이 필요합니다.

## 해결 방법

### 1. 네이티브 모듈 추가 (완료)
다음 파일이 추가되었습니다:
- `ios/IdealMatchApp/LocationConfigModule.h`
- `ios/IdealMatchApp/LocationConfigModule.m`
- `ios/IdealMatchApp/AppDelegate.mm` (수정됨)

### 2. Xcode에서 파일 추가

1. Xcode에서 `IdealMatchApp.xcworkspace` 열기:
   ```bash
   cd /Users/geon/Molip/2025Winter_2nd/Frontend/IdealMatchApp/ios
   open IdealMatchApp.xcworkspace
   ```

2. 왼쪽 프로젝트 네비게이터에서 `IdealMatchApp` 폴더 우클릭
3. **Add Files to "IdealMatchApp"** 선택
4. 다음 파일 선택 후 **Add** 클릭:
   - `LocationConfigModule.h`
   - `LocationConfigModule.m`
5. **Copy items if needed** 체크 해제 (이미 폴더에 있음)
6. **Add to targets**: IdealMatchApp 체크

### 3. 빌드 및 실행

```bash
# 1. Metro 서버 시작 (새 터미널)
cd /Users/geon/Molip/2025Winter_2nd/Frontend/IdealMatchApp
npm start

# 2. iOS 빌드 (새 터미널)
cd /Users/geon/Molip/2025Winter_2nd/Frontend/IdealMatchApp
npx react-native run-ios
```

또는 Xcode에서:
1. 상단 메뉴: Product > Build (⌘+B)
2. Product > Run (⌘+R)

### 4. 위치 권한 설정

앱 실행 시 위치 권한을 **항상 허용**으로 설정해야 합니다:
1. 앱 설치 후 위치 권한 요청 시: **앱 사용 중에만 허용** 선택
2. iOS 설정 > 개인 정보 보호 > 위치 서비스 > IdealMatchApp
3. **항상** 선택 (백그라운드 위치 업데이트 필수)

### 5. 테스트

백그라운드 위치 업데이트 테스트:
1. 앱 실행
2. 홈 버튼 눌러 백그라운드로 전환
3. 실제로 이동 (위치 변경)
4. 백엔드 로그에서 위치 업데이트 확인

예상 로그:
```
✅ 백그라운드 위치 업데이트 설정 완료
   - allowsBackgroundLocationUpdates: YES
   - pausesLocationUpdatesAutomatically: NO
📍 네이티브 위치 업데이트: lat=36.367710, lon=127.365080
```

### 6. 주의사항

1. **배터리 소모**: 백그라운드 위치 업데이트는 배터리를 소모합니다.
2. **사용자 신뢰**: 상단 바에 파란색 위치 표시기가 나타나므로 사용자가 인지할 수 있습니다.
3. **실제 이동 필요**: 위치가 변경되지 않으면 업데이트가 없을 수 있습니다.

## 변경 사항

### Info.plist (이미 설정됨)
- `UIBackgroundModes`: `location` 포함
- `NSLocationAlwaysAndWhenInUseUsageDescription`: 권한 설명

### 네이티브 모듈
- `allowsBackgroundLocationUpdates = YES`: 백그라운드 위치 업데이트 허용
- `pausesLocationUpdatesAutomatically = NO`: 자동 일시정지 방지
- `showsBackgroundLocationIndicator = YES`: 사용자에게 위치 수집 표시

### JavaScript
- `LocationService`: 네이티브 모듈 호출 추가
- `AppDelegate.mm`: 백그라운드 위치 설정 활성화

## 문제 해결

### 빌드 오류
```bash
# 캐시 정리 및 재빌드
cd ios
rm -rf build/
pod install
cd ..
npx react-native run-ios
```

### 위치 업데이트 안 됨
1. 위치 권한이 **항상 허용**인지 확인
2. Info.plist에 `UIBackgroundModes`에 `location`이 있는지 확인
3. Xcode에서 Capability > Background Modes > Location updates 체크
4. 실제로 이동하는지 확인 (시뮬레이터는 위치 변경 시뮬레이션 필요)

### 모듈 찾을 수 없음
```
LocationConfigModule이 없습니다
```
→ Xcode에서 파일 추가 후 재빌드 필요
