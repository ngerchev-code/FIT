package bg.ngerchev.fit;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Известие „Тренировка на живо“ с бутони. Galaxy Watch и другите часовници го показват автоматично
 * (както обаждане или Viber), така че тренировката се управлява и от китката, без отделно приложение.
 */
public class WorkoutNotifier {
    static final String CHANNEL = "fit_live";
    static final int ID = 7800;
    static final String ACTION = "bg.ngerchev.fit.WORKOUT_ACTION";

    static void ensureChannel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Тренировка на живо", NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription("Серии, почивка и смяна на уред — от телефона и часовника");
        ch.setSound(null, null);
        ch.enableVibration(false);
        nm.createNotificationChannel(ch);
    }

    static void clear(Context c) {
        try { NotificationManagerCompat.from(c).cancel(ID); } catch (Exception ignored) { }
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

    static void show(Context c, String json) {
        try {
            JSONObject s = new JSONObject(json);
            if (!s.optBoolean("active", false)) { clear(c); return; }
            ensureChannel(c);
            JSONArray ex = s.optJSONArray("ex");
            String curId = s.optString("cur", "");
            JSONObject cur = null, next = null;
            if (ex != null) {
                for (int i = 0; i < ex.length(); i++) {
                    JSONObject e = ex.optJSONObject(i);
                    if (e != null && curId.equals(e.optString("id"))) { cur = e; if (ex.length() > 1) next = ex.optJSONObject((i + 1) % ex.length()); }
                }
            }
            String name = cur != null ? cur.optString("name", "Тренировка") : "Тренировка";
            boolean cardio = cur != null && cur.optBoolean("cardio", false);
            int setNo = s.optInt("setNo", 1), target = cur != null ? cur.optInt("target", 3) : 3;
            double kg = s.optDouble("kg", 0);
            int reps = s.optInt("reps", 10);
            String what = cardio ? reps + " мин" : fmtKg(kg) + " kg × " + reps;
            JSONObject set = s.optJSONObject("set");
            long restUntil = s.optLong("restUntil", 0), now = System.currentTimeMillis();
            boolean paused = "paused".equals(s.optString("state"));

            Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
            PendingIntent openPi = open == null ? null : PendingIntent.getActivity(c, 7899, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            NotificationCompat.Builder b = new NotificationCompat.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_fit)
                .setColor(0xFF12A150)
                .setCategory(NotificationCompat.CATEGORY_WORKOUT)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setOnlyAlertOnce(true)
                .setAutoCancel(false)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
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
            } else if (restUntil > now) {
                b.setContentTitle("Почивка · следва " + name).setContentText("Серия " + setNo + ": " + what)
                    .setUsesChronometer(true).setChronometerCountDown(true).setShowWhen(true).setWhen(restUntil);
                b.addAction(0, "▶ Серия " + setNo + " сега", act(c, 5, startSet(kg, reps, cardio)));
                b.addAction(0, "Пропусни почивката", act(c, 6, op("SKIP_REST")));
            } else {
                b.setContentTitle(name + " · серия " + setNo + " от " + target).setContentText(what);
                b.addAction(0, "▶ Серия " + setNo, act(c, 7, startSet(kg, reps, cardio)));
                if (next != null) {
                    JSONObject sw = op("SWITCH_EXERCISE");
                    sw.put("exerciseId", next.optString("id"));
                    b.addAction(0, "→ " + shorten(next.optString("name", "Следващ уред")), act(c, 8, sw));
                }
                b.addAction(0, "■ Край", act(c, 9, op("END_WORKOUT")));
            }
            NotificationManagerCompat.from(c).notify(ID, b.build());
        } catch (SecurityException ignored) {
            // няма разрешение за известия — тренировката продължава в приложението
        } catch (Exception ignored) { }
    }

    static JSONObject startSet(double kg, int reps, boolean cardio) throws Exception {
        JSONObject o = op("START_SET");
        o.put("weightKg", cardio ? 0 : kg);
        o.put("reps", reps);
        return o;
    }

    static String shorten(String s) { return s.length() > 18 ? s.substring(0, 17) + "…" : s; }
}
