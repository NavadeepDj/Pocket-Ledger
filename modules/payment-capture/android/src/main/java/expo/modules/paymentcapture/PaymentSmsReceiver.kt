package expo.modules.paymentcapture

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

class PaymentSmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION || !CaptureStore.enabled(context, "sms")) return
    val pendingResult = goAsync()
    Thread {
      try {
        // Reassemble multipart messages before parsing. No inbox/history permission is needed.
        Telephony.Sms.Intents.getMessagesFromIntent(intent)
          .groupBy { it.originatingAddress ?: "Bank SMS" }
          .forEach { (sender, parts) ->
            CaptureStore.enqueue(context, "sms", sender, parts.joinToString("") { it.messageBody ?: "" },
              parts.first().timestampMillis)
          }
      } catch (error: Exception) {
        // Do not put message contents in system logs.
        Log.e("PaymentCapture", "Could not persist incoming SMS alert", error)
      } finally {
        pendingResult.finish()
      }
    }.start()
  }
}
