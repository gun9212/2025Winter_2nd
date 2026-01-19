#!/usr/bin/env python
"""
API 12, 13, 15 테스트 스크립트

사용법:
1. Django 서버가 실행 중이어야 합니다: python manage.py runserver
2. 이 스크립트를 실행: python test_matching_apis.py

테스트 시나리오:
- rlawldus와 useruser 사용자의 위치가 이미 설정되어 있어야 합니다
- 두 사용자가 서로 매칭 조건에 부합해야 합니다
"""

import os
import sys
import django
import requests
import json

# Django 설정
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import AuthUser, User

# API 기본 URL
API_BASE_URL = 'http://127.0.0.1:8000/api'

# 테스트용 사용자 정보
TEST_USERS = {
    'rlawldus': {
        'location': {'latitude': 36.373920, 'longitude': 127.356692},
        'name': '카이스트 아름관 (N19)'
    },
    'useruser': {
        'location': {'latitude': 36.374626, 'longitude': 127.359518},
        'name': '카이스트 사랑관 (N14)'
    }
}

def print_section(title):
    """섹션 제목 출력"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def get_user_id(username):
    """사용자 ID 조회"""
    try:
        auth_user = AuthUser.objects.get(username=username)
        return auth_user.id
    except AuthUser.DoesNotExist:
        print(f"❌ 사용자 '{username}'를 찾을 수 없습니다.")
        return None

def test_api_12(user_id, latitude, longitude, radius=0.5):
    """
    API 12: 매칭 가능 인원 수 조회 테스트
    GET /api/matching/matchable-count/
    """
    print_section(f"API 12 테스트: 매칭 가능 인원 수 조회")
    
    url = f"{API_BASE_URL}/matching/matchable-count/"
    params = {
        'latitude': latitude,
        'longitude': longitude,
        'radius': radius,
        'user_id': user_id  # DEBUG 모드에서만 사용
    }
    
    print(f"📍 요청 URL: {url}")
    print(f"📍 Query Parameters: {params}")
    
    try:
        response = requests.get(url, params=params)
        print(f"\n📊 응답 상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 성공!")
            print(f"   매칭 가능 인원 수: {data.get('data', {}).get('matchable_count', 0)}명")
            print(f"   반경: {data.get('data', {}).get('radius', 0)}km ({data.get('data', {}).get('radius', 0) * 1000}m)")
            print(f"   마지막 업데이트: {data.get('data', {}).get('last_count_updated_at', 'N/A')}")
            print(f"\n📋 전체 응답:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            return True
        else:
            print(f"❌ 실패: {response.status_code}")
            print(f"   응답: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ 서버에 연결할 수 없습니다. Django 서버가 실행 중인지 확인하세요.")
        print(f"   실행 명령: python manage.py runserver")
        return False
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        return False

def test_api_13(user_id, radius=0.5):
    """
    API 13: 매칭 체크 (포그라운드) 테스트
    GET /api/matching/check/
    """
    print_section(f"API 13 테스트: 매칭 체크 (포그라운드)")
    
    url = f"{API_BASE_URL}/matching/check/"
    params = {
        'radius': radius,
        'user_id': user_id  # DEBUG 모드에서만 사용
    }
    
    print(f"📍 요청 URL: {url}")
    print(f"📍 Query Parameters: {params}")
    print(f"   (위치 정보는 DB에서 자동으로 가져옵니다)")
    
    try:
        response = requests.get(url, params=params)
        print(f"\n📊 응답 상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 성공!")
            
            match_data = data.get('data', {})
            has_new_match = match_data.get('has_new_match', False)
            new_matches_count = match_data.get('new_matches_count', 0)
            
            print(f"   새로운 매칭 발생: {'✅ 예' if has_new_match else '❌ 아니오'}")
            print(f"   새로운 매칭 개수: {new_matches_count}개")
            
            if has_new_match and match_data.get('latest_match'):
                latest_match = match_data['latest_match']
                print(f"\n   최신 매칭 정보:")
                print(f"   - 매칭 ID: {latest_match.get('id')}")
                print(f"   - 사용자1: {latest_match.get('user1', {}).get('username')}")
                print(f"   - 사용자2: {latest_match.get('user2', {}).get('username')}")
                print(f"   - 매칭 시간: {latest_match.get('matched_at')}")
                print(f"   - 매칭 조건:")
                criteria = latest_match.get('matched_criteria', {})
                print(f"     * 거리: {criteria.get('distance_m', 0):.2f}m")
                print(f"     * 매칭 점수: {criteria.get('match_score', 0)}/4")
            
            print(f"\n📋 전체 응답:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            return True
        else:
            print(f"❌ 실패: {response.status_code}")
            print(f"   응답: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ 서버에 연결할 수 없습니다. Django 서버가 실행 중인지 확인하세요.")
        print(f"   실행 명령: python manage.py runserver")
        return False
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        return False

def test_api_15(user_id, fcm_token="test_fcm_token_12345", device_type="ios"):
    """
    API 15: 백그라운드 알림 등록 테스트
    POST /api/matching/notifications/register/
    """
    print_section(f"API 15 테스트: 백그라운드 알림 등록")
    
    url = f"{API_BASE_URL}/matching/notifications/register/"
    data = {
        'fcm_token': fcm_token,
        'device_type': device_type,
        'user_id': user_id  # DEBUG 모드에서만 사용
    }
    
    print(f"📍 요청 URL: {url}")
    print(f"📍 Request Body: {json.dumps(data, indent=2, ensure_ascii=False)}")
    
    try:
        response = requests.post(url, json=data)
        print(f"\n📊 응답 상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 성공!")
            print(f"   메시지: {result.get('message')}")
            
            notification_data = result.get('data', {})
            print(f"   알림 ID: {notification_data.get('notification_id')}")
            print(f"   디바이스 타입: {notification_data.get('device_type')}")
            print(f"   활성화 여부: {'✅ 활성화' if notification_data.get('is_active') else '❌ 비활성화'}")
            
            print(f"\n📋 전체 응답:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            return True
        else:
            print(f"❌ 실패: {response.status_code}")
            print(f"   응답: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ 서버에 연결할 수 없습니다. Django 서버가 실행 중인지 확인하세요.")
        print(f"   실행 명령: python manage.py runserver")
        return False
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        return False

def main():
    print_section("매칭 API 테스트 시작")
    
    # 사용자 ID 조회
    print("\n📝 테스트 사용자 확인 중...")
    user1_id = get_user_id('rlawldus')
    user2_id = get_user_id('useruser')
    
    if not user1_id or not user2_id:
        print("❌ 테스트 사용자를 찾을 수 없습니다.")
        print("   먼저 set_custom_locations.py를 실행하여 사용자 위치를 설정하세요.")
        return
    
    print(f"✅ rlawldus: ID {user1_id}")
    print(f"✅ useruser: ID {user2_id}")
    
    # 사용자 위치 정보
    user1_location = TEST_USERS['rlawldus']['location']
    user2_location = TEST_USERS['useruser']['location']
    
    print(f"\n📍 rlawldus 위치: {user1_location['latitude']}, {user1_location['longitude']} ({TEST_USERS['rlawldus']['name']})")
    print(f"📍 useruser 위치: {user2_location['latitude']}, {user2_location['longitude']} ({TEST_USERS['useruser']['name']})")
    
    # API 12 테스트 (rlawldus 사용자)
    print_section("1단계: API 12 테스트")
    api12_success = test_api_12(
        user_id=user1_id,
        latitude=user1_location['latitude'],
        longitude=user1_location['longitude'],
        radius=0.5
    )
    
    # API 13 테스트 (rlawldus 사용자)
    print_section("2단계: API 13 테스트")
    api13_success = test_api_13(
        user_id=user1_id,
        radius=0.5
    )
    
    # API 15 테스트 (rlawldus 사용자)
    print_section("3단계: API 15 테스트")
    api15_success = test_api_15(
        user_id=user1_id,
        fcm_token="test_fcm_token_rlawldus_12345",
        device_type="ios"
    )
    
    # 결과 요약
    print_section("테스트 결과 요약")
    print(f"API 12 (매칭 가능 인원 수 조회): {'✅ 성공' if api12_success else '❌ 실패'}")
    print(f"API 13 (매칭 체크): {'✅ 성공' if api13_success else '❌ 실패'}")
    print(f"API 15 (백그라운드 알림 등록): {'✅ 성공' if api15_success else '❌ 실패'}")
    
    if api12_success and api13_success and api15_success:
        print("\n🎉 모든 API 테스트가 성공했습니다!")
    else:
        print("\n⚠️ 일부 API 테스트가 실패했습니다. 위의 오류 메시지를 확인하세요.")

if __name__ == '__main__':
    main()
