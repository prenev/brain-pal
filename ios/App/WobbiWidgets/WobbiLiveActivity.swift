import ActivityKit
import WidgetKit
import SwiftUI

/// Breathing / focus countdown on the lock screen and in the Dynamic Island. Started by the app
/// (MindfulPlugin.liveActivityStart); the clock is drawn by the system, so it keeps running while the app sleeps.
/// A pomodoro also hands over the phases that follow (`next`), and the view shows whichever one is on the clock.
struct WobbiLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WobbiActivityAttributes.self) { ctx in
            let now = Now(kind: ctx.attributes.kind, state: ctx.state)
            LockScreenActivity(now: now)
                .activityBackgroundTint(Color(hex: 0x0e1726, opacity: 0.92))
                .activitySystemActionForegroundColor(Color.wText)
                .widgetURL(link(now.focus ? "focus" : "breathe"))
        } dynamicIsland: { ctx in
            let now = Now(kind: ctx.attributes.kind, state: ctx.state)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) { Pal(now.pose, size: 52).padding(.leading, 4) }
                DynamicIslandExpandedRegion(.trailing) { Clock(now: now).font(.w(24, .black)).foregroundStyle(now.tint).frame(maxWidth: 90, alignment: .trailing).padding(.trailing, 4) }
                DynamicIslandExpandedRegion(.center) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(now.title).font(.w(16, .black)).lineLimit(1)
                        Text(now.subtitle).font(.w(12, .semibold)).foregroundStyle(Color.wMuted).lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                DynamicIslandExpandedRegion(.bottom) { Progress(now: now).padding(.horizontal, 8) }
            } compactLeading: {
                Image(systemName: now.symbol).foregroundStyle(now.tint)
            } compactTrailing: {
                Clock(now: now).font(.w(14, .heavy)).foregroundStyle(now.tint).frame(maxWidth: 52)
            } minimal: {
                Image(systemName: now.symbol).foregroundStyle(now.tint)
            }
            .widgetURL(link(now.focus ? "focus" : "breathe"))
        }
    }
}

/// The phase on the clock at the moment iOS draws the activity.
private struct Now {
    let focus: Bool, title: String, subtitle: String, phase: String?, startsAt: Date, endsAt: Date, paused: Double?
    init(kind: String, state s: WobbiActivityAttributes.ContentState, at date: Date = Date()) {
        focus = kind == "focus"
        paused = s.pausedRemaining
        var seg: WobbiActivityAttributes.Segment? = nil
        if s.pausedRemaining == nil, s.endsAt <= date, let list = s.next, !list.isEmpty {
            seg = list.first(where: { $0.endsAt > date }) ?? list.last
        }
        title = seg?.title ?? s.title; subtitle = seg?.subtitle ?? s.subtitle; phase = seg?.phase ?? s.phase
        startsAt = seg?.startsAt ?? s.startsAt; endsAt = seg?.endsAt ?? s.endsAt
    }
    var tint: Color {
        guard focus else { return .wGreen }
        switch phase { case "short": return .wBlue; case "long": return Color(hex: 0xa78bfa); default: return .wGreen }
    }
    var pose: String {
        guard focus else { return paused == nil ? "breatheOut" : "idle" }
        if paused != nil { return "think" }
        switch phase { case "short": return "coffee"; case "long": return "nap"; default: return "focus" }
    }
    var symbol: String { focus ? (phase == "short" || phase == "long" ? "cup.and.saucer.fill" : "timer") : "wind" }
    var kicker: String { focus ? (phase == "short" || phase == "long" ? "Pomodoro · break" : "Pomodoro · focus") : "Breathing" }
}

private struct Clock: View {
    let now: Now
    var body: some View {
        if let p = now.paused {
            Text(String(format: "%d:%02d", Int(p) / 60, Int(p) % 60)).monospacedDigit()
        } else {
            Text(timerInterval: now.startsAt...now.endsAt, countsDown: true).monospacedDigit().multilineTextAlignment(.trailing)
        }
    }
}

private struct Progress: View {
    let now: Now
    var body: some View {
        if let p = now.paused {
            let total = max(now.endsAt.timeIntervalSince(now.startsAt), 1)
            ProgressView(value: max(0, min(1, 1 - p / total))).tint(now.tint)
        } else {
            ProgressView(timerInterval: now.startsAt...now.endsAt, countsDown: false) { EmptyView() } currentValueLabel: { EmptyView() }.tint(now.tint)
        }
    }
}

private struct LockScreenActivity: View {
    let now: Now
    var body: some View {
        HStack(spacing: 12) {
            Pal(now.pose, size: 64)
            VStack(alignment: .leading, spacing: 3) {
                Kicker(text: now.kicker)
                Text(now.title).font(.w(19, .black)).foregroundStyle(Color.wText).lineLimit(1)
                Text(now.paused == nil ? now.subtitle : "Paused — take your time").font(.w(12, .semibold)).foregroundStyle(Color.wMuted).lineLimit(1)
                Progress(now: now).padding(.top, 2)
            }
            Clock(now: now).font(.w(26, .black)).foregroundStyle(now.tint).frame(width: 82, alignment: .trailing)
        }
        .padding(16)
    }
}
