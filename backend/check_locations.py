#!/usr/bin/env python
"""
위치 정보 확인 스크립트
사용법: python check_locations.py
"""
import os
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import UserLocation, AuthUser

print("=" * 60)
print("📍 위치 정보 조회")
print("=" * 60)

# 모든 위치 정보 조회
locations = UserLocation.objects.all()

if not locations.exists():
    print("\n❌ 등록된 위치 정보가 없습니다.\n")
    print("💡 위치 정보를 추가하려면:")
    print("   1. Django Admin에서 직접 추가")
    print("   2. API를 통해 업데이트")
    print("   3. 아래 스크립트로 테스트 데이터 추가\n")
    
    print("📝 테스트 데이터 추가 스크립트:")
    print("   python add_test_location.py")
else:
    print(f"\n✅ 총 {locations.count()}개의 위치 정보가 있습니다.\n")
    print("-" * 60)
    
    for i, loc in enumerate(locations, 1):
        username = loc.user.user.username
        print(f"[{i}] 사용자: {username}")
        print(f"    위도: {loc.latitude}")
        print(f"    경도: {loc.longitude}")
        print(f"    업데이트 시간: {loc.updated_at.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # 위치 URL 생성 (Google Maps)
        maps_url = f"https://www.google.com/maps?q={loc.latitude},{loc.longitude}"
        print(f"    지도 보기: {maps_url}")
        
        print("-" * 60)

print("\n" + "=" * 60)
print("💡 Django Admin에서 확인:")
print("   http://127.0.0.1:8000/admin/users/userlocation/")
print("=" * 60)
