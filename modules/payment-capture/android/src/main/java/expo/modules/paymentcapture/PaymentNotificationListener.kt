package expo.modules.paymentcapture

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class PaymentNotificationListener : NotificationListenerService() {
  companion object {
    @Volatile var connected = false
      private set
  }
  // Only these payment/bank apps are inspected. Messaging apps are covered by RECEIVE_SMS instead.
  private val paymentApps = setOf(
    "com.phonepe.app", "indwin.c3.shareapp", "com.google.android.apps.nbu.paisa.user", "net.one97.paytm",
    "in.org.npci.upiapp", "com.dreamplug.androidapp", "com.amazon.mShop.android.shopping",
    "com.sbi.lotusintouch", "com.sbi.SBIFreedomPlus", "com.snapwork.hdfc", "com.hdfcbank.payzapp",
    "com.csam.icici.bank.imobile", "com.axis.mobile", "com.msf.kbank.mobile"
  )

  override fun onListenerConnected() {
    connected = true
    // Recover alerts still in the shade after a disconnect, without requiring JS.
    try { activeNotifications?.forEach { onNotificationPosted(it) } }
    catch (error: Exception) { Log.w("PaymentCapture", "Could not recover active alerts", error) }
  }

  override fun onListenerDisconnected() {
    connected = false
    if (CaptureStore.enabled(this, "notification")) {
      try { requestRebind(android.content.ComponentName(this, PaymentNotificationListener::class.java)) }
      catch (error: Exception) { Log.w("PaymentCapture", "Notification access unavailable", error) }
    }
  }

  override fun onDestroy() {
    connected = false
    super.onDestroy()
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    if (!CaptureStore.enabled(this, "notification") || sbn.packageName !in paymentApps) return
    val notification = sbn.notification
    // Summary rows can contain multiple payments. Only individual notifications are
    // parsed until we can assign each summary entry its own stable identity.
    if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
    val extras = notification.extras
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
    val body = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
      ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString().orEmpty()
    val text = listOf(title, body).filter { it.isNotBlank() }.distinct().joinToString("\n")
    try {
      CaptureStore.enqueue(this, "notification", sbn.packageName, text,
        notification.`when`.takeIf { it > 0 } ?: sbn.postTime, sbn.key)
    } catch (error: Exception) {
      Log.e("PaymentCapture", "Could not persist payment notification", error)
    }
  }
}
