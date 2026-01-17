#!/usr/bin/env python
"""
기존 어드민 계정에 권한 추가 스크립트
사용법: python update_existing_admin.py
"""
import os
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import AuthUser

# 기존 어드민 계정 찾기
# .env 파일에 있는 어드민 정보를 사용하거나, 모든 사용자 확인
print("📋 기존 사용자 목록:")
users = AuthUser.objects.all()
for user in users:
    print(f"   - ID: {user.id}, Username: {user.username}, is_staff: {user.is_staff}, is_superuser: {user.is_superuser}")

# 관리자 권한이 없는 사용자에게 권한 부여
print("\n🔧 관리자 권한 부여 중...")
updated_count = 0

for user in users:
    if not user.is_staff or not user.is_superuser:
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.save()
        print(f"✅ {user.username} (ID: {user.id})에게 관리자 권한 부여 완료")
        updated_count += 1
    else:
        print(f"ℹ️  {user.username} (ID: {user.id})는 이미 관리자 권한이 있습니다")

if updated_count == 0:
    print("\n💡 모든 사용자가 이미 관리자 권한을 가지고 있습니다.")
    print("\n📝 Django Admin 접속:")
    print("   URL: http://127.0.0.1:8000/admin/")
    print("   기존 계정으로 로그인하세요!")
else:
    print(f"\n✅ {updated_count}명의 사용자에게 관리자 권한을 부여했습니다.")
    print("\n📝 Django Admin 접속:")
    print("   URL: http://127.0.0.1:8000/admin/")
    print("   권한이 부여된 계정으로 로그인하세요!")
