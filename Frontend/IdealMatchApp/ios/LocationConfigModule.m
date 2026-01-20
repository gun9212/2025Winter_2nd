//
//  LocationConfigModule.m
//  IdealMatchApp
//
//  iOS 백그라운드 위치 업데이트 네이티브 모듈 (4-A)
//

#import "LocationConfigModule.h"
#import <React/RCTLog.h>
#import <CoreLocation/CoreLocation.h>

@interface LocationConfigModule () <CLLocationManagerDelegate>
@property (nonatomic, strong) CLLocationManager *locationManager;
@property (nonatomic, assign) BOOL hasListeners;
@property (nonatomic, assign) BOOL isRunning;
@property (nonatomic, assign) BOOL useSignificantChanges;

@property (nonatomic, copy) RCTPromiseResolveBlock pendingRequestResolve;
@property (nonatomic, copy) RCTPromiseRejectBlock pendingRequestReject;
@end

@implementation LocationConfigModule

RCT_EXPORT_MODULE();

- (instancetype)init
{
  if ((self = [super init])) {
    _hasListeners = NO;
    _isRunning = NO;
    _useSignificantChanges = NO;
  }
  return self;
}

+ (BOOL)requiresMainQueueSetup
{
  // CLLocationManager는 메인 스레드에서 초기화/사용 권장
  return YES;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[
    @"locationUpdated",
    @"locationError",
    @"authorizationChanged"
  ];
}

- (void)startObserving
{
  self.hasListeners = YES;
}

- (void)stopObserving
{
  self.hasListeners = NO;
}

- (void)ensureLocationManager
{
  if (!self.locationManager) {
    self.locationManager = [[CLLocationManager alloc] init];
    self.locationManager.delegate = self;
  }
}

- (void)applyDefaultConfig
{
  [self ensureLocationManager];

  // 정확도/업데이트 정책
  self.locationManager.desiredAccuracy = kCLLocationAccuracyBest;
  self.locationManager.distanceFilter = kCLDistanceFilterNone;

  // 백그라운드 위치 업데이트 (핵심)
  if (@available(iOS 9.0, *)) {
    self.locationManager.allowsBackgroundLocationUpdates = YES;
  }
  self.locationManager.pausesLocationUpdatesAutomatically = NO;

  if (@available(iOS 11.0, *)) {
    self.locationManager.showsBackgroundLocationIndicator = YES;
  }
}

- (CLAuthorizationStatus)currentAuthorizationStatus
{
  if (@available(iOS 14.0, *)) {
    [self ensureLocationManager];
    return self.locationManager.authorizationStatus;
  }
  return [CLLocationManager authorizationStatus];
}

- (void)emitAuthorizationChanged:(CLAuthorizationStatus)status
{
  if (!self.hasListeners) return;

  NSString *value = @"unknown";
  switch (status) {
    case kCLAuthorizationStatusNotDetermined: value = @"notDetermined"; break;
    case kCLAuthorizationStatusRestricted: value = @"restricted"; break;
    case kCLAuthorizationStatusDenied: value = @"denied"; break;
    case kCLAuthorizationStatusAuthorizedWhenInUse: value = @"whenInUse"; break;
    case kCLAuthorizationStatusAuthorizedAlways: value = @"always"; break;
    default: value = @"unknown"; break;
  }

  [self sendEventWithName:@"authorizationChanged" body:@{ @"status": value }];
}

RCT_EXPORT_METHOD(configure:(NSDictionary *)options)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [self applyDefaultConfig];

    id showsIndicator = options[@"showsBackgroundLocationIndicator"];
    if (showsIndicator != nil && [showsIndicator isKindOfClass:[NSNumber class]]) {
      if (@available(iOS 11.0, *)) {
        self.locationManager.showsBackgroundLocationIndicator = [showsIndicator boolValue];
      }
    }

    id desiredAccuracy = options[@"desiredAccuracy"];
    if (desiredAccuracy != nil && [desiredAccuracy isKindOfClass:[NSString class]]) {
      NSString *acc = (NSString *)desiredAccuracy;
      if ([acc isEqualToString:@"best"]) {
        self.locationManager.desiredAccuracy = kCLLocationAccuracyBest;
      } else if ([acc isEqualToString:@"tenMeters"]) {
        self.locationManager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters;
      } else if ([acc isEqualToString:@"hundredMeters"]) {
        self.locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters;
      }
    }

    id distanceFilter = options[@"distanceFilter"];
    if (distanceFilter != nil && [distanceFilter isKindOfClass:[NSNumber class]]) {
      self.locationManager.distanceFilter = [distanceFilter doubleValue];
    }

    RCTLogInfo(@"✅ LocationConfigModule configure 완료 (allowsBackgroundLocationUpdates=YES, pauses=NO)");
  });
}

RCT_EXPORT_METHOD(requestAlwaysAuthorization)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [self applyDefaultConfig];

    CLAuthorizationStatus status = [self currentAuthorizationStatus];
    if (status == kCLAuthorizationStatusNotDetermined) {
      [self.locationManager requestAlwaysAuthorization];
      return;
    }

    // 이미 결정된 상태면 이벤트만 한번 흘려줌
    [self emitAuthorizationChanged:status];
  });
}

// mode: "standard" | "significant"
RCT_EXPORT_METHOD(start:(NSDictionary *)options)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [self applyDefaultConfig];

    NSString *mode = options[@"mode"];
    self.useSignificantChanges = (mode != nil && [mode isKindOfClass:[NSString class]] && [mode isEqualToString:@"significant"]);

    CLAuthorizationStatus status = [self currentAuthorizationStatus];
    if (status == kCLAuthorizationStatusNotDetermined) {
      // 권한 요청 후에도 start는 계속 진행될 수 있음 (OS가 프롬프트 표시)
      [self.locationManager requestAlwaysAuthorization];
    }

    if (self.isRunning) {
      // 모드만 바뀌는 경우를 위해 stop/start로 전환
      [self.locationManager stopUpdatingLocation];
      [self.locationManager stopMonitoringSignificantLocationChanges];
    }

    if (self.useSignificantChanges) {
      [self.locationManager startMonitoringSignificantLocationChanges];
      RCTLogInfo(@"📍 LocationConfigModule start (mode=significant)");
    } else {
      // 표준 업데이트를 메인으로 사용하되, 백그라운드 안정성(깨우기)을 위해 significant-change도 함께 켜둠
      // (배터리/정책에 의해 표준 업데이트가 일시 중단될 수 있어 보조 채널로 활용)
      [self.locationManager startUpdatingLocation];
      [self.locationManager startMonitoringSignificantLocationChanges];
      RCTLogInfo(@"📍 LocationConfigModule start (mode=standard + significant backup)");
    }

    self.isRunning = YES;
  });
}

RCT_EXPORT_METHOD(stop)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    if (!self.locationManager) return;

    [self.locationManager stopUpdatingLocation];
    [self.locationManager stopMonitoringSignificantLocationChanges];
    self.isRunning = NO;
    self.useSignificantChanges = NO;

    RCTLogInfo(@"🛑 LocationConfigModule stop");
  });
}

RCT_EXPORT_METHOD(getCurrentLocation:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [self applyDefaultConfig];

    // pending request가 있으면 덮어쓰기 (최신 요청만 유지)
    self.pendingRequestResolve = resolve;
    self.pendingRequestReject = reject;

    CLAuthorizationStatus status = [self currentAuthorizationStatus];
    if (status == kCLAuthorizationStatusNotDetermined) {
      [self.locationManager requestAlwaysAuthorization];
    }

    if (@available(iOS 9.0, *)) {
      [self.locationManager requestLocation];
    } else {
      // iOS 8 이하 fallback: 한 번 업데이트 후 바로 stop
      [self.locationManager startUpdatingLocation];
    }
  });
}

- (void)locationManager:(CLLocationManager *)manager didUpdateLocations:(NSArray<CLLocation *> *)locations
{
  CLLocation *location = locations.lastObject;
  if (!location) return;

  NSTimeInterval tsMs = [location.timestamp timeIntervalSince1970] * 1000.0;
  NSDictionary *payload = @{
    @"latitude": @(location.coordinate.latitude),
    @"longitude": @(location.coordinate.longitude),
    @"accuracy": @(location.horizontalAccuracy),
    @"timestamp": @((long long)llround(tsMs))
  };

  // 1) watch 이벤트
  if (self.hasListeners) {
    [self sendEventWithName:@"locationUpdated" body:payload];
  }

  // 2) getCurrentLocation promise
  if (self.pendingRequestResolve) {
    RCTPromiseResolveBlock resolve = self.pendingRequestResolve;
    self.pendingRequestResolve = nil;
    self.pendingRequestReject = nil;

    resolve(payload);

    // requestLocation fallback(iOS 8)로 startUpdatingLocation 했던 경우 stop
    if (!self.isRunning && !self.useSignificantChanges) {
      [self.locationManager stopUpdatingLocation];
    }
  }
}

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error
{
  if (self.pendingRequestReject) {
    RCTPromiseRejectBlock reject = self.pendingRequestReject;
    self.pendingRequestResolve = nil;
    self.pendingRequestReject = nil;
    reject(@"E_LOCATION", error.localizedDescription ?: @"Location error", error);
  }

  if (self.hasListeners) {
    [self sendEventWithName:@"locationError"
                       body:@{
                         @"code": @(error.code),
                         @"message": error.localizedDescription ?: @"Location error"
                       }];
  }
}

// iOS 14+
- (void)locationManagerDidChangeAuthorization:(CLLocationManager *)manager
{
  [self emitAuthorizationChanged:[self currentAuthorizationStatus]];
}

// iOS 13 이하
- (void)locationManager:(CLLocationManager *)manager didChangeAuthorizationStatus:(CLAuthorizationStatus)status
{
  [self emitAuthorizationChanged:status];
}

@end
