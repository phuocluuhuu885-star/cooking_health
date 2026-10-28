package com.mealcraft

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.IBinder
import kotlin.math.max
import kotlin.math.roundToInt

class WalkingTrackingService : Service(), SensorEventListener, LocationListener {
  private lateinit var preferences: android.content.SharedPreferences
  private lateinit var sensorManager: SensorManager
  private lateinit var locationManager: LocationManager
  private var stepSensor: Sensor? = null
  private var sessionId: String? = null
  private var previousSteps = 0
  private var stepBaseline: Int? = null
  private var distanceMeters = 0.0
  private var previousLocation: Location? = null
  private val heartbeatHandler = Handler(Looper.getMainLooper())
  private val heartbeat = object : Runnable {
    override fun run() {
      if (sessionId != null) {
        preferences.edit().putLong(KEY_LAST_UPDATE_AT, System.currentTimeMillis()).apply()
        heartbeatHandler.postDelayed(this, HEARTBEAT_INTERVAL_MS)
      }
    }
  }

  override fun onCreate() {
    super.onCreate()
    preferences = getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
    sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
    locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        stopTracking()
        return START_NOT_STICKY
      }
      ACTION_START -> {
        sessionId = intent.getStringExtra(EXTRA_SESSION_ID)
        previousSteps =
          intent.getIntExtra(EXTRA_STEPS, 0).coerceAtLeast(0)
        distanceMeters =
          intent.getDoubleExtra(EXTRA_DISTANCE_METERS, 0.0).coerceAtLeast(0.0)
        stepBaseline = sessionId?.let {
          preferences.getInt(KEY_BASELINE_PREFIX + it, Int.MIN_VALUE)
            .takeUnless { baseline -> baseline == Int.MIN_VALUE }
        }
        previousLocation = null
        preferences.edit()
          .putString(KEY_SESSION_ID, sessionId)
          .putInt(KEY_STEPS, previousSteps)
          .putFloat(KEY_DISTANCE_METERS, distanceMeters.toFloat())
          .putLong(KEY_LAST_UPDATE_AT, System.currentTimeMillis())
          .putBoolean(KEY_RUNNING, true)
          .apply()
      }
      null -> restoreTrackingState()
      else -> return START_NOT_STICKY
    }

    if (sessionId.isNullOrBlank()) {
      stopSelf(startId)
      return START_NOT_STICKY
    }

    startForeground(NOTIFICATION_ID, createNotification())
    startSensors(intent?.getBooleanExtra(EXTRA_ENABLE_STEPS, true) ?: true)
    heartbeatHandler.removeCallbacks(heartbeat)
    heartbeatHandler.postDelayed(heartbeat, HEARTBEAT_INTERVAL_MS)
    return START_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onTaskRemoved(rootIntent: Intent?) {
    super.onTaskRemoved(rootIntent)
    preferences.edit().putBoolean(KEY_RUNNING, true).apply()
  }

  override fun onSensorChanged(event: SensorEvent?) {
    val activeSessionId = sessionId ?: return
    val rawSteps = event?.values?.firstOrNull()?.roundToInt() ?: return
    val baselineKey = KEY_BASELINE_PREFIX + activeSessionId
    val savedBaseline = preferences.getInt(baselineKey, Int.MIN_VALUE)
    val baseline = when {
      stepBaseline != null -> stepBaseline!!
      savedBaseline == Int.MIN_VALUE || rawSteps < savedBaseline ->
        (rawSteps - previousSteps).also {
          preferences.edit().putInt(baselineKey, it).apply()
        }
      else -> savedBaseline
    }
    stepBaseline = baseline
    val steps = max(previousSteps, rawSteps - baseline).coerceAtLeast(0)
    previousSteps = steps
    preferences.edit().putInt(KEY_STEPS, steps).apply()
    broadcast(
      "WalkingStepUpdate",
      mapOf(EXTRA_STEPS to steps),
    )
  }

  override fun onLocationChanged(location: Location) {
    val previous = previousLocation
    if (isValidLocation(location)) {
      if (previous != null) {
        val elapsedSeconds = (location.time - previous.time) / 1000.0
        val movementMeters = previous.distanceTo(location).toDouble()
        val minimumMovement = max(1.5, (previous.accuracy + location.accuracy) * 0.15)
        if (
          elapsedSeconds > 0 &&
          movementMeters >= minimumMovement &&
          movementMeters / elapsedSeconds <= MAX_WALKING_SPEED_METERS_PER_SECOND
        ) {
          distanceMeters += movementMeters
          preferences.edit().putFloat(KEY_DISTANCE_METERS, distanceMeters.toFloat()).apply()
        }
      }
      previousLocation = location
      broadcast(
        "WalkingLocationUpdate",
        mapOf(
          EXTRA_LATITUDE to location.latitude,
          EXTRA_LONGITUDE to location.longitude,
          EXTRA_ACCURACY to location.accuracy.toDouble(),
          EXTRA_TIMESTAMP to location.time,
        ),
      )
    }
  }

  override fun onProviderEnabled(provider: String) {
    if (provider == LocationManager.GPS_PROVIDER) broadcastStatus("gps", "available")
  }

  override fun onProviderDisabled(provider: String) {
    if (provider == LocationManager.GPS_PROVIDER) broadcastStatus("gps", "unavailable")
  }

  @Deprecated("Deprecated in Android")
  override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

  override fun onDestroy() {
    heartbeatHandler.removeCallbacks(heartbeat)
    stopSensors()
    super.onDestroy()
  }

  private fun restoreTrackingState() {
    sessionId = preferences.getString(KEY_SESSION_ID, null)
    previousSteps = preferences.getInt(KEY_STEPS, 0)
    distanceMeters = preferences.getFloat(KEY_DISTANCE_METERS, 0f).toDouble()
    if (sessionId != null) {
      preferences.edit().putBoolean(KEY_RUNNING, true).apply()
    }
  }

  private fun startSensors(enableSteps: Boolean) {
    stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
    if (enableSteps && stepSensor != null) {
      sensorManager.registerListener(
        this,
        stepSensor,
        SensorManager.SENSOR_DELAY_NORMAL,
      )
    } else {
      broadcastStatus("steps", "unavailable")
    }

    if (
      locationManager.allProviders.contains(LocationManager.GPS_PROVIDER) &&
      (
        checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) ==
          PackageManager.PERMISSION_GRANTED ||
          checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) ==
          PackageManager.PERMISSION_GRANTED
      )
    ) {
      try {
        locationManager.requestLocationUpdates(
          LocationManager.GPS_PROVIDER,
          LOCATION_INTERVAL_MS,
          0f,
          this,
        )
        broadcastStatus("gps", "available")
      } catch (error: SecurityException) {
        broadcastStatus("gpsPermission", "denied")
      } catch (error: IllegalArgumentException) {
        broadcastStatus("gps", "unavailable")
      }
    } else {
      broadcastStatus("gpsPermission", "denied")
    }
  }

  private fun stopSensors() {
    if (::sensorManager.isInitialized) sensorManager.unregisterListener(this)
    if (::locationManager.isInitialized) locationManager.removeUpdates(this)
    stepSensor = null
  }

  private fun stopTracking() {
    stopSensors()
    preferences.edit().putBoolean(KEY_RUNNING, false).apply()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    stopSelf()
  }

  private fun createNotification(): Notification {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        NOTIFICATION_CHANNEL_ID,
        "Theo dõi đi bộ",
        NotificationManager.IMPORTANCE_LOW,
      )
      getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pendingIntent = launchIntent?.let {
      PendingIntent.getActivity(
        this,
        0,
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }
    val builder =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Notification.Builder(this, NOTIFICATION_CHANNEL_ID)
      } else {
        @Suppress("DEPRECATION")
        Notification.Builder(this)
      }
    builder
      .setContentTitle("MealCraft đang theo dõi buổi đi bộ")
      .setContentText("Theo dõi bước chân và quãng đường vẫn tiếp tục khi khóa màn hình.")
      .setSmallIcon(android.R.drawable.ic_menu_mylocation)
      .setOngoing(true)
      .setContentIntent(pendingIntent)
    return builder.build()
  }

  private fun isValidLocation(location: Location): Boolean =
    location.latitude.isFinite() &&
      location.longitude.isFinite() &&
      location.latitude in -90.0..90.0 &&
      location.longitude in -180.0..180.0 &&
      location.accuracy > 0 &&
      location.accuracy <= MAX_GPS_ACCURACY_METERS

  private fun broadcastStatus(kind: String, status: String) {
    broadcast(
      "WalkingTrackingStatus",
      mapOf(EXTRA_KIND to kind, EXTRA_STATUS to status),
    )
  }

  private fun broadcast(eventName: String, values: Map<String, Any>) {
    val intent =
      Intent(ACTION_UPDATE)
        .setPackage(packageName)
        .putExtra(EXTRA_EVENT, eventName)
    values.forEach { (key, value) ->
      when (value) {
        is Int -> intent.putExtra(key, value)
        is Long -> intent.putExtra(key, value)
        is Double -> intent.putExtra(key, value)
        is String -> intent.putExtra(key, value)
      }
    }
    sendBroadcast(intent)
  }

  companion object {
    const val ACTION_START = "com.mealcraft.walking.START"
    const val ACTION_STOP = "com.mealcraft.walking.STOP"
    const val ACTION_UPDATE = "com.mealcraft.walking.UPDATE"
    const val PREFERENCES_NAME = "walking_tracking"
    const val KEY_SESSION_ID = "session_id"
    const val KEY_STEPS = "steps"
    const val KEY_DISTANCE_METERS = "distance_meters"
    const val KEY_RUNNING = "running"
    const val KEY_LAST_UPDATE_AT = "last_update_at"
    const val KEY_BASELINE_PREFIX = "baseline_"
    const val EXTRA_SESSION_ID = "session_id"
    const val EXTRA_STEPS = "steps"
    const val EXTRA_DISTANCE_METERS = "distance_meters"
    const val EXTRA_ENABLE_STEPS = "enable_steps"
    const val EXTRA_EVENT = "event"
    const val EXTRA_KIND = "kind"
    const val EXTRA_STATUS = "status"
    const val EXTRA_LATITUDE = "latitude"
    const val EXTRA_LONGITUDE = "longitude"
    const val EXTRA_ACCURACY = "accuracy"
    const val EXTRA_TIMESTAMP = "timestamp"
    private const val NOTIFICATION_CHANNEL_ID = "walking_tracking"
    private const val NOTIFICATION_ID = 61027
    private const val LOCATION_INTERVAL_MS = 1000L
    private const val HEARTBEAT_INTERVAL_MS = 15000L
    private const val MAX_GPS_ACCURACY_METERS = 35f
    private const val MAX_WALKING_SPEED_METERS_PER_SECOND = 5.5
  }
}
