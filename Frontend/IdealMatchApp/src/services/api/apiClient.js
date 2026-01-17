import { CONFIG } from '../../constants/config';
import { StorageService } from '../storage';
import { Platform } from 'react-native';

/**
 * 실제 백엔드 API 클라이언트
 * JWT 토큰을 자동으로 첨부하여 서버와 통신
 */
class ApiClient {
  constructor() {
    // CONFIG가 undefined일 경우를 대비한 기본값 설정
    if (!CONFIG || !CONFIG.API_BASE_URL) {
      console.error('❌ CONFIG.API_BASE_URL이 설정되지 않았습니다.');
      // iOS 시뮬레이터 기본값
      this.baseURL = Platform.OS === 'ios' 
        ? 'http://127.0.0.1:8000/api'
        : 'http://10.0.2.2:8000/api';
    } else {
      this.baseURL = CONFIG.API_BASE_URL;
    }
    console.log('🌐 API Client 초기화:', { baseURL: this.baseURL, platform: Platform.OS });
  }

  /**
   * HTTP 요청 헬퍼 함수
   * @param {string} endpoint - API 엔드포인트 (예: '/users/location/update/')
   * @param {Object} options - fetch 옵션
   * @returns {Promise<Object>} 응답 데이터
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // JWT 토큰 가져오기
    const token = await StorageService.getAccessToken();
    
    // 기본 헤더 설정
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // 토큰이 있으면 Authorization 헤더 추가
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      console.log('📡 API 요청 시작:', {
        url,
        method: options.method || 'GET',
        hasToken: !!token,
        headers: Object.keys(headers),
      });

      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log('📥 API 응답 받음:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      // 응답이 JSON인지 확인
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      let data;
      if (isJson) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // 에러 처리
      if (!response.ok) {
        // 401 Unauthorized - 토큰 만료 또는 인증 실패
        if (response.status === 401) {
          console.error('❌ 인증 실패: 토큰이 만료되었거나 유효하지 않습니다.');
          // 토큰 삭제 (선택사항)
          // await StorageService.clearTokens();
          throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
        }

        // 500 Server Error
        if (response.status >= 500) {
          console.error('❌ 서버 오류:', data);
          throw new Error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }

        // 기타 에러
        const errorMessage = data?.error || data?.message || `요청 실패 (${response.status})`;
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      // 네트워크 에러 처리
      if (error.message === 'Network request failed' || error.message.includes('fetch')) {
        console.error('❌ 네트워크 오류 발생!');
        console.error('   URL:', url);
        console.error('   에러:', error.message);
        console.error('   💡 해결 방법:');
        console.error('      1. Django 서버가 실행 중인지 확인 (python manage.py runserver)');
        console.error('      2. iOS 시뮬레이터: API_BASE_URL이 http://127.0.0.1:8000/api 인지 확인');
        console.error('      3. Android 에뮬레이터: API_BASE_URL이 http://10.0.2.2:8000/api 인지 확인');
        throw new Error(`네트워크 연결 실패: ${url}`);
      }
      
      console.error('❌ API 요청 오류:', error);
      throw error;
    }
  }

  /**
   * 위치 정보 업데이트
   * @param {number} latitude - 위도
   * @param {number} longitude - 경도
   * @param {number} userId - 사용자 ID (디버그 모드에서 사용, 선택사항)
   * @returns {Promise<Object>} 업데이트 결과
   */
  async updateLocation(latitude, longitude, userId = null) {
    try {
      // 디버그 모드이고 user_id가 없으면 테스트 user_id 사용
      const requestBody = {
        latitude,
        longitude,
      };
      
      // 디버그 모드에서 인증 토큰이 없으면 user_id 추가
      const token = await StorageService.getAccessToken();
      const testUserId = userId || (CONFIG && CONFIG.TEST_USER_ID) || 1; // 기본값 1
      if (__DEV__ && !token && testUserId) {
        requestBody.user_id = testUserId;
        console.log('🔧 디버그 모드: user_id 추가', requestBody.user_id);
      }

      console.log('🌐 API 요청:', {
        url: `${this.baseURL}/users/location/update/`,
        method: 'POST',
        body: requestBody,
      });

      const response = await this.request('/users/location/update/', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      console.log('✅ API 응답:', response);

      return {
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ 위치 업데이트 실패:', error);
      console.error('   에러 상세:', error.message);
      console.error('   API URL:', `${this.baseURL}/users/location/update/`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 현재 사용자의 위치 정보 조회
   * @returns {Promise<Object>} 위치 정보
   */
  async getCurrentLocation() {
    try {
      const response = await this.request('/users/location/', {
        method: 'GET',
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('❌ 위치 조회 실패:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 프로필 조회
   * @returns {Promise<Object>} 프로필 정보
   */
  async getProfile() {
    try {
      const response = await this.request('/users/profile/', {
        method: 'GET',
      });

      return {
        success: true,
        data: response.data || response,
      };
    } catch (error) {
      console.error('❌ 프로필 조회 실패:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 프로필 생성/수정
   * @param {Object} profileData - 프로필 데이터 (age, gender, height, mbti, personality, interests)
   * @returns {Promise<Object>} 저장 결과
   */
  async updateProfile(profileData) {
    try {
      // 디버그 모드에서 user_id 추가
      const requestBody = { ...profileData };
      const token = await StorageService.getAccessToken();
      const testUserId = (CONFIG && CONFIG.TEST_USER_ID) || 1;
      
      if (__DEV__ && !token && testUserId) {
        requestBody.user_id = testUserId;
        console.log('🔧 디버그 모드: user_id 추가', requestBody.user_id);
      }

      console.log('🌐 프로필 저장 API 요청:', {
        url: `${this.baseURL}/users/profile/`,
        method: 'POST',
        body: requestBody,
      });

      const response = await this.request('/users/profile/', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      console.log('✅ 프로필 저장 API 응답:', response);

      return {
        success: true,
        data: response.data || response,
      };
    } catch (error) {
      console.error('❌ 프로필 저장 실패:', error);
      console.error('   에러 상세:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 프로필 완성도 확인
   * @returns {Promise<Object>} 완성도 정보
   */
  async checkProfileCompleteness() {
    try {
      const response = await this.request('/users/profile/completeness/', {
        method: 'GET',
      });

      return {
        success: true,
        profile_complete: response.profile_complete || false,
        ideal_type_complete: response.ideal_type_complete || false,
        all_complete: response.all_complete || false,
      };
    } catch (error) {
      console.error('❌ 프로필 완성도 확인 실패:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// 싱글톤 인스턴스 생성 및 export
export const apiClient = new ApiClient();
