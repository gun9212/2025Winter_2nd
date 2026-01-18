import React, { useState, useEffect, useRef } from 'react';
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
import { apiClient } from '../../services/api/apiClient';
import { COLORS } from '../../constants';

const LOGO_IMAGE = require('../../images/login_logo.png');

const SignupScreen = ({ navigation, onSignup }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [timer, setTimer] = useState(0); // 타이머 (초 단위)
  const timerRef = useRef(null);

  // 타이머 카운트다운 효과
  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => {
        setTimer(timer - 1);
      }, 1000);
    } else if (timer === 0 && timerRef.current) {
      clearTimeout(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timer]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendCode = async () => {
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      Alert.alert('알림', '올바른 이메일 주소를 입력해주세요.');
      return;
    }

    // 기존 타이머 정리
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setSendingCode(true);
    try {
      // 실제 백엔드 API 호출
      const result = await apiClient.sendVerificationCode(email);
      
      if (!result.success) {
        // 이미 등록된 이메일인 경우 특별 처리
        if (result.error && result.error.includes('이미 등록된 이메일')) {
          Alert.alert('알림', '이미 등록된 이메일입니다.');
        } else {
          Alert.alert('오류', result.message || result.error || '인증번호 전송에 실패했습니다.');
        }
        return;
      }
      
      setCodeSent(true);
      setTimer(result.expires_in || 120); // 2분(120초) 타이머 초기화 및 시작
      
      // 개발 환경에서만 인증번호 표시
      const devMessage = result.verification_code 
        ? `\n개발 모드 인증번호: ${result.verification_code}`
        : '';
      
      Alert.alert('인증번호 전송', `${email}로 인증번호가 전송되었습니다.${devMessage}`);
    } catch (error) {
      // 이미 등록된 이메일인 경우 특별 처리
      if (error.message && error.message.includes('이미 등록된 이메일')) {
        Alert.alert('알림', '이미 등록된 이메일입니다.');
      } else {
        Alert.alert('오류', error.message || '인증번호 전송에 실패했습니다.');
      }
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async (code = null) => {
    const codeToVerify = code || verificationCode;
    
    if (!codeToVerify) {
      Alert.alert('알림', '인증번호를 입력해주세요.');
      return;
    }

    if (codeToVerify.length !== 6) {
      return; // 6자리가 아니면 조용히 반환 (입력 중일 수 있음)
    }

    if (!email) {
      Alert.alert('알림', '이메일을 입력해주세요.');
      return;
    }

    // 이미 인증 완료된 경우 중복 호출 방지
    if (codeVerified && verificationCode === codeToVerify) {
      return;
    }

    setVerifyingCode(true);
    try {
      // 실제 백엔드 API 호출
      const result = await apiClient.verifyEmail(email, codeToVerify);
      
      if (!result.success) {
        Alert.alert('오류', result.message || result.error || '인증번호가 일치하지 않습니다.');
        setCodeVerified(false);
        return;
      }
      
      setCodeVerified(true);
      setVerificationCode(codeToVerify); // 입력된 코드 저장
      // 인증 완료 알림은 조용히 처리 (자동 인증이므로)
    } catch (error) {
      Alert.alert('오류', error.message || '인증번호 확인 중 오류가 발생했습니다.');
      setCodeVerified(false);
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSignup = async () => {
    // 유효성 검증
    if (!userId.trim()) {
      Alert.alert('알림', 'ID를 입력해주세요.');
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

    if (password.length < 8) {
      Alert.alert('알림', '비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (!email) {
      Alert.alert('알림', '이메일을 입력해주세요.');
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
      const result = await onSignup(userId.trim(), password, email, verificationCode);
      
      // 회원가입 성공 확인
      if (result && result.success) {
        // Alert 표시 후 로그인 화면으로 이동
        Alert.alert(
          '회원가입 완료', 
          '회원가입이 완료되었습니다.\n로그인 화면으로 이동합니다.',
          [
            {
              text: '확인',
              onPress: () => {
                // 회원가입 성공 후 로그인 화면으로 이동 (replace로 스택에서 제거)
                navigation.replace('Login');
              },
            },
          ],
          { cancelable: false } // 뒤로가기로 닫을 수 없도록 설정
        );
      } else {
        // result.success가 false인 경우
        Alert.alert('오류', result?.message || result?.error || '회원가입에 실패했습니다.');
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
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

          {/* Email with Send Code Button */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL</Text>
            <View style={styles.phoneContainer}>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                value={email}
                onChangeText={setEmail}
                placeholder="user@example.com"
                placeholderTextColor="#CBD5E1"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textAlign="center"
              />
              <TouchableOpacity
                style={[styles.sendCodeButton, (sendingCode || !email) && styles.sendCodeButtonDisabled]}
                onPress={handleSendCode}
                disabled={sendingCode || !email}
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
              <View style={styles.codeInputContainer}>
                <TextInput
                  style={[styles.input, styles.codeInput, codeVerified && styles.codeInputVerified]}
                  value={verificationCode}
                  onChangeText={(text) => {
                    setVerificationCode(text);
                    // 6자리 입력 시 자동으로 인증 확인
                    if (text.length === 6) {
                      handleVerifyCode(text);
                    } else {
                      setCodeVerified(false);
                    }
                  }}
                  placeholder="123456"
                  placeholderTextColor="#CBD5E1"
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign="center"
                  editable={!codeVerified && !verifyingCode}
                />
                {timer > 0 && !codeVerified && (
                  <View style={styles.timerContainer}>
                    <Text style={styles.timerText}>{formatTime(timer)}</Text>
                  </View>
                )}
                {verifyingCode && (
                  <View style={styles.verifyingContainer}>
                    <ActivityIndicator size="small" color={COLORS.primary || '#FF7EA6'} />
                  </View>
                )}
                {codeVerified && (
                  <View style={styles.verifiedContainer}>
                    <Text style={styles.verifiedIcon}>✓</Text>
                  </View>
                )}
              </View>
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
  codeInputContainer: {
    position: 'relative',
  },
  codeInput: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 18,
    letterSpacing: 8,
    paddingRight: 60,
  },
  codeInputVerified: {
    borderColor: COLORS.primary || '#FF7EA6',
    backgroundColor: 'rgba(255, 126, 166, 0.1)',
  },
  verifyingContainer: {
    position: 'absolute',
    right: 20,
    top: 18,
    padding: 8,
  },
  verifiedContainer: {
    position: 'absolute',
    right: 20,
    top: 18,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary || '#FF7EA6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timerContainer: {
    position: 'absolute',
    right: 20,
    top: 16,
    backgroundColor: 'rgba(255, 182, 193, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary || '#FF7EA6',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
