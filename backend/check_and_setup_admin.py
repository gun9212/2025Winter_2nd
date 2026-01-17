#!/usr/bin/env python
"""
기존 사용자 확인 및 관리자 권한 설정 스크립트
사용법: python check_and_setup_admin.py
"""
import os
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import AuthUser

print("=" * 60)
print("📋 Django 애플리케이션 사용자 계정 확인")
print("=" * 60)

# 모든 사용자 조회
users = AuthUser.objects.all()

if not users.exists():
    print("\n❌ 등록된 사용자가 없습니다.")
    print("\n💡 관리자 계정을 생성하세요:")
    print("   python create_admin_user.py")
else:
    print(f"\n✅ 총 {users.count()}명의 사용자가 등록되어 있습니다.\n")
    
    print("-" * 60)
    for user in users:
        staff_status = "✅" if user.is_staff else "❌"
        superuser_status = "✅" if user.is_superuser else "❌"
        active_status = "✅" if user.is_active else "❌"
        
        print(f"ID: {user.id}")
        print(f"  Username: {user.username}")
        print(f"  Phone: {user.phone_number}")
        print(f"  is_staff: {staff_status} {user.is_staff}")
        print(f"  is_superuser: {superuser_status} {user.is_superuser}")
        print(f"  is_active: {active_status} {user.is_active}")
        
        # 관리자 권한이 없으면 부여
        if not user.is_staff or not user.is_superuser:
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.save()
            print(f"  🔧 관리자 권한 부여 완료!")
        
        print("-" * 60)
    
    # 관리자 권한이 있는 사용자 찾기
    admin_users = AuthUser.objects.filter(is_staff=True, is_superuser=True, is_active=True)
    
    if admin_users.exists():
        print("\n✅ Django Admin 접속 가능한 계정:")
        for admin in admin_users:
            print(f"   - Username: {admin.username} (ID: {admin.id})")
        print("\n💡 Django Admin 접속:")
        print("   URL: http://127.0.0.1:8000/admin/")
        print("   위 계정 중 하나로 로그인하세요!")
    else:
        print("\n❌ 관리자 권한이 있는 계정이 없습니다.")
        print("   모든 계정에 권한을 부여했습니다. 다시 확인해주세요.")

print("\n" + "=" * 60)
print("📝 중요 사항:")
print("=" * 60)
print("• .env의 DB_USER=ideal_admin은 PostgreSQL 데이터베이스 접속 계정입니다")
print("• Django Admin은 Django 애플리케이션의 사용자 계정(AuthUser)으로 로그인합니다")
print("• 둘은 완전히 다른 계정입니다!")
print("=" * 60)
