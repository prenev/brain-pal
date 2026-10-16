import WidgetKit
import SwiftUI
import AppIntents

// The widget faces. Sizes follow iPhone widget families; colours and Wobbi come from WobbiWidgets.swift.

/// Before the app has written a snapshot (fresh install): a friendly nudge instead of fake numbers.
struct NeedsApp: View {
    var compact = false
    var body: some View {
        VStack(spacing: 4) {
            Pal("wave", size: compact ? 54 : 70)
            Text("Open Wobbi once to set me up").font(.w(compact ? 12 : 14)).multilineTextAlignment(.center).foregroundStyle(Color.wText)
        }
        .containerBackground(for: .widget) { WobbiBg.lavender }
        .widgetURL(link("checkin"))
    }
}

private let moodPose: [Int: String] = [1: "love", 2: "love", 3: "idle", 4: "cheer", 5: "celebrate"]

// MARK: 1 · Streak buddy

struct StreakView: View {
    let entry: WobbiEntry
    @Environment(\.widgetFamily) var family
    var body: some View {
        if let s = entry.snap {
            if family == .accessoryCircular {
                ZStack {
                    AccessoryWidgetBackground()
                    VStack(spacing: 0) { Image(systemName: "flame.fill").font(.system(size: 16, weight: .bold)); Text("\(s.streak)").font(.w(20, .black)) }
                }
                .widgetLabel("Day streak")
                .widgetURL(link("checkin"))
            } else {
                let hour = Calendar.current.component(.hour, from: entry.date)
                let pose = s.activeToday ? "cheer" : (hour >= 18 && s.streak > 0 ? "sleepy" : "wave")
                ZStack(alignment: .topLeading) {
                    Pal(pose, size: 92).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing).offset(x: 10, y: -8)
                    VStack(alignment: .leading, spacing: 2) {
                        HStack { Kicker(text: "Streak"); Spacer(); Emo("fire", size: 22) }
                        HStack(alignment: .firstTextBaseline, spacing: 3) {
                            Text("\(s.streak)").font(.w(40, .black)).foregroundStyle(Color.wText)
                            Text(s.streak == 1 ? "day" : "days").font(.w(13, .bold)).foregroundStyle(Color.wMuted)
                        }
                        Spacer()
                        HStack(spacing: 5) {
                            ForEach(Array(s.week.enumerated()), id: \.offset) { _, d in
                                VStack(spacing: 2) {
                                    Circle().fill(d.mood != nil ? Color.wOrange : Color.white.opacity(0.16)).frame(width: 9, height: 9)
                                    Text(d.letter).font(.w(8, .bold)).foregroundStyle(Color.wMuted)
                                }
                            }
                        }
                    }
                }
                .containerBackground(for: .widget) { WobbiBg.lavender }
                .widgetURL(link("checkin"))
            }
        } else { NeedsApp(compact: true) }
    }
}

// MARK: 2 · One-tap breathe

struct BreatheView: View {
    let entry: WobbiEntry
    @Environment(\.widgetFamily) var family
    var body: some View {
        if family == .accessoryCircular {
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 1) { Image(systemName: "wind").font(.system(size: 18, weight: .bold)); Text("Breathe").font(.w(10, .heavy)) }
            }
            .widgetURL(link("breathe"))
        } else {
            VStack(spacing: 6) {
                ZStack {
                    Circle().fill(RadialGradient(colors: [Color.wGreen.opacity(0.5), .clear], center: .center, startRadius: 10, endRadius: 62)).frame(width: 118, height: 118)
                    Circle().strokeBorder(Color.wGreen.opacity(0.35), lineWidth: 2).frame(width: 96, height: 96)
                    Circle().strokeBorder(Color.wGreen.opacity(0.6), lineWidth: 2).frame(width: 72, height: 72)
                    Pal("breatheIn", size: 66)
                }
                .frame(height: 100)
                Text("Breathe · 1 min").font(.w(15, .black)).foregroundStyle(Color.wText)
            }
            .containerBackground(for: .widget) { WobbiBg.mint }
            .widgetURL(link("breathe"))
        }
    }
}

// MARK: 3 · SOS

struct SosView: View {
    let entry: WobbiEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack { Kicker(text: "Right now", color: Color(hex: 0x3a0610, opacity: 0.7)); Spacer(); Emo("sos", size: 24) }
            Spacer(minLength: 0)
            Text("Feeling\nanxious?").font(.w(22, .black)).foregroundStyle(Color(hex: 0x3a0610)).lineLimit(2).minimumScaleFactor(0.8)
            Spacer(minLength: 0)
            Chunk(fill: .white, lip: Color(hex: 0xf3c2ca)) { Text("Calm me down").font(.w(14, .black)).foregroundStyle(Color(hex: 0xc73049)) }
        }
        .containerBackground(for: .widget) { WobbiBg.sunset }
        .widgetURL(link("sos"))
    }
}

// MARK: 4 · Worry jar

struct WorryJarView: View {
    let entry: WobbiEntry
    @Environment(\.widgetFamily) var family
    var body: some View {
        let n = entry.snap?.worriesOpen ?? 0
        if family == .accessoryInline {
            Label(n == 0 ? "No worries parked" : "\(n) \(n == 1 ? "worry" : "worries") parked", systemImage: "cloud")
                .widgetURL(link("worry"))
        } else {
            VStack(spacing: 4) {
                HStack { Kicker(text: "Worry jar"); Spacer() }
                ZStack(alignment: .top) {
                    RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Color.wBlue.opacity(0.14))
                        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Color(hex: 0xa0c8ff, opacity: 0.45), lineWidth: 2.5))
                        .frame(width: 78, height: 80).padding(.top, 9)
                    RoundedRectangle(cornerRadius: 5).fill(Color.wOrange).frame(width: 50, height: 11)
                    ZStack {
                        if n >= 1 { Emo("worry", size: 24).rotationEffect(.degrees(-12)).offset(x: -16, y: 6) }
                        if n >= 2 { Emo("thought", size: 22).rotationEffect(.degrees(14)).offset(x: 16, y: 14) }
                        if n >= 3 { Emo("cloud", size: 22).offset(x: 0, y: 30) }
                        if n == 0 { Pal("sleepy", size: 50).offset(y: 18) }
                    }
                    .frame(width: 78, height: 80).padding(.top, 9)
                }
                Spacer(minLength: 0)
                Text(n == 0 ? "Jar’s empty" : "\(n) parked · safe till later").font(.w(12, .bold)).foregroundStyle(Color.wMuted).lineLimit(1).minimumScaleFactor(0.8)
            }
            .containerBackground(for: .widget) { WobbiBg.navy }
            .widgetURL(link("worry"))
        }
    }
}

// MARK: 5 · Focus guard (small) + 14 · Focus guard board (large)

struct GuardView: View {
    let entry: WobbiEntry
    @Environment(\.widgetFamily) var family
    var body: some View {
        if let s = entry.snap {
            let g = s.focus
            if family == .systemLarge { board(g) } else {
                ZStack(alignment: .topLeading) {
                    Pal(g.enabled ? "flex" : "think", size: 66).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing).offset(x: 6, y: -18)
                    VStack(alignment: .leading, spacing: 2) {
                        HStack { Kicker(text: "Brain rot"); Spacer(); Emo("shield", size: 20) }
                        Text(g.enabled ? "\(g.apps) \(g.apps == 1 ? "app" : "apps") paused" : "Guard is off").font(.w(17, .black)).foregroundStyle(Color.wText).lineLimit(1).minimumScaleFactor(0.7)
                        Text(g.challenges == 0 ? "No challenges yet today" : "\(g.challenges) beaten today").font(.w(12, .bold)).foregroundStyle(Color.wMuted).lineLimit(2)
                        Spacer()
                        HStack(spacing: 3) {
                            Text(g.reps > 0 ? "\(g.reps)" : "\(g.minutes)").font(.w(28, .black)).foregroundStyle(Color.wGreen)
                            Text(g.reps > 0 ? "reps" : "min earned").font(.w(11, .bold)).foregroundStyle(Color.wMuted)
                        }
                    }
                }
                .containerBackground(for: .widget) { WobbiBg.plum }
                .widgetURL(link("guard"))
            }
        } else { NeedsApp() }
    }

    func board(_ g: WidgetSnapshot.Guard) -> some View {
        let most = max(g.week.max() ?? 0, 1)
        let letters = entry.snap?.week.map(\.letter) ?? []
        return VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) { Kicker(text: "Focus guard"); Text("Brain rot, beaten").font(.w(21, .black)).foregroundStyle(Color.wText) }
                Spacer(); Emo("shield", size: 30)
            }
            HStack(spacing: 12) {
                Pal(g.challenges > 0 ? "flex" : "think", size: 96)
                VStack(alignment: .leading, spacing: 2) {
                    Text(g.enabled ? "Guarding \(g.apps) \(g.apps == 1 ? "app" : "apps")" : "Guard is off").font(.w(16, .black)).foregroundStyle(g.enabled ? Color.wGreen : Color.wOrange)
                    Text(g.enabled ? "They stay paused until you earn a few minutes." : "Turn it on in Wobbi to pause the apps that pull you in.").font(.w(13, .semibold)).foregroundStyle(Color.wMuted).fixedSize(horizontal: false, vertical: true)
                }
            }
            HStack(spacing: 8) {
                Tile { stat("Today", "\(g.challenges)", "challenges") }
                Tile { stat("Reps", "\(g.reps)", "done") }
                Tile { stat("Earned", "\(g.minutes)", "minutes") }
            }
            .frame(height: 78)
            VStack(alignment: .leading, spacing: 4) {
                Kicker(text: "This week")
                HStack(alignment: .bottom, spacing: 8) {
                    ForEach(Array(g.week.enumerated()), id: \.offset) { i, n in
                        VStack(spacing: 3) {
                            RoundedRectangle(cornerRadius: 5).fill(i == g.week.count - 1 ? Color.wGreen : Color.wGreen.opacity(0.45))
                                .frame(height: max(4, CGFloat(n) / CGFloat(most) * 46))
                            Text(i < letters.count ? letters[i] : "").font(.w(10, .bold)).foregroundStyle(Color.wMuted)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                .frame(height: 64, alignment: .bottom)
            }
        }
        .containerBackground(for: .widget) { WobbiBg.plum }
        .widgetURL(link("guard"))
    }

    func stat(_ k: String, _ v: String, _ u: String) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Kicker(text: k)
            Text(v).font(.w(24, .black)).foregroundStyle(Color.wText)
            Text(u).font(.w(11, .bold)).foregroundStyle(Color.wMuted)
        }
    }
}

// MARK: 6 · Journal prompt

struct JournalView: View {
    let entry: WobbiEntry
    var body: some View {
        let ink = Color(hex: 0x3b2a10)
        VStack(alignment: .leading, spacing: 6) {
            HStack { Kicker(text: "Today’s prompt", color: ink.opacity(0.55)); Spacer(); Emo("nib", size: 20) }
            Text(entry.snap?.prompt ?? "What’s taking up space in your head?").font(.w(16, .black)).foregroundStyle(ink).lineLimit(4).minimumScaleFactor(0.8)
            Spacer(minLength: 0)
            VStack(alignment: .leading, spacing: 3) {
                Text("Tap to write…").font(.w(12, .semibold)).foregroundStyle(ink.opacity(0.5))
                Line().stroke(ink.opacity(0.3), style: StrokeStyle(lineWidth: 1.5, dash: [5, 4])).frame(height: 1)
            }
        }
        .containerBackground(for: .widget) { WobbiBg.paper }
        .widgetURL(link("journal"))
    }
}
struct Line: Shape { func path(in r: CGRect) -> Path { Path { p in p.move(to: CGPoint(x: 0, y: r.midY)); p.addLine(to: CGPoint(x: r.width, y: r.midY)) } } }

// MARK: 7 · Sleep

struct SleepView: View {
    let entry: WobbiEntry
    var body: some View {
        if let s = entry.snap {
            let mins = s.week.map { $0.sleepMin ?? 0 }, most = max(mins.max() ?? 0, 1)
            let delta: Int? = { if let l = s.sleep.lastMin, let a = s.sleep.avgMin { return l - a }; return nil }()
            ZStack(alignment: .topTrailing) {
                Pal("sleepy", size: 54).offset(x: 6, y: 16)
                VStack(alignment: .leading, spacing: 2) {
                    HStack { Kicker(text: "Last night"); Spacer() }
                    Text(hours(s.sleep.lastMin)).font(.w(32, .black)).foregroundStyle(Color.wText)
                    Spacer(minLength: 0)
                    HStack(alignment: .bottom, spacing: 3) {
                        ForEach(Array(mins.enumerated()), id: \.offset) { i, m in
                            RoundedRectangle(cornerRadius: 4).fill(i == mins.count - 1 ? Color.white : Color.white.opacity(0.35))
                                .frame(height: m == 0 ? 4 : max(6, CGFloat(m) / CGFloat(most) * 32))
                        }
                    }
                    .frame(height: 32, alignment: .bottom)
                    Text(s.sleep.lastMin == nil ? "Connect Apple Health in Wobbi" : delta.map { abs($0) < 10 ? "About your usual" : ($0 > 0 ? "↑ \($0) min vs usual" : "↓ \(-$0) min vs usual") } ?? "Sleep from Apple Health")
                        .font(.w(11, .bold)).foregroundStyle(Color.white.opacity(0.85)).lineLimit(1).minimumScaleFactor(0.7)
                }
            }
            .containerBackground(for: .widget) { WobbiBg.sky }
            .widgetURL(link("sleep"))
        } else { NeedsApp(compact: true) }
    }
}

// MARK: 8 · Wobbi says

struct WobbiSaysView: View {
    let entry: WobbiEntry
    var body: some View {
        if let s = entry.snap {
            VStack(spacing: 2) {
                Pal(s.wobbi.pose, size: 76)
                Text("“\(s.wobbi.text)”").font(.w(14, .black)).multilineTextAlignment(.center).foregroundStyle(Color.wText).lineLimit(3).minimumScaleFactor(0.75)
                HStack(spacing: 3) { Emo("star", size: 13); Text("\(s.coins) coins").font(.w(11, .bold)).foregroundStyle(Color.wMuted) }
            }
            .containerBackground(for: .widget) { WobbiBg.grad(0x4a3b8e, 0x251f55) }
            .widgetURL(link("checkin"))
        } else { NeedsApp(compact: true) }
    }
}

// MARK: 9 · One-tap mood check-in (interactive)

struct MoodCheckInView: View {
    let entry: WobbiEntry
    @Environment(\.widgetFamily) var family
    var body: some View {
        if let s = entry.snap {
            if family == .accessoryRectangular { lock(s) } else { home(s) }
        } else { NeedsApp() }
    }

    func home(_ s: WidgetSnapshot) -> some View {
        VStack(spacing: 10) {
            HStack(spacing: 8) {
                Pal(s.todayMood.flatMap { moodPose[$0] } ?? "wave", size: 58).padding(.vertical, -8)
                VStack(alignment: .leading, spacing: 1) {
                    Text(s.todayMood == nil ? "How’s your head?" : "Logged. Thank you.").font(.w(18, .black)).foregroundStyle(Color.wText)
                    if let m = s.todayMood, m <= 2 {
                        Link(destination: link("sos")) { Text("Rough? Tap for SOS →").font(.w(12, .heavy)).foregroundStyle(Color.wRed) }
                    } else {
                        Text(s.todayMood == nil ? "Tap a face — logged instantly" : "Tap again any time").font(.w(12, .semibold)).foregroundStyle(Color.wMuted)
                    }
                }
                Spacer()
                HStack(spacing: 2) { Emo("fire", size: 15); Text("\(s.streak)").font(.w(13, .black)).foregroundStyle(Color.wMuted) }
            }
            HStack(spacing: 8) {
                ForEach(1...5, id: \.self) { m in
                    Button(intent: LogMoodWidgetIntent(mood: m)) {
                        Emo("mood-\(m)", size: 32)
                            .frame(maxWidth: .infinity, minHeight: 48)
                            .background(RoundedRectangle(cornerRadius: 15, style: .continuous).fill(s.todayMood == m ? Color.wGreen.opacity(0.22) : Color.white.opacity(0.08)))
                            .overlay(RoundedRectangle(cornerRadius: 15, style: .continuous).strokeBorder(s.todayMood == m ? Color.wGreen : Color.white.opacity(0.1), lineWidth: 2))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(["", "Awful", "Bad", "Okay", "Good", "Great"][m])
                }
            }
        }
        .containerBackground(for: .widget) { WobbiBg.navy }
        .widgetURL(link("checkin"))
    }

    func lock(_ s: WidgetSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(s.todayMood == nil ? "How’s your head?" : "Mood logged").font(.w(13, .heavy))
            HStack(spacing: 4) {
                ForEach(1...5, id: \.self) { m in
                    Button(intent: LogMoodWidgetIntent(mood: m)) {
                        Emo("mood-\(m)", size: 22).opacity(s.todayMood == nil || s.todayMood == m ? 1 : 0.45)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(["", "Awful", "Bad", "Okay", "Good", "Great"][m])
                }
            }
        }
        .containerBackground(for: .widget) { Color.clear }
    }
}

// MARK: 10 · Daily anchors (interactive)

struct AnchorsView: View {
    let entry: WobbiEntry
    var body: some View {
        if let s = entry.snap {
            let done = s.anchors.filter(\.done).count, all = s.anchors.count
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Daily anchors").font(.w(18, .black)).foregroundStyle(Color.wText)
                        Text(all == 0 ? "Pick a few tiny habits in Wobbi" : done == all ? "All done. That counts." : "\(done) of \(all) done · keep going").font(.w(12, .semibold)).foregroundStyle(Color.wMuted)
                    }
                    Spacer()
                    Pal(all > 0 && done == all ? "celebrate" : "flex", size: 54).padding(.vertical, -10)
                }
                if all == 0 {
                    Link(destination: link("anchors")) { Chunk(fill: .wGreen, lip: .wGreenDark) { Text("Set up anchors").font(.w(14, .black)).foregroundStyle(Color.wInk) } }
                } else {
                    HStack(spacing: 6) {
                        ForEach(s.anchors, id: \.id) { a in
                            Button(intent: ToggleAnchorWidgetIntent(anchorId: a.id)) {
                                VStack(spacing: 3) {
                                    Emo(a.emoji, size: 26)
                                        .frame(width: 50, height: 46)
                                        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(a.done ? Color.wGreen : Color.white.opacity(0.08)))
                                        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(a.done ? Color.wGreenDark : Color.white.opacity(0.1), lineWidth: 2))
                                    Text((a.done ? "✓ " : "") + a.label).font(.w(10, .bold)).foregroundStyle(a.done ? Color.wText : Color.wMuted).lineLimit(1).minimumScaleFactor(0.7)
                                }
                                .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.plain)
                            .disabled(a.auto)
                            .accessibilityLabel("\(a.label), \(a.done ? "done" : "not done")")
                        }
                    }
                }
            }
            .containerBackground(for: .widget) { WobbiBg.mint }
            .widgetURL(link("anchors"))
        } else { NeedsApp() }
    }
}

// MARK: 11 · Mood week

struct MoodWeekView: View {
    let entry: WobbiEntry
    var body: some View {
        if let s = entry.snap {
            let most = max(s.week.compactMap(\.sleepMin).max() ?? 0, 1)
            VStack(alignment: .leading, spacing: 8) {
                HStack { Kicker(text: "Your week"); Spacer(); Text("Mood · sleep").font(.w(11, .bold)).foregroundStyle(Color.wMuted) }
                HStack(alignment: .bottom, spacing: 0) {
                    ForEach(Array(s.week.enumerated()), id: \.offset) { i, d in
                        VStack(spacing: 5) {
                            if let m = d.mood { Emo("mood-\(m)", size: 28) }
                            else { Circle().strokeBorder(Color.white.opacity(i == s.week.count - 1 ? 0.45 : 0.18), style: StrokeStyle(lineWidth: 2, dash: [4, 3])).frame(width: 26, height: 26).padding(1) }
                            RoundedRectangle(cornerRadius: 5).fill(d.sleepMin == nil ? Color.white.opacity(0.1) : Color.wBlue)
                                .frame(width: 13, height: d.sleepMin.map { max(8, CGFloat($0) / CGFloat(most) * 40) } ?? 6)
                                .frame(height: 40, alignment: .bottom)
                            Text(d.letter).font(.w(10, .bold)).foregroundStyle(i == s.week.count - 1 ? Color.wText : Color.wMuted)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
            .containerBackground(for: .widget) { WobbiBg.navy }
            .widgetURL(link("checkin"))
        } else { NeedsApp() }
    }
}

// MARK: 12 · Calm kit

struct CalmKitView: View {
    let entry: WobbiEntry
    var body: some View {
        let ink = Color(hex: 0x3a0610)
        HStack(alignment: .bottom, spacing: 4) {
            VStack(alignment: .leading, spacing: 8) {
                VStack(alignment: .leading, spacing: 1) { Kicker(text: "Calm kit", color: ink.opacity(0.65)); Text("What do you need?").font(.w(18, .black)).foregroundStyle(ink) }
                Spacer(minLength: 0)
                HStack(spacing: 6) {
                    kit("sos", "SOS", "sos", Color(hex: 0xc73049))
                    kit("breathe", "Breathe", "bubbles", Color.wGreenDark)
                }
                kit("park", "Park a worry", "worry", Color(hex: 0x2479cc))
            }
            Pal("love", size: 86).padding(.trailing, -8).padding(.bottom, -10)
        }
        .containerBackground(for: .widget) { WobbiBg.calm }
    }
    func kit(_ route: String, _ title: String, _ emoji: String, _ color: Color) -> some View {
        Link(destination: link(route)) {
            Chunk(fill: .white, lip: Color.white.opacity(0.55), radius: 13) {
                HStack(spacing: 4) { Emo(emoji, size: 16); Text(title).font(.w(13, .black)).foregroundStyle(color).lineLimit(1) }
            }
        }
    }
}

// MARK: 13 · Today, all in one (large)

struct TodayView: View {
    let entry: WobbiEntry
    var body: some View {
        if let s = entry.snap {
            let hour = Calendar.current.component(.hour, from: entry.date)
            let hello = hour < 12 ? "Good morning." : hour < 18 ? "Hey, you’re doing okay." : "Evening. Go easy on yourself."
            let done = s.anchors.filter(\.done).count, all = s.anchors.count
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 1) {
                        Kicker(text: entry.date.formatted(.dateTime.weekday(.wide)))
                        Text(hello).font(.w(20, .black)).foregroundStyle(Color.wText).lineLimit(1).minimumScaleFactor(0.8)
                    }
                    Spacer()
                    HStack(spacing: 3) { Emo("fire", size: 17); Text("\(s.streak)").font(.w(15, .black)).foregroundStyle(Color.wText) }
                        .padding(.horizontal, 9).padding(.vertical, 5)
                        .background(Capsule().fill(Color.white.opacity(0.08)))
                }
                HStack(spacing: 8) {
                    Pal(s.wobbi.pose, size: 72).padding(.vertical, -6)
                    Text(s.wobbi.text).font(.w(13, .heavy)).foregroundStyle(Color(hex: 0x1b1840)).lineLimit(3)
                        .padding(.horizontal, 10).padding(.vertical, 8)
                        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color.white))
                }
                HStack(spacing: 8) {
                    Link(destination: link("anchors")) {
                        Tile {
                            VStack(alignment: .leading, spacing: 4) {
                                Kicker(text: "Anchors")
                                ZStack {
                                    Circle().stroke(Color.white.opacity(0.12), lineWidth: 6)
                                    Circle().trim(from: 0, to: all == 0 ? 0 : CGFloat(done) / CGFloat(all)).stroke(Color.wGreen, style: StrokeStyle(lineWidth: 6, lineCap: .round)).rotationEffect(.degrees(-90))
                                    Text(all == 0 ? "—" : "\(done)/\(all)").font(.w(13, .black)).foregroundStyle(Color.wText)
                                }
                                .frame(width: 44, height: 44).frame(maxWidth: .infinity)
                            }
                        }
                    }
                    Link(destination: link("worry")) {
                        Tile {
                            VStack(alignment: .leading, spacing: 3) {
                                Kicker(text: "Worries")
                                Text("\(s.worriesOpen)").font(.w(24, .black)).foregroundStyle(Color.wText)
                                Text(s.worriesOpen == 0 ? "nothing parked" : "parked").font(.w(11, .bold)).foregroundStyle(Color.wMuted)
                            }
                        }
                    }
                    Link(destination: link("sleep")) {
                        Tile {
                            VStack(alignment: .leading, spacing: 3) {
                                Kicker(text: "Sleep")
                                Text(hours(s.sleep.lastMin)).font(.w(20, .black)).foregroundStyle(Color.wText).lineLimit(1).minimumScaleFactor(0.7)
                                Text("last night").font(.w(11, .bold)).foregroundStyle(Color.wMuted)
                            }
                        }
                    }
                }
                .frame(height: 92)
                Link(destination: link("journal")) {
                    HStack(spacing: 8) {
                        Emo("nib", size: 22)
                        VStack(alignment: .leading, spacing: 0) { Kicker(text: "Journal prompt"); Text(s.prompt).font(.w(13, .heavy)).foregroundStyle(Color.wText).lineLimit(1).minimumScaleFactor(0.8) }
                        Spacer(minLength: 0)
                    }
                    .padding(.horizontal, 10).padding(.vertical, 8)
                    .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color.white.opacity(0.08)))
                }
                HStack(spacing: 8) {
                    Link(destination: link("checkin")) { Chunk(fill: .wGreen, lip: .wGreenDark) { Text(s.todayMood == nil ? "Log mood" : "Check in").font(.w(14, .black)).foregroundStyle(Color.wInk) } }
                    Link(destination: link("breathe")) { Chunk(fill: .wBlue, lip: Color(hex: 0x2479cc)) { Text("Breathe").font(.w(14, .black)).foregroundStyle(Color(hex: 0x06203d)) } }
                    Link(destination: link("sos")) { Chunk(fill: .wRed, lip: Color(hex: 0xc73049)) { Text("SOS").font(.w(14, .black)).foregroundStyle(Color(hex: 0x3a0610)) } }.frame(width: 70)
                }
            }
            .containerBackground(for: .widget) { WobbiBg.night }
        } else { NeedsApp() }
    }
}

// MARK: 17 · StandBy night stand

struct NightStandView: View {
    let entry: WobbiEntry
    var body: some View {
        VStack(spacing: 0) {
            Text(entry.date, format: .dateTime.hour().minute()).font(.w(38, .black)).foregroundStyle(Color(hex: 0xff8a5b)).minimumScaleFactor(0.6).lineLimit(1)
            Pal("sleepy", size: 78)
            Text("Tap to wind down").font(.w(11, .bold)).foregroundStyle(Color(hex: 0xa35a3c))
        }
        .containerBackground(for: .widget) { Color.black }
        .widgetURL(link("breathe"))
    }
}
