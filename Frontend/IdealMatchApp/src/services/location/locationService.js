import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

export class LocationService {
  constructor() {
    this.watchId = null;
  }

  /**
   * 위치 권한 요청
   * iOS: Info.plist에서 자동 처리
   * Android: 런타임 권한 요청
   */
  async requestPermission() {
    try {
      if (Platform.OS === 'ios') {
        // iOS는 Info.plist에 이미 설정되어 있음
        return true;
      }

      // Android 권한 요청
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: '위치 권한 요청',
          message: '근처의 이상형을 찾기 위해 위치 권한이 필요합니다.',
          buttonNeutral: '나중에',
          buttonNegative: '거부',
          buttonPositive: '허용',
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('위치 권한 요청 오류:', error);
      return false;
    }
  }

  /**
   * 현재 위치 가져오기 (한 번만)
   * @returns {Promise<{latitude: number, longitude: number}>}
   */
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          console.log('✅ 현재 위치:', location);
          resolve(location);
        },
        (error) => {
          console.error('❌ 위치 가져오기 실패:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true, // 고정밀 위치
          timeout: 15000, // 15초 타임아웃
          maximumAge: 10000, // 10초 이내 캐시된 위치 허용
        }
      );
    });
  }

  /**
   * 위치 변경 감지 시작 (실시간)
   * @param {Function} callback - 위치 변경 시 호출될 콜백
   * @returns {number} watchId - 나중에 중단할 때 사용
   */
  watchLocation(callback) {
    if (this.watchId !== null) {
      console.warn('⚠️ 이미 위치 감지가 시작되어 있습니다.');
      return this.watchId;
    }

    this.watchId = Geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        console.log('📍 위치 업데이트:', location);
        callback(location);
      },
      (error) => {
        console.error('❌ 위치 감지 오류:', error);
        Alert.alert('위치 오류', '위치 정보를 가져올 수 없습니다.');
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // 10m 이상 이동 시에만 업데이트
        interval: 10000, // 10초마다 체크 (Android)
        fastestInterval: 5000, // 최소 5초 간격 (Android)
      }
    );

    console.log('🎯 위치 감지 시작 (watchId:', this.watchId, ')');
    return this.watchId;
  }

  /**
   * 위치 감지 중단
   * @param {number} watchId - watchLocation에서 반환된 ID
   */
  stopWatching(watchId) {
    if (watchId !== null && watchId !== undefined) {
      Geolocation.clearWatch(watchId);
      console.log('🛑 위치 감지 중단 (watchId:', watchId, ')');
      
      if (watchId === this.watchId) {
        this.watchId = null;
      }
    }
  }

  /**
   * 모든 위치 감지 중단
   */
  stopAllWatching() {
    if (this.watchId !== null) {
      this.stopWatching(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * 위치 권한 상태 확인 (Android)
   */
  async checkPermission() {
    if (Platform.OS === 'ios') {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted;
    } catch (error) {
      console.error('권한 확인 오류:', error);
      return false;
    }
  }
}

// 싱글톤 인스턴스 생성
export const locationService = new LocationService();
