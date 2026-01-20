import { Platform } from 'react-native';
// import messaging from '@react-native-firebase/messaging'; // Firebase 미사용
import { apiClient } from '../api/apiClient';
import { notificationService } from './notificationService';

class FcmService {
  constructor() {
    this._isInitialized = false;
    this._unsubscribeTokenRefresh = null;
    this._unsubscribeOnMessage = null;
  }

  async init() {
    if (this._isInitialized) return;

    // Firebase 미사용 - 로컬 알림만 사용
    console.log('ℹ️ Firebase 미사용 - 로컬 알림만 사용합니다.');
    
    // Foreground message handler는 Firebase 없이 사용하지 않음
    // this._unsubscribeOnMessage = messaging().onMessage(...);

    // Token refresh handler는 Firebase 없이 사용하지 않음
    // this._unsubscribeTokenRefresh = messaging().onTokenRefresh(...);

    this._isInitialized = true;
  }

  async requestPermission() {
    try {
      // Firebase 미사용 - notifee만 사용
      // 알림 권한(특히 Android 13+)은 notifee를 통해 요청
      await notificationService.requestPermission();
      await notificationService.createChannel();
    } catch (e) {
      console.warn('⚠️ 알림 권한 요청 중 오류:', e);
    }
  }

  async getTokenSafe() {
    // Firebase 미사용 - 토큰 없음
    console.log('ℹ️ Firebase 미사용 - FCM 토큰 없음');
    return null;
  }

  async registerTokenToServer(fcmToken) {
    if (!fcmToken) return { success: false, error: 'FCM token is empty' };

    // 백엔드 API: POST /api/matching/notifications/register/
    const result = await apiClient.registerNotificationToken(fcmToken, Platform.OS);
    if (result?.success) {
      console.log('✅ FCM 토큰 서버 등록 완료');
    } else {
      console.warn('⚠️ FCM 토큰 서버 등록 실패:', result?.error || result);
    }
    return result;
  }

  /**
   * 로그인 직후 호출 권장
   */
  async initAndRegister() {
    await this.init();
    await this.requestPermission();

    const token = await this.getTokenSafe();
    if (!token) return { success: false, error: 'FCM token unavailable' };

    return await this.registerTokenToServer(token);
  }

  cleanup() {
    try {
      this._unsubscribeTokenRefresh?.();
      this._unsubscribeOnMessage?.();
    } catch (e) {
      // ignore
    } finally {
      this._unsubscribeTokenRefresh = null;
      this._unsubscribeOnMessage = null;
      this._isInitialized = false;
    }
  }
}

export const fcmService = new FcmService();

