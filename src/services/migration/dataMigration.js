import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGACY_KEYS = {
  USER_PROFILE: '@user_profile',
  IDEAL_TYPE: '@ideal_type',
};

const MIGRATION_FLAG_KEY = '@data_migration_completed';

/**
 * 데이터 마이그레이션 서비스
 * 레거시 전화번호 인증 기반 데이터를 새로운 ID/PW 기반 시스템으로 마이그레이션
 */
export class DataMigration {
  /**
   * 마이그레이션 필요 여부 확인
   */
  static async needsMigration() {
    try {
      // 이미 마이그레이션 완료됐는지 확인
      const migrationCompleted = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
      if (migrationCompleted === 'true') {
        return false;
      }

      // 레거시 데이터가 있는지 확인
      const legacyProfile = await AsyncStorage.getItem(LEGACY_KEYS.USER_PROFILE);
      const legacyIdealType = await AsyncStorage.getItem(LEGACY_KEYS.IDEAL_TYPE);

      return !!(legacyProfile || legacyIdealType);
    } catch (error) {
      console.error('마이그레이션 필요 여부 확인 오류:', error);
      return false;
    }
  }

  /**
   * 레거시 데이터 가져오기
   */
  static async getLegacyData() {
    try {
      const profileJson = await AsyncStorage.getItem(LEGACY_KEYS.USER_PROFILE);
      const idealTypeJson = await AsyncStorage.getItem(LEGACY_KEYS.IDEAL_TYPE);

      return {
        profile: profileJson ? JSON.parse(profileJson) : null,
        idealType: idealTypeJson ? JSON.parse(idealTypeJson) : null,
      };
    } catch (error) {
      console.error('레거시 데이터 로드 오류:', error);
      return { profile: null, idealType: null };
    }
  }

  /**
   * 사용자 계정과 레거시 데이터 연결
   * @param {string} userId - 사용자 ID
   * @param {object} legacyProfile - 레거시 프로필 데이터
   * @param {object} legacyIdealType - 레거시 이상형 데이터
   */
  static async migrateToUser(userId, legacyProfile, legacyIdealType) {
    try {
      console.log('🔄 데이터 마이그레이션 시작:', userId);

      // 새로운 키로 저장
      if (legacyProfile) {
        await AsyncStorage.setItem(
          `@user_profile_${userId}`,
          JSON.stringify(legacyProfile)
        );
        console.log('✅ 프로필 마이그레이션 완료');
      }

      if (legacyIdealType) {
        await AsyncStorage.setItem(
          `@ideal_type_${userId}`,
          JSON.stringify(legacyIdealType)
        );
        console.log('✅ 이상형 마이그레이션 완료');
      }

      // 마이그레이션 완료 플래그 설정
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');

      console.log('✅ 데이터 마이그레이션 완료');
      return true;
    } catch (error) {
      console.error('데이터 마이그레이션 오류:', error);
      return false;
    }
  }

  /**
   * 레거시 데이터 삭제 (마이그레이션 후)
   */
  static async cleanupLegacyData() {
    try {
      await AsyncStorage.removeItem(LEGACY_KEYS.USER_PROFILE);
      await AsyncStorage.removeItem(LEGACY_KEYS.IDEAL_TYPE);
      console.log('✅ 레거시 데이터 정리 완료');
    } catch (error) {
      console.error('레거시 데이터 정리 오류:', error);
    }
  }

  /**
   * 자동 마이그레이션 (로그인 시 호출)
   * @param {string} userId - 로그인한 사용자 ID
   */
  static async autoMigrate(userId) {
    try {
      const needsMigration = await this.needsMigration();
      if (!needsMigration) {
        console.log('ℹ️ 마이그레이션 불필요');
        return { migrated: false };
      }

      console.log('🔄 자동 마이그레이션 시작...');
      const { profile, idealType } = await this.getLegacyData();

      if (!profile && !idealType) {
        console.log('⚠️ 마이그레이션할 데이터 없음');
        await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
        return { migrated: false };
      }

      // 마이그레이션 실행
      const success = await this.migrateToUser(userId, profile, idealType);

      if (success) {
        // 레거시 데이터 정리
        await this.cleanupLegacyData();
        return {
          migrated: true,
          profile,
          idealType,
        };
      }

      return { migrated: false };
    } catch (error) {
      console.error('자동 마이그레이션 오류:', error);
      return { migrated: false };
    }
  }

  /**
   * 마이그레이션 플래그 리셋 (개발용)
   */
  static async resetMigrationFlag() {
    await AsyncStorage.removeItem(MIGRATION_FLAG_KEY);
    console.log('✅ 마이그레이션 플래그 리셋 완료');
  }
}

export const dataMigration = DataMigration;
