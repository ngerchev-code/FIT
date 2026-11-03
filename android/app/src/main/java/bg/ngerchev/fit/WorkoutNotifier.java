package bg.ngerchev.fit;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Известие „Тренировка на живо“ с бутони. Galaxy Watch и другите часовници го показват автоматично
 * (както обаждане или Viber). Работи и при затворено приложение: бутоните обновяват известието веднага
 * (локално), действията се пазят с opId и се записват в тренировката при следващото отваряне на FIT.
 * FIT води: след почивката сам казва „Време е за серия N“, след последната серия минава на следващия уред.
 */
public class WorkoutNotifier {
    static final String CHANNEL = "fit_live2";
    static final int ID = 7800;
    static final String ACTION = "bg.ngerchev.fit.WORKOUT_ACTION";
    static final String PREFS = "fit_live";

    static void ensureChannel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Тренировка на живо", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Серии, почивка и смяна на уред — от телефона и часовника");
        ch.setSound(null, null);
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 180});
        nm.createNotificationChannel(ch);
    }

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    static void clear(Context c) {
        try { NotificationManagerCompat.from(c).cancel(ID); } catch (Exception ignored) { }
        cancelRestAlarm(c);
        prefs(c).edit().remove("state").apply();
    }

    static String fmtKg(double v) { return v == Math.floor(v) ? String.valueOf((long) v) : String.valueOf(v).replace('.', ','); }

    static PendingIntent act(Context c, int code, JSONObject payload) {
        Intent i = new Intent(c, WorkoutActionReceiver.class).setAction(ACTION + "." + code).putExtra("payload", payload.toString());
        return PendingIntent.getBroadcast(c, 7800 + code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static JSONObject op(String type) {
        JSONObject o = new JSONObject();
        try { o.put("type", type); } catch (Exception ignored) { }
        return o;
    }

    /* ---------- аларма за края на почивката (работи и при затворено приложение) ---------- */
    static PendingIntent restPi(Context c) {
        Intent i = new Intent(c, RestAlarmReceiver.class).setAction(ACTION + ".REST_END");
        return PendingIntent.getBroadcast(c, 7790, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    static void scheduleRestAlarm(Context c, long at) {
        try {
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            long scheduled = prefs(c).getLong("restAlarm", 0);
            if (scheduled == at) return;
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, restPi(c));
            prefs(c).edit().putLong("restAlarm", at).apply();
        } catch (Exception ignored) { }
    }
    static void cancelRestAlarm(Context c) {
        try {
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            if (am != null) am.cancel(restPi(c));
            prefs(c).edit().remove("restAlarm").apply();
        } catch (Exception ignored) { }
    }

    /* ---------- локално обновяване при затворено приложение ---------- */
    static JSONObject find(JSONArray ex, String id) {
        if (ex == null) return null;
        for (int i = 0; i < ex.length(); i++) { JSONObject e = ex.optJSONObject(i); if (e != null && id.equals(e.optString("id"))) return e; }
        return null;
    }
    /** Следващ уред с незавършени серии (по реда на тренировката), или null. */
    static JSONObject nextOpen(JSONArray ex, String curId) {
        if (ex == null || ex.length() == 0) return null;
        int start = 0;
        for (int i = 0; i < ex.length(); i++) if (curId.equals(ex.optJSONObject(i).optString("id"))) start = i;
        for (int k = 1; k <= ex.length(); k++) {
            JSONObject e = ex.optJSONObject((start + k) % ex.length());
            if (e != null && !curId.equals(e.optString("id")) && e.optInt("done", 0) < e.optInt("target", 3)) return e;
        }
        return null;
    }
    static void focus(JSONObject s, JSONObject e) throws Exception {
        s.put("cur", e.optString("id"));
        s.put("setNo", e.optInt("done", 0) + 1);
        s.put("kg", e.optDouble("kg", 0));
        s.put("reps", e.optInt("reps", 10));
        s.put("restSec", e.optInt("rest", 90));
    }
    /** Същите преходи като fit-core.js, за да реагира известието веднага, без JavaScript. */
    static void applyLocal(Context c, JSONObject a) {
        try {
            String raw = prefs(c).getString("state", null);
            if (raw == null) return;
            JSONObject s = new JSONObject(raw);
            String t = a.optString("type");
            long now = System.currentTimeMillis();
            JSONArray ex = s.optJSONArray("ex");
            JSONObject cur = find(ex, s.optString("cur", ""));
            switch (t) {
                case "START_SET": {
                    JSONObject set = new JSONObject();
                    set.put("id", a.optString("setId"));
                    set.put("startedAt", now);
                    s.put("set", set);
                    s.put("restUntil", JSONObject.NULL);
                    break;
                }
                case "COMPLETE_SET": {
                    s.put("set", JSONObject.NULL);
                    s.put("kg", a.optDouble("weightKg", s.optDouble("kg", 0)));
                    s.put("reps", a.optInt("reps", s.optInt("reps", 10)));
                    if (cur != null) cur.put("done", cur.optInt("done", 0) + 1);
                    s.put("setNo", s.optInt("setNo", 1) + 1);
                    int rest = cur != null ? cur.optInt("rest", 90) : 90;
                    if (rest > 0) s.put("restUntil", now + rest * 1000L);
                    if (cur != null && cur.optInt("done", 0) >= cur.optInt("target", 3)) {
                        JSONObject n = nextOpen(ex, cur.optString("id"));
                        if (n != null) focus(s, n);
                    }
                    break;
                }
                case "CANCEL_SET": s.put("set", JSONObject.NULL); break;
                case "SKIP_REST": s.put("restUntil", JSONObject.NULL); break;
                case "PAUSE_WORKOUT": s.put("state", "paused"); break;
                case "RESUME_WORKOUT": s.put("state", "active"); break;
                case "END_WORKOUT": clear(c); return;
                case "SWITCH_EXERCISE": { JSONObject e = find(ex, a.optString("exerciseId")); if (e != null) focus(s, e); break; }
                default: break;
            }
            show(c, s.toString(), false);
        } catch (Exception ignored) { }
    }

    static void show(Context c, String json) { show(c, json, false); }

    static void show(Context c, String json, boolean alert) {
        try {
            JSONObject s = new JSONObject(json);
            if (!s.optBoolean("active", false)) { clear(c); return; }
            prefs(c).edit().putString("state", json).apply();
            ensureChannel(c);
            JSONArray ex = s.optJSONArray("ex");
            String curId = s.optString("cur", "");
            JSONObject cur = find(ex, curId);
            String name = cur != null ? cur.optString("name", "Тренировка") : "Тренировка";
            boolean cardio = cur != null && cur.optBoolean("cardio", false);
            int setNo = s.optInt("setNo", 1), target = cur != null ? cur.optInt("target", 3) : 3;
            double kg = s.optDouble("kg", 0);
            int reps = s.optInt("reps", 10);
            String what = cardio ? reps + " мин" : fmtKg(kg) + " kg × " + reps;
            JSONObject set = s.optJSONObject("set");
            long restUntil = s.optLong("restUntil", 0), now = System.currentTimeMillis();
            boolean paused = "paused".equals(s.optString("state"));
            boolean curDone = cur != null && cur.optInt("done", 0) >= target;
            JSONObject next = nextOpen(ex, curId);
            boolean allDone = curDone && next == null;

            if (restUntil > now && set == null && !paused) scheduleRestAlarm(c, restUntil); else cancelRestAlarm(c);

            Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
            PendingIntent openPi = open == null ? null : PendingIntent.getActivity(c, 7899, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            NotificationCompat.Builder b = new NotificationCompat.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_fit)
                .setColor(0xFF12A150)
                .setCategory(NotificationCompat.CATEGORY_WORKOUT)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setVibrate(new long[]{0, 180})
                .setOnlyAlertOnce(!alert)
                .setAutoCancel(false)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            if (alert) b.setVibrate(new long[]{0, 350, 150, 350});
            if (openPi != null) b.setContentIntent(openPi);

            if (paused) {
                b.setContentTitle("Пауза · " + name).setContentText("Продължи, когато си готов");
                b.addAction(0, "▶ Продължи", act(c, 1, op("RESUME_WORKOUT")));
                b.addAction(0, "■ Край", act(c, 2, op("END_WORKOUT")));
            } else if (set != null) {
                JSONObject done = op("COMPLETE_SET");
                done.put("setId", set.optString("id"));
                done.put("reps", reps);
                done.put("weightKg", cardio ? 0 : kg);
                done.put("source", "notification");
                JSONObject cancel = op("CANCEL_SET");
                cancel.put("setId", set.optString("id"));
                b.setContentTitle("Серия " + setNo + " · " + name).setContentText(what + " · натисни, когато свършиш")
                    .setUsesChronometer(true).setShowWhen(true).setWhen(set.optLong("startedAt", now));
                b.addAction(0, "✓ Край на серията", act(c, 3, done));
                b.addAction(0, "✕ Отмени", act(c, 4, cancel));
            } else if (allDone) {
                b.setContentTitle("Всички уреди са готови ✓").setContentText("Браво! Завърши тренировката или направи още една серия.");
                b.addAction(0, "■ Завърши", act(c, 9, op("END_WORKOUT")));
                b.addAction(0, "+ Още серия", act(c, 7, startSet(kg, reps, cardio)));
            } else if (restUntil > now) {
                b.setContentTitle("Почивка · после " + name).setContentText("Серия " + setNo + ": " + what + " — ще те повикам")
                    .setUsesChronometer(true).setChronometerCountDown(true).setShowWhen(true).setWhen(restUntil);
                b.addAction(0, "▶ Серия " + setNo + " сега", act(c, 5, startSet(kg, reps, cardio)));
                b.addAction(0, "Пропусни почивката", act(c, 6, op("SKIP_REST")));
            } else {
                boolean resumed = cur != null && cur.optInt("done", 0) > 0;
                b.setContentTitle((resumed || alert ? "Време е за серия " + setNo : "Започни: серия " + setNo + " от " + target) + " · " + name).setContentText(what);
                b.addAction(0, "▶ Серия " + setNo, act(c, 7, startSet(kg, reps, cardio)));
                JSONObject other = next != null ? next : (ex != null && ex.length() > 1 ? ex.optJSONObject((indexOf(ex, curId) + 1) % ex.length()) : null);
                if (other != null) {
                    JSONObject sw = op("SWITCH_EXERCISE");
                    sw.put("exerciseId", other.optString("id"));
                    b.addAction(0, "→ " + shorten(other.optString("name", "Следващ уред")), act(c, 8, sw));
                }
                b.addAction(0, "■ Край", act(c, 9, op("END_WORKOUT")));
            }
            NotificationManagerCompat.from(c).notify(ID, b.build());
        } catch (SecurityException ignored) {
            // няма разрешение за известия — тренировката продължава в приложението
        } catch (Exception ignored) { }
    }

    static int indexOf(JSONArray ex, String id) {
        for (int i = 0; i < ex.length(); i++) if (id.equals(ex.optJSONObject(i).optString("id"))) return i;
        return 0;
    }

    static JSONObject startSet(double kg, int reps, boolean cardio) throws Exception {
        JSONObject o = op("START_SET");
        o.put("weightKg", cardio ? 0 : kg);
        o.put("reps", reps);
        return o;
    }

    static String shorten(String s) { return s.length() > 18 ? s.substring(0, 17) + "…" : s; }
}
