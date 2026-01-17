#!/usr/bin/env python
"""
프로필 관리 API 테스트 스크립트
사용법: python test_profile_api.py
"""
import os
import django
import json

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import AuthUser, User

print("=" * 60)
print("🧪 프로필 관리 API 테스트")
print("=" * 60)

# testuser 확인
try:
    user = AuthUser.objects.get(username='testuser')
    print(f"\n✅ 사용자 확인: {user.username} (ID: {user.id})")
    
    # 프로필 확인
    try:
        profile = user.profile
        print(f"\n📋 현재 프로필:")
        print(f"   나이: {profile.age}")
        print(f"   성별: {profile.gender}")
        print(f"   키: {profile.height}cm")
        print(f"   MBTI: {profile.mbti}")
        print(f"   성격: {profile.personality}")
        print(f"   관심사: {profile.interests}")
        print(f"\n💡 API 테스트 명령어:")
        print(f"\n1. 프로필 조회:")
        print(f"   curl -X GET http://127.0.0.1:8000/api/users/profile/?user_id={user.id}")
        
        print(f"\n2. 프로필 업데이트:")
        test_profile = {
            "user_id": user.id,
            "age": 25,
            "gender": "M",
            "height": 175,
            "mbti": "ENFP",
            "personality": ["활발한", "긍정적인"],
            "interests": ["영화", "음악", "여행"]
        }
        print(f"   curl -X POST http://127.0.0.1:8000/api/users/profile/ \\")
        print(f"     -H 'Content-Type: application/json' \\")
        print(f"     -d '{json.dumps(test_profile, ensure_ascii=False)}'")
        
        print(f"\n3. 프로필 완성도 확인:")
        print(f"   curl -X GET http://127.0.0.1:8000/api/users/profile/completeness/?user_id={user.id}")
        
    except User.DoesNotExist:
        print(f"\n❌ 프로필이 없습니다.")
        print(f"\n💡 프로필 생성 API 테스트:")
        test_profile = {
            "user_id": user.id,
            "age": 25,
            "gender": "M",
            "height": 175,
            "mbti": "ENFP",
            "personality": ["활발한", "긍정적인"],
            "interests": ["영화", "음악", "여행"]
        }
        print(f"   curl -X POST http://127.0.0.1:8000/api/users/profile/ \\")
        print(f"     -H 'Content-Type: application/json' \\")
        print(f"     -d '{json.dumps(test_profile, ensure_ascii=False)}'")
        
except AuthUser.DoesNotExist:
    print("\n❌ 'testuser' 계정을 찾을 수 없습니다.")
    print("   먼저 관리자 계정 생성 스크립트를 실행하세요:")
    print("   python create_admin_user.py")

print("\n" + "=" * 60)
