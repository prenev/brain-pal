import Foundation
import Capacitor
import HealthKit

/// Saves breathing / grounding sessions to Apple Health as "Mindful Minutes" (HKCategoryType .mindfulSession).
/// JS name: "Mindful"  (see src/lib/native.ts). Write-only: we never read your health data.
@objc(MindfulPlugin)
public class MindfulPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MindfulPlugin"
    public let jsName = "Mindful"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authorizationStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveSession", returnType: CAPPluginReturnPromise)
    ]

    private let store = HKHealthStore()
    private var mindfulType: HKCategoryType? { HKObjectType.categoryType(forIdentifier: .mindfulSession) }

    private func statusString(_ type: HKCategoryType) -> String {
        switch store.authorizationStatus(for: type) {
        case .sharingAuthorized: return "authorized"
        case .sharingDenied: return "denied"
        default: return "notDetermined"
        }
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func authorizationStatus(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(), let type = mindfulType else {
            call.resolve(["status": "unavailable"]); return
        }
        call.resolve(["status": statusString(type)])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(), let type = mindfulType else {
            call.resolve(["granted": false]); return
        }
        store.requestAuthorization(toShare: [type], read: []) { [weak self] _, error in
            if let error = error { call.reject(error.localizedDescription); return }
            // `success` only means the sheet was shown; the real answer is the per-type share status.
            let granted = self.map { $0.store.authorizationStatus(for: type) == .sharingAuthorized } ?? false
            call.resolve(["granted": granted])
        }
    }

    /// start / end are milliseconds since 1970.
    @objc func saveSession(_ call: CAPPluginCall) {
        guard let type = mindfulType,
              let startMs = call.getDouble("start"),
              let endMs = call.getDouble("end"),
              endMs > startMs else {
            call.reject("start and end (ms, end > start) are required"); return
        }
        guard store.authorizationStatus(for: type) == .sharingAuthorized else {
            call.reject("Apple Health access has not been granted"); return
        }
        let sample = HKCategorySample(
            type: type,
            value: HKCategoryValue.notApplicable.rawValue,
            start: Date(timeIntervalSince1970: startMs / 1000),
            end: Date(timeIntervalSince1970: endMs / 1000)
        )
        store.save(sample) { _, error in
            if let error = error { call.reject(error.localizedDescription) } else { call.resolve() }
        }
    }
}
