# Phase 2: 프로필 관리 시스템 테스트 가이드

Phase 2 완성도를 확인하는 단계별 테스트 가이드입니다.

---

## 📋 테스트 항목

1. ✅ 백엔드 API 테스트
2. ✅ Django Admin 확인
3. ✅ 프론트엔드 앱 테스트
4. ✅ 로그 확인

---

## 1단계: Django 서버 실행

```bash
cd /Users/geon/Molip/2주차/backend
source venv/bin/activate
python manage.py runserver
```

**확인 사항:**
- 서버가 정상적으로 시작됨 (`Starting development server at http://127.0.0.1:8000/`)
- 에러 메시지 없음

---

## 2단계: 백엔드 API 테스트

### 방법 1: 테스트 스크립트 실행

```bash
cd /Users/geon/Molip/2주차/backend
source venv/bin/activate
python test_profile_api.py
```

이 스크립트는 현재 프로필 상태를 확인하고 테스트 명령어를 출력합니다.

### 방법 2: curl 명령어로 직접 테스트

#### 2-1. 프로필 조회 API 테스트

```bash
# testuser의 프로필 조회 (user_id=1)
curl -X GET "http://127.0.0.1:8000/api/users/profile/?user_id=1"
```

**예상 응답:**
```json
{
  "success": true,
  "data": {
    "age": 25,
    "gender": "M",
    "height": 175,
    "mbti": "ENFP",
    "personality": ["활발한", "긍정적인"],
    "interests": ["영화", "음악", "여행"]
  }
}
```

#### 2-2. 프로필 생성/수정 API 테스트

```bash
curl -X POST http://127.0.0.1:8000/api/users/profile/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "age": 26,
    "gender": "M",
    "height": 175,
    "mbti": "ENFP",
    "personality": ["활발한", "긍정적인", "친절한"],
    "interests": ["영화", "음악", "여행", "독서"]
  }'
```

**예상 응답:**
```json
{
  "success": true,
  "message": "프로필이 저장되었습니다.",
  "data": {
    "age": 26,
    "gender": "M",
    "height": 175,
    "mbti": "ENFP",
    "personality": ["활발한", "긍정적인", "친절한"],
    "interests": ["영화", "음악", "여행", "독서"]
  }
}
```

#### 2-3. 프로필 완성도 확인 API 테스트

```bash
curl -X GET "http://127.0.0.1:8000/api/users/profile/completeness/?user_id=1"
```

**예상 응답:**
```json
{
  "success": true,
  "profile_complete": true,
  "ideal_type_complete": false,
  "all_complete": false
}
```

---

## 3단계: Django Admin 확인

1. **브라우저에서 접속:**
   ```
   http://127.0.0.1:8000/admin/
   ```

2. **로그인:**
   - Username: `testuser`
   - Password: (비밀번호 재설정 필요 시 `python reset_password.py` 실행)

3. **프로필 확인:**
   - **USERS** → **사용자 프로필들** 클릭
   - `testuser의 프로필` 확인
   - 다음 정보가 표시되는지 확인:
     - 나이, 성별, 키, MBTI
     - 성격 유형 리스트
     - 관심사 리스트

4. **프로필 수정 테스트:**
   - 프로필 클릭
   - 나이 또는 다른 정보 수정
   - 저장
   - 다시 조회하여 변경사항 확인

---

## 4단계: 프론트엔드 앱 테스트

### 4-1. 앱 실행

```bash
cd /Users/geon/Molip/2주차/Frontend/IdealMatchApp
npx react-native run-ios
# 또는
npx react-native run-android
```

### 4-2. 프로필 입력 화면 테스트

1. **프로필 입력 화면 접근:**
   - 앱 실행 후 프로필 입력 화면으로 이동
   - 또는 회원가입 후 자동 이동

2. **프로필 정보 입력:**
   - 나이: 예) 25
   - 성별: 남성 또는 여성 선택
   - 키: 예) 175
   - MBTI: 예) ENFP
   - 성격: 최소 1개 이상 선택
   - 관심사: 최소 1개 이상 선택

3. **저장 버튼 클릭**

4. **결과 확인:**
   - ✅ 성공 메시지 표시: "프로필이 저장되었습니다"
   - ✅ 이상형 입력 화면으로 이동
   - ❌ 에러 발생 시: 에러 메시지 확인

### 4-3. 로그 확인

앱 실행 후 다음 로그를 확인:

**정상적인 경우:**
```
📤 프로필 저장 중... { age: 25, gender: 'M', ... }
🌐 API 요청: { url: 'http://127.0.0.1:8000/api/users/profile/', method: 'POST', ... }
🔧 디버그 모드: user_id 추가 1
📡 API 요청 시작: { url: '...', method: 'POST', ... }
📥 API 응답 받음: { status: 200, ok: true }
✅ 프로필 저장 API 응답: { success: true, ... }
✅ 프로필 업데이트 완료
```

**에러가 있는 경우:**
```
❌ 프로필 저장 실패: ...
   에러 상세: ...
```

### 4-4. 프로필 자동 로드 테스트

1. **앱 재시작:**
   - 앱 완전 종료 후 다시 실행

2. **로그 확인:**
   - 다음 로그가 나타나야 함:
   ```
   📥 프로필 조회 중...
   📡 API 요청 시작: { url: '...', method: 'GET', ... }
   ✅ 프로필 로드 완료
   ```

3. **프로필 화면 확인:**
   - 프로필 입력 화면에서 기존 데이터가 표시되는지 확인

---

## 5단계: Django 서버 로그 확인

Django 서버 터미널에서 다음 로그를 확인:

**프로필 조회 시:**
```
GET /api/users/profile/?user_id=1 HTTP/1.1" 200
```

**프로필 저장 시:**
```
POST /api/users/profile/ HTTP/1.1" 200
```

**에러 발생 시:**
- 에러 메시지 전체 확인
- 트레이스백 확인

---

## ✅ 테스트 체크리스트

### 백엔드 API
- [ ] 프로필 조회 API 정상 작동 (`GET /api/users/profile/`)
- [ ] 프로필 생성 API 정상 작동 (`POST /api/users/profile/`)
- [ ] 프로필 수정 API 정상 작동 (`PUT /api/users/profile/`)
- [ ] 프로필 완성도 확인 API 정상 작동 (`GET /api/users/profile/completeness/`)
- [ ] 에러 처리 확인 (유효하지 않은 데이터, 프로필 없음 등)

### Django Admin
- [ ] 프로필 데이터가 Admin에 표시됨
- [ ] 프로필 생성/수정이 정상 작동
- [ ] 필드 값이 올바르게 저장됨

### 프론트엔드
- [ ] 프로필 저장 버튼 클릭 시 API 호출됨
- [ ] 성공 메시지 표시됨
- [ ] 에러 발생 시 에러 메시지 표시됨
- [ ] 앱 재시작 시 프로필 자동 로드됨
- [ ] 프로필 입력 화면에 기존 데이터 표시됨

### 데이터 검증
- [ ] 필수 필드 검증 작동 (나이, 성별, 키, MBTI)
- [ ] 성격/관심사 최소 1개 검증 작동
- [ ] 유효하지 않은 데이터 거부됨

---

## 🔍 문제 해결

### 문제 1: "프로필이 없습니다" 에러

**해결:**
```bash
# 프로필이 없으면 먼저 생성
curl -X POST http://127.0.0.1:8000/api/users/profile/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "age": 25,
    "gender": "M",
    "height": 175,
    "mbti": "ENFP",
    "personality": ["활발한"],
    "interests": ["영화"]
  }'
```

### 문제 2: "성격 유형을 최소 1개 이상 선택해주세요" 에러

**해결:**
- `personality` 배열에 최소 1개 이상의 항목 포함 확인

### 문제 3: 네트워크 에러

**확인 사항:**
- Django 서버가 실행 중인지 확인
- API_BASE_URL이 올바른지 확인 (iOS: `http://127.0.0.1:8000/api`)
- 앱 로그에서 정확한 에러 메시지 확인

### 문제 4: 필드명 불일치

**확인 사항:**
- 프론트엔드: `personalities` (배열)
- 백엔드: `personality` (배열)
- `AuthContext`의 변환 로직이 정상 작동하는지 확인

---

## 📝 테스트 결과 기록

테스트 후 다음 정보를 기록하세요:

```
✅ 테스트 완료 일시: [날짜 시간]
✅ 백엔드 API: [정상/에러]
✅ Django Admin: [정상/에러]
✅ 프론트엔드 앱: [정상/에러]
✅ 발견된 문제: [문제 내용]
✅ 해결 방법: [해결 내용]
```

---

**테스트를 진행하고 문제가 있으면 알려주세요!** 🧪
