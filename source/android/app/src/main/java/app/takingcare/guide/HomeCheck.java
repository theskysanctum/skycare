package app.takingcare.guide;

import android.app.role.RoleManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Build;

public final class HomeCheck {
    public static volatile boolean sawHomeIntent = false;

    private HomeCheck() {
    }

    public static void note(Intent i) {
        if (i != null && i.hasCategory(Intent.CATEGORY_HOME)) sawHomeIntent = true;
    }

    public static boolean isHome(Context c) {
        String me = c.getPackageName();
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                RoleManager rm = (RoleManager) c.getSystemService(Context.ROLE_SERVICE);
                if (rm != null && rm.isRoleAvailable(RoleManager.ROLE_HOME) && rm.isRoleHeld(RoleManager.ROLE_HOME)) return true;
            }
        } catch (Throwable t) {
        }
        String other = null;
        try {
            Intent h = new Intent(Intent.ACTION_MAIN);
            h.addCategory(Intent.CATEGORY_HOME);
            ResolveInfo ri = c.getPackageManager().resolveActivity(h, PackageManager.MATCH_DEFAULT_ONLY);
            if (ri != null && ri.activityInfo != null) {
                String p = ri.activityInfo.packageName;
                if (me.equals(p)) return true;
                if (p != null && !p.equals("android") && !p.startsWith("com.android.internal")) other = p;
            }
        } catch (Throwable t) {
        }
        return sawHomeIntent && other == null;
    }
}
