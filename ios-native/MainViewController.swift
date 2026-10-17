import UIKit
import Capacitor

/// Registers app-local plugins (Capacitor only auto-registers plugins that come from npm packages).
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(MindfulPlugin())
        // An app, not a web page: no scroll bars.
        webView?.scrollView.showsVerticalScrollIndicator = false
        webView?.scrollView.showsHorizontalScrollIndicator = false
        // When the keyboard opens the web view shrinks; what shows behind it (under the keyboard's rounded corners) is this view: paint it the app's navy, not black.
        let navy = UIColor(red: 14 / 255, green: 23 / 255, blue: 38 / 255, alpha: 1)
        view.backgroundColor = navy
        webView?.backgroundColor = navy
        webView?.scrollView.backgroundColor = navy
        webView?.isOpaque = false
    }

    // Capacitor's view IS the web view, so when it shrinks for the keyboard the window behind it shows: paint that too.
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        view.window?.backgroundColor = UIColor(red: 14 / 255, green: 23 / 255, blue: 38 / 255, alpha: 1)
        view.superview?.backgroundColor = view.window?.backgroundColor
    }
}
