import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MockAuthService } from '../../services/mock';
import { COLORS } from '../../constants';

const LOGO_IMAGE = require('../../images/login_logo.png');

const SignupScreen = ({ navigation, onSignup }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('알림', '올바른 전화번호를 입력해주세요.');
      return;
    }

    setSendingCode(true);
    try {
      await MockAuthService.sendVerificationCode(phoneNumber);
      setCodeSent(true);
      Alert.alert('인증번호 전송', `${phoneNumber}로 인증번호가 전송되었습니다.\n테스트 코드: 123456`);
    } catch (error) {
      Alert.alert('오류', error.message || '인증번호 전송에 실패했습니다.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = () => {
    if (verificationCode === '123456') {
      setCodeVerified(true);
    } else {
      Alert.alert('오류', '인증번호가 일치하지 않습니다.');
    }
  };

  const handleSignup = async () => {
    // 유효성 검증
    if (!userId.trim()) {
      Alert.alert('알림', 'ID 또는 이메일을 입력해주세요.');
      return;
    }

    if (userId.length < 4) {
      Alert.alert('알림', 'ID는 4자 이상이어야 합니다.');
      return;
    }

    if (!password) {
      Alert.alert('알림', '비밀번호를 입력해주세요.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (!phoneNumber) {
      Alert.alert('알림', '전화번호를 입력해주세요.');
      return;
    }

    if (!codeSent) {
      Alert.alert('알림', '인증번호를 전송해주세요.');
      return;
    }

    if (!verificationCode) {
      Alert.alert('알림', '인증번호를 입력해주세요.');
      return;
    }

    if (!codeVerified) {
      Alert.alert('알림', '인증번호를 확인해주세요.');
      return;
    }

    setLoading(true);
    try {
      await onSignup(userId.trim(), password, phoneNumber, verificationCode);
    } catch (error) {
      Alert.alert('오류', error.message || '회원가입 중 오류가 발생했습니다.');
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
        {/* 헤더 - 로고 */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={LOGO_IMAGE}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your journey</Text>
        </View>

        {/* 회원가입 폼 */}
        <View style={styles.form}>
          {/* ID or Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ID OR EMAIL</Text>
            <TextInput
              style={styles.input}
              value={userId}
              onChangeText={setUserId}
              placeholder="name@example.com"
              placeholderTextColor="#CBD5E1"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textAlign="center"
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
                textAlign="center"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Phone Number with Send Code Button */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PHONE NUMBER</Text>
            <View style={styles.phoneContainer}>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                value={phoneNumber}
                onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
                placeholder="+82 10-0000-0000"
                placeholderTextColor="#CBD5E1"
                keyboardType="phone-pad"
                maxLength={11}
                textAlign="center"
              />
              <TouchableOpacity
                style={[styles.sendCodeButton, (sendingCode || !phoneNumber) && styles.sendCodeButtonDisabled]}
                onPress={handleSendCode}
                disabled={sendingCode || !phoneNumber}
              >
                {sendingCode ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendCodeButtonText}>
                    {codeSent ? 'Resend' : 'Send Code'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Verification Code */}
          {codeSent && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>VERIFICATION CODE</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={verificationCode}
                onChangeText={(text) => {
                  setVerificationCode(text);
                  if (text.length === 6) {
                    // 자동으로 인증 확인
                    if (text === '123456') {
                      setCodeVerified(true);
                    }
                  } else {
                    setCodeVerified(false);
                  }
                }}
                placeholder="123456"
                placeholderTextColor="#CBD5E1"
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
              />
            </View>
          )}

          {/* Verification Success */}
          {codeVerified && (
            <View style={styles.verificationSuccess}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.verificationText}>Identity verified successfully</Text>
            </View>
          )}

          {/* Join Button */}
          <TouchableOpacity
            style={[styles.joinButton, loading && styles.joinButtonDisabled]}
            onPress={handleSignup}
            disabled={loading || !codeVerified}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.joinButtonText}>Join Wwong</Text>
                <Text style={styles.celebrationIcon}>🎉</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Terms & Privacy */}
          <Text style={styles.termsText}>
            By tapping Join, you agree to our{' '}
            <Text style={styles.termsLink}>Terms</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
        </View>

        {/* Already have account */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text
              style={styles.footerLink}
              onPress={() => navigation.navigate('Login')}
            >
              Log In
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
    paddingTop: 60,
    paddingBottom: 32,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 64,
    height: 64,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text || '#0F172A',
    marginBottom: 4,
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
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary || '#94A3B8',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingBottom: 6,
  },
  input: {
    width: '100%',
    height: 56,
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
  },
  eyeButton: {
    position: 'absolute',
    right: 24,
    top: 18,
    padding: 8,
  },
  eyeIcon: {
    fontSize: 18,
    color: '#CBD5E1',
  },
  phoneContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneInput: {
    paddingRight: 110,
  },
  sendCodeButton: {
    position: 'absolute',
    right: 8,
    height: 40,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary || '#FF7EA6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary || '#FF7EA6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  sendCodeButtonDisabled: {
    opacity: 0.5,
  },
  sendCodeButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeInput: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 18,
    letterSpacing: 8,
  },
  verificationSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(255, 182, 193, 0.5)',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  checkIcon: {
    fontSize: 20,
    color: COLORS.primary || '#FF7EA6',
    fontWeight: 'bold',
  },
  verificationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  joinButton: {
    width: '100%',
    height: 64,
    backgroundColor: COLORS.primary || '#FF7EA6',
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    shadowColor: COLORS.primary || '#FF7EA6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  celebrationIcon: {
    fontSize: 20,
  },
  termsText: {
    fontSize: 11,
    color: COLORS.textSecondary || '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
    lineHeight: 16,
  },
  termsLink: {
    textDecorationLine: 'underline',
    color: COLORS.textSecondary || '#94A3B8',
  },
  footer: {
    marginTop: 'auto',
    paddingVertical: 40,
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
    alignItems: 'center',
    paddingBottom: 8,
  },
  indicatorBar: {
    width: 128,
    height: 6,
    backgroundColor: 'rgba(255, 182, 193, 0.3)',
    borderRadius: 9999,
  },
});

export default SignupScreen;
