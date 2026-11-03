package bg.ngerchev.fit;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.UUID;
import org.json.JSONObject;

/** Бутон от известието (на телефона или на часовника) → действие в тренировката, с уникален opId. */
public class WorkoutActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        try {
            JSONObject o = new JSONObject(i.getStringExtra("payload"));
            o.put("opId", "n-" + UUID.randomUUID());
            if ("START_SET".equals(o.optString("type"))) o.put("setId", "ns-" + UUID.randomUUID());
            SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            f.setTimeZone(TimeZone.getTimeZone("UTC"));
            o.put("at", f.format(new Date()));
            String json = o.toString();
            WorkoutNotifier.applyLocal(c, o); // известието и часовникът реагират веднага, дори FIT да е затворен
            WearBridgePlugin p = WearBridgePlugin.instance;
            if (p != null) p.deliver(json);
            else WearBridgePlugin.enqueue(c, json);
        } catch (Exception ignored) { }
    }
}
