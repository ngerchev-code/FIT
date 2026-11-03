package bg.ngerchev.fit;

import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.WearableListenerService;
import java.nio.charset.StandardCharsets;

/** Получава действия от часовника, докато FIT на телефона е затворен; пази ги до отваряне. */
public class WearListenerService extends WearableListenerService {
    @Override
    public void onMessageReceived(MessageEvent event) {
        if (!WearBridgePlugin.PATH_ACTION.equals(event.getPath())) return;
        if (WearBridgePlugin.instance != null) return; // приложението е отворено — плъгинът ги получава директно
        WearBridgePlugin.enqueue(this, new String(event.getData(), StandardCharsets.UTF_8));
    }
}
