import { generateMockUsers, formatUserInfo } from '../mock/mockUserGenerator';
import { calculateDistance, checkMatchCriteria } from '../../utils/matching';
import { MATCHING_RADIUS_KM } from '../../constants/config';

/**
 * Mock API Client - 백엔드 역할을 시뮬레이션
 * 실제 프로덕션에서는 이 클래스를 실제 API 호출로 교체
 */
export class MockApiClient {
  constructor() {
    this.mockUsers = [];
    this.currentUserProfile = null;
    this.currentIdealType = null;
    this.isInitialized = false;
    this.matchAttemptCount = 0; // 매칭 시도 카운터 (테스트용)
  }

  /**
   * Mock API 초기화
   * @param {Object} userLocation - 사용자 위치 {latitude, longitude}
   */
  initialize(userLocation) {
    if (this.isInitialized) {
      console.log('⚠️ Mock API는 이미 초기화되어 있습니다.');
      return;
    }

    console.log('🚀 Mock API 초기화 시작...');
    this.mockUsers = generateMockUsers(20, userLocation);
    this.isInitialized = true;
    console.log('✅ Mock API 초기화 완료');
  }

  /**
   * 사용자 프로필 및 이상형 설정
   * @param {Object} profile - 사용자 프로필
   * @param {Object} idealType - 이상형 조건
   */
  setUserProfile(profile, idealType) {
    this.currentUserProfile = profile;
    this.currentIdealType = idealType;
    console.log('👤 사용자 프로필 설정:', formatUserInfo(profile));
    
    if (idealType) {
      console.log('💝 이상형 조건:', {
        나이: `${idealType.minAge}-${idealType.maxAge}세`,
        키: `${idealType.minHeight}-${idealType.maxHeight}cm`,
        성격: (idealType.preferredPersonalities || []).length + '개',
        관심사: (idealType.preferredInterests || []).length + '개',
      });
    }
  }

  /**
   * 매칭 검색 - 백엔드 API 시뮬레이션
   * 실제로는: POST /api/matches
   * @param {Object} userLocation - 현재 위치 {latitude, longitude}
   * @returns {Promise<Object>} 매칭 결과
   */
  async findMatches(userLocation) {
    // API 호출 시뮬레이션 (약간의 딜레이)
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!this.isInitialized) {
      console.error('❌ Mock API가 초기화되지 않았습니다.');
      return { matched: false, matches: [] };
    }

    if (!this.currentUserProfile || !this.currentIdealType) {
      console.error('❌ 사용자 프로필 또는 이상형이 설정되지 않았습니다.');
      return { matched: false, matches: [] };
    }

    // 매칭 시도 카운터 증가
    this.matchAttemptCount++;
    console.log(`🔍 매칭 검색 시작... (시도 ${this.matchAttemptCount}/3)`);
    console.log(`   위치: (${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)})`);

    // 🎯 테스트용: 3번째 시도 시 강제 매칭
    if (this.matchAttemptCount >= 3 && this.mockUsers.length > 0) {
      console.log('🎉 [테스트 모드] 3번째 시도 - 강제 매칭!');
      const forcedMatch = this.mockUsers[0]; // 첫 번째 사용자 선택
      
      return {
        matched: true,
        matches: [{
          user: forcedMatch,
          distance: 0.03, // 30m
          matchScore: 100,
        }],
      };
    }

    // 주변 사용자 중 매칭되는 사람 찾기
    const matches = this.mockUsers
      .map(user => {
        // 1. 거리 계산
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          user.location.latitude,
          user.location.longitude
        );

        // 2. 거리 체크 (설정된 반경 이내)
        const radiusKm = MATCHING_RADIUS_KM || 0.05; // 기본 50m
        if (distance > radiusKm) {
          return null; // 거리 밖이면 제외
        }

        // 3. 매칭 조건 체크 및 점수 계산
        const matchScore = checkMatchCriteria(
          this.currentIdealType,
          user,
          this.currentUserProfile.gender
        );

        // 4. 점수가 0이면 (조건 불충족) 제외
        if (matchScore === 0) {
          return null;
        }

        // 5. 매칭 결과 반환
        return {
          user,
          distance,
          matchScore,
        };
      })
      .filter(match => match !== null) // null 제거
      .sort((a, b) => {
        // 점수 높은 순 → 거리 가까운 순으로 정렬
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }
        return a.distance - b.distance;
      });

    // 결과 로깅
    console.log(`📊 매칭 결과: ${matches.length}명 발견`);
    if (matches.length > 0) {
      console.log('   최고 매칭:');
      const best = matches[0];
      console.log(`   - ${formatUserInfo(best.user)}`);
      console.log(`   - 거리: ${(best.distance * 1000).toFixed(0)}m`);
      console.log(`   - 점수: ${best.matchScore}점`);
    } else {
      console.log('   ⏳ 조건에 맞는 이상형이 아직 없습니다.');
    }

    return {
      matched: matches.length > 0,
      matches,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 위치 업데이트
   * 실제로는: POST /api/location
   * @param {Object} location - 새로운 위치 {latitude, longitude}
   * @returns {Promise<Object>} 성공 여부
   */
  async updateLocation(location) {
    // API 호출 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('📍 위치 업데이트:', {
      latitude: location.latitude.toFixed(6),
      longitude: location.longitude.toFixed(6),
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Mock 사용자 목록 가져오기 (디버깅용)
   * @returns {Array} Mock 사용자 배열
   */
  getMockUsers() {
    return this.mockUsers;
  }

  /**
   * Mock API 재초기화 (새로운 위치 기준)
   * @param {Object} userLocation - 새로운 중심 위치
   */
  reinitialize(userLocation) {
    console.log('🔄 Mock API 재초기화...');
    this.isInitialized = false;
    this.initialize(userLocation);
  }

  /**
   * 매칭 카운터 리셋 (테스트용)
   */
  resetMatchCounter() {
    console.log('🔄 매칭 카운터 리셋: 0으로 초기화');
    this.matchAttemptCount = 0;
  }

  /**
   * 통계 정보 가져오기
   * @returns {Object} 통계 정보
   */
  getStats() {
    return {
      totalUsers: this.mockUsers.length,
      maleUsers: this.mockUsers.filter(u => u.gender === 'male').length,
      femaleUsers: this.mockUsers.filter(u => u.gender === 'female').length,
      isInitialized: this.isInitialized,
      hasProfile: !!this.currentUserProfile,
      hasIdealType: !!this.currentIdealType,
    };
  }
}

// 싱글톤 인스턴스 생성 및 export
export const mockApiClient = new MockApiClient();
