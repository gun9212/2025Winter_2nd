# Django Admin 접속 단계별 가이드

## 🚀 서버 실행 및 Admin 접속 방법

---

## 1단계: 가상환경 활성화

```bash
cd /Users/geon/Molip/2주차/backend
source venv/bin/activate
```

**확인:** 터미널 프롬프트에 `(venv)`가 표시되면 성공!

---

## 2단계: Django 서버 실행

```bash
python manage.py runserver
```

**정상 실행 시 출력 예시:**
```
Watching for file changes with StatReloader
Performing system checks...

System check identified no issues (0 silenced).
December 15, 2024 - 10:00:00
Django version 4.x.x, using settings 'config.settings'
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

**✅ 성공 신호:**
- `Starting development server at http://127.0.0.1:8000/` 메시지 확인
- 에러 메시지가 없음

---

## 3단계: 브라우저에서 Admin 접속

### 방법 1: 직접 URL 입력

브라우저 주소창에 입력:
```
http://127.0.0.1:8000/admin/
```

또는:
```
http://localhost:8000/admin/
```

### 방법 2: 터미널에서 자동 열기 (macOS)

새 터미널 창을 열고:
```bash
open http://127.0.0.1:8000/admin/
```

---

## 4단계: 로그인

**로그인 화면이 나타나면:**

- **Username:** `testuser`
- **Password:** 기존 비밀번호 (모르면 아래 비밀번호 재설정 참고)

**로그인 버튼 클릭**

---

## 5단계: Admin 대시보드 확인

로그인 성공 시 다음 화면이 나타납니다:

- **사용자 관리 (USERS)**
  - 인증 사용자들 (AuthUser)
  - 사용자 프로필들 (User)
  - 이상형 프로필들 (IdealTypeProfile)
  - 사용자 위치들 (UserLocation)

- **매칭 관리 (MATCHING)** (해당 앱이 있다면)
  - 매칭들 (Match)
  - 알림들 (Notification)

---

## 🔧 비밀번호를 모르는 경우

### 방법 1: 스크립트로 비밀번호 재설정

```bash
python manage.py shell
```

그 다음 Python 코드 입력:
```python
from apps.users.models import AuthUser
from django.contrib.auth.hashers import make_password

user = AuthUser.objects.get(username='testuser')
user.password = make_password('test1234')  # 새 비밀번호
user.save()

print('✅ 비밀번호 재설정 완료!')
print('   Username: testuser')
print('   Password: test1234')
exit()  # shell 종료
```

### 방법 2: 비밀번호 재설정 스크립트 생성

`reset_password.py` 파일 생성:
```python
#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import AuthUser
from django.contrib.auth.hashers import make_password

user = AuthUser.objects.get(username='testuser')
user.password = make_password('test1234')
user.save()

print('✅ 비밀번호 재설정 완료!')
print('   Username: testuser')
print('   Password: test1234')
```

실행:
```bash
python reset_password.py
```

---

## ❌ 문제 해결

### 문제 1: "That port is already in use"

**원인:** 이미 서버가 실행 중

**해결:**
```bash
# 포트를 사용하는 프로세스 찾기
lsof -ti:8000

# 프로세스 종료
kill -9 $(lsof -ti:8000)

# 다시 서버 실행
python manage.py runserver
```

또는 다른 포트 사용:
```bash
python manage.py runserver 8001
```
그리고 `http://127.0.0.1:8001/admin/` 접속

---

### 문제 2: "Page not found (404)"

**확인 사항:**
- URL이 정확한지 확인: `/admin/` (마지막 슬래시 포함)
- 서버가 실행 중인지 확인
- `config/urls.py`에 `path('admin/', admin.site.urls)` 포함 확인

---

### 문제 3: "Please enter the correct username and password"

**해결:**
- Username 확인: `testuser`
- 비밀번호 재설정 (위의 "비밀번호를 모르는 경우" 참고)

---

### 문제 4: "CSRF verification failed"

**해결:**
- 브라우저 쿠키 삭제 후 재시도
- 서버 재시작

---

## 📝 전체 명령어 요약

```bash
# 1. 디렉토리 이동 및 가상환경 활성화
cd /Users/geon/Molip/2주차/backend
source venv/bin/activate

# 2. 서버 실행
python manage.py runserver

# 3. 브라우저에서 접속
# http://127.0.0.1:8000/admin/

# 4. 로그인
# Username: testuser
# Password: (기존 비밀번호 또는 재설정한 비밀번호)
```

---

## ✅ 체크리스트

- [ ] 가상환경 활성화 완료 (`(venv)` 표시 확인)
- [ ] Django 서버 실행 성공 (`Starting development server` 메시지 확인)
- [ ] 브라우저에서 `http://127.0.0.1:8000/admin/` 접속 성공
- [ ] 로그인 화면 표시
- [ ] 로그인 성공 (Admin 대시보드 표시)

---

**준비 완료! 이제 Django Admin에 접속할 수 있습니다!** 🎉
