import UIKit
import Capacitor

/// Registers app-local plugins (Capacitor only auto-registers plugins that come from npm packages).
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(MindfulPlugin())
    }
}
