import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid, Alert, AppState, NativeModules, NativeEventEmitter } from 'react-native';
import { USE_MOCK_LOCATION, DEFAULT_TEST_LOCATION } from '../../constants/config';

const IOS_NATIVE_WATCH_ID = 'ios-native-location-watch';

export class LocationService {
  constructor() {
    this.watchId = null;
    this.mockLocationIndex = 0; // 테스트 위치 시뮬레이션용 인덱스
    this.iosSubscription = null;
    this.iosEmitter = null;
    
    // iOS 네이티브 위치 엔진(4-A) 초기 설정
    if (Platform.OS === 'ios') {
      this.configureIOSNativeLocation();
    }
  }
  
  /**
   * iOS 네이티브 위치 엔진 설정 (4-A)
   * - 실제 위치 수신은 JS Geolocation이 아니라 iOS 네이티브 모듈이 담당
   * - JS는 이벤트(locationUpdated)를 구독
   */
  configureIOSNativeLocation() {
    try {
      const { LocationConfigModule } = NativeModules;
      
      if (LocationConfigModule) {
        // 이벤트 emitter 준비
        this.iosEmitter = new NativeEventEmitter(LocationConfigModule);

        // 네이티브 기본 설정 적용
        if (LocationConfigModule.configure) {
          LocationConfigModule.configure({
            showsBackgroundLocationIndicator: true,
            desiredAccuracy: 'best',
            distanceFilter: 0,
          });
        }

        // 권한 요청(Always) 트리거 (상태에 따라 프롬프트가 뜰 수 있음)
        if (LocationConfigModule.requestAlwaysAuthorization) {
          LocationConfigModule.requestAlwaysAuthorization();
        }

        console.log('✅ iOS 네이티브 위치 엔진 설정 완료 (LocationConfigModule)');
      } else {
        console.warn('⚠️ LocationConfigModule이 없습니다.');
        console.warn('   iOS 백그라운드 안정화를 위해 네이티브 모듈이 필요합니다.');
      }
    } catch (error) {
      console.error('❌ iOS 네이티브 위치 엔진 설정 실패:', error);
    }
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
   * @param {boolean} forceFresh - 강제로 새 위치 가져오기 (캐시 무시, 기본값: false)
   * @returns {Promise<{latitude: number, longitude: number}>}
   */
  async getCurrentLocation(forceFresh = false) {
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

    // iOS: 네이티브 위치 엔진(4-A) 사용 (가능한 경우)
    if (Platform.OS === 'ios') {
      try {
        const { LocationConfigModule } = NativeModules;
        if (LocationConfigModule?.getCurrentLocation) {
          const location = await LocationConfigModule.getCurrentLocation();
          console.log(`✅ 현재 위치(iOS native)${forceFresh ? ' (새 위치)' : ''}:`, location);
          return location;
        }
      } catch (error) {
        console.warn('⚠️ iOS native getCurrentLocation 실패, JS Geolocation으로 fallback:', error);
      }
    }

    // Android(또는 iOS fallback): 실제 GPS 사용 (JS Geolocation)
    return new Promise((resolve, reject) => {
      // 백그라운드에서 안정적으로 GPS를 받아오기 위해 타임아웃을 더 길게 설정
      const appState = AppState.currentState;
      const timeout = appState === 'active' ? 15000 : 25000; // 포그라운드: 15초, 백그라운드: 25초
      
      const options = {
        enableHighAccuracy: true, // 고정밀 위치
        timeout: timeout,
        maximumAge: forceFresh ? 0 : (appState === 'active' ? 10000 : 30000), // 포그라운드: 10초, 백그라운드: 30초
      };
      
      if (forceFresh) {
        console.log('🔄 강제로 새 위치 가져오기 (캐시 무시)');
      }
      
      Geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          console.log(`✅ 현재 위치${forceFresh ? ' (새 위치)' : ''}:`, location);
          resolve(location);
        },
        (error) => {
          console.error('❌ 위치 가져오기 실패:', error);
          reject(error);
        },
        options
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

    // iOS: 네이티브 이벤트 기반 위치 엔진(4-A)
    if (Platform.OS === 'ios') {
      const { LocationConfigModule } = NativeModules;

      if (!LocationConfigModule || !this.iosEmitter || !LocationConfigModule.start) {
        console.warn('⚠️ iOS native location 모듈이 준비되지 않았습니다. JS Geolocation으로 fallback합니다.');
      } else {
        // 표준 업데이트를 기본으로 사용 (네이티브 쪽에서 significant-change를 보조 채널로 함께 사용)
        const mode = 'standard';

        // 이벤트 구독
        this.iosSubscription = this.iosEmitter.addListener('locationUpdated', (location) => {
          const appState = AppState.currentState;
          console.log(`📍 위치 업데이트 (iOS native) [${appState}]:`, {
            latitude: Number(location.latitude).toFixed(6),
            longitude: Number(location.longitude).toFixed(6),
            accuracy: location.accuracy != null ? Number(location.accuracy).toFixed(1) : undefined,
            timestamp: location.timestamp ? new Date(location.timestamp).toISOString() : undefined,
          });
          callback(location);
        });

        // 시작
        LocationConfigModule.start({ mode });
        this.watchId = IOS_NATIVE_WATCH_ID;

        console.log(`🎯 iOS native 위치 감지 시작 (mode: ${mode}, watchId: ${this.watchId})`);
        return this.watchId;
      }
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
    // iOS 백그라운드 위치 업데이트를 위해 설정 최적화
    // 위치 변경 감지를 최대한 민감하게 설정
    const currentAppState = AppState.currentState;
    const isBackground = currentAppState !== 'active';
    
    const watchOptions = {
      enableHighAccuracy: true, // 고정밀 위치 사용 (GPS)
      distanceFilter: 0, // 거리 필터 제거: 위치가 조금이라도 변경되면 업데이트 (가장 민감한 설정)
      // iOS 백그라운드에서 주기적으로 위치를 받아오기 위해 interval을 더 짧게 설정
      interval: isBackground ? 5000 : 5000, // 백그라운드: 5초마다 체크 (iOS가 제한할 수 있음), 포그라운드: 5초
      fastestInterval: isBackground ? 5000 : 5000, // 백그라운드: 최소 5초 간격, 포그라운드: 최소 5초 간격
      // iOS 백그라운드 위치 업데이트를 위해 추가 옵션
      ...(Platform.OS === 'ios' && {
        // iOS 백그라운드에서도 위치 업데이트가 되도록 설정
        // maximumAge를 0으로 설정하여 캐시된 위치를 사용하지 않음
        maximumAge: 0, // 캐시 무시: 항상 새 위치 가져오기
      }),
    };
    
    // iOS 백그라운드 위치 업데이트를 위한 추가 설정
    if (Platform.OS === 'ios') {
      // iOS에서는 백그라운드 위치 업데이트를 위해 추가 옵션 필요 없음
      // Info.plist에 UIBackgroundModes에 'location'이 설정되어 있으면 자동으로 작동
      console.log(`📱 iOS watchLocation 시작 (백그라운드 위치 업데이트 활성화) [${currentAppState}]`);
      console.log(`   - enableHighAccuracy: true (고정밀 GPS 사용)`);
      console.log(`   - distanceFilter: 0 (모든 위치 변경 감지, 가장 민감한 설정)`);
      console.log(`   - interval: ${watchOptions.interval}ms (${isBackground ? '백그라운드' : '포그라운드'})`);
      console.log(`   - fastestInterval: ${watchOptions.fastestInterval}ms`);
      console.log(`   - maximumAge: 0 (캐시 무시, 항상 새 위치)`);
      console.log(`   ✅ 위치 변경 감지 최대 민감도 설정 완료`);
      console.log(`   ⚠️ 참고: iOS 백그라운드에서는 위치가 변경되지 않으면 콜백이 호출되지 않을 수 있습니다.`);
      console.log(`   💡 해결책: 실제로 위치를 이동하면 watchLocation 콜백이 호출됩니다.`);
    }
    
    this.watchId = Geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp || Date.now(), // timestamp가 없으면 현재 시간 사용
        };
        const appState = AppState.currentState;
        const now = Date.now();
        const locationAge = location.timestamp ? now - location.timestamp : 0;
        
        console.log(`📍 위치 업데이트 (watchLocation) [${appState}]:`, {
          latitude: location.latitude.toFixed(6),
          longitude: location.longitude.toFixed(6),
          accuracy: location.accuracy?.toFixed(1),
          timestamp: new Date(location.timestamp).toISOString(),
          locationAge: `${(locationAge / 1000).toFixed(1)}초 전`,
        });
        
        // 백그라운드에서 위치를 받았을 때 로그 강화
        if (appState !== 'active') {
          console.log(`✅ 백그라운드에서 위치 수신 성공!`);
          console.log(`   위치: (${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)})`);
          console.log(`   정확도: ${location.accuracy?.toFixed(1)}m`);
        }
        
        callback(location);
      },
      (error) => {
        console.error('❌ 위치 감지 오류:', error);
        // 백그라운드에서는 Alert를 표시하지 않음 (사용자 경험 저하)
        if (AppState.currentState === 'active') {
          Alert.alert('위치 오류', '위치 정보를 가져올 수 없습니다.');
        }
      },
      watchOptions
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
      // iOS: 네이티브 위치 엔진(4-A) 중단
      if (Platform.OS === 'ios' && watchId === IOS_NATIVE_WATCH_ID) {
        try {
          if (this.iosSubscription) {
            this.iosSubscription.remove();
            this.iosSubscription = null;
          }
          const { LocationConfigModule } = NativeModules;
          if (LocationConfigModule?.stop) {
            LocationConfigModule.stop();
          }
          console.log('🛑 iOS native 위치 감지 중단 (watchId:', watchId, ')');
        } catch (error) {
          console.error('❌ iOS native 위치 감지 중단 실패:', error);
        } finally {
          if (watchId === this.watchId) {
            this.watchId = null;
            this.mockLocationIndex = 0;
          }
        }
        return;
      }

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
