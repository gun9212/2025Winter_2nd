#!/usr/bin/env python
"""
Django 슈퍼유저 비밀번호 재설정 스크립트
사용법: python reset_superuser.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import AuthUser

print("=" * 60)
print("Django 슈퍼유저 계정 확인 및 재설정")
print("=" * 60)

# 모든 슈퍼유저 확인
superusers = AuthUser.objects.filter(is_superuser=True)

if superusers.exists():
    print(f"\n✅ 슈퍼유저 {superusers.count()}명 발견:")
    for user in superusers:
        print(f"   - Username: {user.username}")
        print(f"   - Email: {user.email}")
        print(f"   - is_staff: {user.is_staff}")
        print(f"   - is_active: {user.is_active}")
        print()
    
    # 첫 번째 슈퍼유저 비밀번호 재설정
    first_superuser = superusers.first()
    new_password = 'admin123'  # 기본 비밀번호
    
    print(f"🔑 슈퍼유저 '{first_superuser.username}'의 비밀번호를 재설정합니다...")
    first_superuser.set_password(new_password)
    first_superuser.is_staff = True
    first_superuser.is_superuser = True
    first_superuser.is_active = True
    first_superuser.save()
    
    print(f"✅ 비밀번호 재설정 완료!")
    print(f"   Username: {first_superuser.username}")
    print(f"   Password: {new_password}")
    print(f"\n💡 Django Admin 접속: http://localhost:8000/admin/")
else:
    print("\n❌ 슈퍼유저가 없습니다. 새로 생성합니다...")
    
    username = 'admin'
    email = 'admin@example.com'
    password = 'admin123'
    
    try:
        superuser = AuthUser.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        print(f"✅ 슈퍼유저 생성 완료!")
        print(f"   Username: {username}")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print(f"\n💡 Django Admin 접속: http://localhost:8000/admin/")
    except Exception as e:
        print(f"❌ 슈퍼유저 생성 실패: {e}")

print("=" * 60)
