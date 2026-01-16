import React, { createContext, useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { mockAuthServer } from '../services/mock';
import { dataMigration } from '../services/migration';

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

  const loadAuthStatus = async () => {
    try {
      console.log('🔍 저장된 데이터 불러오는 중...');
      
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
      console.log('✅ 로그아웃 완료');
    } catch (error) {
      console.error('Logout error:', error);
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
      
      await StorageService.saveUserProfile(profile, currentUser.userId);
      setUserProfile(profile);
      
      // 서버에 플래그 업데이트
      await mockAuthServer.updateUserFlags(currentUser.userId, true, undefined);
      
      console.log('✅ 프로필 업데이트 완료');
    } catch (error) {
      console.error('Update profile error:', error);
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
      
      await StorageService.saveIdealType(ideal, currentUser.userId);
      setIdealType(ideal);
      
      // 서버에 플래그 업데이트
      await mockAuthServer.updateUserFlags(currentUser.userId, undefined, true);
      
      console.log('✅ 이상형 업데이트 완료');
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
