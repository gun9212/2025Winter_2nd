import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Platform } from 'react-native';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export class HapticService {
  /**
   * 가벼운 진동 (버튼 탭 등)
   */
  static light() {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
  }

  /**
   * 중간 진동
   */
  static medium() {
    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
  }

  /**
   * 강한 진동
   */
  static heavy() {
    ReactNativeHapticFeedback.trigger('impactHeavy', hapticOptions);
  }

  /**
   * 성공 진동 (매칭 성공 등)
   */
  static success() {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
    } else {
      // Android에서는 패턴 진동 사용
      this.pattern([0, 100, 50, 100]);
    }
  }

  /**
   * 경고 진동
   */
  static warning() {
    ReactNativeHapticFeedback.trigger('notificationWarning', hapticOptions);
  }

  /**
   * 오류 진동
   */
  static error() {
    ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
  }

  /**
   * 선택 변경 진동 (스크롤, 슬라이더 등)
   */
  static selection() {
    ReactNativeHapticFeedback.trigger('selection', hapticOptions);
  }

  /**
   * 커스텀 패턴 진동 (Android만 지원)
   * @param {number[]} pattern - [대기, 진동, 대기, 진동, ...] (밀리초)
   */
  static pattern(pattern) {
    if (Platform.OS === 'android') {
      // Android의 경우 Vibration API 사용
      const { Vibration } = require('react-native');
      Vibration.vibrate(pattern);
    } else {
      // iOS는 패턴을 지원하지 않으므로 기본 진동
      this.medium();
    }
  }

  /**
   * 심장 박동 패턴 진동 (매칭 성공 시)
   */
  static heartbeat() {
    console.log('💗 심장 박동 진동 시작');
    
    if (Platform.OS === 'ios') {
      // iOS: 연속된 진동으로 심장 박동 시뮬레이션
      this.heavy();
      setTimeout(() => this.heavy(), 150);
      setTimeout(() => this.heavy(), 300);
      setTimeout(() => this.heavy(), 450);
    } else {
      // Android: 패턴 진동으로 심장 박동 시뮬레이션
      // [대기, 진동1, 대기, 진동2, 대기, 진동3, 대기, 진동4]
      this.pattern([0, 100, 50, 100, 50, 100, 50, 100]);
    }
  }
}

export const hapticService = HapticService;
