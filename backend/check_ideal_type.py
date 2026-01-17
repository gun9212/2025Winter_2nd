#!/usr/bin/env python
"""이상형 프로필 확인 스크립트"""
import os
import sys
import django

# Django 설정
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import IdealTypeProfile, User, AuthUser

print("=" * 60)
print("🔍 이상형 프로필 확인")
print("=" * 60)

# user_id=1 확인
try:
    auth_user = AuthUser.objects.get(id=1)
    print(f"✅ AuthUser: {auth_user.username} (ID: {auth_user.id})")
    
    try:
        user_profile = auth_user.profile
        print(f"✅ User Profile: ID {user_profile.id}")
        
        try:
            ideal_type = user_profile.ideal_type_profile
            print(f"\n✅ 이상형 프로필 발견!")
            print(f"   ID: {ideal_type.id}")
            print(f"   사용자: {ideal_type.user.user.username}")
            print(f"   키 범위: {ideal_type.height_min}~{ideal_type.height_max}cm")
            print(f"   나이 범위: {ideal_type.age_min}~{ideal_type.age_max}세")
            print(f"   선호 성별: {ideal_type.preferred_gender}")
            print(f"   선호 MBTI: {ideal_type.preferred_mbti}")
            print(f"   선호 성격: {ideal_type.preferred_personality}")
            print(f"   선호 관심사: {ideal_type.preferred_interests}")
            print(f"   매칭 임계값: {ideal_type.match_threshold}")
            print(f"   생성일: {ideal_type.created_at}")
            print(f"   수정일: {ideal_type.updated_at}")
        except IdealTypeProfile.DoesNotExist:
            print(f"\n❌ 이상형 프로필이 없습니다!")
    except User.DoesNotExist:
        print(f"\n❌ User Profile이 없습니다!")
        
except AuthUser.DoesNotExist:
    print(f"❌ AuthUser ID=1을 찾을 수 없습니다!")

# 전체 이상형 프로필 개수 확인
total = IdealTypeProfile.objects.count()
print(f"\n📊 전체 이상형 프로필 개수: {total}")

if total > 0:
    print("\n📋 모든 이상형 프로필:")
    for ideal in IdealTypeProfile.objects.all():
        print(f"   - ID: {ideal.id}, User: {ideal.user.user.username}, 성별: {ideal.preferred_gender}")

print("=" * 60)
