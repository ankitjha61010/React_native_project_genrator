/** Returns an error message, or `true` when valid (inquirer compatible). */
export type ValidationResult = true | string;

const RESERVED_NAMES = new Set([
  'react',
  'reactnative',
  'react-native',
  'test',
  'tests',
  'node_modules',
  'app',
  'index',
  'expo',
]);

/**
 * React Native project names must be valid iOS target / Android module identifiers:
 * start with a letter, only letters and digits.
 */
export function validateAppName(name: string): ValidationResult {
  const value = name.trim();
  if (!value) {
    return 'App name is required.';
  }
  if (value.length > 50) {
    return 'App name must be at most 50 characters.';
  }
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(value)) {
    return 'App name must start with a letter and contain only letters and digits (e.g. FastRoute).';
  }
  if (RESERVED_NAMES.has(value.toLowerCase())) {
    return `"${value}" is a reserved name, please choose another one.`;
  }
  return true;
}

const JAVA_KEYWORDS = new Set(
  (
    'abstract assert boolean break byte case catch char class const continue default do double else enum extends ' +
    'final finally float for goto if implements import instanceof int interface long native new package private ' +
    'protected public return short static strictfp super switch synchronized this throw throws transient try void ' +
    'volatile while true false null fun object when typealias val var'
  ).split(' '),
);

/** Android applicationId rules (also valid as an iOS bundle identifier). */
export function validatePackageName(name: string): ValidationResult {
  const value = name.trim();
  if (!value) {
    return 'Package name is required.';
  }
  if (value.length > 150) {
    return 'Package name is too long.';
  }
  const segments = value.split('.');
  if (segments.length < 2) {
    return 'Package name needs at least two segments (e.g. com.example.fastroute).';
  }
  for (const segment of segments) {
    if (!/^[a-z][a-z0-9_]*$/.test(segment)) {
      return `Invalid segment "${segment}". Use lowercase letters, digits or "_", starting with a letter.`;
    }
    if (JAVA_KEYWORDS.has(segment)) {
      return `"${segment}" is a reserved Java/Kotlin keyword and can't be used in a package name.`;
    }
  }
  return true;
}

export function defaultPackageName(appName: string): string {
  const slug = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `com.example.${slug || 'app'}`;
}

/** Converts "FastRoute" to "Fast Route". */
export function toDisplayName(appName: string): string {
  return appName.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
}
