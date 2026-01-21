/**
 * JWT/Token 관련 유틸 (ApiClient에서 분리)
 * - 동작 변경 없이 apiClient.js의 상단 유틸들을 모듈로 이동
 */
 
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
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
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
export function decodeJWT(token) {
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
export function getTokenExpirationTime(token) {
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
export function isTokenExpiringSoon(token) {
  const timeUntilExpiration = getTokenExpirationTime(token);
  if (timeUntilExpiration === null) return true; // 만료 시간을 알 수 없으면 true 반환
  return timeUntilExpiration < 60 * 1000; // 1분 = 60,000ms
}

