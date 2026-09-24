#!/usr/bin/env node
/**
 * Generates a project for every architecture (and every state management option)
 * and runs TypeScript, ESLint and Jest inside each one.
 *
 *   RNAG_TEMPLATE=<dir with a pristine `FastRoute` RN CLI project> \
 *   RNAG_NODE_MODULES=<node_modules with all generated dependencies installed> \
 *   npm run verify:projects
 *
 * Both are produced once by a real run of the generator; reusing them keeps the
 * verification fast and offline.
 */
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { generateProject } from '../dist/generators/projectGenerator.js';

const template = process.env.RNAG_TEMPLATE;
const nodeModules = process.env.RNAG_NODE_MODULES;
if (!template || !nodeModules) {
  console.error('Set RNAG_TEMPLATE and RNAG_NODE_MODULES (see the header of this script).');
  process.exit(1);
}

// [architecture, state management, API encryption, RTL, theme context, vector icons, storage, analytics]
const matrix = [
  ['atomic', 'redux', false, false, false, true, 'mmkv', true],
  ['feature-based', 'zustand', true, true, true, true, 'async-storage', false],
  ['layered', 'context', false, true, true, false, 'mmkv', false],
  ['clean', 'none', true, false, false, false, 'async-storage', true],
  ['mvc', 'zustand', false, false, true, true, 'mmkv', true],
  ['mvvm', 'context', true, true, false, true, 'async-storage', false],
  ['redux', 'redux', false, false, true, false, 'mmkv', false],
  ['modular', 'redux', true, true, true, true, 'async-storage', true],
];

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rnag-verify-'));
const results = [];

for (const [architecture, stateManagement, apiEncryption, rtl, themeContext, vectorIcons, storage, analytics] of matrix) {
  const parentDir = path.join(root, architecture);
  const projectDir = path.join(parentDir, 'FastRoute');
  console.log(`\n▶ ${architecture} (${stateManagement}, encryption: ${apiEncryption}, rtl: ${rtl}, theme: ${themeContext}, icons: ${vectorIcons}, storage: ${storage}, analytics: ${analytics})`);
  await generateProject(
    {
      appName: 'FastRoute',
      displayName: 'Fast Route',
      packageName: 'com.example.fastroute',
      parentDir,
      architecture,
      stateManagement,
      firebase: {},
      apiEncryption,
      rtl,
      themeContext,
      vectorIcons,
      storage,
      analytics,
      initGit: false,
      installDependencies: false,
      installPods: false,
      overwrite: false,
      reactNativeVersion: '0.87.1',
    },
    { initProject: async dir => fs.copy(template, dir) },
  );
  await fs.symlink(nodeModules, path.join(projectDir, 'node_modules'), 'dir');

  const checks = {};
  for (const [name, cmd, args] of [
    ['typecheck', 'npx', ['tsc', '--noEmit']],
    ['lint', 'npx', ['eslint', '.', '--max-warnings', '0']],
    ['test', 'npx', ['jest', '--silent']],
  ]) {
    try {
      execFileSync(cmd, args, { cwd: projectDir, stdio: 'pipe' });
      checks[name] = 'ok';
    } catch (error) {
      checks[name] = 'FAILED';
      console.log(String(error.stdout ?? '') + String(error.stderr ?? ''));
    }
  }
  results.push({ architecture, stateManagement, apiEncryption, rtl, themeContext, vectorIcons, storage, analytics, ...checks, dir: projectDir });
}

console.table(results);
process.exit(results.every(r => r.typecheck === 'ok' && r.lint === 'ok' && r.test === 'ok') ? 0 : 1);
