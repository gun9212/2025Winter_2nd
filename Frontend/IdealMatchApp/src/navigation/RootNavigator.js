import React, { useContext } from 'react';
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
    <NavigationContainer>
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
