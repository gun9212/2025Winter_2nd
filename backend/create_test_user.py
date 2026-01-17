"""
테스트용 사용자 생성 스크립트
사용법: python manage.py shell < create_test_user.py
또는: python manage.py shell에서 아래 코드 실행
"""

from apps.users.models import AuthUser, User
from django.contrib.auth.hashers import make_password

# 테스트 사용자 생성
username = 'testuser'
password = 'test1234'
phone_number = '01012345678'

# AuthUser 생성 또는 가져오기
auth_user, created = AuthUser.objects.get_or_create(
    username=username,
    defaults={
        'password': make_password(password),
        'phone_number': phone_number,
        'phone_verified': True,
    }
)

if created:
    print(f'✅ AuthUser 생성 완료: {username}')
else:
    print(f'ℹ️  AuthUser 이미 존재: {username}')

# User 프로필 생성 또는 가져오기
user_profile, profile_created = User.objects.get_or_create(
    user=auth_user,
    defaults={
        'age': 25,
        'gender': 'M',
        'height': 175,
        'mbti': 'ENFP',
        'personality': ['활발한', '긍정적인'],
        'interests': ['영화', '음악', '여행'],
        'matching_consent': True,
        'service_active': True,
    }
)

if profile_created:
    print(f'✅ User 프로필 생성 완료: user_id={user_profile.id}')
else:
    print(f'ℹ️  User 프로필 이미 존재: user_id={user_profile.id}')

print(f'\n📋 테스트 정보:')
print(f'   - AuthUser ID: {auth_user.id}')
print(f'   - User Profile ID: {user_profile.id}')
print(f'   - Username: {username}')
print(f'   - Password: {password}')
print(f'\n💡 위치 업데이트 테스트 시 user_id={auth_user.id} 사용')
