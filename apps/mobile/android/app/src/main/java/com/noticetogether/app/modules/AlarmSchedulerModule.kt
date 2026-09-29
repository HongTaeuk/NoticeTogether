package com.noticetogether.app.modules

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * JS(src/native/alarmScheduler.ts)에서 호출하는 브릿지.
 * WorkManager 대신 AlarmManager를 쓰는 이유(docs/05_tech_review.md):
 * WorkManager는 Doze/OEM 배터리 최적화에 의해 시간이 밀릴 수 있어
 * "마감 임박 알림"처럼 시각이 중요한 경우 부적합하다고 판단했기 때문이다.
 *
 * 기기 재부팅 시 AlarmManager에 등록된 예약은 OS가 전부 지운다.
 * JS 엔진 없이도(앱을 안 열어도) 복구할 수 있도록, 예약할 때마다
 * [ReminderStore]에도 같은 내용을 저장해 두고 [BootCompletedReceiver]가
 * 부팅 직후 그 저장분을 그대로 재등록한다.
 */
class AlarmSchedulerModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "AlarmScheduler"

  private val alarmManager: AlarmManager
    get() = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  /**
   * @param notificationId 알림/요청별 고유 정수 ID(취소할 때도 동일한 ID 필요)
   * @param timestampMillis 울릴 시각(epoch millis)
   */
  @ReactMethod
  fun scheduleReminder(
    notificationId: Double,
    timestampMillis: Double,
    title: String,
    body: String,
    noticeId: String,
    promise: Promise,
  ) {
    try {
      val id = notificationId.toInt()
      val timestamp = timestampMillis.toLong()

      setAlarm(alarmManager, timestamp, buildPendingIntent(id, title, body, noticeId))
      ReminderStore.save(reactApplicationContext, id, timestamp, title, body, noticeId)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SCHEDULE_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun cancelReminder(notificationId: Double, promise: Promise) {
    try {
      val id = notificationId.toInt()
      val intent = Intent(reactApplicationContext, ReminderBroadcastReceiver::class.java)
      val pendingIntent = PendingIntent.getBroadcast(
        reactApplicationContext,
        id,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      alarmManager.cancel(pendingIntent)
      ReminderStore.remove(reactApplicationContext, id)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("CANCEL_FAILED", e.message, e)
    }
  }

  companion object {
    /**
     * 정확한 알람 권한이 없어도 알림을 버리지 않는다 — 예전엔 여기서 reject하고 JS는 경고만 찍어서
     * 예약이 조용히 사라졌다. 권한이 없으면 Doze 중에도 울리는 비정확 알람으로 대신 건다
     * (몇 분 늦을 수 있지만 "마감 전날 저녁" 알림엔 충분하다).
     */
    fun setAlarm(alarmManager: AlarmManager, timestamp: Long, pendingIntent: PendingIntent) {
      val canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()
      if (canExact) {
        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent)
      } else {
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent)
      }
    }

    fun buildPendingIntent(
      context: Context,
      id: Int,
      title: String,
      body: String,
      noticeId: String,
    ): PendingIntent {
      val intent = Intent(context, ReminderBroadcastReceiver::class.java).apply {
        putExtra(ReminderBroadcastReceiver.EXTRA_NOTIFICATION_ID, id)
        putExtra(ReminderBroadcastReceiver.EXTRA_TITLE, title)
        putExtra(ReminderBroadcastReceiver.EXTRA_BODY, body)
        putExtra(ReminderBroadcastReceiver.EXTRA_NOTICE_ID, noticeId)
      }
      return PendingIntent.getBroadcast(
        context,
        id,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }
  }

  private fun buildPendingIntent(id: Int, title: String, body: String, noticeId: String) =
    Companion.buildPendingIntent(reactApplicationContext, id, title, body, noticeId)

  @ReactMethod
  fun areNotificationsEnabled(promise: Promise) {
    promise.resolve(NotificationManagerCompat.from(reactApplicationContext).areNotificationsEnabled())
  }

  @ReactMethod
  fun canScheduleExactAlarms(promise: Promise) {
    val allowed = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      alarmManager.canScheduleExactAlarms()
    } else {
      true
    }
    promise.resolve(allowed)
  }
}
