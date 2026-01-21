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
    - 사용자가 설정한 중요 항목 순위에 따라 가중치 동적 계산
    
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
    # 사용자가 설정한 중요 항목 순위에 따라 가중치 동적 계산
    # ==========================================
    
    # 순위에 따른 가중치 설정 (총합 100점)
    # 1순위: 가장 높은 가중치, 2순위: 중간, 3순위: 낮은 가중치
    PRIORITY_WEIGHTS = {
        1: 50.0,  # 1순위: 50점
        2: 30.0,  # 2순위: 30점
        3: 20.0,  # 3순위: 20점
    }
    
    # 기본 가중치 (순위가 설정되지 않은 경우) - 사용하지 않음 (순위 필수)
    # 순위가 설정되지 않은 항목은 점수에 포함하지 않음
    
    # 사용자가 설정한 순위에 따라 가중치 계산
    def get_weight_for_item(item_type, ideal_type):
        """
        항목 타입에 따른 가중치 반환
        - priority_1에 설정된 항목: 50점 (1순위)
        - priority_2에 설정된 항목: 30점 (2순위)
        - priority_3에 설정된 항목: 20점 (3순위)
        - 순위가 설정되지 않은 항목: 0점 (점수에 포함하지 않음)
        """
        # 1순위 확인
        if ideal_type.priority_1 == item_type:
            return PRIORITY_WEIGHTS[1]  # 50점
        # 2순위 확인
        elif ideal_type.priority_2 == item_type:
            return PRIORITY_WEIGHTS[2]  # 30점
        # 3순위 확인
        elif ideal_type.priority_3 == item_type:
            return PRIORITY_WEIGHTS[3]  # 20점
        else:
            # 순위가 설정되지 않은 경우 0점 (점수에 포함하지 않음)
            return 0.0
    
    def calculate_f1_score(ideal_list, candidate_list):
        """
        F1 Score 계산 (Precision과 Recall의 조화평균)
        
        Args:
            ideal_list: 이상형으로 선택한 항목 리스트
            candidate_list: 후보자가 선택한 항목 리스트
        
        Returns:
            float: F1 Score (0.0 ~ 1.0)
        """
        if not ideal_list or not candidate_list:
            return 0.0
        
        ideal_set = set(ideal_list)
        candidate_set = set(candidate_list)
        
        # 일치하는 항목 개수 (TP)
        matches = len(ideal_set & candidate_set)
        
        if matches == 0:
            return 0.0
        
        # Precision: 일치하는 개수 / 내가 선택한 개수
        precision = matches / len(ideal_set) if len(ideal_set) > 0 else 0.0
        
        # Recall: 일치하는 개수 / 상대방이 선택한 개수
        recall = matches / len(candidate_set) if len(candidate_set) > 0 else 0.0
        
        # F1 Score: Precision과 Recall의 조화평균
        if precision + recall == 0:
            return 0.0
        
        f1_score = 2 * (precision * recall) / (precision + recall)
        
        return f1_score
    
    score = 0.0
    score_details = {}
    
    # 2-1. MBTI 점수 (0 또는 1 × 가중치)
    mbti_weight = get_weight_for_item('mbti', ideal_type)
    if mbti_weight > 0:  # 우선순위에 MBTI가 설정된 경우만 계산
        if ideal_type.preferred_mbti and len(ideal_type.preferred_mbti) > 0:
            if candidate_user.mbti and candidate_user.mbti in ideal_type.preferred_mbti:
                # MBTI 일치: 1 × 가중치
                mbti_score = 1.0 * mbti_weight
                score += mbti_score
                matched_criteria['mbti'] = True
                score_details['mbti'] = {
                    'match': True,
                    'score': mbti_score,
                    'weight': mbti_weight
                }
                priority = '1순위' if ideal_type.priority_1 == 'mbti' else '2순위' if ideal_type.priority_2 == 'mbti' else '3순위'
                print(f'      ✅ MBTI 일치 ({candidate_user.mbti}): {mbti_score:.1f}점 (순위: {priority}, 가중치: {mbti_weight}점)')
            else:
                # MBTI 불일치: 0 × 가중치 = 0점
                matched_criteria['mbti'] = False
                score_details['mbti'] = {
                    'match': False,
                    'score': 0.0,
                    'weight': mbti_weight
                }
                print(f'      ❌ MBTI 불일치 (선호: {ideal_type.preferred_mbti}, 후보: {candidate_user.mbti}): 0점')
        else:
            matched_criteria['mbti'] = None
            score_details['mbti'] = None
            print(f'      ⚠️ MBTI 미설정: 점수 없음')
    
    # 2-2. 성격 점수 (F1 Score × 가중치)
    personality_weight = get_weight_for_item('personality', ideal_type)
    if personality_weight > 0:  # 우선순위에 성격이 설정된 경우만 계산
        if ideal_type.preferred_personality and len(ideal_type.preferred_personality) > 0:
            if candidate_user.personality and isinstance(candidate_user.personality, list):
                # F1 Score 계산
                f1_score = calculate_f1_score(
                    ideal_type.preferred_personality,
                    candidate_user.personality
                )
                personality_score = f1_score * personality_weight
                score += personality_score
                
                matches = len(set(ideal_type.preferred_personality) & set(candidate_user.personality))
                matched_criteria['personality'] = matches
                score_details['personality'] = {
                    'matches': matches,
                    'total_preferred': len(ideal_type.preferred_personality),
                    'total_candidate': len(candidate_user.personality),
                    'f1_score': f1_score,
                    'score': personality_score,
                    'weight': personality_weight
                }
                priority = '1순위' if ideal_type.priority_1 == 'personality' else '2순위' if ideal_type.priority_2 == 'personality' else '3순위'
                print(f'      ✅ 성격 F1 Score: {f1_score:.3f} (일치: {matches}/{len(ideal_type.preferred_personality)} vs {len(candidate_user.personality)}): {personality_score:.1f}점 (순위: {priority}, 가중치: {personality_weight}점)')
            else:
                matched_criteria['personality'] = 0
                score_details['personality'] = {
                    'matches': 0,
                    'total_preferred': len(ideal_type.preferred_personality),
                    'total_candidate': 0,
                    'f1_score': 0.0,
                    'score': 0.0,
                    'weight': personality_weight
                }
                print(f'      ❌ 성격 정보 없음: 0점')
        else:
            matched_criteria['personality'] = None
            score_details['personality'] = None
            print(f'      ⚠️ 성격 미설정: 점수 없음')
    
    # 2-3. 관심사 점수 (F1 Score × 가중치)
    interest_weight = get_weight_for_item('interests', ideal_type)
    if interest_weight > 0:  # 우선순위에 관심사가 설정된 경우만 계산
        if ideal_type.preferred_interests and len(ideal_type.preferred_interests) > 0:
            if candidate_user.interests and isinstance(candidate_user.interests, list):
                # F1 Score 계산
                f1_score = calculate_f1_score(
                    ideal_type.preferred_interests,
                    candidate_user.interests
                )
                interest_score = f1_score * interest_weight
                score += interest_score
                
                matches = len(set(ideal_type.preferred_interests) & set(candidate_user.interests))
                matched_criteria['interests'] = matches
                score_details['interests'] = {
                    'matches': matches,
                    'total_preferred': len(ideal_type.preferred_interests),
                    'total_candidate': len(candidate_user.interests),
                    'f1_score': f1_score,
                    'score': interest_score,
                    'weight': interest_weight
                }
                priority = '1순위' if ideal_type.priority_1 == 'interests' else '2순위' if ideal_type.priority_2 == 'interests' else '3순위'
                print(f'      ✅ 관심사 F1 Score: {f1_score:.3f} (일치: {matches}/{len(ideal_type.preferred_interests)} vs {len(candidate_user.interests)}): {interest_score:.1f}점 (순위: {priority}, 가중치: {interest_weight}점)')
            else:
                matched_criteria['interests'] = 0
                score_details['interests'] = {
                    'matches': 0,
                    'total_preferred': len(ideal_type.preferred_interests),
                    'total_candidate': 0,
                    'f1_score': 0.0,
                    'score': 0.0,
                    'weight': interest_weight
                }
                print(f'      ❌ 관심사 정보 없음: 0점')
        else:
            matched_criteria['interests'] = None
            score_details['interests'] = None
            print(f'      ⚠️ 관심사 미설정: 점수 없음')
    
    # 최종 점수 (0-100 범위, 가중치 합이 100이므로 자동으로 100 이하)
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
        
        # 매칭 점수 50점 이상이면 매칭 가능
        if match_score >= 50.0:
            matchable_users.append({
                'user': candidate,
                'distance_km': distance_km,
                'distance_m': distance_km * 1000,
                'match_score': match_score,
            })
            print(f'      ✅ 매칭 가능! (점수: {match_score:.1f}점 >= 50점)')
        else:
            print(f'      ❌ 매칭 조건 불충족 (점수: {match_score:.1f}점 < 50점)')
    
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
