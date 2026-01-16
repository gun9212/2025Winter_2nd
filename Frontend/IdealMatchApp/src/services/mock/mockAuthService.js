// Mock AWS SNS 인증
export const MockAuthService = {
  // 인증번호 전송 (시뮬레이션)
  async sendVerificationCode(phoneNumber) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 개발용 인증번호는 항상 "123456"
        console.log('📱 Mock 인증번호: 123456');
        resolve({
          success: true,
          message: '인증번호가 전송되었습니다.',
        });
      }, 1000);
    });
  },
  
  // 인증번호 확인 (시뮬레이션)
  async verifyCode(phoneNumber, code) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (code === '123456') {
          resolve({
            success: true,
            token: 'mock_token_' + phoneNumber,
            userId: 'user_' + Date.now(),
          });
        } else {
          reject({
            success: false,
            message: '인증번호가 일치하지 않습니다.',
          });
        }
      }, 1000);
    });
  },
};
