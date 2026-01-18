# 로컬에서 AWS SES 테스트하기 - 완전 가이드

이 가이드는 로컬 개발 환경에서 실제 AWS SES를 통해 이메일을 발송하는 방법을 단계별로 설명합니다.

---

## 📋 사전 준비사항

1. AWS 계정 (무료 티어 가능)
2. AWS 콘솔 접속 가능
3. 이메일 주소 2개 (발신자용, 수신자용)

---

## 1단계: AWS SES 이메일 인증

### 1-1. AWS 콘솔 접속

1. [AWS 콘솔](https://console.aws.amazon.com/) 접속
2. 로그인 후 상단 검색창에 `SES` 입력
3. **Amazon Simple Email Service** 선택

### 1-2. 발신자 이메일 인증

**목적**: 이메일을 보낼 수 있는 발신자 주소 인증

1. 왼쪽 메뉴에서 **Verified identities** 클릭
2. 오른쪽 상단 **Create identity** 버튼 클릭
3. **Identity type** 선택:
   - **Email address** 선택 (개인 이메일 테스트용)
   - 또는 **Domain** 선택 (도메인이 있는 경우)
4. **Email address** 입력:
   ```
   예: noreply@idealmatch.com
   또는 본인의 실제 이메일: your-email@gmail.com
   ```
5. **Create identity** 클릭
6. 입력한 이메일 주소로 인증 이메일 수신
7. 이메일을 열고 **Verify this email address** 링크 클릭
8. 인증 완료 확인 (SES 콘솔에서 **Verified** 상태로 변경됨)

### 1-3. 수신자 이메일 인증 (샌드박스 모드 필수)

**중요**: AWS SES는 기본적으로 **샌드박스 모드**입니다.
- 샌드박스 모드에서는 **인증된 이메일로만** 발송 가능
- 테스트할 수신자 이메일도 인증해야 함

**방법**: 1-2와 동일한 방법으로 테스트할 이메일 주소도 인증

예시:
- 발신자: `noreply@idealmatch.com` (인증 완료)
- 수신자: `test@example.com` (인증 완료) ← 이것도 인증 필요!

---

## 2단계: AWS IAM Access Key 발급

로컬에서 AWS 서비스를 사용하려면 Access Key가 필요합니다.

### 2-1. IAM 콘솔 접속

1. AWS 콘솔 상단 검색창에 `IAM` 입력
2. **IAM (Identity and Access Management)** 선택

### 2-2. 사용자 확인

1. 왼쪽 메뉴에서 **Users** 클릭
2. 본인의 사용자 이름 클릭
   - 없으면 새 사용자 생성 (선택사항)

### 2-3. Access Key 생성

1. **Security credentials** 탭 클릭
2. **Access keys** 섹션까지 스크롤
3. **Create access key** 버튼 클릭
4. **Use case** 선택:
   - **Application running outside AWS** 선택
   - 설명 입력 (선택사항): "로컬 개발 환경용 SES Access Key"
5. **Next** 클릭
6. **Create access key** 클릭
7. **중요**: 다음 정보를 안전한 곳에 저장
   - **Access key ID**: `AKIA...` (예: `AKIAIOSFODNN7EXAMPLE`)
   - **Secret access key**: `wJalr...` (예: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)
   - ⚠️ **Secret access key는 한 번만 표시됩니다!** 복사해두세요
8. **Done** 클릭

### 2-4. SES 권한 부여

1. IAM → **Users** → 본인 사용자 선택
2. **Permissions** 탭 클릭
3. **Add permissions** 버튼 클릭
4. **Attach policies directly** 선택
5. 검색창에 `SES` 입력
6. **AmazonSESFullAccess** 체크박스 선택
   - 또는 최소 권한 정책 생성 (고급 사용자용)
7. **Next** 클릭
8. **Add permissions** 클릭

**권한 확인**:
- Permissions 탭에서 `AmazonSESFullAccess` 정책이 보이면 성공

---

## 3단계: boto3 라이브러리 설치

```bash
cd /Users/delaykimm/2025Winter_2nd/backend
source venv/bin/activate
pip install boto3
```

**확인**:
```bash
pip list | grep boto3
# boto3>=1.29.0 이 설치되어 있어야 함
```

---

## 4단계: .env 파일 설정

### 4-1. .env 파일 위치 확인

```bash
cd /Users/delaykimm/2025Winter_2nd/backend
ls -la .env
```

파일이 없으면 생성, 있으면 수정합니다.

### 4-2. .env 파일 내용

**⚠️ 주의**: 같은 줄에 주석을 넣으면 오류가 발생합니다!
주석은 별도 줄에 작성하세요.

```env
# AWS SES 사용 활성화
USE_AWS_SES=True

# 디버그 모드 (로컬 테스트)
DEBUG=True

# AWS 리전 (서울)
AWS_SES_REGION=ap-northeast-2

# AWS Access Key (2단계에서 발급한 값)
AWS_ACCESS_KEY_ID=여기에_실제_Access_Key_ID_입력
AWS_SECRET_ACCESS_KEY=여기에_실제_Secret_Access_Key_입력

# 발신자 이메일 (1단계에서 인증한 이메일)
DEFAULT_FROM_EMAIL=noreply@idealmatch.com
```

**예시** (실제 값으로 교체):
```env
USE_AWS_SES=True
DEBUG=True
AWS_SES_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
DEFAULT_FROM_EMAIL=your-email@gmail.com
```

### 4-3. .env 파일 생성/수정 방법

**방법 1: 터미널에서 직접 생성**
```bash
cd /Users/delaykimm/2025Winter_2nd/backend
nano .env
# 또는
vim .env
```

**방법 2: IDE에서 생성**
- `backend` 폴더에 `.env` 파일 생성
- 위 내용 복사하여 붙여넣기
- 실제 값으로 교체

### 4-4. .gitignore 확인

`.env` 파일이 Git에 커밋되지 않도록 확인:

```bash
cd /Users/delaykimm/2025Winter_2nd/backend
cat .gitignore | grep .env
```

없으면 `.gitignore`에 추가:
```
.env
```

---

## 5단계: 서버 실행 및 테스트

### 5-1. 서버 실행

```bash
cd /Users/delaykimm/2025Winter_2nd/backend
source venv/bin/activate
python manage.py runserver
```

**정상 실행 확인**:
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

### 5-2. API 테스트 (방법 1: curl)

**새 터미널 창**을 열어서:

```bash
curl -X POST http://localhost:8000/api/users/auth/send-verification-code/ \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**성공 응답**:
```json
{
  "success": true,
  "message": "인증번호가 전송되었습니다.",
  "expires_in": 120
}
```

**서버 콘솔 출력** (성공 시):
```
✅ AWS SES로 이메일 발송 완료: test@example.com
   MessageId: 0100018a-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 5-3. API 테스트 (방법 2: 프론트엔드 앱)

1. iOS 시뮬레이터에서 앱 실행
2. 회원가입 화면으로 이동
3. 이메일 입력 (SES에서 인증된 이메일)
4. **Send Code** 버튼 클릭
5. 실제 이메일 수신함 확인

### 5-4. 이메일 확인

1. 수신자 이메일 주소로 로그인
2. 받은편지함 확인
3. 제목: `[IdealMatch] 이메일 인증번호`
4. 본문에 6자리 인증번호 확인

---

## 6단계: 오류 해결

### 오류 1: "Email address is not verified"

**증상**:
```
❌ AWS SES 이메일 발송 실패: EmailAddressNotVerifiedException
```

**원인**: 수신자 이메일이 SES에서 인증되지 않음 (샌드박스 모드)

**해결**:
1. SES 콘솔 → Verified identities
2. 테스트할 이메일 주소도 인증
3. 또는 샌드박스 해제 요청

### 오류 2: "Access Denied" 또는 "User is not authorized"

**증상**:
```
❌ AWS SES 이메일 발송 실패: AccessDenied
```

**원인**: IAM 사용자에 SES 권한이 없음

**해결**:
1. IAM → Users → 본인 사용자 선택
2. Permissions 탭 → Add permissions
3. `AmazonSESFullAccess` 정책 추가

### 오류 3: "Invalid credentials"

**증상**:
```
❌ AWS SES 이메일 발송 실패: InvalidClientTokenId
```

**원인**: Access Key ID 또는 Secret Access Key가 잘못됨

**해결**:
1. `.env` 파일의 `AWS_ACCESS_KEY_ID`와 `AWS_SECRET_ACCESS_KEY` 확인
2. 공백이나 따옴표가 없는지 확인
3. IAM에서 새 Access Key 발급 후 재설정

### 오류 4: "The email address is not verified"

**증상**:
```
❌ AWS SES 이메일 발송 실패: MessageRejected
```

**원인**: 발신자 이메일(`DEFAULT_FROM_EMAIL`)이 SES에서 인증되지 않음

**해결**:
1. SES 콘솔 → Verified identities
2. `DEFAULT_FROM_EMAIL`에 설정한 이메일 주소가 **Verified** 상태인지 확인
3. 인증되지 않았다면 1단계 다시 수행

### 오류 5: "ValueError: Invalid truth value"

**증상**:
```
ValueError: Invalid truth value: false  # aws ses 사용 여부
```

**원인**: `.env` 파일에서 같은 줄에 주석이 있음

**해결**:
```env
# 잘못된 예
USE_AWS_SES=False  # 주석

# 올바른 예
USE_AWS_SES=False
# 주석은 별도 줄에
```

---

## 7단계: 콘솔 출력 모드로 되돌리기

로컬에서 AWS SES 테스트를 중단하고 콘솔 출력 모드로 돌아가려면:

`.env` 파일 수정:
```env
USE_AWS_SES=False
DEBUG=True
```

서버 재시작 후 콘솔에 인증번호가 출력됩니다:
```
============================================================
📧 이메일 인증번호 발송 (개발 모드)
   이메일: test@example.com
   인증번호: 123456
   유효시간: 2분
============================================================
```

---

## 📊 샌드박스 모드 vs 프로덕션 모드

### 샌드박스 모드 (기본)

- ✅ **인증된 이메일로만** 발송 가능
- ✅ 테스트용으로 적합
- ✅ 무료
- ❌ 모든 이메일로 발송 불가

**확인 방법**:
- SES 콘솔 → Account dashboard
- "Your account is in the Amazon SES sandbox" 메시지 확인

### 프로덕션 모드

- ✅ **모든 이메일**로 발송 가능
- ✅ 실제 서비스 배포 시 필수
- ⚠️ SES 콘솔에서 "Request production access" 요청 필요
- ⚠️ 승인 대기 (보통 24시간 이내)

**샌드박스 해제 요청**:
1. SES 콘솔 → Account dashboard
2. **Request production access** 클릭
3. 사용 사례 작성:
   - 이메일 유형: Transactional
   - 사용 목적: 사용자 이메일 인증
   - 웹사이트 URL: (프로젝트 URL)
4. 제출 후 AWS 승인 대기

---

## 💰 비용 정보

### 무료 티어

- **월 62,000통** 무료 (샌드박스 해제 후)
- 로컬 테스트는 보통 무료 티어 범위 내

### 유료

- **$0.10/1,000통** (62,000통 초과 시)
- 예시: 월 100,000통 발송 시 약 $3.80

---

## ✅ 체크리스트

로컬에서 AWS SES 테스트를 시작하기 전 확인사항:

- [ ] AWS SES에서 발신자 이메일 인증 완료
- [ ] AWS SES에서 수신자 이메일 인증 완료 (샌드박스 모드)
- [ ] IAM에서 Access Key 발급 완료
- [ ] IAM 사용자에 `AmazonSESFullAccess` 권한 부여 완료
- [ ] `boto3` 라이브러리 설치 완료
- [ ] `.env` 파일 생성 및 설정 완료
- [ ] `.env` 파일에 실제 Access Key 값 입력 완료
- [ ] `.env` 파일에 `DEFAULT_FROM_EMAIL` 설정 완료
- [ ] `.gitignore`에 `.env` 포함 확인

---

## 🎯 다음 단계

로컬에서 AWS SES 테스트가 성공했다면:

1. **프로덕션 배포 준비**:
   - 샌드박스 해제 요청
   - EC2 IAM 역할 설정 (Access Key 불필요)
   - `.env` 파일에서 Access Key 제거 (IAM 역할 사용)

2. **모니터링 설정**:
   - SES 콘솔에서 발송 통계 확인
   - CloudWatch 알림 설정 (선택사항)

3. **보안 강화**:
   - Access Key 로테이션
   - IAM 최소 권한 원칙 적용

---

**작성일**: 2026-01-18  
**프로젝트**: IdealMatchApp Backend  
**버전**: 2.0 (상세 가이드)
