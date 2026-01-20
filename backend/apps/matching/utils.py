"""
매칭 관련 유틸리티 함수
"""
from math import radians, cos, sin, asin, sqrt
from django.db.models import Q
from apps.users.models import User, UserLocation, IdealTypeProfile


def calculate_distance_km(lat1, lon1, lat2, lon2):
    """
    두 지점 간 거리 계산 (Haversine formula)
    반환: 거리 (km)
    """
    # 지구 반경 (km)
    R = 6371
    
    # 라디안으로 변환
    lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    # Haversine formula
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    return R * c


def check_match_criteria(ideal_type, candidate_user, user_gender):
    """
    이상형 조건 체크 및 매칭 점수 계산 (2단계 방식)
    
    단계 1: 필터링 (필수 조건)
    - 성별, 나이, 키는 선택 범위 내에 있는 사람만 매칭 후보가 됨
    - 범위 밖이면 즉시 제외 (점수 0 반환)
    
    단계 2: 가중치 기반 점수 계산
    - 필터링을 통과한 후보에 대해서만
    - MBTI, 성격, 관심사 등에 가중치를 부여하여 점수 계산
    
    Args:
        ideal_type: IdealTypeProfile 객체 (현재 사용자의 이상형)
        candidate_user: User 객체 (매칭 후보)
        user_gender: 현재 사용자의 성별 ('M' 또는 'F')
    
    Returns:
        float: 매칭 점수 (0.0 = 매칭 안 됨, 0.0-100.0 = 매칭 점수)
    """
    if not ideal_type or not candidate_user:
        print(f'      ❌ ideal_type 또는 candidate_user 없음')
        return 0.0
    
    matched_criteria = {}
    
    # ==========================================
    # 단계 1: 필터링 (필수 조건 체크)
    # 범위 밖이면 즉시 제외
    # ==========================================
    
    # 1-1. 성별 필터링
    if ideal_type.preferred_gender:
        # preferred_gender가 설정되어 있으면 그것을 사용
        if ideal_type.preferred_gender == 'M' and candidate_user.gender != 'M':
            print(f'      ❌ 성별 불일치 (선호: {ideal_type.preferred_gender}, 후보: {candidate_user.gender}) - 필터링 제외')
            return 0.0
        elif ideal_type.preferred_gender == 'F' and candidate_user.gender != 'F':
            print(f'      ❌ 성별 불일치 (선호: {ideal_type.preferred_gender}, 후보: {candidate_user.gender}) - 필터링 제외')
            return 0.0
        elif ideal_type.preferred_gender == 'A':
            # 모두 허용
            pass
    else:
        # preferred_gender가 없으면 이성 매칭 (기존 로직)
        if user_gender == 'M':
            # 남성이면 여성 선호
            if candidate_user.gender != 'F':
                print(f'      ❌ 성별 불일치 (사용자: {user_gender}, 후보: {candidate_user.gender}) - 필터링 제외')
                return 0.0
        elif user_gender == 'F':
            # 여성이면 남성 선호
            if candidate_user.gender != 'M':
                print(f'      ❌ 성별 불일치 (사용자: {user_gender}, 후보: {candidate_user.gender}) - 필터링 제외')
                return 0.0
        else:
            print(f'      ❌ 사용자 성별 정보 없음 - 필터링 제외')
            return 0.0
    
    matched_criteria['gender'] = True
    print(f'      ✅ 성별 일치 (필터링 통과)')
    
    # 1-2. 나이 필터링
    if ideal_type.age_min and ideal_type.age_max:
        if not (ideal_type.age_min <= candidate_user.age <= ideal_type.age_max):
            print(f'      ❌ 나이 불일치 (범위: {ideal_type.age_min}-{ideal_type.age_max}, 후보: {candidate_user.age}) - 필터링 제외')
            return 0.0
        matched_criteria['age'] = True
        print(f'      ✅ 나이 일치 ({candidate_user.age}세) - 필터링 통과')
    else:
        matched_criteria['age'] = None
        print(f'      ⚠️ 나이 범위 미설정 (필터링 스킵)')
    
    # 1-3. 키 필터링
    if ideal_type.height_min and ideal_type.height_max:
        if not (ideal_type.height_min <= candidate_user.height <= ideal_type.height_max):
            print(f'      ❌ 키 불일치 (범위: {ideal_type.height_min}-{ideal_type.height_max}, 후보: {candidate_user.height}) - 필터링 제외')
            return 0.0
        matched_criteria['height'] = True
        print(f'      ✅ 키 일치 ({candidate_user.height}cm) - 필터링 통과')
    else:
        matched_criteria['height'] = None
        print(f'      ⚠️ 키 범위 미설정 (필터링 스킵)')
    
    # ==========================================
    # 단계 2: 가중치 기반 점수 계산
    # 필터링을 통과한 후보에 대해서만 점수 계산
    # ==========================================
    
    # 가중치 설정 (기본값)
    # 나중에 IdealTypeProfile 모델에 가중치 필드를 추가하여 사용자별로 설정 가능하도록 확장 가능
    WEIGHTS = {
        'mbti': 30.0,           # MBTI 일치 시 30점
        'personality_per_item': 20.0,  # 성격 일치 개수당 20점
        'interest_per_item': 15.0,     # 관심사 일치 개수당 15점
    }
    
    score = 0.0
    score_details = {}
    
    # 2-1. MBTI 가중치 점수
    if ideal_type.preferred_mbti and len(ideal_type.preferred_mbti) > 0:
        if candidate_user.mbti and candidate_user.mbti in ideal_type.preferred_mbti:
            score += WEIGHTS['mbti']
            matched_criteria['mbti'] = True
            score_details['mbti'] = WEIGHTS['mbti']
            print(f'      ✅ MBTI 일치 ({candidate_user.mbti}): +{WEIGHTS["mbti"]}점')
        else:
            matched_criteria['mbti'] = False
            score_details['mbti'] = 0.0
            print(f'      ❌ MBTI 불일치 (선호: {ideal_type.preferred_mbti}, 후보: {candidate_user.mbti}): +0점')
    else:
        matched_criteria['mbti'] = None
        score_details['mbti'] = None
        print(f'      ⚠️ MBTI 미설정: 점수 없음')
    
    # 2-2. 성격 가중치 점수
    if ideal_type.preferred_personality and len(ideal_type.preferred_personality) > 0:
        if candidate_user.personality and isinstance(candidate_user.personality, list):
            # 일치하는 성격 개수 계산
            personality_matches = len(set(ideal_type.preferred_personality) & set(candidate_user.personality))
            personality_score = personality_matches * WEIGHTS['personality_per_item']
            score += personality_score
            matched_criteria['personality'] = personality_matches
            score_details['personality'] = {
                'matches': personality_matches,
                'total_preferred': len(ideal_type.preferred_personality),
                'score': personality_score
            }
            print(f'      ✅ 성격 일치 ({personality_matches}/{len(ideal_type.preferred_personality)}): +{personality_score}점')
        else:
            matched_criteria['personality'] = 0
            score_details['personality'] = {'matches': 0, 'total_preferred': len(ideal_type.preferred_personality), 'score': 0.0}
            print(f'      ❌ 성격 정보 없음: +0점')
    else:
        matched_criteria['personality'] = None
        score_details['personality'] = None
        print(f'      ⚠️ 성격 미설정: 점수 없음')
    
    # 2-3. 관심사 가중치 점수
    if ideal_type.preferred_interests and len(ideal_type.preferred_interests) > 0:
        if candidate_user.interests and isinstance(candidate_user.interests, list):
            # 일치하는 관심사 개수 계산
            interest_matches = len(set(ideal_type.preferred_interests) & set(candidate_user.interests))
            interest_score = interest_matches * WEIGHTS['interest_per_item']
            score += interest_score
            matched_criteria['interests'] = interest_matches
            score_details['interests'] = {
                'matches': interest_matches,
                'total_preferred': len(ideal_type.preferred_interests),
                'score': interest_score
            }
            print(f'      ✅ 관심사 일치 ({interest_matches}/{len(ideal_type.preferred_interests)}): +{interest_score}점')
        else:
            matched_criteria['interests'] = 0
            score_details['interests'] = {'matches': 0, 'total_preferred': len(ideal_type.preferred_interests), 'score': 0.0}
            print(f'      ❌ 관심사 정보 없음: +0점')
    else:
        matched_criteria['interests'] = None
        score_details['interests'] = None
        print(f'      ⚠️ 관심사 미설정: 점수 없음')
    
    # 최종 점수는 0-100 범위로 제한
    final_score = min(score, 100.0)
    
    print(f'      📊 최종 매칭 점수: {final_score:.1f}점 (상세: {score_details})')
    
    return final_score


def find_matchable_users(current_user, latitude, longitude, radius_km=0.5):
    """
    반경 내에서 이상형 조건에 부합하는 사용자 찾기
    
    Args:
        current_user: User 객체 (현재 사용자)
        latitude: 현재 위치 위도
        longitude: 현재 위치 경도
        radius_km: 반경 (km 단위, 기본값 0.5 = 500m)
    
    Returns:
        list: 매칭 가능한 사용자 리스트 (User 객체, 거리, 점수 포함)
    """
    print(f'🔍 find_matchable_users 시작: {current_user.user.username}')
    
    # 현재 사용자의 이상형 프로필 가져오기
    try:
        ideal_type = current_user.ideal_type_profile
        print(f'   이상형 프로필: 나이 {ideal_type.age_min}-{ideal_type.age_max}, 키 {ideal_type.height_min}-{ideal_type.height_max}')
    except IdealTypeProfile.DoesNotExist:
        print(f'   ❌ 이상형 프로필 없음')
        return []
    
    # 매칭 동의가 ON인 사용자만 조회 (matching_consent = True)
    # 자기 자신은 제외
    candidate_users = User.objects.filter(
        matching_consent=True,
        service_active=True
    ).exclude(id=current_user.id)
    
    print(f'   매칭 동의 ON 사용자: {candidate_users.count()}명')
    
    # 위치 정보가 있는 사용자만 필터링
    candidate_users = candidate_users.filter(
        location__isnull=False
    ).select_related('location')
    
    print(f'   위치 정보 있는 사용자: {candidate_users.count()}명')
    
    matchable_users = []
    
    for candidate in candidate_users:
        candidate_location = candidate.location
        
        # 거리 계산
        distance_km = calculate_distance_km(
            latitude, longitude,
            float(candidate_location.latitude),
            float(candidate_location.longitude)
        )
        
        print(f'   후보: {candidate.user.username} (거리: {distance_km * 1000:.2f}m)')
        
        # 반경 체크
        if distance_km > radius_km:
            print(f'      ❌ 거리 초과 ({distance_km * 1000:.2f}m > {radius_km * 1000:.2f}m)')
            continue
        
        # 매칭 조건 체크
        match_score = check_match_criteria(
            ideal_type,
            candidate,
            current_user.gender
        )
        
        print(f'      매칭 점수: {match_score}')
        
        if match_score > 0:
            matchable_users.append({
                'user': candidate,
                'distance_km': distance_km,
                'distance_m': distance_km * 1000,
                'match_score': match_score,
            })
            print(f'      ✅ 매칭 가능!')
        else:
            print(f'      ❌ 매칭 조건 불충족')
    
    # 점수 높은 순 → 거리 가까운 순으로 정렬
    matchable_users.sort(key=lambda x: (-x['match_score'], x['distance_km']))
    
    print(f'   최종 매칭 가능: {len(matchable_users)}명')
    
    return matchable_users


def check_new_matches(current_user, last_check_time=None):
    """
    새로운 매칭 발생 여부 확인
    
    Args:
        current_user: User 객체 (현재 사용자)
        last_check_time: 마지막 체크 시간 (datetime, 선택사항)
    
    Returns:
        dict: {
            'has_new_match': bool,
            'new_matches_count': int,
            'latest_match': Match 객체 또는 None
        }
    """
    from apps.matching.models import Match
    from django.utils import timezone
    
    # 현재 사용자와 관련된 매칭 조회
    matches = Match.objects.filter(
        Q(user1=current_user) | Q(user2=current_user)
    ).order_by('-matched_at')
    
    # 마지막 체크 시간 이후의 매칭만 필터링
    if last_check_time:
        matches = matches.filter(matched_at__gt=last_check_time)
    
    new_matches_count = matches.count()
    has_new_match = new_matches_count > 0
    
    latest_match = matches.first() if has_new_match else None
    
    return {
        'has_new_match': has_new_match,
        'new_matches_count': new_matches_count,
        'latest_match': latest_match,
    }
