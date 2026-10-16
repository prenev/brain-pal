import WidgetKit
import SwiftUI
import UIKit

/// Wobbi's widgets. They only READ the snapshot the app saves in the App Group (WobbiShared.swift); interactive ones
/// queue actions for the app. Nothing here touches the network. Views: WobbiWidgetViews.swift.

// MARK: - timeline

struct WobbiEntry: TimelineEntry {
    let date: Date
    let snap: WidgetSnapshot?
}

struct WobbiProvider: TimelineProvider {
    func placeholder(in context: Context) -> WobbiEntry { WobbiEntry(date: Date(), snap: .sample) }
    func getSnapshot(in context: Context, completion: @escaping (WobbiEntry) -> Void) {
        completion(WobbiEntry(date: Date(), snap: context.isPreview ? (WidgetSnapshot.load() ?? .sample) : WidgetSnapshot.load()?.asOf(Date())))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WobbiEntry>) -> Void) {
        let now = Date(), snap = WidgetSnapshot.load()
        var dates = [now]
        // redraw just after midnight (a new day starts empty) and in the evening (Wobbi gets sleepy if you haven't checked in)
        let cal = Calendar.current
        if let evening = cal.date(bySettingHour: 18, minute: 0, second: 5, of: now), evening > now { dates.append(evening) }
        if let midnight = cal.date(byAdding: .day, value: 1, to: cal.startOfDay(for: now)) { dates.append(midnight.addingTimeInterval(5)) }
        completion(Timeline(entries: dates.map { WobbiEntry(date: $0, snap: snap?.asOf($0)) }, policy: .after(now.addingTimeInterval(30 * 60))))
    }
}

/// A clock for the StandBy night-stand widget: one entry per minute for the next hour.
struct ClockProvider: TimelineProvider {
    func placeholder(in context: Context) -> WobbiEntry { WobbiEntry(date: Date(), snap: .sample) }
    func getSnapshot(in context: Context, completion: @escaping (WobbiEntry) -> Void) { completion(WobbiEntry(date: Date(), snap: WidgetSnapshot.load()?.asOf(Date()))) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WobbiEntry>) -> Void) {
        let now = Date(), snap = WidgetSnapshot.load()
        let start = Calendar.current.dateInterval(of: .minute, for: now)?.start ?? now
        let entries = (0..<60).map { i -> WobbiEntry in let d = start.addingTimeInterval(Double(i) * 60); return WobbiEntry(date: d, snap: snap?.asOf(d)) }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

extension WidgetSnapshot {
    /// What the widget gallery shows before the app has ever written anything.
    static var sample: WidgetSnapshot {
        let today = Date()
        let letters = ["S", "M", "T", "W", "T", "F", "S"]
        let moods: [Int?] = [3, 2, 3, 4, 4, 5, nil], sleeps: [Int?] = [400, 350, 420, 450, 430, 470, 440]
        let week = (0..<7).map { i -> Day in
            let d = Calendar.current.date(byAdding: .day, value: i - 6, to: today) ?? today
            return Day(day: dayKey(d), letter: letters[Calendar.current.component(.weekday, from: d) - 1], mood: moods[i], sleepMin: sleeps[i])
        }
        return WidgetSnapshot(v: 1, at: today.timeIntervalSince1970 * 1000, day: dayKey(today), hasData: true, streak: 12, activeToday: false, todayMood: nil, week: week,
            anchors: [Anchor(id: "1", label: "Walk", emoji: "walk", done: true, auto: false), Anchor(id: "2", label: "Water", emoji: "water", done: true, auto: false),
                      Anchor(id: "3", label: "Write", emoji: "pen", done: true, auto: true), Anchor(id: "4", label: "Bed by 11", emoji: "bed", done: false, auto: false),
                      Anchor(id: "5", label: "No phone", emoji: "phoneoff", done: false, auto: false)],
            worriesOpen: 3, sleep: Sleep(lastMin: 440, avgMin: 400), prompt: "A small win I might be overlooking", coins: 340,
            focus: Guard(enabled: true, apps: 3, challenges: 2, reps: 4, minutes: 50, week: [1, 0, 2, 1, 3, 0, 2]),
            wobbi: Wobbi(text: "You showed up 5 days this week.", pose: "love"))
    }
}

// MARK: - look

extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        self.init(.sRGB, red: Double((hex >> 16) & 0xff) / 255, green: Double((hex >> 8) & 0xff) / 255, blue: Double(hex & 0xff) / 255, opacity: opacity)
    }
    static let wText = Color(hex: 0xf4f7ff)
    static let wMuted = Color(hex: 0xf4f7ff, opacity: 0.62)
    static let wGreen = Color(hex: 0x35d07f)
    static let wGreenDark = Color(hex: 0x1d9f5d)
    static let wBlue = Color(hex: 0x4aa8ff)
    static let wOrange = Color(hex: 0xffa63d)
    static let wRed = Color(hex: 0xff5d73)
    static let wInk = Color(hex: 0x062812)
}

enum WobbiBg {
    static func grad(_ a: UInt32, _ b: UInt32) -> LinearGradient { LinearGradient(colors: [Color(hex: a), Color(hex: b)], startPoint: .topLeading, endPoint: .bottomTrailing) }
    static let navy = grad(0x1f2e48, 0x131d31)
    static let lavender = grad(0x3a2f74, 0x1b1840)
    static let mint = grad(0x14513e, 0x0c2a24)
    static let sunset = grad(0xff9b5a, 0xff5d73)
    static let night = grad(0x141a3a, 0x070a18)
    static let sky = grad(0x2c7fd9, 0x163f88)
    static let paper = grad(0xfff6df, 0xffe1b8)
    static let plum = grad(0x2a2346, 0x16162a)
    static let calm = LinearGradient(colors: [Color(hex: 0xff9b5a), Color(hex: 0xff5d73), Color(hex: 0xb23a8a)], startPoint: .topLeading, endPoint: .bottomTrailing)
}

/// Wobbi in a pose (PNG made from lib/pal.ts by scripts/widget-assets.mjs). Unknown poses fall back to idle.
struct Pal: View {
    let pose: String
    var size: CGFloat
    init(_ pose: String, size: CGFloat) { self.pose = pose; self.size = size }
    var body: some View {
        Image(UIImage(named: "pal-\(pose)") != nil ? "pal-\(pose)" : "pal-idle").resizable().scaledToFit().frame(width: size, height: size)
    }
}

/// A Fluent emoji by its app name ("fire", "mood-4", an anchor's emoji, …); a soft dot if we don't have it.
struct Emo: View {
    let name: String
    var size: CGFloat
    init(_ name: String, size: CGFloat) { self.name = name; self.size = size }
    var body: some View {
        if UIImage(named: "emoji-\(name)") != nil {
            Image("emoji-\(name)").resizable().scaledToFit().frame(width: size, height: size)
        } else {
            Circle().fill(Color.white.opacity(0.25)).frame(width: size * 0.7, height: size * 0.7).frame(width: size, height: size)
        }
    }
}

extension Font {
    static func w(_ size: CGFloat, _ weight: Font.Weight = .heavy) -> Font { .system(size: size, weight: weight, design: .rounded) }
}

/// Small caps label at the top of a widget.
struct Kicker: View {
    let text: String
    var color: Color = .wMuted
    var body: some View { Text(text.uppercased()).font(.w(11, .black)).kerning(0.6).foregroundStyle(color).lineLimit(1) }
}

/// The app's chunky button look: a solid face over a darker lip.
struct Chunk<Label: View>: View {
    var fill: Color
    var lip: Color
    var radius: CGFloat = 14
    @ViewBuilder var label: Label
    var body: some View {
        label
            .padding(.horizontal, 10).padding(.vertical, 7)
            .frame(maxWidth: .infinity)
            .background(RoundedRectangle(cornerRadius: radius, style: .continuous).fill(fill))
            .background(RoundedRectangle(cornerRadius: radius, style: .continuous).fill(lip).offset(y: 3))
            .padding(.bottom, 3)
    }
}

/// A soft tile on a coloured widget.
struct Tile<Content: View>: View {
    var radius: CGFloat = 16
    @ViewBuilder var content: Content
    var body: some View {
        content
            .padding(10)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(RoundedRectangle(cornerRadius: radius, style: .continuous).fill(Color.white.opacity(0.08)))
            .overlay(RoundedRectangle(cornerRadius: radius, style: .continuous).strokeBorder(Color.white.opacity(0.1), lineWidth: 1.5))
    }
}

func link(_ route: String) -> URL { URL(string: "brainpal://\(route)")! }

func hours(_ min: Int?) -> String {
    guard let m = min else { return "—" }
    return "\(m / 60)h \(String(format: "%02d", m % 60))"
}

// MARK: - the widgets

private func cfg<V: View>(_ kind: String, _ name: String, _ about: String, _ families: [WidgetFamily], _ view: @escaping (WobbiEntry) -> V) -> some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: WobbiProvider()) { e in view(e) }
        .configurationDisplayName(name).description(about).supportedFamilies(families)
}

struct StreakWidget: Widget {
    var body: some WidgetConfiguration { cfg("WobbiStreak", "Streak buddy", "Your streak, and how Wobbi feels about it.", [.systemSmall, .accessoryCircular]) { StreakView(entry: $0) } }
}
struct BreatheWidget: Widget {
    var body: some WidgetConfiguration { cfg("WobbiBreathe", "Breathe", "One tap to a calm minute.", [.systemSmall, .accessoryCircular]) { BreatheView(entry: $0) } }
}
struct SosWidget: Widget {
    var body: some WidgetConfiguration { cfg("WobbiSos", "SOS", "Feeling anxious? Help is one tap away.", [.systemSmall]) { SosView(entry: $0) } }
}
struct WorryJarWidget: Widget {
    var body: some WidgetConfiguration { cfg("WobbiWorryJar", "Worry jar", "Worries you parked, safe until worry time.", [.systemSmall, .accessoryInline]) { WorryJarView(entry: $0) } }
}
struct GuardWidget: Widget {
    var body: some WidgetConfiguration { cfg("WobbiGuard", "Focus", "Focus blocks today, minutes and your week.", [.systemSmall, .systemLarge]) { GuardView(entry: $0) } }
}
struct JournalWidget: Widget {
    var body: some WidgetConfiguration { cfg("WobbiJournal", "Journal prompt", "A fresh question every day.", [.systemSmall]) { JournalView(entry: $0) } }
}
struct SleepWidget: Widget {
    var body: some WidgetConfiguration { cfg("WobbiSleep", "Sleep", "Last night and your week, from Apple Health.", [.systemSmall]) { SleepView(entry: $0) } }
}
struct WobbiSaysWidget: Widget {
    var body: some WidgetConfiguration { cfg("WobbiSays", "Wobbi says", "A kind, true line about your week.", [.systemSmall]) { WobbiSaysView(entry: $0) } }
}
struct MoodCheckInWidget: Widget {
    var body: some WidgetConfiguration { cfg("WobbiMood", "Mood check-in", "Tap a face to log how you feel, without opening the app.", [.systemMedium, .accessoryRectangular]) { MoodCheckInView(entry: $0) } }
}
struct AnchorsWidget: Widget {
    var body: some WidgetConfiguration { cfg("WobbiAnchors", "Daily anchors", "Tick today’s small habits from the home screen.", [.systemMedium]) { AnchorsView(entry: $0) } }
}
struct MoodWeekWidget: Widget {
    var body: some WidgetConfiguration { cfg("WobbiWeek", "Mood week", "Your week of moods, with sleep.", [.systemMedium]) { MoodWeekView(entry: $0) } }
}
struct CalmKitWidget: Widget {
    var body: some WidgetConfiguration { cfg("WobbiCalmKit", "Calm kit", "SOS, breathing and worry parking in one place.", [.systemMedium]) { CalmKitView(entry: $0) } }
}
struct TodayWidget: Widget {
    var body: some WidgetConfiguration { cfg("WobbiToday", "Today", "Your whole day with Wobbi.", [.systemLarge]) { TodayView(entry: $0) } }
}
struct NightStandWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "WobbiNightStand", provider: ClockProvider()) { NightStandView(entry: $0) }
            .configurationDisplayName("Night stand").description("A sleepy Wobbi clock for StandBy. Tap to wind down.").supportedFamilies([.systemSmall])
    }
}

struct HomeWidgets: WidgetBundle {
    var body: some Widget {
        StreakWidget(); BreatheWidget(); SosWidget(); WorryJarWidget(); GuardWidget(); JournalWidget(); SleepWidget()
    }
}
struct MoreWidgets: WidgetBundle {
    var body: some Widget {
        WobbiSaysWidget(); MoodCheckInWidget(); AnchorsWidget(); MoodWeekWidget(); CalmKitWidget(); TodayWidget(); NightStandWidget()
    }
}

@main
struct WobbiWidgetBundle: WidgetBundle {
    var body: some Widget {
        HomeWidgets().body
        MoreWidgets().body
        WobbiLiveActivity()
        controls
    }
    @WidgetBundleBuilder var controls: some Widget {
        if #available(iOS 18.0, *) { WobbiControls().body }
    }
}
