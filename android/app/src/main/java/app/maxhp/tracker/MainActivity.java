package app.maxhp.tracker;

import android.os.Bundle;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /**
     * The StatusBar plugin only owns the status bar. Android 15+ enforces
     * edge-to-edge, so the navigation bar (gesture pill or buttons) is drawn
     * over our dark background too, and its icon appearance is controlled
     * separately by `setAppearanceLightNavigationBars`. Capacitor exposes no
     * config for it, so it is set here: false = light icons, which is the only
     * correct choice for an app whose every surface is dark. Without this the
     * pill renders dark-on-dark and all but disappears.
     */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
            .setAppearanceLightNavigationBars(false);
    }
}
