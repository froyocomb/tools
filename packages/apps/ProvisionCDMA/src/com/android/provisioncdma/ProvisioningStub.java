package com.android.provisioncdma;

import android.app.Activity;
import android.os.Bundle;

public class ProvisioningStub extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Return RESULT_OK so the calling Phone Settings app assumes 
        // the CDMA provisioning step was successfully completed.
        setResult(RESULT_OK);
        
        // Immediately terminate the activity so the user never sees it.
        finish();
    }
}
