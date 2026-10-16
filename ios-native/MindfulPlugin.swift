import Foundation
import Capacitor
import HealthKit
import UIKit
import AuthenticationServices
import CryptoKit

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
        CAPPluginMethod(name: "appleSignIn", returnType: CAPPluginReturnPromise)
    ]

    // Strong references: both sessions are deallocated (and silently cancel) if nothing holds them.
    private var webSession: ASWebAuthenticationSession?
    private var appleController: ASAuthorizationController?
    private var appleDelegate: AppleDelegate?

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
