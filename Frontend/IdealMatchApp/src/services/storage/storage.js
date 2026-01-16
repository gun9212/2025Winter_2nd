import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  CURRENT_USER: '@current_user', // 현재 로그인된 사용자 정보
  USER_PROFILE: '@user_profile', // 레거시 키 (마이그레이션용)
  IDEAL_TYPE: '@ideal_type', // 레거시 키 (마이그레이션용)
  PHONE_NUMBER: '@phone_number',
  IS_AUTHENTICATED: '@is_authenticated',
  MATCH_HISTORY: '@match_history',
};

// userId별 키 생성 헬퍼
const getUserProfileKey = (userId) => `@user_profile_${userId}`;
const getIdealTypeKey = (userId) => `@ideal_type_${userId}`;
const getMatchHistoryKey = (userId) => `@match_history_${userId}`;

export const StorageService = {
  // ========== 현재 사용자 관리 ==========
  
  async saveCurrentUser(user) {
    await AsyncStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  },
  
  async getCurrentUser() {
    const data = await AsyncStorage.getItem(KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },
  
  async clearCurrentUser() {
    await AsyncStorage.removeItem(KEYS.CURRENT_USER);
  },
  
  // ========== 사용자별 프로필 관리 ==========
  
  async saveUserProfile(profile, userId = null) {
    if (!userId) {
      // userId가 없으면 현재 사용자 확인
      const currentUser = await this.getCurrentUser();
      userId = currentUser?.userId;
    }
    
    if (userId) {
      // userId별로 저장
      await AsyncStorage.setItem(getUserProfileKey(userId), JSON.stringify(profile));
    } else {
      // 레거시: userId 없으면 기존 키에 저장
      await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
    }
  },
  
  async getUserProfile(userId = null) {
    if (!userId) {
      const currentUser = await this.getCurrentUser();
      userId = currentUser?.userId;
    }
    
    if (userId) {
      const data = await AsyncStorage.getItem(getUserProfileKey(userId));
      if (data) return JSON.parse(data);
    }
    
    // 레거시 데이터 확인
    const legacyData = await AsyncStorage.getItem(KEYS.USER_PROFILE);
    return legacyData ? JSON.parse(legacyData) : null;
  },
  
  // ========== 사용자별 이상형 관리 ==========
  
  async saveIdealType(idealType, userId = null) {
    if (!userId) {
      const currentUser = await this.getCurrentUser();
      userId = currentUser?.userId;
    }
    
    if (userId) {
      await AsyncStorage.setItem(getIdealTypeKey(userId), JSON.stringify(idealType));
    } else {
      // 레거시
      await AsyncStorage.setItem(KEYS.IDEAL_TYPE, JSON.stringify(idealType));
    }
  },
  
  async getIdealType(userId = null) {
    if (!userId) {
      const currentUser = await this.getCurrentUser();
      userId = currentUser?.userId;
    }
    
    if (userId) {
      const data = await AsyncStorage.getItem(getIdealTypeKey(userId));
      if (data) return JSON.parse(data);
    }
    
    // 레거시 데이터 확인
    const legacyData = await AsyncStorage.getItem(KEYS.IDEAL_TYPE);
    return legacyData ? JSON.parse(legacyData) : null;
  },
  
  // 인증 상태
  async setAuthenticated(isAuth) {
    await AsyncStorage.setItem(KEYS.IS_AUTHENTICATED, JSON.stringify(isAuth));
  },
  
  async isAuthenticated() {
    const data = await AsyncStorage.getItem(KEYS.IS_AUTHENTICATED);
    return data ? JSON.parse(data) : false;
  },
  
  // 전화번호
  async savePhoneNumber(phoneNumber) {
    await AsyncStorage.setItem(KEYS.PHONE_NUMBER, phoneNumber);
  },
  
  async getPhoneNumber() {
    return await AsyncStorage.getItem(KEYS.PHONE_NUMBER);
  },
  
  // 매칭 히스토리
  async addMatchHistory(match) {
    const history = await this.getMatchHistory();
    history.push({ ...match, timestamp: Date.now() });
    await AsyncStorage.setItem(KEYS.MATCH_HISTORY, JSON.stringify(history));
  },
  
  async getMatchHistory() {
    const data = await AsyncStorage.getItem(KEYS.MATCH_HISTORY);
    return data ? JSON.parse(data) : [];
  },
  
  // 전체 삭제
  async clearAll() {
    await AsyncStorage.clear();
  },
};
