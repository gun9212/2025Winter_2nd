#!/usr/bin/env python
"""
Django Admin 로그인 정보 확인 스크립트
사용법: python check_admin_credentials.py
"""
import os
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import AuthUser

print("=" * 60)
print("🔐 Django Admin 로그인 정보")
print("=" * 60)

# 관리자 권한이 있는 모든 사용자 조회
admin_users = AuthUser.objects.filter(is_staff=True, is_superuser=True, is_active=True)

if not admin_users.exists():
    print("\n❌ 관리자 권한이 있는 계정이 없습니다.")
    print("\n💡 관리자 계정을 생성하세요:")
    print("   python create_admin_user.py")
else:
    print(f"\n✅ 관리자 계정: {admin_users.count()}개\n")
    print("-" * 60)
    
    for user in admin_users:
        print(f"Username: {user.username}")
        print(f"ID: {user.id}")
        print(f"Phone: {user.phone_number}")
        print("-" * 60)
    
    print("\n💡 비밀번호 확인/재설정:")
    print("   - 비밀번호를 모르면: python reset_password.py")
    print("   - 또는 Django Shell에서 직접 확인/변경 가능")
    
    print("\n📝 Django Admin 접속:")
    print("   URL: http://127.0.0.1:8000/admin/")
    print(f"   Username: {admin_users.first().username}")

print("\n" + "=" * 60)
