#!/bin/bash
# Metro bundler 캐시 클리어 스크립트

echo "🧹 Metro bundler 캐시 클리어 중..."

# Metro bundler 캐시 삭제
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*

# React Native 캐시 삭제
rm -rf node_modules/.cache

# Watchman 캐시 삭제 (설치되어 있는 경우)
watchman watch-del-all 2>/dev/null || true

echo "✅ 캐시 클리어 완료!"
echo "이제 'npm start -- --reset-cache'를 실행하세요."
