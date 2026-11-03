package bg.ngerchev.fit;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import org.json.JSONObject;

/** Краят на почивката: FIT сам вика „Време е за серия N“ с вибрация — на телефона и на часовника. */
public class RestAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        try {
            String raw = WorkoutNotifier.prefs(c).getString("state", null);
            if (raw == null) return;
            JSONObject s = new JSONObject(raw);
            WorkoutNotifier.prefs(c).edit().remove("restAlarm").apply();
            if (!s.optBoolean("active", false) || s.optJSONObject("set") != null || "paused".equals(s.optString("state"))) return;
            s.put("restUntil", JSONObject.NULL);
            WorkoutNotifier.show(c, s.toString(), true);
        } catch (Exception ignored) { }
    }
}
