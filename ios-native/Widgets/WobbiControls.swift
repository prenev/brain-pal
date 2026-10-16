import WidgetKit
import SwiftUI
import AppIntents

/// iOS 18 Control Center / lock screen / Action button controls. Each one opens the app on a screen (OpenWobbiIntent
/// in WobbiShared.swift leaves the route in the App Group; the app picks it up as it becomes active).
@available(iOS 18.0, *)
struct WobbiControls: WidgetBundle {
    var body: some Widget { SosControl(); BreatheControl(); ParkControl(); GuardControl() }
}

/// ControlWidget needs a plain init(), so each control is its own type; `button` builds the shared shape.
@available(iOS 18.0, *)
private func button(_ kind: String, _ route: WobbiRoute, _ title: String, _ symbol: String, _ about: String) -> some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: kind) {
        ControlWidgetButton(action: OpenWobbiIntent(route: route)) { Label(title, systemImage: symbol) }
    }
    .displayName(LocalizedStringResource(stringLiteral: title))
    .description(LocalizedStringResource(stringLiteral: about))
}

@available(iOS 18.0, *)
struct SosControl: ControlWidget {
    var body: some ControlWidgetConfiguration { button("com.brainpal.app.control.sos", .sos, "SOS", "light.beacon.max", "Calm down with Wobbi, right now.") }
}
@available(iOS 18.0, *)
struct BreatheControl: ControlWidget {
    var body: some ControlWidgetConfiguration { button("com.brainpal.app.control.breathe", .breathe, "Breathe", "wind", "Start a slow breathing session.") }
}
@available(iOS 18.0, *)
struct ParkControl: ControlWidget {
    var body: some ControlWidgetConfiguration { button("com.brainpal.app.control.park", .park, "Park a worry", "cloud", "Write a worry down for later.") }
}
@available(iOS 18.0, *)
struct GuardControl: ControlWidget {
    var body: some ControlWidgetConfiguration { button("com.brainpal.app.control.guard", .focus, "Focus", "timer", "Start or check a focus block.") }
}
