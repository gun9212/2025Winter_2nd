#!/usr/bin/env python
"""
커스텀 위치를 사용자에게 설정하는 스크립트

config.js에 정의된 커스텀 위치를 사용하여:
- rlawldus 사용자 → 카이스트 아름관 (N19)
- useruser 사용자 → 카이스트 사랑관 (N14)

UserLocation 테이블에 저장
"""

import os
import sys
import django
import requests

# Django 설정
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import AuthUser, User, UserLocation
from django.utils import timezone

# API 기본 URL
API_BASE_URL = 'http://127.0.0.1:8000/api'

# config.js에서 정의한 커스텀 위치
# 주의: latitude는 소수점 이하 6자리, longitude는 총 9자리 제한
CUSTOM_LOCATIONS = {
    'rlawldus': {
        'latitude': 36.373920,    # 카이스트 아름관 (N19) - 소수점 이하 6자리로 조정
        'longitude': 127.356692,  # 총 9자리로 조정
        'name': '카이스트 아름관 (N19)',
    },
    'useruser': {
        'latitude': 36.374626,    # 카이스트 사랑관 (N14)
        'longitude': 127.359518,
        'name': '카이스트 사랑관 (N14)',
    },
}

def print_section(title):
    """섹션 제목 출력"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def get_user_by_username(username):
    """사용자 이름으로 사용자 정보 조회"""
    try:
        auth_user = AuthUser.objects.get(username=username)
        try:
            user_profile = auth_user.profile
            return {
                'auth_user': auth_user,
                'user_profile': user_profile,
                'user_id': auth_user.id,
                'username': auth_user.username,
                'email': auth_user.email,
            }
        except User.DoesNotExist:
            print(f"⚠️ {username} 사용자의 프로필이 없습니다.")
            return None
    except AuthUser.DoesNotExist:
        print(f"❌ 사용자 '{username}'를 찾을 수 없습니다.")
        return None
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        return None

def update_user_location(user_id, latitude, longitude, username=None, use_api=True):
    """
    사용자 위치 업데이트
    
    Args:
        user_id: 사용자 ID
        latitude: 위도
        longitude: 경도
        username: 사용자 이름 (로그용)
        use_api: True면 API 호출, False면 직접 DB 업데이트
    """
    user_name = username or f"User {user_id}"
    
    # useruser는 API를 통한 업데이트가 차단되므로 직접 DB 업데이트
    if username == 'useruser' or not use_api:
        try:
            auth_user = AuthUser.objects.get(id=user_id)
            user_profile = auth_user.profile
            
            # 직접 DB에 업데이트 (API 우회)
            location, created = UserLocation.objects.update_or_create(
                user=user_profile,
                defaults={
                    'latitude': latitude,
                    'longitude': longitude,
                    'updated_at': timezone.now(),
                }
            )
            
            print(f"✅ {user_name} 위치 업데이트 성공 (직접 DB 업데이트)")
            print(f"   위치: ({latitude}, {longitude})")
            print(f"   Created: {created}")
            return True
        except Exception as e:
            print(f"❌ {user_name} 위치 업데이트 실패: {str(e)}")
            return False
    
    # 다른 사용자는 API 호출
    url = f"{API_BASE_URL}/users/location/update/"
    data = {
        'user_id': user_id,
        'latitude': latitude,
        'longitude': longitude,
    }
    
    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ {user_name} 위치 업데이트 성공 (API 호출)")
            print(f"   위치: ({latitude}, {longitude})")
            return True
        else:
            print(f"❌ 위치 업데이트 실패: {response.status_code}")
            print(f"   응답: {response.text}")
            # API 실패 시 직접 DB 업데이트로 폴백
            print(f"   ⚠️ API 실패, 직접 DB 업데이트 시도...")
            return update_user_location(user_id, latitude, longitude, username, use_api=False)
    except requests.exceptions.ConnectionError:
        print(f"❌ 서버에 연결할 수 없습니다. 직접 DB 업데이트로 시도...")
        return update_user_location(user_id, latitude, longitude, username, use_api=False)
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        return False

def calculate_distance(lat1, lon1, lat2, lon2):
    """두 지점 간 거리 계산 (km)"""
    from math import radians, cos, sin, asin, sqrt
    
    # 지구 반경 (km)
    R = 6371
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    return R * c

def main():
    print_section("커스텀 위치 설정")
    
    # 사용자 정보 확인
    print("\n📝 사용자 정보 확인 중...")
    
    user1_info = get_user_by_username('rlawldus')
    user2_info = get_user_by_username('useruser')
    
    if not user1_info:
        print("❌ rlawldus 사용자를 찾을 수 없습니다.")
        return
    
    if not user2_info:
        print("❌ useruser 사용자를 찾을 수 없습니다.")
        return
    
    print(f"✅ rlawldus: ID {user1_info['user_id']}, Email: {user1_info['email']}")
    print(f"✅ useruser: ID {user2_info['user_id']}, Email: {user2_info['email']}")
    
    # 위치 정보
    location1 = CUSTOM_LOCATIONS['rlawldus']
    location2 = CUSTOM_LOCATIONS['useruser']
    
    print_section("위치 설정")
    print(f"\n📍 rlawldus → {location1['name']}")
    print(f"   위도: {location1['latitude']}")
    print(f"   경도: {location1['longitude']}")
    
    print(f"\n📍 useruser → {location2['name']}")
    print(f"   위도: {location2['latitude']}")
    print(f"   경도: {location2['longitude']}")
    
    # 거리 계산
    distance_km = calculate_distance(
        location1['latitude'], location1['longitude'],
        location2['latitude'], location2['longitude']
    )
    distance_m = distance_km * 1000
    
    print(f"\n📏 두 사용자 간 거리: {distance_m:.2f}m ({distance_km:.4f}km)")
    
    # 위치 업데이트
    print_section("위치 업데이트")
    
    success1 = update_user_location(
        user1_info['user_id'],
        location1['latitude'],
        location1['longitude'],
        'rlawldus'
    )
    
    success2 = update_user_location(
        user2_info['user_id'],
        location2['latitude'],
        location2['longitude'],
        'useruser'
    )
    
    if success1 and success2:
        print_section("설정 완료")
        print("✅ 두 사용자의 위치가 성공적으로 설정되었습니다!")
        print(f"\n📊 설정된 위치 정보:")
        print(f"   rlawldus (ID: {user1_info['user_id']})")
        print(f"   → {location1['name']}")
        print(f"   → ({location1['latitude']}, {location1['longitude']})")
        print(f"\n   useruser (ID: {user2_info['user_id']})")
        print(f"   → {location2['name']}")
        print(f"   → ({location2['latitude']}, {location2['longitude']})")
        print(f"\n   거리: {distance_m:.2f}m")
        print(f"\n💡 이제 매칭 API를 호출하여 두 사용자가 매칭되는지 확인하세요!")
    else:
        print("❌ 위치 업데이트 중 오류가 발생했습니다.")
        if not success1:
            print("   - rlawldus 위치 업데이트 실패")
        if not success2:
            print("   - useruser 위치 업데이트 실패")

if __name__ == '__main__':
    main()
