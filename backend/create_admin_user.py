#!/usr/bin/env python
"""
Django Admin 계정 생성 스크립트
사용법: python create_admin_user.py
"""
import os
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import AuthUser
from django.contrib.auth.hashers import make_password

# 관리자 계정 생성
username = 'admin'
password = 'admin1234'  # ⚠️ 프로덕션에서는 반드시 변경!

admin_user, created = AuthUser.objects.get_or_create(
    username=username,
    defaults={
        'password': make_password(password),
        'phone_number': '01000000000',
        'phone_verified': True,
        'is_staff': True,  # Django Admin 접근 권한
        'is_superuser': True,  # 모든 권한
        'is_active': True,
    }
)

# 기존 계정이 있으면 권한 업데이트
if not created:
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.is_active = True
    admin_user.save()
    print(f'✅ 기존 계정에 관리자 권한 부여 완료!')

if created:
    print(f'✅ 관리자 계정 생성 완료!')
    print(f'   Username: {username}')
    print(f'   Password: {password}')
    print(f'\n💡 Django Admin 접속: http://127.0.0.1:8000/admin/')
else:
    print(f'ℹ️  관리자 계정이 이미 존재합니다: {username}')
    print(f'   기존 계정으로 로그인하세요.')
    print(f'\n💡 비밀번호를 변경하려면 Django Shell에서:')
    print(f'   from apps.users.models import AuthUser')
    print(f'   from django.contrib.auth.hashers import make_password')
    print(f'   user = AuthUser.objects.get(username="{username}")')
    print(f'   user.password = make_password("새비밀번호")')
    print(f'   user.save()')
