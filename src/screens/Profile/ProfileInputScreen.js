import React, { useState, useContext, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { Button, Input, RadioButton } from '../../components/common';
import {
  PersonalitySelector,
  MBTISelector,
  InterestSelector,
  HeightInput,
} from '../../components/profile';
import { AuthContext } from '../../context';
import { COLORS } from '../../constants';

const ProfileInputScreen = ({ navigation }) => {
  const { updateProfile, userProfile } = useContext(AuthContext);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [personalities, setPersonalities] = useState([]);
  const [mbti, setMBTI] = useState('');
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);

  // 기존 프로필 불러오기
  useEffect(() => {
    if (userProfile) {
      console.log('📝 기존 프로필 불러오기:', userProfile);
      setAge(userProfile.age?.toString() || '');
      setGender(userProfile.gender || '');
      setHeight(userProfile.height?.toString() || '');
      setPersonalities(userProfile.personalities || []);
      setMBTI(userProfile.mbti || '');
      setInterests(userProfile.interests || []);
    }
  }, [userProfile]);

  // 유효성 검증
  const validateForm = () => {
    if (!age || parseInt(age) < 19 || parseInt(age) > 100) {
      Alert.alert('알림', '올바른 나이를 입력해주세요 (19-100)');
      return false;
    }

    if (!gender) {
      Alert.alert('알림', '성별을 선택해주세요');
      return false;
    }

    if (!height || parseInt(height) < 140 || parseInt(height) > 220) {
      Alert.alert('알림', '올바른 키를 입력해주세요 (140-220cm)');
      return false;
    }

    if (personalities.length === 0) {
      Alert.alert('알림', '성격을 최소 1개 선택해주세요');
      return false;
    }

    if (!mbti) {
      Alert.alert('알림', 'MBTI를 선택해주세요');
      return false;
    }

    if (interests.length === 0) {
      Alert.alert('알림', '관심사를 최소 1개 선택해주세요');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const profile = {
        age: parseInt(age),
        gender,
        height: parseInt(height),
        personalities,
        mbti,
        interests,
      };

      await updateProfile(profile);
      Alert.alert('성공', '프로필이 저장되었습니다', [
        {
          text: '확인',
          onPress: () => navigation.navigate('IdealTypeInput'),
        },
      ]);
    } catch (error) {
      Alert.alert('오류', '프로필 저장에 실패했습니다');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>프로필 입력</Text>
      <Text style={styles.subtitle}>나에 대한 정보를 입력해주세요</Text>

      {/* 나이 */}
      <Input
        label="나이"
        value={age}
        onChangeText={setAge}
        placeholder="예: 25"
        keyboardType="number-pad"
        maxLength={3}
      />

      {/* 성별 */}
      <View style={styles.section}>
        <Text style={styles.label}>성별</Text>
        <View style={styles.row}>
          <RadioButton
            label="남성"
            selected={gender === 'male'}
            onPress={() => setGender('male')}
            style={styles.radioButton}
          />
          <RadioButton
            label="여성"
            selected={gender === 'female'}
            onPress={() => setGender('female')}
            style={styles.radioButton}
          />
        </View>
      </View>

      {/* 키 */}
      <HeightInput value={height} onChangeText={setHeight} />

      {/* 성격 */}
      <PersonalitySelector
        selectedPersonalities={personalities}
        onSelect={setPersonalities}
      />

      {/* MBTI */}
      <MBTISelector selectedMBTI={mbti} onSelect={setMBTI} />

      {/* 관심사 */}
      <InterestSelector
        selectedInterests={interests}
        onSelect={setInterests}
      />

      {/* 제출 버튼 */}
      <Button
        title="다음"
        onPress={handleSubmit}
        loading={loading}
        style={styles.submitBtn}
      />

      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 30,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 20,
  },
  radioButton: {
    marginVertical: 0,
  },
  submitBtn: {
    marginVertical: 30,
  },
  spacer: {
    height: 20,
  },
});

export default ProfileInputScreen;
