#!/bin/bash

# iOS 시뮬레이터 설정 스크립트
# 환경 설정 가이드에 따른 iOS 시뮬레이터 설정

set -e

echo "🚀 iOS 시뮬레이터 설정을 시작합니다..."

# 1. Xcode 설치 확인
echo ""
echo "📱 1단계: Xcode 설치 확인"
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode가 설치되어 있지 않습니다."
    echo "   App Store에서 Xcode를 설치해주세요."
    exit 1
fi

XCODE_VERSION=$(xcodebuild -version 2>&1 | head -n 1)
echo "✅ Xcode 설치 확인: $XCODE_VERSION"

# 2. CocoaPods 설치 확인
echo ""
echo "📦 2단계: CocoaPods 설치 확인"
if ! command -v pod &> /dev/null; then
    echo "⚠️  CocoaPods가 설치되어 있지 않습니다."
    echo "   CocoaPods를 설치합니다..."
    
    # Homebrew를 통한 설치 시도
    if command -v brew &> /dev/null; then
        echo "   Homebrew를 통해 CocoaPods 설치 중..."
        brew install cocoapods
    else
        echo "   gem을 통해 CocoaPods 설치 중..."
        sudo gem install cocoapods
    fi
    
    if ! command -v pod &> /dev/null; then
        echo "❌ CocoaPods 설치에 실패했습니다."
        echo "   수동으로 설치해주세요:"
        echo "   sudo gem install cocoapods"
        exit 1
    fi
fi

POD_VERSION=$(pod --version)
echo "✅ CocoaPods 설치 확인: $POD_VERSION"

# 3. 프로젝트 디렉토리로 이동
echo ""
echo "📂 3단계: 프로젝트 디렉토리 확인"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"
echo "✅ 현재 디렉토리: $(pwd)"

# 4. iOS 디렉토리로 이동
echo ""
echo "📱 4단계: iOS 프로젝트 설정"
cd ios

# 5. Pod 캐시 정리 (선택사항)
if [ "$1" == "--clean" ]; then
    echo "🧹 Pod 캐시 정리 중..."
    rm -rf Pods Podfile.lock
    pod cache clean --all
fi

# 6. Pod 의존성 설치
echo ""
echo "📦 5단계: CocoaPods 의존성 설치"
echo "   이 작업은 10-15분 정도 소요될 수 있습니다..."
pod install

if [ $? -eq 0 ]; then
    echo "✅ Pod 설치 완료!"
else
    echo "❌ Pod 설치 실패"
    echo "   다음 명령어를 수동으로 실행해보세요:"
    echo "   cd ios && pod install"
    exit 1
fi

# 7. 시뮬레이터 확인
echo ""
echo "📱 6단계: 사용 가능한 시뮬레이터 확인"
if command -v xcrun &> /dev/null; then
    echo "   사용 가능한 시뮬레이터:"
    xcrun simctl list devices available | grep -E "iPhone|iPad" | head -10
else
    echo "⚠️  xcrun을 찾을 수 없습니다. Xcode가 제대로 설치되었는지 확인해주세요."
fi

# 8. 완료 메시지
echo ""
echo "✅ iOS 시뮬레이터 설정이 완료되었습니다!"
echo ""
echo "다음 단계:"
echo "1. Metro Bundler 시작: npm start"
echo "2. iOS 시뮬레이터에서 앱 실행: npm run ios"
echo ""
echo "특정 시뮬레이터 지정:"
echo "   npm run ios -- --simulator=\"iPhone 15 Pro\""
echo ""


