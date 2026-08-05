package expo.modules.callrecording

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * Foreground service whose only job is to keep this app's process alive (and therefore its JS
 * runtime, and the expo-audio recorder already running there) while the agent backgrounds the app
 * to use the native Phone dialer. It does not record audio itself -- the JS side handles that via
 * expo-audio, the same mechanism already used for the SOS panic-button recording. Android requires
 * a foreground service (with foregroundServiceType="microphone") for a mic-using process to keep
 * running in the background at all; without this, the recording would very likely be suspended
 * the moment the native dialer takes over.
 */
class CallRecordingService : Service() {

    companion object {
        const val CHANNEL_ID = "call_recording_channel"
        const val NOTIFICATION_ID = 8821
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForegroundWithNotification()
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startForegroundWithNotification() {
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Call recording",
                NotificationManager.IMPORTANCE_LOW
            )
            manager.createNotificationChannel(channel)
        }

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Recording call for compliance")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }
}
