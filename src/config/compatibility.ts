import semver from 'semver';
import type { ProjectOptions } from '../core/types.js';
import { GeneratorError } from '../utils/errors.js';
import { DEPENDENCY_REGISTRY } from './dependencies.js';
import { DEFAULT_REACT_NATIVE_VERSION, REACT_NATIVE_PROFILES, type ReactNativeProfile } from './reactNativeVersions.js';

/**
 * Finds the profile for a React Native version. Accepts an exact version ("0.87.1")
 * or a minor ("0.87"), which picks the newest patch profile of that minor.
 */
export function getProfile(version: string = DEFAULT_REACT_NATIVE_VERSION): ReactNativeProfile {
  const exact = REACT_NATIVE_PROFILES.find(p => p.reactNative === version);
  if (exact) return exact;
  const byMinor = REACT_NATIVE_PROFILES.filter(p => `${semver.major(p.reactNative)}.${semver.minor(p.reactNative)}` === version);
  if (byMinor.length > 0) {
    return byMinor.sort((a, b) => semver.rcompare(a.reactNative, b.reactNative))[0]!;
  }
  throw new GeneratorError(`React Native ${version} is not supported by this generator version.`, {
    reason: `Supported versions: ${REACT_NATIVE_PROFILES.map(p => p.reactNative).join(', ')}`,
    tryHints: ['Omit --rn-version to use the default, or upgrade rn-architecture-generator.'],
  });
}

export interface ResolvedDependencies {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

function pick(profile: ReactNativeProfile, names: readonly string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of names) {
    const version = profile.packages[name];
    if (!version) {
      throw new GeneratorError(`No version of "${name}" is configured for React Native ${profile.reactNative}.`, {
        reason: 'The dependency registry and the compatibility profile are out of sync.',
      });
    }
    result[name] = version;
  }
  return result;
}

/** Throws when any native library does not declare support for the RN version. */
export function assertCompatible(profile: ReactNativeProfile): void {
  const problems: string[] = [];
  for (const [pkg, range] of Object.entries(profile.supportedRange)) {
    if (!semver.satisfies(profile.reactNative, range)) {
      problems.push(`${pkg}@${profile.packages[pkg] ?? '?'} supports react-native ${range}`);
    }
  }
  if (!semver.valid(profile.reactNative)) {
    problems.push(`"${profile.reactNative}" is not a valid version`);
  }
  if (problems.length > 0) {
    throw new GeneratorError(`Dependencies are not compatible with React Native ${profile.reactNative}.`, {
      reason: problems.join('\n'),
      tryHints: ['Choose another --rn-version, or update src/config/reactNativeVersions.ts.'],
    });
  }
}

/** The exact packages (and versions) a project needs – nothing more. */
export function resolveDependencies(
  profile: ReactNativeProfile,
  options: Pick<ProjectOptions, 'architecture' | 'stateManagement' | 'apiEncryption' | 'vectorIcons' | 'analytics' | 'rtl' | 'storage'>,
): ResolvedDependencies {
  assertCompatible(profile);
  const { featureDependencies } = DEPENDENCY_REGISTRY;
  const features = [
    options.apiEncryption ? featureDependencies.apiEncryption : undefined,
    options.vectorIcons ? featureDependencies.vectorIcons : undefined,
    options.analytics ? featureDependencies.analytics : undefined,
    options.rtl ? featureDependencies.rtl : undefined,
  ].filter(f => f !== undefined);
  const runtime = new Set<string>([
    ...DEPENDENCY_REGISTRY.dependencies,
    ...DEPENDENCY_REGISTRY.stateDependencies[options.stateManagement],
    ...DEPENDENCY_REGISTRY.architectureDependencies[options.architecture],
    ...DEPENDENCY_REGISTRY.storageDependencies[options.storage],
    ...features.flatMap(f => f.dependencies),
  ]);
  const dev = new Set<string>([...DEPENDENCY_REGISTRY.devDependencies, ...features.flatMap(f => f.devDependencies)]);
  return {
    dependencies: pick(profile, [...runtime].sort()),
    devDependencies: pick(profile, [...dev].sort()),
  };
}

export function assertNodeVersion(profile: ReactNativeProfile, nodeVersion = process.versions.node): void {
  if (!semver.satisfies(nodeVersion, profile.node)) {
    throw new GeneratorError(`Node ${nodeVersion} is too old for React Native ${profile.reactNative}.`, {
      reason: `React Native ${profile.reactNative} requires Node ${profile.node}.`,
      tryHints: ['Install the current Node LTS (https://nodejs.org) or use nvm: `nvm install --lts`.'],
    });
  }
}
