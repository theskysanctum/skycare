package app.takingcare.guide;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.provider.Settings;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "Apps")
public class AppsPlugin extends Plugin {

    private String iconData(Drawable d) {
        int size = 96;
        Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        d.setBounds(0, 0, size, size);
        d.draw(c);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        bmp.compress(Bitmap.CompressFormat.PNG, 100, out);
        bmp.recycle();
        return "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
    }

    @PluginMethod
    public void list(final PluginCall call) {
        new Thread(() -> {
            try {
                Context ctx = getContext();
                PackageManager pm = ctx.getPackageManager();
                Intent q = new Intent(Intent.ACTION_MAIN, null);
                q.addCategory(Intent.CATEGORY_LAUNCHER);
                List<ResolveInfo> found = pm.queryIntentActivities(q, 0);
                final List<JSObject> items = new ArrayList<>();
                final List<String> seen = new ArrayList<>();
                for (ResolveInfo ri : found) {
                    String pkg = ri.activityInfo.packageName;
                    if (pkg.equals(ctx.getPackageName()) || seen.contains(pkg)) continue;
                    seen.add(pkg);
                    JSObject o = new JSObject();
                    o.put("pkg", pkg);
                    o.put("label", String.valueOf(ri.loadLabel(pm)));
                    items.add(o);
                }
                Collections.sort(items, (x, y) -> x.getString("label", "").compareToIgnoreCase(y.getString("label", "")));
                JSArray arr = new JSArray();
                for (JSObject o : items) arr.put(o);
                JSObject res = new JSObject();
                res.put("apps", arr);
                res.put("seen", found.size());
                call.resolve(res);
            } catch (Throwable t) {
                call.reject("Could not read the app list: " + t);
            }
        }).start();
    }

    @PluginMethod
    public void icons(final PluginCall call) {
        final JSArray pkgs = call.getArray("pkgs");
        new Thread(() -> {
            try {
                PackageManager pm = getContext().getPackageManager();
                JSObject map = new JSObject();
                for (int i = 0; pkgs != null && i < pkgs.length(); i++) {
                    String pkg = pkgs.getString(i);
                    try {
                        map.put(pkg, iconData(pm.getApplicationIcon(pkg)));
                    } catch (Throwable t) {
                        map.put(pkg, "");
                    }
                }
                JSObject res = new JSObject();
                res.put("icons", map);
                call.resolve(res);
            } catch (Throwable t) {
                call.reject("Could not read icons: " + t);
            }
        }).start();
    }

    @PluginMethod
    public void launch(PluginCall call) {
        String pkg = call.getString("pkg");
        if (pkg == null) {
            call.reject("No app given");
            return;
        }
        Intent i = getContext().getPackageManager().getLaunchIntentForPackage(pkg);
        if (i == null) {
            call.reject("That app is not installed");
            return;
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    @PluginMethod
    public void homeStatus(PluginCall call) {
        boolean mine = HomeCheck.isHome(getContext());
        JSObject res = new JSObject();
        res.put("isHome", mine);
        call.resolve(res);
    }

    @PluginMethod
    public void openHomeSettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_HOME_SETTINGS);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Throwable t) {
            try {
                Intent i = new Intent(Settings.ACTION_SETTINGS);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
                call.resolve();
            } catch (Throwable t2) {
                call.reject("Could not open settings");
            }
        }
    }
}
