# Django Admin에서 GPS 위치 정보 확인 가이드

## 📍 위치 정보 확인 방법

---

## 방법 1: Django Admin에서 확인 (UI)

### 1단계: Django Admin 대시보드 접속
```
http://127.0.0.1:8000/admin/
```

### 2단계: "사용자 위치들 (User locations)" 클릭

**경로:**
- Django Admin 대시보드
- **USERS** 섹션
- **사용자 위치들** 클릭

### 3단계: 위치 데이터 확인

각 레코드에서 다음 정보를 확인할 수 있습니다:
- **사용자 (User)**: 누구의 위치인지
- **위도 (Latitude)**: GPS 위도 좌표
- **경도 (Longitude)**: GPS 경도 좌표
- **업데이트 시간 (Updated at)**: 마지막 업데이트 시각

---

## 방법 2: Django Shell에서 확인 (명령어)

### 모든 위치 정보 조회

```bash
cd /Users/geon/Molip/2주차/backend
source venv/bin/activate
python manage.py shell
```

```python
from apps.users.models import UserLocation

# 모든 위치 정보 조회
locations = UserLocation.objects.all()

print(f"총 {locations.count()}개의 위치 정보가 있습니다.\n")

for loc in locations:
    print(f"사용자: {loc.user.user.username}")
    print(f"위도: {loc.latitude}")
    print(f"경도: {loc.longitude}")
    print(f"업데이트 시간: {loc.updated_at}")
    print("-" * 50)
```

### 특정 사용자의 위치 확인

```python
from apps.users.models import UserLocation, AuthUser

# username으로 사용자 찾기
user = AuthUser.objects.get(username='testuser')
user_profile = user.profile

# 해당 사용자의 위치 확인
try:
    location = UserLocation.objects.get(user=user_profile)
    print(f"사용자: {user.username}")
    print(f"위도: {location.latitude}")
    print(f"경도: {location.longitude}")
    print(f"업데이트 시간: {location.updated_at}")
except UserLocation.DoesNotExist:
    print(f"{user.username}의 위치 정보가 없습니다.")
```

---

## 방법 3: 위치 정보가 없는 경우 - 테스트 데이터 추가

### 방법 A: Django Admin에서 직접 추가

1. Django Admin → **사용자 위치들** 클릭
2. 우측 상단 **"사용자 위치 추가"** 버튼 클릭
3. 다음 정보 입력:
   - **사용자**: 드롭다운에서 선택 (예: testuser의 프로필)
   - **위도**: 예) `37.5665` (서울시청)
   - **경도**: 예) `126.9780` (서울시청)
4. **저장** 버튼 클릭

### 방법 B: Django Shell에서 추가

```bash
python manage.py shell
```

```python
from apps.users.models import UserLocation, AuthUser
from django.utils import timezone

# 사용자 찾기
user = AuthUser.objects.get(username='testuser')
user_profile = user.profile

# 위치 정보 추가 (서울시청 좌표)
location, created = UserLocation.objects.update_or_create(
    user=user_profile,
    defaults={
        'latitude': 37.5665,  # 서울시청 위도
        'longitude': 126.9780,  # 서울시청 경도
    }
)

if created:
    print(f"✅ {user.username}의 위치 정보가 생성되었습니다.")
else:
    print(f"✅ {user.username}의 위치 정보가 업데이트되었습니다.")

print(f"위도: {location.latitude}")
print(f"경도: {location.longitude}")
```

### 방법 C: API를 통해 업데이트

```bash
# API 호출 예시 (curl 사용)
curl -X POST http://127.0.0.1:8000/api/users/location/update/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "latitude": 37.5665,
    "longitude": 126.9780
  }'
```

**또는 프론트엔드 앱에서 위치 업데이트**

앱을 실행하면 자동으로 위치 정보가 업데이트됩니다.

---

## 📊 위치 정보 상세 조회 스크립트

다음 스크립트를 사용하면 모든 위치 정보를 한 번에 확인할 수 있습니다:

```bash
python check_locations.py
```

---

## 🗺️ 주요 위치 좌표 참고

### 서울 주요 지역
- **서울시청**: 위도 `37.5665`, 경도 `126.9780`
- **강남역**: 위도 `37.4980`, 경도 `127.0276`
- **홍대입구역**: 위도 `37.5567`, 경도 `126.9236`
- **명동**: 위도 `37.5636`, 경도 `126.9826`

### 부산
- **해운대**: 위도 `35.1631`, 경도 `129.1636`

### 제주
- **제주공항**: 위도 `33.5112`, 경도 `126.4931`

---

## ✅ 체크리스트

- [ ] Django Admin에서 "사용자 위치들" 메뉴 확인
- [ ] 위치 데이터가 있는지 확인
- [ ] 데이터가 없으면 테스트 데이터 추가
- [ ] 위치 정보 (위도, 경도) 확인
- [ ] 업데이트 시간 확인

---

**위치 정보를 확인했으면, 이제 프론트엔드 앱을 실행하여 실시간 위치 업데이트를 테스트할 수 있습니다!** 🎉
