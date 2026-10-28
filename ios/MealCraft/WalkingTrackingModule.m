#import <CoreLocation/CoreLocation.h>
#import <CoreMotion/CoreMotion.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

static NSString *const WalkingSessionIdKey = @"walking.sessionId";
static NSString *const WalkingStepsKey = @"walking.steps";
static NSString *const WalkingDistanceKey = @"walking.distanceMeters";
static NSString *const WalkingRunningKey = @"walking.running";
static NSString *const WalkingLastUpdateAtKey = @"walking.lastUpdateAt";

@interface WalkingTrackingModule : RCTEventEmitter <RCTBridgeModule, CLLocationManagerDelegate>
@property(nonatomic, strong) CMPedometer *pedometer;
@property(nonatomic, strong) CLLocationManager *locationManager;
@property(nonatomic, copy) NSString *sessionId;
@property(nonatomic, assign) NSInteger previousSteps;
@property(nonatomic, assign) CLLocationDistance previousDistanceMeters;
@property(nonatomic, strong) CLLocation *previousLocation;
@property(nonatomic, assign) BOOL requestedAlwaysAuthorization;
@end

@implementation WalkingTrackingModule

RCT_EXPORT_MODULE(WalkingTracking)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[
    @"WalkingStepUpdate",
    @"WalkingLocationUpdate",
    @"WalkingTrackingStatus"
  ];
}

RCT_REMAP_METHOD(isSupported,
                 isSupportedWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(@{
    @"stepsAvailable": @([CMPedometer isStepCountingAvailable]),
    @"gpsAvailable": @([CLLocationManager locationServicesEnabled])
  });
}

RCT_REMAP_METHOD(startTracking,
                 startTrackingWithSessionId:(NSString *)sessionId
                 previousSteps:(nonnull NSNumber *)previousSteps
                 previousDistanceMeters:(nonnull NSNumber *)previousDistanceMeters
                 enableSteps:(BOOL)enableSteps
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  self.sessionId = sessionId;
  self.previousSteps = MAX(0, previousSteps.integerValue);
  self.previousDistanceMeters = MAX(0, previousDistanceMeters.doubleValue);
  self.previousLocation = nil;
  self.requestedAlwaysAuthorization = NO;
  [self stopSensors];
  [self persistSnapshotRunning:YES];

  if (enableSteps && [CMPedometer isStepCountingAvailable]) {
    self.pedometer = [CMPedometer new];
    [self.pedometer startPedometerUpdatesFromDate:[NSDate date]
                                      withHandler:^(CMPedometerData *data, NSError *error) {
      if (error) {
        dispatch_async(dispatch_get_main_queue(), ^{
          [self sendEventWithName:@"WalkingTrackingStatus"
                             body:@{ @"kind": @"steps", @"status": @"unavailable" }];
        });
        return;
      }
      NSInteger sessionSteps = self.previousSteps + data.numberOfSteps.integerValue;
      self.previousSteps = MAX(self.previousSteps, sessionSteps);
      [self persistSnapshotRunning:YES];
      dispatch_async(dispatch_get_main_queue(), ^{
        [self sendEventWithName:@"WalkingStepUpdate"
                           body:@{ @"steps": @(self.previousSteps) }];
      });
    }];
  }

  self.locationManager = [CLLocationManager new];
  self.locationManager.delegate = self;
  self.locationManager.desiredAccuracy = kCLLocationAccuracyBest;
  self.locationManager.distanceFilter = kCLDistanceFilterNone;
  self.locationManager.activityType = CLActivityTypeFitness;
  self.locationManager.pausesLocationUpdatesAutomatically = NO;
  self.locationManager.allowsBackgroundLocationUpdates = YES;
  self.locationManager.showsBackgroundLocationIndicator = YES;
  [self requestBackgroundLocationAuthorization];

  resolve(@{
    @"stepsAvailable": @([CMPedometer isStepCountingAvailable] && enableSteps),
    @"gpsAvailable": @([CLLocationManager locationServicesEnabled])
  });
}

RCT_REMAP_METHOD(getTrackingSnapshot,
                 getTrackingSnapshotWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
  id sessionId = [defaults objectForKey:WalkingSessionIdKey];
  resolve(@{
    @"sessionId": sessionId == nil ? [NSNull null] : sessionId,
    @"steps": @([defaults integerForKey:WalkingStepsKey]),
    @"distanceMeters": @([defaults doubleForKey:WalkingDistanceKey]),
    @"running": @([defaults boolForKey:WalkingRunningKey]),
    @"lastUpdateAt": @([defaults doubleForKey:WalkingLastUpdateAtKey])
  });
}

RCT_REMAP_METHOD(stopTracking,
                 stopTrackingWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  [self stopSensors];
  [self persistSnapshotRunning:NO];
  resolve(nil);
}

RCT_REMAP_METHOD(clearSession,
                 clearSessionWithId:(NSString *)sessionId
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  if ([self.sessionId isEqualToString:sessionId]) {
    [self stopSensors];
    self.sessionId = nil;
  }
  NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
  if ([[defaults stringForKey:WalkingSessionIdKey] isEqualToString:sessionId]) {
    [defaults removeObjectForKey:WalkingSessionIdKey];
    [defaults removeObjectForKey:WalkingStepsKey];
    [defaults removeObjectForKey:WalkingDistanceKey];
    [defaults setBool:NO forKey:WalkingRunningKey];
  }
  resolve(nil);
}

- (void)requestBackgroundLocationAuthorization
{
  CLAuthorizationStatus status = self.locationManager.authorizationStatus;
  if (status == kCLAuthorizationStatusNotDetermined) {
    [self.locationManager requestWhenInUseAuthorization];
  } else if (status == kCLAuthorizationStatusAuthorizedWhenInUse) {
    if (!self.requestedAlwaysAuthorization) {
      self.requestedAlwaysAuthorization = YES;
      [self.locationManager requestAlwaysAuthorization];
    }
  } else if (status == kCLAuthorizationStatusAuthorizedAlways) {
    [self.locationManager startUpdatingLocation];
    [self sendGpsPermissionStatus:@"granted"];
  } else {
    [self sendGpsPermissionStatus:@"denied"];
  }
}

- (void)locationManagerDidChangeAuthorization:(CLLocationManager *)manager
{
  CLAuthorizationStatus status = manager.authorizationStatus;
  if (status == kCLAuthorizationStatusAuthorizedAlways) {
    [manager startUpdatingLocation];
    [self sendGpsPermissionStatus:@"granted"];
  } else if (status == kCLAuthorizationStatusAuthorizedWhenInUse) {
    if (!self.requestedAlwaysAuthorization) {
      self.requestedAlwaysAuthorization = YES;
      [manager requestAlwaysAuthorization];
    }
    [manager startUpdatingLocation];
    [self sendGpsPermissionStatus:@"granted"];
  } else if (status == kCLAuthorizationStatusDenied ||
             status == kCLAuthorizationStatusRestricted) {
    [self sendGpsPermissionStatus:@"denied"];
  }
}

- (void)locationManager:(CLLocationManager *)manager
     didUpdateLocations:(NSArray<CLLocation *> *)locations
{
  CLLocation *location = locations.lastObject;
  if (!location || location.horizontalAccuracy <= 0 ||
      location.horizontalAccuracy > 35 ||
      !CLLocationCoordinate2DIsValid(location.coordinate)) {
    return;
  }

  CLLocation *previous = self.previousLocation;
  if (previous != nil) {
    NSTimeInterval elapsed = [location.timestamp timeIntervalSinceDate:previous.timestamp];
    CLLocationDistance distance = [previous distanceFromLocation:location];
    CLLocationDistance minimumMovement =
        MAX(1.5, (previous.horizontalAccuracy + location.horizontalAccuracy) * 0.15);
    if (elapsed > 0 && distance >= minimumMovement && distance / elapsed <= 5.5) {
      self.previousDistanceMeters += distance;
      [self persistSnapshotRunning:YES];
    } else if (elapsed <= 0 || distance / MAX(elapsed, 0.001) > 5.5) {
      return;
    }
  }
  self.previousLocation = location;
  [self persistSnapshotRunning:YES];
  [self sendEventWithName:@"WalkingLocationUpdate"
                     body:@{
                       @"latitude": @(location.coordinate.latitude),
                       @"longitude": @(location.coordinate.longitude),
                       @"accuracy": @(location.horizontalAccuracy),
                       @"timestamp": @([location.timestamp timeIntervalSince1970] * 1000)
                     }];
}

- (void)locationManager:(CLLocationManager *)manager
       didFailWithError:(NSError *)error
{
  [self sendEventWithName:@"WalkingTrackingStatus"
                     body:@{
                       @"kind": @"gps",
                       @"status": error.code == kCLErrorDenied ? @"denied" : @"unavailable"
                     }];
}

- (void)sendGpsPermissionStatus:(NSString *)status
{
  [self sendEventWithName:@"WalkingTrackingStatus"
                     body:@{ @"kind": @"gpsPermission", @"status": status }];
}

- (void)persistSnapshotRunning:(BOOL)running
{
  if (self.sessionId.length == 0) return;
  NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
  [defaults setObject:self.sessionId forKey:WalkingSessionIdKey];
  [defaults setInteger:self.previousSteps forKey:WalkingStepsKey];
  [defaults setDouble:self.previousDistanceMeters forKey:WalkingDistanceKey];
  [defaults setBool:running forKey:WalkingRunningKey];
  [defaults setDouble:[[NSDate date] timeIntervalSince1970] * 1000
               forKey:WalkingLastUpdateAtKey];
}

- (void)stopSensors
{
  [self.pedometer stopPedometerUpdates];
  self.pedometer = nil;
  [self.locationManager stopUpdatingLocation];
  self.locationManager.delegate = nil;
  self.locationManager = nil;
}

- (void)invalidate
{
  [self stopSensors];
  [super invalidate];
}

@end
