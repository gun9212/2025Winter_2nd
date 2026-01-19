"""
매칭 테스트 스크립트
Django shell에서 실행: python manage.py shell < test_matching.py
또는: python manage.py shell
>>> exec(open('test_matching.py').read())
"""
from apps.users.models import User, UserLocation, IdealTypeProfile
from apps.matching.utils import find_matchable_users, check_match_criteria

print("=" * 60)
print("매칭 테스트 시작")
print("=" * 60)

# 모든 사용자 조회
users = User.objects.all()
print(f"\n📊 전체 사용자 수: {users.count()}명\n")

for user in users:
    print(f"사용자: {user.user.username}")
    print(f"  - 성별: {user.gender}")
    print(f"  - 나이: {user.age}")
    print(f"  - 키: {user.height}")
    print(f"  - 매칭 동의: {user.matching_consent}")
    print(f"  - 서비스 활성: {user.service_active}")
    
    # 위치 정보
    try:
        loc = user.location
        print(f"  - 위치: ({loc.latitude}, {loc.longitude})")
    except:
        print(f"  - 위치: 없음")
    
    # 이상형 정보
    try:
        ideal = user.ideal_type_profile
        print(f"  - 이상형 나이: {ideal.age_min}-{ideal.age_max}")
        print(f"  - 이상형 키: {ideal.height_min}-{ideal.height_max}")
        print(f"  - 선호 성별: {ideal.preferred_gender}")
    except:
        print(f"  - 이상형: 없음")
    
    print()

# 첫 번째 사용자로 매칭 테스트
if users.count() >= 2:
    user1 = users.first()
    user2 = users.exclude(id=user1.id).first()
    
    print("=" * 60)
    print(f"매칭 테스트: {user1.user.username} → {user2.user.username}")
    print("=" * 60)
    
    # 위치 확인
    try:
        loc1 = user1.location
        loc2 = user2.location
        
        print(f"\n📍 위치 정보:")
        print(f"  {user1.user.username}: ({loc1.latitude}, {loc1.longitude})")
        print(f"  {user2.user.username}: ({loc2.latitude}, {loc2.longitude})")
        
        # 거리 계산
        from apps.matching.utils import calculate_distance_km
        distance = calculate_distance_km(
            float(loc1.latitude), float(loc1.longitude),
            float(loc2.latitude), float(loc2.longitude)
        )
        print(f"  거리: {distance * 1000:.2f}m")
        
        # 매칭 조건 체크
        print(f"\n🔍 매칭 조건 체크:")
        ideal1 = user1.ideal_type_profile
        score = check_match_criteria(ideal1, user2, user1.gender)
        print(f"  매칭 점수: {score}")
        
        # 전체 매칭 가능 사용자 찾기
        print(f"\n🔍 전체 매칭 가능 사용자 찾기:")
        matchable = find_matchable_users(
            user1,
            float(loc1.latitude),
            float(loc1.longitude),
            radius_km=0.5
        )
        print(f"  매칭 가능: {len(matchable)}명")
        for m in matchable:
            print(f"    - {m['user'].user.username} (거리: {m['distance_m']:.2f}m, 점수: {m['match_score']})")
        
    except Exception as e:
        print(f"❌ 오류: {str(e)}")
        import traceback
        traceback.print_exc()

print("\n" + "=" * 60)
print("테스트 완료")
print("=" * 60)
