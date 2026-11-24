package bg.ngerchev.fit.wear;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.WearableListenerService;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/** Пази последното състояние от телефона и отваря FIT на часовника, когато тренировката започне на телефона. */
public class WatchListener extends WearableListenerService {
    static final String CH = "fit_live";
    static final int NID = 4711;

    @Override
    public void onMessageReceived(MessageEvent event) {
        if (!WatchActivity.PATH_STATE.equals(event.getPath())) return;
        String json = new String(event.getData(), StandardCharsets.UTF_8);
        SharedPreferences sp = getSharedPreferences(WatchActivity.PREFS, Context.MODE_PRIVATE);
        boolean was = sp.getBoolean("wasActive", false);
        boolean active = false;
        String title = "Тренировката започна";
        try {
            JSONObject s = new JSONObject(json);
            active = s.optBoolean("active", false);
            org.json.JSONArray ex = s.optJSONArray("ex");
            String cur = s.optString("cur", "");
            if (ex != null) for (int i = 0; i < ex.length(); i++) {
                JSONObject e = ex.getJSONObject(i);
                if (cur.equals(e.optString("id"))) { String m = e.optString("machine", ""); title = m.isEmpty() ? e.optString("name", title) : m; }
            }
        } catch (Exception ignored) { }
        sp.edit().putString("state", json).putBoolean("wasActive", active).apply();
        WatchActivity a = WatchActivity.live;
        if (a != null) a.runOnUiThread(() -> a.onPhoneState(json));
        if (active && !was) openOnWatch(title);
        if (!active && was) clear(this);
    }

    /** Тренировка започна на телефона → FIT излиза на часовника сам (с вибрация); остава като текуща дейност. */
    void openOnWatch(String title) {
        Intent open = new Intent(this, WatchActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 1, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CH) == null) {
                NotificationChannel c = new NotificationChannel(CH, "Тренировка на живо", NotificationManager.IMPORTANCE_HIGH);
                c.setDescription("FIT се отваря на часовника, когато започнеш тренировка на телефона");
                nm.createNotificationChannel(c);
            }
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CH) : new Notification.Builder(this);
            b.setSmallIcon(R.mipmap.ic_launcher).setContentTitle("FIT · тренировка").setContentText(title)
                .setContentIntent(pi).setFullScreenIntent(pi, true).setOngoing(true).setAutoCancel(false)
                .setCategory(Notification.CATEGORY_WORKOUT).setPriority(Notification.PRIORITY_MAX);
            nm.notify(NID, b.build());
        } catch (Exception ignored) { }
        try { startActivity(open); } catch (Exception ignored) { } // при разрешено отваряне от фона — направо на екрана
        try {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) v.vibrate(VibrationEffect.createWaveform(new long[]{0, 180, 120, 180}, -1));
        } catch (Exception ignored) { }
    }

    static void clear(Context c) {
        try { ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(NID); } catch (Exception ignored) { }
    }
}
