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
    this.currentUsername = null; // 현재 로그인한 사용자의 username
    this.userIdCache = {}; // username -> user_id 캐시
    console.log('🌐 API Client 초기화:', { baseURL: this.baseURL, platform: Platform.OS });
  }

  /**
   * 현재 로그인한 사용자의 username 설정
   * @param {string} username - 사용자 username
   */
  setCurrentUsername(username) {
    this.currentUsername = username;
    // username이 변경되면 캐시 초기화
    if (username) {
      this.userIdCache = {};
    }
    console.log('👤 apiClient 현재 사용자 설정:', username);
    console.log('   캐시 초기화됨');
  }

  /**
   * username으로 Django user_id 조회
   * @param {string} username - 사용자 username
   * @returns {Promise<number|null>} Django user_id
   */
  async getUserIdByUsername(username) {
    try {
      // 캐시 확인
      if (this.userIdCache[username]) {
        console.log(`📦 캐시에서 user_id 조회: ${username} -> ${this.userIdCache[username]}`);
        return this.userIdCache[username];
      }

      console.log(`🔍 user_id 조회 중: username="${username}"`);
      const response = await this.request(`/users/user-id/?username=${username}`, {
        method: 'GET',
      });

      console.log(`📥 user_id 조회 응답:`, response);

      if (response.success && response.data && response.data.id) {
        const userId = response.data.id;
        // 캐시에 저장
        this.userIdCache[username] = userId;
        console.log(`✅ user_id 조회 성공: ${username} -> ${userId}`);
        return userId;
      }

      console.error(`❌ user_id 조회 실패: 응답에 user_id가 없습니다.`, response);
      return null;
    } catch (error) {
      console.error(`❌ user_id 조회 실패 (${username}):`, error);
      console.error(`   에러 메시지:`, error.message);
      return null;
    }
  }

  /**
   * 현재 사용자의 user_id 가져오기
   * @returns {Promise<number|null>} Django user_id
   */
  async getCurrentUserId() {
    if (!this.currentUsername) {
      console.error('❌ 현재 사용자 username이 설정되지 않았습니다.');
      console.error('   💡 AuthContext에서 apiClient.setCurrentUsername()을 호출했는지 확인하세요.');
      return null;
    }

    const userId = await this.getUserIdByUsername(this.currentUsername);
    
    if (!userId) {
      console.error(`❌ username "${this.currentUsername}"에 해당하는 user_id를 찾을 수 없습니다.`);
      console.error('   💡 Django에 해당 사용자가 존재하는지 확인하세요.');
    }
    
    return userId;
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

        // 기타 에러 (400 Bad Request 등)
        let errorMessage = `요청 실패 (${response.status})`;
        if (data?.error) {
          // error가 객체인 경우 문자열로 변환
          if (typeof data.error === 'object') {
            errorMessage = JSON.stringify(data.error);
          } else {
            errorMessage = data.error;
          }
        } else if (data?.message) {
          errorMessage = data.message;
        } else if (typeof data === 'string') {
          errorMessage = data;
        } else if (typeof data === 'object') {
          // 객체 전체를 문자열로 변환
          errorMessage = JSON.stringify(data);
        }
        
        // 404 에러 (프로필 없음)는 정상적인 상황이므로 조용히 처리
        // data 객체에서 직접 메시지 확인 (여러 경로 확인)
        const checkMessage = (msg) => {
          if (!msg) return false;
          const msgStr = String(msg);
          return msgStr.includes('프로필이 없습니다') || 
                 msgStr.includes('이상형 프로필이 없습니다');
        };
        
        const isProfileNotFound = response.status === 404 && 
            (checkMessage(data?.message) || 
             checkMessage(data?.error) ||
             checkMessage(errorMessage) ||
             (typeof data === 'object' && checkMessage(JSON.stringify(data))));
        
        if (isProfileNotFound) {
          // 조용히 에러 throw (로그 출력하지 않음)
          throw new Error(errorMessage);
        }
        
        // 기타 에러만 상세 로그 출력
        console.error('❌ API 에러 상세:', {
          status: response.status,
          data: data,
          errorMessage: errorMessage,
        });
        
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
      
      // 404 에러 (프로필 없음)는 정상적인 상황이므로 조용히 처리
      const checkMessage = (msg) => {
        if (!msg) return false;
        const msgStr = String(msg);
        return msgStr.includes('프로필이 없습니다') || 
               msgStr.includes('이상형 프로필이 없습니다');
      };
      
      const isProfileNotFound = checkMessage(error.message) || 
                                (error.error && checkMessage(error.error)) ||
                                (error.status === 404 && checkMessage(error.toString()));
      
      if (!isProfileNotFound) {
        // 프로필 없음 에러가 아닌 경우에만 로그 출력
        console.error('❌ API 요청 오류:', error);
      }
      
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
      const requestBody = {
        latitude,
        longitude,
      };
      
      // 디버그 모드에서 인증 토큰이 없으면 user_id 추가
      const token = await StorageService.getAccessToken();
      
      if (__DEV__ && !token) {
        console.log('🔍 updateLocation - 현재 상태:', {
          currentUsername: this.currentUsername,
          userIdParam: userId,
          hasToken: !!token,
        });
        
        let actualUserId = userId;
        
        // 파라미터로 전달된 userId가 없으면 현재 사용자의 user_id 조회
        if (!actualUserId) {
          if (!this.currentUsername) {
            console.error('❌ 현재 사용자 username이 설정되지 않았습니다.');
            throw new Error('현재 사용자 username이 설정되지 않았습니다. 로그인 후 다시 시도해주세요.');
          }
          
          console.log(`🔍 현재 사용자 "${this.currentUsername}"의 user_id 조회 중...`);
          actualUserId = await this.getCurrentUserId();
          
          if (!actualUserId) {
            console.error(`❌ username "${this.currentUsername}"에 해당하는 user_id를 찾을 수 없습니다.`);
            throw new Error(`username "${this.currentUsername}"에 해당하는 user_id를 찾을 수 없습니다. Django에 해당 사용자가 존재하는지 확인하세요.`);
          }
        }
        
        requestBody.user_id = actualUserId;
        console.log(`✅ 현재 사용자 user_id 사용: ${this.currentUsername} -> ${actualUserId}`);
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
      const token = await StorageService.getAccessToken();
      let actualUserId = null;
      
      if (__DEV__ && !token) {
        console.log('🔍 getProfile - 현재 상태:', {
          currentUsername: this.currentUsername,
          hasToken: !!token,
        });
        
        if (!this.currentUsername) {
          console.error('❌ 현재 사용자 username이 설정되지 않았습니다.');
          throw new Error('현재 사용자 username이 설정되지 않았습니다. 로그인 후 다시 시도해주세요.');
        }
        
        // 현재 사용자의 실제 user_id 조회 (필수)
        console.log(`🔍 현재 사용자 "${this.currentUsername}"의 user_id 조회 중...`);
        actualUserId = await this.getCurrentUserId();
        
        if (!actualUserId) {
          console.error(`❌ username "${this.currentUsername}"에 해당하는 user_id를 찾을 수 없습니다.`);
          throw new Error(`username "${this.currentUsername}"에 해당하는 user_id를 찾을 수 없습니다. Django에 해당 사용자가 존재하는지 확인하세요.`);
        }
      }
      
      let endpoint = '/users/profile/';
      if (__DEV__ && !token && actualUserId) {
        endpoint = `/users/profile/?user_id=${actualUserId}`;
        console.log(`✅ 현재 사용자 user_id 사용: ${this.currentUsername} -> ${actualUserId}`);
      }

      const response = await this.request(endpoint, {
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
      const requestBody = { ...profileData };
      const token = await StorageService.getAccessToken();
      
      if (__DEV__ && !token) {
        console.log('🔍 updateProfile - 현재 상태:', {
          currentUsername: this.currentUsername,
          hasToken: !!token,
        });
        
        if (!this.currentUsername) {
          console.error('❌ 현재 사용자 username이 설정되지 않았습니다.');
          throw new Error('현재 사용자 username이 설정되지 않았습니다. 로그인 후 다시 시도해주세요.');
        }
        
        // 현재 사용자의 실제 user_id 조회 (필수)
        console.log(`🔍 현재 사용자 "${this.currentUsername}"의 user_id 조회 중...`);
        const actualUserId = await this.getCurrentUserId();
        
        if (!actualUserId) {
          console.error(`❌ username "${this.currentUsername}"에 해당하는 user_id를 찾을 수 없습니다.`);
          throw new Error(`username "${this.currentUsername}"에 해당하는 user_id를 찾을 수 없습니다. Django에 해당 사용자가 존재하는지 확인하세요.`);
        }
        
        requestBody.user_id = actualUserId;
        console.log(`✅ 현재 사용자 user_id 사용: ${this.currentUsername} -> ${actualUserId}`);
      }

      // 프로필이 이미 존재하는지 확인 (존재하면 PUT, 없으면 POST)
      let method = 'POST';
      try {
        const profileCheck = await this.getProfile();
        if (profileCheck.success && profileCheck.data) {
          method = 'PUT';
          console.log('📝 기존 프로필 발견 - PUT 메서드 사용 (업데이트)');
        } else {
          console.log('🆕 프로필 없음 - POST 메서드 사용 (생성)');
        }
      } catch (error) {
        // 프로필 조회 실패는 무시 (새로 생성)
        console.log('🆕 프로필 조회 실패 - POST 메서드 사용 (생성)');
      }

      console.log('🌐 프로필 저장 API 요청:', {
        url: `${this.baseURL}/users/profile/`,
        method: method,
        body: requestBody,
      });

      const response = await this.request('/users/profile/', {
        method: method,
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
      // 디버그 모드에서 user_id 추가
      const token = await StorageService.getAccessToken();
      let actualUserId = null;
      
      if (__DEV__ && !token) {
        if (!this.currentUsername) {
          throw new Error('현재 사용자 username이 설정되지 않았습니다. 로그인 후 다시 시도해주세요.');
        }
        
        // 현재 사용자의 실제 user_id 조회 (필수)
        actualUserId = await this.getCurrentUserId();
        
        if (!actualUserId) {
          throw new Error(`username "${this.currentUsername}"에 해당하는 user_id를 찾을 수 없습니다.`);
        }
      }
      
      let endpoint = '/users/profile/completeness/';
      if (__DEV__ && !token && actualUserId) {
        endpoint = `/users/profile/completeness/?user_id=${actualUserId}`;
        console.log(`✅ 현재 사용자 user_id 사용: ${this.currentUsername} -> ${actualUserId}`);
      }

      const response = await this.request(endpoint, {
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
   * @returns {Promise<Object>} 이상형 프로필 정보
   */
  async getIdealType() {
    try {
      const token = await StorageService.getAccessToken();
      let actualUserId = null;
      
      if (__DEV__ && !token) {
        console.log('🔍 getIdealType - 현재 상태:', {
          currentUsername: this.currentUsername,
          hasToken: !!token,
        });
        
        if (!this.currentUsername) {
          console.error('❌ 현재 사용자 username이 설정되지 않았습니다.');
          throw new Error('현재 사용자 username이 설정되지 않았습니다. 로그인 후 다시 시도해주세요.');
        }
        
        // 현재 사용자의 실제 user_id 조회 (필수)
        console.log(`🔍 현재 사용자 "${this.currentUsername}"의 user_id 조회 중...`);
        actualUserId = await this.getCurrentUserId();
        
        if (!actualUserId) {
          console.error(`❌ username "${this.currentUsername}"에 해당하는 user_id를 찾을 수 없습니다.`);
          throw new Error(`username "${this.currentUsername}"에 해당하는 user_id를 찾을 수 없습니다.`);
        }
      }
      
      let endpoint = '/users/ideal-type/';
      if (__DEV__ && !token && actualUserId) {
        endpoint = `/users/ideal-type/?user_id=${actualUserId}`;
        console.log(`✅ 현재 사용자 user_id 사용: ${this.currentUsername} -> ${actualUserId}`);
      }

      console.log('🌐 이상형 프로필 조회 API 요청:', {
        url: `${this.baseURL}${endpoint}`,
        method: 'GET',
      });

      const response = await this.request(endpoint, {
        method: 'GET',
      });

      console.log('✅ 이상형 프로필 조회 API 응답:', response);

      // 응답이 에러인지 확인
      if (response.success === false) {
        return {
          success: false,
          error: response.error || response.message || '이상형 프로필 조회에 실패했습니다.',
        };
      }

      return {
        success: true,
        data: response.data || response,
      };
    } catch (error) {
      // 에러 메시지 추출
      let errorMessage = '이상형 프로필 조회에 실패했습니다.';
      if (error) {
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error.message) {
          errorMessage = error.message;
        } else {
          errorMessage = JSON.stringify(error);
        }
      }
      
      // 404 에러 (프로필 없음)는 정상적인 상황이므로 조용히 처리
      const isProfileNotFound = errorMessage.includes('이상형 프로필이 없습니다') || 
                                errorMessage.includes('프로필이 없습니다') ||
                                (error?.message && error.message.includes('이상형 프로필이 없습니다'));
      
      if (isProfileNotFound) {
        // 조용히 반환 (에러 로그 출력하지 않음)
        return {
          success: false,
          error: errorMessage,
        };
      }
      
      // 기타 에러만 로그 출력
      console.error('❌ 이상형 프로필 조회 실패:', error);
      console.error('   에러 타입:', typeof error);
      console.error('   에러 메시지:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 이상형 프로필 생성/수정
   * @param {Object} idealTypeData - 이상형 프로필 데이터
   * @returns {Promise<Object>} 저장 결과
   */
  async updateIdealType(idealTypeData) {
    try {
      const requestBody = { ...idealTypeData };
      const token = await StorageService.getAccessToken();
      
      if (__DEV__ && !token) {
        console.log('🔍 updateIdealType - 현재 상태:', {
          currentUsername: this.currentUsername,
          hasToken: !!token,
        });
        
        if (!this.currentUsername) {
          console.error('❌ 현재 사용자 username이 설정되지 않았습니다.');
          throw new Error('현재 사용자 username이 설정되지 않았습니다. 로그인 후 다시 시도해주세요.');
        }
        
        // 현재 사용자의 실제 user_id 조회 (필수)
        console.log(`🔍 현재 사용자 "${this.currentUsername}"의 user_id 조회 중...`);
        const actualUserId = await this.getCurrentUserId();
        
        if (!actualUserId) {
          console.error(`❌ username "${this.currentUsername}"에 해당하는 user_id를 찾을 수 없습니다.`);
          throw new Error(`username "${this.currentUsername}"에 해당하는 user_id를 찾을 수 없습니다. Django에 해당 사용자가 존재하는지 확인하세요.`);
        }
        
        requestBody.user_id = actualUserId;
        console.log(`✅ 현재 사용자 user_id 사용: ${this.currentUsername} -> ${actualUserId}`);
      }

      // 이상형 프로필이 이미 존재하는지 확인 (존재하면 PUT, 없으면 POST)
      let method = 'POST';
      try {
        const idealTypeCheck = await this.getIdealType();
        if (idealTypeCheck.success && idealTypeCheck.data) {
          method = 'PUT';
          console.log('📝 기존 이상형 프로필 발견 - PUT 메서드 사용 (업데이트)');
        } else {
          console.log('🆕 이상형 프로필 없음 - POST 메서드 사용 (생성)');
        }
      } catch (error) {
        // 이상형 프로필 조회 실패는 무시 (새로 생성)
        const errorMsg = error?.message || String(error);
        if (!errorMsg.includes('이상형 프로필이 없습니다')) {
          console.log('🆕 이상형 프로필 조회 실패 - POST 메서드 사용 (생성)');
        } else {
          console.log('🆕 이상형 프로필 없음 - POST 메서드 사용 (생성)');
        }
      }

      console.log('🌐 이상형 프로필 저장 API 요청:', {
        url: `${this.baseURL}/users/ideal-type/`,
        method: method,
        body: requestBody,
      });

      const response = await this.request('/users/ideal-type/', {
        method: method,
        body: JSON.stringify(requestBody),
      });

      console.log('✅ 이상형 프로필 저장 API 응답:', response);
      console.log('   응답 타입:', typeof response);
      console.log('   응답 전체:', JSON.stringify(response, null, 2));

      // 응답이 에러인지 확인
      if (response.success === false) {
        return {
          success: false,
          error: response.error || response.message || '알 수 없는 오류가 발생했습니다.',
        };
      }

      return {
        success: true,
        data: response.data || response,
      };
    } catch (error) {
      console.error('❌ 이상형 프로필 저장 실패:', error);
      console.error('   에러 타입:', typeof error);
      console.error('   에러 전체:', error);
      
      // 에러 메시지 추출
      let errorMessage = '이상형 프로필 저장에 실패했습니다.';
      if (error) {
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.error) {
          errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
        } else {
          errorMessage = JSON.stringify(error);
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

// 싱글톤 인스턴스 생성 및 export
export const apiClient = new ApiClient();
