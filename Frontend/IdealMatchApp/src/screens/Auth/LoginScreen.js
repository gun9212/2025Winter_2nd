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
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { COLORS } from '../../constants';

const LOGO_IMAGE = require('../../images/login_logo.png');

const LoginScreen = ({ navigation, onLogin }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!userId.trim()) {
      Alert.alert('알림', 'ID 또는 이메일을 입력해주세요.');
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
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 - 로고 이미지 */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={LOGO_IMAGE}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Wwong</Text>
          <Text style={styles.subtitle}>Spark Something New</Text>
        </View>

        {/* 로그인 폼 */}
        <View style={styles.form}>
          {/* ID or Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ID OR EMAIL</Text>
            <TextInput
              style={styles.input}
              value={userId}
              onChangeText={setUserId}
              placeholder="hello@example.com"
              placeholderTextColor="#CBD5E1"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#CBD5E1"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => navigation.navigate('PasswordReset')}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.loginButtonText}>Log In</Text>
                <Text style={styles.arrowIcon}>→</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Create Account */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            New to Wwong?{' '}
            <Text
              style={styles.footerLink}
              onPress={() => navigation.navigate('Signup')}
            >
              Create Account
            </Text>
          </Text>
        </View>

        {/* 하단 인디케이터 */}
        <View style={styles.bottomIndicator}>
          <View style={styles.indicatorBar} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent || '#FFF5F7',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
    paddingBottom: 32,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 56,
  },
  logoContainer: {
    width: 120,
    height: 120,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.text || '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textSecondary || '#94A3B8',
    letterSpacing: 3.2,
    textTransform: 'uppercase',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary || '#94A3B8',
    letterSpacing: 2,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  input: {
    width: '100%',
    height: 60,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(255, 182, 193, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    color: COLORS.text || '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 12.5,
    elevation: 2,
  },
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: 24,
    padding: 8,
  },
  eyeIcon: {
    fontSize: 20,
    color: '#CBD5E1',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary || '#94A3B8',
  },
  loginButton: {
    width: '100%',
    height: 64,
    backgroundColor: COLORS.primary || '#FF7EA6',
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: COLORS.primary || '#FF7EA6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  arrowIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary || '#94A3B8',
  },
  footerLink: {
    color: COLORS.primary || '#FF7EA6',
    fontWeight: '700',
    textDecorationLine: 'underline',
    textDecorationColor: COLORS.primary || '#FF7EA6',
  },
  bottomIndicator: {
    marginTop: 24,
    alignItems: 'center',
  },
  indicatorBar: {
    width: 128,
    height: 6,
    backgroundColor: 'rgba(255, 182, 193, 0.3)',
    borderRadius: 9999,
  },
});

export default LoginScreen;
