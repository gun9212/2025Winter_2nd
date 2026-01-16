import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Input, Button } from '../../components/common';
import { COLORS } from '../../constants';

const LoginScreen = ({ navigation, onLogin }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!userId.trim()) {
      Alert.alert('알림', 'ID를 입력해주세요.');
      return;
    }

    if (!password) {
      Alert.alert('알림', '비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await onLogin(userId.trim(), password);
    } catch (error) {
      Alert.alert('오류', error.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 로고/타이틀 */}
        <View style={styles.header}>
          <Text style={styles.logo}>💝</Text>
          <Text style={styles.title}>이상형 매칭</Text>
          <Text style={styles.subtitle}>주변에서 이상형을 만나보세요</Text>
        </View>

        {/* 로그인 폼 */}
        <View style={styles.form}>
          <Input
            label="아이디"
            value={userId}
            onChangeText={setUserId}
            placeholder="아이디를 입력하세요"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label="비밀번호"
            value={password}
            onChangeText={setPassword}
            placeholder="비밀번호를 입력하세요"
            secureTextEntry
            autoCapitalize="none"
          />

          <Button
            title="로그인"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.loginButton}
          />
        </View>

        {/* 하단 버튼들 */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Signup')}
            style={styles.footerButton}
          >
            <Text style={styles.footerButtonText}>회원가입</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            onPress={() => navigation.navigate('PasswordReset')}
            style={styles.footerButton}
          >
            <Text style={styles.footerButtonText}>비밀번호 재설정</Text>
          </TouchableOpacity>
        </View>

        {/* 테스트 계정 안내 */}
        <View style={styles.testInfo}>
          <Text style={styles.testInfoText}>테스트 계정</Text>
          <Text style={styles.testInfoDetail}>ID: test1, PW: test123</Text>
          <Text style={styles.testInfoDetail}>ID: test2, PW: test123</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.darkgray,
  },
  form: {
    marginBottom: 30,
  },
  loginButton: {
    marginTop: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  footerButton: {
    padding: 10,
  },
  footerButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.lightgray,
    marginHorizontal: 20,
  },
  testInfo: {
    alignItems: 'center',
    marginTop: 20,
    padding: 15,
    backgroundColor: COLORS.white,
    borderRadius: 10,
  },
  testInfoText: {
    fontSize: 12,
    color: COLORS.darkgray,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  testInfoDetail: {
    fontSize: 11,
    color: COLORS.darkgray,
  },
});

export default LoginScreen;
