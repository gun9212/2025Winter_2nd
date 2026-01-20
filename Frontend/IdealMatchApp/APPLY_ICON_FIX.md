# 아이콘 적용 완료 가이드

## Xcode에서 아이콘 설정 완료 ✅

이제 다음 단계를 진행하세요:

### 1. Xcode에서 Clean Build Folder
- Xcode 메뉴: `Product` → `Clean Build Folder` (Shift + Cmd + K)
- 또는: `Product` → `Clean Build Folder` 클릭

### 2. 시뮬레이터/기기에서 앱 완전 삭제
**시뮬레이터:**
- 홈 화면에서 앱 아이콘 길게 누르기
- "앱 삭제" 선택
- 시뮬레이터 재시작 (Device → Erase All Content and Settings)

**실제 기기:**
- 설정 → 일반 → iPhone 저장 공간 → IdealMatchApp 찾기 → 삭제
- 또는 홈 화면에서 앱 아이콘 길게 누르기 → 삭제

### 3. Xcode에서 Build & Run
- `Product` → `Build` (Cmd + B)
- `Product` → `Run` (Cmd + R)

### 4. 확인
- 홈 화면에서 새 아이콘이 표시되는지 확인
- 알림을 발생시켜 알림 아이콘이 새 아이콘으로 표시되는지 확인

## 중요 사항

- iOS는 알림 아이콘을 별도로 설정할 수 없습니다
- 알림에는 앱 아이콘이 자동으로 표시됩니다
- 앱 아이콘이 제대로 설정되어 있으면 알림에도 자동으로 반영됩니다

## 문제가 계속되면

1. Xcode 완전 종료 후 재시작
2. 시뮬레이터 완전 재시작
3. 앱 완전 삭제 후 재설치
4. 기기 재부팅 (실제 기기인 경우)
