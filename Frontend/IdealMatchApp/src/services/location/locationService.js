import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { USE_MOCK_LOCATION, DEFAULT_TEST_LOCATION } from '../../constants/config';

export class LocationService {
  constructor() {
    this.watchId = null;
    this.mockLocationIndex = 0; // 테스트 위치 시뮬레이션용 인덱스
  }

  /**
   * 위치 권한 요청
   * iOS: getCurrentPosition 호출 시 자동으로 권한 요청 (Info.plist 설정 필요)
   * Android: 런타임 권한 요청
   */
  async requestPermission() {
    try {
      if (Platform.OS === 'ios') {
        // iOS는 getCurrentPosition 호출 시 자동으로 권한 요청됨
        // 권한 상태를 확인하기 위해 한 번 시도해봄
        try {
          await this.getCurrentLocation();
          return true;
        } catch (error) {
          // 권한 거부 또는 위치 가져오기 실패
          if (error.code === 1) {
            // PERMISSION_DENIED
            console.error('❌ iOS 위치 권한 거부됨');
            Alert.alert(
              '위치 권한 필요',
              '근처의 이상형을 찾기 위해 위치 권한이 필요합니다. 설정에서 위치 권한을 허용해주세요.',
              [
                { text: '취소', style: 'cancel' },
                { text: '설정 열기', onPress: () => {
                  // iOS 설정 앱으로 이동 (수동으로 열어야 함)
                  console.log('설정 앱에서 위치 권한을 허용해주세요.');
                }},
              ]
            );
            return false;
          }
          // 다른 오류 (네트워크, 타임아웃 등)
          console.error('❌ iOS 위치 가져오기 실패:', error);
          return false;
        }
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
    // 개발 모드에서 테스트 위치 사용
    if (USE_MOCK_LOCATION) {
      const mockLocation = {
        latitude: DEFAULT_TEST_LOCATION.latitude,
        longitude: DEFAULT_TEST_LOCATION.longitude,
        accuracy: 10, // 10m 정확도
        timestamp: Date.now(),
      };
      console.log('🧪 테스트 위치 사용:', DEFAULT_TEST_LOCATION.name, mockLocation);
      return Promise.resolve(mockLocation);
    }

    // 실제 GPS 사용
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

    // 개발 모드에서 테스트 위치 시뮬레이션
    if (USE_MOCK_LOCATION) {
      console.log('🧪 테스트 위치 감지 모드 시작');
      // 5초마다 약간씩 위치 변경 시뮬레이션
      this.watchId = setInterval(() => {
        // 위치를 약간씩 변경 (0.0001도 ≈ 11m)
        const offset = this.mockLocationIndex * 0.0001;
        const mockLocation = {
          latitude: DEFAULT_TEST_LOCATION.latitude + offset,
          longitude: DEFAULT_TEST_LOCATION.longitude + offset,
          accuracy: 10,
          timestamp: Date.now(),
        };
        this.mockLocationIndex++;
        console.log('🧪 테스트 위치 업데이트:', mockLocation);
        callback(mockLocation);
      }, 5000); // 5초마다 업데이트
      
      console.log('🎯 테스트 위치 감지 시작 (watchId:', this.watchId, ')');
      return this.watchId;
    }

    // 실제 GPS 사용
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
      // 테스트 모드인 경우 setInterval을 clearInterval로 중단
      if (USE_MOCK_LOCATION) {
        clearInterval(watchId);
        console.log('🛑 테스트 위치 감지 중단 (watchId:', watchId, ')');
      } else {
        Geolocation.clearWatch(watchId);
        console.log('🛑 위치 감지 중단 (watchId:', watchId, ')');
      }
      
      if (watchId === this.watchId) {
        this.watchId = null;
        this.mockLocationIndex = 0; // 인덱스 리셋
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
   * 위치 권한 상태 확인
   * iOS: getCurrentPosition으로 권한 상태 간접 확인
   * Android: PermissionsAndroid.check 사용
   */
  async checkPermission() {
    if (Platform.OS === 'ios') {
      // iOS는 권한 상태를 직접 확인할 수 없으므로
      // getCurrentPosition을 호출하여 간접적으로 확인
      return new Promise((resolve) => {
        Geolocation.getCurrentPosition(
          () => {
            // 위치를 가져올 수 있으면 권한이 있음
            resolve(true);
          },
          (error) => {
            if (error.code === 1) {
              // PERMISSION_DENIED
              resolve(false);
            } else {
              // 다른 오류 (네트워크 등)는 권한이 있다고 간주
              // (권한이 없으면 PERMISSION_DENIED가 발생함)
              resolve(true);
            }
          },
          {
            timeout: 5000,
            maximumAge: 0,
          }
        );
      });
    }

    // Android 권한 확인
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
