#!/usr/bin/env python
"""
테스트용 사용자 생성 스크립트 (user_id=1)
사용법: python create_test_user.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import AuthUser, User, IdealTypeProfile, UserLocation
from django.utils import timezone

print("=" * 60)
print("테스트 사용자 생성 (user_id=1)")
print("=" * 60)

# user_id=1이 이미 존재하는지 확인
try:
    existing_auth = AuthUser.objects.get(id=1)
    print(f"\n⚠️  ID 1번 사용자가 이미 존재합니다:")
    print(f"   Username: {existing_auth.username}")
    print(f"   Email: {existing_auth.email}")
    
    # 프로필이 있는지 확인
    try:
        profile = existing_auth.profile
        print(f"   ✅ User 프로필 존재")
    except User.DoesNotExist:
        print(f"   ❌ User 프로필 없음 - 프로필을 생성합니다...")
        
        # 프로필 생성
        profile = User.objects.create(
            user=existing_auth,
            age=26,
            gender='M',
            height=178,
            mbti='ENFP',
            personality=['친절함', '활발함', '유머러스함'],
            interests=['영화', '음악', '여행'],
            matching_consent=True,
            service_active=True,
        )
        print(f"   ✅ User 프로필 생성 완료!")
        
        # 이상형 프로필 생성
        IdealTypeProfile.objects.create(
            user=profile,
            height_min=150,
            height_max=180,
            age_min=22,
            age_max=30,
            preferred_gender='F',
            preferred_mbti=['ENFP', 'ENFJ', 'INFP'],
            preferred_personality=['친절함', '활발함'],
            preferred_interests=['영화', '음악'],
            match_threshold=3,
        )
        print(f"   ✅ 이상형 프로필 생성 완료!")
        
        # 위치 정보 생성
        UserLocation.objects.create(
            user=profile,
            latitude=37.4979,
            longitude=127.0276,
            updated_at=timezone.now(),
        )
        print(f"   ✅ 위치 정보 생성 완료!")
        
    print("\n✅ user_id=1 사용자 준비 완료!")
    
except AuthUser.DoesNotExist:
    print("\n📝 ID 1번 사용자를 생성합니다...")
    print("   ⚠️  Django는 ID를 직접 설정할 수 없습니다.")
    print("   → 새 사용자를 생성하고, 생성된 ID를 사용하세요.")
    print("   → 또는 Django Admin에서 기존 사용자를 삭제하고 ID 1번을 비워두세요.\n")
    
    # AuthUser 생성
    auth_user = AuthUser.objects.create_user(
        username='user0001',
        email='user0001@test.com',
        password='test123',
        is_active=True,
    )
    created_id = auth_user.id
    print(f"   ✅ AuthUser 생성 완료 (ID: {created_id}, Username: {auth_user.username})")
    
    if created_id != 1:
        print(f"\n   ⚠️  생성된 ID가 1이 아닙니다 (생성된 ID: {created_id})")
        print(f"   → config.js의 TEST_USER_ID를 {created_id}로 변경하세요.")
    
    # User 프로필 생성
    profile = User.objects.create(
        user=auth_user,
        age=26,
        gender='M',
        height=178,
        mbti='ENFP',
        personality=['친절함', '활발함', '유머러스함'],
        interests=['영화', '음악', '여행'],
        matching_consent=True,
        service_active=True,
    )
    print(f"   ✅ User 프로필 생성 완료!")
    
    # 이상형 프로필 생성
    IdealTypeProfile.objects.create(
        user=profile,
        height_min=150,
        height_max=180,
        age_min=22,
        age_max=30,
        preferred_gender='F',
        preferred_mbti=['ENFP', 'ENFJ', 'INFP'],
        preferred_personality=['친절함', '활발함'],
        preferred_interests=['영화', '음악'],
        match_threshold=3,
    )
    print(f"   ✅ 이상형 프로필 생성 완료!")
    
    # 위치 정보 생성
    UserLocation.objects.create(
        user=profile,
        latitude=37.4979,
        longitude=127.0276,
        updated_at=timezone.now(),
    )
    print(f"   ✅ 위치 정보 생성 완료!")
    
    print("\n✅ user_id=1 테스트 사용자 생성 완료!")
    print(f"\n📋 생성된 사용자 정보:")
    print(f"   - Username: {auth_user.username}")
    print(f"   - Password: test123")
    print(f"   - Email: {auth_user.email}")
    print(f"   - 매칭 동의: {profile.matching_consent}")

print("\n" + "=" * 60)
print("💡 이제 앱에서 user_id=1로 테스트할 수 있습니다!")
print("=" * 60)
