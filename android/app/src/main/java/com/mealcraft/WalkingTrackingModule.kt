package com.mealcraft

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.Manifest
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorManager
import android.location.LocationManager
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class WalkingTrackingModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  private var receiverRegistered = false

  private val trackingReceiver =
    object : BroadcastReceiver() {
      override fun onReceive(context: Context?, intent: Intent?) {
        val eventName = intent?.getStringExtra(WalkingTrackingService.EXTRA_EVENT) ?: return
        val payload = Arguments.createMap()
        when (eventName) {
          "WalkingStepUpdate" -> payload.putInt(
            "steps",
            intent.getIntExtra(WalkingTrackingService.EXTRA_STEPS, 0),
          )
          "WalkingLocationUpdate" -> {
            payload.putDouble(
              "latitude",
              intent.getDoubleExtra(WalkingTrackingService.EXTRA_LATITUDE, 0.0),
            )
            payload.putDouble(
              "longitude",
              intent.getDoubleExtra(WalkingTrackingService.EXTRA_LONGITUDE, 0.0),
            )
            payload.putDouble(
              "accuracy",
              intent.getDoubleExtra(WalkingTrackingService.EXTRA_ACCURACY, 0.0),
            )
            payload.putDouble(
              "timestamp",
              intent.getLongExtra(WalkingTrackingService.EXTRA_TIMESTAMP, 0L).toDouble(),
            )
          }
          "WalkingTrackingStatus" -> {
            payload.putString("kind", intent.getStringExtra(WalkingTrackingService.EXTRA_KIND))
            payload.putString("status", intent.getStringExtra(WalkingTrackingService.EXTRA_STATUS))
          }
          else -> return
        }
        if (reactContext.hasActiveReactInstance()) {
          reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, payload)
        }
      }
    }

  override fun getName() = "WalkingTracking"

  override fun initialize() {
    super.initialize()
    val filter = IntentFilter(WalkingTrackingService.ACTION_UPDATE)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      reactContext.registerReceiver(
        trackingReceiver,
        filter,
        Context.RECEIVER_NOT_EXPORTED,
      )
    } else {
      @Suppress("DEPRECATION")
      reactContext.registerReceiver(trackingReceiver, filter)
    }
    receiverRegistered = true
  }

  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Double) = Unit

  @ReactMethod
  fun isSupported(promise: Promise) {
    val sensorManager =
      reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    val locationManager =
      reactContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    val result = Arguments.createMap()
    result.putBoolean(
      "stepsAvailable",
      sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null,
    )
    result.putBoolean(
      "gpsAvailable",
      locationManager.allProviders.contains(LocationManager.GPS_PROVIDER),
    )
    promise.resolve(result)
  }

  @ReactMethod
  fun startTracking(
    sessionId: String,
    previousSteps: Double,
    previousDistanceMeters: Double,
    enableSteps: Boolean,
    promise: Promise,
  ) {
    val hasLocationPermission =
      reactContext.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED ||
        reactContext.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED
    if (!hasLocationPermission) {
      promise.reject(
        "E_WALKING_LOCATION_PERMISSION",
        "Cần quyền vị trí để duy trì dịch vụ theo dõi khi ứng dụng chạy nền.",
      )
      return
    }
    try {
      val intent =
        Intent(reactContext, WalkingTrackingService::class.java)
          .setAction(WalkingTrackingService.ACTION_START)
          .putExtra(WalkingTrackingService.EXTRA_SESSION_ID, sessionId)
          .putExtra(WalkingTrackingService.EXTRA_STEPS, previousSteps.toInt().coerceAtLeast(0))
          .putExtra(
            WalkingTrackingService.EXTRA_DISTANCE_METERS,
            previousDistanceMeters.coerceAtLeast(0.0),
          )
          .putExtra(WalkingTrackingService.EXTRA_ENABLE_STEPS, enableSteps)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        reactContext.startForegroundService(intent)
      } else {
        reactContext.startService(intent)
      }
      val result = Arguments.createMap()
      val sensorManager =
        reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
      val locationManager =
        reactContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
      result.putBoolean(
        "stepsAvailable",
        enableSteps && sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null,
      )
      result.putBoolean(
        "gpsAvailable",
        locationManager.allProviders.contains(LocationManager.GPS_PROVIDER),
      )
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("E_WALKING_TRACKING_START", "Không thể khởi động theo dõi nền.", error)
    }
  }

  @ReactMethod
  fun getTrackingSnapshot(promise: Promise) {
    val preferences =
      reactContext.getSharedPreferences(
        WalkingTrackingService.PREFERENCES_NAME,
        Context.MODE_PRIVATE,
      )
    val result = Arguments.createMap()
    result.putString(
      "sessionId",
      preferences.getString(WalkingTrackingService.KEY_SESSION_ID, null),
    )
    result.putInt(
      "steps",
      preferences.getInt(WalkingTrackingService.KEY_STEPS, 0),
    )
    result.putDouble(
      "distanceMeters",
      preferences.getFloat(WalkingTrackingService.KEY_DISTANCE_METERS, 0f).toDouble(),
    )
    result.putBoolean(
      "running",
      preferences.getBoolean(WalkingTrackingService.KEY_RUNNING, false),
    )
    result.putDouble(
      "lastUpdateAt",
      preferences.getLong(WalkingTrackingService.KEY_LAST_UPDATE_AT, 0L).toDouble(),
    )
    promise.resolve(result)
  }

  @ReactMethod
  fun stopTracking(promise: Promise) {
    val stopped =
      reactContext.startService(
        Intent(reactContext, WalkingTrackingService::class.java)
          .setAction(WalkingTrackingService.ACTION_STOP),
      )
    if (stopped == null) {
      reactContext.stopService(Intent(reactContext, WalkingTrackingService::class.java))
    }
    promise.resolve(null)
  }

  @ReactMethod
  fun clearSession(sessionId: String, promise: Promise) {
    reactContext.stopService(Intent(reactContext, WalkingTrackingService::class.java))
    reactContext
      .getSharedPreferences(
        WalkingTrackingService.PREFERENCES_NAME,
        Context.MODE_PRIVATE,
      )
      .edit()
      .remove(WalkingTrackingService.KEY_SESSION_ID)
      .remove(WalkingTrackingService.KEY_STEPS)
      .remove(WalkingTrackingService.KEY_DISTANCE_METERS)
      .remove(WalkingTrackingService.KEY_BASELINE_PREFIX + sessionId)
      .remove(WalkingTrackingService.KEY_LAST_UPDATE_AT)
      .putBoolean(WalkingTrackingService.KEY_RUNNING, false)
      .apply()
    promise.resolve(null)
  }

  override fun invalidate() {
    if (receiverRegistered) {
      reactContext.unregisterReceiver(trackingReceiver)
      receiverRegistered = false
    }
    super.invalidate()
  }
}
