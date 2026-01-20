/**
 * @format
 */

import {AppRegistry} from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import App from './src/App';
import {name as appName} from './app.json';

// 백그라운드 알림 이벤트 핸들러 등록
// 앱이 백그라운드나 종료된 상태에서 알림을 받았을 때 처리
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  if (type === EventType.PRESS) {
    // 사용자가 알림을 눌렀을 때
    console.log('🔔 백그라운드에서 알림 눌림:', notification?.id);
    
    // 알림 제거
    if (notification?.id) {
      await notifee.cancelNotification(notification.id);
    }
  } else if (type === EventType.ACTION_PRESS) {
    // 사용자가 알림 액션 버튼을 눌렀을 때
    console.log('🔔 백그라운드에서 알림 액션 눌림:', pressAction?.id);
  }
  
  // 다른 이벤트 타입은 무시
});

AppRegistry.registerComponent(appName, () => App);
