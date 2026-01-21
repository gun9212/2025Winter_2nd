## IdealMatch (2025 Winter 2nd)

**이상형 매칭 모바일 앱** 프로젝트입니다.

- **Frontend**: React Native 앱 (`Frontend/IdealMatchApp`)
- **Backend**: Django REST API + JWT (`backend/`)
- **데이터/캐시**: PostgreSQL + Redis

## 레포 구조

```
./
├── Frontend/
│   ├── IdealMatchApp/          # React Native 앱
│   └── README.md               # 프론트엔드 문서(실행/설정)
└── backend/                    # Django 백엔드(API)
```

## 문서

- 프론트엔드(React Native): `Frontend/README.md`
- 앱 프로젝트 기본 README(템플릿): `Frontend/IdealMatchApp/README.md`

## 빠른 시작(로컬 개발)

### Backend (Django)

#### 요구사항

- Python **3.10+** (Django 5.x)
- PostgreSQL
- Redis (이메일 인증번호/캐시 등에 사용)

#### 설치/실행

```bash
cd backend

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

#### 환경변수(.env, 선택)

`backend/config/settings.py`는 `python-decouple`을 사용하며 기본값이 존재합니다. 필요 시 `backend/.env`를 만들어 설정을 덮어쓸 수 있습니다.

```env
# Django
SECRET_KEY=django-insecure-change-this-in-production
DEBUG=True

# PostgreSQL
DB_NAME=ideal_match_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# 이메일/인증 (선택)
USE_AWS_SES=False
AWS_SES_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
DEFAULT_FROM_EMAIL=noreply@idealmatch.com
```

#### API 기본 경로

- Base URL: `http://127.0.0.1:8000/api`
- Users: `/api/users/...`
- Matching: `/api/matching/...`

### Frontend (React Native)

#### 요구사항

- Node.js **16+**
- iOS: Xcode, CocoaPods

#### 설치/실행(iOS)

```bash
cd Frontend/IdealMatchApp
npm install

cd ios && pod install && cd ..
npm start
npm run ios
```

#### 백엔드 주소 설정(중요)

프론트 API 주소는 `Frontend/IdealMatchApp/src/constants/config.js`에서 결정됩니다.

- 개발 모드에서 로컬 백엔드를 쓰려면(기본):
  - iOS 시뮬레이터: `USE_SIMULATOR = true` → `http://127.0.0.1:8000/api`
  - iOS 실기기: `LOCAL_IP`를 본인 Mac의 로컬 IP로 설정 → `http://{LOCAL_IP}:8000/api`
- 개발 모드에서 EC2를 쓰려면: `USE_EC2_API_IN_DEV = true`

## 참고(동작 특성)

- 이메일 인증번호는 **Redis 캐시**에 저장됩니다(유효시간 2분). 로컬 개발에서는 `DEBUG=True`이고 `USE_AWS_SES=False`일 때 인증번호가 서버 콘솔/응답에 포함될 수 있습니다.
- 푸시(FCM)는 현재 프론트에서 Firebase 라이브러리를 사용하지 않도록 처리되어 있으며, 기본은 **Notifee 로컬 알림**입니다.

