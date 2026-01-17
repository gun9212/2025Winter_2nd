import React, { useState, useContext, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { Button, Input } from '../../components/common';
import {
  PersonalitySelector,
  InterestSelector,
  MBTISelector,
} from '../../components/profile';
import GenderSelector from '../../components/profile/GenderSelector';
import { AuthContext } from '../../context';
import { COLORS } from '../../constants';

const IdealTypeInputScreen = ({ navigation }) => {
  const { userProfile, idealType, updateIdealType } = useContext(AuthContext);
  const [heightMin, setHeightMin] = useState('');
  const [heightMax, setHeightMax] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [personalities, setPersonalities] = useState([]);
  const [preferredMBTI, setPreferredMBTI] = useState([]);
  const [preferredGender, setPreferredGender] = useState([]);
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
      setPreferredMBTI(idealType.preferredMBTI || []);
      // preferred_gender는 배열로 저장됨 (예: ['M', 'F'] 또는 ['M'])
      setPreferredGender(idealType.preferredGender || idealType.preferred_gender || []);
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
      Alert.alert('알림', '성격을 최소 1개 선택해주세요');
      return false;
    }

    // MBTI 검증
    if (preferredMBTI.length === 0) {
      Alert.alert('알림', 'MBTI를 최소 1개 선택해주세요');
      return false;
    }

    // 성별 검증
    if (preferredGender.length === 0) {
      Alert.alert('알림', '성별을 최소 1개 선택해주세요');
      return false;
    }

    // 관심사 검증
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
      const idealType = {
        minHeight: parseInt(heightMin),
        maxHeight: parseInt(heightMax),
        minAge: parseInt(ageMin),
        maxAge: parseInt(ageMax),
        preferredPersonalities: personalities,
        preferredMBTI: preferredMBTI,
        preferredGender: preferredGender, // 배열 형태 (예: ['M', 'F'] 또는 ['M'])
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
      // 에러 메시지 추출 (안전하게 처리)
      let errorMessage = '이상형 저장에 실패했습니다';
      
      try {
        if (error) {
          if (typeof error === 'string') {
            errorMessage = error;
          } else if (error?.message) {
            errorMessage = error.message;
          } else if (error?.error) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error?.message) {
              errorMessage = error.error.message;
            } else {
              // 순환 참조를 피하기 위해 안전하게 문자열화
              const errorStr = JSON.stringify(error.error, Object.getOwnPropertyNames(error.error));
              errorMessage = errorStr !== '{}' ? errorStr : '알 수 없는 오류가 발생했습니다.';
            }
          } else {
            // 순환 참조를 피하기 위해 안전하게 문자열화
            try {
              const errorStr = JSON.stringify(error, Object.getOwnPropertyNames(error));
              if (errorStr !== '{}') {
                errorMessage = errorStr;
              }
            } catch (jsonError) {
              // JSON.stringify 실패 시 기본 메시지 사용
              errorMessage = error.toString() || '알 수 없는 오류가 발생했습니다.';
            }
          }
        }
      } catch (parseError) {
        console.error('에러 파싱 실패:', parseError);
        errorMessage = error?.toString() || '이상형 저장에 실패했습니다';
      }
      
      Alert.alert('오류', errorMessage);
      
      // 상세 로그 출력
      console.error('========== 이상형 저장 오류 ==========');
      console.error('에러 객체:', error);
      console.error('에러 타입:', typeof error);
      console.error('에러 문자열:', error?.toString());
      console.error('에러 message:', error?.message);
      if (error?.stack) {
        console.error('에러 스택:', error.stack);
      }
      console.error('=====================================');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>이상형 입력</Text>
      <Text style={styles.subtitle}>이상형 조건을 입력해주세요</Text>

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

      {/* 성별 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>성별</Text>
        <GenderSelector
          selectedGenders={preferredGender}
          onSelect={setPreferredGender}
        />
      </View>

      {/* 성격 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>성격</Text>
        <PersonalitySelector
          selectedPersonalities={personalities}
          onSelect={setPersonalities}
        />
      </View>

      {/* MBTI */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MBTI</Text>
        <MBTISelector
          selectedMBTI={preferredMBTI}
          onSelect={setPreferredMBTI}
          multiple={true}
        />
      </View>

      {/* 관심사 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>관심사</Text>
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
