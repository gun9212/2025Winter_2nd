# Xcode에 네이티브 모듈 파일 추가하기

## 백그라운드 GPS 활성화를 위한 네이티브 모듈 추가

### 1단계: Xcode 열기

```bash
cd /Users/geon/Molip/2025Winter_2nd/Frontend/IdealMatchApp/ios
open IdealMatchApp.xcworkspace
```

> ⚠️ **중요**: `.xcodeproj`가 아닌 `.xcworkspace`를 열어야 합니다!

### 2단계: 파일 추가

1. **왼쪽 프로젝트 네비게이터**에서 `IdealMatchApp` 폴더 찾기
   - 파란색 프로젝트 아이콘 아래 `IdealMatchApp` 폴더 (노란색 폴더 아이콘)
   - `AppDelegate.h`, `AppDelegate.mm`, `Info.plist` 등이 있는 폴더

2. `IdealMatchApp` 폴더 **우클릭** (또는 Control + 클릭)

3. **Add Files to "IdealMatchApp"** 선택

4. 파일 선택:
   - `LocationConfigModule.h` 선택
   - ⌘(Command) 키를 누른 채로 `LocationConfigModule.m` 선택
   - 두 파일이 모두 선택된 상태로 **Add** 클릭

5. 옵션 확인:
   - ✅ **Add to targets**: `IdealMatchApp` 체크 확인
   - ⬜ **Copy items if needed**: 체크 **해제** (파일이 이미 폴더에 있음)
   - **Add** 클릭

### 3단계: 파일 추가 확인

왼쪽 네비게이터에서 다음 파일이 보여야 합니다:
```
IdealMatchApp (폴더)
├── AppDelegate.h
├── AppDelegate.mm
├── LocationConfigModule.h     ← 새로 추가됨
├── LocationConfigModule.m     ← 새로 추가됨
├── Images.xcassets
├── Info.plist
├── LaunchScreen.storyboard
└── main.m
```

### 4단계: 빌드 및 실행

1. **Clean Build Folder** (권장):
   - 상단 메뉴: **Product** > **Clean Build Folder** (⇧⌘K)

2. **빌드**:
   - 상단 메뉴: **Product** > **Build** (⌘B)
   - 또는 왼쪽 상단 재생 버튼 옆 정지 버튼 클릭 후 재생 버튼 클릭

3. **실행**:
   - 상단 메뉴: **Product** > **Run** (⌘R)
   - 또는 왼쪽 상단 재생 버튼 클릭

### 5단계: 위치 권한 설정

앱 실행 후:

1. 위치 권한 요청 팝업:
   - **앱 사용 중에만 허용** 선택

2. iOS 설정 앱으로 이동:
   - 설정 > 개인 정보 보호 > 위치 서비스 > IdealMatchApp
   - **항상** 선택 (백그라운드 위치 업데이트 필수!)

### 6단계: 테스트

1. 앱 실행 상태에서 콘솔 확인:
   ```
   ✅ 백그라운드 위치 업데이트 설정 완료
      - allowsBackgroundLocationUpdates: YES
      - pausesLocationUpdatesAutomatically: NO
   ```

2. 홈 버튼 눌러 백그라운드로 전환

3. 실제로 이동 (위치 변경)

4. Xcode 콘솔에서 위치 업데이트 로그 확인:
   ```
   📍 네이티브 위치 업데이트: lat=36.367710, lon=127.365080
   ```

5. 백엔드 서버 로그에서 위치 업데이트 확인:
   ```
   ✅ 위치 업데이트 성공!
      User: gun9212
      Latitude: 36.367709
      Longitude: 127.365080
   ```

## 문제 해결

### 파일이 회색으로 보임
- 파일이 Xcode 프로젝트에 추가되지 않음
- 파일을 삭제하고 다시 **Add Files to "IdealMatchApp"** 실행
- **Add to targets**: IdealMatchApp 체크 확인

### 빌드 에러: "duplicate symbol"
- 파일이 두 번 추가됨
- 왼쪽 네비게이터에서 중복 파일 제거 (우클릭 > Delete > Remove Reference)

### 빌드 에러: "file not found"
- 파일 경로 문제
- 파일이 `ios/IdealMatchApp/` 폴더에 있는지 확인
- 터미널에서 확인:
  ```bash
  ls -la /Users/geon/Molip/2025Winter_2nd/Frontend/IdealMatchApp/ios/IdealMatchApp/ | grep Location
  ```

### 모듈을 찾을 수 없음 (JavaScript)
```
LocationConfigModule이 없습니다
```
- Xcode에서 파일 추가 후 **빌드 및 실행** 필요
- Clean Build Folder 후 재빌드

### 백그라운드에서 위치 업데이트 안 됨
1. 위치 권한이 **항상 허용**인지 확인
2. Info.plist에 `UIBackgroundModes`에 `location`이 있는지 확인 (이미 설정됨)
3. 실제로 이동하는지 확인 (위치가 변경되지 않으면 업데이트 없음)
4. 상단 바에 파란색 위치 표시기가 나타나는지 확인

## 참고

- 백그라운드 위치 업데이트는 배터리를 소모합니다
- 상단 바에 파란색 위치 표시기가 나타나 사용자가 인지할 수 있습니다
- 위치가 변경되지 않으면 업데이트가 없을 수 있습니다
