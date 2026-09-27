package com.mobile.modules

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.mobile.MainActivity
import com.mobile.R

/**
 * AlarmManager가 예약된 시각에 발화시키는 리시버.
 *
 * 앱이 완전히 종료되어 있어도(JS 엔진이 안 떠있어도) 동작해야 하므로,
 * Notifee/JS를 거치지 않고 순수 네이티브 NotificationCompat으로 알림을 직접 띄운다.
 * (docs/05_tech_review.md: "알림 발송은 on-device, 서버는 일정만 계산".)
 */
class ReminderBroadcastReceiver : BroadcastReceiver() {

  companion object {
    const val CHANNEL_ID = "notice_together_reminders"
    const val EXTRA_NOTIFICATION_ID = "notificationId"
    const val EXTRA_TITLE = "title"
    const val EXTRA_BODY = "body"
  }

  override fun onReceive(context: Context, intent: Intent) {
    val notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, 0)
    val title = intent.getStringExtra(EXTRA_TITLE) ?: "알림투게더"
    val body = intent.getStringExtra(EXTRA_BODY) ?: "확인할 알림이 있어요."

    ensureChannel(context)

    val contentIntent = Intent(context, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val pendingContentIntent = PendingIntent.getActivity(
      context,
      notificationId,
      contentIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(body)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setAutoCancel(true)
      .setContentIntent(pendingContentIntent)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .build()

    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(notificationId, notification)
  }

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(
      CHANNEL_ID,
      "마감 임박 알림",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "준비물·제출서류 기한이 임박했을 때 알려줍니다."
    }
    manager.createNotificationChannel(channel)
  }
}
