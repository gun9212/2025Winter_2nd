import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Input, Button } from '../../components/common';
import { MockAuthService } from '../../services/mock';
import { COLORS } from '../../constants';

const PasswordResetScreen = ({ navigation, onVerifyUser, onResetPassword }) => {
  const [step, setStep] = useState(1); // 1: 본인확인, 2: 비밀번호 재설정

  // Step 1: 본인 확인
  const [userId, setUserId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  // Step 2: 비밀번호 재설정
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

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

  const handleVerify = async () => {
    if (!userId.trim()) {
      Alert.alert('알림', 'ID를 입력해주세요.');
      return;
    }

    if (!phoneNumber) {
      Alert.alert('알림', '전화번호를 입력해주세요.');
      return;
    }

    if (!verificationCode) {
      Alert.alert('알림', '인증번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await onVerifyUser(userId.trim(), phoneNumber, verificationCode);
      setStep(2); // 본인 확인 완료 → 비밀번호 재설정 단계로
      Alert.alert('본인 확인 완료', '새로운 비밀번호를 입력해주세요.');
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

    if (newPassword.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      await onResetPassword(userId.trim(), newPassword);
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
      >
        <View style={styles.header}>
          <Text style={styles.title}>비밀번호 재설정</Text>
          <Text style={styles.subtitle}>
            {step === 1 ? '본인 확인을 진행해주세요' : '새로운 비밀번호를 입력하세요'}
          </Text>
        </View>

        <View style={styles.form}>
          {step === 1 ? (
            <>
              {/* Step 1: 본인 확인 */}
              <Input
                label="아이디"
                value={userId}
                onChangeText={setUserId}
                placeholder="아이디를 입력하세요"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Input
                label="전화번호"
                value={phoneNumber}
                onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
                placeholder="01012345678"
                keyboardType="phone-pad"
                maxLength={11}
              />

              <Button
                title={codeSent ? '인증번호 재전송' : '인증번호 전송'}
                onPress={handleSendCode}
                loading={sendingCode}
                disabled={sendingCode || !phoneNumber}
                style={styles.codeButton}
              />

              {codeSent && (
                <Input
                  label="인증번호"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={6}
                />
              )}

              <Button
                title="본인 확인"
                onPress={handleVerify}
                loading={loading}
                disabled={loading}
                style={styles.verifyButton}
              />
            </>
          ) : (
            <>
              {/* Step 2: 비밀번호 재설정 */}
              <View style={styles.successInfo}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successText}>본인 확인이 완료되었습니다</Text>
                <Text style={styles.successSubtext}>ID: {userId}</Text>
              </View>

              <Input
                label="새 비밀번호"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="6자 이상"
                secureTextEntry
                autoCapitalize="none"
              />

              <Input
                label="새 비밀번호 확인"
                value={newPasswordConfirm}
                onChangeText={setNewPasswordConfirm}
                placeholder="비밀번호를 다시 입력하세요"
                secureTextEntry
                autoCapitalize="none"
              />

              <Button
                title="비밀번호 재설정"
                onPress={handleResetPassword}
                loading={loading}
                disabled={loading}
                style={styles.resetButton}
              />
            </>
          )}

          {/* 로그인으로 돌아가기 */}
          <Button
            title="로그인으로 돌아가기"
            onPress={() => navigation.navigate('Login')}
            style={styles.backButton}
            textStyle={styles.backButtonText}
          />
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
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.darkgray,
    textAlign: 'center',
  },
  form: {
    marginBottom: 30,
  },
  codeButton: {
    backgroundColor: COLORS.secondary,
    marginBottom: 15,
  },
  verifyButton: {
    marginTop: 10,
  },
  successInfo: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    marginBottom: 30,
  },
  successIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  successSubtext: {
    fontSize: 14,
    color: COLORS.darkgray,
  },
  resetButton: {
    marginTop: 10,
    marginBottom: 10,
  },
  backButton: {
    backgroundColor: 'transparent',
    marginTop: 10,
  },
  backButtonText: {
    color: COLORS.primary,
  },
});

export default PasswordResetScreen;
