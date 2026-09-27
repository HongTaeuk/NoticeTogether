package com.noticetogether.app.modules

import android.content.Context
import org.json.JSONObject

/**
 * 예약된 알림을 SharedPreferences에 그대로 복제해 둔다.
 * JS/AlarmManager 둘 다 재부팅되면 사라지므로, [BootCompletedReceiver]가
 * 앱 실행 없이도 여기서 읽어 그대로 재등록할 수 있게 하기 위함이다.
 */
object ReminderStore {
  private const val PREFS_NAME = "reminder_store"

  fun save(
    context: Context,
    id: Int,
    timestampMillis: Long,
    title: String,
    body: String,
    noticeId: String,
  ) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val entry = JSONObject().apply {
      put("timestamp", timestampMillis)
      put("title", title)
      put("body", body)
      put("noticeId", noticeId)
    }
    prefs.edit().putString(id.toString(), entry.toString()).apply()
  }

  fun remove(context: Context, id: Int) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    prefs.edit().remove(id.toString()).apply()
  }

  data class Entry(
    val id: Int,
    val timestampMillis: Long,
    val title: String,
    val body: String,
    val noticeId: String,
  )

  fun readAll(context: Context): List<Entry> {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    return prefs.all.mapNotNull { (key, value) ->
      val id = key.toIntOrNull() ?: return@mapNotNull null
      val json = (value as? String) ?: return@mapNotNull null
      try {
        val obj = JSONObject(json)
        Entry(
          id = id,
          timestampMillis = obj.getLong("timestamp"),
          title = obj.getString("title"),
          body = obj.getString("body"),
          noticeId = obj.optString("noticeId", ""),
        )
      } catch (e: Exception) {
        null
      }
    }
  }

  /** 이미 지난 예약은 재등록해도 의미가 없으므로 정리한다. */
  fun removeExpired(context: Context, ids: List<Int>) {
    if (ids.isEmpty()) return
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val editor = prefs.edit()
    ids.forEach { editor.remove(it.toString()) }
    editor.apply()
  }
}
