import path from 'node:path';
import fs from 'fs-extra';
import { applyPatches } from '../../utils/nativePatch.js';

async function edit(file: string, transform: (source: string) => string): Promise<void> {
  if (!(await fs.pathExists(file))) return;
  const source = await fs.readFile(file, 'utf8');
  const next = transform(source);
  if (next !== source) await fs.writeFile(file, next, 'utf8');
}

/**
 * Generates Kotlin source code for the Android native incoming call subsystem.
 * This runs natively even when the app is in KILLED mode or the phone is locked.
 */
function getIncomingCallActivitySource(packageName: string): string {
  return `package ${packageName}.calling

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import ${packageName}.MainActivity
import ${packageName}.R

class IncomingCallActivity : Activity() {

    companion object {
        private var current: java.lang.ref.WeakReference<IncomingCallActivity>? = null

        /** Closes the call screen (the caller hung up, the call timed out, or the app answered it). */
        fun finishCurrent() {
            current?.get()?.let { if (!it.isFinishing) it.finish() }
            current = null
        }
    }

    private var callId: String = ""
    private var callerId: String = ""
    private var callerName: String = ""
    private var channelName: String = ""
    private var callType: String = "audio"
    private var token: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Turn on screen and show over lockscreen even when device is locked
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }
        @Suppress("DEPRECATION")
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )

        // Retrieve call details
        callId = intent.getStringExtra("callId") ?: ""
        callerId = intent.getStringExtra("callerId") ?: ""
        callerName = intent.getStringExtra("callerName") ?: "Incoming Call"
        channelName = intent.getStringExtra("channelName") ?: ""
        callType = intent.getStringExtra("callType") ?: "audio"
        token = intent.getStringExtra("token") ?: ""

        current = java.lang.ref.WeakReference(this)
        setContentView(buildView())
    }

    private fun dp(value: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value.toFloat(),
            resources.displayMetrics
        ).toInt()
    }

    private fun buildView(): View {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setBackgroundColor(Color.parseColor("#0F121D"))
            setPadding(dp(24), dp(60), dp(24), dp(48))
        }

        // Subtitle badge
        val badge = TextView(this).apply {
            text = if (callType.equals("video", ignoreCase = true)) "INCOMING VIDEO CALL" else "INCOMING AUDIO CALL"
            setTextColor(Color.parseColor("#38BDF8"))
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            letterSpacing = 0.15f
            gravity = Gravity.CENTER
        }
        root.addView(badge)

        // Spacer
        root.addView(View(this), LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(40)))

        // Avatar container (circle)
        val avatarSize = dp(110)
        val avatarContainer = FrameLayout(this).apply {
            val bg = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#1E2438"))
                setStroke(dp(3), Color.parseColor("#38BDF8"))
            }
            background = bg
        }
        val avatarParams = LinearLayout.LayoutParams(avatarSize, avatarSize).apply {
            gravity = Gravity.CENTER_HORIZONTAL
        }

        val initialText = if (callerName.isNotBlank()) callerName.trim().take(1).uppercase() else "C"
        val avatarText = TextView(this).apply {
            text = initialText
            setTextColor(Color.WHITE)
            textSize = 40f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }
        avatarContainer.addView(
            avatarText,
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        )
        root.addView(avatarContainer, avatarParams)

        // Spacer
        root.addView(View(this), LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(24)))

        // Caller Name
        val nameView = TextView(this).apply {
            text = callerName
            setTextColor(Color.WHITE)
            textSize = 28f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }
        root.addView(nameView)

        // Status text
        val statusView = TextView(this).apply {
            text = "Ringing..."
            setTextColor(Color.parseColor("#94A3B8"))
            textSize = 15f
            gravity = Gravity.CENTER
            setPadding(0, dp(6), 0, 0)
        }
        root.addView(statusView)

        // Weight spacer
        val weightSpacer = View(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1.0f
            )
        }
        root.addView(weightSpacer)

        // Actions container (Decline & Answer)
        val actionsLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        val buttonSize = dp(70)

        // Decline Button Column
        val declineCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(20), 0, dp(20), 0)
        }
        val declineBtn = FrameLayout(this).apply {
            val bg = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#EF4444"))
            }
            background = bg
            isClickable = true
            isFocusable = true
            setOnClickListener { handleDecline() }
        }
        val declineIcon = ImageView(this).apply {
            setImageResource(R.drawable.ic_call_end)
            setColorFilter(Color.WHITE)
            setPadding(dp(18), dp(18), dp(18), dp(18))
        }
        declineBtn.addView(
            declineIcon,
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        )
        val declineLabel = TextView(this).apply {
            text = "Decline"
            setTextColor(Color.parseColor("#EF4444"))
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            setPadding(0, dp(10), 0, 0)
        }
        declineCol.addView(declineBtn, LinearLayout.LayoutParams(buttonSize, buttonSize))
        declineCol.addView(declineLabel)
        actionsLayout.addView(declineCol)

        // Spacer between buttons
        actionsLayout.addView(View(this), LinearLayout.LayoutParams(dp(40), 1))

        // Answer Button Column
        val answerCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(20), 0, dp(20), 0)
        }
        val answerBtn = FrameLayout(this).apply {
            val bg = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#22C55E"))
            }
            background = bg
            isClickable = true
            isFocusable = true
            setOnClickListener { handleAnswer() }
        }
        val answerIcon = ImageView(this).apply {
            setImageResource(if (callType.equals("video", ignoreCase = true)) R.drawable.ic_call_video else R.drawable.ic_call_answer)
            setColorFilter(Color.WHITE)
            setPadding(dp(18), dp(18), dp(18), dp(18))
        }
        answerBtn.addView(
            answerIcon,
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        )
        val answerLabel = TextView(this).apply {
            text = "Accept"
            setTextColor(Color.parseColor("#22C55E"))
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            setPadding(0, dp(10), 0, 0)
        }
        answerCol.addView(answerBtn, LinearLayout.LayoutParams(buttonSize, buttonSize))
        answerCol.addView(answerLabel)
        actionsLayout.addView(answerCol)

        root.addView(actionsLayout)
        return root
    }

    private fun handleDecline() {
        IncomingCallNotificationHelper.stopRinging(this)
        IncomingCallNotificationHelper.clearNotification(this)
        NativeCallModule.sendCallDeclined(applicationContext, callId)
        finish()
    }

    private fun handleAnswer() {
        IncomingCallNotificationHelper.stopRinging(this)
        IncomingCallNotificationHelper.clearNotification(this)

        val mainIntent = Intent(this, MainActivity::class.java).apply {
            action = "${packageName}.ACTION_CALL_ANSWERED"
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("action", "answer")
            putExtra("callId", callId)
            putExtra("callerId", callerId)
            putExtra("callerName", callerName)
            putExtra("channelName", channelName)
            putExtra("callType", callType)
            putExtra("token", token)
        }
        NativeCallModule.setPendingCallAnswer(mainIntent.extras)

        val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && keyguardManager?.isKeyguardLocked == true) {
            keyguardManager.requestDismissKeyguard(this, object : KeyguardManager.KeyguardDismissCallback() {
                override fun onDismissSucceeded() {
                    startActivity(mainIntent)
                    finish()
                }
                override fun onDismissCancelled() {
                    // user cancelled unlock
                }
                override fun onDismissError() {
                    startActivity(mainIntent)
                    finish()
                }
            })
        } else {
            startActivity(mainIntent)
            finish()
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }
        @Suppress("DEPRECATION")
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )
    }

    override fun onDestroy() {
        super.onDestroy()
        if (current?.get() === this) current = null
        IncomingCallNotificationHelper.stopRinging(this)
    }
}
`;
}

function getIncomingCallNotificationHelperSource(packageName: string): string {
  return `package ${packageName}.calling

import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import ${packageName}.R

object IncomingCallNotificationHelper {
    const val CHANNEL_ID = "incoming_call_channel"
    const val CHANNEL_NAME = "Incoming Calls"
    const val NOTIFICATION_ID = 9999

    private var ringtone: Ringtone? = null
    private var vibrator: Vibrator? = null
    /** The call on screen – the push and the app's socket both report the same call. */
    private var currentCallId: String? = null

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Incoming call notifications"
                enableLights(true)
                lightColor = Color.GREEN
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 800, 1000, 800)
                setSound(
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .build()
                )
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun startRinging(context: Context) {
        try {
            if (ringtone == null) {
                var uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                if (uri == null) {
                    uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                }
                ringtone = RingtoneManager.getRingtone(context.applicationContext, uri)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    val attrs = AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .build()
                    ringtone?.audioAttributes = attrs
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    ringtone?.isLooping = true
                }
                ringtone?.play()
            }
        } catch (_: Exception) {}

        try {
            if (vibrator == null) {
                vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                    vm?.defaultVibrator
                } else {
                    @Suppress("DEPRECATION")
                    context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                }
                val pattern = longArrayOf(0, 1000, 800, 1000, 800)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(pattern, 0)
                }
            }
        } catch (_: Exception) {}
    }

    fun stopRinging(context: Context) {
        try {
            if (ringtone?.isPlaying == true) {
                ringtone?.stop()
            }
            ringtone = null
        } catch (_: Exception) {}

        try {
            vibrator?.cancel()
            vibrator = null
        } catch (_: Exception) {}
    }

    fun showIncomingCall(
        context: Context,
        callId: String,
        callerId: String,
        callerName: String,
        channelName: String,
        callType: String,
        token: String?
    ) {
        if (callId.isNotEmpty() && callId == currentCallId) return
        currentCallId = callId
        createNotificationChannel(context)
        startRinging(context)

        // Full screen activity intent (displays UI on locked or waking device)
        val fullScreenIntent = Intent(context, IncomingCallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("callId", callId)
            putExtra("callerId", callerId)
            putExtra("callerName", callerName)
            putExtra("channelName", channelName)
            putExtra("callType", callType)
            putExtra("token", token ?: "")
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            NOTIFICATION_ID,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Decline pending intent
        val declineIntent = Intent(context, IncomingCallBroadcastReceiver::class.java).apply {
            action = "\${context.packageName}.ACTION_DECLINE_CALL"
            putExtra("callId", callId)
        }
        val declinePendingIntent = PendingIntent.getBroadcast(
            context,
            NOTIFICATION_ID + 1,
            declineIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Answer pending intent
        val answerIntent = Intent(context, IncomingCallBroadcastReceiver::class.java).apply {
            action = "\${context.packageName}.ACTION_ANSWER_CALL"
            putExtra("callId", callId)
            putExtra("callerId", callerId)
            putExtra("callerName", callerName)
            putExtra("channelName", channelName)
            putExtra("callType", callType)
            putExtra("token", token ?: "")
        }
        val answerPendingIntent = PendingIntent.getBroadcast(
            context,
            NOTIFICATION_ID + 2,
            answerIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )


        val title = if (callerName.isNotBlank()) callerName else "Incoming Call"
        val subtitle = if (callType.equals("video", ignoreCase = true)) "Incoming Video Call" else "Incoming Audio Call"

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_call_answer)
            .setContentTitle(title)
            .setContentText(subtitle)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setAutoCancel(true)
            .setOngoing(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            // Android's standard incoming call notification: caller + red Decline / green Answer buttons.
            .setStyle(
                NotificationCompat.CallStyle.forIncomingCall(
                    Person.Builder().setName(title).setImportant(true).build(),
                    declinePendingIntent,
                    answerPendingIntent
                ).setIsVideo(callType.equals("video", ignoreCase = true))
            )

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        // One UI only: Android opens the full screen call activity itself when the phone is locked / the screen
        // is off, and shows the pop-up notification when the phone is in use.
        notificationManager.notify(NOTIFICATION_ID, builder.build())

        // On locked / screen-off devices, directly launch the full screen intent to bypass vendor background restrictions
        val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val isLocked = keyguardManager?.isKeyguardLocked ?: false
        val isInteractive = powerManager?.isInteractive ?: false

        if (isLocked || !isInteractive) {
            try {
                @Suppress("DEPRECATION")
                val wakeLock = powerManager?.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
                    "${packageName}:IncomingCallWakeLock"
                )
                wakeLock?.acquire(5000L)
                context.startActivity(fullScreenIntent)
            } catch (e: Exception) {
                android.util.Log.e("IncomingCall", "Direct activity start failed: \${e.message}")
            }
        }
    }

    /** The call ended before it was answered (push CALL_ENDED): stop ringing and close the call screen. */
    fun dismissCall(context: Context, callId: String) {
        if (callId.isNotEmpty() && callId != currentCallId) return
        clearNotification(context)
        IncomingCallActivity.finishCurrent()
    }

    fun clearNotification(context: Context) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(NOTIFICATION_ID)
        stopRinging(context)
    }
}
`;
}

function getIncomingCallBroadcastReceiverSource(packageName: string): string {
  return `package ${packageName}.calling

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import ${packageName}.MainActivity

class IncomingCallBroadcastReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        val callId = intent.getStringExtra("callId") ?: ""

        IncomingCallNotificationHelper.stopRinging(context)
        IncomingCallNotificationHelper.clearNotification(context)

        val expectedDecline = "\${context.packageName}.ACTION_DECLINE_CALL"
        val expectedAnswer = "\${context.packageName}.ACTION_ANSWER_CALL"

        when (action) {
            expectedDecline -> {
                NativeCallModule.sendCallDeclined(context, callId)
            }
            expectedAnswer -> {
                val extras = intent.extras
                NativeCallModule.setPendingCallAnswer(extras)

                val mainIntent = Intent(context, MainActivity::class.java).apply {
                    this.action = "\${context.packageName}.ACTION_CALL_ANSWERED"
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    if (extras != null) {
                        putExtras(extras)
                    }
                }
                context.startActivity(mainIntent)
            }
        }
    }
}
`;
}

function getNativeCallModuleSource(packageName: string): string {
  return `package ${packageName}.calling

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.common.LifecycleState
import com.facebook.react.modules.core.DeviceEventManagerModule

class NativeCallModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "NativeCallModule"
        private var instance: NativeCallModule? = null
        private var pendingCallAnswer: Bundle? = null
        /** The answer already handed to JS: the activity, the notification and onNewIntent all report the same tap. */
        private var deliveredCallId: String? = null

        fun setPendingCallAnswer(bundle: Bundle?) {
            val callId = bundle?.getString("callId") ?: return
            if (callId == deliveredCallId || callId == pendingCallAnswer?.getString("callId")) return
            pendingCallAnswer = bundle
            instance?.emitPendingCallAnswer()
        }

        fun handleCallIntent(intent: Intent?) {
            if (intent?.action?.endsWith(".ACTION_CALL_ANSWERED") == true) {
                val extras = intent.extras
                if (extras != null) {
                    setPendingCallAnswer(extras)
                }
            }
        }

        /**
         * The app is on screen (its activity is resumed). Process importance is no help here: Android reports
         * the process as foreground while it handles a high-priority push, even with the app in the background.
         */
        fun isAppVisible(): Boolean {
            val context = instance?.reactContext ?: return false
            val km = context.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
            if (km?.isKeyguardLocked == true) return false
            return context.lifecycleState == LifecycleState.RESUMED
        }

        /** A call push while the app is open: hands it to JS (its own call screen). False when JS cannot take it. */
        fun deliverIncomingCall(data: Map<String, String>): Boolean {
            val map = Arguments.createMap().apply { data.forEach { (key, value) -> putString(key, value) } }
            return instance?.emitEvent("onIncomingCall", map) ?: false
        }

        fun sendCallDeclined(context: Context, callId: String) {
            val map = Arguments.createMap().apply {
                putString("callId", callId)
            }
            instance?.emitEvent("onCallDeclined", map)
        }
    }

    init {
        instance = this
    }

    override fun getName(): String = MODULE_NAME

    /** Returns false when JS is not running yet (the answer stays pending for getInitialCallAction). */
    private fun emitEvent(eventName: String, params: Any?): Boolean {
        return try {
            if (!reactContext.hasActiveReactInstance()) return false
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
            true
        } catch (_: Exception) {
            false
        }
    }

    fun emitPendingCallAnswer() {
        val bundle = pendingCallAnswer ?: return
        val map = Arguments.createMap().apply {
            putString("action", "answer")
            putString("callId", bundle.getString("callId", ""))
            putString("callerId", bundle.getString("callerId", ""))
            putString("callerName", bundle.getString("callerName", ""))
            putString("channelName", bundle.getString("channelName", ""))
            putString("callType", bundle.getString("callType", "audio"))
            putString("token", bundle.getString("token", ""))
        }
        // Only a signal: the answer stays pending until JS takes it (getInitialCallAction). A push can start React
        // in the background, so this event may fire before the app has mounted any listener.
        emitEvent("onCallAnswered", map)
    }

    @ReactMethod
    fun getInitialCallAction(promise: Promise) {
        val bundle = pendingCallAnswer
        if (bundle != null) {
            val map = Arguments.createMap().apply {
                putString("action", "answer")
                putString("callId", bundle.getString("callId", ""))
                putString("callerId", bundle.getString("callerId", ""))
                putString("callerName", bundle.getString("callerName", ""))
                putString("channelName", bundle.getString("channelName", ""))
                putString("callType", bundle.getString("callType", "audio"))
                putString("token", bundle.getString("token", ""))
            }
            deliveredCallId = bundle.getString("callId")
            pendingCallAnswer = null
            promise.resolve(map)
        } else {
            promise.resolve(null)
        }
    }

    /** Resolves false (nothing shown) when the app is on screen – it shows its own incoming call screen then. */
    @ReactMethod
    fun showIncomingCall(callData: ReadableMap, promise: Promise) {
        if (isAppVisible()) {
            promise.resolve(false)
            return
        }
        try {
            val callId = if (callData.hasKey("callId")) callData.getString("callId") ?: "" else ""
            val callerId = if (callData.hasKey("callerId")) callData.getString("callerId") ?: "" else ""
            val callerName = if (callData.hasKey("callerName")) callData.getString("callerName") ?: "Incoming Call" else "Incoming Call"
            val channelName = if (callData.hasKey("channelName")) callData.getString("channelName") ?: "" else ""
            val callType = if (callData.hasKey("callType")) callData.getString("callType") ?: "audio" else "audio"
            val token = if (callData.hasKey("token")) callData.getString("token") else ""

            IncomingCallNotificationHelper.showIncomingCall(
                reactContext,
                callId = callId,
                callerId = callerId,
                callerName = callerName,
                channelName = channelName,
                callType = callType,
                token = token
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CALL_SHOW_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun endCall(promise: Promise) {
        try {
            IncomingCallNotificationHelper.stopRinging(reactContext)
            IncomingCallNotificationHelper.clearNotification(reactContext)
            IncomingCallActivity.finishCurrent()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CALL_END_ERROR", e.message, e)
        }
    }

    /** During a call the app shows over the lock screen and turns the screen on – like the phone app. */
    @ReactMethod
    fun setCallActive(active: Boolean, promise: Promise) {
        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.resolve(false)
            return
        }
        activity.runOnUiThread {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O_MR1) {
                activity.setShowWhenLocked(active)
                activity.setTurnScreenOn(active)
            } else {
                @Suppress("DEPRECATION")
                val flags = android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                if (active) activity.window.addFlags(flags) else activity.window.clearFlags(flags)
            }
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
`;
}

function getCallPackageSource(packageName: string): string {
  return `package ${packageName}.calling

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class CallPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(NativeCallModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;
}

function getIncomingCallFirebaseMessagingServiceSource(packageName: string): string {
  return `package ${packageName}.calling

import com.google.firebase.messaging.RemoteMessage
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService

/**
 * The app's only FCM service (React Native Firebase's own one is removed in AndroidManifest.xml, so Android
 * cannot pick that one instead). Call pushes are data-only, so this runs even when the app is killed or in the
 * background and shows the native call screen; every other message goes on to React Native Firebase.
 */
class IncomingCallFirebaseMessagingService : ReactNativeFirebaseMessagingService() {
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val data = remoteMessage.data
        when (data["type"]) {
            // App open: its own call screen. Otherwise the native notification (full screen when locked).
            "CALL_INCOMING" -> if (!(NativeCallModule.isAppVisible() && NativeCallModule.deliverIncomingCall(data))) IncomingCallNotificationHelper.showIncomingCall(
                applicationContext,
                callId = data["callId"] ?: "",
                callerId = data["callerId"] ?: "",
                callerName = data["callerName"] ?: "Incoming Call",
                channelName = data["channelName"] ?: "",
                callType = data["callType"] ?: "audio",
                token = data["token"] ?: ""
            )
            "CALL_ENDED" -> IncomingCallNotificationHelper.dismissCall(applicationContext, data["callId"] ?: "")
            else -> super.onMessageReceived(remoteMessage)
        }
    }
}
`;
}

/** Material "call", "call end" and "videocam" icons for the native call screen and notification. */
const CALL_ICONS: Record<string, string> = {
  ic_call_answer:
    'M20.01,15.38c-1.23,0 -2.42,-0.2 -3.53,-0.56 -0.35,-0.12 -0.74,-0.03 -1.01,0.24l-1.57,1.97c-2.83,-1.35 -5.48,-3.9 -6.89,-6.83l1.95,-1.66c0.27,-0.28 0.35,-0.67 0.24,-1.02 -0.37,-1.11 -0.56,-2.3 -0.56,-3.53 0,-0.54 -0.45,-0.99 -0.99,-0.99H4.19C3.65,3 3,3.24 3,3.99 3,13.28 10.73,21 20.01,21c0.71,0 0.99,-0.63 0.99,-1.18v-3.45c0,-0.54 -0.45,-0.99 -0.99,-0.99z',
  ic_call_end:
    'M12,9c-1.6,0 -3.15,0.25 -4.6,0.72v3.1c0,0.39 -0.23,0.74 -0.56,0.9 -0.98,0.49 -1.87,1.12 -2.66,1.85 -0.18,0.18 -0.43,0.28 -0.7,0.28 -0.28,0 -0.53,-0.11 -0.71,-0.29L0.29,13.08c-0.18,-0.17 -0.29,-0.42 -0.29,-0.7 0,-0.28 0.11,-0.53 0.29,-0.71C3.34,8.78 7.46,7 12,7s8.66,1.78 11.71,4.67c0.18,0.18 0.29,0.43 0.29,0.71 0,0.28 -0.11,0.53 -0.29,0.71l-2.48,2.48c-0.18,0.18 -0.43,0.29 -0.71,0.29 -0.27,0 -0.52,-0.11 -0.7,-0.28 -0.79,-0.74 -1.69,-1.36 -2.67,-1.85 -0.33,-0.16 -0.56,-0.5 -0.56,-0.9v-3.1C15.15,9.25 13.6,9 12,9z',
  ic_call_video:
    'M17,10.5V7c0,-0.55 -0.45,-1 -1,-1H4c-0.55,0 -1,0.45 -1,1v10c0,0.55 0.45,1 1,1h12c0.55,0 1,-0.45 1,-1v-3.5l4,4v-11l-4,4z',
};

function vectorDrawable(pathData: string): string {
  return `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="${pathData}" />
</vector>
`;
}

/**
 * Android: Native incoming call suite & Agora calling permissions.
 * Wakes the device and renders full-screen call UI natively from killed mode or lockscreen.
 */
export async function configureAndroidCalling(
  projectDir: string,
  hasVideo: boolean,
  packageName: string = 'com.myapp',
  /** Push notifications (React Native Firebase messaging) – needed to ring a killed / backgrounded app. */
  hasFirebaseMessaging: boolean = false,
): Promise<void> {
  const packagePath = packageName.replace(/\./g, '/');
  let baseSourceDir = path.join(projectDir, 'android', 'app', 'src', 'main', 'java', packagePath);
  if (!(await fs.pathExists(baseSourceDir))) {
    const altDir = path.join(projectDir, 'android', 'app', 'src', 'main', 'kotlin', packagePath);
    if (await fs.pathExists(altDir)) {
      baseSourceDir = altDir;
    }
  }
  const callingDir = path.join(baseSourceDir, 'calling');
  await fs.ensureDir(callingDir);

  // 1. Write native Kotlin calling files
  await fs.writeFile(path.join(callingDir, 'IncomingCallActivity.kt'), getIncomingCallActivitySource(packageName), 'utf8');
  await fs.writeFile(path.join(callingDir, 'IncomingCallNotificationHelper.kt'), getIncomingCallNotificationHelperSource(packageName), 'utf8');
  await fs.writeFile(path.join(callingDir, 'IncomingCallBroadcastReceiver.kt'), getIncomingCallBroadcastReceiverSource(packageName), 'utf8');
  await fs.writeFile(path.join(callingDir, 'NativeCallModule.kt'), getNativeCallModuleSource(packageName), 'utf8');
  await fs.writeFile(path.join(callingDir, 'CallPackage.kt'), getCallPackageSource(packageName), 'utf8');
  const drawableDir = path.join(projectDir, 'android', 'app', 'src', 'main', 'res', 'drawable');
  await fs.ensureDir(drawableDir);
  for (const [name, pathData] of Object.entries(CALL_ICONS)) {
    await fs.writeFile(path.join(drawableDir, `${name}.xml`), vectorDrawable(pathData), 'utf8');
  }
  const fcmService = path.join(callingDir, 'IncomingCallFirebaseMessagingService.kt');
  if (hasFirebaseMessaging) await fs.writeFile(fcmService, getIncomingCallFirebaseMessagingServiceSource(packageName), 'utf8');
  else await fs.remove(fcmService);

  // 2. Patch AndroidManifest.xml
  const manifest = path.join(projectDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  await edit(manifest, source => {
    const callingPerms: string[] = [];
    if (!source.includes('android.permission.RECORD_AUDIO')) {
      callingPerms.push('<!-- Agora calling: microphone -->', '<uses-permission android:name="android.permission.RECORD_AUDIO" />');
    }
    if (hasVideo && !source.includes('android.permission.CAMERA')) {
      callingPerms.push(
        '<!-- Agora calling: camera (video calls) -->',
        '<uses-permission android:name="android.permission.CAMERA" />',
        '<uses-feature android:name="android.hardware.camera" android:required="false" />',
        '<uses-feature android:name="android.hardware.camera.front" android:required="false" />',
      );
    }
    callingPerms.push(
      '<!-- Fullscreen incoming call intent for Android lockscreen and killed state -->',
      '<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />',
      '<uses-permission android:name="android.permission.VIBRATE" />',
      '<uses-permission android:name="android.permission.WAKE_LOCK" />',
    );
    if (!source.includes('android.permission.POST_NOTIFICATIONS')) {
      callingPerms.push('<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />');
    }
    callingPerms.push(
      '<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />',
      '<!-- Bluetooth headsets for calls -->',
      '<uses-permission android:name="android.permission.BLUETOOTH" />',
      '<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />',
      '<!-- CallKeep foreground service -->',
      '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />',
      '<uses-permission android:name="android.permission.FOREGROUND_SERVICE_PHONE_CALL" />',
      '<!-- Audio routing (earpiece / speaker) -->',
      '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
      '<!-- CallKeep / Android ConnectionService -->',
      '<uses-permission android:name="android.permission.READ_PHONE_STATE" />',
      '<uses-permission android:name="android.permission.MANAGE_OWN_CALLS" />',
    );

    let result = applyPatches(
      source,
      [
        {
          id: 'calling-permissions',
          anchor: /<uses-permission android:name="android\.permission\.INTERNET" \/>/,
          position: 'after',
          comment: 'xml',
          content: callingPerms.join('\n'),
        },
        {
          id: 'calling-native-components',
          anchor: /<\/application>/,
          position: 'before',
          comment: 'xml',
          content: [
            '    <!-- Native incoming call activity (shows full screen on lock screen or when phone is ringing) -->',
            '    <activity',
            '      android:name=".calling.IncomingCallActivity"',
            '      android:theme="@style/AppTheme"',
            '      android:showOnLockScreen="true"',
            '      android:showWhenLocked="true"',
            '      android:turnScreenOn="true"',
            '      android:inheritShowWhenLocked="true"',
            '      android:launchMode="singleTop"',
            '      android:excludeFromRecents="true"',
            '      android:screenOrientation="portrait"',
            '      android:exported="false" />',
            '',
            '    <!-- Incoming call broadcast receiver (handles Answer & Decline notification actions) -->',
            '    <receiver',
            '      android:name=".calling.IncomingCallBroadcastReceiver"',
            '      android:exported="false">',
            '      <intent-filter>',
            '        <action android:name="${applicationId}.ACTION_ANSWER_CALL" />',
            '        <action android:name="${applicationId}.ACTION_DECLINE_CALL" />',
            '      </intent-filter>',
            '    </receiver>',
            ...(hasFirebaseMessaging
              ? [
                  '',
                  '    <!-- Firebase Messaging Service: wakes app and shows native call UI even in killed mode -->',
                  '    <service',
                  '      android:name=".calling.IncomingCallFirebaseMessagingService"',
                  '      android:exported="false">',
                  '      <intent-filter>',
                  '        <action android:name="com.google.firebase.MESSAGING_EVENT" />',
                  '      </intent-filter>',
                  '    </service>',
                  '    <!-- Only one FCM service may exist: the one above forwards non-call messages to React Native Firebase -->',
                  '    <service',
                  '      android:name="io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService"',
                  '      tools:node="remove" />',
                ]
              : []),
          ].join('\n'),
        },
      ],
      'AndroidManifest.xml',
    );
    // tools:node="remove" (React Native Firebase's FCM service) needs the tools namespace.
    if (hasFirebaseMessaging && !result.includes('xmlns:tools=')) {
      result = result.replace('<manifest xmlns:android="http://schemas.android.com/apk/res/android"', '$& xmlns:tools="http://schemas.android.com/tools"');
    }
    return result;
  });

  // 3. Patch MainActivity.kt
  const mainActivity = path.join(baseSourceDir, 'MainActivity.kt');
  await edit(mainActivity, source => {
    let next = source;
    if (!next.includes('import android.content.Intent')) {
      next = next.replace(/(package\s+[^\n]+)/, `$1\n\nimport android.content.Intent\nimport ${packageName}.calling.NativeCallModule`);
    }
    if (!next.includes('onNewIntent')) {
      const classAnchor = /class\s+MainActivity[^{]*\{/;
      next = next.replace(
        classAnchor,
        `$&\n\n  override fun onNewIntent(intent: Intent) {\n    super.onNewIntent(intent)\n    setIntent(intent)\n    NativeCallModule.handleCallIntent(intent)\n  }`,
      );
    }
    return next;
  });

  // 4. Patch MainApplication.kt
  const mainApp = path.join(baseSourceDir, 'MainApplication.kt');
  await edit(mainApp, source => {
    let next = source;
    if (!next.includes(`import ${packageName}.calling.CallPackage`)) {
      next = next.replace(/(package\s+[^\n]+)/, `$1\n\nimport ${packageName}.calling.CallPackage`);
    }
    if (!next.includes('add(CallPackage())')) {
      const packageListAnchor = /(PackageList\(this\)\.packages\.apply\s*\{)/;
      if (packageListAnchor.test(next)) {
        next = next.replace(packageListAnchor, `$1\n          add(CallPackage())`);
      }
    }
    return next;
  });

  // 5. Patch android/app/build.gradle with firebase-messaging for native incoming call push service
  const appBuildGradle = path.join(projectDir, 'android', 'app', 'build.gradle');
  await edit(appBuildGradle, source => {
    let next = source;
    if (!next.includes('com.google.firebase:firebase-messaging')) {
      const dependenciesAnchor = /(dependencies\s*\{)/;
      if (dependenciesAnchor.test(next)) {
        next = next.replace(dependenciesAnchor, `$1\n    implementation("com.google.firebase:firebase-messaging:24.1.0")`);
      }
    }
    return next;
  });

  // 6. Patch android/gradle.properties to allow Agora sub-libraries namespace sharing in AGP 8+
  // and set modern 64-bit architectures (arm64-v8a, x86_64) for NDK 27+
  const gradleProperties = path.join(projectDir, 'android', 'gradle.properties');
  await edit(gradleProperties, source => {
    let next = source;
    if (!next.includes('android.uniquePackageNames')) {
      next = `${next.trimEnd()}\n\n# Allow Agora multiple sub-libraries to share the io.agora.rtc namespace\nandroid.uniquePackageNames=false\n`;
    }
    if (next.includes('reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64')) {
      next = next.replace('reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64', 'reactNativeArchitectures=arm64-v8a,x86_64');
    }
    return next;
  });
}
