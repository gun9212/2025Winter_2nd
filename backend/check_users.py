#!/usr/bin/env python
"""
데이터베이스에 존재하는 사용자 목록 확인 스크립트
사용법: python check_users.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import AuthUser, User, IdealTypeProfile, UserLocation

print("=" * 60)
print("사용자 목록 확인")
print("=" * 60)

# 모든 AuthUser 조회
auth_users = AuthUser.objects.all().order_by('id')

if auth_users.exists():
    print(f"\n✅ 총 {auth_users.count()}명의 사용자가 있습니다:\n")
    
    for auth_user in auth_users:
        print(f"ID: {auth_user.id}")
        print(f"  - Username: {auth_user.username}")
        print(f"  - Email: {auth_user.email}")
        print(f"  - is_active: {auth_user.is_active}")
        
        # User 프로필 확인
        try:
            profile = auth_user.profile
            print(f"  - ✅ User 프로필 존재")
            print(f"    - 나이: {profile.age}, 성별: {profile.gender}")
            print(f"    - 매칭 동의: {profile.matching_consent}")
            
            # 이상형 프로필 확인
            try:
                ideal_type = profile.ideal_type_profile
                print(f"  - ✅ 이상형 프로필 존재")
            except IdealTypeProfile.DoesNotExist:
                print(f"  - ❌ 이상형 프로필 없음")
            
            # 위치 정보 확인
            try:
                location = profile.location
                print(f"  - ✅ 위치 정보 존재: ({location.latitude}, {location.longitude})")
            except UserLocation.DoesNotExist:
                print(f"  - ❌ 위치 정보 없음")
                
        except User.DoesNotExist:
            print(f"  - ❌ User 프로필 없음")
        
        print()
else:
    print("\n❌ 사용자가 없습니다.")

print("=" * 60)
print("\n💡 사용 가능한 user_id를 찾아서 config.js의 TEST_USER_ID를 변경하세요.")
print("=" * 60)
