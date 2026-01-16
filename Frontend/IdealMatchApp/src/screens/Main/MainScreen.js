import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, AppState, TouchableOpacity } from 'react-native';
import { AuthContext } from '../../context';
import { locationService } from '../../services/location';
import { mockApiClient } from '../../services/api';
import { hapticService } from '../../services/haptic';
import { notificationService } from '../../services/notification';
import { Button } from '../../components/common';
import { HeartbeatAnimation } from '../../components/animations';
import { COLORS, MATCHING_INTERVAL_MS } from '../../constants';
import { DEFAULT_BACKGROUND_INTERVAL, BACKGROUND_INTERVALS, FOREGROUND_INTERVAL } from '../../constants/backgroundConfig';

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
  const hasNotifiedRef = useRef(false); // 알림 표시 여부 (동기적 관리)
  const appState = useRef(AppState.currentState);
  const backgroundIntervalRef = useRef(null);

  useEffect(() => {
    initializeLocation();

    // AppState 리스너 등록 (화면 꺼짐/홈버튼 감지)
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // 컴포넌트 언마운트 시 정리
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

  // 프로필 또는 이상형이 변경되면 위치 초기화 재시도
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

      // 프로필 또는 이상형이 없으면 위치만 가져오고 매칭은 시작하지 않음
      const hasProfile = userProfile && userProfile.age && userProfile.gender;
      const hasIdealType = idealType && idealType.minAge && idealType.maxAge;

      if (!hasProfile || !hasIdealType) {
        console.log('⚠️ 프로필 또는 이상형 미설정 - 매칭 시작하지 않음');
        setIsLoading(false);
        return;
      }

      // 1. 위치 권한 요청
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

      // 2. 현재 위치 가져오기
      console.log('📍 현재 위치 가져오는 중...');
      const currentLocation = await locationService.getCurrentLocation();
      setLocation(currentLocation);
      console.log('✅ 현재 위치 획득:', currentLocation);

      // 3. Mock API 초기화
      console.log('🎭 Mock API 초기화 중...');
      mockApiClient.initialize(currentLocation);
      mockApiClient.setUserProfile(userProfile, idealType);

      // 4. 첫 매칭 검색
      await searchMatches(currentLocation);

      // 5. 위치 변경 감지 시작
      console.log('🎯 위치 변경 감지 시작...');
      const id = locationService.watchLocation((newLocation) => {
        console.log('📍 위치 업데이트됨:', newLocation);
        setLocation(newLocation);
        searchMatches(newLocation); // 위치 변경 시 자동 매칭 검색
      });
      setWatchId(id);
      console.log('✅ 위치 감지 시작됨 (watchId:', id, ')');

      // 6. 주기적 매칭 검색 시작 (30초마다)
      const interval = FOREGROUND_INTERVAL;
      console.log(`✅ 주기적 매칭 시작 (${interval / 1000}초마다)`);
      
      matchingIntervalRef.current = setInterval(async () => {
        console.log('⏰ 주기적 매칭 검색...');
        try {
          // 현재 위치를 다시 가져와서 최신 위치로 검색
          const latestLocation = await locationService.getCurrentLocation();
          await searchMatches(latestLocation);
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
    try {
      setIsSearching(true);
      const result = await mockApiClient.findMatches(searchLocation);
      setMatchResult(result);

      if (result.matched && result.matches.length > 0 && !hasNotifiedRef.current) {
        // 매칭 성공! (첫 번째만)
        const bestMatch = result.matches[0];
        console.log('🎉 매칭 성공! 주변에서 이상형을 발견했습니다!');
        
        // 즉시 알림 표시 완료 플래그 설정 (중복 방지 - 동기적)
        hasNotifiedRef.current = true;
        
        // 심장 애니메이션 표시
        setShowHeartbeat(true);
        
        // 심장 박동 패턴 진동
        hapticService.heartbeat();
        
        // 매칭 알림 즉시 표시
        notificationService.showMatchNotification(bestMatch);
        
        // 5초 후 애니메이션 숨기기
        setTimeout(() => {
          setShowHeartbeat(false);
        }, 5000);
        
        // 10초 후 매칭 카운터 리셋 및 다시 매칭 대기 상태로
        setTimeout(() => {
          console.log('🔄 매칭 상태 리셋 - 다시 매칭을 시도합니다...');
          mockApiClient.resetMatchCounter();
          setMatchResult(null);
          hasNotifiedRef.current = false; // ref로 변경
        }, 10000);
      }
    } catch (error) {
      console.error('❌ 매칭 검색 오류:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRetry = () => {
    setLocationError(null);
    initializeLocation();
  };

  const handleAppStateChange = async (nextAppState) => {
    console.log(`📱 AppState 변경: ${appState.current} → ${nextAppState}`);

    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // 백그라운드 → 포어그라운드 (앱 다시 열림)
      console.log('✅ 포어그라운드 전환 - 실시간 매칭 재개');
      
      // 백그라운드 인터벌 정리
      if (backgroundIntervalRef.current) {
        clearInterval(backgroundIntervalRef.current);
        backgroundIntervalRef.current = null;
      }
      
      // 즉시 한 번 검색
      if (location) {
        await searchMatches(location);
      }
    } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
      // 포어그라운드 → 백그라운드 (화면 꺼짐 또는 홈버튼)
      console.log('🔒 백그라운드 전환 - 백그라운드 매칭 시작');
      
      // 현재 위치를 서버로 전송 (시뮬레이션)
      if (location) {
        await sendLocationToServer(location);
      }
      
      // 백그라운드에서 5분마다 위치 업데이트 & 매칭 체크
      startBackgroundMatching();
    }

    appState.current = nextAppState;
  };

  const sendLocationToServer = async (currentLocation) => {
    try {
      console.log('🌐 서버로 위치 전송 (시뮬레이션):', {
        userId: userProfile?.age + '_' + userProfile?.gender,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        timestamp: new Date().toISOString(),
      });

      // 실제 구현 시:
      // await fetch('https://your-server.com/api/location', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ ... })
      // });

      return { success: true };
    } catch (error) {
      console.error('❌ 서버 전송 오류:', error);
      return { success: false };
    }
  };

  const startBackgroundMatching = () => {
    const interval = DEFAULT_BACKGROUND_INTERVAL; // 1분 (변경 가능)
    console.log(`🔄 백그라운드 매칭 시작 (${interval / 1000}초 간격)`);
    
    // 설정된 간격마다 위치 업데이트 & 매칭 체크
    backgroundIntervalRef.current = setInterval(async () => {
      try {
        console.log('⏰ 백그라운드 매칭 체크...');
        
        // 현재 위치 가져오기
        const currentLocation = await locationService.getCurrentLocation();
        
        // 서버로 전송
        await sendLocationToServer(currentLocation);
        
        // 매칭 체크 (Mock)
        const result = await mockApiClient.findMatches(currentLocation);
        
        if (result.matched && result.matches.length > 0 && !hasNotifiedRef.current) {
          console.log('🎉 백그라운드 매칭 성공!');
          
          // 알림 표시
          hasNotifiedRef.current = true;
          await notificationService.showMatchNotification();
          
          // 진동
          hapticService.heartbeat();
          
          // 10초 후 리셋
          setTimeout(() => {
            hasNotifiedRef.current = false;
            mockApiClient.resetMatchCounter();
          }, 10000);
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

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>위치 정보를 가져오는 중...</Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{locationError}</Text>
        <Button title="다시 시도" onPress={handleRetry} style={styles.retryButton} />
        <Button
          title="로그아웃"
          onPress={handleLogout}
          style={styles.logoutButton}
        />
      </View>
    );
  }

  // 프로필/이상형 미설정 체크
  const hasProfile = userProfile && userProfile.age && userProfile.gender;
  const hasIdealType = idealType && idealType.minAge && idealType.maxAge;

  return (
    <View style={styles.container}>
      {/* 헤더 (타이틀 + 로그아웃 버튼) */}
      <View style={styles.header}>
        <Text style={styles.title}>💖 이상형 매칭</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      {/* 프로필/이상형 미설정 경고 */}
      {(!hasProfile || !hasIdealType) && (
        <View style={styles.warningCard}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningTitle}>
            {!hasProfile && !hasIdealType
              ? '프로필과 이상형을 설정해주세요'
              : !hasProfile
              ? '프로필을 설정해주세요'
              : '이상형을 설정해주세요'}
          </Text>
          <Text style={styles.warningText}>
            매칭을 시작하려면 정보 입력이 필요합니다
          </Text>
          <View style={styles.warningButtons}>
            {!hasProfile && (
              <Button
                title="프로필 입력"
                onPress={() => navigation.navigate('ProfileInput')}
                style={styles.warningButton}
              />
            )}
            {!hasIdealType && (
              <Button
                title="이상형 입력"
                onPress={() => navigation.navigate('IdealTypeInput')}
                style={styles.warningButton}
              />
            )}
          </View>
        </View>
      )}

      {/* 위치 정보 */}
      {location && (
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>📍 현재 위치</Text>
          <Text style={styles.locationText}>
            위도: {location.latitude.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            경도: {location.longitude.toFixed(6)}
          </Text>
          <Text style={styles.locationAccuracy}>
            정확도: ±{location.accuracy?.toFixed(0)}m
          </Text>
        </View>
      )}

      {/* 매칭 상태 */}
      <View style={styles.statusCard}>
        {isSearching ? (
          <>
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.spinner} />
            <Text style={styles.statusText}>🔍 매칭 검색 중...</Text>
          </>
        ) : matchResult?.matched && matchResult.matches.length > 0 ? (
          <>
            <Text style={styles.matchedIcon}>💝</Text>
            <Text style={styles.matchedText}>매칭 성공!</Text>
            <Text style={styles.matchInfo}>
              주변에서 이상형을 발견했습니다!
            </Text>
            <Text style={styles.matchSubtext}>
              두근두근 💓
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.statusIcon}>⏳</Text>
            <Text style={styles.statusText}>매칭 대기 중...</Text>
            <Text style={styles.statusSubtext}>
              주변에 이상형이 나타나면 알려드릴게요!
            </Text>
            {matchResult && (
              <Text style={styles.searchInfo}>
                마지막 검색: {new Date(matchResult.timestamp).toLocaleTimeString()}
              </Text>
            )}
          </>
        )}
      </View>

      {/* 버튼들 */}
      <View style={styles.buttonContainer}>
        <View style={styles.editButtonsRow}>
          <Button
            title="프로필 수정"
            onPress={() => navigation.navigate('ProfileInput')}
            style={styles.editButton}
          />
          <Button
            title="이상형 수정"
            onPress={() => navigation.navigate('IdealTypeInput')}
            style={styles.editButton}
          />
        </View>
      </View>

      {/* 매칭 성공 시 심장 애니메이션 */}
      <HeartbeatAnimation isActive={showHeartbeat} size={150} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    flex: 1,
    textAlign: 'center',
  },
  logoutButton: {
    position: 'absolute',
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.darkgray,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: COLORS.darkgray,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.red,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  retryButton: {
    marginBottom: 10,
    minWidth: 200,
  },
  warningCard: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFC107',
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 15,
    textAlign: 'center',
  },
  warningButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  warningButton: {
    backgroundColor: COLORS.primary,
    minWidth: 120,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.darkgray,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 5,
  },
  locationCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.darkgray,
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  locationAccuracy: {
    fontSize: 12,
    color: COLORS.lightgray,
    marginTop: 5,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    padding: 40,
    borderRadius: 20,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minHeight: 250,
    justifyContent: 'center',
  },
  spinner: {
    marginBottom: 15,
  },
  statusIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  statusSubtext: {
    fontSize: 14,
    color: COLORS.darkgray,
    textAlign: 'center',
  },
  searchInfo: {
    fontSize: 12,
    color: COLORS.lightgray,
    marginTop: 10,
  },
  matchedIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  matchedText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  matchInfo: {
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  matchSubtext: {
    fontSize: 24,
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 10,
  },
  matchDetails: {
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 10,
    width: '100%',
  },
  matchDetail: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  editButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  editButton: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: COLORS.secondary,
  },
});

export default MainScreen;
