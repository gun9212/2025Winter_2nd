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
    console.log('🔔 매칭 알림 표시 (백그라운드/포그라운드 모두 지원)');
    console.log('📊 매칭 정보:', match);

    try {
      // 알림 권한 확인
      console.log('🔍 알림 권한 확인 중...');
      const hasPermission = await this.requestPermission();
      console.log('🔍 알림 권한 결과:', hasPermission);
      if (!hasPermission) {
        console.warn('⚠️ 알림 권한이 없습니다. Alert로 대체합니다.');
        this.showAlertNotification();
        return;
      }

      // Android 채널 생성
      await this.createChannel();

      // 진동 (Instagram 스타일) - 포그라운드에서만 작동
      try {
        Vibration.vibrate([0, 100, 50, 100]);
      } catch (vibError) {
        console.log('⚠️ 진동 실패 (백그라운드에서는 제한될 수 있음):', vibError);
      }

      // 시스템 알림 표시 (백그라운드/포그라운드 모두 지원)
      await notifee.displayNotification({
        title: '💝 매칭 성공!',
        body: '주변에서 이상형을 발견했습니다! 두근두근 💓',
        ios: {
          sound: 'default',
          // 포그라운드에서 알림 표시 설정
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
          // 백그라운드에서도 알림이 표시되도록 설정
          // notifee는 기본적으로 백그라운드에서도 알림을 표시합니다
        },
        android: {
          channelId: 'match-notifications',
          sound: 'default',
          vibrationPattern: [300, 500],
          pressAction: {
            id: 'default',
          },
          smallIcon: 'ic_notification',
          importance: AndroidImportance.HIGH,
        },
      });

      console.log('✅ 시스템 알림 표시 완료 (백그라운드/포그라운드 모두 지원)');
    } catch (error) {
      console.error('❌ 알림 표시 실패:', error);
      // 실패 시 Alert로 대체 (백그라운드에서는 작동하지 않을 수 있음)
      try {
        this.showAlertNotification();
      } catch (alertError) {
        console.error('❌ Alert 표시도 실패 (백그라운드에서는 정상):', alertError);
      }
    }
  }

  /**
   * 푸시 메시지용: Alert 없이 시스템 알림만 표시
   * (백그라운드/헤드리스에서도 안전하게 사용)
   */
  static async showPushNotification(title, body) {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.warn('⚠️ 알림 권한이 없습니다. (푸시 알림 표시 불가)');
        return;
      }

      await this.createChannel();

      await notifee.displayNotification({
        title: title || '알림',
        body: body || '새 알림이 도착했습니다.',
        android: {
          channelId: 'match-notifications',
          smallIcon: 'ic_notification',
          importance: AndroidImportance.HIGH,
          pressAction: { id: 'default' },
        },
        ios: {
          sound: 'default',
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
          backgroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
      });
    } catch (e) {
      console.error('❌ 푸시 알림 표시 실패:', e);
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

  /**
   * 매칭 가능 인원 수 증가 알림
   * @param {number} previousCount - 이전 인원 수
   * @param {number} newCount - 현재 인원 수
   */
  static async showCountIncreaseNotification(previousCount, newCount) {
    console.log(`🔔 매칭 가능 인원 증가 알림: ${previousCount}명 → ${newCount}명`);

    try {
      // 알림 권한 확인
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.warn('⚠️ 알림 권한이 없습니다. Alert로 대체합니다.');
        Alert.alert(
          '📈 매칭 가능 인원 증가!',
          `주변에 매칭 가능한 인원이 ${previousCount}명에서 ${newCount}명으로 증가했습니다!`,
          [{ text: '확인' }]
        );
        return;
      }

      // Android 채널 생성
      await this.createChannel();

      // 진동
      Vibration.vibrate([0, 100, 50, 100]);

      // 시스템 알림 표시
      await notifee.displayNotification({
        title: '📈 매칭 가능 인원 증가!',
        body: `주변에 매칭 가능한 인원이 ${previousCount}명에서 ${newCount}명으로 증가했습니다!`,
        ios: {
          sound: 'default',
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
          backgroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
        android: {
          channelId: 'match-notifications',
          sound: 'default',
          vibrationPattern: [300, 500],
          pressAction: {
            id: 'default',
          },
          smallIcon: 'ic_notification',
          importance: AndroidImportance.HIGH,
        },
      });

      console.log('✅ 매칭 count 증가 알림 표시 완료');
    } catch (error) {
      console.error('❌ 알림 표시 실패:', error);
      // 실패 시 Alert로 대체
      Alert.alert(
        '📈 매칭 가능 인원 증가!',
        `주변에 매칭 가능한 인원이 ${previousCount}명에서 ${newCount}명으로 증가했습니다!`,
        [{ text: '확인' }]
      );
    }
  }
}

export const notificationService = NotificationService;
