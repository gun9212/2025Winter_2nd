import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  AppState,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { AuthContext } from '../../context';
import { locationService } from '../../services/location';
import { apiClient } from '../../services/api/apiClient';
import { hapticService } from '../../services/haptic';
import { notificationService } from '../../services/notification';
import { startAndroidForegroundMatching, stopAndroidForegroundMatching } from '../../services/background';
import { HeartbeatAnimation, GlowingHeart } from '../../components/animations';
import { COLORS } from '../../constants';
import { DEFAULT_BACKGROUND_INTERVAL, FOREGROUND_INTERVAL } from '../../constants/backgroundConfig';
import LoginLogo from '../../images/login_logo.png';

const MainScreen = ({ navigation }) => {
  const { userProfile, idealType, logout, isLoggedIn } = useContext(AuthContext);
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showHeartbeat, setShowHeartbeat] = useState(false);
  // 매칭 동의 상태
  const [matchingConsent, setMatchingConsent] = useState(false);
  const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);
  // 매칭 가능한 인원 수 (10m 반경)
  const [matchableCount, setMatchableCount] = useState(0);
  const matchingIntervalRef = useRef(null);
  const hasNotifiedRef = useRef(false);
  const appState = useRef(AppState.currentState);
  const backgroundIntervalRef = useRef(null);
  const isInitializingRef = useRef(false);
  // 중복 알림 방지를 위한 매칭 ID 추적
  const notifiedMatchesRef = useRef(new Set());
  // 디바운싱을 위한 마지막 매칭 체크 시간 추적
  const lastMatchCheckTimeRef = useRef(0);
  // 매칭 동의 활성화 시점 추적 (알림 초기화용)
  const consentEnabledAtRef = useRef(null);
  // 매칭 동의 활성화 후 알림을 보냈는지 추적 (한 번만 알림 보내기 위해)
  const consentNotificationSentRef = useRef(false);
  // 백그라운드 watchLocation ID
  const backgroundWatchIdRef = useRef(null);
  // 이전 매칭 가능 인원 수 추적 (count 증가 알림용)
  const previousMatchableCountRef = useRef(0);

  useEffect(() => {
    // 로그인하지 않은 경우 위치 업데이트 하지 않음
    if (!isLoggedIn) {
      console.log('⚠️ 로그인하지 않음 - 위치 업데이트 중단');
      setIsLoading(false);
      return;
    }

    // 매칭 동의가 ON일 때만 매칭 시작
    if (matchingConsent) {
      initializeLocation();
    } else {
      console.log('⚠️ 매칭 동의 OFF - 매칭 시작하지 않음');
      setIsLoading(false);
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // watchLocation 제거됨 - setInterval만 사용
      if (matchingIntervalRef.current) {
        clearInterval(matchingIntervalRef.current);
        matchingIntervalRef.current = null;
      }
      if (backgroundIntervalRef.current) {
        clearInterval(backgroundIntervalRef.current);
        backgroundIntervalRef.current = null;
      }
      isInitializingRef.current = false;
      subscription?.remove();
    };
  }, [isLoggedIn, matchingConsent]);

  useEffect(() => {
    const hasProfile = userProfile && userProfile.age && userProfile.gender;
    const hasIdealType = idealType && idealType.minAge && idealType.maxAge;

    if (hasProfile && hasIdealType && !isLoading && !location) {
      console.log('✅ 프로필/이상형 설정 완료 - 매칭 시작');
      initializeLocation();
    }
  }, [userProfile, idealType]);

  // 프로필 로드 시 매칭 동의 상태 불러오기
  useEffect(() => {
    const fetchMatchingConsent = async () => {
      if (!isLoggedIn) return;
      
      try {
        // 서버에서 프로필 조회 (email_verified 정보 포함)
        console.log('📥 서버에서 프로필 및 매칭 동의 상태 조회 중...');
        const profileResult = await apiClient.getProfile();
        console.log('📥 프로필 조회 결과:', {
          success: profileResult.success,
          hasData: !!profileResult.data,
          emailVerified: profileResult.data?.email_verified,
          matchingConsent: profileResult.data?.matching_consent,
          fullData: profileResult.data
        });
        
        if (profileResult.success && profileResult.data) {
          const emailVerified = profileResult.data.email_verified;
          const consent = profileResult.data.matching_consent ?? false;
          
          console.log('🔍 이메일 인증 상태 확인:', {
            emailVerified,
            emailVerifiedType: typeof emailVerified,
            emailVerifiedStrictTrue: emailVerified === true,
            emailVerifiedNotStrictTrue: emailVerified !== true
          });
          
          // email_verified가 false이거나 undefined인 경우에만 matching_consent를 false로 강제 설정
          if (emailVerified !== true) {
            console.log('⚠️ 이메일 인증 미완료 - 매칭 동의를 OFF로 강제 설정', { emailVerified, consent });
            setMatchingConsent(false);
          } else {
            // 이메일 인증 완료된 경우 서버의 matching_consent 값 사용 (정상 토글 가능)
            setMatchingConsent(consent);
            console.log('✅ 매칭 동의 상태 서버에서 불러오기:', consent, '(이메일 인증 완료)');
          }
        } else {
          // 프로필 조회 실패 시 기존 상태 유지 (강제로 false로 설정하지 않음)
          console.log('⚠️ 프로필 조회 실패 - 기존 상태 유지', profileResult);
        }
      } catch (error) {
        console.error('❌ 매칭 동의 상태 조회 실패:', error);
        // 에러 발생 시 기존 상태 유지 (강제로 false로 설정하지 않음)
      }
    };

    fetchMatchingConsent();
  }, [userProfile, isLoggedIn]);

  const initializeLocation = async () => {
    try {
      // 이미 초기화 중이거나 완료된 경우 중복 실행 방지
      if (isInitializingRef.current || matchingIntervalRef.current !== null) {
        console.log('⚠️ 이미 매칭이 초기화되어 있습니다.');
        return;
      }

      isInitializingRef.current = true;
      setIsLoading(true);
      setLocationError(null);

      const hasProfile = userProfile && userProfile.age && userProfile.gender;
      const hasIdealType = idealType && idealType.minAge && idealType.maxAge;

      if (!hasProfile || !hasIdealType) {
        console.log('⚠️ 프로필 또는 이상형 미설정 - 매칭 시작하지 않음');
        setIsLoading(false);
        return;
      }
      
      // 매칭 동의가 OFF인 경우 위치 초기화 하지 않음
      if (!matchingConsent) {
        console.log('⚠️ 매칭 동의 OFF - 위치 초기화 중단');
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

      // 초기 위치를 서버에 전송
      await sendLocationToServer(currentLocation);
      await searchMatchesDebounced(currentLocation, true); // 초기 실행은 강제 체크
      // 초기 활성 매칭 수 조회
      await fetchActiveMatches(currentLocation);

      // watchLocation 제거: setInterval로 통일 (5초 간격)
      console.log('✅ setInterval로 위치 추적 및 매칭 수행 (5초 간격)');

      // 기존 interval이 있으면 제거
      if (matchingIntervalRef.current) {
        console.log('🔄 기존 매칭 interval 제거');
        clearInterval(matchingIntervalRef.current);
        matchingIntervalRef.current = null;
      }

      const interval = FOREGROUND_INTERVAL;
      console.log(`✅ 주기적 매칭 시작 (${interval / 1000}초마다)`);
      console.log(`📊 Interval ID: ${matchingIntervalRef.current}`);
      
      matchingIntervalRef.current = setInterval(async () => {
        console.log('⏰ 주기적 매칭 검색... (setInterval에서 호출, 5초 간격)');
        try {
          const latestLocation = await locationService.getCurrentLocation();
          setLocation(latestLocation);
          // 주기적 검색 시에도 서버에 위치 전송
          await sendLocationToServer(latestLocation);
          // 디바운싱된 매칭 체크 (최소 5초 간격 보장)
          await searchMatchesDebounced(latestLocation);
          // 활성 매칭 수도 조회
          await fetchActiveMatches(latestLocation);
        } catch (error) {
          console.error('주기적 매칭 검색 오류:', error);
        }
      }, interval);
      
      console.log(`📊 새 Interval ID: ${matchingIntervalRef.current}`);

      setIsLoading(false);
      isInitializingRef.current = false;
    } catch (error) {
      console.error('❌ 위치 초기화 오류:', error);
      setLocationError(error.message || '위치를 가져올 수 없습니다.');
      Alert.alert('위치 오류', '위치 정보를 가져올 수 없습니다. 다시 시도해주세요.');
      setIsLoading(false);
      isInitializingRef.current = false;
    }
  };

  /**
   * 디바운싱된 매칭 체크 (최소 간격 보장)
   * 최소 5초 간격으로만 매칭 체크를 수행하여 중복 호출 방지
   */
  const searchMatchesDebounced = async (searchLocation, forceCheck = false) => {
    // 매칭 동의가 OFF인 경우 매칭 검색 하지 않음
    if (!matchingConsent) {
      console.log('⚠️ 매칭 동의 OFF - 매칭 검색 중단');
      return;
    }

    // 강제 체크가 아니면 디바운싱 확인
    if (!forceCheck) {
      const now = Date.now();
      const timeSinceLastCheck = now - lastMatchCheckTimeRef.current;
      const MIN_MATCH_CHECK_INTERVAL = FOREGROUND_INTERVAL; // 5초

      if (timeSinceLastCheck < MIN_MATCH_CHECK_INTERVAL) {
        console.log(
          `⏸️ 매칭 체크 스킵 (${Math.floor(timeSinceLastCheck / 1000)}초 전에 실행됨, 최소 ${MIN_MATCH_CHECK_INTERVAL / 1000}초 간격 필요)`
        );
        return; // 스킵
      }

      // 마지막 체크 시간 업데이트
      lastMatchCheckTimeRef.current = now;
      console.log(
        `✅ 매칭 체크 실행 (${Math.floor(timeSinceLastCheck / 1000)}초 경과)`
      );
    } else {
      console.log('✅ 매칭 체크 실행 (강제 체크)');
      lastMatchCheckTimeRef.current = Date.now();
    }

    // 실제 매칭 검색 수행
    await searchMatches(searchLocation);
  };

  const searchMatches = async (searchLocation) => {
    // 매칭 동의가 OFF인 경우 매칭 검색 하지 않음
    if (!matchingConsent) {
      console.log('⚠️ 매칭 동의 OFF - 매칭 검색 중단');
      setMatchableCount(0);
      previousMatchableCountRef.current = 0;
      return;
    }
    
    try {
      console.log('🔍 searchMatches 호출됨 (서버 신호 확인)');
      setIsSearching(true);
      
      // 서버에서 매칭 신호 확인 (실제 Django API 호출)
      const result = await apiClient.checkMatches(
        searchLocation.latitude,
        searchLocation.longitude,
        0.01 // 10m 반경
      );
      
      setMatchResult(result);

      // 매칭 체크 후 활성 매칭 수도 함께 조회
      await fetchActiveMatches(searchLocation);

      // 디버깅: 매칭 결과 확인 (상세)
      console.log('🔍 매칭 결과 확인 (상세):', {
        matched: result.matched,
        matchesCount: result.matches?.length || 0,
        isNewMatch: result.isNewMatch,
        hasMatches: !!(result.matches && result.matches.length > 0),
        matches: result.matches,
        fullResult: result,
      });

      // 매칭 발생 시 로컬 알림 표시 (새 매칭만, 중복 방지)
      // 매칭 동의를 ON으로 바꾼 직후(30초 이내)에 생성된 매칭도 새 매칭으로 간주
      const timeSinceConsentEnabled = consentEnabledAtRef.current ? 
        (new Date() - consentEnabledAtRef.current) : null;
      const isWithinConsentWindow = timeSinceConsentEnabled !== null && 
        timeSinceConsentEnabled < 30000; // 30초 이내
      
      // 매칭이 동의 활성화 이후에 생성되었는지 확인
      let isMatchAfterConsent = false;
      if (isWithinConsentWindow && result.matches && result.matches.length > 0 && result.matches[0].matched_at) {
        try {
          const matchCreatedAt = new Date(result.matches[0].matched_at);
          isMatchAfterConsent = matchCreatedAt >= consentEnabledAtRef.current;
        } catch (e) {
          console.warn('⚠️ matched_at 파싱 실패:', e);
        }
      }
      
      // 알림 표시 조건:
      // 1. 실제로 새로 생성된 매칭 (result.isNewMatch === true)
      // 2. 또는 매칭 동의 활성화 직후(30초 이내)에 매칭이 있고, 아직 알림을 보내지 않은 경우
      //    (matched_at이 없어도 동의 활성화 직후면 알림 표시)
      const shouldShowNotification = result.matched && 
        result.matches && result.matches.length > 0 &&
        (result.isNewMatch || (isWithinConsentWindow && !consentNotificationSentRef.current));
      
      console.log('🔍 알림 조건 체크:', {
        'result.matched': result.matched,
        'result.isNewMatch': result.isNewMatch,
        'result.matches 존재': !!(result.matches),
        'result.matches.length > 0': !!(result.matches && result.matches.length > 0),
        'isWithinConsentWindow': isWithinConsentWindow,
        'isMatchAfterConsent': isMatchAfterConsent,
        'consentNotificationSent': consentNotificationSentRef.current,
        'timeSinceConsentEnabled (ms)': timeSinceConsentEnabled,
        'shouldShowNotification': shouldShowNotification,
        'consentEnabledAt': consentEnabledAtRef.current,
        'matchCreatedAt': result.matches?.[0]?.matched_at,
      });

      if (shouldShowNotification) {
        console.log('✅ 새 매칭 발견 - 알림 처리 시작');
        const bestMatch = result.matches[0];
        // 매칭 ID 생성 (user1_id와 user2_id 조합 또는 match.id)
        // 매칭이 삭제되었다가 재생성되면 ID가 달라질 수 있으므로, 사용자 조합으로도 확인
        const matchId = bestMatch.id || `${bestMatch.user1_id || bestMatch.user1?.id || 'unknown'}_${bestMatch.user2_id || bestMatch.user2?.id || 'unknown'}`;
        const user1Id = bestMatch.user1_id || bestMatch.user1?.id || 0;
        const user2Id = bestMatch.user2_id || bestMatch.user2?.id || 0;
        const userPairId = `${Math.min(user1Id, user2Id)}_${Math.max(user1Id, user2Id)}`;
        
        // 새 매칭인 경우 (result.isNewMatch === true): 알림 기록을 무시하고 무조건 알림 표시
        // 매칭이 재생성된 경우(예: 상대방이 매칭 동의를 토글) 양쪽 모두 알림을 받아야 하므로
        const isTrulyNewMatch = result.isNewMatch === true;
        
        // 이미 알림을 보낸 매칭인지 확인 (새 매칭이 아닐 때만 확인)
        if (!isTrulyNewMatch && (notifiedMatchesRef.current.has(matchId) || notifiedMatchesRef.current.has(userPairId))) {
          console.log('ℹ️ 이미 알림을 보낸 매칭:', matchId, '또는', userPairId);
          // 중복 알림 방지: 매칭 동의 활성화 윈도우도 초기화 (더 이상 알림 안 오도록)
          if (isWithinConsentWindow || isMatchAfterConsent) {
            consentEnabledAtRef.current = null;
            console.log('🔄 매칭 동의 활성화 윈도우 초기화 (이미 알림 보낸 매칭)');
          }
          return; // 중복 알림 방지
        }
        
        // 새 매칭인 경우: 기존 알림 기록 제거 (재생성된 매칭도 알림을 받도록)
        if (isTrulyNewMatch) {
          notifiedMatchesRef.current.delete(matchId);
          notifiedMatchesRef.current.delete(userPairId);
          console.log('🔄 새 매칭 감지 - 기존 알림 기록 제거:', matchId, userPairId);
        }
        
        console.log('🎉 새 매칭 발견! 로컬 알림 표시:', matchId);
        console.log('📊 매칭 정보:', {
          id: bestMatch.id,
          user1_id: user1Id,
          user2_id: user2Id,
          userPairId: userPairId,
        });
        
        // 알림 보낸 매칭 기록 (매칭 ID와 사용자 조합 모두 기록)
        notifiedMatchesRef.current.add(matchId);
        notifiedMatchesRef.current.add(userPairId);
        
        // 매칭 동의 활성화 윈도우 즉시 초기화 (한 번 알림을 보냈으면 더 이상 윈도우 사용 안 함)
        // 이렇게 하면 같은 매칭에 대해 여러 번 알림이 오지 않음
        if (isWithinConsentWindow || isMatchAfterConsent) {
          consentEnabledAtRef.current = null;
          consentNotificationSentRef.current = true; // 알림을 보냈음을 기록
          console.log('🔄 매칭 동의 활성화 윈도우 초기화 (알림 표시 완료)');
        }
        
        // 로컬 알림 표시 (무료, iOS/Android 모두 동작)
        try {
          await notificationService.showMatchNotification(bestMatch);
          console.log('✅ 알림 표시 완료');
        } catch (error) {
          console.error('❌ 알림 표시 실패:', error);
        }
        
        // 하트 애니메이션 (포그라운드일 때만)
        if (AppState.currentState === 'active') {
          setShowHeartbeat(true);
          hapticService.heartbeat();
          
          setTimeout(() => {
            setShowHeartbeat(false);
          }, 5000);
        }
      } else if (result.matched && !shouldShowNotification) {
        console.log('ℹ️ 기존 매칭 (알림 표시 안 함)');
        console.log('🔍 기존 매칭 상세:', {
          matched: result.matched,
          isNewMatch: result.isNewMatch,
          matchesCount: result.matches?.length || 0,
        });
      } else {
        console.log('⚠️ 매칭 조건 불충족:', {
          matched: result.matched,
          hasMatches: result.matches && result.matches.length > 0,
          isNewMatch: result.isNewMatch,
        });
        
        // 디버깅: 매칭이 있는데 isNewMatch가 false인 경우 상세 로그
        if (result.matched && result.matches && result.matches.length > 0 && !result.isNewMatch) {
          console.log('🔍 기존 매칭 상세 정보:', {
            matchId: result.matches[0]?.id,
            user1_id: result.matches[0]?.user1_id,
            user2_id: result.matches[0]?.user2_id,
            isNewMatch: result.isNewMatch,
            '이미 알림 보냄?': notifiedMatchesRef.current.has(result.matches[0]?.id || ''),
          });
        }
      }
    } catch (error) {
      console.error('❌ 매칭 검색 오류:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAppStateChange = async (nextAppState) => {
    console.log(`📱 AppState 변경: ${appState.current} → ${nextAppState}`);

    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('✅ 포어그라운드 전환 - 실시간 매칭 재개');

      // Android: 백그라운드 Foreground Service 중단 (포어그라운드에서는 JS 로직 사용)
      if (Platform.OS === 'android') {
        stopAndroidForegroundMatching();
      }
      
      if (backgroundIntervalRef.current) {
        clearInterval(backgroundIntervalRef.current);
        backgroundIntervalRef.current = null;
      }
      if (backgroundWatchIdRef.current !== null) {
        locationService.stopWatching(backgroundWatchIdRef.current);
        backgroundWatchIdRef.current = null;
        console.log('🛑 백그라운드 위치 감지 중단 (포어그라운드 전환)');
      }
      
      if (location) {
        // 포어그라운드 전환 시에도 위치를 서버에 전송
        await sendLocationToServer(location);
        // 포그라운드 전환 시 즉시 체크
        await searchMatchesDebounced(location, true);
        // 활성 매칭 수도 조회
        await fetchActiveMatches(location);
      }

      // watchLocation 제거됨 - setInterval만 사용하므로 정리 불필요
    } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
      console.log('🔒 백그라운드 전환 - 백그라운드 매칭 시작 (서버 신호 확인)');
      
      if (location) {
        await sendLocationToServer(location);
      }

      if (Platform.OS === 'android') {
        // Android는 JS 타이머 대신 Foreground Service로 백그라운드 동작 보장
        await startAndroidForegroundMatching({
          // 배터리 고려 기본 1분 (필요시 조정)
          intervalMs: 60000,
          radiusKm: 0.05,
        });
      } else {
        // iOS: 기존 로직 유지
        startBackgroundMatching();
        startBackgroundLocationWatch();
      }
    }

    appState.current = nextAppState;
  };

  /**
   * 활성 매칭 수 조회 (10m 이내)
   * 실제로 매칭이 완료된 사용자 중 10m 이내에 있는 인원 수
   */
  const fetchActiveMatches = async (searchLocation) => {
    if (!matchingConsent || !searchLocation) {
      setMatchableCount(0);
      previousMatchableCountRef.current = 0;
      return;
    }

    try {
      // 활성 매칭 수 조회 (10m 이내)
      const result = await apiClient.getActiveMatchCount(
        searchLocation.latitude,
        searchLocation.longitude,
        0.01 // 10m 반경
      );

      if (result.success) {
        const newCount = result.count || 0;
        const previousCount = previousMatchableCountRef.current;
        
        // count가 증가했는지 확인 (이전 count가 0보다 크고, 새 count가 이전보다 큰 경우)
        if (newCount > previousCount && previousCount > 0) {
          console.log(`📈 매칭 가능 인원 증가: ${previousCount}명 → ${newCount}명`);
          
          // 알림 표시
          try {
            await notificationService.showCountIncreaseNotification(
              previousCount,
              newCount
            );
            console.log('✅ 매칭 count 증가 알림 표시 완료');
          } catch (error) {
            console.error('❌ 알림 표시 실패:', error);
          }
        }
        
        setMatchableCount(newCount);
        previousMatchableCountRef.current = newCount;
        console.log(`📊 활성 매칭 수: ${newCount}명 (10m 이내)`);
      } else {
        setMatchableCount(0);
        previousMatchableCountRef.current = 0;
        console.log('⚠️ 활성 매칭 수 조회 실패, 0으로 설정');
      }
    } catch (error) {
      console.error('❌ 활성 매칭 수 조회 오류:', error);
      setMatchableCount(0);
      previousMatchableCountRef.current = 0;
    }
  };

  const sendLocationToServer = async (currentLocation) => {
    // 로그인하지 않은 경우 위치 업데이트 하지 않음
    if (!isLoggedIn) {
      console.log('⚠️ 로그인하지 않음 - 위치 업데이트 중단');
      return;
    }
    
    // 매칭 동의가 OFF인 경우 위치 업데이트 하지 않음
    if (!matchingConsent) {
      console.log('⚠️ 매칭 동의 OFF - 위치 업데이트 중단');
      return;
    }
    try {
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
      } else {
        console.error('❌ 위치 업데이트 실패:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ 서버 전송 오류:', error);
      return { 
        success: false, 
        error: error.message || '알 수 없는 오류가 발생했습니다.' 
      };
    }
  };

  /**
   * 백그라운드 위치 감지
   * - watchLocation을 사용해 OS가 위치 변화로 앱을 깨워줄 수 있도록 설정
   * - 위치 변경 시마다 서버 전송 + 매칭 체크 + 활성 매칭 수 조회
   */
  const startBackgroundLocationWatch = () => {
    // 이미 동작 중이면 재시작하지 않음
    if (backgroundWatchIdRef.current !== null) {
      console.log('⚠️ 백그라운드 위치 감지 이미 실행 중');
      return;
    }

    console.log('🎯 백그라운드 위치 감지 시작 (watchLocation)');
    const watchId = locationService.watchLocation(async (newLocation) => {
      try {
        setLocation(newLocation);
        await sendLocationToServer(newLocation);
        await searchMatchesDebounced(newLocation, true); // 위치 이벤트 시 강제 체크
        await fetchActiveMatches(newLocation);
      } catch (error) {
        console.error('❌ 백그라운드 위치 감지 콜백 오류:', error);
      }
    });

    backgroundWatchIdRef.current = watchId;
  };

  const startBackgroundMatching = () => {
    // 매칭 동의가 OFF면 백그라운드 매칭 중지
    if (!matchingConsent) {
      console.log('⚠️ 매칭 동의 OFF - 백그라운드 매칭 중지');
      return;
    }
    
    // Android는 Foreground Service를 사용하므로 여기서는 실행하지 않음
    if (Platform.OS === 'android') {
      console.log('🔄 Android 백그라운드 매칭: Foreground Service에 의존');
      return;
    }
    
    // iOS 백그라운드: watchLocation과 함께 setInterval을 fallback으로 사용
    // watchLocation이 백그라운드에서 제대로 동작하지 않을 수 있으므로
    // setInterval을 추가로 사용하여 주기적으로 위치 업데이트 시도
    const interval = DEFAULT_BACKGROUND_INTERVAL;
    console.log(`🔄 iOS 백그라운드 매칭 시작 (${interval / 1000}초 간격, watchLocation + setInterval)`);
    
    // 기존 interval이 있으면 제거
    if (backgroundIntervalRef.current) {
      clearInterval(backgroundIntervalRef.current);
      backgroundIntervalRef.current = null;
    }
    
    backgroundIntervalRef.current = setInterval(async () => {
      try {
        console.log('⏰ iOS 백그라운드 위치 업데이트 (setInterval fallback)...');
        
        // 현재 위치 가져오기
        const currentLocation = await locationService.getCurrentLocation();
        setLocation(currentLocation);
        
        // 위치 서버에 전송
        await sendLocationToServer(currentLocation);
        
        // 디바운싱된 매칭 체크
        await searchMatchesDebounced(currentLocation);
        
        // 활성 매칭 수도 조회
        await fetchActiveMatches(currentLocation);
        
      } catch (error) {
        console.error('❌ iOS 백그라운드 매칭 체크 오류:', error);
      }
    }, interval);
  };

  // 매칭 동의 토글 함수
  const handleToggleConsent = async () => {
    // 중복 요청 방지
    if (isUpdatingConsent) {
      return;
    }
    
    // 이메일 인증 미완료 체크 (프론트엔드에서 먼저 체크)
    // 프로필에서 email_verified 정보 확인
    try {
      const profileResult = await apiClient.getProfile();
      if (profileResult.success && profileResult.data) {
        const emailVerified = profileResult.data.email_verified;
        // email_verified가 false이거나 undefined인 경우 아무 동작도 하지 않음
        // (undefined는 안전을 위해 false로 간주)
        if (emailVerified !== true) {
          console.log('⚠️ 이메일 인증 미완료 - 매칭 동의 변경 불가', { emailVerified });
          // UI를 OFF 상태로 강제 설정
          setMatchingConsent(false);
          return;
        }
      } else {
        // 프로필 조회 실패 또는 데이터 없음 - 안전을 위해 진행하지 않음
        console.log('⚠️ 프로필 조회 실패 또는 데이터 없음 - 매칭 동의 변경 불가');
        // UI를 OFF 상태로 강제 설정
        setMatchingConsent(false);
        return;
      }
    } catch (error) {
      console.error('❌ 프로필 조회 실패:', error);
      // 프로필 조회 실패 시에도 진행하지 않음 (안전을 위해)
      // UI를 OFF 상태로 강제 설정
      setMatchingConsent(false);
      return;
    }
    
    // 현재 상태의 반대로 설정
    const newConsentState = !matchingConsent;
    
    try {
      setIsUpdatingConsent(true);
      console.log(`🔄 매칭 동의 ${newConsentState ? '활성화' : '비활성화'} 중...`);
      
      // API 호출
      const result = await apiClient.updateConsent(newConsentState);
      
      if (result.success) {
        // 백엔드에서 반환한 실제 matching_consent 값 사용
        // (email_verified = False인 경우 False로 강제 설정될 수 있음)
        const actualConsentState = result.data?.matching_consent ?? newConsentState;
        
        // 성공 시 state 업데이트 (실제 서버 값 사용)
        setMatchingConsent(actualConsentState);
        console.log(`✅ 매칭 동의 ${actualConsentState ? '활성화' : '비활성화'} 완료`);
        
        // 이메일 인증 미완료로 인해 False로 강제 설정된 경우 알림
        if (result.email_verified === false && newConsentState === true && actualConsentState === false) {
          Alert.alert(
            '이메일 인증 필요',
            '매칭 동의를 활성화하려면 먼저 이메일 인증을 완료해주세요.',
            [{ text: '확인' }]
          );
        }

        // 매칭 동의 상태에 따라 매칭 시작/중지
        if (actualConsentState) {
          // 매칭 동의 ON: 매칭 시작
          console.log('🚀 매칭 동의 ON - 매칭 시작');
          // 알림 기록 초기화 (비활성화 후 활성화 시 알림이 오도록)
          notifiedMatchesRef.current.clear();
          // 매칭 동의 활성화 시점 기록
          consentEnabledAtRef.current = new Date();
          // 매칭 동의 활성화 후 알림 전송 플래그 초기화
          consentNotificationSentRef.current = false;
          console.log('🔄 알림 기록 초기화 (매칭 동의 활성화)', consentEnabledAtRef.current);
          if (location) {
            initializeLocation();
          }
        } else {
          // 매칭 동의 OFF: 매칭 중지 및 위치 추적 중단
          console.log('⏸️ 매칭 동의 OFF - 매칭 중지 및 위치 추적 중단');

          // Android: Foreground Service도 중단
          if (Platform.OS === 'android') {
            stopAndroidForegroundMatching();
          }
          // 기존 interval 정리
          if (matchingIntervalRef.current) {
            clearInterval(matchingIntervalRef.current);
            matchingIntervalRef.current = null;
          }
          if (backgroundIntervalRef.current) {
            clearInterval(backgroundIntervalRef.current);
            backgroundIntervalRef.current = null;
          }
          // 백그라운드 위치 감지 중단
          if (backgroundWatchIdRef.current !== null) {
            locationService.stopWatching(backgroundWatchIdRef.current);
            backgroundWatchIdRef.current = null;
            console.log('🛑 백그라운드 위치 감지 중단 (매칭 동의 OFF)');
          }
          // 매칭 가능 인원 수 초기화
          setMatchableCount(0);
          previousMatchableCountRef.current = 0;
        }
        
        // 햅틱 피드백
        hapticService.heartbeat();
      } else {
        console.error('❌ 매칭 동의 업데이트 실패:', result.error);
        
        // 이메일 인증 미완료인 경우
        if (result.email_verified === false) {
          Alert.alert(
            '이메일 인증 필요',
            '매칭 동의를 변경하려면 먼저 이메일 인증을 완료해주세요.',
            [
              {
                text: '확인',
                style: 'default',
              },
            ]
          );
        } else {
          Alert.alert('오류', result.error || result.message || '매칭 동의 상태를 변경할 수 없습니다.');
        }
      }
    } catch (error) {
      console.error('❌ 매칭 동의 업데이트 오류:', error);
      
      // 이메일 인증 미완료인 경우
      if (error.email_verified === false) {
        Alert.alert(
          '이메일 인증 필요',
          '매칭 동의를 변경하려면 먼저 이메일 인증을 완료해주세요.',
          [
            {
              text: '확인',
              style: 'default',
            },
          ]
        );
      } else {
        Alert.alert('오류', error.message || '매칭 동의 상태를 변경할 수 없습니다.');
      }
    } finally {
      setIsUpdatingConsent(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          // watchLocation 제거됨 - setInterval만 사용하므로 정리 불필요
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
          <Text style={styles.headerTitle}>Wwoong</Text>
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

        {/* 중앙 하트 카드 - 클릭 가능하게 변경 */}
        <TouchableOpacity
          style={styles.heartCard}
          onPress={handleToggleConsent}
          activeOpacity={0.8}
          disabled={isUpdatingConsent || !isSetupComplete}
        >
          {/* 상단 미세한 빛 효과 */}
          <View style={styles.heartCardOverlay} />
          
          <View style={styles.heartContainer}>
            {/* 3D Glowing Heart with Pulsing Animation */}
            <GlowingHeart size={220} isActive={matchingConsent} count={matchableCount} />
            
            {/* 업데이트 중 인디케이터 */}
            {isUpdatingConsent && (
              <View style={styles.consentLoadingOverlay}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* 하단 액션 버튼 그리드 */}
        <View style={styles.buttonGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ProfileInput', { isEdit: true })}
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
    // Android에서는 낮은 alpha의 보더 + elevation 그림자가 "회색 테두리"처럼 보일 수 있어 약간 더 핑크 톤으로 조정
    borderColor: 'rgba(255, 105, 180, 0.35)',
    padding: 32,
    overflow: 'hidden',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.05,
          shadowRadius: 25,
        }
      : {
          // Android shadow(elevation)가 회색 링/테두리처럼 보이는 경우가 있어 기본은 끔
          elevation: 0,
        }),
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
  consentLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 40,
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
    // Android에서는 낮은 alpha 보더 + 그림자가 회색 테두리처럼 보여 톤을 조금 더 핑크로
    borderColor: 'rgba(255, 105, 180, 0.40)',
    borderRadius: 16,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        }
      : {
          // Android: elevation 그림자가 회색 링처럼 보일 수 있어 비활성화
          elevation: 0,
        }),
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
