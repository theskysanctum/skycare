package app.skycare.app;

import android.app.ActivityManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import java.util.List;

public class MainActivity extends BridgeActivity {
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
