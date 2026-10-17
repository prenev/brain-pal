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

for f in ['MindfulPlugin.swift', 'MainViewController.swift', 'BrainPalIntents.swift', 'App.entitlements', 'PrivacyInfo.xcprivacy']:
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

# ---- Siri / Shortcuts intents (App Intents) compiled into the app target
INT = {'ref': 'B1A0000000000000000A0008', 'bf': 'B1A0000000000000000A0009'}
p = pbx.read_text()
if INT['ref'] not in p:
    p = p.replace('/* End PBXBuildFile section */', f"\t\t{INT['bf']} /* BrainPalIntents.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {INT['ref']} /* BrainPalIntents.swift */; }};\n/* End PBXBuildFile section */")
    p = p.replace('/* End PBXFileReference section */', f"\t\t{INT['ref']} /* BrainPalIntents.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = BrainPalIntents.swift; sourceTree = \"<group>\"; }};\n/* End PBXFileReference section */")
    p = re.sub(r'(\t\t\t\t[0-9A-F]{24} /\* SceneDelegate\.swift \*/,\n)', r'\1' + f"\t\t\t\t{INT['ref']} /* BrainPalIntents.swift */,\n", p, count=1)
    p = re.sub(r'(\t\t\t\t[0-9A-F]{24} /\* SceneDelegate\.swift in Sources \*/,\n)', r'\1' + f"\t\t\t\t{INT['bf']} /* BrainPalIntents.swift in Sources */,\n", p, count=1)
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

# ---- Widgets: WobbiShared.swift in the app + a WidgetKit extension target (WobbiWidgets) embedded in it
# (home/lock-screen widgets, Live Activity, iOS 18 controls). Sources live in ios-native/Widgets and are copied to ios/App/WobbiWidgets.
shutil.copy(root / 'ios-native' / 'WobbiShared.swift', src / 'WobbiShared.swift')
wdst = app / 'WobbiWidgets'
shutil.rmtree(wdst, ignore_errors=True)
shutil.copytree(root / 'ios-native' / 'Widgets', wdst)
W = {k: f'B1A0000000000000000B{n:04d}' for n, k in enumerate([
    'shared_ref', 'shared_bf_app', 'shared_bf_ext', 'group', 'appex', 'appex_bf',
    'w1_ref', 'w1_bf', 'w2_ref', 'w2_bf', 'w3_ref', 'w3_bf', 'w4_ref', 'w4_bf', 'assets_ref', 'assets_bf', 'plist_ref', 'ent_ref',
    'target', 'sources', 'frameworks', 'resources', 'embed', 'proxy', 'dep', 'cfglist', 'cfg_debug', 'cfg_release'], start=1)}
WSWIFT = ['WobbiWidgets.swift', 'WobbiWidgetViews.swift', 'WobbiLiveActivity.swift', 'WobbiControls.swift']
p = pbx.read_text()
if W['target'] not in p:
    def ref(id_, path, kind): return f'\t\t{id_} /* {path} */ = {{isa = PBXFileReference; lastKnownFileType = {kind}; path = {path}; sourceTree = "<group>"; }};\n'
    refs = ref(W['shared_ref'], 'WobbiShared.swift', 'sourcecode.swift')
    refs += ''.join(ref(W[f'w{i}_ref'], f, 'sourcecode.swift') for i, f in enumerate(WSWIFT, 1))
    refs += ref(W['assets_ref'], 'Assets.xcassets', 'folder.assetcatalog') + ref(W['plist_ref'], 'Info.plist', 'text.plist.xml') + ref(W['ent_ref'], 'WobbiWidgets.entitlements', 'text.plist.entitlements')
    refs += f'\t\t{W["appex"]} /* WobbiWidgets.appex */ = {{isa = PBXFileReference; explicitFileType = "wrapper.app-extension"; includeInIndex = 0; path = WobbiWidgets.appex; sourceTree = BUILT_PRODUCTS_DIR; }};\n'
    p = p.replace('/* End PBXFileReference section */', refs + '/* End PBXFileReference section */')
    bfs = f'\t\t{W["shared_bf_app"]} /* WobbiShared.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {W["shared_ref"]} /* WobbiShared.swift */; }};\n'
    bfs += f'\t\t{W["shared_bf_ext"]} /* WobbiShared.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {W["shared_ref"]} /* WobbiShared.swift */; }};\n'
    bfs += ''.join(f'\t\t{W[f"w{i}_bf"]} /* {f} in Sources */ = {{isa = PBXBuildFile; fileRef = {W[f"w{i}_ref"]} /* {f} */; }};\n' for i, f in enumerate(WSWIFT, 1))
    bfs += f'\t\t{W["assets_bf"]} /* Assets.xcassets in Resources */ = {{isa = PBXBuildFile; fileRef = {W["assets_ref"]} /* Assets.xcassets */; }};\n'
    bfs += f'\t\t{W["appex_bf"]} /* WobbiWidgets.appex in Embed Foundation Extensions */ = {{isa = PBXBuildFile; fileRef = {W["appex"]} /* WobbiWidgets.appex */; settings = {{ATTRIBUTES = (RemoveHeadersOnCopy, ); }}; }};\n'
    p = p.replace('/* End PBXBuildFile section */', bfs + '/* End PBXBuildFile section */')
    # app group: WobbiShared.swift; main group: the WobbiWidgets folder; Products: the .appex
    p = re.sub(r'(\t\t\t\t[0-9A-F]{24} /\* SceneDelegate\.swift \*/,\n)', r'\1' + f'\t\t\t\t{W["shared_ref"]} /* WobbiShared.swift */,\n', p, count=1)
    p = re.sub(r'(\t\t\t\t[0-9A-F]{24} /\* App \*/,\n)(\t\t\t\t[0-9A-F]{24} /\* Products \*/,\n)', r'\1' + f'\t\t\t\t{W["group"]} /* WobbiWidgets */,\n' + r'\2', p, count=1)
    p = re.sub(r'(\t\t\t\t[0-9A-F]{24} /\* App\.app \*/,\n)', r'\1' + f'\t\t\t\t{W["appex"]} /* WobbiWidgets.appex */,\n', p, count=1)
    kids = ''.join(f'\t\t\t\t{W[f"w{i}_ref"]} /* {f} */,\n' for i, f in enumerate(WSWIFT, 1)) + f'\t\t\t\t{W["assets_ref"]} /* Assets.xcassets */,\n\t\t\t\t{W["plist_ref"]} /* Info.plist */,\n\t\t\t\t{W["ent_ref"]} /* WobbiWidgets.entitlements */,\n'
    p = p.replace('/* End PBXGroup section */', f'\t\t{W["group"]} /* WobbiWidgets */ = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n{kids}\t\t\t);\n\t\t\tpath = WobbiWidgets;\n\t\t\tsourceTree = "<group>";\n\t\t}};\n/* End PBXGroup section */')
    # app Sources: WobbiShared.swift
    p = re.sub(r'(\t\t\t\t[0-9A-F]{24} /\* SceneDelegate\.swift in Sources \*/,\n)', r'\1' + f'\t\t\t\t{W["shared_bf_app"]} /* WobbiShared.swift in Sources */,\n', p, count=1)
    # extension build phases
    ext_src = f'\t\t\t\t{W["shared_bf_ext"]} /* WobbiShared.swift in Sources */,\n' + ''.join(f'\t\t\t\t{W[f"w{i}_bf"]} /* {f} in Sources */,\n' for i, f in enumerate(WSWIFT, 1))
    p = p.replace('/* End PBXSourcesBuildPhase section */', f'\t\t{W["sources"]} /* Sources */ = {{\n\t\t\tisa = PBXSourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n{ext_src}\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t}};\n/* End PBXSourcesBuildPhase section */')
    p = p.replace('/* End PBXFrameworksBuildPhase section */', f'\t\t{W["frameworks"]} /* Frameworks */ = {{\n\t\t\tisa = PBXFrameworksBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t}};\n/* End PBXFrameworksBuildPhase section */')
    p = p.replace('/* End PBXResourcesBuildPhase section */', f'\t\t{W["resources"]} /* Resources */ = {{\n\t\t\tisa = PBXResourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n\t\t\t\t{W["assets_bf"]} /* Assets.xcassets in Resources */,\n\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t}};\n/* End PBXResourcesBuildPhase section */')
    # new sections: embed phase (in the app), the dependency, the target
    extra = (f'/* Begin PBXContainerItemProxy section */\n\t\t{W["proxy"]} /* PBXContainerItemProxy */ = {{\n\t\t\tisa = PBXContainerItemProxy;\n\t\t\tcontainerPortal = 504EC2FC1FED79650016851F /* Project object */;\n\t\t\tproxyType = 1;\n\t\t\tremoteGlobalIDString = {W["target"]};\n\t\t\tremoteInfo = WobbiWidgets;\n\t\t}};\n/* End PBXContainerItemProxy section */\n\n'
             f'/* Begin PBXCopyFilesBuildPhase section */\n\t\t{W["embed"]} /* Embed Foundation Extensions */ = {{\n\t\t\tisa = PBXCopyFilesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tdstPath = "";\n\t\t\tdstSubfolderSpec = 13;\n\t\t\tfiles = (\n\t\t\t\t{W["appex_bf"]} /* WobbiWidgets.appex in Embed Foundation Extensions */,\n\t\t\t);\n\t\t\tname = "Embed Foundation Extensions";\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t}};\n/* End PBXCopyFilesBuildPhase section */\n\n'
             f'/* Begin PBXTargetDependency section */\n\t\t{W["dep"]} /* PBXTargetDependency */ = {{\n\t\t\tisa = PBXTargetDependency;\n\t\t\ttarget = {W["target"]} /* WobbiWidgets */;\n\t\t\ttargetProxy = {W["proxy"]} /* PBXContainerItemProxy */;\n\t\t}};\n/* End PBXTargetDependency section */\n\n')
    p = p.replace('/* Begin PBXFileReference section */', extra + '/* Begin PBXFileReference section */')
    target = (f'\t\t{W["target"]} /* WobbiWidgets */ = {{\n\t\t\tisa = PBXNativeTarget;\n\t\t\tbuildConfigurationList = {W["cfglist"]} /* Build configuration list for PBXNativeTarget "WobbiWidgets" */;\n'
              f'\t\t\tbuildPhases = (\n\t\t\t\t{W["sources"]} /* Sources */,\n\t\t\t\t{W["frameworks"]} /* Frameworks */,\n\t\t\t\t{W["resources"]} /* Resources */,\n\t\t\t);\n'
              f'\t\t\tbuildRules = (\n\t\t\t);\n\t\t\tdependencies = (\n\t\t\t);\n\t\t\tname = WobbiWidgets;\n\t\t\tproductName = WobbiWidgets;\n'
              f'\t\t\tproductReference = {W["appex"]} /* WobbiWidgets.appex */;\n\t\t\tproductType = "com.apple.product-type.app-extension";\n\t\t}};\n')
    p = p.replace('/* End PBXNativeTarget section */', target + '/* End PBXNativeTarget section */')
    # the app embeds + depends on the extension
    p = re.sub(r'(\t\t\t\t504EC3021FED79650016851F /\* Resources \*/,\n)', r'\1' + f'\t\t\t\t{W["embed"]} /* Embed Foundation Extensions */,\n', p, count=1)
    p = re.sub(r'(name = App;\n\t\t\tpackageProductDependencies)', r'name = App;\n\t\t\tpackageProductDependencies', p)
    p = re.sub(r'(isa = PBXNativeTarget;\n\t\t\tbuildConfigurationList = 504EC3161FED79650016851F[^\n]*\n(?:.*\n)*?\t\t\tdependencies = \(\n)', r'\1' + f'\t\t\t\t{W["dep"]} /* PBXTargetDependency */,\n', p, count=1)
    p = re.sub(r'(\t\t\ttargets = \(\n\t\t\t\t504EC3031FED79650016851F /\* App \*/,\n)', r'\1' + f'\t\t\t\t{W["target"]} /* WobbiWidgets */,\n', p, count=1)
    def cfg(id_, name, debug):
        cond = 'SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;\n' if debug else ''
        return (f'\t\t{id_} /* {name} */ = {{\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = {{\n'
                '\t\t\t\tAPPLICATION_EXTENSION_API_ONLY = YES;\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = WobbiWidgets/WobbiWidgets.entitlements;\n\t\t\t\tCODE_SIGN_STYLE = Automatic;\n'
                '\t\t\t\tCURRENT_PROJECT_VERSION = 1;\n\t\t\t\tDEVELOPMENT_TEAM = ZY687MSU74;\n\t\t\t\tINFOPLIST_FILE = WobbiWidgets/Info.plist;\n\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;\n'
                '\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (\n\t\t\t\t\t"$(inherited)",\n\t\t\t\t\t"@executable_path/Frameworks",\n\t\t\t\t\t"@executable_path/../../Frameworks",\n\t\t\t\t);\n'
                '\t\t\t\tMARKETING_VERSION = 1.0.0;\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.brainpal.app.widgets;\n\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";\n\t\t\t\tSKIP_INSTALL = YES;\n'
                f'\t\t\t\t{cond}\t\t\t\tSWIFT_VERSION = 5.0;\n\t\t\t\tTARGETED_DEVICE_FAMILY = 1;\n\t\t\t}};\n\t\t\tname = {name};\n\t\t}};\n')
    p = p.replace('/* End XCBuildConfiguration section */', cfg(W['cfg_debug'], 'Debug', True) + cfg(W['cfg_release'], 'Release', False) + '/* End XCBuildConfiguration section */')
    p = p.replace('/* End XCConfigurationList section */', f'\t\t{W["cfglist"]} /* Build configuration list for PBXNativeTarget "WobbiWidgets" */ = {{\n\t\t\tisa = XCConfigurationList;\n\t\t\tbuildConfigurations = (\n\t\t\t\t{W["cfg_debug"]} /* Debug */,\n\t\t\t\t{W["cfg_release"]} /* Release */,\n\t\t\t);\n\t\t\tdefaultConfigurationIsVisible = 0;\n\t\t\tdefaultConfigurationName = Release;\n\t\t}};\n/* End XCConfigurationList section */')
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
t = add_key(t, 'NSMicrophoneUsageDescription', '<string>Wobbi uses the microphone to record voice memos for your entries.</string>')
t = add_key(t, 'NSSpeechRecognitionUsageDescription', '<string>Wobbi turns what you say into text on your phone, never online, while you record a voice journal.</string>')
t = add_key(t, 'NSCameraUsageDescription', '<string>Wobbi uses the camera so you can attach photos to your entries.</string>')
t = add_key(t, 'NSPhotoLibraryUsageDescription', '<string>Wobbi lets you attach photos from your library to your entries.</string>')
t = add_key(t, 'NSHealthUpdateUsageDescription', '<string>Wobbi saves your breathing sessions to Apple Health as Mindful Minutes.</string>')
HEALTH_SHARE = '<string>Wobbi can read your sleep from Apple Health (for example from your Apple Watch) to show it next to your mood. It reads nothing else and never sends it anywhere.</string>'
t = add_key(t, 'NSHealthShareUsageDescription', HEALTH_SHARE)
t = re.sub(r'(<key>NSHealthShareUsageDescription</key>\s*)<string>[^<]*</string>', lambda m: m.group(1) + HEALTH_SHARE, t)   # existing projects get the honest wording too
t = add_key(t, 'CFBundleURLTypes', '<array><dict><key>CFBundleURLName</key><string>com.brainpal.app</string><key>CFBundleURLSchemes</key><array><string>brainpal</string></array></dict></array>')
# iPhone: portrait only (the UI is designed for it); iPad keeps all orientations
t = re.sub(r'(<key>UISupportedInterfaceOrientations</key>\s*<array>)(.*?)(</array>)',
           r'\1\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t\3', t, count=1, flags=re.S)
# App Store: no non-exempt encryption (only OS-provided HTTPS), 64-bit devices, the app is dark-themed
t = add_key(t, 'ITSAppUsesNonExemptEncryption', '<false/>')
t = add_key(t, 'UIUserInterfaceStyle', '<string>Dark</string>')
t = add_key(t, 'NSSupportsLiveActivities', '<true/>')   # breathing / focus countdown on the lock screen
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
# ---- optional: Focus guard capability (Screen Time / Family Controls). Development builds can use it; the App Store needs Apple's approval first.
if '--screentime' in sys.argv:
    ent = src / 'App.entitlements'
    t = ent.read_text()
    if 'family-controls' not in t:
        t = t.replace('</dict>', '\t<key>com.apple.developer.family-controls</key>\n\t<true/>\n</dict>')
        ent.write_text(t)
    print('Family Controls (Screen Time) entitlement added')
print('ios project patched')
