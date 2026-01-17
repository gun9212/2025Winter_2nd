# 데이터베이스 접근 가이드

## 개요

이 프로젝트는 **PostgreSQL** 데이터베이스를 사용하며, `python-decouple`를 통해 환경 변수로 설정을 관리합니다.

---

## 데이터베이스 설정

### 현재 설정 (settings.py)

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='ideal_match_db'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default='postgres'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}
```

### 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하여 데이터베이스 정보를 설정합니다:

```bash
# backend/.env

# 데이터베이스 설정
DB_NAME=ideal_match_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# Django 설정
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Redis 설정
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 데이터베이스 설치 및 설정

### 1. PostgreSQL 설치

#### macOS
```bash
# Homebrew 사용
brew install postgresql@15
brew services start postgresql@15

# 또는 PostgreSQL.app 사용
# https://postgresapp.com/
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Windows
1. PostgreSQL 공식 사이트에서 다운로드: https://www.postgresql.org/download/windows/
2. 설치 후 PostgreSQL 서비스 시작

### 2. 데이터베이스 생성

PostgreSQL에 접속하여 데이터베이스를 생성합니다:

```bash
# PostgreSQL에 접속
psql -U postgres

# 또는 특정 사용자로 접속
psql -U your_username -d postgres
```

SQL 명령어로 데이터베이스 생성:

```sql
-- 데이터베이스 생성
CREATE DATABASE ideal_match_db;

-- 사용자 생성 (선택사항)
CREATE USER ideal_match_user WITH PASSWORD 'your_password';

-- 권한 부여
GRANT ALL PRIVILEGES ON DATABASE ideal_match_db TO ideal_match_user;
\q
```

### 3. 연결 확인

터미널에서 직접 연결 테스트:

```bash
psql -h localhost -U postgres -d ideal_match_db
```

또는 Python 스크립트로 확인:

```bash
cd backend
python test_db_connection.py
```

---

## Django에서 데이터베이스 사용

### 1. 마이그레이션 생성

모델 변경 후:

```bash
cd backend
python manage.py makemigrations
```

### 2. 마이그레이션 적용

```bash
python manage.py migrate
```

### 3. Django Shell에서 DB 접근

```bash
python manage.py shell
```

```python
# Django ORM 사용 예시
from apps.users.models import AuthUser
from apps.matching.models import Match

# 모든 사용자 조회
users = AuthUser.objects.all()

# 특정 사용자 조회
user = AuthUser.objects.get(user_id='test1')

# 새 사용자 생성
new_user = AuthUser.objects.create(
    user_id='new_user',
    email='user@example.com',
    # ... 기타 필드
)

# 매칭 조회
matches = Match.objects.filter(status='matched')
```

---

## 환경별 설정

### 개발 환경 (로컬)

`.env` 파일:
```bash
DB_NAME=ideal_match_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DEBUG=True
```

### 프로덕션 환경

환경 변수나 서버 설정으로 관리:

```bash
DB_NAME=ideal_match_prod
DB_USER=prod_user
DB_PASSWORD=secure_password_here
DB_HOST=your-db-server.com
DB_PORT=5432
DEBUG=False
SECRET_KEY=production-secret-key
```

---

## PostgreSQL 클라이언트 도구

### 1. psql (명령줄)

```bash
# 연결
psql -h localhost -U postgres -d ideal_match_db

# 유용한 명령어
\l          # 데이터베이스 목록
\dt         # 테이블 목록
\d table_name  # 테이블 구조
\q          # 종료
```

### 2. pgAdmin (GUI)

- 다운로드: https://www.pgadmin.org/
- 웹 기반 PostgreSQL 관리 도구
- 시각적으로 데이터베이스 관리 가능

### 3. DBeaver (범용 DB 클라이언트)

- 다운로드: https://dbeaver.io/
- PostgreSQL 외에도 다양한 데이터베이스 지원
- 무료 버전 제공

---

## Redis 설정

### Redis 설치 (캐시 및 WebSocket용)

#### macOS
```bash
brew install redis
brew services start redis
```

#### Linux
```bash
sudo apt install redis-server
sudo systemctl start redis
```

#### Windows
- 다운로드: https://redis.io/download
- 또는 WSL2 사용

### 연결 확인

```bash
redis-cli ping
# 응답: PONG
```

### Redis 사용 (Django Shell)

```python
from django.core.cache import cache

# 캐시 설정
cache.set('key', 'value', 300)  # 300초(5분) 동안 저장

# 캐시 가져오기
value = cache.get('key')

# 캐시 삭제
cache.delete('key')
```

---

## 트러블슈팅

### 문제 1: 연결 거부 오류

```
django.db.utils.OperationalError: could not connect to server
```

**해결 방법:**
1. PostgreSQL 서비스가 실행 중인지 확인
   ```bash
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status postgresql
   ```
2. PostgreSQL 시작
   ```bash
   brew services start postgresql@15
   # 또는
   sudo systemctl start postgresql
   ```
3. 포트 확인
   ```bash
   lsof -i :5432
   ```

### 문제 2: 인증 실패

```
password authentication failed for user
```

**해결 방법:**
1. 사용자 비밀번호 확인
2. PostgreSQL 설정 확인 (`pg_hba.conf`)
3. `.env` 파일의 `DB_USER`, `DB_PASSWORD` 확인

### 문제 3: 데이터베이스가 존재하지 않음

```
FATAL: database "ideal_match_db" does not exist
```

**해결 방법:**
```sql
-- PostgreSQL에 접속
psql -U postgres

-- 데이터베이스 생성
CREATE DATABASE ideal_match_db;
```

### 문제 4: 마이그레이션 오류

```bash
# 마이그레이션 초기화 (주의: 데이터 손실 가능)
python manage.py migrate --run-syncdb

# 특정 앱의 마이그레이션만 리셋
python manage.py migrate app_name zero
python manage.py migrate app_name
```

---

## 보안 주의사항

### ⚠️ 중요

1. **`.env` 파일을 절대 Git에 커밋하지 마세요**
   - `.gitignore`에 `.env` 추가 확인
   - 프로덕션 환경 변수는 별도 관리

2. **SECRET_KEY 보호**
   - 개발용과 프로덕션용을 다르게 설정
   - 공개 저장소에 노출 금지

3. **데이터베이스 비밀번호**
   - 강력한 비밀번호 사용
   - 프로덕션에서는 환경 변수로만 관리

---

## 유용한 명령어 모음

```bash
# 데이터베이스 백업
pg_dump -U postgres ideal_match_db > backup.sql

# 데이터베이스 복원
psql -U postgres ideal_match_db < backup.sql

# 테이블 데이터 확인
psql -U postgres -d ideal_match_db -c "SELECT * FROM users_authuser LIMIT 10;"

# Django 관리자 계정 생성
python manage.py createsuperuser

# 마이그레이션 상태 확인
python manage.py showmigrations

# 특정 마이그레이션 실행
python manage.py migrate app_name migration_name
```

---

## 참고 자료

- [Django 데이터베이스 공식 문서](https://docs.djangoproject.com/en/5.0/ref/databases/)
- [PostgreSQL 공식 문서](https://www.postgresql.org/docs/)
- [python-decouple 문서](https://github.com/henriquebastos/python-decouple)

---

**작성일**: 2026-01-16  
**프로젝트**: IdealMatchApp Backend  
**버전**: 1.0
