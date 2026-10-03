import { describe, it, expect } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { configurePodfile } from '../src/generators/native/ios.js';

/** The stock React Native Podfile (the parts the patches anchor to). */
const STOCK_PODFILE = `require Pod::Executable.execute_command('node', ['-p', 'x', __dir__]).strip

platform :ios, min_ios_version_supported
prepare_react_native_project!

target 'App' do
  config = use_native_modules!

  use_react_native!(:path => config[:reactNativePath])

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      # :ccache_enabled => true
    )
  end
end
`;

describe('iOS Podfile – pod deployment targets', () => {
  it('raises every pod target (incl. privacy bundles) to the app platform version, read dynamically, once', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'podfile-'));
    await fs.outputFile(path.join(dir, 'ios', 'Podfile'), STOCK_PODFILE);
    await configurePodfile(dir, 'App');
    await configurePodfile(dir, 'App'); // idempotent
    const podfile = await fs.readFile(path.join(dir, 'ios', 'Podfile'), 'utf8');

    expect(podfile.match(/rn-architecture-generator: pods-deployment-target/g)).toHaveLength(1);
    // Inside post_install, after react_native_post_install.
    expect(podfile.indexOf('pods-deployment-target')).toBeGreaterThan(podfile.indexOf('react_native_post_install('));
    expect(podfile.indexOf('pods-deployment-target')).toBeLessThan(podfile.lastIndexOf('  end\nend'));
    // Read from the Podfile's platform, not hard-coded; only ever raised.
    expect(podfile).toContain('installer.aggregate_targets.map { |t| t.platform.deployment_target }.compact.max');
    expect(podfile).toContain("Gem::Version.new(current) < Gem::Version.new(app_min_ios.to_s)");
    expect(podfile).not.toMatch(/IPHONEOS_DEPLOYMENT_TARGET'\] = '\d/);
    await fs.remove(dir);
  });
});
