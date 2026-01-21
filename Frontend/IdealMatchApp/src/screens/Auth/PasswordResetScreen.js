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
import { apiClient } from '../../services/api/apiClient';
import { COLORS } from '../../constants';

const LOGO_IMAGE = require('../../images/login_logo.png');

const PasswordResetScreen = ({ navigation, onVerifyUser, onResetPassword }) => {
  const [step, setStep] = useState(1); // 1: 본인확인, 2: 비밀번호 재설정

  // Step 1: 본인 확인
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resetToken, setResetToken] = useState(null); // API 17에서 받은 reset_token 저장

  // Step 2: 비밀번호 재설정
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

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
    if (!userId.trim()) {
      Alert.alert('알림', 'ID를 입력해주세요.');
      return;
    }

    if (!email || !email.includes('@')) {
      Alert.alert('알림', '올바른 이메일을 입력해주세요.');
      return;
    }

    // 기존 타이머 정리
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setSendingCode(true);
    try {
      const result = await apiClient.passwordResetRequest(userId.trim(), email);
      
      if (!result.success) {
        throw new Error(result.error || result.message || '인증번호 전송에 실패했습니다.');
      }
      
      setCodeSent(true);
      setTimer(120); // 2분(120초) 타이머 초기화 및 시작
      
      Alert.alert('인증번호 전송', `${email}로 인증번호가 전송되었습니다.`);
    } catch (error) {
      Alert.alert('오류', error.message || '인증번호 전송에 실패했습니다.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerify = async () => {
    if (!userId.trim()) {
      Alert.alert('알림', 'ID를 입력해주세요.');
      return;
    }

    if (!email || !email.includes('@')) {
      Alert.alert('알림', '이메일을 입력해주세요.');
      return;
    }

    if (!verificationCode) {
      Alert.alert('알림', '인증번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const result = await apiClient.passwordResetVerify(userId.trim(), email, verificationCode);
      
      if (!result.success) {
        throw new Error(result.error || result.message || '본인 확인에 실패했습니다.');
      }
      
      // reset_token 저장
      setResetToken(result.reset_token);
      setVerified(true);
      
      // 잠시 후 Step 2로 이동
      setTimeout(() => {
        setStep(2);
      }, 1500);
    } catch (error) {
      Alert.alert('오류', error.message || '본인 확인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      Alert.alert('알림', '새 비밀번호를 입력해주세요.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('알림', '비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!resetToken) {
      Alert.alert('오류', '인증이 완료되지 않았습니다. 다시 시도해주세요.');
      return;
    }

    setLoading(true);
    try {
      const result = await apiClient.passwordReset(resetToken, newPassword);
      
      if (!result.success) {
        throw new Error(result.error || result.message || '비밀번호 재설정에 실패했습니다.');
      }
      
      Alert.alert('완료', '비밀번호가 재설정되었습니다.', [
        {
          text: '확인',
          onPress: () => navigation.navigate('Login'),
        },
      ]);
    } catch (error) {
      Alert.alert('오류', error.message || '비밀번호 재설정에 실패했습니다.');
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
          <Text style={styles.title}>비밀번호 재설정</Text>
          <Text style={styles.subtitle}>
            {step === 1 ? 'Please verify your identity' : 'Create new password'}
          </Text>
        </View>

        {/* 폼 */}
        <View style={styles.form}>
          {step === 1 ? (
            <>
              {/* Step 1: 본인 확인 */}
              <View style={styles.verifySection}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>ID</Text>
                  <TextInput
                    style={styles.input}
                    value={userId}
                    onChangeText={setUserId}
                    placeholder="Enter your ID"
                    placeholderTextColor="#CBD5E1"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textAlign="center"
                  />
                </View>

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
                      style={[styles.sendCodeButton, (sendingCode || !email || !userId.trim()) && styles.sendCodeButtonDisabled]}
                      onPress={handleSendCode}
                      disabled={sendingCode || !email || !userId.trim()}
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

                {codeSent && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>VERIFICATION CODE</Text>
                    <View style={styles.codeInputContainer}>
                      <TextInput
                        style={[styles.input, styles.codeInput]}
                        value={verificationCode}
                        onChangeText={setVerificationCode}
                        placeholder="000000"
                        placeholderTextColor="#CBD5E1"
                        keyboardType="number-pad"
                        maxLength={6}
                        textAlign="center"
                      />
                      {timer > 0 && (
                        <View style={styles.timerContainer}>
                          <Text style={styles.timerText}>{formatTime(timer)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
                  onPress={handleVerify}
                  disabled={loading || !codeSent || !verificationCode}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.verifyButtonText}>Verify Identity</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* 인증 성공 표시 */}
              {verified && (
                <View style={styles.verificationSuccess}>
                  <View style={styles.checkCircle}>
                    <Text style={styles.checkIcon}>✓</Text>
                  </View>
                  <Text style={styles.verificationText}>Identity verified successfully</Text>
                </View>
              )}
            </>
          ) : (
            <>
              {/* Step 2: 비밀번호 재설정 */}
              <View style={styles.verificationSuccess}>
                <View style={styles.checkCircle}>
                  <Text style={styles.checkIcon}>✓</Text>
                </View>
                <Text style={styles.verificationText}>Identity verified successfully</Text>
              </View>

              <View style={styles.passwordSection}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>NEW PASSWORD</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="••••••••"
                      placeholderTextColor="#CBD5E1"
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      textAlign="center"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                    >
                      <Text style={styles.eyeIcon}>{showNewPassword ? '👁️' : '👁️‍🗨️'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>CONFIRM PASSWORD</Text>
                  <TextInput
                    style={styles.input}
                    value={newPasswordConfirm}
                    onChangeText={setNewPasswordConfirm}
                    placeholder="••••••••"
                    placeholderTextColor="#CBD5E1"
                    secureTextEntry
                    autoCapitalize="none"
                    textAlign="center"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.resetButton, loading && styles.resetButtonDisabled]}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.resetButtonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Back to Login */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>
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
    width: 56,
    height: 56,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text || '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textSecondary || '#94A3B8',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  form: {
    width: '100%',
  },
  verifySection: {
    marginBottom: 16,
  },
  passwordSection: {
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary || '#94A3B8',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingBottom: 4,
  },
  input: {
    width: '100%',
    height: 48,
    paddingHorizontal: 24,
    paddingVertical: 12,
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
  phoneContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneInput: {
    paddingRight: 120,
  },
  sendCodeButton: {
    position: 'absolute',
    right: 6,
    height: 36,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primary || '#FF7EA6',
    borderRadius: 18,
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
    fontSize: 9,
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
  timerContainer: {
    position: 'absolute',
    right: 20,
    top: 12,
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
  passwordContainer: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: 20,
    top: 14,
    padding: 8,
  },
  eyeIcon: {
    fontSize: 18,
    color: '#CBD5E1',
  },
  verifyButton: {
    width: '100%',
    height: 48,
    backgroundColor: COLORS.primary || '#FF7EA6',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary || '#FF7EA6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 6,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  verificationSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 182, 193, 0.5)',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: 'bold',
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  resetButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  resetButtonDisabled: {
    opacity: 0.5,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    marginTop: 'auto',
    paddingVertical: 32,
    alignItems: 'center',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backArrow: {
    fontSize: 14,
    color: COLORS.textSecondary || '#94A3B8',
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary || '#94A3B8',
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

export default PasswordResetScreen;
