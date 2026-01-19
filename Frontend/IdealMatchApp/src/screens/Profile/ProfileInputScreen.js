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

const ProfileInputScreen = ({ navigation, route }) => {
  const { updateProfile, userProfile } = useContext(AuthContext);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [personalities, setPersonalities] = useState([]);
  const [mbti, setMBTI] = useState('');
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 프로필이 처음 생성되는지 수정인지 확인
  const isEditMode = route?.params?.isEdit || (userProfile && userProfile.age && userProfile.gender);

  // 기존 프로필 불러오기
  useEffect(() => {
    if (userProfile) {
      console.log('📝 기존 프로필 불러오기:', userProfile);
      setAge(userProfile.age?.toString() || '');
      setGender(userProfile.gender === 'M' ? 'male' : userProfile.gender === 'F' ? 'female' : userProfile.gender || '');
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
        gender, // 'male' or 'female'
        height: parseInt(height),
        personalities, // 프론트엔드에서는 personalities 사용
        mbti,
        interests,
      };

      await updateProfile(profile);
      
      Alert.alert('성공', '프로필이 저장되었습니다', [
        {
          text: '확인',
          onPress: () => {
            // 처음 프로필 생성 시: 이상형 입력 화면으로 이동
            // 프로필 수정 시: 메인 화면으로 이동
            if (isEditMode) {
              navigation.navigate('Main');
            } else {
              navigation.navigate('IdealTypeInput');
            }
          },
        },
      ]);
    } catch (error) {
      const errorMessage = error.message || '프로필 저장에 실패했습니다';
      Alert.alert('오류', errorMessage);
      console.error('프로필 저장 오류:', error);
    } finally {
      setLoading(false);
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
        <Text style={styles.headerTitle}>내 프로필을 입력해주세요</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 나이 */}
        <View style={styles.section}>
          <Text style={styles.label}>나이</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="나이를 입력하세요"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={styles.inputSuffix}>세</Text>
          </View>
        </View>

        {/* 성별 */}
        <View style={styles.section}>
          <Text style={styles.label}>성별</Text>
          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[
                styles.genderButton,
                gender === 'male' && styles.genderButtonActive,
              ]}
              onPress={() => setGender('male')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.genderText,
                  gender === 'male' && styles.genderTextActive,
                ]}
              >
                남성
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.genderButton,
                gender === 'female' && styles.genderButtonActive,
              ]}
              onPress={() => setGender('female')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.genderText,
                  gender === 'female' && styles.genderTextActive,
                ]}
              >
                여성
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 키 */}
        <View style={styles.section}>
          <Text style={styles.label}>키</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              placeholder="키를 입력하세요"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={styles.inputSuffix}>cm</Text>
          </View>
        </View>

        {/* 성격 */}
        <View style={styles.section}>
          <Text style={styles.label}>성격</Text>
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

        {/* MBTI */}
        <View style={[styles.section, styles.mbtiSection]}>
          <Text style={styles.label}>MBTI</Text>
          <View style={styles.mbtiGrid}>
            {MBTI_TYPES.map((mbtiType, index) => {
              const isSelected = mbti === mbtiType;
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
                  onPress={() => setMBTI(mbtiType)}
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

        {/* 관심사 */}
        <View style={[styles.section, styles.interestsSection, styles.lastSection]}>
          <Text style={[styles.label, styles.interestsLabel]}>관심사</Text>
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
            {loading ? '저장 중...' : '프로필 저장하기'}
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
  inputContainer: {
    position: 'relative',
  },
  input: {
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
  inputSuffix: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -10 }],
    fontSize: 16,
    fontWeight: '500',
    color: '#94A3B8',
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
    width: (Math.min(Dimensions.get('window').width, 480) - 48 - 24) / 4, // 최대 너비 480px 고려, padding(24*2) - gap(8*3) / 4
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
    marginTop: 1,
  },
});

export default ProfileInputScreen;
