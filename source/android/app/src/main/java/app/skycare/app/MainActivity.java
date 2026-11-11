package app.skycare.app;

import android.app.ActivityManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;

import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

import java.util.List;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.webkit.ValueCallback;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private String pendingDbx = null;
    private int dbxTries = 0;

    private void noteDbx(Intent intent) {
        try {
            Uri u = intent == null ? null : intent.getData();
            if (u != null && "skycare".equals(u.getScheme()) && "dropbox".equals(u.getHost())) {
                pendingDbx = u.toString();
                dbxTries = 0;
                deliverDbx();
            }
        } catch (Throwable t) {
        }
    }

    private void deliverDbx() {
        if (pendingDbx == null || dbxTries++ > 12) return;
        try {
            final String js = "window.__dbxCb ? window.__dbxCb(" + JSONObject.quote(pendingDbx) + ") : false";
            getBridge().getWebView().evaluateJavascript(js, new ValueCallback<String>() {
                @Override
                public void onReceiveValue(String v) {
                    if ("true".equals(v)) pendingDbx = null;
                    else new Handler(Looper.getMainLooper()).postDelayed(new Runnable() { public void run() { deliverDbx(); } }, 700);
                }
            });
        } catch (Throwable t) {
            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() { public void run() { deliverDbx(); } }, 700);
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppsPlugin.class);
        HomeCheck.note(getIntent());
        super.onCreate(savedInstanceState);
        try {
            boolean night = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
            getBridge().getWebView().setBackgroundColor(night ? Color.parseColor("#14101D") : Color.parseColor("#FAF7FF"));
        } catch (Throwable t) {
        }
        noteDbx(getIntent());
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                try {
                    getBridge().getWebView().evaluateJavascript("window.__back ? window.__back() : false", new ValueCallback<String>() {
                        @Override
                        public void onReceiveValue(String v) {
                            if ("true".equals(v)) return;
                            if (HomeCheck.isHome(MainActivity.this)) return;
                            finish();
                        }
                    });
                } catch (Throwable t) {
                    if (!HomeCheck.isHome(MainActivity.this)) finish();
                }
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        applyRecentsRule();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        HomeCheck.note(intent);
        setIntent(intent);
        noteDbx(intent);
        if (intent != null && intent.hasCategory(Intent.CATEGORY_HOME)) {
            try {
                getBridge().getWebView().evaluateJavascript("window.__home && window.__home()", null);
            } catch (Throwable t) {
            }
        }
        applyRecentsRule();
    }

    private void applyRecentsRule() {
        try {
            boolean mine = HomeCheck.isHome(this);
            ActivityManager am = (ActivityManager) getSystemService(ACTIVITY_SERVICE);
            List<ActivityManager.AppTask> tasks = am.getAppTasks();
            for (ActivityManager.AppTask t : tasks) t.setExcludeFromRecents(mine);
        } catch (Throwable t) {
        }
    }
}
