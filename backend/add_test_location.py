#!/usr/bin/env python
"""
테스트 위치 데이터 추가 스크립트
사용법: python add_test_location.py
"""
import os
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import UserLocation, AuthUser, User

print("=" * 60)
print("📍 테스트 위치 데이터 추가")
print("=" * 60)

# 사용자 확인
users = AuthUser.objects.all()

if not users.exists():
    print("\n❌ 등록된 사용자가 없습니다.")
    print("   먼저 사용자를 생성해주세요.")
else:
    print(f"\n✅ 총 {users.count()}명의 사용자가 있습니다.\n")
    
    # testuser 찾기
    try:
        user = AuthUser.objects.get(username='testuser')
        user_profile, created = User.objects.get_or_create(
            user=user,
            defaults={
                'age': 25,
                'gender': 'M',
                'height': 175,
                'mbti': 'ENFP',
                'personality': ['활발한', '긍정적인'],
                'interests': ['영화', '음악', '여행'],
                'matching_consent': True,
                'service_active': True,
            }
        )
        
        if created:
            print(f"✅ {user.username}의 프로필이 생성되었습니다.")
        
        # 위치 정보 추가 (서울시청 좌표)
        location, loc_created = UserLocation.objects.update_or_create(
            user=user_profile,
            defaults={
                'latitude': 37.5665,  # 서울시청 위도
                'longitude': 126.9780,  # 서울시청 경도
            }
        )
        
        if loc_created:
            print(f"✅ {user.username}의 위치 정보가 생성되었습니다.")
        else:
            print(f"✅ {user.username}의 위치 정보가 업데이트되었습니다.")
        
        print(f"\n📍 위치 정보:")
        print(f"   위도: {location.latitude}")
        print(f"   경도: {location.longitude}")
        print(f"   업데이트 시간: {location.updated_at.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # 지도 URL
        maps_url = f"https://www.google.com/maps?q={location.latitude},{location.longitude}"
        print(f"\n🗺️  지도에서 확인: {maps_url}")
        
    except AuthUser.DoesNotExist:
        print("\n❌ 'testuser' 계정을 찾을 수 없습니다.")
        print("\n📋 등록된 사용자 목록:")
        for u in users:
            print(f"   - {u.username} (ID: {u.id})")

print("\n" + "=" * 60)
print("💡 Django Admin에서 확인:")
print("   http://127.0.0.1:8000/admin/users/userlocation/")
print("=" * 60)
