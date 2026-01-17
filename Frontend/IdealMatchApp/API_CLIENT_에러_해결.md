# API Client 에러 해결

## 🔍 에러 원인

```
'❌ 서버 전송 오류:', [TypeError: undefined is not an object 
(evaluating '_$$_REQUIRE(_dependencyMap[8], "../../services/api").apiClient.updateLocation')]
```

**원인:**
- React Native에서 `export * from` 방식이 일부 버전에서 문제를 일으킬 수 있음
- `apiClient`가 `undefined`로 인식됨

---

## ✅ 해결 방법

### 1. `index.js`에서 명시적으로 export

**수정 전:**
```javascript
export * from './apiClient';
```

**수정 후:**
```javascript
export { apiClient } from './apiClient';
```

### 2. `apiClient.js`에서 CONFIG 안전하게 처리

- `CONFIG`가 undefined일 경우 기본값 사용
- `TEST_USER_ID` 안전하게 처리

---

## 🧪 테스트 방법

### 1단계: Metro Bundler 재시작

```bash
# Metro bundler 완전히 종료 후 재시작
# 또는
npx react-native start --reset-cache
```

### 2단계: 앱 재빌드

**iOS:**
```bash
cd ios
pod install
cd ..
npx react-native run-ios
```

**Android:**
```bash
npx react-native run-android
```

### 3단계: 로그 확인

앱 실행 후 다음 로그가 나타나야 합니다:

```
🌐 API Client 초기화: { baseURL: 'http://127.0.0.1:8000/api', platform: 'ios' }
```

---

## 📝 수정된 파일

1. **`src/services/api/index.js`**
   - `export { apiClient }` 방식으로 변경

2. **`src/services/api/apiClient.js`**
   - CONFIG 안전하게 처리
   - 기본값 설정 추가

---

**문제가 해결되면 위치 정보가 정상적으로 전송됩니다!** ✅
