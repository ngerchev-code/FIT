package bg.ngerchev.fit;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.wearable.MessageClient;
import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.Node;
import com.google.android.gms.wearable.Wearable;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.json.JSONArray;

/** Мост телефон ↔ часовник (Wear OS Data Layer). Действията от часовника стигат до JS като събитие "watchAction". */
@CapacitorPlugin(name = "WearBridge")
public class WearBridgePlugin extends Plugin implements MessageClient.OnMessageReceivedListener {
    static final String PATH_ACTION = "/fit/action";
    static final String PATH_STATE = "/fit/state";
    static final String PREFS = "fit_wear";
    static volatile WearBridgePlugin instance;

    @Override
    public void load() {
        instance = this;
        Wearable.getMessageClient(getContext()).addListener(this);
    }

    @Override
    protected void handleOnDestroy() {
        Wearable.getMessageClient(getContext()).removeListener(this);
        if (instance == this) instance = null;
    }

    @Override
    public void onMessageReceived(MessageEvent event) {
        if (!PATH_ACTION.equals(event.getPath())) return;
        deliver(new String(event.getData(), StandardCharsets.UTF_8));
    }

    void deliver(String json) {
        JSObject o = new JSObject();
        o.put("json", json);
        notifyListeners("watchAction", o, true);
    }

    /** Опашка, събрана от WearListenerService, докато FIT е бил затворен. */
    static synchronized void enqueue(Context ctx, String json) {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try {
            JSONArray q = new JSONArray(sp.getString("queue", "[]"));
            q.put(json);
            while (q.length() > 500) q.remove(0);
            sp.edit().putString("queue", q.toString()).apply();
        } catch (Exception ignored) { }
    }

    @PluginMethod
    public void drainQueue(PluginCall call) {
        String q;
        synchronized (WearBridgePlugin.class) {
            SharedPreferences sp = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            q = sp.getString("queue", "[]");
            sp.edit().putString("queue", "[]").apply();
        }
        JSObject r = new JSObject();
        r.put("items", q);
        call.resolve(r);
    }

    @PluginMethod
    public void sendState(PluginCall call) {
        final byte[] data = call.getString("json", "{}").getBytes(StandardCharsets.UTF_8);
        Wearable.getNodeClient(getContext()).getConnectedNodes()
            .addOnSuccessListener((List<Node> nodes) -> {
                for (Node n : nodes) Wearable.getMessageClient(getContext()).sendMessage(n.getId(), PATH_STATE, data);
                JSObject r = new JSObject();
                r.put("nodes", nodes.size());
                call.resolve(r);
            })
            .addOnFailureListener(e -> {
                JSObject r = new JSObject();
                r.put("nodes", 0);
                call.resolve(r);
            });
    }

    @PluginMethod
    public void status(PluginCall call) {
        Wearable.getNodeClient(getContext()).getConnectedNodes()
            .addOnSuccessListener((List<Node> nodes) -> {
                StringBuilder names = new StringBuilder();
                for (Node n : nodes) { if (names.length() > 0) names.append(", "); names.append(n.getDisplayName()); }
                JSObject r = new JSObject();
                r.put("nodes", nodes.size());
                r.put("names", names.toString());
                call.resolve(r);
            })
            .addOnFailureListener(e -> {
                JSObject r = new JSObject();
                r.put("nodes", 0);
                r.put("names", "");
                call.resolve(r);
            });
    }
}
