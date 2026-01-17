import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  AppState,
  TouchableOpacity,
  Image,
} from 'react-native';
import { AuthContext } from '../../context';
import { locationService } from '../../services/location';
import { mockApiClient } from '../../services/api';
import { apiClient } from '../../services/api/apiClient';
import { hapticService } from '../../services/haptic';
import { notificationService } from '../../services/notification';
import { HeartbeatAnimation, GlowingHeart } from '../../components/animations';
import { COLORS } from '../../constants';
import { DEFAULT_BACKGROUND_INTERVAL, FOREGROUND_INTERVAL } from '../../constants/backgroundConfig';
import LoginLogo from '../../images/login_logo.png';

const MainScreen = ({ navigation }) => {
  const { userProfile, idealType, logout } = useContext(AuthContext);
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showHeartbeat, setShowHeartbeat] = useState(false);
  const matchingIntervalRef = useRef(null);
  const hasNotifiedRef = useRef(false);
  const lastMatchIdRef = useRef(null); // 마지막 매칭 ID 저장
  const notificationCooldownRef = useRef(false); // 알림 쿨다운 플래그
  const isSearchingRef = useRef(false); // 검색 중 플래그 (ref로 동기 체크)
  const isSendingLocationRef = useRef(false); // 위치 전송 중 플래그
  const lastLocationRef = useRef(null); // 마지막 전송한 위치 저장
  const locationUpdateCooldownRef = useRef(false); // 위치 업데이트 쿨다운 플래그
  const appState = useRef(AppState.currentState);
  const backgroundIntervalRef = useRef(null);

  useEffect(() => {
    initializeLocation();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (watchId !== null) {
        locationService.stopWatching(watchId);
      }
      if (matchingIntervalRef.current) {
        clearInterval(matchingIntervalRef.current);
      }
      if (backgroundIntervalRef.current) {
        clearInterval(backgroundIntervalRef.current);
      }
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    const hasProfile = userProfile && userProfile.age && userProfile.gender;
    const hasIdealType = idealType && idealType.minAge && idealType.maxAge;

    if (hasProfile && hasIdealType && !isLoading && !location) {
      console.log('✅ 프로필/이상형 설정 완료 - 매칭 시작');
      initializeLocation();
    }
  }, [userProfile, idealType]);

  const initializeLocation = async () => {
    try {
      setIsLoading(true);
      setLocationError(null);

      const hasProfile = userProfile && userProfile.age && userProfile.gender;
      const hasIdealType = idealType && idealType.minAge && idealType.maxAge;

      if (!hasProfile || !hasIdealType) {
        console.log('⚠️ 프로필 또는 이상형 미설정 - 매칭 시작하지 않음');
        setIsLoading(false);
        return;
      }

      console.log('📱 위치 권한 요청 중...');
      const hasPermission = await locationService.requestPermission();
      
      if (!hasPermission) {
        setLocationError('위치 권한이 거부되었습니다.');
        Alert.alert(
          '위치 권한 필요',
          '매칭을 위해 위치 권한이 필요합니다. 설정에서 권한을 허용해주세요.',
          [{ text: '확인' }]
        );
        setIsLoading(false);
        return;
      }

      console.log('✅ 위치 권한 허용됨');
      console.log('📍 현재 위치 가져오는 중...');
      const currentLocation = await locationService.getCurrentLocation();
      setLocation(currentLocation);
      console.log('✅ 현재 위치 획득:', currentLocation);

      console.log('🎭 Mock API 초기화 중...');
      mockApiClient.initialize(currentLocation);
      mockApiClient.setUserProfile(userProfile, idealType);

      // 초기 위치를 서버에 전송
      await sendLocationToServer(currentLocation);
      await searchMatches(currentLocation);

      console.log('🎯 위치 변경 감지 시작...');
      const id = locationService.watchLocation(async (newLocation) => {
        console.log('📍 위치 업데이트됨:', newLocation);
        setLocation(newLocation);
        // 위치가 변경될 때만 서버에 전송 (중복 방지 로직 내장)
        await sendLocationToServer(newLocation);
        // 위치 변경 시에는 알림 쿨다운이 없을 때만 검색
        if (!notificationCooldownRef.current) {
          await searchMatches(newLocation);
        } else {
          console.log('⏸️ 위치 변경 감지되었지만 알림 쿨다운 중이므로 검색 건너뜀.');
        }
      });
      setWatchId(id);
      console.log('✅ 위치 감지 시작됨 (watchId:', id, ')');

      const interval = FOREGROUND_INTERVAL;
      console.log(`✅ 주기적 매칭 시작 (${interval / 1000}초마다)`);
      
      matchingIntervalRef.current = setInterval(async () => {
        console.log('⏰ 주기적 매칭 검색...');
        try {
          // 현재 위치 상태만 사용 (위치 변경 감지에서 이미 업데이트됨)
          // 주기적 검색 시에는 위치 전송하지 않음 (위치 변경 감지에서만 전송)
          // 알림 쿨다운이 없을 때만 검색
          if (!notificationCooldownRef.current && location) {
            await searchMatches(location);
          }
        } catch (error) {
          console.error('주기적 매칭 검색 오류:', error);
        }
      }, interval);

      setIsLoading(false);
    } catch (error) {
      console.error('❌ 위치 초기화 오류:', error);
      setLocationError(error.message || '위치를 가져올 수 없습니다.');
      Alert.alert('위치 오류', '위치 정보를 가져올 수 없습니다. 다시 시도해주세요.');
      setIsLoading(false);
    }
  };

  const searchMatches = async (searchLocation) => {
    // 이미 검색 중이면 중복 실행 방지 (ref로 동기 체크)
    if (isSearchingRef.current) {
      console.log('⏸️ 매칭 검색이 이미 진행 중입니다. 중복 실행 방지.');
      return;
    }

    // 알림 쿨다운 중이면 검색하지 않음
    if (notificationCooldownRef.current) {
      console.log('⏸️ 알림 쿨다운 중입니다. 검색 건너뜀.');
      return;
    }

    try {
      isSearchingRef.current = true;
      setIsSearching(true);
      const result = await mockApiClient.findMatches(searchLocation);
      setMatchResult(result);

      if (result.matched && result.matches.length > 0) {
        const bestMatch = result.matches[0];
        // 매칭 ID 생성 (사용자 ID + 타임스탬프 기반)
        const matchId = `${bestMatch.user?.id || 'unknown'}-${Date.now()}`;
        
        // 같은 매칭에 대한 중복 알림 방지
        if (hasNotifiedRef.current && lastMatchIdRef.current === matchId) {
          console.log('⏸️ 이미 알림을 표시한 매칭입니다. 중복 알림 방지.');
          return;
        }

        // 새로운 매칭이거나 알림을 표시하지 않은 경우
        if (!hasNotifiedRef.current || lastMatchIdRef.current !== matchId) {
          console.log('🎉 매칭 성공! 주변에서 이상형을 발견했습니다!');
          
          hasNotifiedRef.current = true;
          lastMatchIdRef.current = matchId;
          notificationCooldownRef.current = true; // 쿨다운 시작
          
          setShowHeartbeat(true);
          hapticService.heartbeat();
          notificationService.showMatchNotification(bestMatch);
          
          setTimeout(() => {
            setShowHeartbeat(false);
          }, 5000);
          
          // 10초 후 상태 리셋
          setTimeout(() => {
            console.log('🔄 매칭 상태 리셋 - 다시 매칭을 시도합니다...');
            mockApiClient.resetMatchCounter();
            setMatchResult(null);
            hasNotifiedRef.current = false;
            lastMatchIdRef.current = null;
            notificationCooldownRef.current = false; // 쿨다운 해제
          }, 10000);
        }
      }
    } catch (error) {
      console.error('❌ 매칭 검색 오류:', error);
    } finally {
      isSearchingRef.current = false;
      setIsSearching(false);
    }
  };

  const handleAppStateChange = async (nextAppState) => {
    console.log(`📱 AppState 변경: ${appState.current} → ${nextAppState}`);

    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('✅ 포어그라운드 전환 - 실시간 매칭 재개');
      
      if (backgroundIntervalRef.current) {
        clearInterval(backgroundIntervalRef.current);
        backgroundIntervalRef.current = null;
      }
      
      if (location) {
        // 포어그라운드 전환 시에는 위치 전송하지 않음 (위치 변경 감지에서만 전송)
        // 알림 쿨다운이 없을 때만 검색
        if (!notificationCooldownRef.current) {
          await searchMatches(location);
        } else {
          console.log('⏸️ 포어그라운드 전환 시 알림 쿨다운 중이므로 검색 건너뜀.');
        }
      }
    } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
      console.log('🔒 백그라운드 전환 - 백그라운드 매칭 시작');
      
      // 백그라운드 전환 시에는 위치 전송하지 않음 (위치 변경 감지에서만 전송)
      startBackgroundMatching();
    }

    appState.current = nextAppState;
  };

  const sendLocationToServer = async (currentLocation) => {
    // 이미 전송 중이면 중복 실행 방지
    if (isSendingLocationRef.current) {
      console.log('⏸️ 위치 전송이 이미 진행 중입니다. 중복 실행 방지.');
      return { success: true, skipped: true };
    }

    // 위치 업데이트 쿨다운 중이면 전송하지 않음 (5초 간격)
    if (locationUpdateCooldownRef.current) {
      console.log('⏸️ 위치 업데이트 쿨다운 중입니다. 전송 건너뜀.');
      return { success: true, skipped: true };
    }

    // 같은 위치를 방금 전송했다면 건너뜀
    if (lastLocationRef.current) {
      const latDiff = Math.abs(lastLocationRef.current.latitude - currentLocation.latitude);
      const lonDiff = Math.abs(lastLocationRef.current.longitude - currentLocation.longitude);
      const timeDiff = Date.now() - lastLocationRef.current.timestamp;
      
      // 위치가 거의 같고(0.0001도 이내) 5초 이내에 전송했다면 건너뜀
      if (latDiff < 0.0001 && lonDiff < 0.0001 && timeDiff < 5000) {
        console.log('⏸️ 같은 위치를 최근에 전송했습니다. 건너뜀.');
        return { success: true, skipped: true };
      }
    }

    try {
      isSendingLocationRef.current = true;
      locationUpdateCooldownRef.current = true;

      console.log('🌐 서버로 위치 전송 중...', {
        latitude: currentLocation.latitude.toFixed(6),
        longitude: currentLocation.longitude.toFixed(6),
      });

      const result = await apiClient.updateLocation(
        currentLocation.latitude,
        currentLocation.longitude
      );

      if (result.success) {
        console.log('✅ 위치 업데이트 성공:', result.data);
        // 마지막 전송한 위치 저장
        lastLocationRef.current = {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          timestamp: Date.now(),
        };
      } else {
        console.error('❌ 위치 업데이트 실패:', result.error);
      }

      // 5초 후 쿨다운 해제
      setTimeout(() => {
        locationUpdateCooldownRef.current = false;
      }, 5000);

      return result;
    } catch (error) {
      console.error('❌ 서버 전송 오류:', error);
      locationUpdateCooldownRef.current = false;
      return { 
        success: false, 
        error: error.message || '알 수 없는 오류가 발생했습니다.' 
      };
    } finally {
      isSendingLocationRef.current = false;
    }
  };

  const startBackgroundMatching = () => {
    const interval = DEFAULT_BACKGROUND_INTERVAL;
    console.log(`🔄 백그라운드 매칭 시작 (${interval / 1000}초 간격)`);
    
    backgroundIntervalRef.current = setInterval(async () => {
      try {
        console.log('⏰ 백그라운드 매칭 체크...');
        
        // 현재 위치 상태만 사용 (위치 변경 감지에서 이미 업데이트됨)
        // 백그라운드 매칭 시에는 위치 전송하지 않음 (위치 변경 감지에서만 전송)
        
        if (!location) {
          console.log('⏸️ 위치 정보가 없어 매칭 검색을 건너뜁니다.');
          return;
        }
        
        const result = await mockApiClient.findMatches(location);
        
        if (result.matched && result.matches.length > 0) {
          const bestMatch = result.matches[0];
          const matchId = `${bestMatch.user?.id || 'unknown'}-${Date.now()}`;
          
          // 중복 알림 방지
          if (hasNotifiedRef.current && lastMatchIdRef.current === matchId) {
            console.log('⏸️ 백그라운드: 이미 알림을 표시한 매칭입니다.');
            return;
          }

          if (!hasNotifiedRef.current || lastMatchIdRef.current !== matchId) {
            console.log('🎉 백그라운드 매칭 성공!');
            
            hasNotifiedRef.current = true;
            lastMatchIdRef.current = matchId;
            notificationCooldownRef.current = true;
            
            await notificationService.showMatchNotification(bestMatch);
            hapticService.heartbeat();
            
            setTimeout(() => {
              hasNotifiedRef.current = false;
              lastMatchIdRef.current = null;
              notificationCooldownRef.current = false;
              mockApiClient.resetMatchCounter();
            }, 10000);
          }
        }
      } catch (error) {
        console.error('❌ 백그라운드 매칭 오류:', error);
      }
    }, interval);
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          if (watchId !== null) {
            locationService.stopWatching(watchId);
          }
          await logout();
        },
      },
    ]);
  };

  const hasProfile = userProfile && userProfile.age && userProfile.gender;
  const hasIdealType = idealType && idealType.minAge && idealType.maxAge;
  const isSetupComplete = hasProfile && hasIdealType;

  if (isLoading && isSetupComplete) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>위치 정보를 가져오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={LoginLogo} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>이상형 매칭</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* 메인 컨텐츠 */}
      <View style={styles.main}>
        {/* 경고 카드 - 프로필/이상형 미완성 */}
        {!isSetupComplete && (
          <View style={styles.warningCard}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Incomplete setup</Text>
              <Text style={styles.warningText}>
                Please complete{' '}
                <Text style={styles.warningLink}>Setup Profile</Text> and{' '}
                <Text style={styles.warningLink}>Setup Ideal Type</Text> to start matching.
              </Text>
            </View>
          </View>
        )}

        {/* 중앙 하트 카드 */}
        <View style={styles.heartCard}>
          {/* 상단 미세한 빛 효과 */}
          <View style={styles.heartCardOverlay} />
          
          <View style={styles.heartContainer}>
            {/* 3D Glowing Heart with Pulsing Animation */}
            <GlowingHeart size={220} />
          </View>
        </View>

        {/* 하단 액션 버튼 그리드 */}
        <View style={styles.buttonGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ProfileInput')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonIcon}>👤</Text>
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('IdealTypeInput')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonIcon}>✨</Text>
            <Text style={styles.actionButtonText}>Edit Ideal Type</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 하단 인디케이터 */}
      <View style={styles.bottomIndicator}>
        <View style={styles.indicatorBar} />
      </View>

      {/* 매칭 성공 시 심장 애니메이션 */}
      <HeartbeatAnimation isActive={showHeartbeat} size={150} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.blushPink || '#FFF0F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.blushPink || '#FFF0F5',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  
  // 헤더
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'rgba(255, 240, 245, 0.8)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.buttonBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  logoutButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  // 메인 컨텐츠
  main: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },

  // 경고 카드
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.warningBg,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  warningIcon: {
    fontSize: 22,
    color: COLORS.warningIcon,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.warningTitle,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: COLORS.warningText,
    lineHeight: 18,
  },
  warningLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // 중앙 하트 카드
  heartCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 182, 193, 0.3)',
    padding: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 25,
    elevation: 3,
  },
  heartCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  heartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 버튼 그리드
  buttonGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    backgroundColor: COLORS.buttonBg,
    borderWidth: 1.5,
    borderColor: COLORS.buttonBorder,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  actionButtonIcon: {
    fontSize: 20,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.buttonText,
    letterSpacing: -0.3,
  },

  // 하단 인디케이터
  bottomIndicator: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  indicatorBar: {
    width: 128,
    height: 6,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 9999,
  },
});

export default MainScreen;
