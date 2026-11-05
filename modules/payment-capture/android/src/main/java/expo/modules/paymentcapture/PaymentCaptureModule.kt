package expo.modules.paymentcapture

import android.Manifest
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PaymentCaptureModule : Module() {
  private val context get() = requireNotNull(appContext.reactContext) { "Android context unavailable" }

  override fun definition() = ModuleDefinition {
    Name("PaymentCapture")

    AsyncFunction("getStatusAsync") {
      val listeners = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners").orEmpty()
      val component = ComponentName(context, PaymentNotificationListener::class.java)
      mapOf(
        "smsEnabled" to CaptureStore.enabled(context, "sms"),
        "notificationConnected" to PaymentNotificationListener.connected,
        "notificationEnabled" to CaptureStore.enabled(context, "notification"),
        "smsGranted" to (context.checkSelfPermission(Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED),
        "notificationGranted" to listeners.split(':').any { ComponentName.unflattenFromString(it) == component }
      )
    }
    AsyncFunction("setEnabledAsync") { source: String, enabled: Boolean ->
      require(source == "sms" || source == "notification")
      CaptureStore.setEnabled(context, source, enabled)
    }
    AsyncFunction("openNotificationSettingsAsync") {
      context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    AsyncFunction("getPendingAsync") { CaptureStore.pending(context) }
    AsyncFunction("acknowledgeAsync") { ids: List<String> -> CaptureStore.acknowledge(context, ids) }
  }
}
