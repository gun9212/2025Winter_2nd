import { Platform } from 'react-native';

// ✅ EC2 백엔드 (Nginx 80 프록시)
// - 개발(실기기)에서도 EC2를 쓰고 싶으면 USE_EC2_API_IN_DEV=true
// - 기본 API 경로는 /api 입니다.
const EC2_API_BASE_URL = 'http://ec2-3-34-124-186.ap-northeast-2.compute.amazonaws.com/api';
const USE_EC2_API_IN_DEV = false;

const USE_SIMULATOR = false; // 실제 기기 테스트 시 false로 설정

// Mac의 로컬 IP 주소 (실제 기기 테스트 시 사용)
// 로컬 IP 확인: ifconfig | grep "inet " | grep -v 127.0.0.1
const LOCAL_IP = '10.249.110.39'; //'10.249.110.39';

export const CONFIG = {
  MATCH_RADIUS: 50, // 50m
  MATCH_THRESHOLD: 3, // 4개 중 3개 이상 일치
  LOCATION_UPDATE_INTERVAL: 30000, // 30초
  MATCH_CHECK_INTERVAL: 10000, // 10초
  // API 설정
  // iOS 시뮬레이터: 127.0.0.1 사용 (localhost는 작동하지 않음)
  // Android 에뮬레이터: 10.0.2.2 사용
  // 실제 기기: Mac의 로컬 IP 주소 사용 (예: 192.168.x.x)
  // 팀원 테스트: 같은 WiFi 네트워크에서 Mac의 로컬 IP 사용
  API_BASE_URL: __DEV__
    ? (USE_EC2_API_IN_DEV
        ? EC2_API_BASE_URL
        : (Platform.OS === 'ios'
            ? (USE_SIMULATOR
                ? 'http://127.0.0.1:8000/api' // iOS 시뮬레이터
                : `http://${LOCAL_IP}:8000/api`) // 실제 iOS 기기(로컬 서버)
            : 'http://10.0.2.2:8000/api')) // Android 에뮬레이터(로컬 서버)
    : EC2_API_BASE_URL, // 프로덕션(현재 EC2)
  // 테스트용 user_id (디버그 모드에서 사용)
  // 멀티 계정 테스트를 위해 필요 시 직접 숫자 ID를 넣어 특정 계정으로 강제 테스트하세요.
  // null로 설정하면 토큰이 없을 때 user_id를 사용하지 않음 (로그인 강제)
  TEST_USER_ID: null, // null로 설정하여 로그인 없이 API 사용 방지
};

export const MOCK_AUTH_CODE = '123456';
export const MATCHING_RADIUS_KM = 0.05; // 50 meters
export const MATCHING_INTERVAL_MS = 10000; // 10초마다 매칭 검색

// 테스트 위치 설정 (개발 모드에서 사용)
// USE_MOCK_LOCATION을 true로 설정하면 실제 GPS 대신 테스트 위치 사용
export const USE_MOCK_LOCATION = __DEV__ && false; // 실제 GPS 사용 (false), 테스트 위치 사용 (true)

// 테스트 위치 목록
export const TEST_LOCATIONS = {
  // 서울 주요 장소
  GANGNAM: {
    latitude: 37.4979,
    longitude: 127.0276,
    name: '강남역',
  },
  // 부산
  BUSAN_STATION: {
    latitude: 35.1156,
    longitude: 129.0422,
    name: '부산역',
  },
  // 제주
  JEJU_CITY: {
    latitude: 33.4996,
    longitude: 126.5312,
    name: '제주시',
  },
  // 새로운 커스텀 위치 추가
  MY_CUSTOM_LOCATION: {
    latitude: 36.3739197,  // 카이스트 아름관 위도
    longitude: 127.3566916, // 카이스트 아름관 경도
    name: '카이스트 아름관 (N19)',
  },
  // 새로운 커스텀 위치 추가
  LOVE_CUSTOM_LOCATION: {
    latitude: 36.374626,  // 카이스트 사랑관 (N14) 위도
    longitude: 127.359518, // 카이스트 사랑관 (N14) 경도
    name: '카이스트 사랑관 (N14)',
  },
};

// 기본 테스트 위치 (USE_MOCK_LOCATION이 true일 때 사용)
export const DEFAULT_TEST_LOCATION = TEST_LOCATIONS.GANGNAM;

// 매칭 테스트용 위치 설정
// 두 사용자의 위치를 설정하여 매칭 시스템 테스트
export const MATCHING_TEST_CONFIG = {
  // 테스트 모드 활성화 (true로 설정하면 매칭 테스트 모드)
  enabled: __DEV__ && false,
  
  // 내 위치 (사용자 1)
  myLocation: {
    latitude: 37.5665,   // 서울시청
    longitude: 126.9780,
    userId: 1,           // 테스트할 사용자 ID
  },
  
  // 상대방 위치 (사용자 2)
  otherLocation: {
    latitude: 37.5670,   // 서울시청에서 약 50m 떨어진 위치
    longitude: 126.9785,
    userId: 2,           // 테스트할 상대방 사용자 ID
  },
  
  // 매칭 반경 (m 단위)
  radius: 50,            // 50m 반경 내에서 매칭
};
