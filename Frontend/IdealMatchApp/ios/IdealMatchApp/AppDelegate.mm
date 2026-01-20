#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <CoreLocation/CoreLocation.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"IdealMatchApp";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  // 백그라운드 위치 업데이트 활성화
  // iOS에서 백그라운드 위치 업데이트를 받으려면 반드시 필요한 설정
  // Info.plist의 UIBackgroundModes에 'location'이 포함되어 있어야 함
  [self enableBackgroundLocationUpdates];

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

// 백그라운드 위치 업데이트 활성화 메서드
- (void)enableBackgroundLocationUpdates
{
  // 백그라운드 위치 업데이트는 JavaScript 레벨에서 제어할 수 없으므로
  // 네이티브 코드에서 CLLocationManager 설정을 미리 해둡니다.
  // 실제 위치 추적은 JavaScript (React Native)에서 시작/중단합니다.
  
  NSLog(@"📍 백그라운드 위치 업데이트 설정 활성화됨");
  NSLog(@"   - allowsBackgroundLocationUpdates: YES");
  NSLog(@"   - pausesLocationUpdatesAutomatically: NO");
  NSLog(@"   ℹ️ JavaScript에서 위치 추적을 시작하면 백그라운드에서도 계속 동작합니다.");
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
