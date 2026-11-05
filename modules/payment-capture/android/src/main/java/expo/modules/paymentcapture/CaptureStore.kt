package expo.modules.paymentcapture

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest

/** Device-local queue. Receivers never depend on the JS runtime being alive. */
internal object CaptureStore {
  private fun prefs(context: Context) = context.getSharedPreferences("payment_capture", Context.MODE_PRIVATE)

  fun enabled(context: Context, source: String) = source != "sms" && prefs(context).getBoolean(source, false)

  @Synchronized
  fun setEnabled(context: Context, source: String, enabled: Boolean) {
    check(prefs(context).edit().putBoolean(source, enabled).commit()) { "Could not save capture preference" }
  }

  // Filter before storing: never persist OTPs, requests, failures or unrelated messages.
  private val action = Regex("\\b(debited|credited|spent|paid|sent|received|withdrawn|deposited|refunded|deducted|transferred)\\b", RegexOption.IGNORE_CASE)
  private val currency = Regex("(?:rs\\.?|inr|₹)\\s*[0-9]", RegexOption.IGNORE_CASE)
  private val excluded = Regex("\\b(otp|one[ -]time password|verification code|failed|declined|pending|processing|unsuccessful|request|requested|reminder|due|scheduled|will be|could not|not debited|not paid|not sent)\\b", RegexOption.IGNORE_CASE)

  @Synchronized
  fun enqueue(context: Context, source: String, sender: String, text: String, timestamp: Long, eventKey: String = "") {
    if (!enabled(context, source) || text.length > 8000 || !action.containsMatchIn(text) ||
      !currency.containsMatchIn(text) || excluded.containsMatchIn(text)) return
    val id = MessageDigest.getInstance("SHA-256")
      .digest("$source|$sender|$timestamp|$eventKey|$text".toByteArray())
      .joinToString("") { "%02x".format(it) }
    val queue = JSONArray(prefs(context).getString("queue", "[]"))
    for (i in 0 until queue.length()) if (queue.getJSONObject(i).getString("id") == id) return
    queue.put(JSONObject().put("id", id).put("source", source).put("sender", sender)
      .put("text", text).put("timestamp", timestamp))
    val retained = JSONArray()
    val cutoff = System.currentTimeMillis() - 30L * 24 * 60 * 60 * 1000
    for (i in maxOf(0, queue.length() - 500) until queue.length()) {
      val item = queue.getJSONObject(i)
      if (item.getLong("timestamp") >= cutoff) retained.put(item)
    }
    check(prefs(context).edit().putString("queue", retained.toString()).commit()) { "Could not save payment alert" }
  }

  @Synchronized
  fun pending(context: Context): String {
    val queue = JSONArray(prefs(context).getString("queue", "[]"))
    val retained = JSONArray()
    val cutoff = System.currentTimeMillis() - 30L * 24 * 60 * 60 * 1000
    for (i in 0 until queue.length()) {
      val item = queue.getJSONObject(i)
      if (item.getLong("timestamp") >= cutoff) retained.put(item)
    }
    if (retained.length() != queue.length()) {
      check(prefs(context).edit().putString("queue", retained.toString()).commit()) { "Could not expire old alerts" }
    }
    return retained.toString()
  }

  @Synchronized
  fun acknowledge(context: Context, ids: List<String>) {
    val queue = JSONArray(pending(context))
    val remaining = JSONArray()
    val acknowledged = ids.toSet()
    for (i in 0 until queue.length()) {
      val item = queue.getJSONObject(i)
      if (item.getString("id") !in acknowledged) remaining.put(item)
    }
    check(prefs(context).edit().putString("queue", remaining.toString()).commit()) { "Could not acknowledge payment alerts" }
  }
}
