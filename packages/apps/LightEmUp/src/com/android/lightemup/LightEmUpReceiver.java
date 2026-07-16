package com.android.lightemup;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;

public class LightEmUpReceiver extends BroadcastReceiver {
    private static final int FULL_INET_CONDITION = 100;

    @Override
    public void onReceive(Context context, Intent intent) {
        ConnectivityManager cm = (ConnectivityManager)
                context.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) {
            return;
        }

        NetworkInfo activeInfo = cm.getActiveNetworkInfo();
        if (activeInfo == null) {
            return;
        }

        cm.reportInetCondition(activeInfo.getType(), FULL_INET_CONDITION);
    }
}
