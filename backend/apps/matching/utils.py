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
    이상형 조건 체크 및 매칭 점수 계산
    
    Args:
        ideal_type: IdealTypeProfile 객체 (현재 사용자의 이상형)
        candidate_user: User 객체 (매칭 후보)
        user_gender: 현재 사용자의 성별 ('M' 또는 'F')
    
    Returns:
        int: 매칭 점수 (0 = 매칭 안 됨, 1-4 = 매칭 점수)
    """
    if not ideal_type or not candidate_user:
        return 0
    
    score = 0
    matched_criteria = {}
    
    # 1. 성별 체크 (이상형의 preferred_gender와 후보의 gender)
    # 현재 사용자의 성별과 후보의 성별이 다른지 확인 (이성 매칭)
    # preferred_gender 필드가 없으므로 이성 매칭으로 가정
    if user_gender == 'M':
        # 남성이면 여성 선호
        if candidate_user.gender != 'F':
            return 0  # 성별이 맞지 않으면 매칭 불가
    elif user_gender == 'F':
        # 여성이면 남성 선호
        if candidate_user.gender != 'M':
            return 0  # 성별이 맞지 않으면 매칭 불가
    else:
        return 0  # 성별 정보가 없으면 매칭 불가
    
    score += 1
    matched_criteria['gender'] = True
    
    # 2. 나이 체크
    if ideal_type.age_min and ideal_type.age_max:
        if ideal_type.age_min <= candidate_user.age <= ideal_type.age_max:
            score += 1
            matched_criteria['age'] = True
        else:
            return 0  # 나이가 범위 밖이면 매칭 불가
    else:
        matched_criteria['age'] = None
    
    # 3. 키 체크
    if ideal_type.height_min and ideal_type.height_max:
        if ideal_type.height_min <= candidate_user.height <= ideal_type.height_max:
            score += 1
            matched_criteria['height'] = True
        else:
            return 0  # 키가 범위 밖이면 매칭 불가
    else:
        matched_criteria['height'] = None
    
    # 4. MBTI 체크 (선택사항)
    if ideal_type.preferred_mbti and len(ideal_type.preferred_mbti) > 0:
        if candidate_user.mbti in ideal_type.preferred_mbti:
            score += 1
            matched_criteria['mbti'] = True
        else:
            matched_criteria['mbti'] = False
    else:
        matched_criteria['mbti'] = None
    
    # 최소 3개 이상 일치해야 매칭 (성별, 나이, 키는 필수)
    # 성별과 나이는 필수 조건이므로 이미 체크됨
    # 키도 필수 조건이므로 이미 체크됨
    # 따라서 score가 3 이상이면 매칭 성공
    
    return score if score >= 3 else 0


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
    # 현재 사용자의 이상형 프로필 가져오기
    try:
        ideal_type = current_user.ideal_type_profile
    except IdealTypeProfile.DoesNotExist:
        return []
    
    # 매칭 동의가 ON인 사용자만 조회 (matching_consent = True)
    # 자기 자신은 제외
    candidate_users = User.objects.filter(
        matching_consent=True,
        service_active=True
    ).exclude(id=current_user.id)
    
    # 위치 정보가 있는 사용자만 필터링
    candidate_users = candidate_users.filter(
        location__isnull=False
    ).select_related('location')
    
    matchable_users = []
    
    for candidate in candidate_users:
        candidate_location = candidate.location
        
        # 거리 계산
        distance_km = calculate_distance_km(
            latitude, longitude,
            float(candidate_location.latitude),
            float(candidate_location.longitude)
        )
        
        # 반경 체크
        if distance_km > radius_km:
            continue
        
        # 매칭 조건 체크
        match_score = check_match_criteria(
            ideal_type,
            candidate,
            current_user.gender
        )
        
        if match_score > 0:
            matchable_users.append({
                'user': candidate,
                'distance_km': distance_km,
                'distance_m': distance_km * 1000,
                'match_score': match_score,
            })
    
    # 점수 높은 순 → 거리 가까운 순으로 정렬
    matchable_users.sort(key=lambda x: (-x['match_score'], x['distance_km']))
    
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
