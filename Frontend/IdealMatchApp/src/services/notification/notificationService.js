import { Alert, Platform, Vibration } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';

export class NotificationService {
  /**
   * 알림 권한 요청
   */
  static async requestPermission() {
    try {
      const settings = await notifee.requestPermission();
      console.log('🔔 알림 권한:', settings.authorizationStatus);
      return settings.authorizationStatus >= 1; // 1 = authorized
    } catch (error) {
      console.error('알림 권한 요청 실패:', error);
      return false;
    }
  }

  /**
   * 알림 채널 생성 (Android)
   */
  static async createChannel() {
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: 'match-notifications',
        name: '매칭 알림',
        importance: AndroidImportance.HIGH,
        vibration: true,
        vibrationPattern: [300, 500],
      });
    }
  }

  /**
   * 매칭 성공 알림 표시 (시스템 알림)
   * @param {Object} match - 매칭 정보 (선택사항)
   */
  static async showMatchNotification(match) {
    console.log('🔔 매칭 알림 표시');

    try {
      // 알림 권한 확인
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.warn('⚠️ 알림 권한이 없습니다. Alert로 대체합니다.');
        this.showAlertNotification();
        return;
      }

      // Android 채널 생성
      await this.createChannel();

      // 진동 (Instagram 스타일)
      Vibration.vibrate([0, 100, 50, 100]);

      // 시스템 알림 표시
      await notifee.displayNotification({
        title: '💝 매칭 성공!',
        body: '주변에서 이상형을 발견했습니다! 두근두근 💓',
        ios: {
          sound: 'default',
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
          critical: true,
          criticalVolume: 1.0,
        },
        android: {
          channelId: 'match-notifications',
          sound: 'default',
          vibrationPattern: [300, 500],
          pressAction: {
            id: 'default',
          },
          smallIcon: 'ic_launcher',
          importance: AndroidImportance.HIGH,
        },
      });

      console.log('✅ 시스템 알림 표시 완료');
    } catch (error) {
      console.error('❌ 알림 표시 실패:', error);
      // 실패 시 Alert로 대체
      this.showAlertNotification();
    }
  }

  /**
   * Alert 기반 알림 (백업용)
   */
  static showAlertNotification() {
    Alert.alert(
      '💝 매칭 성공!',
      '주변에서 이상형을 발견했습니다!\n두근두근 💓',
      [
        {
          text: '확인',
          style: 'default',
        },
      ],
      { cancelable: true }
    );
  }

  /**
   * 일반 알림 표시
   * @param {string} title - 알림 제목
   * @param {string} message - 알림 내용
   */
  static showNotification(title, message) {
    console.log(`🔔 알림: ${title} - ${message}`);
    
    Alert.alert(
      title,
      message,
      [{ text: '확인' }],
      { cancelable: true }
    );
  }

  /**
   * 성공 알림
   * @param {string} message - 알림 내용
   */
  static showSuccess(message) {
    this.showNotification('✅ 성공', message);
  }

  /**
   * 오류 알림
   * @param {string} message - 알림 내용
   */
  static showError(message) {
    this.showNotification('❌ 오류', message);
  }

  /**
   * 정보 알림
   * @param {string} message - 알림 내용
   */
  static showInfo(message) {
    this.showNotification('ℹ️ 알림', message);
  }
}

export const notificationService = NotificationService;
