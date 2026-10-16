import AppIntents
import UIKit

/// Siri / Shortcuts / Action button. Each intent just opens the app on the matching screen through our own brainpal:// link
/// (handled in src/lib/nativeInit.ts). Nothing is sent anywhere and no data is read.
@available(iOS 16.0, *)
struct StartSosIntent: AppIntent {
    static var title: LocalizedStringResource = "I’m anxious"
    static var description = IntentDescription("Opens Brain Pal’s calming SOS.")
    static var openAppWhenRun: Bool = true
    @MainActor func perform() async throws -> some IntentResult {
        if let url = URL(string: "brainpal://sos") { await UIApplication.shared.open(url) }
        return .result()
    }
}

@available(iOS 16.0, *)
struct StartBreathingIntent: AppIntent {
    static var title: LocalizedStringResource = "Breathe with Pal"
    static var description = IntentDescription("Opens the breathing exercises.")
    static var openAppWhenRun: Bool = true
    @MainActor func perform() async throws -> some IntentResult {
        if let url = URL(string: "brainpal://breathe") { await UIApplication.shared.open(url) }
        return .result()
    }
}

@available(iOS 16.0, *)
struct LogMoodIntent: AppIntent {
    static var title: LocalizedStringResource = "Log my mood"
    static var description = IntentDescription("Opens Brain Pal on today’s check-in.")
    static var openAppWhenRun: Bool = true
    @MainActor func perform() async throws -> some IntentResult {
        if let url = URL(string: "brainpal://checkin") { await UIApplication.shared.open(url) }
        return .result()
    }
}

@available(iOS 16.0, *)
struct BrainPalShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: StartSosIntent(), phrases: ["I’m anxious in \(.applicationName)", "Calm me down with \(.applicationName)"], shortTitle: "I’m anxious", systemImageName: "light.beacon.max")
        AppShortcut(intent: StartBreathingIntent(), phrases: ["Breathe with \(.applicationName)"], shortTitle: "Breathe", systemImageName: "wind")
        AppShortcut(intent: LogMoodIntent(), phrases: ["Log my mood in \(.applicationName)"], shortTitle: "Log mood", systemImageName: "face.smiling")
    }
}
