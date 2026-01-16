import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import Button from '../../components/common/Button';
import { MockAuthService } from '../../services/mock/mockAuthService';
import { COLORS } from '../../constants/colors';

const PhoneInputScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (phoneNumber.length < 10) {
      Alert.alert('오류', '올바른 전화번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await MockAuthService.sendVerificationCode(phoneNumber);
      Alert.alert('성공', '인증번호: 123456');
      navigation.navigate('Verification', { phoneNumber });
    } catch (error) {
      Alert.alert('오류', '인증번호 전송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>전화번호를 입력하세요</Text>
      <TextInput
        style={styles.input}
        placeholder="010-1234-5678"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        maxLength={13}
      />
      <Button
        title="인증번호 받기"
        onPress={handleSendCode}
        loading={loading}
        disabled={phoneNumber.length < 10}
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
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
});

export default PhoneInputScreen;
