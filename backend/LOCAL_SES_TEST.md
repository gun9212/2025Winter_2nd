# 로컬에서 AWS SES 테스트하기

## 빠른 시작 가이드

로컬 개발 환경에서 실제 AWS SES를 통해 이메일을 발송하고 싶다면 다음 단계를 따르세요.

---

## 1단계: AWS SES 이메일 인증

### 1-1. 발신자 이메일 인증

1. AWS 콘솔 접속 → **Amazon SES** 서비스 선택
2. 왼쪽 메뉴에서 **Verified identities** 클릭
3. **Create identity** 버튼 클릭
4. **Email address** 선택
5. 발신자 이메일 주소 입력 (예: `noreply@idealmatch.com`)
6. **Create identity** 클릭
7. 입력한 이메일 주소로 인증 이메일 수신
8. 인증 이메일의 링크 클릭하여 인증 완료

### 1-2. 수신자 이메일 인증 (샌드박스 모드인 경우)

**샌드박스 모드**에서는 인증된 이메일로만 발송 가능합니다.

테스트할 이메일 주소도 SES에서 인증해야 합니다:
- 위와 동일한 방법으로 테스트할 이메일 주소도 인증
- 또는 샌드박스 해제 요청 (프로덕션 배포 시 필수)

---

## 2단계: AWS IAM Access Key 발급

로컬에서 AWS SES를 사용하려면 Access Key가 필요합니다.

### 2-1. IAM 사용자 확인/생성

1. AWS 콘솔 → **IAM** → **Users**
2. 본인 사용자 선택 (또는 새 사용자 생성)
3. **Security credentials** 탭 클릭

### 2-2. Access Key 생성

1. **Create access key** 버튼 클릭
2. **Use case**: "Application running outside AWS" 선택
3. **Next** 클릭
4. **Create access key** 클릭
5. **Access Key ID**와 **Secret Access Key** 복사
   - ⚠️ **주의**: Secret Access Key는 한 번만 표시됩니다!
   - 안전한 곳에 저장하세요

### 2-3. SES 권한 부여

1. IAM → Users → 본인 사용자 선택
2. **Permissions** 탭 클릭
3. **Add permissions** → **Attach policies directly**
4. 검색창에 `SES` 입력
5. **AmazonSESFullAccess** 정책 선택
6. **Add permissions** 클릭

---

## 3단계: .env 파일 설정

프로젝트 루트의 `backend` 폴더에 `.env` 파일을 생성하거나 수정합니다.

```env
# AWS SES 사용 활성화
USE_AWS_SES=True

# 디버그 모드 (로컬 테스트)
DEBUG=True

# AWS 리전 (서울)
AWS_SES_REGION=ap-northeast-2

# AWS Access Key (2단계에서 발급한 값)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# 발신자 이메일 (1단계에서 인증한 이메일)
DEFAULT_FROM_EMAIL=noreply@idealmatch.com
```

**⚠️ 중요:**
- `.env` 파일은 절대 Git에 커밋하지 마세요!
- `.gitignore`에 `.env`가 포함되어 있는지 확인하세요

---

## 4단계: boto3 라이브러리 설치 확인

AWS SES를 사용하려면 `boto3` 라이브러리가 필요합니다.

```bash
cd backend
source venv/bin/activate
pip install boto3
```

이미 설치되어 있다면 생략 가능합니다.

---

## 5단계: 테스트

### 5-1. 서버 실행

```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

### 5-2. API 호출

터미널에서:

```bash
curl -X POST http://localhost:8000/api/users/auth/send-verification-code/ \
  -H "Content-Type: application/json" \
  -d '{"email": "your-test-email@example.com"}'
```

또는 프론트엔드 앱에서 회원가입 화면에서 이메일 인증번호 발송 버튼 클릭

### 5-3. 결과 확인

**성공 시:**
- 서버 콘솔에 `✅ AWS SES로 이메일 발송 완료: your-test-email@example.com` 메시지 출력
- 실제 이메일 수신함에서 인증번호 확인

**실패 시:**
- 서버 콘솔에 오류 메시지 출력
- 일반적인 오류:
  - `Email address is not verified`: 수신자 이메일이 인증되지 않음 (샌드박스 모드)
  - `Access Denied`: IAM 권한 부족
  - `Invalid credentials`: Access Key 잘못됨

---

## 트러블슈팅

### 오류: "Email address is not verified"

**원인**: 수신자 이메일이 SES에서 인증되지 않음 (샌드박스 모드)

**해결 방법:**
1. SES 콘솔에서 테스트할 이메일 주소도 인증
2. 또는 샌드박스 해제 요청 (프로덕션 배포 시 필수)

### 오류: "Access Denied" 또는 "User is not authorized"

**원인**: IAM 사용자에 SES 권한이 없음

**해결 방법:**
1. IAM → Users → 본인 사용자 선택
2. Permissions 탭 → Add permissions
3. `AmazonSESFullAccess` 정책 추가

### 오류: "Invalid credentials"

**원인**: Access Key ID 또는 Secret Access Key가 잘못됨

**해결 방법:**
1. `.env` 파일의 `AWS_ACCESS_KEY_ID`와 `AWS_SECRET_ACCESS_KEY` 확인
2. IAM에서 새 Access Key 발급 후 재설정

### 오류: "The email address is not verified"

**원인**: 발신자 이메일(`DEFAULT_FROM_EMAIL`)이 SES에서 인증되지 않음

**해결 방법:**
1. SES 콘솔 → Verified identities
2. `DEFAULT_FROM_EMAIL`에 설정한 이메일 주소가 인증되어 있는지 확인
3. 인증되지 않았다면 인증 완료

---

## 콘솔 출력 모드로 되돌리기

로컬에서 AWS SES 테스트를 중단하고 콘솔 출력 모드로 돌아가려면:

`.env` 파일:
```env
USE_AWS_SES=False
DEBUG=True
```

서버 재시작 후 콘솔에 인증번호가 출력됩니다.

---

## 참고사항

### 샌드박스 모드 vs 프로덕션 모드

- **샌드박스 모드** (기본):
  - 인증된 이메일로만 발송 가능
  - 테스트용으로 적합
  - 무료

- **프로덕션 모드**:
  - 모든 이메일로 발송 가능
  - 실제 서비스 배포 시 필수
  - SES 콘솔에서 "Request production access" 요청 필요

### 비용

- **무료 티어**: 월 62,000통 (샌드박스 해제 후)
- **이후**: $0.10/1,000통
- 로컬 테스트는 보통 무료 티어 범위 내

---

**작성일**: 2026-01-18  
**프로젝트**: IdealMatchApp Backend  
**버전**: 1.0
