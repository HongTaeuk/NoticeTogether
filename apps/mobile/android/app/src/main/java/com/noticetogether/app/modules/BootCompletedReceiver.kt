package com.noticetogether.app.modules

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * 기기 재부팅 시 AlarmManager 예약이 전부 사라지는 문제(FR-4 신뢰성)에 대한
 * 진짜 복구 경로. JS/앱 실행 없이 [ReminderStore]에 저장된 예약을 그대로
 * 다시 등록한다. 이미 지난 시각은 건너뛰고 정리한다.
 */
class BootCompletedReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val now = System.currentTimeMillis()
    val expired = mutableListOf<Int>()

    ReminderStore.readAll(context).forEach { entry ->
      if (entry.timestampMillis <= now) {
        expired.add(entry.id)
        return@forEach
      }
      val pendingIntent = AlarmSchedulerModule.buildPendingIntent(
        context,
        entry.id,
        entry.title,
        entry.body,
        entry.noticeId,
      )
      AlarmSchedulerModule.setAlarm(alarmManager, entry.timestampMillis, pendingIntent)
    }

    ReminderStore.removeExpired(context, expired)
  }
}
