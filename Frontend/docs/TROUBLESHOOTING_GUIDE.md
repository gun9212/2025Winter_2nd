# React Native iOS 개발 문제 해결 가이드

## 프로젝트 정보
- **프로젝트명**: IdealMatchApp (이상형 매칭 앱)
- **React Native 버전**: 0.72.6
- **개발 환경**: macOS (darwin 24.6.0)
- **타겟 플랫폼**: iOS (Android 포기 후 전환)

---

## 목차
1. [Android 빌드 문제 (포기)](#android-빌드-문제-포기)
2. [iOS 빌드 문제 및 해결](#ios-빌드-문제-및-해결)
3. [개발 환경 문제](#개발-환경-문제)
4. [런타임 오류](#런타임-오류)
5. [예방 가이드](#예방-가이드)

---

## Android 빌드 문제 (포기)

### 배경
처음에는 Android 개발을 시도했으나, 여러 호환성 문제로 인해 iOS로 전환하기로 결정했습니다.

### 문제 1: Java 버전 불일치
```
오류: Unsupported class file major version 65
```

**원인**: Java 21을 사용 중이었으나, React Native 0.72.6은 Java 17을 권장

**시도한 방법들**:
1. Gradle 버전 업그레이드 시도 → 실패
2. Android Gradle Plugin 버전 변경 시도 → 실패

**해결 방법**: Java 17 설치 및 환경변수 설정
```bash
brew install openjdk@17
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.17/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"
```

**결과**: Java 버전 문제는 해결되었으나 다른 오류 발생

---

### 문제 2: compileSdkVersion 호환성
```
오류: Dependency 'androidx.appcompat:appcompat-resources:1.7.0' requires 
libraries and applications that depend on it to compile against version 34 
or later of the Android APIs. :app is currently compiled against android-33.
```

**원인**: androidx 라이브러리들이 Android SDK 34를 요구하지만 프로젝트는 33을 사용

**시도한 방법들**:
1. `android/build.gradle`에서 `compileSdkVersion`과 `targetSdkVersion`을 34로 변경
2. `android/gradle.properties`에 `android.suppressUnsupportedCompileSdk=34` 추가

**결과**: 빌드는 진행되었으나 다른 오류 연쇄 발생

---

### 문제 3: Kotlin 컴파일 오류
```
오류: Could not find method kotlinOptions() for arguments
```

**원인**: Kotlin 플러그인이 적용되지 않음

**시도한 방법들**:
1. `android/app/build.gradle`에 `kotlin-android` 플러그인 추가
2. `kotlinOptions` 블록 추가하여 `jvmTarget = "17"` 설정

**결과**: Kotlin 오류는 해결되었으나 DEX 변환 오류 발생

---

### 문제 4: DEX 변환 오류 (최종)
```
오류: 
1. Execution failed for task ':app:mergeExtDexDebug'
2. Execution failed for task ':react-native-safe-area-context:compileDebugKotlin'
3. Execution failed for task ':react-native-gesture-handler:compileDebugKotlin'
4. Execution failed for task ':react-native-screens:compileDebugKotlin'
```

**원인**: 
- 여러 React Native 라이브러리들의 Kotlin 컴파일 문제
- AndroidX 라이브러리 버전 충돌
- DEX 변환 프로세스 오류

**시도한 방법들**:
1. Gradle 캐시 정리: `./gradlew clean`
2. 로컬 캐시 삭제: `rm -rf ~/.gradle/caches`
3. `react-native-screens` 다운그레이드
4. MultiDex 활성화
5. Kotlin 버전 명시적 설정

**결과**: 모두 실패

**최종 결정**: Android 개발 포기 → iOS로 전환

---

## iOS 빌드 문제 및 해결

### 문제 1: Xcode Developer Directory 설정 오류
```
오류: xcode-select: error: tool 'xcodebuild' requires Xcode, but active 
developer directory '/Library/Developer/CommandLineTools' is a command 
line tools instance
```

**원인**: Xcode가 아닌 Command Line Tools가 활성 개발자 디렉토리로 설정됨

**해결 방법**:
```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

**결과**: ✅ 해결됨

---

### 문제 2: UTF-8 인코딩 오류
```
오류: Unicode Normalization not appropriate for ASCII-8BIT
```

**원인**: Ruby/CocoaPods에서 UTF-8 인코딩을 제대로 처리하지 못함

**해결 방법**: `~/.zshrc`에 환경변수 추가
```bash
export LANG=en_US.UTF-8
source ~/.zshrc
```

**결과**: ✅ 해결됨

---

### 문제 3: CocoaPods Deployment Target 오류
```
오류: [!] CocoaPods could not find compatible versions for pod "RNScreens":
Specs satisfying the `RNScreens (from ...)` dependency were found, but they 
required a higher minimum deployment target.
```

**원인**: `react-native-screens`와 다른 의존성들이 iOS 13.0보다 높은 버전 요구

**시도한 방법들**:
1. **시도 1**: `ios/Podfile`에서 `platform :ios, '13.0'` 설정
   - 결과: 여전히 오류

2. **시도 2**: iOS 14.0으로 상향
   ```ruby
   platform :ios, '14.0'
   ```
   - 결과: 여전히 오류

3. **시도 3**: iOS 15.1로 상향 + post_install hook 추가
   ```ruby
   platform :ios, '15.1'
   
   post_install do |installer|
     installer.pods_project.targets.each do |target|
       target.build_configurations.each do |config|
         config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
       end
     end
   end
   ```
   - 결과: ✅ 해결됨

**최종 해결 방법**:
```ruby
# ios/Podfile
platform :ios, '15.1'

post_install do |installer|
  react_native_post_install(
    installer,
    config[:reactNativePath],
    :mac_catalyst_enabled => false
  )
  __apply_Xcode_12_5_M1_post_install_workaround(installer)
  
  # 모든 pods의 deployment target을 강제로 15.1로 설정
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
    end
  end
end
```

**결과**: ✅ 해결됨

---

### 문제 4: Boost 라이브러리 다운로드 실패
```
오류: [!] Error installing boost
Verification checksum was incorrect, expected 
6478edfe2f3305127cffe8caf73ea0176c53769f4bf1585be237eb30798c3b8e, got ...
```

**원인**: 
- `boostorg.jfrog.io` 서버에서 다운로드 실패
- 파일 타입 감지 오류

**해결 방법**: `boost.podspec` 수정
```ruby
# node_modules/react-native/third-party-podspecs/boost.podspec

# 변경 전:
spec.source = { 
  :http => 'https://boostorg.jfrog.io/artifactory/main/release/1.76.0/source/boost_1_76_0.tar.bz2'
}

# 변경 후:
spec.source = { 
  :http => 'https://sourceforge.net/projects/boost/files/boost/1.76.0/boost_1_76_0.tar.bz2/download',
  :type => 'tbz'  # 파일 타입 명시
}
```

**결과**: ✅ 해결됨

**참고**: 이 변경은 일시적이며, `node_modules` 재설치 시 다시 적용 필요

---

### 문제 5: Fabric 관련 react-native-screens 오류
```
오류: 'react/renderer/components/rnscreens/EventEmitters.h' file not found
```

**원인**: 
- `react-native-screens` 4.19.0이 Fabric (React Native의 New Architecture)을 요구
- 현재 프로젝트는 Old Architecture 사용 중

**시도한 방법들**:
1. **시도 1**: Fabric 활성화 시도
   ```ruby
   use_react_native!(
     :fabric_enabled => true
   )
   ```
   - 결과: 다른 호환성 문제 발생

2. **시도 2**: `react-native-screens` 다운그레이드
   ```json
   // package.json
   "react-native-screens": "^3.20.0"  // 4.19.0에서 변경
   ```
   - 결과: ✅ 해결됨

**최종 해결 방법**:
1. `package.json` 수정:
   ```json
   {
     "dependencies": {
       "react-native-screens": "^3.20.0"
     }
   }
   ```

2. Podfile에서 Fabric 비활성화:
   ```ruby
   use_react_native!(
     :path => config[:reactNativePath],
     :hermes_enabled => false,
     :fabric_enabled => false,  # Fabric 비활성화
     ...
   )
   ```

3. 재설치:
   ```bash
   npm install
   cd ios && pod install
   ```

**결과**: ✅ 해결됨

---

### 문제 6: Simulator 선택 오류
```
오류: A build only device cannot be used to run this target. 
No supported iOS devices are available.
```

**원인**: Xcode에서 실제 디바이스나 "Any iOS Device"가 선택되어 있음

**해결 방법**: 
1. Xcode 상단 툴바에서 디바이스 선택 버튼 클릭
2. 시뮬레이터 선택 (예: iPhone 15 Pro)
3. 시뮬레이터가 보이지 않으면 Xcode와 Simulator 앱 완전 종료 후 재시작

**결과**: ✅ 해결됨

---

## 개발 환경 문제

### 문제 1: Metro 서버 포트 충돌
```
오류: error listen EADDRINUSE: address already in use :::8081
```

**원인**: 이미 실행 중인 Metro 서버가 8081 포트를 사용 중

**해결 방법**:
```bash
# 8081 포트를 사용하는 프로세스 찾아서 종료
lsof -ti:8081 | xargs kill -9
```

**결과**: ✅ 해결됨

---

### 문제 2: npm 권한 오류
```
오류: npm error code EPERM
```

**원인**: 샌드박스 환경에서 npm install 실행 시 권한 제한

**해결 방법**: 
- Cursor에서 `required_permissions: ['all']` 또는 `['network']` 옵션으로 실행
- 또는 `--legacy-peer-deps` 플래그 사용

**결과**: ✅ 해결됨

---

## 런타임 오류

### 문제 1: AsyncStorage 데이터 타입 불일치
```
오류: TypeError: undefined is not an object 
(evaluating 'idealType.preferredPersonalities.length')
```

**원인**: 
- 기존 코드에서 `personalities`, `interests` 키 사용
- 새 코드에서 `preferredPersonalities`, `preferredInterests` 키 사용
- AsyncStorage에 저장된 데이터와 코드 간 키 불일치

**해결 방법**:
1. AsyncStorage 데이터 삭제:
   ```javascript
   import AsyncStorage from '@react-native-async-storage/async-storage';
   await AsyncStorage.clear();
   ```

2. 앱 재설치:
   ```bash
   # iOS
   rm -rf ~/Library/Developer/Xcode/DerivedData/*
   npx react-native run-ios
   ```

**결과**: ✅ 해결됨

**예방책**: 데이터 마이그레이션 로직 구현 (이후 구현됨)

---

### 문제 2: 중복 알림 표시
```
문제: 매칭 성공 시 알림이 여러 번 표시됨
```

**원인**: 
- `setState`의 비동기 특성으로 인한 상태 업데이트 지연
- 여러 검색 사이클에서 동일한 매칭에 대해 알림 중복 발생

**시도한 방법들**:
1. **시도 1**: `hasNotified` state 사용
   ```javascript
   const [hasNotified, setHasNotified] = useState(false);
   ```
   - 결과: 여전히 중복 발생 (setState 비동기 문제)

2. **시도 2**: `useRef`로 변경
   ```javascript
   const hasNotifiedRef = useRef(false);
   
   if (!hasNotifiedRef.current) {
     hasNotifiedRef.current = true;
     // 알림 표시
   }
   ```
   - 결과: ✅ 해결됨

**최종 해결 방법**: 
- 동기적으로 확인이 필요한 플래그는 `useRef` 사용
- 렌더링에 영향을 주는 값만 `useState` 사용

**결과**: ✅ 해결됨

---

## 예방 가이드

### 1. 프로젝트 시작 시 체크리스트

#### Java 환경
```bash
# Java 버전 확인
java -version  # Java 17 권장

# Java 17 설치 (필요시)
brew install openjdk@17

# 환경변수 설정 (~/.zshrc)
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.17/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"
```

#### iOS 환경
```bash
# Xcode 설치 확인
xcode-select -p

# Xcode 경로 설정
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer

# UTF-8 인코딩 설정 (~/.zshrc)
export LANG=en_US.UTF-8

# CocoaPods 업데이트
sudo gem install cocoapods
```

---

### 2. 의존성 관리

#### iOS Deployment Target 설정
```ruby
# ios/Podfile
platform :ios, '15.1'  # 높은 버전 사용 권장

post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
    end
  end
end
```

#### React Native 버전별 권장 설정
- **RN 0.72.x**:
  - Java 17
  - iOS 13.0 이상 (15.1 권장)
  - Node 16 이상
  - Hermes: 선택사항 (false 권장)
  - Fabric: false (Old Architecture)

---

### 3. 패키지 설치 주의사항

#### 신규 패키지 설치 시
```bash
# 1. package.json 버전 확인
npm info <package-name> peerDependencies

# 2. React Native 버전과 호환성 확인
# 3. 설치
npm install <package-name>

# 4. iOS pod 설치
cd ios && pod install

# 5. 클린 빌드
cd .. && npm start -- --reset-cache
```

#### 패키지 문제 발생 시
```bash
# 전체 재설치
rm -rf node_modules package-lock.json
npm install

# iOS 클린 빌드
cd ios
rm -rf Pods Podfile.lock
pod install
```

---

### 4. 디버깅 팁

#### Metro 서버
```bash
# 캐시 초기화
npm start -- --reset-cache

# 포트 충돌 시
lsof -ti:8081 | xargs kill -9
npm start
```

#### iOS 빌드
```bash
# DerivedData 삭제
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# 클린 빌드
cd ios
xcodebuild clean
pod install
cd ..
npx react-native run-ios
```

#### AsyncStorage 초기화
```javascript
// 개발자 메뉴에서 실행 또는 코드에 추가
import AsyncStorage from '@react-native-async-storage/async-storage';

// 모든 데이터 삭제
await AsyncStorage.clear();

// 특정 키만 삭제
await AsyncStorage.removeItem('@user_profile');
```

---

### 5. 알려진 이슈 및 해결책

| 문제 | 원인 | 해결책 |
|-----|------|--------|
| Hermes 관련 오류 | Hermes 엔진 호환성 | Podfile에서 `:hermes_enabled => false` |
| Fabric 오류 | New Architecture | Podfile에서 `:fabric_enabled => false` |
| Flipper 오류 | Flipper 호환성 | Podfile에서 `flipper_config = FlipperConfiguration.disabled` |
| boost 다운로드 실패 | jfrog 서버 불안정 | boost.podspec에서 sourceforge로 변경 |
| 화면 회전 오류 | Info.plist 설정 | `UISupportedInterfaceOrientations` 확인 |
| 백그라운드 위치 추적 실패 | 권한 부족 | Info.plist에 `UIBackgroundModes` 추가 |

---

## 버전 정보

### 성공적으로 빌드된 환경
```
OS: macOS darwin 24.6.0
Node: v16+
React Native: 0.72.6
Java: OpenJDK 17
Xcode: 16.4+
CocoaPods: 1.12+

주요 패키지:
- react-native-screens: 3.20.0 (4.19.0 아님!)
- @react-navigation/native: 7.1.27
- @react-native-async-storage/async-storage: 2.2.0
- @notifee/react-native: 9.1.8
- react-native-gesture-handler: 2.30.0
- react-native-safe-area-context: 5.6.2
```

---

## 결론

### Android vs iOS 개발
- **Android**: 호환성 문제가 많고 해결이 어려움 (특히 RN 0.72.x)
- **iOS**: 초기 설정은 까다롭지만 한 번 해결하면 안정적

### 추천 접근법
1. **새 프로젝트 시작**: iOS 먼저 개발, 안정화 후 Android 진행
2. **의존성 선택**: 최신 버전보다는 안정적인 버전 선택
3. **문제 발생 시**: 근본 원인 파악보다 우회 방법이 빠를 수 있음
4. **백업**: 작동하는 상태에서 `package.json`, `Podfile`, `build.gradle` 백업

### 유용한 명령어 모음
```bash
# 완전 클린 빌드 (iOS)
rm -rf node_modules package-lock.json ios/Pods ios/Podfile.lock
npm install
cd ios && pod install
cd .. && npm start -- --reset-cache
npx react-native run-ios

# 포트 확인 및 종료
lsof -ti:8081 | xargs kill -9

# Xcode DerivedData 삭제
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Metro 서버 캐시 클리어
npm start -- --reset-cache
```

---

## 참고 자료
- React Native 공식 문서: https://reactnative.dev
- React Native Upgrade Helper: https://react-native-community.github.io/upgrade-helper/
- CocoaPods 공식 문서: https://guides.cocoapods.org

---

**작성일**: 2026-01-16  
**프로젝트**: IdealMatchApp  
**버전**: 1.0
