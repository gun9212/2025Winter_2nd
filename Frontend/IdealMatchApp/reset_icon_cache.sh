#!/bin/bash

echo "🧹 아이콘 캐시 정리 중..."

# iOS DerivedData 정리
echo "📱 iOS DerivedData 정리..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Android 빌드 캐시 정리
echo "🤖 Android 빌드 캐시 정리..."
cd android
./gradlew clean
cd ..

# React Native Metro 캐시 정리
echo "⚛️ React Native 캐시 정리..."
rm -rf node_modules/.cache
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*

echo "✅ 캐시 정리 완료!"
echo ""
echo "다음 단계:"
echo "1. Xcode에서 Product > Clean Build Folder (Shift + Cmd + K)"
echo "2. 앱 재빌드:"
echo "   - iOS: npm run ios"
echo "   - Android: npm run android"
echo "3. 시뮬레이터/에뮬레이터 재시작"
