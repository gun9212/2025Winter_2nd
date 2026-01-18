import { CONFIG } from '../../constants/config';
import { StorageService } from '../storage';
import { Platform } from 'react-native';

/**
 * JWT 토큰 디코딩 유틸리티
 * @param {string} token - JWT 토큰
 * @returns {Object|null} 디코딩된 토큰 페이로드 또는 null
 */
function decodeJWT(token) {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Base64 URL 디코딩
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('❌ JWT 디코딩 실패:', error);
    return null;
  }
}

/**
 * 토큰 만료 시간 확인
 * @param {string} token - JWT 토큰
 * @returns {number|null} 만료까지 남은 시간 (밀리초) 또는 null
 */
function getTokenExpirationTime(token) {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return null;
  
  // exp는 초 단위이므로 밀리초로 변환
  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();
  return expirationTime - currentTime;
}

/**
 * 토큰이 곧 만료되는지 확인 (1분 이내)
 * @param {string} token - JWT 토큰
 * @returns {boolean} 곧 만료되는지 여부
 */
function isTokenExpiringSoon(token) {
  const timeUntilExpiration = getTokenExpirationTime(token);
  if (timeUntilExpiration === null) return true; // 만료 시간을 알 수 없으면 true 반환
  return timeUntilExpiration < 60 * 1000; // 1분 = 60,000ms
}

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
    
    // 토큰 갱신 중 플래그 (중복 갱신 방지)
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  /**
   * 토큰 갱신 (API 4)
   * @returns {Promise<string>} 새로운 Access Token
   */
  async refreshToken() {
    // 이미 갱신 중이면 기존 Promise 반환 (중복 갱신 방지)
    if (this.isRefreshing && this.refreshPromise) {
      console.log('🔄 토큰 갱신 중... 기존 요청 대기');
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = await StorageService.getRefreshToken();
        
        if (!refreshToken) {
          throw new Error('Refresh Token이 없습니다. 다시 로그인해주세요.');
        }

        console.log('🔄 토큰 갱신 API 호출...');

        const response = await fetch(`${this.baseURL}/users/auth/refresh/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh: refreshToken,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Refresh Token도 만료된 경우
          if (response.status === 401) {
            console.error('❌ Refresh Token 만료: 로그인 화면으로 이동 필요');
            await StorageService.clearTokens();
            throw new Error('REFRESH_TOKEN_EXPIRED');
          }
          throw new Error(data.detail || data.error || '토큰 갱신 실패');
        }

        // 새 토큰 저장
        const newAccessToken = data.access;
        const newRefreshToken = data.refresh || refreshToken; // refresh가 없으면 기존 것 유지
        
        await StorageService.saveTokens(newAccessToken, newRefreshToken);
        console.log('✅ 토큰 갱신 완료');

        return newAccessToken;
      } catch (error) {
        console.error('❌ 토큰 갱신 실패:', error);
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * HTTP 요청 헬퍼 함수
   * @param {string} endpoint - API 엔드포인트 (예: '/users/location/update/')
   * @param {Object} options - fetch 옵션
   * @param {boolean} options.requireAuth - 인증이 필요한지 여부 (기본값: true)
   * @param {boolean} options.retryOn401 - 401 에러 시 자동 재시도 여부 (기본값: true)
   * @returns {Promise<Object>} 응답 데이터
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // 인증 필요 여부 확인 (기본값: true)
    const requireAuth = options.requireAuth !== false;
    // 401 에러 시 자동 재시도 여부 (기본값: true)
    const retryOn401 = options.retryOn401 !== false;
    
    // 시나리오 2: 사전 갱신 - 토큰이 곧 만료되면 미리 갱신
    if (requireAuth) {
      const token = await StorageService.getAccessToken();
      if (token && isTokenExpiringSoon(token)) {
        console.log('⏰ 토큰이 곧 만료됩니다. 사전 갱신 시도...');
        try {
          await this.refreshToken();
        } catch (error) {
          // 사전 갱신 실패해도 원래 요청은 시도 (401 에러 시 자동 갱신으로 처리)
          console.warn('⚠️ 사전 갱신 실패, 원래 요청 계속 진행:', error.message);
        }
      }
    }
    
    // JWT 토큰 가져오기
    const token = await StorageService.getAccessToken();
    
    // 기본 헤더 설정
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // 토큰이 있고 인증이 필요한 경우에만 Authorization 헤더 추가
    if (token && requireAuth) {
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
        if (response.status === 401 && requireAuth) {
          // 시나리오 1: 자동 갱신
          if (retryOn401) {
            console.log('🔄 401 에러 발생. 토큰 갱신 후 재시도...');
            try {
              const newToken = await this.refreshToken();
              
              // 새 토큰으로 재시도
              headers['Authorization'] = `Bearer ${newToken}`;
              console.log('🔄 재시도 중...');
              
              const retryResponse = await fetch(url, {
                ...options,
                headers,
              });
              
              const retryContentType = retryResponse.headers.get('content-type');
              const isRetryJson = retryContentType && retryContentType.includes('application/json');
              
              const retryData = isRetryJson ? await retryResponse.json() : await retryResponse.text();
              
              if (!retryResponse.ok) {
                throw new Error(retryData?.error || retryData?.message || `요청 실패 (${retryResponse.status})`);
              }
              
              console.log('✅ 재시도 성공');
              return retryData;
            } catch (refreshError) {
              // 시나리오 3: Refresh Token 만료
              if (refreshError.message === 'REFRESH_TOKEN_EXPIRED') {
                console.error('❌ Refresh Token 만료: 로그인 화면으로 이동 필요');
                // AuthContext에서 처리하도록 에러 전달
                throw new Error('REFRESH_TOKEN_EXPIRED');
              }
              throw refreshError;
            }
          } else {
            // 자동 재시도 비활성화된 경우
            console.error('❌ 인증 실패: 토큰이 만료되었거나 유효하지 않습니다.');
            throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
          }
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

  /**
   * 로그인
   * API 3: POST /api/users/auth/login/
   * @param {string} username - 아이디
   * @param {string} password - 비밀번호
   * @returns {Promise<Object>} 로그인 결과
   */
  async login(username, password) {
    try {
      const requestBody = {
        username,
        password,
      };

      console.log('🌐 로그인 API 요청:', {
        url: `${this.baseURL}/users/auth/login/`,
        method: 'POST',
        body: { username, password: '***' }, // 비밀번호는 로그에 표시하지 않음
      });

      const response = await this.request('/users/auth/login/', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        requireAuth: false, // 인증이 필요 없는 API
      });

      console.log('✅ 로그인 API 응답:', {
        hasAccessToken: !!response.access_token,
        hasRefreshToken: !!response.refresh_token,
        user: response.user,
      });

      // 토큰 저장
      if (response.access_token && response.refresh_token) {
        await StorageService.saveTokens(response.access_token, response.refresh_token);
        console.log('✅ 토큰 저장 완료');
      }

      return {
        success: true,
        data: response,
        user: response.user,
        access_token: response.access_token,
        refresh_token: response.refresh_token,
      };
    } catch (error) {
      console.error('❌ 로그인 실패:', error);
      return {
        success: false,
        error: error.message,
        message: error.message || '로그인 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 이메일 인증번호 발송
   * POST /api/users/auth/send-verification-code/
   * @param {string} email - 이메일
   * @returns {Promise<Object>} 발송 결과
   */
  async sendVerificationCode(email) {
    try {
      const requestBody = {
        email: email,
      };

      console.log('🌐 이메일 인증번호 발송 API 요청:', {
        url: `${this.baseURL}/users/auth/send-verification-code/`,
        method: 'POST',
        body: requestBody,
      });

      const response = await this.request('/users/auth/send-verification-code/', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        requireAuth: false, // 인증이 필요 없는 API
      });

      console.log('✅ 이메일 인증번호 발송 API 응답:', response);

      return {
        success: true,
        message: response.message || '인증번호가 전송되었습니다.',
        expires_in: response.expires_in || 120,
        // 개발 환경에서만 인증번호 반환
        verification_code: response.verification_code,
      };
    } catch (error) {
      console.error('❌ 이메일 인증번호 발송 실패:', error);
      return {
        success: false,
        error: error.message,
        message: error.message || '인증번호 발송 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 이메일 인증 확인
   * API 2: POST /api/users/auth/verify-email/
   * @param {string} email - 이메일
   * @param {string} verificationCode - 인증번호
   * @returns {Promise<Object>} 인증 결과
   */
  async verifyEmail(email, verificationCode) {
    try {
      const requestBody = {
        email: email,
        verification_code: verificationCode,
      };

      console.log('🌐 이메일 인증 API 요청:', {
        url: `${this.baseURL}/users/auth/verify-email/`,
        method: 'POST',
        body: { ...requestBody, verification_code: '***' }, // 인증번호는 로그에 표시하지 않음
      });

      const response = await this.request('/users/auth/verify-email/', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        requireAuth: false, // 인증이 필요 없는 API
      });

      console.log('✅ 이메일 인증 API 응답:', response);

      return {
        success: true,
        email_verified: response.email_verified,
        email_verified_at: response.email_verified_at,
        message: response.message || '인증이 완료되었습니다.',
      };
    } catch (error) {
      console.error('❌ 이메일 인증 실패:', error);
      return {
        success: false,
        error: error.message,
        message: error.message || '인증번호가 일치하지 않습니다.',
      };
    }
  }

  /**
   * 회원가입
   * API 1: POST /api/users/auth/register/
   * @param {string} username - 아이디
   * @param {string} password - 비밀번호
   * @param {string} email - 이메일
   * @returns {Promise<Object>} 회원가입 결과
   */
  async register(username, password, email) {
    try {
      const requestBody = {
        username,
        password,
        email: email,
      };

      console.log('🌐 회원가입 API 요청:', {
        url: `${this.baseURL}/users/auth/register/`,
        method: 'POST',
        body: { ...requestBody, password: '***' }, // 비밀번호는 로그에 표시하지 않음
      });

      const response = await this.request('/users/auth/register/', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        requireAuth: false, // 인증이 필요 없는 API
      });

      console.log('✅ 회원가입 API 응답:', response);

      return {
        success: true,
        data: response,
        user: {
          id: response.id,
          username: response.username,
          email: response.email,
        },
      };
    } catch (error) {
      console.error('❌ 회원가입 실패:', error);
      return {
        success: false,
        error: error.message,
        message: error.message || '회원가입 중 오류가 발생했습니다.',
      };
    }
  }
}

// 싱글톤 인스턴스 생성 및 export
export const apiClient = new ApiClient();
