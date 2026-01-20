import React, { createContext, useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
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
  }, []);

  // 프로필 자동 로드 (로그인 후 또는 사용자 정보가 있을 때)
  useEffect(() => {
    if (currentUser?.userId && isLoggedIn) {
      loadProfile();
    }
  }, [currentUser?.userId, isLoggedIn]);

  const loadAuthStatus = async () => {
    try {
      console.log('🔍 저장된 데이터 불러오는 중...');
      
      // JWT 토큰 확인 (토큰이 있어야만 로그인 상태로 인식)
      const accessToken = await StorageService.getAccessToken();
      
      if (!accessToken) {
        console.log('❌ JWT 토큰 없음 - 로그인 필요');
        // 토큰이 없으면 사용자 정보도 삭제
        await StorageService.clearCurrentUser();
        setIsLoggedIn(false);
        setIsLoading(false);
        return;
      }
      
      // 현재 로그인된 사용자 확인
      const user = await StorageService.getCurrentUser();
      
      if (user && user.userId) {
        console.log('✅ 현재 사용자:', user.userId);
        setCurrentUser(user);
        
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
        
        // 프로필 완성도 확인 (토큰 유효성도 함께 확인)
        try {
          const completenessResult = await apiClient.checkProfileCompleteness();
          if (completenessResult.success) {
            // 토큰이 유효하면 로그인 상태 유지
            setIsLoggedIn(true);
          } else {
            // 토큰이 만료되었을 수 있음
            console.log('⚠️ 프로필 완성도 확인 실패 (토큰 만료 가능)');
            await StorageService.clearTokens();
            await StorageService.clearCurrentUser();
            setIsLoggedIn(false);
          }
        } catch (error) {
          console.log('⚠️ 프로필 완성도 확인 실패 (토큰 만료 가능):', error.message);
          // 토큰이 만료되었을 수 있으므로 로그아웃 처리
          await StorageService.clearTokens();
          await StorageService.clearCurrentUser();
          setIsLoggedIn(false);
        }
      } else {
        console.log('❌ 사용자 정보 없음 - 로그인 필요');
        // 사용자 정보가 없으면 토큰도 삭제
        await StorageService.clearTokens();
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Failed to load auth status:', error);
      // 오류 발생 시 로그아웃 상태로 설정
      await StorageService.clearTokens();
      await StorageService.clearCurrentUser();
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 로그인
   */
  const login = async (userId, password) => {
    try {
      // 이전 계정의 토큰과 사용자 정보 삭제 (다른 계정으로 로그인 시 충돌 방지)
      await StorageService.clearTokens();
      await StorageService.clearCurrentUser();
      setCurrentUser(null);
      setIsLoggedIn(false);
      
      // 실제 백엔드 API 호출
      const result = await apiClient.login(userId, password);
      
      if (!result.success) {
        // 이메일 인증 미완료인 경우
        if (result.email_verified === false) {
          const error = new Error(result.message || result.error || '이메일 인증이 완료되지 않았습니다.');
          error.email_verified = false;
          error.email = result.email;
          error.requires_email_verification = result.requires_email_verification || true;
          throw error;
        }
        throw new Error(result.message || result.error || '로그인에 실패했습니다.');
      }
      
      // 사용자 정보 저장
      const userData = {
        userId: result.user.username,
        id: result.user.id,
        phoneNumber: result.user.phone_number,
      };
      await StorageService.saveCurrentUser(userData);
      setCurrentUser(userData);
      setIsLoggedIn(true);
      
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
      return {
        success: true,
        message: '로그인 성공',
        user: userData,
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  /**
   * 회원가입
   */
  const signup = async (userId, password, email, verificationCode) => {
    try {
      // 실제 백엔드 API 호출
      const result = await apiClient.register(userId, password, email);
      
      if (!result.success) {
        throw new Error(result.message || result.error || '회원가입에 실패했습니다.');
      }
      
      // 회원가입 성공 후 자동 로그인은 하지 않음
      // 프로필 입력 화면으로 이동하도록 함
      console.log('✅ 회원가입 완료:', userId);
      return {
        success: true,
        message: '회원가입이 완료되었습니다.',
        user: result.user,
      };
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  /**
   * 비밀번호 재설정을 위한 본인 확인
   * (현재는 PasswordResetScreen에서 직접 apiClient를 사용하므로 사용되지 않음)
   */
  const verifyUserForReset = async (userId, email, verificationCode) => {
    try {
      const result = await apiClient.passwordResetVerify(userId, email, verificationCode);
      
      if (!result.success) {
        throw new Error(result.error || result.message || '본인 확인에 실패했습니다.');
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
   * (현재는 PasswordResetScreen에서 직접 apiClient를 사용하므로 사용되지 않음)
   */
  const resetPassword = async (resetToken, newPassword) => {
    try {
      const result = await apiClient.passwordReset(resetToken, newPassword);
      
      if (!result.success) {
        throw new Error(result.error || result.message || '비밀번호 재설정에 실패했습니다.');
      }
      
      console.log('✅ 비밀번호 재설정 완료');
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
      // 토큰 삭제
      await StorageService.clearTokens();
      // 현재 사용자 정보만 삭제 (프로필/이상형은 유지)
      await StorageService.clearCurrentUser();
      setIsLoggedIn(false);
      setCurrentUser(null);
      setUserProfile(null);
      setIdealType(null);
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
      // Refresh Token 만료 시 로그아웃 처리
      if (error.message === 'REFRESH_TOKEN_EXPIRED' || error.message?.includes('REFRESH_TOKEN_EXPIRED')) {
        console.log('🔄 Refresh Token 만료: 자동 로그아웃');
        await logout();
      }
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
      
      console.log('✅ 프로필 업데이트 완료');
    } catch (error) {
      console.error('Update profile error:', error);
      // Refresh Token 만료 시 로그아웃 처리
      if (error.message === 'REFRESH_TOKEN_EXPIRED' || error.message?.includes('REFRESH_TOKEN_EXPIRED')) {
        console.log('🔄 Refresh Token 만료: 자동 로그아웃');
        await logout();
      }
      throw error;
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
      
      // 실제 백엔드 API 호출
      const result = await apiClient.updateIdealType(ideal);
      
      if (!result.success) {
        // 에러 메시지 추출 (객체인 경우 처리)
        let errorMessage = '이상형 프로필 업데이트에 실패했습니다.';
        if (result.error) {
          if (typeof result.error === 'string') {
            errorMessage = result.error;
          } else if (typeof result.error === 'object') {
            errorMessage = JSON.stringify(result.error);
          }
        }
        throw new Error(errorMessage);
      }
      
      // 응답 데이터를 프론트엔드 형식으로 변환
      const responseData = result.data || result;
      if (!responseData) {
        throw new Error('이상형 프로필 저장 응답 데이터가 없습니다.');
      }
      
      const updatedIdealType = {
        minHeight: responseData.height_min,
        maxHeight: responseData.height_max,
        minAge: responseData.age_min,
        maxAge: responseData.age_max,
        preferred_gender: responseData.preferred_gender || 'A',
        preferredMBTI: responseData.preferred_mbti || [],
        preferredPersonalities: responseData.preferred_personality || [],
        preferredInterests: responseData.preferred_interests || [],
        matchThreshold: responseData.match_threshold || 3,
      };
      
      // 로컬 저장소에도 저장
      await StorageService.saveIdealType(updatedIdealType, currentUser.userId);
      setIdealType(updatedIdealType);
      
      console.log('✅ 이상형 업데이트 완료');
    } catch (error) {
      console.error('Update ideal type error:', error);
      // Refresh Token 만료 시 로그아웃 처리
      if (error.message === 'REFRESH_TOKEN_EXPIRED' || error.message?.includes('REFRESH_TOKEN_EXPIRED')) {
        console.log('🔄 Refresh Token 만료: 자동 로그아웃');
        await logout();
      }
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
