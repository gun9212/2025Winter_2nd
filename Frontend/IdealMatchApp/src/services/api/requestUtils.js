/**
 * ApiClient 내부에서 반복되는 작은 유틸
 * - 동작 변경 없이, 반복되는 표현식/주입 코드를 모듈화
 */

/**
 * 백엔드 응답을 화면 레이어에서 기대하는 형태로 정규화
 * (기존 코드: response.data || response)
 */
export function normalizeResponseData(response) {
  return response && response.data ? response.data : response;
}

/**
 * URLSearchParams에 user_id를 추가 (기존 동작 유지: userId가 null이면 기존처럼 예외 가능)
 * @param {URLSearchParams} params
 * @param {number} userId
 * @param {string} logMessagePrefix
 */
export function appendUserIdToSearchParams(params, userId, logMessagePrefix) {
  params.append('user_id', userId.toString());
  if (logMessagePrefix) {
    console.log(logMessagePrefix, userId);
  }
}

/**
 * requestBody에 user_id를 추가
 * @param {Object} body
 * @param {number} userId
 * @param {string} logMessagePrefix
 */
export function setUserIdOnBody(body, userId, logMessagePrefix) {
  body.user_id = userId;
  if (logMessagePrefix) {
    console.log(logMessagePrefix, userId);
  }
}

