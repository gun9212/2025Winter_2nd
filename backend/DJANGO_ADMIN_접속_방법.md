# Django Admin 접속 방법

Django Admin에 접속하기 위한 단계별 가이드입니다.

---

## 📋 해결 완료 사항

✅ `AuthUser` 모델에 `is_staff`, `is_superuser` 필드 추가
✅ 권한 확인 메서드 (`has_perm`, `has_module_perms`) 구현
✅ 관리자 계정 생성 스크립트 준비

---

## 🚀 접속 방법 (순서대로 진행)

### 1단계: 마이그레이션 생성 및 적용

```bash
cd backend
source venv/bin/activate

# 마이그레이션 생성
python manage.py makemigrations

# 마이그레이션 적용
python manage.py migrate
```

**⚠️ 중요**: 모델 변경사항을 DB에 반영해야 합니다!

---

### 2단계: 관리자 계정 생성

**방법 1: 스크립트 사용 (권장)**

```bash
python create_admin_user.py
```

**결과 예시:**
```
✅ 관리자 계정 생성 완료!
   Username: admin
   Password: admin1234

💡 Django Admin 접속: http://127.0.0.1:8000/admin/
```

**방법 2: Django Shell 사용**

```bash
python manage.py shell
```

```python
from apps.users.models import AuthUser
from django.contrib.auth.hashers import make_password

admin_user = AuthUser.objects.create(
    username='admin',
    password=make_password('admin1234'),
    phone_number='01000000000',
    phone_verified=True,
    is_staff=True,      # Django Admin 접근 권한
    is_superuser=True,  # 모든 권한
    is_active=True,
)

print(f'✅ 관리자 계정 생성 완료!')
print(f'   Username: admin')
print(f'   Password: admin1234')
```

**방법 3: Django createsuperuser 사용 (이제 작동함)**

```bash
python manage.py createsuperuser
```

---

### 3단계: Django 서버 실행

```bash
python manage.py runserver
```

---

### 4단계: 브라우저에서 접속

**URL**: `http://127.0.0.1:8000/admin/`

**또는**: `http://localhost:8000/admin/`

**로그인 정보:**
- Username: `admin`
- Password: `admin1234` (스크립트로 생성한 경우)

---

## 📝 Admin에서 확인 가능한 모델

1. **AuthUser** - 인증 사용자
2. **User** - 사용자 프로필
3. **IdealTypeProfile** - 이상형 프로필
4. **UserLocation** - 사용자 위치
5. **Match** - 매칭 정보 (matching 앱)
6. **Notification** - 알림 (matching 앱)

---

## 🔧 문제 해결

### 문제 1: "마이그레이션을 적용할 수 없습니다"

**해결:**
```bash
# 마이그레이션 파일 확인
python manage.py showmigrations

# 특정 앱의 마이그레이션 강제 적용
python manage.py migrate users --fake-initial
```

### 문제 2: "로그인 화면이 나타나지 않습니다"

**확인 사항:**
- 서버가 실행 중인지 확인: `python manage.py runserver`
- URL이 정확한지 확인: `/admin/` (마지막 슬래시 포함)
- 브라우저 캐시 삭제 후 재시도

### 문제 3: "권한이 없습니다" 또는 "접근할 수 없습니다"

**해결:**
- 계정에 `is_staff=True`, `is_superuser=True` 설정 확인
- Django Shell에서 확인:
```python
from apps.users.models import AuthUser
user = AuthUser.objects.get(username='admin')
print(f'is_staff: {user.is_staff}')
print(f'is_superuser: {user.is_superuser}')
```

권한 수정:
```python
user.is_staff = True
user.is_superuser = True
user.save()
```

---

## ✅ 완료 확인

- [ ] 마이그레이션 완료 (`python manage.py migrate`)
- [ ] 관리자 계정 생성 완료
- [ ] Django 서버 실행 중
- [ ] `http://127.0.0.1:8000/admin/` 접속 성공
- [ ] 로그인 성공
- [ ] 모델들이 Admin에 표시됨

---

**준비 완료! 이제 Django Admin에 접속할 수 있습니다!** 🎉
