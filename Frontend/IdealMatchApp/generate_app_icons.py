#!/usr/bin/env python3
"""
앱 아이콘 생성 스크립트
Wwoong_icon.png를 iOS/Android 아이콘으로 변환
"""

import os
import sys
from PIL import Image

def create_ios_icons(source_image_path):
    """iOS 아이콘 생성"""
    print("📱 iOS 아이콘 생성 중...")
    
    ios_dir = "ios/IdealMatchApp/Images.xcassets/AppIcon.appiconset"
    os.makedirs(ios_dir, exist_ok=True)
    
    # iOS 아이콘 크기 (픽셀)
    ios_sizes = {
        "icon-20@2x.png": (40, 40),    # 20pt @2x
        "icon-20@3x.png": (60, 60),    # 20pt @3x
        "icon-29@2x.png": (58, 58),    # 29pt @2x
        "icon-29@3x.png": (87, 87),    # 29pt @3x
        "icon-40@2x.png": (80, 80),    # 40pt @2x
        "icon-40@3x.png": (120, 120),  # 40pt @3x
        "icon-60@2x.png": (120, 120),  # 60pt @2x
        "icon-60@3x.png": (180, 180),  # 60pt @3x
        "icon-1024.png": (1024, 1024), # App Store
    }
    
    source = Image.open(source_image_path)
    
    for filename, size in ios_sizes.items():
        resized = source.resize(size, Image.Resampling.LANCZOS)
        output_path = os.path.join(ios_dir, filename)
        resized.save(output_path, "PNG")
        print(f"  ✅ {filename} ({size[0]}x{size[1]})")
    
    # Contents.json 업데이트
    contents_json = """{
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
"""
    
    with open(os.path.join(ios_dir, "Contents.json"), "w") as f:
        f.write(contents_json)
    
    print(f"✅ iOS 아이콘 생성 완료: {ios_dir}")

def create_android_icons(source_image_path):
    """Android 아이콘 생성"""
    print("🤖 Android 아이콘 생성 중...")
    
    # Android 아이콘 크기 (픽셀)
    android_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    
    source = Image.open(source_image_path)
    
    for folder, size in android_sizes.items():
        resized = source.resize((size, size), Image.Resampling.LANCZOS)
        res_dir = f"android/app/src/main/res/{folder}"
        os.makedirs(res_dir, exist_ok=True)
        
        # ic_launcher.png
        output_path = os.path.join(res_dir, "ic_launcher.png")
        resized.save(output_path, "PNG")
        print(f"  ✅ {folder}/ic_launcher.png ({size}x{size})")
        
        # ic_launcher_round.png (동일한 이미지 사용)
        output_path_round = os.path.join(res_dir, "ic_launcher_round.png")
        resized.save(output_path_round, "PNG")
        print(f"  ✅ {folder}/ic_launcher_round.png ({size}x{size})")
    
    print("✅ Android 아이콘 생성 완료")

def main():
    source_image = "src/images/Wwoong_icon.png"
    
    if not os.path.exists(source_image):
        print(f"❌ 파일을 찾을 수 없습니다: {source_image}")
        sys.exit(1)
    
    print(f"✅ 원본 이미지: {source_image}")
    print()
    
    try:
        create_ios_icons(source_image)
        print()
        create_android_icons(source_image)
        print()
        print("🎉 앱 아이콘 생성 완료!")
        print()
        print("다음 단계:")
        print("1. iOS: Xcode에서 Images.xcassets > AppIcon 확인")
        print("2. Android: android/app/src/main/res/mipmap-*/ 폴더 확인")
        print("3. 앱 재빌드:")
        print("   - iOS: npm run ios")
        print("   - Android: npm run android")
    except ImportError:
        print("❌ PIL (Pillow) 라이브러리가 필요합니다.")
        print("설치 방법: pip install Pillow")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
