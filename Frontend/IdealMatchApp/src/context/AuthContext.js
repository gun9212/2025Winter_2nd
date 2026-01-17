import React, { createContext, useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { mockAuthServer } from '../services/mock';
import { dataMigration } from '../services/migration';
import { apiClient } from '../services/api/apiClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null); // { userId, phoneNumber, ... }
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [idealType, setIdealType] = useState(null);

  useEffect(() => {
    loadAuthStatus();
    // 테스트 계정 생성
    mockAuthServer.createTestAccounts();
  }, []);

  // 프로필 및 이상형 프로필 자동 로드 (로그인 후 또는 사용자 정보가 있을 때)
  useEffect(() => {
    if (currentUser?.userId && isLoggedIn) {
      loadProfile();
      loadIdealType();
    }
  }, [currentUser?.userId, isLoggedIn]);

  const loadAuthStatus = async () => {
    try {
      console.log('🔍 저장된 데이터 불러오는 중...');
      
      // 현재 로그인된 사용자 확인
      const user = await StorageService.getCurrentUser();
      
      if (user && user.userId) {
        console.log('✅ 현재 사용자:', user.userId);
        setCurrentUser(user);
        
        // apiClient에 현재 사용자 username 설정 (Django user_id 조회를 위해)
        apiClient.setCurrentUsername(user.userId);
        console.log('👤 apiClient에 사용자 설정:', user.userId);
        
        // 해당 사용자의 프로필과 이상형 불러오기
        const profile = await StorageService.getUserProfile(user.userId);
        const ideal = await StorageService.getIdealType(user.userId);
        
        if (profile) {
          console.log('✅ 프로필 불러오기 완료');
          setUserProfile(profile);
        }
        
        if (ideal) {
          console.log('✅ 이상형 불러오기 완료');
          setIdealType(ideal);
        }
        
        setIsLoggedIn(true);
      } else {
        console.log('❌ 로그인된 사용자 없음');
      }
    } catch (error) {
      console.error('Failed to load auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 로그인
   */
  const login = async (userId, password) => {
    try {
      const result = await mockAuthServer.login(userId, password);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      // 사용자 정보 저장
      await StorageService.saveCurrentUser(result.user);
      setCurrentUser(result.user);
      setIsLoggedIn(true);
      
      // apiClient에 현재 사용자 username 설정 (Django user_id 조회를 위해)
      apiClient.setCurrentUsername(userId);
      console.log('👤 apiClient에 사용자 설정:', userId);
      
      // 자동 마이그레이션 시도
      const migrationResult = await dataMigration.autoMigrate(userId);
      if (migrationResult.migrated) {
        console.log('✅ 레거시 데이터 마이그레이션 완료');
        if (migrationResult.profile) setUserProfile(migrationResult.profile);
        if (migrationResult.idealType) setIdealType(migrationResult.idealType);
      } else {
        // 프로필과 이상형 불러오기
        const profile = await StorageService.getUserProfile(userId);
        const ideal = await StorageService.getIdealType(userId);
        
        if (profile) setUserProfile(profile);
        if (ideal) setIdealType(ideal);
      }
      
      console.log('✅ 로그인 완료:', userId);
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  /**
   * 회원가입
   */
  const signup = async (userId, password, phoneNumber, verificationCode) => {
    try {
      const result = await mockAuthServer.signup(userId, password, phoneNumber, verificationCode);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      // 회원가입 성공 후 자동 로그인은 하지 않음
      // 프로필 입력 화면으로 이동하도록 함
      console.log('✅ 회원가입 완료:', userId);
      return result;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  /**
   * 비밀번호 재설정을 위한 본인 확인
   */
  const verifyUserForReset = async (userId, phoneNumber, verificationCode) => {
    try {
      const result = await mockAuthServer.verifyUserForReset(userId, phoneNumber, verificationCode);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      console.log('✅ 본인 확인 완료:', userId);
      return result;
    } catch (error) {
      console.error('Verify user error:', error);
      throw error;
    }
  };

  /**
   * 비밀번호 재설정
   */
  const resetPassword = async (userId, newPassword) => {
    try {
      const result = await mockAuthServer.resetPassword(userId, newPassword);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      console.log('✅ 비밀번호 재설정 완료:', userId);
      return result;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  /**
   * 로그아웃
   */
  const logout = async () => {
    try {
      // 현재 사용자 정보만 삭제 (프로필/이상형은 유지)
      await StorageService.clearCurrentUser();
      setIsLoggedIn(false);
      setCurrentUser(null);
      setUserProfile(null);
      setIdealType(null);
      
      // apiClient에서 사용자 정보 제거
      apiClient.setCurrentUsername(null);
      apiClient.userIdCache = {}; // 캐시도 초기화
      
      console.log('✅ 로그아웃 완료');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  /**
   * 프로필 조회
   */
  const loadProfile = async () => {
    try {
      if (!currentUser?.userId) {
        return;
      }
      
      console.log('📥 프로필 조회 중...');
      const result = await apiClient.getProfile();
      
      if (result.success && result.data) {
        // 백엔드 필드명을 프론트엔드 형식으로 변환
        const profile = {
          ...result.data,
          personalities: result.data.personality || [], // personality -> personalities
        };
        
        setUserProfile(profile);
        await StorageService.saveUserProfile(profile, currentUser.userId);
        console.log('✅ 프로필 로드 완료');
      }
    } catch (error) {
      console.error('Load profile error:', error);
      // 에러가 나도 기존 로컬 데이터는 유지
    }
  };

  /**
   * 프로필 업데이트
   */
  const updateProfile = async (profile) => {
    try {
      if (!currentUser?.userId) {
        throw new Error('로그인된 사용자가 없습니다.');
      }
      
      // 프론트엔드 필드명을 백엔드 형식으로 변환
      const apiProfile = {
        age: profile.age,
        gender: profile.gender === 'male' ? 'M' : profile.gender === 'female' ? 'F' : profile.gender,
        height: profile.height,
        mbti: profile.mbti,
        personality: profile.personalities || profile.personality || [], // personalities -> personality
        interests: profile.interests || [],
      };
      
      console.log('📤 프로필 저장 중...', apiProfile);
      
      // 실제 API 호출
      const result = await apiClient.updateProfile(apiProfile);
      
      if (!result.success) {
        throw new Error(result.error || '프로필 업데이트에 실패했습니다.');
      }
      
      // 응답 데이터를 프론트엔드 형식으로 변환
      const updatedProfile = {
        ...result.data,
        personalities: result.data.personality || [], // personality -> personalities
        gender: result.data.gender === 'M' ? 'male' : result.data.gender === 'F' ? 'female' : result.data.gender,
      };
      
      // 로컬 저장소에도 저장
      await StorageService.saveUserProfile(updatedProfile, currentUser.userId);
      setUserProfile(updatedProfile);
      
      // 서버에 플래그 업데이트 (선택사항 - 기존 Mock API 호출)
      try {
        await mockAuthServer.updateUserFlags(currentUser.userId, true, undefined);
      } catch (mockError) {
        // Mock API 에러는 무시 (선택사항)
        console.log('Mock API 호출 실패 (무시):', mockError);
      }
      
      console.log('✅ 프로필 업데이트 완료');
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  /**
   * 이상형 프로필 조회
   */
  const loadIdealType = async () => {
    try {
      if (!currentUser?.userId) {
        return;
      }
      
      console.log('📥 이상형 프로필 조회 중...');
      const result = await apiClient.getIdealType();
      
      if (result.success && result.data) {
        // 백엔드 필드명을 프론트엔드 형식으로 변환
          const idealTypeData = {
            minHeight: result.data.height_min,
            maxHeight: result.data.height_max,
            minAge: result.data.age_min,
            maxAge: result.data.age_max,
            preferredGender: result.data.preferred_gender || [],
            preferredMBTI: result.data.preferred_mbti || [],
            preferredPersonalities: result.data.preferred_personality || [],
            preferredInterests: result.data.preferred_interests || [],
            matchThreshold: result.data.match_threshold || 3,
            // 백엔드 필드도 함께 저장 (필요시)
            ...result.data,
          };
        
        setIdealType(idealTypeData);
        await StorageService.saveIdealType(idealTypeData, currentUser.userId);
        console.log('✅ 이상형 프로필 로드 완료');
      } else if (result.error && result.error.includes('이상형 프로필이 없습니다')) {
        // 이상형 프로필이 없는 것은 정상적인 상황 (아직 생성하지 않았을 수 있음)
        console.log('ℹ️  이상형 프로필이 없습니다. (아직 생성하지 않았을 수 있습니다)');
        // 에러로 표시하지 않고 조용히 처리
      } else if (!result.success) {
        console.warn('⚠️ 이상형 프로필 조회 실패:', result.error);
        // 기타 에러는 경고로만 표시
      }
    } catch (error) {
      // 네트워크 에러나 기타 예외적인 에러만 로그
      const errorMessage = error?.message || String(error);
      if (!errorMessage.includes('이상형 프로필이 없습니다')) {
        console.error('❌ 이상형 프로필 조회 중 예외 발생:', error);
      } else {
        console.log('ℹ️  이상형 프로필이 없습니다. (아직 생성하지 않았을 수 있습니다)');
      }
      // 에러가 나도 기존 로컬 데이터는 유지
    }
  };

  /**
   * 이상형 업데이트
   */
  const updateIdealType = async (ideal) => {
    try {
      if (!currentUser?.userId) {
        throw new Error('로그인된 사용자가 없습니다.');
      }
      
      // 프론트엔드 필드명을 백엔드 형식으로 변환
      const apiIdealType = {
        height_min: ideal.minHeight || ideal.height_min,
        height_max: ideal.maxHeight || ideal.height_max,
        age_min: ideal.minAge || ideal.age_min,
        age_max: ideal.maxAge || ideal.age_max,
        preferred_gender: ideal.preferredGender || ideal.preferred_gender || [],
        preferred_personality: ideal.preferredPersonalities || ideal.preferred_personality || [],
        preferred_interests: ideal.preferredInterests || ideal.preferred_interests || [],
        match_threshold: ideal.matchThreshold || ideal.match_threshold || 3,
        // preferred_mbti는 필수 필드이므로 항상 포함 (없으면 빈 배열)
        preferred_mbti: ideal.preferredMBTI || ideal.preferred_mbti || [],
      };
      
      console.log('📤 이상형 프로필 저장 중...', apiIdealType);
      
      // 실제 API 호출
      const result = await apiClient.updateIdealType(apiIdealType);
      
      if (!result.success) {
        // 에러 메시지 추출 (문자열 또는 객체)
        let errorMsg = '이상형 프로필 업데이트에 실패했습니다.';
        
        console.error('❌ 이상형 프로필 저장 실패 - result:', result);
        
        if (result.error) {
          if (typeof result.error === 'string') {
            errorMsg = result.error;
          } else if (result.error?.message) {
            errorMsg = result.error.message;
          } else if (typeof result.error === 'object') {
            // 객체인 경우 안전하게 문자열화
            try {
              const errorStr = JSON.stringify(result.error, Object.getOwnPropertyNames(result.error));
              if (errorStr !== '{}') {
                errorMsg = errorStr;
              }
            } catch (jsonError) {
              errorMsg = result.error.toString() || '알 수 없는 오류가 발생했습니다.';
            }
          } else {
            errorMsg = String(result.error);
          }
        }
        
        console.error('❌ 추출된 에러 메시지:', errorMsg);
        throw new Error(errorMsg);
      }
      
          // 응답 데이터를 프론트엔드 형식으로 변환
          const updatedIdealType = {
            minHeight: result.data.height_min,
            maxHeight: result.data.height_max,
            minAge: result.data.age_min,
            maxAge: result.data.age_max,
            preferredGender: result.data.preferred_gender || [],
            preferredMBTI: result.data.preferred_mbti || [],
            preferredPersonalities: result.data.preferred_personality || [],
            preferredInterests: result.data.preferred_interests || [],
            matchThreshold: result.data.match_threshold || 3,
            // 백엔드 필드도 함께 저장
            ...result.data,
          };
      
      // 로컬 저장소에도 저장
      await StorageService.saveIdealType(updatedIdealType, currentUser.userId);
      setIdealType(updatedIdealType);
      
      // 서버에 플래그 업데이트 (선택사항 - 기존 Mock API 호출)
      try {
        await mockAuthServer.updateUserFlags(currentUser.userId, undefined, true);
      } catch (mockError) {
        // Mock API 에러는 무시 (선택사항)
        console.log('Mock API 호출 실패 (무시):', mockError);
      }
      
      console.log('✅ 이상형 프로필 업데이트 완료');
    } catch (error) {
      console.error('Update ideal type error:', error);
      throw error;
    }
  };

  /**
   * 프로필과 이상형을 함께 완료 (회원가입 후 첫 설정)
   */
  const completeProfileSetup = async (profile, ideal) => {
    try {
      if (!currentUser?.userId) {
        throw new Error('로그인된 사용자가 없습니다.');
      }
      
      await StorageService.saveUserProfile(profile, currentUser.userId);
      await StorageService.saveIdealType(ideal, currentUser.userId);
      setUserProfile(profile);
      setIdealType(ideal);
      
      // 서버에 플래그 업데이트
      await mockAuthServer.updateUserFlags(currentUser.userId, true, true);
      
      console.log('✅ 프로필 설정 완료');
    } catch (error) {
      console.error('Complete profile setup error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoggedIn,
        isLoading,
        userProfile,
        idealType,
        login,
        signup,
        verifyUserForReset,
        resetPassword,
        logout,
        updateProfile,
        updateIdealType,
        completeProfileSetup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
