import React, { useState, useContext, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { Button, Input } from '../../components/common';
import {
  PersonalitySelector,
  InterestSelector,
} from '../../components/profile';
import { AuthContext } from '../../context';
import { COLORS } from '../../constants';

const IdealTypeInputScreen = ({ navigation }) => {
  const { userProfile, idealType, updateIdealType } = useContext(AuthContext);
  const [heightMin, setHeightMin] = useState('');
  const [heightMax, setHeightMax] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [personalities, setPersonalities] = useState([]);
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);

  // 기존 이상형 불러오기
  useEffect(() => {
    if (idealType) {
      console.log('💝 기존 이상형 불러오기:', idealType);
      setAgeMin(idealType.minAge?.toString() || '');
      setAgeMax(idealType.maxAge?.toString() || '');
      setHeightMin(idealType.minHeight?.toString() || '');
      setHeightMax(idealType.maxHeight?.toString() || '');
      setPersonalities(idealType.preferredPersonalities || []);
      setInterests(idealType.preferredInterests || []);
    }
  }, [idealType]);

  // 유효성 검증
  const validateForm = () => {
    // 키 범위 검증
    if (!heightMin || !heightMax) {
      Alert.alert('알림', '키 범위를 입력해주세요');
      return false;
    }

    const minHeight = parseInt(heightMin);
    const maxHeight = parseInt(heightMax);

    if (minHeight < 140 || maxHeight > 220) {
      Alert.alert('알림', '키 범위는 140-220cm 사이여야 합니다');
      return false;
    }

    if (minHeight > maxHeight) {
      Alert.alert('알림', '최소 키가 최대 키보다 클 수 없습니다');
      return false;
    }

    // 나이 범위 검증
    if (!ageMin || !ageMax) {
      Alert.alert('알림', '나이 범위를 입력해주세요');
      return false;
    }

    const minAge = parseInt(ageMin);
    const maxAge = parseInt(ageMax);

    if (minAge < 19 || maxAge > 100) {
      Alert.alert('알림', '나이 범위는 19-100세 사이여야 합니다');
      return false;
    }

    if (minAge > maxAge) {
      Alert.alert('알림', '최소 나이가 최대 나이보다 클 수 없습니다');
      return false;
    }

    // 성격 검증
    if (personalities.length === 0) {
      Alert.alert('알림', '선호하는 성격을 최소 1개 선택해주세요');
      return false;
    }

    // 관심사 검증
    if (interests.length === 0) {
      Alert.alert('알림', '선호하는 관심사를 최소 1개 선택해주세요');
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
      const idealType = {
        minHeight: parseInt(heightMin),
        maxHeight: parseInt(heightMax),
        minAge: parseInt(ageMin),
        maxAge: parseInt(ageMax),
        preferredPersonalities: personalities,
        preferredInterests: interests,
      };

      // 이상형 저장
      await updateIdealType(idealType);
      
      Alert.alert('완료', '이상형이 저장되었습니다!\n이제 매칭을 시작할 수 있습니다.', [
        {
          text: '확인',
          onPress: () => {
            // 메인 화면으로 이동
            navigation.navigate('Main');
          },
        },
      ]);
    } catch (error) {
      Alert.alert('오류', '이상형 저장에 실패했습니다');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>이상형 입력</Text>
      <Text style={styles.subtitle}>선호하는 이상형 조건을 입력해주세요</Text>

      {/* 키 범위 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>키 범위</Text>
        <View style={styles.rangeContainer}>
          <View style={styles.rangeInput}>
            <Input
              label="최소"
              value={heightMin}
              onChangeText={setHeightMin}
              placeholder="140"
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
          <Text style={styles.rangeSeparator}>~</Text>
          <View style={styles.rangeInput}>
            <Input
              label="최대"
              value={heightMax}
              onChangeText={setHeightMax}
              placeholder="220"
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
          <Text style={styles.unit}>cm</Text>
        </View>
      </View>

      {/* 나이 범위 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>나이 범위</Text>
        <View style={styles.rangeContainer}>
          <View style={styles.rangeInput}>
            <Input
              label="최소"
              value={ageMin}
              onChangeText={setAgeMin}
              placeholder="19"
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
          <Text style={styles.rangeSeparator}>~</Text>
          <View style={styles.rangeInput}>
            <Input
              label="최대"
              value={ageMax}
              onChangeText={setAgeMax}
              placeholder="100"
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
          <Text style={styles.unit}>세</Text>
        </View>
      </View>

      {/* 선호 성격 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>선호하는 성격</Text>
        <PersonalitySelector
          selectedPersonalities={personalities}
          onSelect={setPersonalities}
        />
      </View>

      {/* 선호 관심사 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>선호하는 관심사</Text>
        <InterestSelector
          selectedInterests={interests}
          onSelect={setInterests}
        />
      </View>

      {/* 제출 버튼 */}
      <Button
        title="완료"
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
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  rangeInput: {
    flex: 1,
  },
  rangeSeparator: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 30,
  },
  unit: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 30,
  },
  submitBtn: {
    marginVertical: 30,
  },
  spacer: {
    height: 20,
  },
});

export default IdealTypeInputScreen;
