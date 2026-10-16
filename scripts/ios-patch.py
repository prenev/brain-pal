#!/usr/bin/env python3
"""Idempotently wires our native code into the Capacitor-generated Xcode project (ios/).
Run after `npx cap add ios`:  python3 scripts/ios-patch.py
Adds: MindfulPlugin.swift + MainViewController.swift (HealthKit write plugin), HealthKit entitlements,
permission strings + brainpal:// URL scheme in Info.plist, portrait-only on iPhone, and swaps the root view controller."""
import re, shutil, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
app = root / 'ios' / 'App'
src = app / 'App'
pbx = app / 'App.xcodeproj' / 'project.pbxproj'
if not pbx.exists():
    sys.exit('ios/ not found - run `npx cap add ios` first')

for f in ['MindfulPlugin.swift', 'MainViewController.swift', 'App.entitlements', 'PrivacyInfo.xcprivacy']:
    shutil.copy(root / 'ios-native' / f, src / f)

# ---- project.pbxproj: file refs, build files, group, sources phase, entitlements setting
p = pbx.read_text()
ID = {'mind_ref': 'B1A0000000000000000A0001', 'mind_bf': 'B1A0000000000000000A0002',
      'main_ref': 'B1A0000000000000000A0003', 'main_bf': 'B1A0000000000000000A0004', 'ent_ref': 'B1A0000000000000000A0005'}
if ID['mind_ref'] not in p:
    p = p.replace('/* End PBXBuildFile section */',
        f"\t\t{ID['mind_bf']} /* MindfulPlugin.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {ID['mind_ref']} /* MindfulPlugin.swift */; }};\n"
        f"\t\t{ID['main_bf']} /* MainViewController.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {ID['main_ref']} /* MainViewController.swift */; }};\n"
        '/* End PBXBuildFile section */')
    p = p.replace('/* End PBXFileReference section */',
        f"\t\t{ID['mind_ref']} /* MindfulPlugin.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = MindfulPlugin.swift; sourceTree = \"<group>\"; }};\n"
        f"\t\t{ID['main_ref']} /* MainViewController.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = MainViewController.swift; sourceTree = \"<group>\"; }};\n"
        f"\t\t{ID['ent_ref']} /* App.entitlements */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.entitlements; path = App.entitlements; sourceTree = \"<group>\"; }};\n"
        '/* End PBXFileReference section */')
    # group "App": add after SceneDelegate.swift entry
    p = re.sub(r'(\t\t\t\t[0-9A-F]{24} /\* SceneDelegate\.swift \*/,\n)',
               r'\1' + f"\t\t\t\t{ID['mind_ref']} /* MindfulPlugin.swift */,\n\t\t\t\t{ID['main_ref']} /* MainViewController.swift */,\n\t\t\t\t{ID['ent_ref']} /* App.entitlements */,\n", p, count=1)
    # sources build phase: add after SceneDelegate in Sources
    p = re.sub(r'(\t\t\t\t[0-9A-F]{24} /\* SceneDelegate\.swift in Sources \*/,\n)',
               r'\1' + f"\t\t\t\t{ID['mind_bf']} /* MindfulPlugin.swift in Sources */,\n\t\t\t\t{ID['main_bf']} /* MainViewController.swift in Sources */,\n", p, count=1)
if 'CODE_SIGN_ENTITLEMENTS' not in p:
    p = p.replace('\t\t\t\tCODE_SIGN_STYLE = Automatic;\n', '\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n\t\t\t\tCODE_SIGN_STYLE = Automatic;\n')
pbx.write_text(p)

# ---- App Store hygiene: privacy manifest as a bundled resource, iPhone-only, version 1.0.0
PRIV = {'ref': 'B1A0000000000000000A0006', 'bf': 'B1A0000000000000000A0007'}
p = pbx.read_text()
if PRIV['ref'] not in p:
    p = p.replace('/* End PBXBuildFile section */', f"\t\t{PRIV['bf']} /* PrivacyInfo.xcprivacy in Resources */ = {{isa = PBXBuildFile; fileRef = {PRIV['ref']} /* PrivacyInfo.xcprivacy */; }};\n/* End PBXBuildFile section */")
    p = p.replace('/* End PBXFileReference section */', f"\t\t{PRIV['ref']} /* PrivacyInfo.xcprivacy */ = {{isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = \"<group>\"; }};\n/* End PBXFileReference section */")
    p = re.sub(r'(\t\t\t\t[0-9A-F]{24} /\* SceneDelegate\.swift \*/,\n)', r'\1' + f"\t\t\t\t{PRIV['ref']} /* PrivacyInfo.xcprivacy */,\n", p, count=1)
    p = re.sub(r'(isa = PBXResourcesBuildPhase;.*?files = \(\n)', r'\1' + f"\t\t\t\t{PRIV['bf']} /* PrivacyInfo.xcprivacy in Resources */,\n", p, count=1, flags=re.S)
p = p.replace('TARGETED_DEVICE_FAMILY = "1,2";', 'TARGETED_DEVICE_FAMILY = 1;').replace('MARKETING_VERSION = 1.0;', 'MARKETING_VERSION = 1.0.0;')
pbx.write_text(p)

# ---- SceneDelegate: use our view controller
sd = src / 'SceneDelegate.swift'
t = sd.read_text()
sd.write_text(t.replace('window?.rootViewController = CAPBridgeViewController()', 'window?.rootViewController = MainViewController()'))

# ---- Info.plist
ip = src / 'Info.plist'
t = ip.read_text()
def add_key(t, key, xml):
    return t if f'<key>{key}</key>' in t else t.replace('</dict>\n</plist>', f'\t<key>{key}</key>\n\t{xml}\n</dict>\n</plist>')
t = add_key(t, 'NSMicrophoneUsageDescription', '<string>Brain Pal uses the microphone to record voice memos for your entries.</string>')
t = add_key(t, 'NSCameraUsageDescription', '<string>Brain Pal uses the camera so you can attach photos to your entries.</string>')
t = add_key(t, 'NSPhotoLibraryUsageDescription', '<string>Brain Pal lets you attach photos from your library to your entries.</string>')
t = add_key(t, 'NSHealthUpdateUsageDescription', '<string>Brain Pal saves your breathing sessions to Apple Health as Mindful Minutes.</string>')
HEALTH_SHARE = '<string>Brain Pal can read your sleep from Apple Health (for example from your Apple Watch) to show it next to your mood. It reads nothing else and never sends it anywhere.</string>'
t = add_key(t, 'NSHealthShareUsageDescription', HEALTH_SHARE)
t = re.sub(r'(<key>NSHealthShareUsageDescription</key>\s*)<string>[^<]*</string>', lambda m: m.group(1) + HEALTH_SHARE, t)   # existing projects get the honest wording too
t = add_key(t, 'CFBundleURLTypes', '<array><dict><key>CFBundleURLName</key><string>com.brainpal.app</string><key>CFBundleURLSchemes</key><array><string>brainpal</string></array></dict></array>')
# iPhone: portrait only (the UI is designed for it); iPad keeps all orientations
t = re.sub(r'(<key>UISupportedInterfaceOrientations</key>\s*<array>)(.*?)(</array>)',
           r'\1\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t\3', t, count=1, flags=re.S)
# App Store: no non-exempt encryption (only OS-provided HTTPS), 64-bit devices, the app is dark-themed
t = add_key(t, 'ITSAppUsesNonExemptEncryption', '<false/>')
t = add_key(t, 'UIUserInterfaceStyle', '<string>Dark</string>')
t = t.replace('<string>armv7</string>', '<string>arm64</string>')
ip.write_text(t)
# ---- optional: Sign in with Apple capability (needs a paid Apple Developer account; free Personal Teams reject it)
if '--apple-signin' in sys.argv:
    ent = src / 'App.entitlements'
    t = ent.read_text()
    if 'applesignin' not in t:
        t = t.replace('</dict>', '\t<key>com.apple.developer.applesignin</key>\n\t<array><string>Default</string></array>\n</dict>')
        ent.write_text(t)
    print('Sign in with Apple entitlement added')
print('ios project patched')
