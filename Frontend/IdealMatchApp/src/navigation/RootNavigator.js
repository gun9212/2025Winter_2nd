import React, { useContext, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthContext } from '../context';
import { 
  LoginScreen, 
  SignupScreen, 
  PasswordResetScreen 
} from '../screens/Auth';
import { ProfileInputScreen } from '../screens/Profile';
import { IdealTypeInputScreen } from '../screens/IdealType';
import { MainScreen } from '../screens/Main';
import { ActivityIndicator, View, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../constants';
import { apiClient } from '../services/api/apiClient';

const Stack = createStackNavigator();

const RootNavigator = () => {
  const { 
    isLoggedIn, 
    isLoading, 
    userProfile, 
    idealType,
    login,
    signup,
    verifyUserForReset,
    resetPassword,
  } = useContext(AuthContext);
  
  const navigationRef = useRef(null);
  const hasCheckedProfile = useRef(false);

  // 로그인 후 프로필/이상형 상태 확인 및 화면 전환
  useEffect(() => {
    // 로그인하지 않았거나 로딩 중이면 실행하지 않음
    if (!isLoggedIn || isLoading || !navigationRef.current) {
      // 로그아웃 시 플래그 리셋
      if (!isLoggedIn) {
        hasCheckedProfile.current = false;
      }
      return;
    }
    
    // 프로필/이상형이 저장되면 재확인하도록 플래그 리셋
    if (userProfile || idealType) {
      hasCheckedProfile.current = false;
    }
    
    if (!hasCheckedProfile.current) {
      hasCheckedProfile.current = true;
      
      const checkAndNavigate = async () => {
        try {
          // 현재 화면 확인
          const currentRoute = navigationRef.current?.getCurrentRoute();
          const currentRouteName = currentRoute?.name;
          
          // 이미 프로필 입력 화면이나 이상형 입력 화면에 있으면 처리하지 않음
          if (currentRouteName === 'ProfileInput' || currentRouteName === 'IdealTypeInput') {
            return;
          }
          
          // 프로필 완성도 확인
          const completenessResult = await apiClient.checkProfileCompleteness();
          
          if (!completenessResult.success) {
            console.log('⚠️ 프로필 완성도 확인 실패 - 로그인 상태 확인 필요');
            // 프로필 완성도 확인 실패 시 로그인 화면으로 이동하지 않음
            // (이미 로그인된 상태이므로)
            return;
          }
          
          const hasProfile = completenessResult.profile_complete;
          const hasIdealType = completenessResult.ideal_type_complete;
          
          // 프로필이 없으면 프로필 입력 화면으로 이동
          if (!hasProfile) {
            setTimeout(() => {
              Alert.alert(
                '프로필 입력 필요',
                '당신의 프로필을 입력해주세요',
                [
                  {
                    text: '확인',
                    onPress: () => {
                      navigationRef.current?.navigate('ProfileInput');
                    },
                  },
                ]
              );
            }, 300);
            return;
          }
          
          // 프로필은 있지만 이상형이 없으면 이상형 입력 화면으로 이동
          if (!hasIdealType) {
            setTimeout(() => {
              Alert.alert(
                '이상형 입력 필요',
                '이상형을 입력하세요',
                [
                  {
                    text: '확인',
                    onPress: () => {
                      navigationRef.current?.navigate('IdealTypeInput');
                    },
                  },
                ]
              );
            }, 300);
            return;
          }
          
          // 프로필과 이상형이 모두 있으면 메인 화면 유지
          if (currentRouteName !== 'Main') {
            navigationRef.current?.navigate('Main');
          }
        } catch (error) {
          console.error('프로필 확인 오류:', error);
          // 에러 발생 시에도 로그인 화면으로 이동하지 않음
        }
      };
      
      // 약간의 지연 후 확인 (메인 화면이 먼저 렌더링되도록)
      setTimeout(() => {
        checkAndNavigate();
      }, 500);
    }
  }, [isLoggedIn, isLoading, userProfile, idealType]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // 로그인 핸들러
  const handleLogin = async (userId, password) => {
    try {
      const result = await login(userId, password);
      if (!result.success) {
        throw new Error(result.message);
      }
    } catch (error) {
      throw error;
    }
  };

  // 회원가입 핸들러
  const handleSignup = async (userId, password, email, verificationCode, navigation) => {
    try {
      const result = await signup(userId, password, email, verificationCode);
      
      // result가 없거나 success가 false인 경우 에러 발생
      if (!result || !result.success) {
        throw new Error(result?.message || result?.error || '회원가입에 실패했습니다.');
      }
      
      // 회원가입 성공 - result를 반환하여 SignupScreen에서 처리하도록 함
      return result;
    } catch (error) {
      console.error('회원가입 핸들러 오류:', error);
      throw error;
    }
  };

  // 비밀번호 재설정용 본인 확인 핸들러
  const handleVerifyUser = async (userId, phoneNumber, verificationCode) => {
    try {
      const result = await verifyUserForReset(userId, phoneNumber, verificationCode);
      if (!result.success) {
        throw new Error(result.message);
      }
      return result;
    } catch (error) {
      throw error;
    }
  };

  // 비밀번호 재설정 핸들러
  const handleResetPassword = async (userId, newPassword) => {
    try {
      const result = await resetPassword(userId, newPassword);
      if (!result.success) {
        throw new Error(result.message);
      }
      return result;
    } catch (error) {
      throw error;
    }
  };

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          // ========== 로그인 전 ==========
          <>
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>
            <Stack.Screen name="Signup">
              {(props) => (
                <SignupScreen 
                  {...props} 
                  onSignup={(userId, password, email, verificationCode) => 
                    handleSignup(userId, password, email, verificationCode, props.navigation)
                  } 
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="PasswordReset">
              {(props) => (
                <PasswordResetScreen
                  {...props}
                  onVerifyUser={handleVerifyUser}
                  onResetPassword={handleResetPassword}
                />
              )}
            </Stack.Screen>
          </>
        ) : (
          // ========== 로그인 후 ==========
          // 로그인하면 무조건 메인 화면으로 이동
          // 프로필/이상형 설정은 메인 화면의 버튼을 통해 접근
          <>
            <Stack.Screen name="Main" component={MainScreen} />
            <Stack.Screen name="ProfileInput" component={ProfileInputScreen} />
            <Stack.Screen name="IdealTypeInput" component={IdealTypeInputScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});

export default RootNavigator;
