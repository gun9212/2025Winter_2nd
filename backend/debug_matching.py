"""
매칭 디버깅 스크립트
두 사용자가 매칭되지 않는 원인을 확인합니다.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User, AuthUser, IdealTypeProfile, UserLocation
from apps.matching.utils import find_matchable_users, check_match_criteria, calculate_distance_km
from apps.matching.models import Match
from django.db.models import Q

def debug_matching(user1_id, user2_id):
    """
    두 사용자의 매칭 조건을 상세히 확인합니다.
    
    사용법:
    python debug_matching.py
    """
    print("=" * 80)
    print("🔍 매칭 디버깅 시작")
    print("=" * 80)
    
    try:
        # 사용자 1 정보
        auth_user1 = AuthUser.objects.get(id=user1_id)
        user1 = auth_user1.profile
        print(f"\n👤 사용자 1: {auth_user1.username}")
        print(f"   - ID: {user1.id}")
        print(f"   - 나이: {user1.age}")
        print(f"   - 성별: {user1.gender}")
        print(f"   - 키: {user1.height}cm")
        print(f"   - MBTI: {user1.mbti}")
        print(f"   - 매칭 동의: {user1.matching_consent}")
        print(f"   - 서비스 활성화: {user1.service_active}")
        
        # 사용자 1 위치
        try:
            loc1 = user1.location
            print(f"   - 위치: ({loc1.latitude}, {loc1.longitude})")
        except UserLocation.DoesNotExist:
            print(f"   - 위치: ❌ 없음")
        
        # 사용자 1 이상형
        try:
            ideal1 = user1.ideal_type_profile
            print(f"   - 이상형 나이: {ideal1.age_min}-{ideal1.age_max}세")
            print(f"   - 이상형 키: {ideal1.height_min}-{ideal1.height_max}cm")
            print(f"   - 선호 성별: {ideal1.preferred_gender}")
            print(f"   - 선호 MBTI: {ideal1.preferred_mbti}")
        except IdealTypeProfile.DoesNotExist:
            print(f"   - 이상형: ❌ 없음")
        
        # 사용자 2 정보
        auth_user2 = AuthUser.objects.get(id=user2_id)
        user2 = auth_user2.profile
        print(f"\n👤 사용자 2: {auth_user2.username}")
        print(f"   - ID: {user2.id}")
        print(f"   - 나이: {user2.age}")
        print(f"   - 성별: {user2.gender}")
        print(f"   - 키: {user2.height}cm")
        print(f"   - MBTI: {user2.mbti}")
        print(f"   - 매칭 동의: {user2.matching_consent}")
        print(f"   - 서비스 활성화: {user2.service_active}")
        
        # 사용자 2 위치
        try:
            loc2 = user2.location
            print(f"   - 위치: ({loc2.latitude}, {loc2.longitude})")
        except UserLocation.DoesNotExist:
            print(f"   - 위치: ❌ 없음")
        
        # 사용자 2 이상형
        try:
            ideal2 = user2.ideal_type_profile
            print(f"   - 이상형 나이: {ideal2.age_min}-{ideal2.age_max}세")
            print(f"   - 이상형 키: {ideal2.height_min}-{ideal2.height_max}cm")
            print(f"   - 선호 성별: {ideal2.preferred_gender}")
            print(f"   - 선호 MBTI: {ideal2.preferred_mbti}")
        except IdealTypeProfile.DoesNotExist:
            print(f"   - 이상형: ❌ 없음")
        
        print("\n" + "=" * 80)
        print("📊 매칭 조건 체크")
        print("=" * 80)
        
        # 1. 매칭 동의 체크
        print(f"\n1️⃣ 매칭 동의 체크:")
        if not user1.matching_consent:
            print(f"   ❌ 사용자 1의 매칭 동의가 OFF입니다")
        else:
            print(f"   ✅ 사용자 1의 매칭 동의: ON")
        
        if not user2.matching_consent:
            print(f"   ❌ 사용자 2의 매칭 동의가 OFF입니다")
        else:
            print(f"   ✅ 사용자 2의 매칭 동의: ON")
        
        if not user1.service_active:
            print(f"   ❌ 사용자 1의 서비스 활성화가 OFF입니다")
        else:
            print(f"   ✅ 사용자 1의 서비스 활성화: ON")
        
        if not user2.service_active:
            print(f"   ❌ 사용자 2의 서비스 활성화가 OFF입니다")
        else:
            print(f"   ✅ 사용자 2의 서비스 활성화: ON")
        
        # 2. 위치 체크
        print(f"\n2️⃣ 위치 체크:")
        try:
            loc1 = user1.location
            loc2 = user2.location
            
            distance_km = calculate_distance_km(
                float(loc1.latitude), float(loc1.longitude),
                float(loc2.latitude), float(loc2.longitude)
            )
            distance_m = distance_km * 1000
            
            print(f"   사용자 1 위치: ({loc1.latitude}, {loc1.longitude})")
            print(f"   사용자 2 위치: ({loc2.latitude}, {loc2.longitude})")
            print(f"   거리: {distance_m:.2f}m ({distance_km:.3f}km)")
            
            if distance_km > 1.0:  # 기본 반경 1km
                print(f"   ❌ 거리가 너무 멉니다 (1km 초과)")
            else:
                print(f"   ✅ 거리 OK (1km 이내)")
        except UserLocation.DoesNotExist as e:
            print(f"   ❌ 위치 정보 없음: {e}")
        
        # 3. 이상형 조건 체크 (사용자 1 → 사용자 2)
        print(f"\n3️⃣ 사용자 1의 이상형 조건 체크 (사용자 2가 조건에 맞는지):")
        try:
            ideal1 = user1.ideal_type_profile
            score1 = check_match_criteria(ideal1, user2, user1.gender)
            print(f"   매칭 점수: {score1}")
            if score1 >= 3:
                print(f"   ✅ 사용자 2는 사용자 1의 이상형 조건에 부합합니다")
            else:
                print(f"   ❌ 사용자 2는 사용자 1의 이상형 조건에 부합하지 않습니다 (점수: {score1}/4)")
        except IdealTypeProfile.DoesNotExist:
            print(f"   ❌ 사용자 1의 이상형 프로필이 없습니다")
        
        # 4. 이상형 조건 체크 (사용자 2 → 사용자 1)
        print(f"\n4️⃣ 사용자 2의 이상형 조건 체크 (사용자 1이 조건에 맞는지):")
        try:
            ideal2 = user2.ideal_type_profile
            score2 = check_match_criteria(ideal2, user1, user2.gender)
            print(f"   매칭 점수: {score2}")
            if score2 >= 3:
                print(f"   ✅ 사용자 1은 사용자 2의 이상형 조건에 부합합니다")
            else:
                print(f"   ❌ 사용자 1은 사용자 2의 이상형 조건에 부합하지 않습니다 (점수: {score2}/4)")
        except IdealTypeProfile.DoesNotExist:
            print(f"   ❌ 사용자 2의 이상형 프로필이 없습니다")
        
        # 5. 기존 매칭 확인
        print(f"\n5️⃣ 기존 매칭 확인:")
        existing_match = Match.objects.filter(
            (Q(user1=user1) & Q(user2=user2)) |
            (Q(user1=user2) & Q(user2=user1))
        ).first()
        
        if existing_match:
            print(f"   ⚠️ 이미 매칭되어 있습니다 (매칭 ID: {existing_match.id})")
            print(f"   매칭 시간: {existing_match.matched_at}")
        else:
            print(f"   ✅ 기존 매칭 없음 (새 매칭 가능)")
        
        # 6. 실제 매칭 검색 테스트
        print(f"\n6️⃣ 실제 매칭 검색 테스트 (사용자 1 기준):")
        try:
            loc1 = user1.location
            matchable = find_matchable_users(
                user1,
                float(loc1.latitude),
                float(loc1.longitude),
                radius_km=1.0
            )
            
            user2_in_list = any(m['user'].id == user2.id for m in matchable)
            if user2_in_list:
                print(f"   ✅ 사용자 2가 매칭 가능 목록에 있습니다!")
                for m in matchable:
                    if m['user'].id == user2.id:
                        print(f"      - 거리: {m['distance_m']:.2f}m")
                        print(f"      - 점수: {m['match_score']}")
            else:
                print(f"   ❌ 사용자 2가 매칭 가능 목록에 없습니다")
                print(f"   매칭 가능한 사용자 수: {len(matchable)}명")
        except Exception as e:
            print(f"   ❌ 오류 발생: {e}")
        
        print("\n" + "=" * 80)
        print("✅ 디버깅 완료")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    # 사용자 ID를 입력받아서 테스트
    import sys
    
    if len(sys.argv) >= 3:
        user1_id = int(sys.argv[1])
        user2_id = int(sys.argv[2])
        debug_matching(user1_id, user2_id)
    else:
        print("사용법: python debug_matching.py <user1_id> <user2_id>")
        print("예시: python debug_matching.py 1 2")
        print("\n사용 가능한 사용자 목록:")
        for auth_user in AuthUser.objects.all()[:10]:
            try:
                profile = auth_user.profile
                print(f"  - ID: {auth_user.id}, Username: {auth_user.username}, 매칭동의: {profile.matching_consent}")
