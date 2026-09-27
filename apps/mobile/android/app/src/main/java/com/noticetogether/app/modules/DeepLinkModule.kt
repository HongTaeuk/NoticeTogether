package com.noticetogether.app.modules

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.noticetogether.app.MainActivity

/**
 * 알림을 탭해서 앱이 열렸을 때(콜드 스타트) 어떤 알림(notice)을 보고 있었는지
 * JS에 전달하는 브릿지. 앱이 이미 떠 있는 상태(웜 스타트)의 경우는
 * `MainActivity.onNewIntent`가 "NoticeDeepLink" 이벤트로 직접 emit한다.
 */
class DeepLinkModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "DeepLink"

  @ReactMethod
  fun getInitialNoticeId(promise: Promise) {
    promise.resolve(MainActivity.consumeInitialNoticeId())
  }
}
