package bg.ngerchev.fit.wear;

import android.content.Context;
import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.WearableListenerService;
import java.nio.charset.StandardCharsets;

/** Пази последното състояние от телефона, дори когато FIT на часовника е затворен. */
public class WatchListener extends WearableListenerService {
    @Override
    public void onMessageReceived(MessageEvent event) {
        if (!WatchActivity.PATH_STATE.equals(event.getPath())) return;
        String json = new String(event.getData(), StandardCharsets.UTF_8);
        getSharedPreferences(WatchActivity.PREFS, Context.MODE_PRIVATE).edit().putString("state", json).apply();
        WatchActivity a = WatchActivity.live;
        if (a != null) a.runOnUiThread(() -> a.onPhoneState(json));
    }
}
