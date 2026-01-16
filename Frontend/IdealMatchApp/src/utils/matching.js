/**
 * 매칭 관련 유틸리티 함수들
 */

/**
 * Haversine 공식을 사용하여 두 좌표 간의 거리를 계산 (km 단위)
 * @param {number} lat1 - 첫 번째 위치의 위도
 * @param {number} lon1 - 첫 번째 위치의 경도
 * @param {number} lat2 - 두 번째 위치의 위도
 * @param {number} lon2 - 두 번째 위치의 경도
 * @returns {number} 거리 (km)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // 지구 반지름 (km)
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

/**
 * 각도를 라디안으로 변환
 */
const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * 매칭 조건을 체크하고 점수를 계산
 * @param {Object} idealType - 이상형 조건
 * @param {Object} targetUser - 매칭 대상 사용자
 * @param {string} myGender - 내 성별
 * @returns {number} 매칭 점수 (0-100), 조건 불충족 시 0
 */
export const checkMatchCriteria = (idealType, targetUser, myGender) => {
  let score = 0;

  // 1. 성별 체크 (이성만 매칭)
  if (targetUser.gender === myGender) {
    return 0; // 동성은 매칭 안 됨
  }

  // 2. 나이 범위 체크
  if (
    targetUser.age >= idealType.minAge &&
    targetUser.age <= idealType.maxAge
  ) {
    score += 25; // 나이 조건 충족: +25점
  } else {
    return 0; // 나이 범위 벗어나면 매칭 안 됨
  }

  // 3. 키 범위 체크
  if (
    targetUser.height >= idealType.minHeight &&
    targetUser.height <= idealType.maxHeight
  ) {
    score += 25; // 키 조건 충족: +25점
  } else {
    return 0; // 키 범위 벗어나면 매칭 안 됨
  }

  // 4. 성격 일치도 (최소 1개 이상 일치해야 함)
  const personalityMatches = targetUser.personalities.filter(p =>
    idealType.preferredPersonalities.includes(p)
  ).length;
  
  if (personalityMatches === 0) {
    return 0; // 성격 일치 없으면 매칭 안 됨
  }
  score += personalityMatches * 10; // 일치하는 성격당 +10점

  // 5. 관심사 일치도 (최소 1개 이상 일치해야 함)
  const interestMatches = targetUser.interests.filter(i =>
    idealType.preferredInterests.includes(i)
  ).length;
  
  if (interestMatches === 0) {
    return 0; // 관심사 일치 없으면 매칭 안 됨
  }
  score += interestMatches * 10; // 일치하는 관심사당 +10점

  // 최대 점수는 100점으로 제한
  return Math.min(score, 100);
};

/**
 * 매칭 결과를 점수 기준으로 정렬
 * @param {Array} matches - 매칭 결과 배열
 * @returns {Array} 정렬된 매칭 결과
 */
export const sortMatchesByScore = (matches) => {
  return matches.sort((a, b) => b.matchScore - a.matchScore);
};

/**
 * 거리와 점수를 기반으로 최적의 매칭 선택
 * @param {Array} matches - 매칭 결과 배열
 * @returns {Object|null} 최적의 매칭 또는 null
 */
export const selectBestMatch = (matches) => {
  if (!matches || matches.length === 0) {
    return null;
  }

  // 점수가 가장 높은 것 선택
  // 점수가 같으면 거리가 가까운 것 선택
  return matches.reduce((best, current) => {
    if (current.matchScore > best.matchScore) {
      return current;
    } else if (
      current.matchScore === best.matchScore &&
      current.distance < best.distance
    ) {
      return current;
    }
    return best;
  }, matches[0]);
};
