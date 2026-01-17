export const CONFIG = {
  MATCH_RADIUS: 50, // 50m
  MATCH_THRESHOLD: 3, // 4개 중 3개 이상 일치
  LOCATION_UPDATE_INTERVAL: 30000, // 30초
  MATCH_CHECK_INTERVAL: 10000, // 10초
  // API 설정
  API_BASE_URL: __DEV__ 
    ? 'http://localhost:8000/api'  // 개발 환경
    : 'https://your-production-api.com/api',  // 프로덕션
};

export const MOCK_AUTH_CODE = '123456';
export const MATCHING_RADIUS_KM = 0.05; // 50 meters
export const MATCHING_INTERVAL_MS = 10000; // 10초마다 매칭 검색
