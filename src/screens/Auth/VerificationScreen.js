import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import Button from '../../components/common/Button';
import { MockAuthService } from '../../services/mock/mockAuthService';
import { AuthContext } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';

const VerificationScreen = ({ route, navigation }) => {
  const { phoneNumber } = route.params;
  const { login } = useContext(AuthContext);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    try {
      await MockAuthService.verifyCode(phoneNumber, code);
      // 인증 성공 시 프로필 입력으로 이동 (로그인은 나중에)
      navigation.reset({
        index: 0,
        routes: [{ name: 'ProfileInput' }],
      });
    } catch (error) {
      Alert.alert('오류', error.message || '인증에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>인증번호를 입력하세요</Text>
      <Text style={styles.subtitle}>{phoneNumber}</Text>
      <Text style={styles.hint}>개발용 인증번호: 123456</Text>
      <TextInput
        style={styles.input}
        placeholder="123456"
        keyboardType="number-pad"
        value={code}
        onChangeText={setCode}
        maxLength={6}
      />
      <Button
        title="확인"
        onPress={handleVerify}
        loading={loading}
        disabled={code.length !== 6}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 10,
  },
  hint: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 10,
    padding: 15,
    fontSize: 24,
    letterSpacing: 10,
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default VerificationScreen;
