import { CONFIG } from '../../constants/config';
import { StorageService } from '../storage';
import { Platform } from 'react-native';

/**
 * Base64 디코딩 함수 (React Native용)
 * @param {string} str - Base64 인코딩된 문자열
 * @returns {string} 디코딩된 문자열
 */
function base64Decode(str) {
  try {
    // Base64 URL 안전 문자를 일반 Base64로 변환
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    
    // 패딩 추가
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // React Native에서 사용 가능한 방법으로 디코딩
    // Node.js 환경에서는 Buffer 사용, 브라우저에서는 atob 사용
    if (typeof Buffer !== 'undefined' && Buffer.from) {
      // Node.js 환경 (Metro bundler)
      try {
        return Buffer.from(base64, 'base64').toString('utf-8');
      } catch (e) {
        // Buffer가 작동하지 않으면 폴백으로
      }
    }
    
    if (typeof atob !== 'undefined') {
      // 브라우저 환경
      return atob(base64);
    }
    
    // 직접 구현 (폴백) - React Native용
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    let i = 0;
    
    // base64 문자열 정리
    base64 = base64.replace(/[^A-Za-z0-9\+\/\=]/g, '');
    
    while (i < base64.length) {
      const enc1 = chars.indexOf(base64.charAt(i++));
      const enc2 = chars.indexOf(base64.charAt(i++));
      const enc3 = chars.indexOf(base64.charAt(i++));
      const enc4 = chars.indexOf(base64.charAt(i++));
      
      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;
      
      output += String.fromCharCode(chr1);
      
      if (enc3 !== 64) {
        output += String.fromCharCode(chr2);
      }
      if (enc4 !== 64) {
        output += String.fromCharCode(chr3);
      }
    }
    
    return output;
  } catch (error) {
    console.error('❌ Base64 디코딩 실패:', error);
    console.error('   입력 문자열:', str);
    throw error;
  }
}

/**
 * JWT 토큰 디코딩 유틸리티
 * @param {string} token - JWT 토큰
 * @returns {Object|null} 디코딩된 토큰 페이로드 또는 null
 */
function decodeJWT(token) {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('⚠️ JWT 토큰 형식이 올바르지 않습니다:', parts.length, 'parts');
      return null;
    }
    
    // Base64 URL 디코딩
    const payload = parts[1];
    if (!payload) {
      console.warn('⚠️ JWT 페이로드가 비어있습니다');
      return null;
    }
    
    const decoded = base64Decode(payload);
    if (!decoded || decoded.trim().length === 0) {
      console.warn('⚠️ Base64 디코딩 결과가 비어있습니다');
      return null;
    }
    
    // JSON 파싱
    const parsed = JSON.parse(decoded);
    return parsed;
  } catch (error) {
    console.error('❌ JWT 디코딩 실패:', error);
    console.error('   토큰 일부:', token ? token.substring(0, 50) + '...' : 'null');
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

        // 네트워크 오류 확인
        if (!response.ok && response.status === 0) {
          throw new Error('Network request failed');
        }

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
          console.log('✅ 사전 갱신 성공');
        } catch (error) {
          // 사전 갱신 실패해도 원래 요청은 시도 (401 에러 시 자동 갱신으로 처리)
          // 네트워크 오류는 무시 (서버가 꺼져있을 수 있음)
          if (error.message && error.message.includes('Network request failed')) {
            console.log('ℹ️ 사전 갱신 실패 (네트워크 오류), 원래 요청 계속 진행');
          } else {
            console.warn('⚠️ 사전 갱신 실패, 원래 요청 계속 진행:', error.message || error);
          }
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
        const textData = await response.text();
        // HTML 응답인 경우 (404, 500 등)
        if (textData.trim().startsWith('<!DOCTYPE') || textData.trim().startsWith('<html')) {
          console.error('❌ HTML 응답 받음 (잘못된 URL 또는 서버 오류):', {
            url,
            status: response.status,
            contentType,
            responsePreview: textData.substring(0, 200),
          });
          throw new Error(`서버 오류: 잘못된 URL이거나 서버가 HTML을 반환했습니다. (${response.status})`);
        }
        data = textData;
      }

      // 에러 처리
      if (!response.ok) {
        // 에러 응답 로깅 (디버깅용)
        console.error('❌ API 에러 응답:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
        });
        
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

        // 기타 에러 (400 Bad Request 등)
        // 백엔드에서 반환하는 에러 메시지 처리
        let errorMessage = `요청 실패 (${response.status})`;
        
        if (data) {
          // serializer.errors 객체인 경우 처리
          if (typeof data === 'object' && !Array.isArray(data)) {
            // Django REST Framework의 serializer.errors 형식 처리
            if (data.error) {
              errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
            } else if (data.message) {
              errorMessage = data.message;
            } else if (data.username || data.password) {
              // 필드별 에러 메시지 조합
              const fieldErrors = [];
              if (data.username) {
                fieldErrors.push(`아이디: ${Array.isArray(data.username) ? data.username[0] : data.username}`);
              }
              if (data.password) {
                fieldErrors.push(`비밀번호: ${Array.isArray(data.password) ? data.password[0] : data.password}`);
              }
              errorMessage = fieldErrors.join(', ') || errorMessage;
            } else {
              // 다른 필드 에러들
              const errorKeys = Object.keys(data);
              if (errorKeys.length > 0) {
                const firstError = data[errorKeys[0]];
                errorMessage = Array.isArray(firstError) ? firstError[0] : String(firstError);
              }
            }
          } else if (typeof data === 'string') {
            errorMessage = data;
          }
        }
        
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
   * 이상형 프로필 조회
   * API 8: GET /api/users/ideal-type/
   * @returns {Promise<Object>} 이상형 프로필 정보
   */
  async getIdealType() {
    try {
      const response = await this.request('/users/ideal-type/', {
        method: 'GET',
      });

      return {
        success: true,
        data: response.data || response,
      };
    } catch (error) {
      console.error('❌ 이상형 프로필 조회 실패:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 이상형 프로필 생성/수정
   * API 9: POST /api/users/ideal-type/ (생성) 또는 PUT /api/users/ideal-type/ (수정)
   * @param {Object} idealTypeData - 이상형 프로필 데이터
   * @returns {Promise<Object>} 저장 결과
   */
  async updateIdealType(idealTypeData) {
    try {
      // 프론트엔드 필드명을 백엔드 형식으로 변환
      const requestBody = {
        height_min: idealTypeData.minHeight,
        height_max: idealTypeData.maxHeight,
        age_min: idealTypeData.minAge,
        age_max: idealTypeData.maxAge,
        preferred_mbti: idealTypeData.preferredMBTI || [], // MBTI는 선택사항이지만 빈 배열로 전송
        preferred_personality: idealTypeData.preferredPersonalities || [],
        preferred_interests: idealTypeData.preferredInterests || [],
        match_threshold: idealTypeData.matchThreshold || 3,
      };

      console.log('🌐 이상형 프로필 저장 API 요청:', {
        url: `${this.baseURL}/users/ideal-type/`,
        method: 'POST',
        body: requestBody,
      });

      const response = await this.request('/users/ideal-type/', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      console.log('✅ 이상형 프로필 저장 API 응답:', response);

      // 백엔드 응답 형식 확인
      if (response.success === false || !response.success) {
        const errorMsg = response.error || response.message || '이상형 프로필 저장에 실패했습니다.';
        throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      }

      // 성공 응답 확인
      if (!response.data && !response.height_min) {
        throw new Error('이상형 프로필 저장 응답 데이터가 올바르지 않습니다.');
      }

      return {
        success: true,
        data: response.data || response,
      };
    } catch (error) {
      console.error('❌ 이상형 프로필 저장 실패:', error);
      console.error('   에러 상세:', error);
      
      // 에러 메시지 추출 (객체인 경우 처리)
      let errorMessage = '이상형 프로필 저장에 실패했습니다.';
      if (error && typeof error === 'object') {
        if (error.message) {
          errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
        } else if (error.error) {
          errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
        } else {
          errorMessage = JSON.stringify(error);
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return {
        success: false,
        error: errorMessage,
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
      // 입력값 검증
      if (!username || !username.trim()) {
        throw new Error('아이디 또는 이메일을 입력해주세요.');
      }
      if (!password) {
        throw new Error('비밀번호를 입력해주세요.');
      }

      const requestBody = {
        username: username.trim(),
        password: password,
      };

      console.log('🌐 로그인 API 요청:', {
        url: `${this.baseURL}/users/auth/login/`,
        method: 'POST',
        body: { username: requestBody.username, password: '***' }, // 비밀번호는 로그에 표시하지 않음
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
   * 비밀번호 재설정 요청
   * API 16: POST /api/users/auth/password-reset/request/
   * @param {string} username - 아이디
   * @param {string} email - 이메일
   * @returns {Promise<Object>} 발송 결과
   */
  async passwordResetRequest(username, email) {
    try {
      const requestBody = {
        username: username,
        email: email,
      };

      console.log('🌐 비밀번호 재설정 요청 API 요청:', {
        url: `${this.baseURL}/users/auth/password-reset/request/`,
        method: 'POST',
        body: { username, email: '***' }, // 이메일은 로그에 표시하지 않음
      });

      const response = await this.request('/users/auth/password-reset/request/', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        requireAuth: false, // 인증이 필요 없는 API
      });

      console.log('✅ 비밀번호 재설정 요청 API 응답:', response);

      return {
        success: true,
        message: response.message || '인증번호가 이메일로 발송되었습니다.',
        expires_in: response.expires_in || 120,
        // 개발 환경에서만 인증번호 반환
        verification_code: response.verification_code,
      };
    } catch (error) {
      console.error('❌ 비밀번호 재설정 요청 실패:', error);
      return {
        success: false,
        error: error.message,
        message: error.message || '인증번호 발송 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 비밀번호 재설정 인증 확인
   * API 17: POST /api/users/auth/password-reset/verify/
   * @param {string} username - 아이디
   * @param {string} email - 이메일
   * @param {string} verificationCode - 인증번호
   * @returns {Promise<Object>} 인증 결과 및 reset_token
   */
  async passwordResetVerify(username, email, verificationCode) {
    try {
      const requestBody = {
        username: username,
        email: email,
        verification_code: verificationCode,
      };

      console.log('🌐 비밀번호 재설정 인증 확인 API 요청:', {
        url: `${this.baseURL}/users/auth/password-reset/verify/`,
        method: 'POST',
        body: { username, email: '***', verification_code: '***' },
      });

      const response = await this.request('/users/auth/password-reset/verify/', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        requireAuth: false, // 인증이 필요 없는 API
      });

      console.log('✅ 비밀번호 재설정 인증 확인 API 응답:', {
        success: response.success,
        hasResetToken: !!response.reset_token,
      });

      return {
        success: true,
        message: response.message || '인증이 완료되었습니다.',
        reset_token: response.reset_token,
      };
    } catch (error) {
      console.error('❌ 비밀번호 재설정 인증 확인 실패:', error);
      return {
        success: false,
        error: error.message,
        message: error.message || '인증 확인 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 비밀번호 재설정
   * API 18: POST /api/users/auth/password-reset/
   * @param {string} resetToken - 비밀번호 재설정 토큰
   * @param {string} newPassword - 새 비밀번호
   * @returns {Promise<Object>} 재설정 결과
   */
  async passwordReset(resetToken, newPassword) {
    try {
      const requestBody = {
        reset_token: resetToken,
        new_password: newPassword,
      };

      console.log('🌐 비밀번호 재설정 API 요청:', {
        url: `${this.baseURL}/users/auth/password-reset/`,
        method: 'POST',
        body: { reset_token: '***', new_password: '***' },
      });

      const response = await this.request('/users/auth/password-reset/', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        requireAuth: false, // 인증이 필요 없는 API
      });

      console.log('✅ 비밀번호 재설정 API 응답:', response);

      return {
        success: true,
        message: response.message || '비밀번호가 재설정되었습니다.',
      };
    } catch (error) {
      console.error('❌ 비밀번호 재설정 실패:', error);
      return {
        success: false,
        error: error.message,
        message: error.message || '비밀번호 재설정 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 매칭 동의 업데이트
   * API 14: POST /api/users/consent/
   * @param {boolean} matchingConsent - 매칭 동의 여부 (true/false)
   * @param {number} userId - 사용자 ID (디버그 모드에서 사용, 선택사항)
   * @returns {Promise<Object>} 업데이트 결과
   */
  async updateConsent(matchingConsent, userId = null) {
    try {
      // 디버그 모드이고 user_id가 없으면 테스트 user_id 사용
      const requestBody = {
        matching_consent: matchingConsent,
      };
      
      // 디버그 모드에서 인증 토큰이 없으면 user_id 추가
      const token = await StorageService.getAccessToken();
      const testUserId = userId || (CONFIG && CONFIG.TEST_USER_ID) || 1; // 기본값 1
      if (__DEV__ && !token && testUserId) {
        requestBody.user_id = testUserId;
        console.log('🔧 디버그 모드: user_id 추가', requestBody.user_id);
      }

      console.log('🌐 매칭 동의 업데이트 API 요청:', {
        url: `${this.baseURL}/users/consent/`,
        method: 'POST',
        body: requestBody,
      });

      const response = await this.request('/users/consent/', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      console.log('✅ 매칭 동의 업데이트 API 응답:', response);

      return {
        success: true,
        message: response.message || '매칭 동의가 업데이트되었습니다.',
        data: response.data || response,
      };
    } catch (error) {
      console.error('❌ 매칭 동의 업데이트 실패:', error);
      console.error('   에러 상세:', error.message);
      console.error('   API URL:', `${this.baseURL}/users/consent/`);
      return {
        success: false,
        error: error.message,
        message: error.message || '매칭 동의 업데이트 중 오류가 발생했습니다.',
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
