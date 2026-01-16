import { PERSONALITY_TYPES } from '../../constants/personality';
import { MBTI_TYPES } from '../../constants/mbti';
import { INTERESTS } from '../../constants/interests';

/**
 * 현재 위치 기준으로 가상 사용자 생성
 * @param {number} count - 생성할 사용자 수
 * @param {Object} centerLocation - 중심 위치 {latitude, longitude}
 * @returns {Array} 가상 사용자 배열
 */
export const generateMockUsers = (count = 20, centerLocation) => {
  const users = [];
  
  console.log(`🎭 Mock 사용자 ${count}명 생성 중... (중심: ${centerLocation.latitude}, ${centerLocation.longitude})`);
  
  for (let i = 0; i < count; i++) {
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    
    users.push({
      id: `mock_user_${i}`,
      age: getRandomAge(),
      gender: gender,
      height: getRandomHeight(gender),
      personalities: getRandomItems(
        PERSONALITY_TYPES.map(p => p.id),
        getRandomInt(1, 3) // 1-3개 선택
      ),
      mbti: getRandomMBTI(),
      interests: getRandomItems(
        INTERESTS.map(i => i.id),
        getRandomInt(2, 4) // 2-4개 선택
      ),
      location: generateRandomLocation(centerLocation),
      createdAt: new Date().toISOString(),
    });
  }
  
  console.log(`✅ Mock 사용자 ${users.length}명 생성 완료`);
  console.log(`   - 남성: ${users.filter(u => u.gender === 'male').length}명`);
  console.log(`   - 여성: ${users.filter(u => u.gender === 'female').length}명`);
  
  return users;
};

/**
 * 랜덤 나이 생성 (20-32세)
 */
const getRandomAge = () => {
  return getRandomInt(20, 32);
};

/**
 * 성별에 따른 랜덤 키 생성
 * @param {string} gender - 'male' 또는 'female'
 */
const getRandomHeight = (gender) => {
  if (gender === 'male') {
    return getRandomInt(165, 190); // 남성: 165-190cm
  } else {
    return getRandomInt(155, 175); // 여성: 155-175cm
  }
};

/**
 * 랜덤 MBTI 선택
 */
const getRandomMBTI = () => {
  return MBTI_TYPES[Math.floor(Math.random() * MBTI_TYPES.length)];
};

/**
 * 배열에서 랜덤하게 n개 선택
 * @param {Array} array - 원본 배열
 * @param {number} count - 선택할 개수
 * @returns {Array} 선택된 아이템들
 */
const getRandomItems = (array, count) => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
};

/**
 * 두 숫자 사이의 랜덤 정수 생성 (포함)
 */
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * 중심 위치 기준으로 랜덤 위치 생성
 * @param {Object} center - 중심 위치 {latitude, longitude}
 * @param {number} radiusKm - 반경 (km), 기본값 0.5km (500m)
 * @returns {Object} 랜덤 위치 {latitude, longitude}
 */
const generateRandomLocation = (center, radiusKm = 0.5) => {
  // 위도/경도를 대략적인 거리로 변환하는 계수
  // 위도 1도 ≈ 111km
  // 경도 1도 ≈ 111km * cos(위도)
  const radiusInDegrees = radiusKm / 111.0;
  
  // 랜덤 각도와 거리
  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  
  // 극좌표를 직교좌표로 변환
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);
  
  // 위도 보정 (경도는 위도에 따라 변함)
  const newLat = center.latitude + y;
  const newLon = center.longitude + x / Math.cos(center.latitude * Math.PI / 180);
  
  return {
    latitude: newLat,
    longitude: newLon,
  };
};

/**
 * Mock 사용자의 위치를 랜덤하게 이동 (시뮬레이션)
 * @param {Array} users - 사용자 배열
 * @param {Object} centerLocation - 중심 위치
 * @returns {Array} 위치가 업데이트된 사용자 배열
 */
export const updateMockUserLocations = (users, centerLocation) => {
  return users.map(user => ({
    ...user,
    location: generateRandomLocation(centerLocation),
  }));
};

/**
 * 특정 사용자 정보를 사람이 읽기 쉬운 형태로 변환
 * @param {Object} user - 사용자 객체
 * @returns {string} 포맷된 사용자 정보
 */
export const formatUserInfo = (user) => {
  return `${user.age}세 ${user.gender === 'male' ? '남성' : '여성'}, ${user.height}cm, ${user.mbti}`;
};
