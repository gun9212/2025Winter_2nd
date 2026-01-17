# Django Admin 접속 가이드

Django Admin에 접속하기 위한 설정 방법입니다.

---

## Django Admin 접속 문제 해결

### 1단계: 관리자 계정(Superuser) 생성

**필수**: Django Admin에 접속하려면 관리자 계정이 필요합니다.

```bash
cd backend
source venv/bin/activate
python manage.py createsuperuser
```

**입력 예시:**
```
Username (leave blank to use 'admin'): admin
Email address: admin@example.com
Password: [비밀번호 입력]
Password (again): [비밀번호 확인]
```

**⚠️ 주의사항:**
- `AuthUser` 모델을 사용하는 경우, 일반 `createsuperuser`가 작동하지 않을 수 있습니다.
- 커스텀 User 모델 사용 시 별도 설정 필요

---

### 2단계: 데이터베이스 마이그레이션 확인

```bash
# 마이그레이션 확인
python manage.py showmigrations

# 마이그레이션이 없으면 실행
python manage.py makemigrations
python manage.py migrate
```

---

### 3단계: Admin에 커스텀 모델 등록 확인

**파일**: `backend/apps/users/admin.py`

현재 등록된 모델:
- ✅ AuthUser
- ✅ User
- ✅ IdealTypeProfile
- ✅ UserLocation

---

### 4단계: Django 서버 실행

```bash
python manage.py runserver
```

**서버 실행 확인:**
- 브라우저에서 `http://127.0.0.1:8000/admin/` 접속
- 로그인 화면이 나타나야 함

---

## 커스텀 User 모델 문제 해결

`AuthUser` 모델을 사용하는 경우, 관리자 계정 생성이 다를 수 있습니다.

### 방법 1: Django Shell에서 직접 생성

```bash
python manage.py shell
```

```python
from apps.users.models import AuthUser
from django.contrib.auth.hashers import make_password

# 관리자 계정 생성
admin_user = AuthUser.objects.create(
    username='admin',
    password=make_password('admin1234'),
    phone_number='01000000000',
    phone_verified=True
)

print(f'✅ 관리자 계정 생성 완료!')
print(f'   Username: admin')
print(f'   Password: admin1234')
```

### 방법 2: Admin에서 AuthUser로 직접 생성

1. `AuthUser` 모델이 Admin에 등록되어 있는지 확인
2. Admin 페이지에서 직접 생성 (비밀번호는 해시화 필요)

---

## 접속 테스트

1. **서버 실행 확인:**
```bash
python manage.py runserver
```

2. **브라우저에서 접속:**
- URL: `http://127.0.0.1:8000/admin/`
- 또는: `http://localhost:8000/admin/`

3. **로그인:**
- Username: 관리자 계정 username
- Password: 설정한 비밀번호

---

## 문제 해결

### 문제 1: "관리자 계정을 찾을 수 없습니다"

**해결:**
```bash
python manage.py shell
```
```python
from apps.users.models import AuthUser
# 관리자 계정이 있는지 확인
print(AuthUser.objects.all())
```

### 문제 2: "404 Not Found"

**확인 사항:**
- URL이 정확한지 확인: `/admin/` (마지막 슬래시 포함)
- 서버가 실행 중인지 확인
- `config/urls.py`에 `path('admin/', admin.site.urls)` 포함 확인

### 문제 3: "CSRF verification failed"

**해결:**
- 브라우저 쿠키 삭제
- `settings.py`의 `ALLOWED_HOSTS` 확인
- 서버 재시작

### 문제 4: "django.contrib.auth.models.User" 관련 에러

**원인:** 커스텀 User 모델 사용 시 발생

**해결:**
- `settings.py`에 `AUTH_USER_MODEL = 'users.AuthUser'` 확인
- 마이그레이션 다시 실행:
```bash
python manage.py makemigrations
python manage.py migrate
```

---

## 관리자 계정 생성 스크립트

`backend/create_admin_user.py` 파일 생성:

```python
#!/usr/bin/env python
"""Django Admin 계정 생성 스크립트"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import AuthUser
from django.contrib.auth.hashers import make_password

# 관리자 계정 생성
username = 'admin'
password = 'admin1234'  # 프로덕션에서는 반드시 변경!

admin_user, created = AuthUser.objects.get_or_create(
    username=username,
    defaults={
        'password': make_password(password),
        'phone_number': '01000000000',
        'phone_verified': True,
    }
)

if created:
    print(f'✅ 관리자 계정 생성 완료!')
    print(f'   Username: {username}')
    print(f'   Password: {password}')
else:
    print(f'ℹ️  관리자 계정이 이미 존재합니다: {username}')
```

**실행:**
```bash
cd backend
source venv/bin/activate
python create_admin_user.py
```

---

## 체크리스트

- [ ] 데이터베이스 마이그레이션 완료
- [ ] 관리자 계정 생성 완료
- [ ] Django 서버 실행 중
- [ ] Admin URL 접속 가능 (`http://127.0.0.1:8000/admin/`)
- [ ] 로그인 성공
- [ ] 모델들이 Admin에 표시됨

---

**문제가 지속되면:**
1. Django 서버 로그 확인
2. 브라우저 개발자 도구 콘솔 확인
3. 에러 메시지 전체 확인
