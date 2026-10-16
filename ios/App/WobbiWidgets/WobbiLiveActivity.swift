import ActivityKit
import WidgetKit
import SwiftUI

/// Breathing / focus countdown on the lock screen and in the Dynamic Island. Started by the app
/// (MindfulPlugin.liveActivityStart); the clock is drawn by the system, so it keeps running while the app sleeps.
struct WobbiLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WobbiActivityAttributes.self) { ctx in
            LockScreenActivity(kind: ctx.attributes.kind, state: ctx.state)
                .activityBackgroundTint(Color(hex: 0x0e1726, opacity: 0.92))
                .activitySystemActionForegroundColor(Color.wText)
                .widgetURL(link(ctx.attributes.kind == "focus" ? "checkin" : "breathe"))
        } dynamicIsland: { ctx in
            let s = ctx.state, focus = ctx.attributes.kind == "focus", tint = focus ? Color.wOrange : Color.wGreen
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) { Pal(focus ? "think" : "breatheIn", size: 52).padding(.leading, 4) }
                DynamicIslandExpandedRegion(.trailing) { Clock(state: s).font(.w(24, .black)).foregroundStyle(tint).frame(maxWidth: 90, alignment: .trailing).padding(.trailing, 4) }
                DynamicIslandExpandedRegion(.center) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(s.title).font(.w(16, .black)).lineLimit(1)
                        Text(s.subtitle).font(.w(12, .semibold)).foregroundStyle(Color.wMuted).lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                DynamicIslandExpandedRegion(.bottom) { Progress(state: s, tint: tint).padding(.horizontal, 8) }
            } compactLeading: {
                Image(systemName: focus ? "scope" : "wind").foregroundStyle(tint)
            } compactTrailing: {
                Clock(state: s).font(.w(14, .heavy)).foregroundStyle(tint).frame(maxWidth: 52)
            } minimal: {
                Image(systemName: focus ? "scope" : "wind").foregroundStyle(tint)
            }
        }
    }
}

private struct Clock: View {
    let state: WobbiActivityAttributes.ContentState
    var body: some View {
        if let p = state.pausedRemaining {
            Text(String(format: "%d:%02d", Int(p) / 60, Int(p) % 60)).monospacedDigit()
        } else {
            Text(timerInterval: state.startsAt...state.endsAt, countsDown: true).monospacedDigit().multilineTextAlignment(.trailing)
        }
    }
}

private struct Progress: View {
    let state: WobbiActivityAttributes.ContentState
    let tint: Color
    var body: some View {
        if let p = state.pausedRemaining {
            let total = max(state.endsAt.timeIntervalSince(state.startsAt), 1)
            ProgressView(value: max(0, min(1, 1 - p / total))).tint(tint)
        } else {
            ProgressView(timerInterval: state.startsAt...state.endsAt, countsDown: false) { EmptyView() } currentValueLabel: { EmptyView() }.tint(tint)
        }
    }
}

private struct LockScreenActivity: View {
    let kind: String
    let state: WobbiActivityAttributes.ContentState
    var body: some View {
        let focus = kind == "focus", tint = focus ? Color.wOrange : Color.wGreen
        HStack(spacing: 12) {
            Pal(focus ? "think" : (state.pausedRemaining == nil ? "breatheOut" : "idle"), size: 64)
            VStack(alignment: .leading, spacing: 3) {
                Kicker(text: focus ? "Focus · one small step" : "Breathing")
                Text(state.title).font(.w(19, .black)).foregroundStyle(Color.wText).lineLimit(1)
                Text(state.pausedRemaining == nil ? state.subtitle : "Paused — take your time").font(.w(12, .semibold)).foregroundStyle(Color.wMuted).lineLimit(1)
                Progress(state: state, tint: tint).padding(.top, 2)
            }
            Clock(state: state).font(.w(26, .black)).foregroundStyle(tint).frame(width: 82, alignment: .trailing)
        }
        .padding(16)
    }
}
