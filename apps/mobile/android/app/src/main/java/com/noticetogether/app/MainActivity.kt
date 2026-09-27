package com.noticetogether.app

import android.content.Intent
import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivity : ReactActivity() {

  companion object {
    const val EXTRA_NOTICE_ID = "noticeId"
    private var pendingNoticeId: String? = null

    /** JS가 콜드 스타트 시 한 번 읽고 나면 비운다(다음에 다시 못 읽도록). */
    fun consumeInitialNoticeId(): String? {
      val value = pendingNoticeId
      pendingNoticeId = null
      return value
    }
  }

  // 개발 중 adb로 화면을 계속 조작/확인하기 위한 편의 설정(잠금화면 위에 표시 + 화면 켜기).
  // TODO: 실제 배포 전에는 제거하거나 사용자 설정으로 뺄 것.
  override fun onCreate(savedInstanceState: Bundle?) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    }
    pendingNoticeId = intent?.getStringExtra(EXTRA_NOTICE_ID)
    super.onCreate(savedInstanceState)
  }

  /**
   * 앱이 이미 떠 있는 상태(singleTask)에서 알림을 탭하면 onCreate가 아니라
   * 여기로 온다. JS가 이미 실행 중이므로 getInitialNoticeId()로는 못 받고,
   * 이벤트로 직접 흘려보내야 한다.
   */
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    val noticeId = intent.getStringExtra(EXTRA_NOTICE_ID) ?: return
    reactInstanceManager.currentReactContext
      ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      ?.emit("NoticeDeepLink", noticeId)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "mobile"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
