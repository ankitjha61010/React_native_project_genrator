#!/usr/bin/env node
/**
 * Builds a signed OTA (Over-The-Air) update archive for this app.
 *
 *   npm run ota:android -- --ota-version 2 --serve
 *   npm run ota:ios -- --ota-version 2 --base-url https://cdn.example.com/ota
 *
 * Steps: bundle the JS + images (react-native bundle) → compile to Hermes bytecode when the
 * app uses Hermes → zip → SHA-256 → RSA signature with ota/ota-signing-key.pem.
 * Output in ota-builds/<platform>-v<otaVersion>/:
 *   release.zip   – upload it anywhere the phone can download from (or use --serve)
 *   release.json  – the body of POST /api/v1/ota/releases (paste it in the admin panel)
 *
 * Options:
 *   --platform android|ios     required (npm run ota:android / ota:ios set it)
 *   --ota-version <n>          required – must be higher than the OTA version the phone has
 *   --native-version <x.y.z>   default: versionName (Android) / MARKETING_VERSION (iOS)
 *   --base-url <url>           where release.zip will be hosted → bundleUrl = <url>/release.zip
 *   --serve                    serve release.zip on this computer's network address (for testing)
 *   --port <n>                 port for --serve (default 8099)
 *   --force                    mandatory update (forceUpdate)
 *   --rollout <1-100>          staged rollout percentage (default 100)
 *   --notes <text>             release notes shown in the update dialog
 *   --no-hermes                ship plain JavaScript even if the app uses Hermes
 *   --key <file>               signing key (default ota/ota-signing-key.pem or $OTA_SIGNING_KEY)
 */
import { spawnSync } from 'node:child_process';
import { createHash, createPrivateKey, sign } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import zlib from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));

const fail = message => {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
};

function usage() {
  const header = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').match(/\/\*\*([\s\S]*?)\*\//)?.[1] ?? '';
  console.log(header.replace(/^ \* ?/gm, '').trim());
}

let parsed;
try {
  parsed = parseArgs({
    options: {
    platform: { type: 'string' },
    'ota-version': { type: 'string' },
    'native-version': { type: 'string' },
    'base-url': { type: 'string' },
    serve: { type: 'boolean', default: false },
    port: { type: 'string', default: '8099' },
    force: { type: 'boolean', default: false },
    rollout: { type: 'string', default: '100' },
    notes: { type: 'string' },
    'no-hermes': { type: 'boolean', default: false },
    key: { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
    },
  });
} catch (error) {
  usage();
  fail(error.message);
}
const args = parsed.values;
if (args.help) {
  usage();
  process.exit(0);
}

const platform = args.platform;
if (platform !== 'android' && platform !== 'ios') fail('Pass --platform android or --platform ios.');
const otaVersion = Number(args['ota-version']);
if (!Number.isInteger(otaVersion) || otaVersion < 1) fail('Pass --ota-version <n> (a whole number ≥ 1, higher than the one installed).');
const rollout = Number(args.rollout);
if (!Number.isInteger(rollout) || rollout < 1 || rollout > 100) fail('--rollout must be a whole number from 1 to 100.');

const read = file => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');

// ── native version: the phone only takes OTA bundles built for its installed app version ──
function detectNativeVersion() {
  if (platform === 'android') {
    const gradle = read(path.join(root, 'android', 'app', 'build.gradle'));
    return gradle.match(/versionName\s+["']([^"']+)["']/)?.[1];
  }
  const iosDir = path.join(root, 'ios');
  const xcodeproj = fs.existsSync(iosDir) ? fs.readdirSync(iosDir).find(f => f.endsWith('.xcodeproj')) : undefined;
  const pbx = xcodeproj ? read(path.join(iosDir, xcodeproj, 'project.pbxproj')) : '';
  return pbx.match(/MARKETING_VERSION = ([^;]+);/)?.[1]?.replace(/"/g, '').trim();
}
const nativeVersion = args['native-version'] ?? detectNativeVersion();
if (!nativeVersion) fail('Could not read the app version – pass --native-version <x.y.z>.');

// ── signing key ──
const keyFile = path.resolve(root, args.key ?? process.env.OTA_SIGNING_KEY ?? path.join('ota', 'ota-signing-key.pem'));
if (!fs.existsSync(keyFile)) fail(`Signing key not found: ${keyFile}\n  It was created when the project was generated (keep a backup – the app only accepts bundles signed with it).`);
const privateKey = createPrivateKey(fs.readFileSync(keyFile));

// ── output folders ──
const outDir = path.join(root, 'ota-builds', `${platform}-v${otaVersion}`);
const stagingDir = path.join(outDir, 'bundle');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(stagingDir, { recursive: true });

// The file names the native side loads from the unzipped folder (OTABundleResolver / OTAManager).
const bundleName = platform === 'android' ? 'index.android.bundle' : 'main.jsbundle';
const bundleFile = path.join(stagingDir, bundleName);

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) fail(`${command} ${commandArgs.join(' ')} failed.`);
}

console.log(`\n▶ Bundling ${platform} JavaScript (app version ${nativeVersion}, OTA version ${otaVersion})…\n`);
run('npx', [
  'react-native', 'bundle',
  '--platform', platform,
  '--dev', 'false',
  '--entry-file', 'index.js',
  '--bundle-output', bundleFile,
  '--assets-dest', stagingDir,
  // .env values are inlined at build time – never reuse a stale cache.
  '--reset-cache',
]);

// ── Hermes: compile like a release build does (the bytecode must come from this project's React Native) ──
function usesHermes() {
  if (platform === 'android') return !/^\s*hermesEnabled\s*=\s*false/m.test(read(path.join(root, 'android', 'gradle.properties')));
  return !/:hermes_enabled\s*=>\s*false/.test(read(path.join(root, 'ios', 'Podfile')));
}

function findHermesc() {
  const osDir = { darwin: 'osx-bin', linux: 'linux64-bin', win32: 'win64-bin' }[process.platform];
  const exe = process.platform === 'win32' ? 'hermesc.exe' : 'hermesc';
  const packageDir = name => {
    try {
      return path.dirname(require.resolve(`${name}/package.json`));
    } catch {
      return undefined;
    }
  };
  const candidates = [
    process.env.HERMESC,
    packageDir('hermes-compiler') && path.join(packageDir('hermes-compiler'), 'hermesc', osDir, exe),
    packageDir('react-native') && path.join(packageDir('react-native'), 'sdks', 'hermesc', osDir, exe),
  ];
  return candidates.find(file => file && fs.existsSync(file));
}

if (!args['no-hermes'] && usesHermes()) {
  const hermesc = findHermesc();
  if (hermesc) {
    console.log('\n▶ Compiling to Hermes bytecode…');
    const compiled = `${bundleFile}.hbc`;
    run(hermesc, ['-emit-binary', '-O', '-w', '-out', compiled, bundleFile]);
    fs.renameSync(compiled, bundleFile);
  } else {
    console.warn('\n⚠ hermesc not found – shipping plain JavaScript (Hermes runs it, it just starts a little slower). Set HERMESC=/path/to/hermesc to compile.');
  }
}

// ── zip (standard deflate, no extra tools needed) ──
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = buffer => {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

function listFiles(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? [{ name: `${name}/`, dir: true }, ...listFiles(path.join(dir, entry.name), name)] : [{ name, file: path.join(dir, entry.name) }];
  });
}

function createZip(dir) {
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of listFiles(dir)) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = entry.dir ? Buffer.alloc(0) : fs.readFileSync(entry.file);
    const compressed = entry.dir ? data : zlib.deflateRawSync(data, { level: 9 });
    const method = entry.dir ? 0 : 8;
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(entry.dir ? 0x10 : 0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + compressed.length;
  }
  const centralDir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(centrals.length / 2, 8);
  end.writeUInt16LE(centrals.length / 2, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDir, end]);
}

const zip = createZip(stagingDir);
const zipFile = path.join(outDir, 'release.zip');
fs.writeFileSync(zipFile, zip);

// ── checks the app runs before installing (OTAManager.verifySHA256 / verifyBundleSignature) ──
const sha256 = createHash('sha256').update(zip).digest('hex');
const signature = sign('sha256', zip, privateKey).toString('base64');

function lanAddress() {
  const all = Object.values(os.networkInterfaces()).flat();
  return all.find(i => i && i.family === 'IPv4' && !i.internal)?.address ?? 'localhost';
}
const port = Number(args.port);
const baseUrl = args.serve && !args['base-url'] ? `http://${lanAddress()}:${port}` : args['base-url']?.replace(/\/+$/, '');

const release = {
  otaVersion,
  nativeVersion,
  platform,
  bundleUrl: baseUrl ? `${baseUrl}/release.zip` : '',
  bundleSize: zip.length,
  sha256,
  signature,
  forceUpdate: args.force,
  targetRolloutPct: rollout,
  ...(args.notes ? { releaseNotes: args.notes } : {}),
};
fs.writeFileSync(path.join(outDir, 'release.json'), `${JSON.stringify(release, null, 2)}\n`);
fs.rmSync(stagingDir, { recursive: true, force: true });

console.log(`
✔ OTA archive ready (${(zip.length / 1024 / 1024).toFixed(2)} MB)
  ${path.relative(root, zipFile)}
  ${path.relative(root, path.join(outDir, 'release.json'))}

Next:
  1. ${release.bundleUrl ? `The phone downloads ${release.bundleUrl}` : 'Upload release.zip somewhere the phone can download it, then set "bundleUrl" in release.json'}
  2. Admin panel → OTA Updates → New release → paste release.json (or POST it to /api/v1/ota/releases as an admin)
  3. Open a RELEASE build of the app (version ${nativeVersion}) – debug builds load JavaScript from Metro
`);

if (args.serve) {
  http
    .createServer((req, res) => {
      if (req.url !== '/release.zip') {
        res.writeHead(404).end();
        return;
      }
      console.log(`  ↓ ${req.socket.remoteAddress} downloads release.zip`);
      res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Length': zip.length });
      res.end(zip);
    })
    .listen(port, '0.0.0.0', () => console.log(`Serving ${release.bundleUrl} – keep this running while you test (Ctrl+C to stop).\n`));
}
