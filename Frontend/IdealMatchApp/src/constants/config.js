import { Platform } from 'react-native';

export const CONFIG = {
  MATCH_RADIUS: 50, // 50m
  MATCH_THRESHOLD: 3, // 4개 중 3개 이상 일치
  LOCATION_UPDATE_INTERVAL: 30000, // 30초
  MATCH_CHECK_INTERVAL: 10000, // 10초
  // API 설정
  // iOS 시뮬레이터: 127.0.0.1 사용 (localhost는 작동하지 않음)
  // Android 에뮬레이터: 10.0.2.2 사용
  // 실제 기기: Mac의 로컬 IP 주소 사용 (예: 192.168.x.x)
  API_BASE_URL: __DEV__ 
    ? (Platform.OS === 'ios' 
        ? 'http://127.0.0.1:8000/api'  // iOS 시뮬레이터
        : 'http://10.0.2.2:8000/api')  // Android 에뮬레이터
    : 'https://your-production-api.com/api',  // 프로덕션
  // 테스트용 user_id (디버그 모드에서 사용)
  TEST_USER_ID: 1, // testuser의 ID
};

export const MOCK_AUTH_CODE = '123456';
export const MATCHING_RADIUS_KM = 0.05; // 50 meters
export const MATCHING_INTERVAL_MS = 10000; // 10초마다 매칭 검색
