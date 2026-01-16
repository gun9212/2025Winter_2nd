# 백엔드 연동 시 삭제 대상 파일 가이드

## 개요
실제 백엔드 서버와 연동할 때는 Mock 서비스들을 삭제하고 실제 API 클라이언트로 교체해야 합니다.

---

## 삭제해야 할 파일 및 디렉토리

### 1. Mock 서비스 파일들

#### `/src/services/mock/` 디렉토리 전체 삭제
```
src/services/mock/
├── mockApiClient.js          # Mock API 클라이언트
├── mockAuthServer.js         # Mock 인증 서버
├── mockAuthService.js        # Mock 전화번호 인증 서비스
├── mockUserGenerator.js      # Mock 사용자 데이터 생성기
└── index.js                  # Mock 서비스 exports
```

**삭제 명령어:**
```bash
rm -rf src/services/mock/
```

**설명:**
- `mockApiClient.js`: 실제 백엔드 API로 교체
- `mockAuthServer.js`: 실제 인증 서버 API로 교체
- `mockAuthService.js`: AWS SNS 서비스로 교체
- `mockUserGenerator.js`: 더 이상 필요 없음

---

### 2. API 클라이언트 파일 수정

#### `/src/services/api/mockApiClient.js` 삭제 후 실제 API 클라이언트로 교체

**삭제:**
```bash
rm src/services/api/mockApiClient.js
```

**대체 파일 생성 필요:**
```javascript
// src/services/api/apiClient.js (새로 생성)
import axios from 'axios';

const BASE_URL = 'https://your-backend-api.com/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

---

### 3. 수정해야 할 파일들 (삭제 아님, 코드 변경 필요)

#### `/src/context/AuthContext.js`
**변경 내용:**
- `mockAuthServer` import 제거
- `mockAuthServer.login()` → 실제 API 호출로 변경
- `mockAuthServer.signup()` → 실제 API 호출로 변경
- `mockAuthServer.resetPassword()` → 실제 API 호출로 변경

**예시:**
```javascript
// 변경 전
import { mockAuthServer } from '../services/mock';

// 변경 후
import { apiClient } from '../services/api/apiClient';
```

---

#### `/src/screens/Auth/SignupScreen.js`
**변경 내용:**
- `MockAuthService.sendVerificationCode()` → AWS SNS API 호출로 변경
- 실제 인증번호 전송 로직 구현

**예시:**
```javascript
// 변경 전
import { MockAuthService } from '../../services/mock';

// 변경 후
import { snsService } from '../../services/aws/snsService';
```

---

#### `/src/screens/Auth/PasswordResetScreen.js`
**변경 내용:**
- `MockAuthService.sendVerificationCode()` → AWS SNS API 호출로 변경

---

#### `/src/services/migration/dataMigration.js`
**검토 필요:**
- 레거시 데이터 마이그레이션 로직은 유지할 수 있음
- 단, `mockAuthServer` 참조가 있다면 제거

---

#### `/src/screens/Main/MainScreen.js`
**변경 내용:**
- `mockApiClient.findMatches()` → 실제 백엔드 API 호출로 변경
- `mockApiClient.updateLocation()` → 실제 백엔드 API 호출로 변경
- `mockApiClient.resetMatchCounter()` → 필요시 제거 또는 백엔드에서 처리

**예시:**
```javascript
// 변경 전
import { mockApiClient } from '../../services/api';

// 변경 후
import { apiClient } from '../../services/api/apiClient';

// API 호출 예시
const result = await apiClient.post('/matches/search', {
  latitude: location.latitude,
  longitude: location.longitude,
});
```

---

### 4. 설정 파일 수정

#### `/src/constants/config.js`
**변경 내용:**
- Mock 관련 상수 제거 (선택사항)
- 실제 API 엔드포인트 추가

**예시:**
```javascript
// 추가
export const API_BASE_URL = 'https://your-backend-api.com/api';
export const API_TIMEOUT = 10000;
```

---

## 마이그레이션 체크리스트

### Phase 1: Mock 서비스 제거
- [ ] `src/services/mock/` 디렉토리 삭제
- [ ] `src/services/api/mockApiClient.js` 삭제
- [ ] 모든 `mockAuthServer` import 제거
- [ ] 모든 `MockAuthService` import 제거
- [ ] 모든 `mockApiClient` import 제거

### Phase 2: 실제 API 클라이언트 구현
- [ ] `src/services/api/apiClient.js` 생성 (axios 기반)
- [ ] 인증 토큰 관리 로직 추가
- [ ] API 엔드포인트 상수 정의
- [ ] 에러 핸들링 로직 추가

### Phase 3: AWS SNS 연동
- [ ] AWS SDK 설치: `npm install aws-sdk` 또는 `@aws-sdk/client-sns`
- [ ] `src/services/aws/snsService.js` 생성
- [ ] AWS 자격 증명 설정 (환경 변수 또는 설정 파일)
- [ ] 인증번호 전송 함수 구현

### Phase 4: 인증 시스템 교체
- [ ] `AuthContext.js`에서 실제 로그인 API 호출로 변경
- [ ] `AuthContext.js`에서 실제 회원가입 API 호출로 변경
- [ ] `AuthContext.js`에서 실제 비밀번호 재설정 API 호출로 변경
- [ ] JWT 토큰 저장/관리 로직 추가

### Phase 5: 매칭 시스템 교체
- [ ] `MainScreen.js`에서 실제 매칭 검색 API 호출로 변경
- [ ] `MainScreen.js`에서 실제 위치 업데이트 API 호출로 변경
- [ ] 백그라운드 매칭 로직 백엔드 서버에서 처리하도록 변경

### Phase 6: 테스트
- [ ] 로그인/회원가입/비밀번호 재설정 테스트
- [ ] 전화번호 인증 테스트 (AWS SNS)
- [ ] 매칭 검색 테스트
- [ ] 위치 업데이트 테스트
- [ ] 백그라운드 매칭 테스트

---

## 주의사항

### 1. 데이터 마이그레이션
- Mock 서버에서 생성된 사용자 데이터는 실제 백엔드로 마이그레이션 필요
- `@mock_users_db` (AsyncStorage)의 데이터를 백엔드로 전송하는 스크립트 작성 권장

### 2. 환경 변수 관리
- API 엔드포인트, AWS 자격 증명 등은 환경 변수로 관리
- `.env` 파일 사용 (`.gitignore`에 추가)

### 3. 에러 핸들링
- 네트워크 오류 처리
- 인증 토큰 만료 처리
- 서버 오류 처리

### 4. 테스트 계정
- Mock 테스트 계정 제거
- 실제 테스트 계정 생성 로직 구현

---

## 백엔드 API 엔드포인트 명세 (예상)

### 인증
```
POST /api/auth/signup          # 회원가입
POST /api/auth/login           # 로그인
POST /api/auth/password/reset  # 비밀번호 재설정
POST /api/auth/verify/phone    # 전화번호 인증 요청
POST /api/auth/verify/code     # 인증번호 확인
```

### 사용자
```
GET  /api/users/profile        # 프로필 조회
PUT  /api/users/profile        # 프로필 수정
GET  /api/users/ideal-type     # 이상형 조회
PUT  /api/users/ideal-type     # 이상형 수정
```

### 매칭
```
POST /api/matches/search       # 매칭 검색
POST /api/location/update      # 위치 업데이트
GET  /api/matches/status       # 매칭 상태 조회
```

---

## 추가 의존성 설치

```bash
# HTTP 클라이언트
npm install axios

# AWS SDK (SNS 사용 시)
npm install @aws-sdk/client-sns

# 또는 전체 AWS SDK
npm install aws-sdk

# 환경 변수 관리
npm install react-native-dotenv  # 또는 @react-native-community/dotenv
```

---

## 참고 자료

- [Axios 공식 문서](https://axios-http.com/)
- [AWS SNS JavaScript SDK](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/sns-examples.html)
- [React Native 환경 변수 설정](https://reactnative.dev/docs/environment-setup)

---

**작성일**: 2026-01-16  
**프로젝트**: IdealMatchApp  
**버전**: 1.0
