# 매칭 동의 API 테스트 가이드

## 📋 개요
매칭 동의 API (`POST /api/users/consent/`)를 테스트하는 방법을 안내합니다.

## 🔧 사전 준비

### 1. Django 서버 실행
```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

### 2. 테스트용 사용자 및 프로필 생성
프로필이 있어야 매칭 동의를 업데이트할 수 있습니다.

```bash
# 1. 회원가입
curl -X POST http://127.0.0.1:8000/api/users/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123",
    "email": "test@example.com"
  }'

# 2. 프로필 생성 (user_id=1 가정)
curl -X POST http://127.0.0.1:8000/api/users/profile/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "age": 25,
    "gender": "M",
    "height": 175,
    "mbti": "ENFP",
    "personality": ["활발한", "친절한"],
    "interests": ["영화", "음악"]
  }'
```

## 🧪 테스트 방법

### 방법 1: curl을 사용한 백엔드 직접 테스트

#### 테스트 1: 매칭 동의 활성화 (ON)
```bash
curl -X POST http://127.0.0.1:8000/api/users/consent/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "matching_consent": true
  }'
```

**예상 응답:**
```json
{
  "success": true,
  "message": "매칭 동의가 활성화되었습니다.",
  "data": {
    "matching_consent": true,
    "consent_updated_at": "2026-01-19T12:00:00.000000Z"
  }
}
```

#### 테스트 2: 매칭 동의 비활성화 (OFF)
```bash
curl -X POST http://127.0.0.1:8000/api/users/consent/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "matching_consent": false
  }'
```

**예상 응답:**
```json
{
  "success": true,
  "message": "매칭 동의가 비활성화되었습니다.",
  "data": {
    "matching_consent": false,
    "consent_updated_at": "2026-01-19T12:01:00.000000Z"
  }
}
```

#### 테스트 3: 프로필이 없는 경우 (에러)
```bash
curl -X POST http://127.0.0.1:8000/api/users/consent/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 999,
    "matching_consent": true
  }'
```

**예상 응답:**
```json
{
  "success": false,
  "error": "user_id 999에 해당하는 프로필이 없습니다. 먼저 프로필을 생성해주세요."
}
```

#### 테스트 4: 잘못된 요청 형식 (에러)
```bash
curl -X POST http://127.0.0.1:8000/api/users/consent/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1
  }'
```

**예상 응답:**
```json
{
  "success": false,
  "error": {
    "matching_consent": ["This field is required."]
  }
}
```

### 방법 2: React Native 앱에서 테스트

#### 1. 테스트 컴포넌트 생성 (선택사항)
`Frontend/IdealMatchApp/src/screens/Test/ConsentTestScreen.js` 파일 생성:

```javascript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { apiClient } from '../../services/api/apiClient';

export const ConsentTestScreen = () => {
  const [loading, setLoading] = useState(false);
  const [consentStatus, setConsentStatus] = useState(null);

  const updateConsent = async (consent) => {
    setLoading(true);
    try {
      const result = await apiClient.updateConsent(consent);
      
      if (result.success) {
        setConsentStatus(consent);
        Alert.alert('성공', result.message || '매칭 동의가 업데이트되었습니다.');
      } else {
        Alert.alert('실패', result.error || result.message);
      }
    } catch (error) {
      Alert.alert('오류', error.message || '매칭 동의 업데이트 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>매칭 동의 테스트</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>현재 상태:</Text>
        <Text style={styles.statusValue}>
          {consentStatus === null ? '알 수 없음' : consentStatus ? '활성화' : '비활성화'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.activateButton]}
        onPress={() => updateConsent(true)}
        disabled={loading}
      >
        <Text style={styles.buttonText}>매칭 동의 활성화 (ON)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.deactivateButton]}
        onPress={() => updateConsent(false)}
        disabled={loading}
      >
        <Text style={styles.buttonText}>매칭 동의 비활성화 (OFF)</Text>
      </TouchableOpacity>

      {loading && <Text style={styles.loadingText}>처리 중...</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  statusLabel: {
    fontSize: 18,
    marginRight: 10,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  activateButton: {
    backgroundColor: '#4CAF50',
  },
  deactivateButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});
```

#### 2. React Native 디버거 콘솔에서 직접 테스트
앱 실행 후 React Native 디버거 콘솔에서:

```javascript
// 매칭 동의 활성화
await apiClient.updateConsent(true);

// 매칭 동의 비활성화
await apiClient.updateConsent(false);

// 특정 user_id로 테스트 (디버그 모드)
await apiClient.updateConsent(true, 1);
```

### 방법 3: Django Admin에서 확인

1. Django Admin 접속: http://127.0.0.1:8000/admin/
2. Users > 사용자 프로필들 메뉴로 이동
3. 테스트한 사용자의 프로필 확인
4. `matching_consent` 필드와 `consent_updated_at` 필드 확인

## ✅ 검증 체크리스트

- [ ] 매칭 동의 활성화 (true) 시 성공 응답 확인
- [ ] 매칭 동의 비활성화 (false) 시 성공 응답 확인
- [ ] `consent_updated_at` 필드가 현재 시간으로 업데이트되는지 확인
- [ ] 프로필이 없는 사용자에 대한 에러 처리 확인
- [ ] 잘못된 요청 형식에 대한 에러 처리 확인
- [ ] Django Admin에서 데이터베이스 값 확인
- [ ] React Native 앱에서 API 호출 성공 확인

## 🔍 디버깅 팁

### 문제 1: "프로필이 없습니다" 에러
**해결:** 먼저 프로필을 생성해야 합니다.
```bash
curl -X POST http://127.0.0.1:8000/api/users/profile/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "age": 25,
    "gender": "M",
    "height": 175,
    "mbti": "ENFP",
    "personality": ["활발한"],
    "interests": ["영화"]
  }'
```

### 문제 2: 네트워크 오류 (React Native)
**해결:** 
- Django 서버가 실행 중인지 확인
- iOS 시뮬레이터: `API_BASE_URL`이 `http://127.0.0.1:8000/api`인지 확인
- Android 에뮬레이터: `API_BASE_URL`이 `http://10.0.2.2:8000/api`인지 확인

### 문제 3: 인증 오류 (프로덕션 모드)
**해결:** 
- 개발 모드에서는 `user_id`를 body에 포함
- 프로덕션 모드에서는 JWT 토큰을 Authorization 헤더에 포함

## 📝 참고 사항

- 개발 환경(`DEBUG=True`)에서는 인증 없이 `user_id`를 body에 포함하여 테스트 가능
- 프로덕션 환경에서는 JWT 토큰 인증이 필요
- `matching_consent`가 `true`일 때만 매칭 대상에 포함됨
- `consent_updated_at`은 매번 업데이트 시 현재 시간으로 갱신됨
