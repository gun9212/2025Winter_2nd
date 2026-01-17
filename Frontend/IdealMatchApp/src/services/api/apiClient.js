import { CONFIG } from '../../constants/config';
import { StorageService } from '../storage';

/**
 * 실제 백엔드 API 클라이언트
 * JWT 토큰을 자동으로 첨부하여 서버와 통신
 */
class ApiClient {
  constructor() {
    this.baseURL = CONFIG.API_BASE_URL;
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
      const response = await fetch(url, {
        ...options,
        headers,
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
        console.error('❌ 네트워크 오류:', error);
        throw new Error('네트워크 연결을 확인해주세요.');
      }
      
      throw error;
    }
  }

  /**
   * 위치 정보 업데이트
   * @param {number} latitude - 위도
   * @param {number} longitude - 경도
   * @returns {Promise<Object>} 업데이트 결과
   */
  async updateLocation(latitude, longitude) {
    try {
      const response = await this.request('/users/location/update/', {
        method: 'POST',
        body: JSON.stringify({
          latitude,
          longitude,
        }),
      });

      return {
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ 위치 업데이트 실패:', error);
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
}

// 싱글톤 인스턴스 생성 및 export
export const apiClient = new ApiClient();
