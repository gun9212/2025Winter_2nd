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

const SignupScreen = ({ navigation, onSignup }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
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

    if (password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (password !== passwordConfirm) {
      Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
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
      >
        <View style={styles.header}>
          <Text style={styles.title}>회원가입</Text>
          <Text style={styles.subtitle}>새로운 계정을 만들어보세요</Text>
        </View>

        <View style={styles.form}>
          {/* ID */}
          <Input
            label="아이디"
            value={userId}
            onChangeText={setUserId}
            placeholder="4자 이상"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* 비밀번호 */}
          <Input
            label="비밀번호"
            value={password}
            onChangeText={setPassword}
            placeholder="6자 이상"
            secureTextEntry
            autoCapitalize="none"
          />

          {/* 비밀번호 확인 */}
          <Input
            label="비밀번호 확인"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            placeholder="비밀번호를 다시 입력하세요"
            secureTextEntry
            autoCapitalize="none"
          />

          {/* 전화번호 */}
          <Input
            label="전화번호"
            value={phoneNumber}
            onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
            placeholder="01012345678"
            keyboardType="phone-pad"
            maxLength={11}
          />

          {/* 인증번호 전송 버튼 */}
          <Button
            title={codeSent ? '인증번호 재전송' : '인증번호 전송'}
            onPress={handleSendCode}
            loading={sendingCode}
            disabled={sendingCode || !phoneNumber}
            style={styles.codeButton}
          />

          {/* 인증번호 입력 */}
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

          {/* 회원가입 버튼 */}
          <Button
            title="회원가입"
            onPress={handleSignup}
            loading={loading}
            disabled={loading}
            style={styles.signupButton}
          />

          {/* 로그인으로 돌아가기 */}
          <Button
            title="이미 계정이 있으신가요? 로그인"
            onPress={() => navigation.goBack()}
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
  },
  form: {
    marginBottom: 30,
  },
  codeButton: {
    backgroundColor: COLORS.secondary,
    marginBottom: 15,
  },
  signupButton: {
    marginTop: 10,
    marginBottom: 10,
  },
  backButton: {
    backgroundColor: 'transparent',
  },
  backButtonText: {
    color: COLORS.primary,
  },
});

export default SignupScreen;
