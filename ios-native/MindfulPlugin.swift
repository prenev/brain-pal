import Foundation
import Capacitor
import HealthKit
import UIKit
import AuthenticationServices
import CryptoKit
import SwiftUI
import FamilyControls
import ManagedSettings
import StoreKit
import AVFoundation

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
        CAPPluginMethod(name: "saveSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "keepAwake", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestSleepAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readSleep", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "webAuth", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "appleSignIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setTabs", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "selectTab", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setTabsHidden", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "screenTimeStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "screenTimeRequestAuth", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "screenTimePickApps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "screenTimeLock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "screenTimeUnlock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "screenTimeClear", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "proProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "proPurchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "proRestore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "proStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "proRedeemCode", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "audioSession", returnType: CAPPluginReturnPromise)
    ]

    // Strong references: both sessions are deallocated (and silently cancel) if nothing holds them.
    private var webSession: ASWebAuthenticationSession?
    private var appleController: ASAuthorizationController?
    private var appleDelegate: AppleDelegate?

    // The real UIKit tab bar. We never style its background: on iOS 26 the system draws it as Liquid Glass by itself.
    private var tabBar: UITabBar?
    private var tabIds: [String] = []
    private let tabDelegate = TabBarDelegate()

    private let store = HKHealthStore()
    private var mindfulType: HKCategoryType? { HKObjectType.categoryType(forIdentifier: .mindfulSession) }
    /// The only thing we ever read from Health: sleep analysis (Apple Watch / iPhone sleep tracking). Only after the person turns it on.
    private var sleepType: HKCategoryType? { HKObjectType.categoryType(forIdentifier: .sleepAnalysis) }

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

    /// Asks for permission to READ sleep (and keeps write access for Mindful Minutes). iOS never tells an app whether *read* access
    /// was granted, so `granted` only means the sheet was handled; an empty result from `readSleep` is how "no access / no data" shows.
    @objc func requestSleepAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(), let sleep = sleepType else { call.resolve(["granted": false]); return }
        var share = Set<HKSampleType>(); if let m = mindfulType { share.insert(m) }
        store.requestAuthorization(toShare: share, read: [sleep]) { success, error in
            if let error = error { call.reject(error.localizedDescription); return }
            call.resolve(["granted": success])
        }
    }

    /// Sleep segments between `from` and `to` (ms since 1970). kind: inBed | asleep | core | deep | rem | awake.
    @objc func readSleep(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(), let sleep = sleepType,
              let fromMs = call.getDouble("from"), let toMs = call.getDouble("to"), toMs > fromMs else {
            call.reject("from and to (ms, to > from) are required"); return
        }
        let predicate = HKQuery.predicateForSamples(withStart: Date(timeIntervalSince1970: fromMs / 1000), end: Date(timeIntervalSince1970: toMs / 1000), options: [])
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        let query = HKSampleQuery(sampleType: sleep, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sort]) { _, samples, error in
            if let error = error { call.reject(error.localizedDescription); return }
            let segments: [[String: Any]] = (samples as? [HKCategorySample] ?? []).compactMap { s in
                // raw values: 0 inBed, 1 asleep (unspecified), 2 awake, 3 core, 4 deep, 5 REM (core/deep/REM need iOS 16+)
                let kind: String
                switch s.value {
                case 0: kind = "inBed"
                case 1: kind = "asleep"
                case 2: kind = "awake"
                case 3: kind = "core"
                case 4: kind = "deep"
                case 5: kind = "rem"
                default: return nil
                }
                return ["start": s.startDate.timeIntervalSince1970 * 1000, "end": s.endDate.timeIntervalSince1970 * 1000, "kind": kind]
            }
            call.resolve(["segments": segments])
        }
        store.execute(query)
    }

    /// Stops the screen auto-locking during a breathing session.
    @objc func keepAwake(_ call: CAPPluginCall) {
        let enabled = call.getBool("enabled") ?? false
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = enabled
            call.resolve()
        }
    }

    private var anchorWindow: ASPresentationAnchor {
        bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    /// Opens `url` in the system web-auth sheet and resolves with the URL it redirects to (callbackScheme://…).
    // MARK: native tab bar

    /// Shows a native UITabBar over the web view. Resolves { native: true, height } (height = points the bar covers, for web padding).
    @objc func setTabs(_ call: CAPPluginCall) {
        var ids: [String] = []
        var items: [UITabBarItem] = []
        for entry in call.getArray("items") ?? [] {
            guard let d = entry as? [String: Any], let id = d["id"] as? String, let title = d["label"] as? String else { continue }
            let image = (d["symbol"] as? String).flatMap { UIImage(systemName: $0) }
            items.append(UITabBarItem(title: title, image: image, tag: ids.count))
            ids.append(id)
        }
        let selected = call.getString("selected")
        DispatchQueue.main.async {
            guard !items.isEmpty, let host = self.bridge?.viewController?.view else { call.resolve(["native": false, "height": 0]); return }
            let bar = self.tabBar ?? UITabBar()
            if bar.superview == nil {
                bar.translatesAutoresizingMaskIntoConstraints = false
                host.addSubview(bar)
                NSLayoutConstraint.activate([
                    bar.leadingAnchor.constraint(equalTo: host.leadingAnchor),
                    bar.trailingAnchor.constraint(equalTo: host.trailingAnchor),
                    bar.bottomAnchor.constraint(equalTo: host.bottomAnchor)
                ])
            }
            self.tabIds = ids
            bar.items = items
            bar.tintColor = UIColor(red: 0.208, green: 0.816, blue: 0.498, alpha: 1)   // the app's accent green
            bar.delegate = self.tabDelegate
            self.tabDelegate.onSelect = { [weak self] index in
                guard let self = self, index >= 0, index < self.tabIds.count else { return }
                self.notifyListeners("tabSelected", data: ["id": self.tabIds[index]])
            }
            if let selected = selected, let index = ids.firstIndex(of: selected) { bar.selectedItem = items[index] }
            bar.isHidden = false
            self.tabBar = bar
            host.layoutIfNeeded()
            call.resolve(["native": true, "height": Double(host.bounds.height - bar.frame.minY)])
        }
    }

    /// Moves the highlight without firing tabSelected (the web side already knows).
    @objc func selectTab(_ call: CAPPluginCall) {
        let id = call.getString("id") ?? ""
        DispatchQueue.main.async {
            if let bar = self.tabBar, let index = self.tabIds.firstIndex(of: id), let items = bar.items, index < items.count { bar.selectedItem = items[index] }
            call.resolve()
        }
    }

    /// Hidden while a sheet / full-screen flow is open, so it never covers the bottom of one.
    @objc func setTabsHidden(_ call: CAPPluginCall) {
        let hidden = call.getBool("hidden") ?? false
        DispatchQueue.main.async {
            self.tabBar?.isHidden = hidden
            call.resolve()
        }
    }

    // MARK: Focus guard (Screen Time)
    // Needs the Family Controls entitlement (`npm run ios:screentime`, see docs/SCREENTIME.md). Without it every call fails softly and
    // the JS side shows "not available in this build". Nothing here reads which apps you use: iOS hands us opaque tokens.

    @objc func screenTimeStatus(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { call.resolve(["available": false, "authorized": false, "appCount": 0]); return }
        let g = ScreenTimeGuard.shared
        g.relockIfExpired()
        var out: [String: Any] = ["available": true, "authorized": g.isAuthorized, "appCount": g.appCount]
        if let until = g.unlockedUntil { out["unlockedUntil"] = until * 1000 }
        call.resolve(out)
    }

    @objc func screenTimeRequestAuth(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { call.resolve(["authorized": false, "error": "Needs iOS 16 or later"]); return }
        Task {
            do {
                try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                call.resolve(["authorized": ScreenTimeGuard.shared.isAuthorized])
            } catch {
                call.resolve(["authorized": false, "error": error.localizedDescription])
            }
        }
    }

    @objc func screenTimePickApps(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { call.resolve(["count": 0]); return }
        DispatchQueue.main.async {
            guard let host = self.bridge?.viewController else { call.resolve(["count": ScreenTimeGuard.shared.appCount]); return }
            var controller: UIViewController?
            let view = GuardPickerView(initial: ScreenTimeGuard.shared.selection) { selection in
                ScreenTimeGuard.shared.selection = selection
                controller?.dismiss(animated: true) { call.resolve(["count": ScreenTimeGuard.shared.appCount]) }
            }
            controller = UIHostingController(rootView: view)
            controller?.modalPresentationStyle = .pageSheet
            host.present(controller!, animated: true)
        }
    }

    @objc func screenTimeLock(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { call.resolve(["locked": false]); return }
        ScreenTimeGuard.shared.lock()
        call.resolve(["locked": true])
    }

    @objc func screenTimeUnlock(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { call.resolve(["until": 0]); return }
        let until = ScreenTimeGuard.shared.unlock(minutes: call.getInt("minutes") ?? 10)
        call.resolve(["until": until * 1000])
    }

    /// Switch the guard off completely (shields removed, nothing scheduled).
    @objc func screenTimeClear(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { call.resolve(); return }
        ScreenTimeGuard.shared.clear()
        call.resolve()
    }

    // MARK: Wobbi Pro (StoreKit 2, auto-renewing monthly subscription)
    // Apple verifies every transaction; we never see card details. Product id must equal PRODUCT_ID in src/lib/pro.ts.
    private static let proId = "com.brainpal.app.pro.monthly"

    public override func load() {
        // Finish transactions that complete outside the app (renewals, Ask to Buy approvals, purchases on another device).
        Task.detached {
            for await update in Transaction.updates {
                if case .verified(let tx) = update { await tx.finish() }
            }
        }
    }

    private func proEntitlementEnd() async -> Date? {
        for await result in Transaction.currentEntitlements {
            if case .verified(let tx) = result, tx.productID == MindfulPlugin.proId, tx.revocationDate == nil {
                if let end = tx.expirationDate, end > Date() { return end }
            }
        }
        return nil
    }
    private func proStatusDict() async -> [String: Any] {
        if let end = await proEntitlementEnd() { return ["active": true, "until": end.timeIntervalSince1970 * 1000] }
        return ["active": false]
    }

    @objc func proProducts(_ call: CAPPluginCall) {
        Task {
            do {
                let products = try await Product.products(for: [MindfulPlugin.proId])
                var out: [[String: Any]] = []
                for p in products {
                    var item: [String: Any] = ["id": p.id, "price": p.displayPrice]
                    if let offer = p.subscription?.introductoryOffer, offer.paymentMode == .freeTrial {
                        let unit = offer.period.unit
                        let days = unit == .day ? offer.period.value : unit == .week ? offer.period.value * 7 : unit == .month ? offer.period.value * 30 : 0
                        if days > 0 { item["trialDays"] = days }
                    }
                    out.append(item)
                }
                call.resolve(["products": out])
            } catch {
                call.resolve(["products": [], "error": error.localizedDescription])
            }
        }
    }

    @objc func proPurchase(_ call: CAPPluginCall) {
        Task {
            do {
                guard let product = try await Product.products(for: [MindfulPlugin.proId]).first else { call.resolve(["status": "unavailable"]); return }
                switch try await product.purchase() {
                case .success(let verification):
                    if case .verified(let tx) = verification {
                        await tx.finish()
                        var out = await self.proStatusDict(); out["status"] = "purchased"; call.resolve(out)
                    } else { call.resolve(["status": "unverified"]) }
                case .pending: call.resolve(["status": "pending"])
                case .userCancelled: call.resolve(["status": "cancelled"])
                @unknown default: call.resolve(["status": "unknown"])
                }
            } catch {
                call.resolve(["status": "failed", "error": error.localizedDescription])
            }
        }
    }

    @objc func proRestore(_ call: CAPPluginCall) {
        Task {
            do { try await AppStore.sync() } catch { /* the entitlement check below still reports what Apple knows */ }
            call.resolve(await self.proStatusDict())
        }
    }

    /// Apple's own "Redeem code" sheet (offer codes for creators, friends, therapists). The entitlement arrives through the usual status check.
    @objc func proRedeemCode(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard #available(iOS 16.0, *), let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene else { call.resolve(["shown": false]); return }
            Task {
                do { try await AppStore.presentOfferCodeRedeemSheet(in: scene); call.resolve(["shown": true]) }
                catch { call.resolve(["shown": false]) }
            }
        }
    }

    /// The system rating prompt. iOS decides whether to show it (and limits it to a few times a year); JS only asks at happy moments.
    @objc func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
                SKStoreReviewController.requestReview(in: scene)
            }
            call.resolve()
        }
    }

    /// Voice-memo playback must come out of the loudspeaker even right after a recording (iOS leaves the session in "record" mode, which routes to the quiet earpiece:
    /// the first play sounded silent). "playback" for memos, "ambient" (follows the silent switch) for our little UI sounds.
    @objc func audioSession(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        do {
            if call.getString("mode") == "playback" { try session.setCategory(.playback, mode: .default, options: []) }
            else { try session.setCategory(.ambient, mode: .default, options: [.mixWithOthers]) }
            try session.setActive(true)
        } catch { /* best effort: playback still works the old way */ }
        call.resolve()
    }

    @objc func proStatus(_ call: CAPPluginCall) {
        Task { call.resolve(await self.proStatusDict()) }
    }

    @objc func webAuth(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"), let url = URL(string: urlString),
              let scheme = call.getString("callbackScheme"), !scheme.isEmpty else {
            call.reject("url and callbackScheme are required"); return
        }
        DispatchQueue.main.async {
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { [weak self] callback, error in
                self?.webSession = nil
                if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin {
                    call.reject("Sign-in cancelled", "CANCELLED"); return
                }
                if let error = error { call.reject(error.localizedDescription); return }
                guard let callback = callback else { call.reject("No callback URL"); return }
                call.resolve(["url": callback.absoluteString])
            }
            let provider = PresentationProvider(anchor: self.anchorWindow)
            session.presentationContextProvider = provider
            objc_setAssociatedObject(session, &PresentationProvider.key, provider, .OBJC_ASSOCIATION_RETAIN)
            self.webSession = session
            if !session.start() { self.webSession = nil; call.reject("Could not start the sign-in sheet") }
        }
    }

    /// Native Sign in with Apple. Returns the identity token plus the raw nonce (Apple got its SHA-256).
    @objc func appleSignIn(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let nonce = Self.randomNonce()
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = Self.sha256(nonce)
            let delegate = AppleDelegate(anchor: self.anchorWindow, nonce: nonce) { [weak self] result in
                self?.appleController = nil; self?.appleDelegate = nil
                switch result {
                case .success(let data): call.resolve(data)
                case .failure(let error):
                    if (error as? ASAuthorizationError)?.code == .canceled { call.reject("Sign-in cancelled", "CANCELLED") }
                    else { call.reject(error.localizedDescription) }
                }
            }
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = delegate
            controller.presentationContextProvider = delegate
            self.appleDelegate = delegate
            self.appleController = controller
            controller.performRequests()
        }
    }

    private static func randomNonce(length: Int = 32) -> String {
        let chars = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._")
        var bytes = [UInt8](repeating: 0, count: length)
        precondition(SecRandomCopyBytes(kSecRandomDefault, length, &bytes) == errSecSuccess, "no randomness")
        return String(bytes.map { chars[Int($0) % chars.count] })
    }

    private static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

private final class PresentationProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    static var key = 0
    let anchor: ASPresentationAnchor
    init(anchor: ASPresentationAnchor) { self.anchor = anchor }
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor { anchor }
}

private final class AppleDelegate: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    let anchor: ASPresentationAnchor
    let nonce: String
    let done: (Result<[String: Any], Error>) -> Void
    init(anchor: ASPresentationAnchor, nonce: String, done: @escaping (Result<[String: Any], Error>) -> Void) {
        self.anchor = anchor; self.nonce = nonce; self.done = done
    }
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor { anchor }
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let cred = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = cred.identityToken, let token = String(data: tokenData, encoding: .utf8) else {
            done(.failure(NSError(domain: "MindfulPlugin", code: 1, userInfo: [NSLocalizedDescriptionKey: "Apple did not return an identity token"]))); return
        }
        var out: [String: Any] = ["idToken": token, "nonce": nonce]
        if let e = cred.email { out["email"] = e }
        if let g = cred.fullName?.givenName { out["givenName"] = g }
        if let f = cred.fullName?.familyName { out["familyName"] = f }
        done(.success(out))
    }
    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) { done(.failure(error)) }
}

final class TabBarDelegate: NSObject, UITabBarDelegate {
    var onSelect: ((Int) -> Void)?
    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) { onSelect?(item.tag) }
}

@available(iOS 16.0, *)
final class ScreenTimeGuard {
    static let shared = ScreenTimeGuard()
    private let store = ManagedSettingsStore()
    private let selectionKey = "bp.screentime.selection"
    private let untilKey = "bp.screentime.until"

    var selection: FamilyActivitySelection {
        get {
            guard let data = UserDefaults.standard.data(forKey: selectionKey),
                  let s = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) else { return FamilyActivitySelection() }
            return s
        }
        set { if let data = try? JSONEncoder().encode(newValue) { UserDefaults.standard.set(data, forKey: selectionKey) } }
    }
    var appCount: Int { selection.applicationTokens.count + selection.categoryTokens.count + selection.webDomainTokens.count }
    var isAuthorized: Bool { AuthorizationCenter.shared.authorizationStatus == .approved }
    /// Seconds since 1970 when the current unlock ends, if one is running.
    var unlockedUntil: Double? {
        let t = UserDefaults.standard.double(forKey: untilKey)
        return t > Date().timeIntervalSince1970 ? t : nil
    }

    func lock() {
        let s = selection
        store.shield.applications = s.applicationTokens.isEmpty ? nil : s.applicationTokens
        store.shield.applicationCategories = s.categoryTokens.isEmpty ? nil : .specific(s.categoryTokens)
        store.shield.webDomains = s.webDomainTokens.isEmpty ? nil : s.webDomainTokens
        UserDefaults.standard.removeObject(forKey: untilKey)
    }
    func unlock(minutes: Int) -> Double {
        store.clearAllSettings()
        let until = Date().addingTimeInterval(Double(max(1, minutes)) * 60).timeIntervalSince1970
        UserDefaults.standard.set(until, forKey: untilKey)
        return until
    }
    func clear() {
        store.clearAllSettings()
        UserDefaults.standard.removeObject(forKey: untilKey)
    }
    /// An unlock that has run out is locked again whenever the app asks (reliable background re-locking needs the optional extension, docs/SCREENTIME.md).
    func relockIfExpired() {
        let t = UserDefaults.standard.double(forKey: untilKey)
        if t > 0 && t <= Date().timeIntervalSince1970 { lock() }
    }
}

@available(iOS 16.0, *)
struct GuardPickerView: View {
    @State var selection: FamilyActivitySelection
    let onDone: (FamilyActivitySelection) -> Void
    init(initial: FamilyActivitySelection, onDone: @escaping (FamilyActivitySelection) -> Void) {
        _selection = State(initialValue: initial)
        self.onDone = onDone
    }
    var body: some View {
        NavigationView {
            FamilyActivityPicker(selection: $selection)
                .navigationTitle("Choose apps to guard")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { onDone(selection) } } }
        }
    }
}
