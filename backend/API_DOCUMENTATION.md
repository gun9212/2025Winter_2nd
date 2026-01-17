# API 문서

## 인증 관련 API

### 1. 회원가입
- **URL**: `POST /api/auth/register/`
- **설명**: 신규 사용자 회원가입
- **Request Body**:
```json
{
  "username": "string (필수, 최대 100자, UNIQUE)",
  "password": "string (필수, 최소 8자 권장)",
  "phone_number": "string (필수, 최대 20자, UNIQUE)"
}
```
- **Response** (201 Created):
```json
{
  "id": 1,
  "username": "user123",
  "phone_number": "010-1234-5678",
  "phone_verified": false,
  "date_joined": "2025-01-15T10:00:00Z"
}
```

### 2. 전화번호 인증
- **URL**: `POST /api/auth/verify-phone/`
- **설명**: 전화번호 인증번호 검증
- **Request Body**:
```json
{
  "phone_number": "010-1234-5678",
  "verification_code": "123456"
}
```
- **Response** (200 OK):
```json
{
  "phone_verified": true,
  "phone_verified_at": "2025-01-15T10:05:00Z"
}
```

### 3. 로그인
- **URL**: `POST /api/auth/login/`
- **설명**: 사용자 로그인 (JWT 토큰 발급)
- **Request Body**:
```json
{
  "username": "user123",
  "password": "password123"
}
```
- **Response** (200 OK):
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "user123",
    "phone_number": "010-1234-5678"
  }
}
```

### 4. 토큰 갱신
- **URL**: `POST /api/auth/refresh/`
- **설명**: Refresh Token을 사용하여 만료된 Access Token을 새로 발급받습니다
- **인증**: 불필요 (Refresh Token 자체가 인증 수단)
- **Request Body**:
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."  // 로그인 시 받은 refresh_token
}
```
- **Response** (200 OK):
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",  // 새로 발급된 Access Token
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."  // 새로 발급된 Refresh Token (선택사항, 일부 설정에서는 동일)
}
```
- **에러 응답** (401 Unauthorized):
  - Refresh Token이 만료되었거나 유효하지 않은 경우
```json
{
  "detail": "Token is invalid or expired",
  "code": "token_not_valid"
}
```
- **에러 응답** (400 Bad Request):
  - Request Body에 `refresh` 필드가 없는 경우
```json
{
  "refresh": [
    "This field is required."
  ]
}
```

**토큰 수명 (현재 프로젝트 설정):**
- **Access Token**: 30분 (보안과 편의성의 균형)
- **Refresh Token**: 3일 (사용자 편의를 위해 설정)

**사용 예시:**
```javascript
// 1. 토큰 갱신 함수
async function refreshToken(refreshToken) {
  const response = await fetch('/api/auth/refresh/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refresh: refreshToken
    })
  });
  
  if (response.ok) {
    const data = await response.json();
    return data.access; // 새 Access Token
  } else {
    // Refresh Token도 만료된 경우
    throw new Error('Refresh token expired');
  }
}

// 2. API 호출 인터셉터 예시
async function apiCall(url, options = {}) {
  let accessToken = getStoredAccessToken();
  
  // API 호출
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  // 401 에러 발생 시 토큰 갱신 후 재시도
  if (response.status === 401) {
    const refreshToken = getStoredRefreshToken();
    const newAccessToken = await refreshToken(refreshToken);
    saveAccessToken(newAccessToken);
    
    // 재시도
    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${newAccessToken}`
      }
    });
  }
  
  return response;
}
```

---

## 프로필 관련 API

### 5. 프로필 조회
- **URL**: `GET /api/users/profile/`
- **설명**: 현재 로그인한 사용자의 프로필 조회
- **인증**: JWT Token 필요
- **Response** (200 OK):
```json
{
  "id": 1,
  "age": 25,
  "gender": "M",
  "height": 175,
  "mbti": "ENFP",
  "personality": ["활발한", "긍정적인"],
  "interests": ["영화", "음악", "여행"],
  "matching_consent": false,
  "service_active": true,
  "matchable_count": 5,
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

### 6. 프로필 생성/수정
- **URL**: `POST /api/users/profile/` (생성) 또는 `PUT /api/users/profile/` (수정)
- **설명**: 사용자 프로필 생성 또는 수정
- **인증**: JWT Token 필요
- **Request Body**:
```json
{
  "age": 25,
  "gender": "M",
  "height": 175,
  "mbti": "ENFP",
  "personality": ["활발한", "긍정적인"],  // 최소 1개 이상 필수
  "interests": ["영화", "음악", "여행"]  // 최소 1개 이상 필수
}
```
- **Response** (200 OK 또는 201 Created):
```json
{
  "id": 1,
  "age": 25,
  "gender": "M",
  "height": 175,
  "mbti": "ENFP",
  "personality": ["활발한", "긍정적인"],
  "interests": ["영화", "음악", "여행"],
  "matching_consent": false,
  "service_active": true,
  "matchable_count": 0,
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

### 7. 프로필 완성도 확인
- **URL**: `GET /api/users/profile/completeness/`
- **설명**: 프로필 및 이상형 프로필 완성도 확인
- **인증**: JWT Token 필요
- **Response** (200 OK):
```json
{
  "profile_complete": true,
  "ideal_type_complete": true,
  "is_ready_for_service": true,
  "missing_fields": []
}
```

---

## 이상형 프로필 관련 API

### 8. 이상형 프로필 조회
- **URL**: `GET /api/users/ideal-type/`
- **설명**: 현재 로그인한 사용자의 이상형 프로필 조회
- **인증**: JWT Token 필요
- **Response** (200 OK):
```json
{
  "id": 1,
  "height_min": 160,
  "height_max": 180,
  "age_min": 20,
  "age_max": 30,
  "preferred_mbti": ["ENFP", "ENTP"],  // 최소 1개 이상 필수
  "preferred_personality": ["활발한", "유머러스한"],  // 최소 1개 이상 필수
  "preferred_interests": ["영화", "음악"],  // 최소 1개 이상 필수
  "match_threshold": 3,
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

### 9. 이상형 프로필 생성/수정
- **URL**: `POST /api/users/ideal-type/` (생성) 또는 `PUT /api/users/ideal-type/` (수정)
- **설명**: 이상형 프로필 생성 또는 수정
- **인증**: JWT Token 필요
- **Request Body**:
```json
{
  "height_min": 160,
  "height_max": 180,
  "age_min": 20,
  "age_max": 30,
  "preferred_mbti": ["ENFP", "ENTP"],  // 최소 1개 이상 필수
  "preferred_personality": ["활발한", "유머러스한"],  // 최소 1개 이상 필수
  "preferred_interests": ["영화", "음악"],  // 최소 1개 이상 필수
  "match_threshold": 3  // 기본값: 3
}
```
- **Response** (200 OK 또는 201 Created):
```json
{
  "id": 1,
  "height_min": 160,
  "height_max": 180,
  "age_min": 20,
  "age_max": 30,
  "preferred_mbti": ["ENFP", "ENTP"],
  "preferred_personality": ["활발한", "유머러스한"],
  "preferred_interests": ["영화", "음악"],
  "match_threshold": 3,
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

---

## 위치 관련 API

### 10. 위치 업데이트
- **URL**: `POST /api/users/location/`
- **설명**: 사용자 현재 위치 업데이트 (30초 주기)
- **인증**: JWT Token 필요
- **Request Body**:
```json
{
  "latitude": 37.5665,  // Decimal(9,6)
  "longitude": 126.9780  // Decimal(9,6)
}
```
- **Response** (200 OK):
```json
{
  "id": 1,
  "latitude": "37.566500",
  "longitude": "126.978000",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

### 11. 현재 위치 조회
- **URL**: `GET /api/users/location/`
- **설명**: 현재 로그인한 사용자의 위치 조회
- **인증**: JWT Token 필요
- **Response** (200 OK):
```json
{
  "id": 1,
  "latitude": "37.566500",
  "longitude": "126.978000",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

---

## 매칭 관련 API

### 12. 매칭 가능 인원 수 조회
- **URL**: `GET /api/matches/matchable-count/`
- **설명**: boundary(반경) 내에서 이상형 조건에 부합하는 인원 수 조회
  - 현재 위치 기준으로 지정된 반경 내에 있는 사람들 중 조건에 부합하는 인원 수를 반환
- **인증**: JWT Token 필요
- **Query Parameters** (필수):
  - `latitude` (float): 현재 위치의 위도 (예: 37.5665)
  - `longitude` (float): 현재 위치의 경도 (예: 126.9780)
  - `radius` (float): 반경 (km 단위, 예: 0.05 = 50m, 기본값: 0.05)
- **예시 요청:**
  - `GET /api/matches/matchable-count/?latitude=37.5665&longitude=126.9780&radius=0.05`
- **Response** (200 OK):
```json
{
  "matchable_count": 3,
  "last_count_updated_at": "2025-01-15T10:00:00Z",
  "radius": 0.05
}
```
- **에러 응답** (400 Bad Request):
  - `latitude` 또는 `longitude`가 제공되지 않은 경우
```json
{
  "error": "위치 정보가 필요합니다",
  "detail": "latitude와 longitude는 필수 파라미터입니다"
}
```

### 14. 매칭 체크 (포그라운드)
- **URL**: `GET /api/matches/check/`
- **설명**: 앱이 포그라운드에서 실행 중일 때 새로운 매칭이 있는지 확인 (10초 주기 폴링)
- **인증**: JWT Token 필요
- **주의**: 포그라운드에서는 알림을 표시하지 않습니다. 백그라운드 알림은 API 19를 통해 등록한 푸시 알림으로 받습니다.
- **Response** (200 OK):
```json
{
  "has_new_match": false
}
```
- **참고**: 포그라운드에서는 매칭 정보를 반환하지 않으며, 단순히 매칭 발생 여부만 확인합니다.

---

## 동의 관리 API

### 15. 매칭 동의 업데이트
- **URL**: `POST /api/users/consent/`
- **설명**: 매칭 동의 상태 업데이트
- **인증**: JWT Token 필요
- **Request Body**:
```json
{
  "matching_consent": true  // 또는 false
}
```
- **Response** (200 OK):
```json
{
  "matching_consent": true,
  "consent_updated_at": "2025-01-15T10:00:00Z"
}
```

### 16. 서비스 활성화/비활성화
- **URL**: `POST /api/users/service-status/`
- **설명**: 서비스 활성화/비활성화 토글
- **인증**: JWT Token 필요
- **Request Body**:
```json
{
  "service_active": true  // 또는 false
}
```
- **Response** (200 OK):
```json
{
  "service_active": true
}
```

---

## 백그라운드 알림 관련 API

### 19. 백그라운드 알림 등록
- **URL**: `POST /api/notifications/register/`
- **설명**: 앱이 백그라운드에 있거나 화면이 꺼져있을 때 매칭 알림을 받기 위해 푸시 알림 토큰을 등록합니다
- **인증**: JWT Token 필요
- **중요**: 
  - 화면이 켜져있을 때는 알림이 표시되지 않습니다 (포그라운드에서는 API 14로만 체크)
  - 서버가 매칭을 감지하면 자동으로 푸시 알림을 전송합니다
- **Request Body**:
```json
{
  "fcm_token": "fcm_token_string",  // Firebase Cloud Messaging 토큰 (필수)
  "device_type": "ios"  // "ios" 또는 "android" (필수)
}
```
- **Response** (200 OK):
```json
{
  "success": true,
  "message": "백그라운드 알림이 등록되었습니다",
  "registered_at": "2025-01-15T10:00:00Z"
}
```
- **에러 응답** (400 Bad Request):
  - `fcm_token` 또는 `device_type`이 제공되지 않은 경우
```json
{
  "error": "필수 파라미터가 누락되었습니다",
  "detail": "fcm_token과 device_type은 필수입니다"
}
```

---

## 에러 응답 형식

모든 API는 다음과 같은 에러 응답 형식을 사용합니다:

```json
{
  "error": "에러 메시지",
  "detail": "상세 에러 설명 (선택사항)",
  "code": "ERROR_CODE"
}
```

### 주요 HTTP 상태 코드
- `200 OK`: 성공
- `201 Created`: 리소스 생성 성공
- `400 Bad Request`: 잘못된 요청 (유효성 검증 실패 등)
- `401 Unauthorized`: 인증 실패 (토큰 없음 또는 만료)
- `403 Forbidden`: 권한 없음
- `404 Not Found`: 리소스를 찾을 수 없음
- `500 Internal Server Error`: 서버 오류

---

## 인증 방식

대부분의 API는 JWT Token 인증이 필요합니다.

### 헤더 형식
```
Authorization: Bearer {access_token}
```

### 인증이 필요한 API
- 프로필 관련 API (5-7)
- 이상형 프로필 관련 API (8-9)
- 위치 관련 API (10-11)
- 매칭 관련 API (12, 14)
- 동의 관리 API (15-16)
- 백그라운드 알림 관련 API (19)

### 인증이 불필요한 API
- 회원가입 (1)
- 전화번호 인증 (2)
- 로그인 (3)
- 토큰 갱신 (4)

