package expo.modules.callrecording

import android.content.Intent
import android.os.Build
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CallRecordingModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("CallRecording")

        AsyncFunction<Unit>("startForegroundRecording") {
            val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
            val intent = Intent(context, CallRecordingService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        AsyncFunction<Unit>("stopForegroundRecording") {
            val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
            context.stopService(Intent(context, CallRecordingService::class.java))
        }
    }
}
