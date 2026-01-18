# AWS SES 이메일 인증 설정 가이드

## 개요

이 프로젝트는 로컬 개발과 AWS EC2 프로덕션 환경 모두를 지원합니다.
- **로컬 개발**: 콘솔에 인증번호 출력 (실제 이메일 발송 안 함)
- **AWS EC2 프로덕션**: AWS SES를 통한 실제 이메일 발송

---

## 1. AWS SES 설정 (AWS 콘솔)

### 1-1. 이메일 주소 인증

1. AWS 콘솔 접속 → **Amazon SES** 서비스 선택
2. 왼쪽 메뉴에서 **Verified identities** 클릭
3. **Create identity** 버튼 클릭
4. **Email address** 선택
5. 발신자 이메일 주소 입력 (예: `noreply@idealmatch.com`)
6. **Create identity** 클릭
7. 입력한 이메일 주소로 인증 이메일 수신
8. 인증 이메일의 링크 클릭하여 인증 완료

### 1-2. 도메인 인증 (선택사항, 권장)

도메인이 있다면 도메인 전체를 인증하는 것이 좋습니다:

1. **Verified identities** → **Create identity**
2. **Domain** 선택
3. 도메인 입력 (예: `idealmatch.com`)
4. DNS 레코드 추가 (AWS가 제공하는 레코드를 도메인 DNS에 추가)
5. 인증 완료 대기

### 1-3. 샌드박스 해제 (프로덕션 필수)

**샌드박스 상태**: 인증된 이메일로만 발송 가능
**프로덕션 상태**: 모든 이메일로 발송 가능

1. SES 콘솔 → **Account dashboard**
2. **Request production access** 클릭
3. 사용 사례 작성 및 제출
4. AWS 승인 대기 (보통 24시간 이내)

---

## 2. 환경 변수 설정

### 2-1. 로컬 개발 환경 (`.env` 파일)

#### 옵션 A: 콘솔 출력만 (기본값, 개발 편의)

```env
# 로컬 개발 - 콘솔 출력만
USE_AWS_SES=False
DEBUG=True
```

#### 옵션 B: 로컬에서 AWS SES 테스트

```env
# 로컬에서 AWS SES 테스트
USE_AWS_SES=True
DEBUG=True
AWS_SES_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your-access-key-here
AWS_SECRET_ACCESS_KEY=your-secret-key-here
DEFAULT_FROM_EMAIL=noreply@idealmatch.com  # SES에서 인증된 이메일
```

**로컬에서 AWS SES 테스트 설정 방법:**

1. **AWS IAM에서 Access Key 발급**
   - AWS 콘솔 → IAM → Users → 본인 사용자 선택
   - Security credentials 탭 → Create access key
   - Access key type: "Application running outside AWS" 선택
   - Access Key ID와 Secret Access Key 복사 (한 번만 표시됨!)

2. **SES에서 이메일 인증**
   - AWS 콘솔 → SES → Verified identities
   - Create identity → Email address
   - 발신자 이메일 주소 입력 (예: `noreply@idealmatch.com`)
   - 인증 이메일 수신 후 링크 클릭하여 인증 완료

3. **IAM 사용자에 SES 권한 부여**
   - IAM → Users → 본인 사용자 선택
   - Add permissions → Attach policies directly
   - `AmazonSESFullAccess` 정책 선택
   - Add permissions 클릭

4. **`.env` 파일에 설정 추가**
   ```env
   USE_AWS_SES=True
   AWS_SES_REGION=ap-northeast-2
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   DEFAULT_FROM_EMAIL=noreply@idealmatch.com
   ```

5. **테스트**
   ```bash
   # 서버 재시작
   python manage.py runserver
   
   # API 호출
   curl -X POST http://localhost:8000/api/users/auth/send-verification-code/ \
     -H "Content-Type: application/json" \
     -d '{"email": "your-test-email@example.com"}'
   ```

**주의사항:**
- 샌드박스 모드에서는 **인증된 이메일로만** 발송 가능
- 수신자 이메일도 SES에서 인증되어야 함 (샌드박스 해제 전까지)
- Access Key는 절대 Git에 커밋하지 마세요!

### 2-2. AWS EC2 프로덕션 환경 (`.env` 파일)

```env
# 프로덕션 - AWS SES 사용
USE_AWS_SES=True
DEBUG=False
AWS_SES_REGION=ap-northeast-2

# 방법 1: IAM 역할 사용 (권장)
# EC2 인스턴스에 IAM 역할을 부여하면 Access Key 불필요
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=

# 방법 2: Access Key 직접 설정 (IAM 역할 사용 불가 시)
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key

# 발신자 이메일 (SES에서 인증된 이메일)
DEFAULT_FROM_EMAIL=noreply@idealmatch.com
```

---

## 3. AWS EC2 IAM 역할 설정 (권장)

IAM 역할을 사용하면 Access Key를 `.env`에 저장할 필요가 없어 더 안전합니다.

### 3-1. IAM 역할 생성

1. AWS 콘솔 → **IAM** → **Roles** → **Create role**
2. **AWS service** → **EC2** 선택
3. **Next** 클릭
4. 권한 정책 추가:
   - `AmazonSESFullAccess` 또는
   - 커스텀 정책 (최소 권한 원칙)
5. 역할 이름 입력 (예: `ec2-ses-role`)
6. **Create role** 클릭

### 3-2. EC2 인스턴스에 역할 부여

1. EC2 콘솔 → 인스턴스 선택
2. **Actions** → **Security** → **Modify IAM role**
3. 생성한 역할 선택 (예: `ec2-ses-role`)
4. **Update IAM role** 클릭

### 3-3. .env 파일 설정

IAM 역할을 사용하는 경우:

```env
USE_AWS_SES=True
AWS_SES_REGION=ap-northeast-2
# AWS_ACCESS_KEY_ID와 AWS_SECRET_ACCESS_KEY는 설정하지 않음
# EC2의 IAM 역할이 자동으로 자격 증명 제공
DEFAULT_FROM_EMAIL=noreply@idealmatch.com
```

---

## 4. 코드 동작 방식

### 로컬 개발 환경 (USE_AWS_SES=False)

```python
# 콘솔에 인증번호 출력
============================================================
📧 이메일 인증번호 발송 (개발 모드)
   이메일: user@example.com
   인증번호: 123456
   유효시간: 2분
============================================================
```

### AWS EC2 프로덕션 환경 (USE_AWS_SES=True)

```python
# AWS SES를 통해 실제 이메일 발송
# 사용자의 이메일로 인증번호 전송
```

---

## 5. 테스트 방법

### 5-1. 로컬에서 테스트

```bash
# 1. .env 파일 설정
USE_AWS_SES=False  # 콘솔 출력

# 2. 서버 실행
python manage.py runserver

# 3. API 호출
curl -X POST http://localhost:8000/api/users/auth/send-verification-code/ \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 4. 서버 콘솔에서 인증번호 확인
```

### 5-2. AWS EC2에서 테스트

```bash
# 1. .env 파일 설정
USE_AWS_SES=True
AWS_SES_REGION=ap-northeast-2
DEFAULT_FROM_EMAIL=noreply@idealmatch.com

# 2. 서버 실행
python manage.py runserver

# 3. API 호출
curl -X POST http://your-ec2-ip:8000/api/users/auth/send-verification-code/ \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 4. 실제 이메일 수신 확인
```

---

## 6. 주의사항

### 6-1. 샌드박스 모드

- 샌드박스 상태에서는 **인증된 이메일로만** 발송 가능
- 프로덕션 배포 전 반드시 샌드박스 해제 필요

### 6-2. 이메일 인증

- `DEFAULT_FROM_EMAIL`은 반드시 SES에서 인증된 이메일이어야 함
- 인증되지 않은 이메일로 발송 시 오류 발생

### 6-3. 보안

- `.env` 파일을 Git에 커밋하지 마세요
- IAM 역할 사용을 권장 (Access Key보다 안전)
- 프로덕션에서는 `DEBUG=False` 설정 필수

---

## 7. 트러블슈팅

### 오류: "Email address is not verified"

**원인**: 발신자 이메일이 SES에서 인증되지 않음
**해결**: SES 콘솔에서 이메일 인증 완료

### 오류: "Account is in sandbox mode"

**원인**: 샌드박스 모드에서 인증되지 않은 이메일로 발송 시도
**해결**: 샌드박스 해제 요청 또는 인증된 이메일로만 발송

### 오류: "Access Denied"

**원인**: IAM 권한 부족
**해결**: EC2 IAM 역할에 `AmazonSESFullAccess` 권한 추가

---

## 8. 비용

- **무료 티어**: 월 62,000통 (샌드박스 해제 후)
- **이후**: $0.10/1,000통
- **예시**: 월 100,000통 발송 시 약 $3.80

---

**작성일**: 2026-01-18  
**프로젝트**: IdealMatchApp Backend  
**버전**: 1.0
