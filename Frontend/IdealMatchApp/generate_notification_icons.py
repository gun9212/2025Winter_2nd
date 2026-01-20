#!/usr/bin/env python3
"""
알림 아이콘 생성 스크립트
Wwoong_icon.png를 알림용 아이콘으로 변환
"""

import os
from PIL import Image, ImageDraw, ImageFilter

def create_notification_icon(source_image_path):
    """알림 아이콘 생성 (Android용 - 흰색 또는 단색 아이콘)"""
    print("🔔 알림 아이콘 생성 중...")
    
    source = Image.open(source_image_path)
    
    # Android 알림 아이콘 크기 (픽셀)
    android_sizes = {
        "drawable-mdpi": 24,
        "drawable-hdpi": 36,
        "drawable-xhdpi": 48,
        "drawable-xxhdpi": 72,
        "drawable-xxxhdpi": 96,
    }
    
    for folder, size in android_sizes.items():
        res_dir = f"android/app/src/main/res/{folder}"
        os.makedirs(res_dir, exist_ok=True)
        
        # 원본 이미지를 리사이즈
        resized = source.resize((size, size), Image.Resampling.LANCZOS)
        
        # 알림 아이콘은 보통 흰색 또는 단색으로 표시됨
        # 원본 아이콘을 그대로 사용 (시스템이 자동으로 색상 조정)
        output_path = os.path.join(res_dir, "ic_notification.png")
        resized.save(output_path, "PNG")
        print(f"  ✅ {folder}/ic_notification.png ({size}x{size})")
    
    print("✅ Android 알림 아이콘 생성 완료")
    print()
    print("💡 참고:")
    print("   - Android 알림 아이콘은 시스템이 자동으로 색상을 조정합니다.")
    print("   - 원본 아이콘을 그대로 사용하거나, 흰색 단색 아이콘을 사용할 수 있습니다.")

def main():
    source_image = "src/images/Wwoong_icon.png"
    
    if not os.path.exists(source_image):
        print(f"❌ 파일을 찾을 수 없습니다: {source_image}")
        return
    
    print(f"✅ 원본 이미지: {source_image}")
    print()
    
    try:
        create_notification_icon(source_image)
        print()
        print("🎉 알림 아이콘 생성 완료!")
        print()
        print("다음 단계:")
        print("1. notificationService.js에서 smallIcon을 'ic_notification'으로 변경")
        print("2. 앱 재빌드: npm run android")
    except ImportError:
        print("❌ PIL (Pillow) 라이브러리가 필요합니다.")
        print("설치 방법: pip3 install Pillow")
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    main()
