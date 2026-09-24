// Golos Text font family mapping for different weights
const GolosTextFontFamily = {
  regular: 'GolosText-Regular',
  medium: 'GolosText-Medium',
  semiBold: 'GolosText-SemiBold',
  bold: 'GolosText-Bold',
  extraBold: 'GolosText-ExtraBold',
  black: 'GolosText-Black',
} as const;

export const typography = {
  // Font families with complete DM Sans variations
  fontFamily: {
    // Weight-based families
    regular: GolosTextFontFamily.regular,
    medium: GolosTextFontFamily.medium,
    semiBold: GolosTextFontFamily.semiBold,
    bold: GolosTextFontFamily.bold,
    extraBold: GolosTextFontFamily.extraBold,
    black: GolosTextFontFamily.black,
  },

  // Font sizes with improved scale
  fontSize: {
    size2: 2,
    size4: 4,
    size6: 6,
    size7: 7,
    size8: 8,
    size10: 10,
    size11: 11,
    size12: 12,
    size13: 13,
    size14: 14,
    size15: 15,
    size16: 16,
    size17: 17,
    size18: 18,
    size20: 20,
    size22: 22,
    size24: 24,
    size26: 26,
    size28: 28,
    size30: 30,
    size32: 32,
    size34: 34,
  },

  // Line heights optimized for DM Sans
  lineHeight: {
    size2: 2,
    size4: 4,
    size6: 6,
    size8: 8,
    size10: 10,
    size12: 12,
    size14: 14,
    size16: 16,
    size18: 18,
    size20: 20,
    size22: 22,
    size24: 24,
    size26: 26,
    size28: 28,
    size30: 30,
    size31: 31,
    size32: 32,
    size34: 34,
  },

  // Font weights mapped to DM Sans variations
  fontWeight: {
    '100': '100' as const, // Thin
    '200': '200' as const, // ExtraLight
    '300': '300' as const, // Light
    '400': '400' as const, // Regular
    '500': '500' as const, // Medium
    '600': '600' as const, // SemiBold
    '700': '700' as const, // Bold
    '800': '800' as const, // ExtraBold
    '900': '900' as const, // Black
    // Semantic weights
    thin: '100' as const,
    extraLight: '200' as const,
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
  },

  // Letter spacing for better readability
  letterSpacing: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
    widest: 1,
  },
} as const;

export type Typography = typeof typography;
