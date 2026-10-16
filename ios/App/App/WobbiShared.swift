import Foundation
import AppIntents
import WidgetKit
#if canImport(ActivityKit)
import ActivityKit
#endif

/// Compiled into BOTH the app and the widget extension. The app writes the snapshot (built in src/lib/widgetData.ts);
/// widgets read it and queue actions for the app to apply. Everything stays on the device, in the shared App Group.
enum WobbiGroup {
    static let id = "group.com.brainpal.app"
    static var defaults: UserDefaults { UserDefaults(suiteName: id) ?? .standard }
    static let snapshotKey = "widget.snapshot"
    static let actionsKey = "widget.actions"
    static let routeKey = "widget.route"
    static let maxQueued = 50
}

/// Mirrors `WidgetSnapshot` in src/lib/widgetData.ts (JSON). Optional = may be null.
struct WidgetSnapshot: Codable {
    struct Day: Codable { var day: String; var letter: String; var mood: Int?; var sleepMin: Int? }
    struct Anchor: Codable { var id: String; var label: String; var emoji: String; var done: Bool; var auto: Bool }
    struct Sleep: Codable { var lastMin: Int?; var avgMin: Int? }
    struct Guard: Codable { var enabled: Bool; var apps: Int; var challenges: Int; var reps: Int; var minutes: Int; var week: [Int] }
    struct Wobbi: Codable { var text: String; var pose: String }
    var v: Int
    var at: Double
    var day: String
    var hasData: Bool
    var streak: Int
    var activeToday: Bool
    var todayMood: Int?
    var week: [Day]
    var anchors: [Anchor]
    var worriesOpen: Int
    var sleep: Sleep
    var prompt: String
    var coins: Int
    var focus: Guard
    var wobbi: Wobbi
    enum CodingKeys: String, CodingKey { case v, at, day, hasData, streak, activeToday, todayMood, week, anchors, worriesOpen, sleep, prompt, coins, focus = "guard", wobbi }

    static func dayKey(_ d: Date) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: d)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }
    private static func date(_ key: String) -> Date? {
        let p = key.split(separator: "-").compactMap { Int($0) }
        guard p.count == 3 else { return nil }
        return Calendar.current.date(from: DateComponents(year: p[0], month: p[1], day: p[2]))
    }

    /// The snapshot as it should look on `now`: if the app hasn't been opened since an earlier day, "today" starts empty
    /// and the week slides along (a streak survives until the end of the day after the last activity, like in the app).
    func asOf(_ now: Date) -> WidgetSnapshot {
        let today = Self.dayKey(now)
        guard today != day, let from = Self.date(day), let to = Self.date(today) else { return self }
        let gap = Calendar.current.dateComponents([.day], from: from, to: to).day ?? 0
        guard gap > 0 else { return self }
        var s = self
        s.day = today
        s.streak = (gap == 1 && activeToday) ? streak : 0
        s.activeToday = false
        s.todayMood = nil
        s.anchors = anchors.map { var a = $0; a.done = false; a.auto = false; return a }
        s.focus.challenges = 0; s.focus.reps = 0; s.focus.minutes = 0
        let letters = ["S", "M", "T", "W", "T", "F", "S"]
        var days = week, gw = focus.week
        for i in 1...min(gap, 7) {
            let d = Calendar.current.date(byAdding: .day, value: i - min(gap, 7), to: to) ?? to
            days.append(Day(day: Self.dayKey(d), letter: letters[Calendar.current.component(.weekday, from: d) - 1], mood: nil, sleepMin: nil))
            gw.append(0)
        }
        s.week = Array(days.suffix(7)); s.focus.week = Array(gw.suffix(7))
        return s
    }

    static func load() -> WidgetSnapshot? {
        guard let json = WobbiGroup.defaults.string(forKey: WobbiGroup.snapshotKey), let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }
    func save() {
        guard let data = try? JSONEncoder().encode(self), let json = String(data: data, encoding: .utf8) else { return }
        WobbiGroup.defaults.set(json, forKey: WobbiGroup.snapshotKey)
    }
}

/// The queue interactive widgets write and the app drains (`widgetTake`). Shapes match `WidgetAction` in widgetData.ts.
enum WidgetQueue {
    static func append(_ action: [String: Any]) {
        let d = WobbiGroup.defaults
        var list = (d.array(forKey: WobbiGroup.actionsKey) as? [[String: Any]]) ?? []
        list.append(action)
        d.set(Array(list.suffix(WobbiGroup.maxQueued)), forKey: WobbiGroup.actionsKey)
    }
    static func open(_ route: String) { WobbiGroup.defaults.set(route, forKey: WobbiGroup.routeKey) }
    /// Returns and clears everything queued.
    static func take() -> (actions: String, route: String?) {
        let d = WobbiGroup.defaults
        let list = (d.array(forKey: WobbiGroup.actionsKey) as? [[String: Any]]) ?? []
        let route = d.string(forKey: WobbiGroup.routeKey)
        d.removeObject(forKey: WobbiGroup.actionsKey); d.removeObject(forKey: WobbiGroup.routeKey)
        let data = (try? JSONSerialization.data(withJSONObject: list)) ?? Data("[]".utf8)
        return (String(data: data, encoding: .utf8) ?? "[]", route)
    }
}

/* ---- interactive widget buttons (run inside the widget extension, no app launch) ---- */

@available(iOS 17.0, *)
struct LogMoodWidgetIntent: AppIntent {
    static var title: LocalizedStringResource = "Log mood"
    static var description = IntentDescription("Logs how you feel right now in Wobbi.")
    static var isDiscoverable: Bool = false
    @Parameter(title: "Mood") var mood: Int
    init() {}
    init(mood: Int) { self.mood = mood }
    func perform() async throws -> some IntentResult {
        guard (1...5).contains(mood) else { return .result() }
        WidgetQueue.append(["kind": "mood", "mood": mood, "at": Date().timeIntervalSince1970 * 1000])
        if var s = WidgetSnapshot.load()?.asOf(Date()) {   // show it straight away; the app makes it real next time it opens
            if !s.activeToday { s.streak += 1 }
            s.activeToday = true; s.todayMood = mood
            if !s.week.isEmpty { s.week[s.week.count - 1].mood = mood }
            s.save()
        }
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

@available(iOS 17.0, *)
struct ToggleAnchorWidgetIntent: AppIntent {
    static var title: LocalizedStringResource = "Tick an anchor"
    static var description = IntentDescription("Ticks or unticks one of today’s anchors in Wobbi.")
    static var isDiscoverable: Bool = false
    @Parameter(title: "Anchor") var anchorId: String
    init() {}
    init(anchorId: String) { self.anchorId = anchorId }
    func perform() async throws -> some IntentResult {
        guard var s = WidgetSnapshot.load()?.asOf(Date()), let i = s.anchors.firstIndex(where: { $0.id == anchorId }), !s.anchors[i].auto else { return .result() }
        s.anchors[i].done.toggle()
        WidgetQueue.append(["kind": "anchor", "id": anchorId, "done": s.anchors[i].done, "day": s.day, "at": Date().timeIntervalSince1970 * 1000])
        s.save()
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

/* ---- Control Center / Action button: open a screen of the app ---- */

@available(iOS 16.0, *)
enum WobbiRoute: String, AppEnum {
    case sos, breathe, park, focus = "guard"
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Screen"
    static var caseDisplayRepresentations: [WobbiRoute: DisplayRepresentation] = [
        .sos: "SOS", .breathe: "Breathe", .park: "Park a worry", .focus: "Focus guard",
    ]
}

/// Opens the app and leaves the screen to show in the App Group; the app picks it up when it becomes active.
@available(iOS 16.0, *)
struct OpenWobbiIntent: AppIntent {
    static var title: LocalizedStringResource = "Open in Wobbi"
    static var description = IntentDescription("Opens Wobbi on SOS, breathing, park a worry or the focus guard.")
    static var openAppWhenRun: Bool = true
    static var isDiscoverable: Bool = false
    @Parameter(title: "Screen") var route: WobbiRoute
    init() {}
    init(route: WobbiRoute) { self.route = route }
    func perform() async throws -> some IntentResult {
        WidgetQueue.open(route.rawValue)
        return .result()
    }
}

/* ---- Live Activity (lock screen + Dynamic Island) ---- */

#if canImport(ActivityKit)
@available(iOS 16.1, *)
struct WobbiActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var title: String
        var subtitle: String
        var startsAt: Date
        var endsAt: Date
        /// Set while paused: the clock shows this many seconds and doesn't move.
        var pausedRemaining: Double?
    }
    /// "breathe" or "focus"
    var kind: String
}
#endif
