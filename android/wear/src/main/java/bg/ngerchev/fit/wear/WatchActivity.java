package bg.ngerchev.fit.wear;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import com.google.android.gms.wearable.Node;
import com.google.android.gms.wearable.Wearable;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * FIT за часовника (Wear OS, напр. Galaxy Watch Ultra) — придружител на телефона.
 * Тренировката се води от телефона; часовникът праща действия с уникален opId (идемпотентни),
 * пази ги в опашка без връзка и ги изпраща отново, докато телефонът не потвърди (acks).
 */
public class WatchActivity extends Activity implements SensorEventListener {
    static final String PATH_ACTION = "/fit/action";
    static final String PATH_STATE = "/fit/state";
    static final String PREFS = "fit_watch";
    static volatile WatchActivity live;

    static final int BG = Color.parseColor("#0C0F14");
    static final int SURFACE = Color.parseColor("#1B212B");
    static final int INK = Color.parseColor("#ECEEF2");
    static final int MUTED = Color.parseColor("#98A1AE");
    static final int GO = Color.parseColor("#12A150");
    static final int HOT = Color.parseColor("#FF7756");
    static final int ACCENT = Color.parseColor("#7088FF");

    private final Handler ui = new Handler(Looper.getMainLooper());
    private SharedPreferences prefs;
    private JSONObject state = new JSONObject();
    private JSONArray pending = new JSONArray();
    private LinearLayout box;
    private boolean confirming = false;
    private boolean phoneOk = false;
    private double kg = 0;
    private int reps = 10;
    private String stepFor = "";
    private SensorManager sensors;
    private Sensor hrSensor;
    private int hrNow = 0;
    private long hrSum = 0;
    private int hrCount = 0;
    private boolean restBuzzed = false;
    private final Runnable tick = new Runnable() {
        @Override public void run() { updateTimers(); ui.postDelayed(this, 1000); }
    };
    private final Runnable resend = new Runnable() {
        @Override public void run() { flush(); ui.postDelayed(this, 5000); }
    };

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try { state = new JSONObject(prefs.getString("state", "{}")); } catch (Exception e) { state = new JSONObject(); }
        try { pending = new JSONArray(prefs.getString("pending", "[]")); } catch (Exception e) { pending = new JSONArray(); }
        sensors = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        if (sensors != null) hrSensor = sensors.getDefaultSensor(Sensor.TYPE_HEART_RATE);

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(BG);
        scroll.setFillViewport(true);
        box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER_HORIZONTAL);
        int pad = (int) (getResources().getDisplayMetrics().widthPixels * 0.12f);
        box.setPadding(pad, pad / 2 + dp(6), pad, pad);
        scroll.addView(box, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT));
        setContentView(scroll);
        if (!getPackageManager().hasSystemFeature(PackageManager.FEATURE_WATCH)) { phoneWarning(); return; }
        render();
    }

    /** Версията за часовник е инсталирана на телефон — тя замества FIT за телефона. Обясняваме как да се върне. */
    boolean onPhone() { return !getPackageManager().hasSystemFeature(PackageManager.FEATURE_WATCH); }

    void phoneWarning() {
        box.removeAllViews();
        TextView logo = text("FIT", 22, GO, true);
        logo.setLetterSpacing(0.15f);
        text("Това е версията за ЧАСОВНИК", 18, HOT, true);
        text("Инсталирана е на телефона и замени FIT за телефона. Данните ти са запазени.", 14, INK, false);
        text("Свали FIT.apk и го инсталирай отново — всичко се връща. FIT-watch.apk се слага само на часовника.", 13, MUTED, false);
        button(box, "Свали FIT за телефона", GO, Color.WHITE, 56, v -> {
            try { startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("https://github.com/ngerchev-code/FIT/releases/latest/download/FIT.apk"))); } catch (Exception ignored) { }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (onPhone()) return;
        live = this;
        try { onPhoneState(prefs.getString("state", "{}")); } catch (Exception ignored) { }
        send(op("REQUEST_STATE"), false);
        ui.post(tick);
        ui.postDelayed(resend, 1500);
        startHr();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (onPhone()) return;
        if (live == this) live = null;
        ui.removeCallbacks(tick);
        ui.removeCallbacks(resend);
        stopHr();
    }

    /* ---------- състояние от телефона ---------- */
    void onPhoneState(String json) {
        try {
            JSONObject s = new JSONObject(json);
            phoneOk = true;
            JSONArray acks = s.optJSONArray("acks");
            if (acks != null && pending.length() > 0) {
                JSONArray left = new JSONArray();
                for (int i = 0; i < pending.length(); i++) {
                    JSONObject p = pending.getJSONObject(i);
                    boolean acked = false;
                    for (int j = 0; j < acks.length(); j++) if (p.optString("opId").equals(acks.optString(j))) { acked = true; break; }
                    if (!acked) left.put(p);
                }
                pending = left;
                savePending();
            }
            if (pending.length() == 0) { state = s; confirming = false; }
            render();
        } catch (Exception ignored) { }
    }

    /* ---------- действия към телефона ---------- */
    JSONObject op(String type) {
        JSONObject o = new JSONObject();
        try {
            o.put("opId", "w-" + UUID.randomUUID());
            o.put("type", type);
            o.put("at", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US) {{ setTimeZone(java.util.TimeZone.getTimeZone("UTC")); }}.format(new java.util.Date()));
        } catch (Exception ignored) { }
        return o;
    }

    void send(JSONObject o, boolean queue) {
        if (queue) { pending.put(o); savePending(); }
        final byte[] data = o.toString().getBytes(StandardCharsets.UTF_8);
        Wearable.getNodeClient(this).getConnectedNodes()
            .addOnSuccessListener((List<Node> nodes) -> {
                phoneOk = !nodes.isEmpty();
                for (Node n : nodes) Wearable.getMessageClient(this).sendMessage(n.getId(), PATH_ACTION, data);
                renderStatus();
            })
            .addOnFailureListener(e -> { phoneOk = false; renderStatus(); });
    }

    void flush() {
        if (pending.length() == 0) return;
        for (int i = 0; i < pending.length(); i++) {
            JSONObject o = pending.optJSONObject(i);
            if (o != null) send(o, false);
        }
    }

    void savePending() { prefs.edit().putString("pending", pending.toString()).apply(); }

    /** Действие с локално (оптимистично) обновяване, за да реагира веднага и без връзка. */
    void act(JSONObject o) {
        try {
            String t = o.getString("type");
            long now = System.currentTimeMillis();
            if (t.equals("START_SET")) {
                JSONObject set = new JSONObject();
                set.put("id", o.getString("setId"));
                set.put("startedAt", now);
                state.put("set", set);
                state.put("restUntil", JSONObject.NULL);
                hrSum = 0; hrCount = 0;
            } else if (t.equals("COMPLETE_SET")) {
                state.put("set", JSONObject.NULL);
                state.put("setNo", state.optInt("setNo", 1) + 1);
                int rest = state.optInt("restSec", 90);
                if (rest > 0) state.put("restUntil", now + rest * 1000L);
                restBuzzed = false;
                confirming = false;
                bumpDone();
            } else if (t.equals("CANCEL_SET")) {
                state.put("set", JSONObject.NULL);
                confirming = false;
            } else if (t.equals("SKIP_REST")) {
                state.put("restUntil", JSONObject.NULL);
            } else if (t.equals("PAUSE_WORKOUT")) {
                state.put("state", "paused");
            } else if (t.equals("RESUME_WORKOUT")) {
                state.put("state", "active");
            } else if (t.equals("END_WORKOUT")) {
                state.put("active", false);
                state.put("state", "completed");
            } else if (t.equals("SWITCH_EXERCISE")) {
                state.put("cur", o.getString("exerciseId"));
                JSONObject e = curEx();
                if (e != null) { state.put("setNo", e.optInt("done", 0) + 1); state.put("restSec", e.optInt("rest", 90)); }
            }
        } catch (Exception ignored) { }
        send(o, true);
        render();
    }

    void bumpDone() {
        JSONObject e = curEx();
        if (e != null) try { e.put("done", e.optInt("done", 0) + 1); } catch (Exception ignored) { }
    }

    JSONObject curEx() {
        JSONArray ex = state.optJSONArray("ex");
        if (ex == null) return null;
        String cur = state.optString("cur", "");
        for (int i = 0; i < ex.length(); i++) { JSONObject e = ex.optJSONObject(i); if (e != null && cur.equals(e.optString("id"))) return e; }
        return ex.length() > 0 ? ex.optJSONObject(0) : null;
    }

    /* ---------- пулс (само с разрешение) ---------- */
    void startHr() {
        if (hrSensor == null || !state.optBoolean("active", false)) return;
        if (checkSelfPermission(Manifest.permission.BODY_SENSORS) != PackageManager.PERMISSION_GRANTED) return;
        sensors.registerListener(this, hrSensor, SensorManager.SENSOR_DELAY_NORMAL);
    }
    void stopHr() { if (sensors != null) sensors.unregisterListener(this); }
    @Override public void onSensorChanged(SensorEvent ev) {
        if (ev.values.length == 0 || ev.accuracy < SensorManager.SENSOR_STATUS_ACCURACY_LOW) return;
        int v = Math.round(ev.values[0]);
        if (v < 30 || v > 240) return;
        hrNow = v;
        if (!state.isNull("set") && state.optJSONObject("set") != null) { hrSum += v; hrCount++; }
    }
    @Override public void onAccuracyChanged(Sensor s, int a) { }
    @Override public void onRequestPermissionsResult(int rc, String[] p, int[] r) { super.onRequestPermissionsResult(rc, p, r); startHr(); render(); }

    void askHrOnce() {
        if (hrSensor == null || prefs.getBoolean("askedHr", false)) return;
        prefs.edit().putBoolean("askedHr", true).apply();
        if (checkSelfPermission(Manifest.permission.BODY_SENSORS) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{Manifest.permission.BODY_SENSORS}, 7);
    }

    void buzz(long[] pattern) {
        try {
            Vibrator v;
            if (Build.VERSION.SDK_INT >= 31) v = ((VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE)).getDefaultVibrator();
            else v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) v.vibrate(VibrationEffect.createWaveform(pattern, -1));
        } catch (Exception ignored) { }
    }

    /* ---------- изглед ---------- */
    int dp(float v) { return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()); }

    TextView text(String s, float sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setTextColor(color);
        t.setGravity(Gravity.CENTER);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        box.addView(t, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        return t;
    }

    Button button(LinearLayout parent, String label, int bg, int fg, float heightDp, View.OnClickListener l) {
        Button b = new Button(this);
        b.setText(label);
        b.setAllCaps(false);
        b.setTextColor(fg);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        b.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable g = new GradientDrawable();
        g.setColor(bg);
        g.setCornerRadius(dp(22));
        b.setBackground(g);
        b.setOnClickListener(v -> { buzz(new long[]{0, 25}); l.onClick(v); });
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(parent == box ? LinearLayout.LayoutParams.MATCH_PARENT : 0, dp(heightDp), parent == box ? 0f : 1f);
        lp.setMargins(dp(3), dp(4), dp(3), dp(4));
        parent.addView(b, lp);
        return b;
    }

    LinearLayout row() {
        LinearLayout r = new LinearLayout(this);
        r.setOrientation(LinearLayout.HORIZONTAL);
        r.setGravity(Gravity.CENTER);
        box.addView(r, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        return r;
    }

    TextView statusView;
    TextView clockView;
    TextView restView;
    TextView hrView;

    void renderStatus() {
        if (statusView == null) return;
        int n = pending.length();
        statusView.setText((phoneOk ? "● телефон" : "○ без връзка") + (n > 0 ? " · чакат " + n : ""));
        statusView.setTextColor(phoneOk ? GO : MUTED);
    }

    void stepper(String label, String value, View.OnClickListener minus, View.OnClickListener plus) {
        text(label, 11, MUTED, true);
        LinearLayout r = row();
        button(r, "−", SURFACE, INK, 46, minus);
        TextView v = new TextView(this);
        v.setText(value);
        v.setTextColor(INK);
        v.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22);
        v.setTypeface(Typeface.DEFAULT_BOLD);
        v.setGravity(Gravity.CENTER);
        r.addView(v, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.3f));
        button(r, "+", SURFACE, INK, 46, plus);
    }

    void render() {
        box.removeAllViews();
        statusView = null; clockView = null; restView = null; hrView = null;
        boolean active = state.optBoolean("active", false);
        if (active) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        TextView logo = text("FIT", 18, GO, true);
        logo.setLetterSpacing(0.15f);
        statusView = text("", 11, MUTED, false);
        renderStatus();

        if (!active) {
            text(state.optString("summary", "").isEmpty() ? "Няма активна тренировка" : state.optString("summary"), 15, INK, true);
            text("Започни от тук или от телефона.", 12, MUTED, false);
            button(box, "▶  Днешна тренировка", GO, Color.WHITE, 54, v -> { askHrOnce(); act(op("START_PLAN")); });
            text("FIT на часовника работи заедно с FIT на телефона.", 10, MUTED, false);
            return;
        }
        JSONObject e = curEx();
        String exName = e != null ? e.optString("name", "Упражнение") : "Упражнение";
        boolean cardio = e != null && e.optBoolean("cardio", false);
        int target = e != null ? e.optInt("target", 3) : 3;
        int setNo = state.optInt("setNo", 1);
        String key = (e != null ? e.optString("id") : "") + ":" + setNo;
        if (!key.equals(stepFor)) {
            stepFor = key;
            kg = state.optDouble("kg", e != null ? e.optDouble("kg", 0) : 0);
            reps = state.optInt("reps", e != null ? e.optInt("reps", 10) : 10);
        }

        if ("paused".equals(state.optString("state"))) {
            text("ПАУЗА", 20, MUTED, true);
            text(exName, 13, INK, false);
            button(box, "▶  Продължи", GO, Color.WHITE, 54, v -> act(op("RESUME_WORKOUT")));
            button(box, "■  Край на тренировката", SURFACE, HOT, 46, v -> act(op("END_WORKOUT")));
            return;
        }

        JSONObject set = state.optJSONObject("set");
        if (set != null && !confirming) {
            text("СЕРИЯ " + setNo + (target > 0 ? " / " + target : ""), 12, HOT, true);
            text(exName, 14, INK, true);
            clockView = text("", 34, INK, true);
            hrView = text("", 14, HOT, true);
            button(box, "■  КРАЙ НА СЕРИЯТА", HOT, Color.WHITE, 58, v -> { confirming = true; buzz(new long[]{0, 40}); render(); });
            updateTimers();
            return;
        }
        if (set != null) {
            text("Потвърди серия " + setNo, 13, INK, true);
            if (!cardio) stepper("ТЕЖЕСТ", fmtKg(kg) + " kg", v -> { kg = Math.max(0, kg - 2.5); render(); }, v -> { kg += 2.5; render(); });
            stepper(cardio ? "МИНУТИ" : "ПОВТОРЕНИЯ", String.valueOf(reps), v -> { reps = Math.max(0, reps - 1); render(); }, v -> { reps++; render(); });
            final String setId = set.optString("id");
            button(box, "✓  Запиши", GO, Color.WHITE, 56, v -> {
                JSONObject o = op("COMPLETE_SET");
                try {
                    o.put("setId", setId);
                    o.put("reps", reps);
                    o.put("weightKg", cardio ? 0 : kg);
                    o.put("source", "wearable");
                    if (hrCount > 0) o.put("hrAvg", (double) hrSum / hrCount);
                } catch (Exception ignored) { }
                act(o);
            });
            button(box, "Отмени серията", SURFACE, MUTED, 42, v -> { JSONObject o = op("CANCEL_SET"); try { o.put("setId", setId); } catch (Exception ignored) { } act(o); });
            return;
        }

        long restUntil = state.optLong("restUntil", 0);
        if (restUntil > System.currentTimeMillis()) {
            text("ПОЧИВКА", 12, GO, true);
            restView = text("", 40, GO, true);
            text("Следва: " + exName + " · серия " + setNo, 12, MUTED, false);
            hrView = text("", 13, HOT, true);
            button(box, "Пропусни почивката", SURFACE, INK, 48, v -> act(op("SKIP_REST")));
            updateTimers();
            return;
        }

        text(exName, 15, INK, true);
        text("Серия " + setNo + (target > 0 ? " от " + target : "") + (setNo > target ? " · по желание" : ""), 12, MUTED, false);
        if (!cardio) stepper("ТЕЖЕСТ", fmtKg(kg) + " kg", v -> { kg = Math.max(0, kg - 2.5); render(); }, v -> { kg += 2.5; render(); });
        stepper(cardio ? "МИНУТИ" : "ПОВТОРЕНИЯ", String.valueOf(reps), v -> { reps = Math.max(0, reps - 1); render(); }, v -> { reps++; render(); });
        button(box, "▶  СЕРИЯ " + setNo, GO, Color.WHITE, 58, v -> {
            JSONObject o = op("START_SET");
            try { o.put("setId", "ws-" + UUID.randomUUID()); o.put("weightKg", cardio ? 0 : kg); o.put("reps", reps); } catch (Exception ignored) { }
            act(o);
        });
        LinearLayout r = row();
        button(r, "⏸", SURFACE, INK, 44, v -> act(op("PAUSE_WORKOUT")));
        button(r, "→ уред", SURFACE, ACCENT, 44, v -> nextExercise());
        button(r, "■", SURFACE, HOT, 44, v -> act(op("END_WORKOUT")));
        hrView = text("", 12, HOT, true);
        updateTimers();
    }

    void nextExercise() {
        JSONArray ex = state.optJSONArray("ex");
        if (ex == null || ex.length() < 2) return;
        String cur = state.optString("cur", "");
        int i = 0;
        for (int k = 0; k < ex.length(); k++) if (cur.equals(ex.optJSONObject(k).optString("id"))) i = k;
        JSONObject next = ex.optJSONObject((i + 1) % ex.length());
        JSONObject o = op("SWITCH_EXERCISE");
        try { o.put("exerciseId", next.optString("id")); } catch (Exception ignored) { }
        stepFor = "";
        act(o);
    }

    void updateTimers() {
        long now = System.currentTimeMillis();
        JSONObject set = state.optJSONObject("set");
        if (clockView != null && set != null) {
            long sec = Math.max(0, (now - set.optLong("startedAt", now)) / 1000);
            clockView.setText(String.format(Locale.US, "%d:%02d", sec / 60, sec % 60));
        }
        long restUntil = state.optLong("restUntil", 0);
        if (restView != null) {
            long left = (restUntil - now) / 1000;
            if (left <= 0) {
                if (!restBuzzed) { restBuzzed = true; buzz(new long[]{0, 350, 150, 350, 150, 350}); }
                try { state.put("restUntil", JSONObject.NULL); } catch (Exception ignored) { }
                render();
                return;
            }
            restView.setText(String.format(Locale.US, "%d:%02d", left / 60, left % 60));
        }
        if (hrView != null) hrView.setText(hrNow > 0 ? "♥ " + hrNow + " · от часовника" : "");
    }

    static String fmtKg(double v) { return v == Math.floor(v) ? String.valueOf((long) v) : String.valueOf(v); }
}
