import path from 'node:path';
import fs from 'fs-extra';
import xcode from 'xcode';

async function edit(file: string, transform: (source: string) => string): Promise<void> {
  if (!(await fs.pathExists(file))) return;
  const source = await fs.readFile(file, 'utf8');
  const next = transform(source);
  if (next !== source) await fs.writeFile(file, next, 'utf8');
}

/** `publicKeyPkcs1`: the project's OTA public key (PKCS#1 DER, base64) – see otaKeys.ts. */
export function getOTAManagerSwiftSource(publicKeyPkcs1: string): string {
  return `import Foundation
import CryptoKit
import Security
import Network
import UIKit
import CoreText
import React

private let kOTAPublicKeyBase64 = "${publicKeyPkcs1}"

private let kOTABundleDirName       = "ota_bundle"
private let kMetadataFileName       = "ota_metadata.plist"
private let kCrashSentinelName      = "crash_sentinel"
private let kJSBundleFileName       = "main.jsbundle"
private let kWiFiWarningThreshold   = 80 * 1024 * 1024  // 80 MB
private let kMinFreeStorageRequired = 512 * 1024 * 1024 // 512 MB

@objc(OTAManager)
public class OTAManager: NSObject {

    private static var documentsDirectory: String {
        NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true).first!
    }

    @objc public static var otaBundleDirectory: String {
        (documentsDirectory as NSString).appendingPathComponent(kOTABundleDirName)
    }

    static var metadataFilePath: String {
        (otaBundleDirectory as NSString).appendingPathComponent(kMetadataFileName)
    }

    private static var crashSentinelPath: String {
        (otaBundleDirectory as NSString).appendingPathComponent(kCrashSentinelName)
    }

    private static var cachedBundleURL: URL?

    @objc public static func resolvedBundleURL() -> URL {
        if let cached = cachedBundleURL {
            return cached
        }

        if crashSentinelExists() {
            NSLog("[OTA] Crash sentinel found — previous OTA bundle failed. Rolling back.")
            clearOTABundleAndRollback()
        }

        let otaBundlePath = (otaBundleDirectory as NSString).appendingPathComponent(kJSBundleFileName)
        let resolved: URL

        if FileManager.default.fileExists(atPath: otaBundlePath) {
            writeCrashSentinel()
            NSLog("[OTA] Loading OTA bundle: %@", otaBundlePath)
            resolved = URL(fileURLWithPath: otaBundlePath)
        } else {
            NSLog("[OTA] No OTA bundle on disk — loading embedded bundle.")
            resolved = Bundle.main.url(forResource: "main", withExtension: "jsbundle")
                ?? URL(fileURLWithPath: Bundle.main.bundlePath)
        }

        cachedBundleURL = resolved
        return resolved
    }

    @objc public static func registerOTAFonts() {
        let fontsDir = (otaBundleDirectory as NSString).appendingPathComponent("assets/fonts")
        guard let files = try? FileManager.default.contentsOfDirectory(atPath: fontsDir) else { return }

        for file in files {
            let lower = file.lowercased()
            guard lower.hasSuffix(".ttf") || lower.hasSuffix(".otf") else { continue }
            let fontURL = URL(fileURLWithPath: (fontsDir as NSString).appendingPathComponent(file))
            CTFontManagerRegisterFontsForURL(fontURL as CFURL, .process, nil)
        }
    }

    public static func writeCrashSentinel() {
        createOTADirectoryIfNeeded()
        try? "1".write(toFile: crashSentinelPath, atomically: true, encoding: .utf8)
    }

    public static func crashSentinelExists() -> Bool {
        FileManager.default.fileExists(atPath: crashSentinelPath)
    }

    public static func deleteCrashSentinel() {
        try? FileManager.default.removeItem(atPath: crashSentinelPath)
    }

    public static func clearOTABundleAndRollback() {
        cachedBundleURL = nil
        var prevMeta = readMetadata()
        try? FileManager.default.removeItem(atPath: otaBundleDirectory)

        if var meta = prevMeta {
            meta["status"] = "rolled_back"
            meta["rolled_back_at"] = ISO8601DateFormatter().string(from: Date())
            writeMetadata(meta)
        }
        NSLog("[OTA] Rollback complete — embedded bundle loads on next cold start.")
    }

    public static func readMetadata() -> [String: Any]? {
        NSDictionary(contentsOfFile: metadataFilePath) as? [String: Any]
    }

    public static func writeMetadata(_ metadata: [String: Any]) {
        createOTADirectoryIfNeeded()
        (metadata as NSDictionary).write(toFile: metadataFilePath, atomically: true)
    }

    static func sha256(forFileAt path: String) -> String? {
        guard let handle = FileHandle(forReadingAtPath: path) else { return nil }
        defer { handle.closeFile() }

        var hasher = SHA256()
        while true {
            let chunk = handle.readData(ofLength: 65_536)
            guard !chunk.isEmpty else { break }
            hasher.update(data: chunk)
        }
        return hasher.finalize().map { String(format: "%02x", $0) }.joined()
    }

    static func verifySignature(_ signatureBase64: String, forFileAt path: String) -> Bool {
        guard let handle = FileHandle(forReadingAtPath: path) else { return false }
        defer { handle.closeFile() }

        var hasher = SHA256()
        while true {
            let chunk = handle.readData(ofLength: 65_536)
            guard !chunk.isEmpty else { break }
            hasher.update(data: chunk)
        }
        let digest = Data(hasher.finalize())

        guard let signature = Data(base64Encoded: signatureBase64, options: .ignoreUnknownCharacters) else {
            return false
        }

        guard let publicKeyData = Data(base64Encoded: kOTAPublicKeyBase64, options: .ignoreUnknownCharacters) else {
            return false
        }

        var cfError: Unmanaged<CFError>?
        let keyDict: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeRSA,
            kSecAttrKeyClass as String: kSecAttrKeyClassPublic,
            kSecAttrKeySizeInBits as String: 2048,
        ]
        guard let secKey = SecKeyCreateWithData(publicKeyData as CFData, keyDict as CFDictionary, &cfError) else {
            return false
        }

        return SecKeyVerifySignature(secKey, .rsaSignatureDigestPKCS1v15SHA256, digest as CFData, signature as CFData, &cfError)
    }

    public static var availableStorageBytes: Int {
        let attrs = try? FileManager.default.attributesOfFileSystem(forPath: documentsDirectory)
        return (attrs?[.systemFreeSize] as? Int) ?? 0
    }

    private static func createOTADirectoryIfNeeded() {
        try? FileManager.default.createDirectory(atPath: otaBundleDirectory, withIntermediateDirectories: true)
    }

    @objc public func markSuccessfulLaunch() {
        OTAManager.deleteCrashSentinel()
        NSLog("[OTA] markSuccessfulLaunch — OTA bundle confirmed stable.")
    }

    @objc public func getCurrentMetadata(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let meta: [String: Any] = OTAManager.readMetadata() ?? [
            "ota_version": 0,
            "status": "no_ota",
            "native_version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"
        ]
        resolve(meta)
    }

    @objc public func getDeviceId(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        resolve(UIDevice.current.identifierForVendor?.uuidString ?? "unknown")
    }

    @objc public func getNetworkType(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let monitor = NWPathMonitor()
        var resolved = false

        monitor.pathUpdateHandler = { path in
            guard !resolved else { return }
            resolved = true

            let type: String
            if path.status != .satisfied {
                type = "none"
            } else if path.usesInterfaceType(.wifi) {
                type = "wifi"
            } else {
                type = "cellular"
            }

            resolve(type)
            monitor.cancel()
        }
        monitor.start(queue: .global())
    }

    @objc public func getWiFiWarningThreshold(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        resolve(kWiFiWarningThreshold)
    }

    @objc public func getAvailableStorage(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        resolve(OTAManager.availableStorageBytes)
    }

    @objc public func verifySHA256(
        _ filePath: String,
        expectedHash: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.global().async {
            guard let actual = OTAManager.sha256(forFileAt: filePath) else {
                reject("FILE_READ_ERROR", "Cannot read file for SHA-256 verification", nil)
                return
            }
            if actual.lowercased() == expectedHash.lowercased() {
                resolve(true)
            } else {
                reject("SHA256_MISMATCH", "SHA-256 mismatch. Expected: \\(expectedHash) Got: \\(actual)", nil)
            }
        }
    }

    @objc public func verifyBundleSignature(
        _ filePath: String,
        signature: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.global().async {
            if OTAManager.verifySignature(signature, forFileAt: filePath) {
                resolve(true)
            } else {
                reject("SIGNATURE_INVALID", "Bundle signature verification failed", nil)
            }
        }
    }

    @objc public func commitMetadata(
        _ metadata: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let dict = metadata as? [String: Any] else {
            reject("INVALID_METADATA", "metadata must be a plain object", nil)
            return
        }
        OTAManager.writeMetadata(dict)
        resolve(true)
    }

    @objc public func performRollback(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        OTAManager.clearOTABundleAndRollback()
        resolve(true)
    }
}
`;
}

export function getOTAManagerBridgeSource(): string {
  return `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(OTAManager, NSObject)

RCT_EXTERN_METHOD(markSuccessfulLaunch)

RCT_EXTERN_METHOD(getCurrentMetadata:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getDeviceId:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getNetworkType:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getWiFiWarningThreshold:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getAvailableStorage:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(verifySHA256:(NSString *)filePath
                  expectedHash:(NSString *)expectedHash
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(verifyBundleSignature:(NSString *)filePath
                  signature:(NSString *)signature
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(commitMetadata:(NSDictionary *)metadata
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(performRollback:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
`;
}

export function getOTInstallSwiftSource(): string {
  return `//
//  OTInstall.swift
//
import Foundation
`;
}

/**
 * Writes iOS OTA native files and patches AppDelegate
 */
export async function configureIosOTA(projectDir: string, appName: string, publicKeyPkcs1: string): Promise<void> {
  const iosDir = path.join(projectDir, 'ios', appName);
  await fs.ensureDir(iosDir);

  await fs.writeFile(path.join(iosDir, 'OTAManager.swift'), getOTAManagerSwiftSource(publicKeyPkcs1), 'utf8');
  await fs.writeFile(path.join(iosDir, 'OTAManagerBridge.m'), getOTAManagerBridgeSource(), 'utf8');
  await fs.writeFile(path.join(iosDir, 'OTInstall.swift'), getOTInstallSwiftSource(), 'utf8');

  // Register native OTA files in Xcode project
  const pbxPath = path.join(projectDir, 'ios', `${appName}.xcodeproj`, 'project.pbxproj');
  if (await fs.pathExists(pbxPath)) {
    const project = xcode.project(pbxPath);
    project.parseSync();
    const groupKey = project.findPBXGroupKey({ name: appName }) || project.findPBXGroupKey({ path: appName });
    if (groupKey) {
      const target = project.getFirstTarget().uuid;
      const files = ['OTAManager.swift', 'OTAManagerBridge.m', 'OTInstall.swift'];
      let changed = false;
      for (const file of files) {
        const filePath = `${appName}/${file}`;
        if (!project.hasFile(filePath)) {
          project.addSourceFile(filePath, { target }, groupKey);
          changed = true;
        }
      }
      if (changed) {
        await fs.writeFile(pbxPath, project.writeSync(), 'utf8');
      }
    }
  }

  // Patch AppDelegate.swift if present
  const appDelegateSwift = path.join(iosDir, 'AppDelegate.swift');
  if (await fs.pathExists(appDelegateSwift)) {
    await edit(appDelegateSwift, source => {
      let next = source;
      if (!next.includes('OTAManager.resolvedBundleURL()')) {
        next = next.replace(
          /Bundle\.main\.url\(forResource:\s*"main",\s*withExtension:\s*"jsbundle"\)/,
          'OTAManager.resolvedBundleURL()',
        );
      }
      if (!next.includes('OTAManager.registerOTAFonts()')) {
        const didFinish = /(didFinishLaunchingWithOptions[^{]*\{)/;
        if (didFinish.test(next)) {
          next = next.replace(didFinish, `$1\n    OTAManager.registerOTAFonts()`);
        }
      }
      return next;
    });
  }

  // Patch AppDelegate.mm if present (for projects using ObjC++ AppDelegate)
  const appDelegateMm = path.join(iosDir, 'AppDelegate.mm');
  if (await fs.pathExists(appDelegateMm)) {
    await edit(appDelegateMm, source => {
      let next = source;
      if (!next.includes('resolvedBundleURL')) {
        next = next.replace(
          /\[\[NSBundle mainBundle\] URLForResource:@"main" withExtension:@"jsbundle"\]/,
          '[NSClassFromString(@"OTAManager") performSelector:@selector(resolvedBundleURL)]',
        );
      }
      return next;
    });
  }
}
