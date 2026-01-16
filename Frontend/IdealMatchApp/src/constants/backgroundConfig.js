/**
 * 백그라운드 위치 추적 설정
 */

export const BACKGROUND_INTERVALS = {
  // 실시간 모드 (10초)
  REALTIME: 10000,
  // 배터리: 🔴 40-50% / 8시간
  // 정확도: ⭐⭐⭐⭐⭐
  
  // 빠른 모드 (30초)
  FAST: 30000,
  // 배터리: 🔴 35-45% / 8시간
  // 정확도: ⭐⭐⭐⭐
  
  // 균형 모드 (1분) - 권장
  BALANCED: 60000,
  // 배터리: 🟡 25-35% / 8시간
  // 정확도: ⭐⭐⭐⭐
  
  // 절약 모드 (3분)
  ECONOMY: 180000,
  // 배터리: 🟡 15-20% / 8시간
  // 정확도: ⭐⭐⭐
  
  // 최소 모드 (5분) - 기본값
  MINIMAL: 300000,
  // 배터리: 🟢 10-15% / 8시간
  // 정확도: ⭐⭐⭐
  
  // 극절약 모드 (10분)
  ULTRA_SAVE: 600000,
  // 배터리: 🟢 5-10% / 8시간
  // 정확도: ⭐⭐
};

// 기본 백그라운드 간격
export const DEFAULT_BACKGROUND_INTERVAL = BACKGROUND_INTERVALS.FAST; // 30초

// 포어그라운드 간격
export const FOREGROUND_INTERVAL = 30000; // 30초

// 배터리 절약 임계값
export const BATTERY_THRESHOLDS = {
  LOW: 0.20,      // 20% 이하: 극절약 모드
  MEDIUM: 0.50,   // 50% 이하: 절약 모드
  HIGH: 0.80,     // 80% 이상: 균형 모드
};

/**
 * 배터리 레벨에 따른 최적 간격 반환
 */
export const getOptimalInterval = (batteryLevel) => {
  if (batteryLevel < BATTERY_THRESHOLDS.LOW) {
    return BACKGROUND_INTERVALS.ULTRA_SAVE; // 10분
  } else if (batteryLevel < BATTERY_THRESHOLDS.MEDIUM) {
    return BACKGROUND_INTERVALS.MINIMAL; // 5분
  } else if (batteryLevel < BATTERY_THRESHOLDS.HIGH) {
    return BACKGROUND_INTERVALS.ECONOMY; // 3분
  } else {
    return BACKGROUND_INTERVALS.BALANCED; // 1분
  }
};

/**
 * 사용자 설정에 따른 간격 반환
 */
export const getIntervalByUserPreference = (preference) => {
  switch (preference) {
    case 'realtime':
      return BACKGROUND_INTERVALS.REALTIME;
    case 'fast':
      return BACKGROUND_INTERVALS.FAST;
    case 'balanced':
      return BACKGROUND_INTERVALS.BALANCED;
    case 'economy':
      return BACKGROUND_INTERVALS.ECONOMY;
    case 'minimal':
      return BACKGROUND_INTERVALS.MINIMAL;
    case 'ultra_save':
      return BACKGROUND_INTERVALS.ULTRA_SAVE;
    default:
      return DEFAULT_BACKGROUND_INTERVAL;
  }
};
