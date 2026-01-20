#!/bin/bash

# 앱 아이콘 생성 스크립트
# 사용법: ./generate_app_icons.sh <원본_이미지_경로>

if [ -z "$1" ]; then
    echo "❌ 사용법: ./generate_app_icons.sh <원본_이미지_경로>"
    echo "예: ./generate_app_icons.sh ../src/images/Wwoong_icon.png"
    exit 1
fi

SOURCE_IMAGE="$1"

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "❌ 파일을 찾을 수 없습니다: $SOURCE_IMAGE"
    exit 1
fi

echo "✅ 원본 이미지: $SOURCE_IMAGE"

# ImageMagick 설치 확인
if ! command -v convert &> /dev/null; then
    echo "⚠️ ImageMagick이 설치되어 있지 않습니다."
    echo "설치 방법: brew install imagemagick"
    echo ""
    echo "또는 온라인 도구를 사용하세요:"
    echo "1. https://www.appicon.co/ 방문"
    echo "2. $SOURCE_IMAGE 업로드"
    echo "3. iOS/Android 아이콘 세트 다운로드"
    echo "4. 다운로드한 파일을 다음 위치에 복사:"
    echo "   - iOS: ios/IdealMatchApp/Images.xcassets/AppIcon.appiconset/"
    echo "   - Android: android/app/src/main/res/mipmap-*/"
    exit 1
fi

# 임시 디렉토리 생성
TEMP_DIR=$(mktemp -d)
echo "📁 임시 디렉토리: $TEMP_DIR"

# iOS 아이콘 생성
echo "📱 iOS 아이콘 생성 중..."
IOS_DIR="ios/IdealMatchApp/Images.xcassets/AppIcon.appiconset"

# iOS 아이콘 크기 (픽셀)
convert "$SOURCE_IMAGE" -resize 40x40 "$TEMP_DIR/icon-20@2x.png"      # 20pt @2x
convert "$SOURCE_IMAGE" -resize 60x60 "$TEMP_DIR/icon-20@3x.png"      # 20pt @3x
convert "$SOURCE_IMAGE" -resize 58x58 "$TEMP_DIR/icon-29@2x.png"      # 29pt @2x
convert "$SOURCE_IMAGE" -resize 87x87 "$TEMP_DIR/icon-29@3x.png"       # 29pt @3x
convert "$SOURCE_IMAGE" -resize 80x80 "$TEMP_DIR/icon-40@2x.png"      # 40pt @2x
convert "$SOURCE_IMAGE" -resize 120x120 "$TEMP_DIR/icon-40@3x.png"    # 40pt @3x
convert "$SOURCE_IMAGE" -resize 120x120 "$TEMP_DIR/icon-60@2x.png"    # 60pt @2x
convert "$SOURCE_IMAGE" -resize 180x180 "$TEMP_DIR/icon-60@3x.png"    # 60pt @3x
convert "$SOURCE_IMAGE" -resize 1024x1024 "$TEMP_DIR/icon-1024.png"   # App Store

# iOS Contents.json 업데이트 (파일명 매핑)
cat > "$IOS_DIR/Contents.json" << 'EOF'
{
  "images" : [
    {
      "filename" : "icon-20@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "20x20"
    },
    {
      "filename" : "icon-20@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "20x20"
    },
    {
      "filename" : "icon-29@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "29x29"
    },
    {
      "filename" : "icon-29@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "29x29"
    },
    {
      "filename" : "icon-40@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "40x40"
    },
    {
      "filename" : "icon-40@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "40x40"
    },
    {
      "filename" : "icon-60@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "60x60"
    },
    {
      "filename" : "icon-60@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "60x60"
    },
    {
      "filename" : "icon-1024.png",
      "idiom" : "ios-marketing",
      "scale" : "1x",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
EOF

# iOS 아이콘 파일 복사
cp "$TEMP_DIR"/icon-*.png "$IOS_DIR/"
echo "✅ iOS 아이콘 생성 완료: $IOS_DIR"

# Android 아이콘 생성
echo "🤖 Android 아이콘 생성 중..."

# Android 아이콘 크기 (픽셀)
convert "$SOURCE_IMAGE" -resize 48x48 "$TEMP_DIR/ic_launcher-mdpi.png"      # mdpi
convert "$SOURCE_IMAGE" -resize 72x72 "$TEMP_DIR/ic_launcher-hdpi.png"     # hdpi
convert "$SOURCE_IMAGE" -resize 96x96 "$TEMP_DIR/ic_launcher-xhdpi.png"    # xhdpi
convert "$SOURCE_IMAGE" -resize 144x144 "$TEMP_DIR/ic_launcher-xxhdpi.png" # xxhdpi
convert "$SOURCE_IMAGE" -resize 192x192 "$TEMP_DIR/ic_launcher-xxxhdpi.png" # xxxhdpi

# Android 아이콘 복사
cp "$TEMP_DIR/ic_launcher-mdpi.png" "android/app/src/main/res/mipmap-mdpi/ic_launcher.png"
cp "$TEMP_DIR/ic_launcher-mdpi.png" "android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png"

cp "$TEMP_DIR/ic_launcher-hdpi.png" "android/app/src/main/res/mipmap-hdpi/ic_launcher.png"
cp "$TEMP_DIR/ic_launcher-hdpi.png" "android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png"

cp "$TEMP_DIR/ic_launcher-xhdpi.png" "android/app/src/main/res/mipmap-xhdpi/ic_launcher.png"
cp "$TEMP_DIR/ic_launcher-xhdpi.png" "android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png"

cp "$TEMP_DIR/ic_launcher-xxhdpi.png" "android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png"
cp "$TEMP_DIR/ic_launcher-xxhdpi.png" "android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png"

cp "$TEMP_DIR/ic_launcher-xxxhdpi.png" "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png"
cp "$TEMP_DIR/ic_launcher-xxxhdpi.png" "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png"

echo "✅ Android 아이콘 생성 완료"

# 임시 디렉토리 정리
rm -rf "$TEMP_DIR"

echo ""
echo "🎉 앱 아이콘 생성 완료!"
echo ""
echo "다음 단계:"
echo "1. iOS: Xcode에서 Images.xcassets > AppIcon 확인"
echo "2. Android: android/app/src/main/res/mipmap-*/ 폴더 확인"
echo "3. 앱 재빌드:"
echo "   - iOS: npm run ios"
echo "   - Android: npm run android"
