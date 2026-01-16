# Frontend

이상형 매칭 앱 프론트엔드 프로젝트

## 디렉토리 구조

```
Frontend/
├── IdealMatchApp/          # React Native 프로젝트
│   ├── src/               # 소스 코드
│   ├── ios/               # iOS 네이티브 코드
│   ├── android/           # Android 네이티브 코드
│   └── ...
└── docs/                  # 문서
    ├── APPLICATION_LOGIC.md              # 애플리케이션 로직
    ├── BACKGROUND_LOCATION_GUIDE.md      # 백그라운드 위치 추적 가이드
    ├── LOGIN_SYSTEM_TEST_GUIDE.md        # 로그인 시스템 테스트 가이드
    └── TROUBLESHOOTING_GUIDE.md          # 문제 해결 가이드
```

## 프로젝트 정보

- **프로젝트명**: IdealMatchApp
- **프레임워크**: React Native 0.72.6
- **플랫폼**: iOS (Android는 호환성 문제로 포기)

## 시작하기

### 필수 요구사항

- Node.js 16+
- Xcode (iOS 개발)
- CocoaPods

### 설치 및 실행

```bash
# 프로젝트 디렉토리로 이동
cd IdealMatchApp

# 의존성 설치
npm install

# iOS Pod 설치
cd ios && pod install && cd ..

# iOS 시뮬레이터에서 실행
npm run ios
```

## 주요 기능

- ✅ ID/PW 기반 로그인
- ✅ 회원가입 (전화번호 인증)
- ✅ 비밀번호 재설정
- ✅ 사용자 프로필 관리
- ✅ 이상형 설정
- ✅ 위치 기반 매칭
- ✅ 백그라운드 매칭
- ✅ 매칭 알림 (진동 + 시스템 알림)

## 문서

자세한 내용은 `docs/` 디렉토리의 문서들을 참고하세요.

- `APPLICATION_LOGIC.md`: 애플리케이션의 핵심 로직 설명
- `BACKGROUND_LOCATION_GUIDE.md`: 백그라운드 위치 추적 구현 가이드
- `LOGIN_SYSTEM_TEST_GUIDE.md`: 로그인 시스템 테스트 방법
- `TROUBLESHOOTING_GUIDE.md`: 개발 중 발생한 문제들과 해결 방법
- `BACKEND_MIGRATION_GUIDE.md`: 백엔드 연동 시 삭제 대상 파일 가이드 ⭐

## 문제 해결

개발 중 문제가 발생하면 `docs/TROUBLESHOOTING_GUIDE.md`를 참고하세요.

## 백엔드 연동 시 주의사항

백엔드 서버와 연동할 때는 Mock 서비스들을 제거해야 합니다. 자세한 내용은 `docs/BACKEND_MIGRATION_GUIDE.md`를 참고하세요.

### 빠른 참고: 삭제 대상

- `src/services/mock/` 디렉토리 전체
- `src/services/api/mockApiClient.js`
- 모든 Mock 관련 import 문

자세한 마이그레이션 절차와 코드 변경 가이드는 `docs/BACKEND_MIGRATION_GUIDE.md`를 확인하세요.
