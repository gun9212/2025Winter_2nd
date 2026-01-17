# iOS 시뮬레이터 설정 가이드

환경 설정 가이드에 따라 iOS 시뮬레이터를 설정하는 단계별 가이드입니다.

---

## 사전 요구사항 확인

### 1. Xcode 설치 확인

```bash
# Xcode 버전 확인
xcodebuild -version
```

**예상 출력:**
```
Xcode 15.0
Build version 15A240d
```

**Xcode가 설치되지 않은 경우:**
1. App Store에서 Xcode 설치 (약 15GB, 시간 소요)
2. 설치 완료 후 Xcode 실행하여 라이선스 동의
3. Command Line Tools 설치:
```bash
xcode-select --install
```

### 2. CocoaPods 설치 확인

```bash
# CocoaPods 버전 확인
pod --version
```

**CocoaPods가 설치되지 않은 경우:**
```bash
# CocoaPods 설치
sudo gem install cocoapods

# 설치 확인
pod --version
```

**설치 오류 발생 시:**
```bash
# Homebrew를 통한 설치 (권장)
brew install cocoapods
```

---

## iOS 프로젝트 설정

### 1. 프로젝트 디렉토리로 이동

```bash
cd /Users/delaykimm/2025Winter_2nd/Frontend/IdealMatchApp
```

### 2. CocoaPods 의존성 설치

```bash
# iOS 디렉토리로 이동
cd ios

# 기존 Pod 캐시 정리 (문제 발생 시)
rm -rf Pods Podfile.lock

# Pod 의존성 설치
pod install

# 설치 시간: 약 10-15분 소요
```

**설치 성공 시:**
```
Pod installation complete! There are X dependencies from the Podfile and Y total pods installed.
```

### 3. 설치 확인

```bash
# Pods 디렉토리 확인
ls -la Pods/

# Podfile.lock 확인
cat Podfile.lock
```

---

## iOS 시뮬레이터 설정

### 1. 사용 가능한 시뮬레이터 확인

```bash
# 모든 시뮬레이터 목록 확인
xcrun simctl list devices available
```

**권장 시뮬레이터:**
- iPhone 15 Pro (iOS 17+)
- iPhone 14 (iOS 16+)
- iPhone 13 (iOS 15+)

### 2. Xcode에서 시뮬레이터 실행

#### 방법 1: Xcode에서 직접 실행
1. Xcode 실행
2. 상단 메뉴: `Xcode > Open Developer Tool > Simulator`
3. 또는 Spotlight에서 "Simulator" 검색

#### 방법 2: 명령줄에서 실행
```bash
# 특정 시뮬레이터 실행
xcrun simctl boot "iPhone 15 Pro"

# 또는 기본 시뮬레이터 실행
open -a Simulator
```

### 3. 시뮬레이터 설치 (필요한 경우)

**Xcode에서:**
1. Xcode 실행
2. `Xcode > Settings > Platforms` (또는 `Preferences > Components`)
3. 원하는 iOS 버전 다운로드

**명령줄에서:**
```bash
# 사용 가능한 런타임 확인
xcrun simctl runtime list

# 특정 시뮬레이터 생성
xcrun simctl create "iPhone 15 Pro" "iPhone 15 Pro" "iOS-17-0"
```

---

## React Native 앱 실행

### 1. Metro Bundler 시작

**새 터미널 창에서:**
```bash
cd /Users/delaykimm/2025Winter_2nd/Frontend/IdealMatchApp
npm start
```

**또는 캐시 리셋이 필요한 경우:**
```bash
npm start -- --reset-cache
```

### 2. iOS 시뮬레이터에서 앱 실행

**새 터미널 창에서:**
```bash
cd /Users/delaykimm/2025Winter_2nd/Frontend/IdealMatchApp
npm run ios
```

**특정 시뮬레이터 지정:**
```bash
npm run ios -- --simulator="iPhone 15 Pro"
```

**특정 iOS 버전 지정:**
```bash
npm run ios -- --simulator="iPhone 15 Pro" --os="iOS-17-0"
```

---

## 트러블슈팅

### 문제 1: Xcode가 설치되지 않음

**증상:**
```
xcode-select: error: tool 'xcodebuild' requires Xcode
```

**해결:**
1. App Store에서 Xcode 설치
2. 설치 후 Xcode 실행하여 라이선스 동의
3. Command Line Tools 설치:
```bash
xcode-select --install
```

### 문제 2: CocoaPods 설치 실패

**증상:**
```
ERROR: While executing gem ... (Gem::FilePermissionError)
```

**해결:**
```bash
# Homebrew를 통한 설치 (권장)
brew install cocoapods

# 또는 사용자 디렉토리에 설치
gem install --user-install cocoapods
```

### 문제 3: pod install 실패

**증상:**
```
[!] CocoaPods could not find compatible versions
```

**해결:**
```bash
cd ios
rm -rf Pods Podfile.lock
pod cache clean --all
pod install --repo-update
```

### 문제 4: 시뮬레이터가 실행되지 않음

**증상:**
```
Unable to boot simulator
```

**해결:**
```bash
# 시뮬레이터 재시작
xcrun simctl shutdown all
xcrun simctl erase all

# Xcode 재시작
killall Simulator
open -a Simulator
```

### 문제 5: 빌드 오류

**증상:**
```
Build failed with Xcode
```

**해결:**
```bash
# DerivedData 삭제
rm -rf ~/Library/Developer/Xcode/DerivedData

# 프로젝트 클린
cd ios
xcodebuild clean
pod install
cd ..
```

### 문제 6: 네트워크 연결 오류 (시뮬레이터에서)

**증상:**
```
Network request failed
```

**해결:**
- `localhost` 대신 `127.0.0.1` 사용
- 또는 Mac의 실제 IP 주소 사용
- `src/constants/config.js`에서 `API_BASE_URL` 확인

---

## 개발 워크플로우

### 일반적인 개발 시작 순서

1. **Metro Bundler 시작:**
```bash
cd /Users/delaykimm/2025Winter_2nd/Frontend/IdealMatchApp
npm start
```

2. **iOS 시뮬레이터 실행:**
```bash
# 새 터미널에서
npm run ios
```

3. **코드 변경 시:**
- Metro Bundler가 자동으로 리로드 (Fast Refresh)
- 네이티브 코드 변경 시: 앱 재빌드 필요

### 유용한 명령어

```bash
# 시뮬레이터 목록 확인
xcrun simctl list devices

# 특정 시뮬레이터 재시작
xcrun simctl shutdown "iPhone 15 Pro"
xcrun simctl boot "iPhone 15 Pro"

# 모든 시뮬레이터 종료
xcrun simctl shutdown all

# 시뮬레이터 스크린샷
xcrun simctl io booted screenshot screenshot.png

# 시뮬레이터 비디오 녹화
xcrun simctl io booted recordVideo video.mov
```

---

## 참고 자료

- [React Native iOS 설정 공식 문서](https://reactnative.dev/docs/environment-setup)
- [CocoaPods 공식 문서](https://cocoapods.org/)
- [Xcode 시뮬레이터 가이드](https://developer.apple.com/documentation/xcode/running-your-app-in-the-simulator-or-on-a-device)

---

**마지막 업데이트**: 2025-01-17


