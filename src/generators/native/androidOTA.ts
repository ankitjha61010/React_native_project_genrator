import path from 'node:path';
import fs from 'fs-extra';

async function edit(file: string, transform: (source: string) => string): Promise<void> {
  if (!(await fs.pathExists(file))) return;
  const source = await fs.readFile(file, 'utf8');
  const next = transform(source);
  if (next !== source) await fs.writeFile(file, next, 'utf8');
}

export function getOTABundleResolverSource(packageName: string): string {
  return `package ${packageName}.ota;

import android.content.Context;
import android.graphics.Typeface;
import android.util.Log;

import com.facebook.react.common.assets.ReactFontManager;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Android native OTA bundle resolver and rollback crash sentinel.
 * Called from MainApplication before React bridge starts, and from
 * OTAManagerModule for JS calls.
 */
public final class OTABundleResolver {

    private static final String TAG = "OTA";
    private static final String OTA_BUNDLE_DIR_NAME = "ota_bundle";
    private static final String JS_BUNDLE_FILE_NAME = "index.android.bundle";
    private static final String METADATA_FILE_NAME = "ota_metadata.json";
    private static final String CRASH_SENTINEL_NAME = "crash_sentinel";

    private OTABundleResolver() {}

    public static File otaBundleDirectory(Context context) {
        return new File(context.getFilesDir(), OTA_BUNDLE_DIR_NAME);
    }

    private static File metadataFile(Context context) {
        return new File(otaBundleDirectory(context), METADATA_FILE_NAME);
    }

    private static File crashSentinelFile(Context context) {
        return new File(otaBundleDirectory(context), CRASH_SENTINEL_NAME);
    }

    private static boolean hasResolved = false;
    private static String cachedResult;

    /**
     * Returns the absolute path of the OTA bundle to load, or null to fall
     * back to the embedded assets bundle.
     */
    public static synchronized String resolvedJSBundleFile(Context context) {
        if (hasResolved) {
            return cachedResult;
        }

        if (crashSentinelExists(context)) {
            Log.w(TAG, "Crash sentinel found — previous OTA bundle failed. Rolling back.");
            clearOTABundleAndRollback(context);
        }

        File bundleFile = new File(otaBundleDirectory(context), JS_BUNDLE_FILE_NAME);
        if (bundleFile.exists()) {
            writeCrashSentinel(context);
            Log.i(TAG, "Loading OTA bundle: " + bundleFile.getAbsolutePath());
            cachedResult = bundleFile.getAbsolutePath();
        } else {
            Log.i(TAG, "No OTA bundle on disk — loading embedded bundle.");
            cachedResult = null;
        }

        hasResolved = true;
        return cachedResult;
    }

    public static void registerOTAFonts(Context context) {
        File fontsDir = new File(otaBundleDirectory(context), "assets/fonts");
        File[] files = fontsDir.listFiles();
        if (files == null) return;

        for (File file : files) {
            String lower = file.getName().toLowerCase();
            if (!lower.endsWith(".ttf") && !lower.endsWith(".otf")) continue;

            try {
                String familyName = file.getName().replaceAll("(?i)\\\\.(ttf|otf)$", "");
                Typeface typeface = Typeface.createFromFile(file);
                ReactFontManager.getInstance().addCustomFont(familyName, typeface);
            } catch (Exception e) {
                Log.e(TAG, "Failed to register font " + file.getName() + ": " + e.getMessage());
            }
        }
    }

    public static void writeCrashSentinel(Context context) {
        createOTADirectoryIfNeeded(context);
        try (FileOutputStream out = new FileOutputStream(crashSentinelFile(context))) {
            out.write("1".getBytes(StandardCharsets.UTF_8));
        } catch (IOException e) {
            Log.e(TAG, "writeCrashSentinel failed: " + e.getMessage());
        }
    }

    public static boolean crashSentinelExists(Context context) {
        return crashSentinelFile(context).exists();
    }

    public static void deleteCrashSentinel(Context context) {
        crashSentinelFile(context).delete();
    }

    public static void clearOTABundleAndRollback(Context context) {
        hasResolved = false;
        cachedResult = null;
        JSONObject prevMeta = readMetadata(context);
        deleteRecursive(otaBundleDirectory(context));

        if (prevMeta != null) {
            try {
                prevMeta.put("status", "rolled_back");
                prevMeta.put("rolled_back_at", new Date().toString());
                writeMetadata(context, prevMeta);
            } catch (JSONException e) {
                Log.e(TAG, "Rollback metadata write failed: " + e.getMessage());
            }
        }
        Log.i(TAG, "Rollback complete — embedded bundle loads on next cold start.");
    }

    public static JSONObject readMetadata(Context context) {
        File file = metadataFile(context);
        if (!file.exists()) return null;
        try (FileInputStream in = new FileInputStream(file)) {
            byte[] bytes = new byte[(int) file.length()];
            int read = in.read(bytes);
            if (read <= 0) return null;
            return new JSONObject(new String(bytes, StandardCharsets.UTF_8));
        } catch (IOException | JSONException e) {
            Log.e(TAG, "readMetadata failed: " + e.getMessage());
            return null;
        }
    }

    public static void writeMetadata(Context context, JSONObject metadata) {
        createOTADirectoryIfNeeded(context);
        try (FileOutputStream out = new FileOutputStream(metadataFile(context))) {
            out.write(metadata.toString().getBytes(StandardCharsets.UTF_8));
        } catch (IOException e) {
            Log.e(TAG, "writeMetadata failed: " + e.getMessage());
        }
    }

    private static void createOTADirectoryIfNeeded(Context context) {
        File dir = otaBundleDirectory(context);
        if (!dir.exists()) {
            dir.mkdirs();
        }
    }

    private static void deleteRecursive(File file) {
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) deleteRecursive(child);
            }
        }
        file.delete();
    }
}
`;
}

/** `publicKeySpki`: the project's OTA public key (X.509 SPKI DER, base64) – see otaKeys.ts. */
export function getOTAManagerModuleSource(packageName: string, publicKeySpki: string): string {
  return `package ${packageName}.ota;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.os.StatFs;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.WritableMap;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.FileInputStream;
import java.io.IOException;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.Iterator;

public class OTAManagerModule extends ReactContextBaseJavaModule {

    private static final String TAG = "OTAManager";
    private static final long WIFI_WARNING_THRESHOLD_BYTES = 50L * 1024 * 1024; // 50 MB

    // This project's OTA public key (scripts/ota-bundle.mjs signs with its private key).
    private static final String OTA_PUBLIC_KEY_BASE64 =
        "${publicKeySpki}";

    public OTAManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return "OTAManager";
    }

    @ReactMethod
    public void markSuccessfulLaunch() {
        OTABundleResolver.deleteCrashSentinel(getReactApplicationContext());
        Log.i(TAG, "markSuccessfulLaunch — OTA bundle confirmed stable.");
    }

    @ReactMethod
    public void getCurrentMetadata(Promise promise) {
        JSONObject meta = OTABundleResolver.readMetadata(getReactApplicationContext());
        WritableMap result = Arguments.createMap();
        if (meta == null) {
            result.putInt("ota_version", 0);
            result.putString("status", "no_ota");
            result.putString("native_version", nativeVersionName());
        } else {
            jsonIntoMap(meta, result);
        }
        promise.resolve(result);
    }

    @ReactMethod
    public void getDeviceId(Promise promise) {
        String id = Settings.Secure.getString(
            getReactApplicationContext().getContentResolver(),
            Settings.Secure.ANDROID_ID
        );
        promise.resolve(id != null ? id : "unknown");
    }

    @ReactMethod
    public void getNetworkType(Promise promise) {
        ConnectivityManager cm = (ConnectivityManager)
            getReactApplicationContext().getSystemService(Context.CONNECTIVITY_SERVICE);

        String type = "none";
        if (cm != null) {
            NetworkCapabilities caps = cm.getNetworkCapabilities(cm.getActiveNetwork());
            if (caps != null) {
                if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                    type = "wifi";
                } else if (caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) {
                    type = "cellular";
                }
            }
        }
        promise.resolve(type);
    }

    @ReactMethod
    public void getWiFiWarningThreshold(Promise promise) {
        promise.resolve((double) WIFI_WARNING_THRESHOLD_BYTES);
    }

    @ReactMethod
    public void getAvailableStorage(Promise promise) {
        StatFs stat = new StatFs(getReactApplicationContext().getFilesDir().getAbsolutePath());
        promise.resolve((double) stat.getAvailableBytes());
    }

    @ReactMethod
    public void verifySHA256(String filePath, String expectedHash, Promise promise) {
        new Thread(() -> {
            try {
                String actual = sha256Hex(filePath);
                if (actual.equalsIgnoreCase(expectedHash)) {
                    promise.resolve(true);
                } else {
                    promise.reject("SHA256_MISMATCH",
                        "SHA-256 mismatch. Expected: " + expectedHash + "  Got: " + actual);
                }
            } catch (IOException | NoSuchAlgorithmException e) {
                promise.reject("FILE_READ_ERROR", "Cannot read file for SHA-256 verification", e);
            }
        }).start();
    }

    @ReactMethod
    public void verifyBundleSignature(String filePath, String signatureBase64, Promise promise) {
        new Thread(() -> {
            try {
                if (verifySignature(filePath, signatureBase64)) {
                    promise.resolve(true);
                } else {
                    promise.reject("SIGNATURE_INVALID",
                        "Bundle signature verification failed — bundle may have been tampered with.");
                }
            } catch (Exception e) {
                promise.reject("SIGNATURE_INVALID", e.getMessage(), e);
            }
        }).start();
    }

    @ReactMethod
    public void commitMetadata(ReadableMap metadata, Promise promise) {
        OTABundleResolver.writeMetadata(getReactApplicationContext(), mapToJson(metadata));
        promise.resolve(true);
    }

    @ReactMethod
    public void performRollback(Promise promise) {
        OTABundleResolver.clearOTABundleAndRollback(getReactApplicationContext());
        promise.resolve(true);
    }

    private String nativeVersionName() {
        try {
            Context context = getReactApplicationContext();
            return context.getPackageManager()
                .getPackageInfo(context.getPackageName(), 0).versionName;
        } catch (Exception e) {
            return "unknown";
        }
    }

    private static String sha256Hex(String filePath) throws IOException, NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (FileInputStream in = new FileInputStream(filePath)) {
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = in.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
        }
        StringBuilder hex = new StringBuilder();
        for (byte b : digest.digest()) hex.append(String.format("%02x", b));
        return hex.toString();
    }

    private static boolean verifySignature(String filePath, String signatureBase64) throws Exception {
        byte[] keyBytes = Base64.decode(OTA_PUBLIC_KEY_BASE64, Base64.DEFAULT);
        PublicKey publicKey = KeyFactory.getInstance("RSA")
            .generatePublic(new X509EncodedKeySpec(keyBytes));

        Signature signature = Signature.getInstance("SHA256withRSA");
        signature.initVerify(publicKey);

        try (FileInputStream in = new FileInputStream(filePath)) {
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = in.read(buffer)) != -1) {
                signature.update(buffer, 0, read);
            }
        }

        return signature.verify(Base64.decode(signatureBase64, Base64.DEFAULT));
    }

    private static void jsonIntoMap(JSONObject json, WritableMap map) {
        Iterator<String> keys = json.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            Object value = json.opt(key);
            if (value instanceof Boolean) map.putBoolean(key, (Boolean) value);
            else if (value instanceof Integer) map.putInt(key, (Integer) value);
            else if (value instanceof Long) map.putDouble(key, (Long) value);
            else if (value instanceof Double) map.putDouble(key, (Double) value);
            else map.putString(key, String.valueOf(value));
        }
    }

    private static JSONObject mapToJson(ReadableMap map) {
        JSONObject json = new JSONObject();
        ReadableMapKeySetIterator iterator = map.keySetIterator();
        try {
            while (iterator.hasNextKey()) {
                String key = iterator.nextKey();
                switch (map.getType(key)) {
                    case Boolean:
                        json.put(key, map.getBoolean(key));
                        break;
                    case Number:
                        json.put(key, map.getDouble(key));
                        break;
                    default:
                        json.put(key, map.getString(key));
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "mapToJson failed: " + e.getMessage());
        }
        return json;
    }
}
`;
}

export function getOTAPackageSource(packageName: string): string {
  return `package ${packageName}.ota;

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class OTAPackage implements ReactPackage {

    @NonNull
    @Override
    public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new OTAManagerModule(reactContext));
        return modules;
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`;
}

/**
 * Generates all Android OTA native files and hooks into MainApplication.kt
 */
export async function configureAndroidOTA(projectDir: string, packageName: string, publicKeySpki: string): Promise<void> {
  const packagePath = packageName.replace(/\./g, '/');
  const baseSourceDir = path.join(projectDir, 'android', 'app', 'src', 'main', 'java', packagePath);
  const otaDir = path.join(baseSourceDir, 'ota');

  await fs.ensureDir(otaDir);
  await fs.writeFile(path.join(otaDir, 'OTABundleResolver.java'), getOTABundleResolverSource(packageName), 'utf8');
  await fs.writeFile(path.join(otaDir, 'OTAManagerModule.java'), getOTAManagerModuleSource(packageName, publicKeySpki), 'utf8');
  await fs.writeFile(path.join(otaDir, 'OTAPackage.java'), getOTAPackageSource(packageName), 'utf8');

  // Patch MainApplication.kt
  const mainApp = path.join(baseSourceDir, 'MainApplication.kt');
  await edit(mainApp, source => {
    let next = source;
    if (!next.includes(`import ${packageName}.ota.OTABundleResolver`)) {
      next = next.replace(/(package\s+[^\n]+)/, `$1\n\nimport ${packageName}.ota.OTABundleResolver\nimport ${packageName}.ota.OTAPackage`);
    }

    if (!next.includes('OTAPackage()')) {
      const packageListAnchor = /(PackageList\(this\)\.packages\.apply\s*\{)/;
      if (packageListAnchor.test(next)) {
        next = next.replace(packageListAnchor, `$1\n          add(OTAPackage())`);
      }
    }

    if (!next.includes('resolvedJSBundleFile')) {
      // New architecture (getDefaultReactHost): load the OTA bundle when one is installed
      // (null = the bundle embedded in the APK). Dev builds keep loading from Metro.
      const reactHostAnchor = /(getDefaultReactHost\(\s*\n(\s*)context = applicationContext,)/;
      // Older templates (ReactNativeHost): override getJSBundleFile().
      const hostAnchor = /(override\s+val\s+reactNativeHost[^{]*\{)/;
      if (reactHostAnchor.test(next)) {
        next = next.replace(reactHostAnchor, `$1\n$2jsBundleFilePath = OTABundleResolver.resolvedJSBundleFile(applicationContext),`);
      } else if (hostAnchor.test(next)) {
        next = next.replace(
          hostAnchor,
          `$1\n        override fun getJSBundleFile(): String? = OTABundleResolver.resolvedJSBundleFile(this@MainApplication)`,
        );
      }
    }

    if (!next.includes('OTABundleResolver.registerOTAFonts')) {
      const onCreateAnchor = /(super\.onCreate\(\))/;
      if (onCreateAnchor.test(next)) {
        next = next.replace(onCreateAnchor, `$1\n    OTABundleResolver.registerOTAFonts(this)`);
      }
    }

    return next;
  });
}
