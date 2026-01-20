import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { AuthContext } from '../../context';
import { COLORS } from '../../constants';
import { PERSONALITY_TYPES } from '../../constants/personality';
import { INTERESTS } from '../../constants/interests';
import { MBTI_TYPES } from '../../constants/mbti';

const IdealTypeInputScreen = ({ navigation }) => {
  const { userProfile, idealType, updateIdealType } = useContext(AuthContext);
  const [heightMin, setHeightMin] = useState('');
  const [heightMax, setHeightMax] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [preferredGender, setPreferredGender] = useState('A'); // 'M', 'F', 'A'
  const [preferredMBTIs, setPreferredMBTIs] = useState([]);
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
      setPreferredGender(idealType.preferred_gender || 'A');
      setPreferredMBTIs(idealType.preferredMBTI || []);
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
      const idealTypeData = {
        minHeight: parseInt(heightMin),
        maxHeight: parseInt(heightMax),
        minAge: parseInt(ageMin),
        maxAge: parseInt(ageMax),
        preferred_gender: preferredGender,
        preferredMBTI: preferredMBTIs,
        preferredPersonalities: personalities,
        preferredInterests: interests,
      };

      // 이상형 저장
      await updateIdealType(idealTypeData);
      
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

  const toggleMBTI = (mbtiType) => {
    if (preferredMBTIs.includes(mbtiType)) {
      setPreferredMBTIs(preferredMBTIs.filter((m) => m !== mbtiType));
    } else {
      setPreferredMBTIs([...preferredMBTIs, mbtiType]);
    }
  };

  const togglePersonality = (id) => {
    if (personalities.includes(id)) {
      setPersonalities(personalities.filter((p) => p !== id));
    } else {
      setPersonalities([...personalities, id]);
    }
  };

  const toggleInterest = (id) => {
    if (interests.includes(id)) {
      setInterests(interests.filter((i) => i !== id));
    } else {
      setInterests([...interests, id]);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>이상형 조건을 입력해주세요</Text>
          <View style={styles.headerSpacer} />
        </View>

    <ScrollView 
      style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* 키 범위 */}
      <View style={styles.section}>
            <Text style={styles.label}>키 범위</Text>
        <View style={styles.rangeContainer}>
              <View style={styles.rangeInputContainer}>
                <TextInput
                  style={styles.rangeInput}
              value={heightMin}
              onChangeText={setHeightMin}
                  placeholder="최소 키"
                  placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={3}
            />
                <Text style={styles.rangeInputSuffix}>cm</Text>
          </View>
          <Text style={styles.rangeSeparator}>~</Text>
              <View style={styles.rangeInputContainer}>
                <TextInput
                  style={styles.rangeInput}
              value={heightMax}
              onChangeText={setHeightMax}
                  placeholder="최대 키"
                  placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={3}
            />
                <Text style={styles.rangeInputSuffix}>cm</Text>
          </View>
        </View>
      </View>

      {/* 나이 범위 */}
      <View style={styles.section}>
            <Text style={styles.label}>나이 범위</Text>
        <View style={styles.rangeContainer}>
              <View style={styles.rangeInputContainer}>
                <TextInput
                  style={styles.rangeInput}
              value={ageMin}
              onChangeText={setAgeMin}
                  placeholder="최소 나이"
                  placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={3}
            />
                <Text style={styles.rangeInputSuffix}>세</Text>
          </View>
          <Text style={styles.rangeSeparator}>~</Text>
              <View style={styles.rangeInputContainer}>
                <TextInput
                  style={styles.rangeInput}
              value={ageMax}
              onChangeText={setAgeMax}
                  placeholder="최대 나이"
                  placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={3}
            />
                <Text style={styles.rangeInputSuffix}>세</Text>
          </View>
        </View>
      </View>

          {/* 선호 성별 */}
      <View style={styles.section}>
            <Text style={styles.label}>선호하는 성별</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  preferredGender === 'M' && styles.genderButtonActive,
                ]}
                onPress={() => setPreferredGender('M')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.genderText,
                    preferredGender === 'M' && styles.genderTextActive,
                  ]}
                >
                  남성
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  preferredGender === 'F' && styles.genderButtonActive,
                ]}
                onPress={() => setPreferredGender('F')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.genderText,
                    preferredGender === 'F' && styles.genderTextActive,
                  ]}
                >
                  여성
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  preferredGender === 'A' && styles.genderButtonActive,
                ]}
                onPress={() => setPreferredGender('A')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.genderText,
                    preferredGender === 'A' && styles.genderTextActive,
                  ]}
                >
                  모두
                </Text>
              </TouchableOpacity>
            </View>
      </View>

      {/* 선호 성격 */}
      <View style={styles.section}>
            <Text style={styles.label}>선호하는 성격</Text>
            <View style={styles.chipContainer}>
              {PERSONALITY_TYPES.map((personality) => {
                const isSelected = personalities.includes(personality.id);
                return (
                  <TouchableOpacity
                    key={personality.id}
                    style={[
                      styles.chip,
                      isSelected ? styles.chipActive : styles.chipInactive,
                    ]}
                    onPress={() => togglePersonality(personality.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        styles.personalityChipText,
                        isSelected && styles.chipTextActive,
                      ]}
                    >
                      {personality.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 선호 MBTI */}
          <View style={[styles.section, styles.mbtiSection]}>
            <Text style={styles.label}>선호하는 MBTI</Text>
            <View style={styles.mbtiGrid}>
              {MBTI_TYPES.map((mbtiType, index) => {
                const isSelected = preferredMBTIs.includes(mbtiType);
                const isLastRow = index >= MBTI_TYPES.length - 4;
                return (
                  <TouchableOpacity
                    key={mbtiType}
                    style={[
                      styles.mbtiButton,
                      isSelected && styles.mbtiButtonActive,
                      index % 4 !== 3 && styles.mbtiButtonMargin,
                      isLastRow && styles.mbtiButtonLastRow,
                    ]}
                    onPress={() => toggleMBTI(mbtiType)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.mbtiText,
                        isSelected && styles.mbtiTextActive,
                      ]}
                    >
                      {mbtiType}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
      </View>

      {/* 선호 관심사 */}
          <View style={[styles.section, styles.interestsSection, styles.lastSection]}>
            <Text style={[styles.label, styles.interestsLabel]}>선호하는 관심사</Text>
            <View style={styles.chipContainer}>
              {INTERESTS.map((interest) => {
                const isSelected = interests.includes(interest.id);
                return (
                  <TouchableOpacity
                    key={interest.id}
                    style={[
                      styles.chip,
                      isSelected ? styles.chipActive : styles.chipInactive,
                    ]}
                    onPress={() => toggleInterest(interest.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextActive,
                      ]}
                    >
                      {interest.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
      </View>
        </ScrollView>

        {/* 하단 고정 버튼 */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.9}
          >
            <Text style={styles.submitButtonText}>
              {loading ? '저장 중...' : '이상형 저장하기'}
            </Text>
          </TouchableOpacity>
          <View style={styles.footerIndicator} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.blushPink || '#FFF0F5',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.blushPink || '#FFF0F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 12 : 24,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 240, 245, 0.8)',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginRight: 32,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 120,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  section: {
    marginBottom: 24,
  },
  mbtiSection: {
    marginBottom: 0,
  },
  interestsSection: {
    marginTop: 0,
  },
  lastSection: {
    marginBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
    marginLeft: 4,
  },
  interestsLabel: {
    marginTop: -93,
    marginBottom: 8,
  },
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rangeInputContainer: {
    flex: 1,
    position: 'relative',
  },
  rangeInput: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#FFE4E9',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingRight: 60,
    fontSize: 16,
    color: COLORS.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  rangeInputSuffix: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -10 }],
    fontSize: 16,
    fontWeight: '500',
    color: '#94A3B8',
  },
  rangeSeparator: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#FFE4E9',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  genderButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  genderTextActive: {
    color: COLORS.white,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  chipInactive: {
    backgroundColor: COLORS.white,
    borderColor: '#FFE4E9',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  personalityChipText: {
    fontSize: 12,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  mbtiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 0,
  },
  mbtiButton: {
    width: (Math.min(Dimensions.get('window').width, 480) - 48 - 24) / 4,
    aspectRatio: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#FFE4E9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mbtiButtonMargin: {
    marginRight: 8,
  },
  mbtiButtonLastRow: {
    marginBottom: 0,
  },
  mbtiButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  mbtiText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  mbtiTextActive: {
    color: COLORS.white,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.blushPink || '#FFF0F5',
  },
  submitButton: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
  },
  footerIndicator: {
    width: 128,
    height: 6,
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: 9999,
    alignSelf: 'center',
    marginTop: 16,
  },
});

export default IdealTypeInputScreen;
