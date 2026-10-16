import UIKit
import Capacitor

/// Registers app-local plugins (Capacitor only auto-registers plugins that come from npm packages).
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(MindfulPlugin())
        // An app, not a web page: no scroll bars.
        webView?.scrollView.showsVerticalScrollIndicator = false
        webView?.scrollView.showsHorizontalScrollIndicator = false
    }
}
