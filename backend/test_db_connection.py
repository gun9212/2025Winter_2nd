#!/usr/bin/env python
"""
데이터베이스 연결 테스트 스크립트
"""
import os
import django

# Django 설정 로드
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from django.conf import settings

def test_connection():
    """데이터베이스 연결 테스트"""
    try:
        # 연결 시도
        connection.ensure_connection()
        
        print("=" * 50)
        print("✅ 데이터베이스 연결 성공!")
        print("=" * 50)
        print(f"데이터베이스: {settings.DATABASES['default']['NAME']}")
        print(f"호스트: {settings.DATABASES['default']['HOST']}")
        print(f"포트: {settings.DATABASES['default']['PORT']}")
        print(f"사용자: {settings.DATABASES['default']['USER']}")
        print("=" * 50)
        
        # PostgreSQL 버전 확인
        cursor = connection.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"PostgreSQL 버전: {version}")
        print("=" * 50)
        
        # 데이터베이스 목록 확인
        cursor.execute("SELECT datname FROM pg_database WHERE datistemplate = false;")
        databases = cursor.fetchall()
        print("사용 가능한 데이터베이스:")
        for db in databases:
            print(f"  - {db[0]}")
        print("=" * 50)
        
        return True
        
    except Exception as e:
        print("=" * 50)
        print("❌ 데이터베이스 연결 실패!")
        print("=" * 50)
        print(f"오류: {str(e)}")
        print("=" * 50)
        print("\n확인 사항:")
        print("1. PostgreSQL이 실행 중인지 확인")
        print("2. .env 파일의 DB 설정 확인")
        print("3. 데이터베이스가 생성되었는지 확인")
        print("4. 사용자 권한 확인")
        return False

if __name__ == '__main__':
    test_connection()

