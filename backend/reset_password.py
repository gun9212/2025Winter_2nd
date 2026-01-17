#!/usr/bin/env python
"""
testuser 계정 비밀번호 재설정 스크립트
사용법: python reset_password.py
"""
import os
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import AuthUser
from django.contrib.auth.hashers import make_password

# 비밀번호 재설정
username = 'testuser'
new_password = 'test1234'  # ⚠️ 원하는 비밀번호로 변경 가능

try:
    user = AuthUser.objects.get(username=username)
    user.password = make_password(new_password)
    user.save()
    
    print('✅ 비밀번호 재설정 완료!')
    print(f'   Username: {username}')
    print(f'   Password: {new_password}')
    print('\n💡 Django Admin 접속:')
    print('   URL: http://127.0.0.1:8000/admin/')
    print(f'   Username: {username}')
    print(f'   Password: {new_password}')
except AuthUser.DoesNotExist:
    print(f'❌ 사용자 "{username}"를 찾을 수 없습니다.')
    print('\n📋 등록된 사용자 목록:')
    users = AuthUser.objects.all()
    for u in users:
        print(f'   - {u.username} (ID: {u.id})')
