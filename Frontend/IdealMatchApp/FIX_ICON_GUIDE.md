# 아이콘 표시 문제 해결 가이드

## 문제: 아이콘이 표시되지 않음

### 해결 방법 1: Xcode에서 직접 확인 및 수정 (가장 확실한 방법)

1. **Xcode 열기**
   ```bash
   open ios/IdealMatchApp.xcworkspace
   ```

2. **AppIcon 확인**
   - 좌측 네비게이터에서 `IdealMatchApp` 프로젝트 선택
   - `IdealMatchApp` 폴더 → `Images.xcassets` → `AppIcon` 클릭
   - 각 슬롯에 아이콘이 채워져 있는지 확인

3. **아이콘이 비어있는 경우**
   - 각 슬롯을 클릭하고 파일 브라우저에서 해당 아이콘 파일 선택
   - 또는 아이콘 파일을 직접 드래그 앤 드롭

4. **완전 정리 후 재빌드**
   - Xcode에서 `Product` → `Clean Build Folder` (Shift + Cmd + K)
   - `Product` → `Build` (Cmd + B)
   - 시뮬레이터/기기에서 앱 완전 삭제
   - 다시 실행

### 해결 방법 2: DerivedData 완전 삭제

```bash
# Xcode DerivedData 삭제
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# iOS 빌드 폴더 삭제
cd Frontend/IdealMatchApp/ios
rm -rf build
rm -rf Pods
pod install
cd ../..

# 완전 재빌드
npm run ios
```

### 해결 방법 3: 시뮬레이터/기기에서 앱 완전 삭제

1. **시뮬레이터**
   - 홈 화면에서 앱 아이콘 길게 누르기
   - "앱 삭제" 선택
   - 시뮬레이터 재시작

2. **실제 기기**
   - 설정 → 일반 → iPhone 저장 공간 → 앱 찾기 → 삭제
   - 또는 홈 화면에서 앱 삭제

### 해결 방법 4: 아이콘 파일 재생성

```bash
cd Frontend/IdealMatchApp
python3 generate_app_icons.py
```

그 다음 Xcode에서 다시 확인

### 해결 방법 5: Info.plist 확인

`ios/IdealMatchApp/Info.plist`에 다음이 있는지 확인:
- `CFBundleIcons` 또는 `CFBundleIconFiles` 설정

### 확인 사항 체크리스트

- [ ] Xcode에서 `AppIcon`에 모든 슬롯이 채워져 있는가?
- [ ] 아이콘 파일이 실제로 존재하는가? (`ls ios/IdealMatchApp/Images.xcassets/AppIcon.appiconset/`)
- [ ] Xcode에서 `Clean Build Folder`를 실행했는가?
- [ ] 시뮬레이터/기기에서 앱을 완전히 삭제했는가?
- [ ] 앱을 재빌드했는가?

### Android의 경우

```bash
cd Frontend/IdealMatchApp/android
./gradlew clean
cd ..
npm run android
```

기기/에뮬레이터에서 앱 완전 삭제 후 재설치
