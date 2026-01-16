import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_DB_KEY = '@mock_users_db';

/**
 * Mock Authentication Server
 * 실제 서버 API 구조를 시뮬레이션
 */
export class MockAuthServer {
  /**
   * 사용자 DB 가져오기
   */
  static async getUsersDB() {
    try {
      const usersJson = await AsyncStorage.getItem(USERS_DB_KEY);
      return usersJson ? JSON.parse(usersJson) : {};
    } catch (error) {
      console.error('사용자 DB 로드 오류:', error);
      return {};
    }
  }

  /**
   * 사용자 DB 저장
   */
  static async saveUsersDB(users) {
    try {
      await AsyncStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
      return true;
    } catch (error) {
      console.error('사용자 DB 저장 오류:', error);
      return false;
    }
  }

  /**
   * 회원가입
   * @param {string} userId - 사용자 ID
   * @param {string} password - 비밀번호
   * @param {string} phoneNumber - 전화번호
   * @param {string} verificationCode - 인증번호
   * @returns {Promise<{success: boolean, message: string, user?: object}>}
   */
  static async signup(userId, password, phoneNumber, verificationCode) {
    try {
      // 입력 검증
      if (!userId || !password || !phoneNumber || !verificationCode) {
        return {
          success: false,
          message: '모든 필드를 입력해주세요.',
        };
      }

      // ID 길이 검증
      if (userId.length < 4) {
        return {
          success: false,
          message: 'ID는 4자 이상이어야 합니다.',
        };
      }

      // 비밀번호 길이 검증
      if (password.length < 6) {
        return {
          success: false,
          message: '비밀번호는 6자 이상이어야 합니다.',
        };
      }

      // 전화번호 검증 (간단한 검증)
      if (phoneNumber.length < 10) {
        return {
          success: false,
          message: '올바른 전화번호를 입력해주세요.',
        };
      }

      // 인증번호 검증 (Mock)
      if (verificationCode !== '123456') {
        return {
          success: false,
          message: '인증번호가 일치하지 않습니다.',
        };
      }

      const users = await this.getUsersDB();

      // ID 중복 체크
      if (users[userId]) {
        return {
          success: false,
          message: '이미 존재하는 ID입니다.',
        };
      }

      // 전화번호 중복 체크
      const phoneExists = Object.values(users).some(
        (user) => user.phoneNumber === phoneNumber
      );
      if (phoneExists) {
        return {
          success: false,
          message: '이미 등록된 전화번호입니다.',
        };
      }

      // 새 사용자 생성
      const newUser = {
        userId,
        password, // 실제로는 해시해야 하지만 Mock이므로 평문
        phoneNumber,
        createdAt: new Date().toISOString(),
        hasProfile: false,
        hasIdealType: false,
      };

      users[userId] = newUser;
      await this.saveUsersDB(users);

      console.log('✅ 회원가입 성공:', userId);

      return {
        success: true,
        message: '회원가입이 완료되었습니다.',
        user: {
          userId: newUser.userId,
          phoneNumber: newUser.phoneNumber,
          createdAt: newUser.createdAt,
        },
      };
    } catch (error) {
      console.error('회원가입 오류:', error);
      return {
        success: false,
        message: '회원가입 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 로그인
   * @param {string} userId - 사용자 ID
   * @param {string} password - 비밀번호
   * @returns {Promise<{success: boolean, message: string, user?: object}>}
   */
  static async login(userId, password) {
    try {
      if (!userId || !password) {
        return {
          success: false,
          message: 'ID와 비밀번호를 입력해주세요.',
        };
      }

      const users = await this.getUsersDB();
      const user = users[userId];

      if (!user) {
        return {
          success: false,
          message: '존재하지 않는 ID입니다.',
        };
      }

      if (user.password !== password) {
        return {
          success: false,
          message: '비밀번호가 일치하지 않습니다.',
        };
      }

      console.log('✅ 로그인 성공:', userId);

      return {
        success: true,
        message: '로그인 성공',
        user: {
          userId: user.userId,
          phoneNumber: user.phoneNumber,
          hasProfile: user.hasProfile || false,
          hasIdealType: user.hasIdealType || false,
          createdAt: user.createdAt,
        },
      };
    } catch (error) {
      console.error('로그인 오류:', error);
      return {
        success: false,
        message: '로그인 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 비밀번호 재설정을 위한 본인 확인
   * @param {string} userId - 사용자 ID
   * @param {string} phoneNumber - 전화번호
   * @param {string} verificationCode - 인증번호
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async verifyUserForReset(userId, phoneNumber, verificationCode) {
    try {
      if (!userId || !phoneNumber || !verificationCode) {
        return {
          success: false,
          message: '모든 필드를 입력해주세요.',
        };
      }

      // 인증번호 검증 (Mock)
      if (verificationCode !== '123456') {
        return {
          success: false,
          message: '인증번호가 일치하지 않습니다.',
        };
      }

      const users = await this.getUsersDB();
      const user = users[userId];

      if (!user) {
        return {
          success: false,
          message: '존재하지 않는 ID입니다.',
        };
      }

      if (user.phoneNumber !== phoneNumber) {
        return {
          success: false,
          message: '등록된 전화번호와 일치하지 않습니다.',
        };
      }

      console.log('✅ 본인 확인 성공:', userId);

      return {
        success: true,
        message: '본인 확인이 완료되었습니다.',
      };
    } catch (error) {
      console.error('본인 확인 오류:', error);
      return {
        success: false,
        message: '본인 확인 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 비밀번호 재설정
   * @param {string} userId - 사용자 ID
   * @param {string} newPassword - 새 비밀번호
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async resetPassword(userId, newPassword) {
    try {
      if (!userId || !newPassword) {
        return {
          success: false,
          message: 'ID와 새 비밀번호를 입력해주세요.',
        };
      }

      if (newPassword.length < 6) {
        return {
          success: false,
          message: '비밀번호는 6자 이상이어야 합니다.',
        };
      }

      const users = await this.getUsersDB();
      const user = users[userId];

      if (!user) {
        return {
          success: false,
          message: '존재하지 않는 ID입니다.',
        };
      }

      // 비밀번호 업데이트
      user.password = newPassword;
      user.passwordUpdatedAt = new Date().toISOString();

      users[userId] = user;
      await this.saveUsersDB(users);

      console.log('✅ 비밀번호 재설정 성공:', userId);

      return {
        success: true,
        message: '비밀번호가 재설정되었습니다.',
      };
    } catch (error) {
      console.error('비밀번호 재설정 오류:', error);
      return {
        success: false,
        message: '비밀번호 재설정 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 사용자 프로필 업데이트 플래그
   * @param {string} userId - 사용자 ID
   * @param {boolean} hasProfile - 프로필 존재 여부
   * @param {boolean} hasIdealType - 이상형 존재 여부
   */
  static async updateUserFlags(userId, hasProfile, hasIdealType) {
    try {
      const users = await this.getUsersDB();
      const user = users[userId];

      if (!user) {
        return false;
      }

      if (hasProfile !== undefined) {
        user.hasProfile = hasProfile;
      }
      if (hasIdealType !== undefined) {
        user.hasIdealType = hasIdealType;
      }

      users[userId] = user;
      await this.saveUsersDB(users);

      return true;
    } catch (error) {
      console.error('사용자 플래그 업데이트 오류:', error);
      return false;
    }
  }

  /**
   * 사용자 정보 조회
   * @param {string} userId - 사용자 ID
   * @returns {Promise<object|null>}
   */
  static async getUserInfo(userId) {
    try {
      const users = await this.getUsersDB();
      const user = users[userId];

      if (!user) {
        return null;
      }

      return {
        userId: user.userId,
        phoneNumber: user.phoneNumber,
        hasProfile: user.hasProfile || false,
        hasIdealType: user.hasIdealType || false,
        createdAt: user.createdAt,
      };
    } catch (error) {
      console.error('사용자 정보 조회 오류:', error);
      return null;
    }
  }

  /**
   * 테스트용 계정 생성
   */
  static async createTestAccounts() {
    const testAccounts = [
      { userId: 'test1', password: 'test123', phoneNumber: '01012345678' },
      { userId: 'test2', password: 'test123', phoneNumber: '01087654321' },
    ];

    const users = await this.getUsersDB();

    for (const account of testAccounts) {
      if (!users[account.userId]) {
        users[account.userId] = {
          ...account,
          createdAt: new Date().toISOString(),
          hasProfile: false,
          hasIdealType: false,
        };
      }
    }

    await this.saveUsersDB(users);
    console.log('✅ 테스트 계정 생성 완료');
  }

  /**
   * 모든 사용자 삭제 (개발용)
   */
  static async clearAllUsers() {
    await AsyncStorage.removeItem(USERS_DB_KEY);
    console.log('✅ 모든 사용자 삭제 완료');
  }
}

export const mockAuthServer = MockAuthServer;
