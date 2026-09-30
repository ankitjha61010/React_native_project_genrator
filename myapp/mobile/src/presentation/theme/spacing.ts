export interface Spacing {
  spacing0: number;
  spacing1: number;
  spacing2: number;
  spacing3: number;
  spacing4: number;
  spacing5: number;
  spacing6: number;
  spacing7: number;
  spacing8: number;
  spacing9: number;
  spacing10: number;
  spacing11: number;
  spacing12: number;
  spacing13: number;
  spacing14: number;
  spacing15: number;
  spacing16: number;
  spacing17: number;
  spacing18: number;
  spacing19: number;
  spacing20: number;
  spacing21: number;
  spacing22: number;
  spacing24: number;
  spacing25: number;
  spacing26: number;
  spacing28: number;
  spacing30: number;
  spacing32: number;
  spacing35: number;
  spacing37: number;
  spacing41: number;
  spacing40: number;
  spacing48: number;
  spacing46: number;
  spacing47: number;
  spacing50: number;
  spacing56: number;
  spacing57: number;
  spacing68: number;
  spacing71: number;
  spacing72: number;
  spacing83: number;
  spacing85: number;
  spacing100: number;
  spacing126: number;
  spacing170: number;
  spacing174: number;
  spacingMinus12: number;
  spacePoint139: number;
  spacing121: number;
  spacePoint122: number;
  spacing150: number;
  spacing160: number;
}

export const spacing: Spacing = {
  spacing0: 0,
  spacing1: 1,
  spacing2: 2,
  spacing3: 3,
  spacing4: 4,
  spacing7: 7,
  spacing8: 8,
  spacing5: 5,
  spacing6: 6,
  spacing9: 9,
  spacing10: 10,
  spacing11: 11,
  spacing12: 12,
  spacing13: 13,
  spacing14: 14,
  spacing15: 15,
  spacing16: 16,
  spacing17: 17,
  spacing18: 18,
  spacing19: 19,
  spacing20: 20,
  spacing21: 21,
  spacing22: 22,
  spacing24: 24,
  spacing25: 25,
  spacing26: 26,
  spacing28: 28,
  spacing30: 30,
  spacing35: 35,
  spacing37: 37,
  spacing32: 32,
  spacing40: 40,
  spacing41: 41,
  spacing46: 46,
  spacing47: 47,
  spacing48: 48,
  spacing50: 50,
  spacing56: 56,
  spacing57: 57,
  spacing68: 68,
  spacing71: 71,
  spacing72: 72,
  spacing83: 83,
  spacing85: 85,
  spacing100: 100,
  spacing121: 121,
  spacing126: 126,
  spacing170: 170,
  spacing174: 174,
  spacingMinus12: -12,
  spacePoint139: 1.39,
  spacePoint122: 1.22,
  spacing150: 150,
  spacing160: 160,
};

export interface BorderRadius {
  radius5: number;
  radius6: number;
  radius10: number;
  radius20: number;
  radius100: number;
  radius1000: number;
  radius16: number;
  radius12: number;
  radius14: number;
  radius8: number;
}

export const borderRadius: BorderRadius = {
  radius5: 5,
  radius6: 6,
  radius10: 10,
  radius20: 20,
  radius100: 100,
  radius1000: 1000,
  radius14: 14,
  radius16: 16,
  radius12: 12,
  radius8: 8,
};

export interface Shadows {
  inputShadow: object;
  rentCardShadow: object;
  activityCardShadow: object;
  statCardShadow: object;
  profileCardShadow: object;
  filterCardShadow: object;
}

export const shadows: Shadows = {
  inputShadow: {
    shadowColor: '#E4E5E73D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 5,
  },
  rentCardShadow: {
    shadowColor: '#0000000D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 5,
  },
  activityCardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statCardShadow: {
    shadowColor: '#BABABA40',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  profileCardShadow: {
    shadowColor: '#0000000D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 5,
  },
  filterCardShadow: {
    shadowColor: '#E4E5E7',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.24,
    shadowRadius: 2,
    elevation: 5,
  },
};

export interface Flex {
  flexFull: number;
  flexHalf: number;
  flexZero: number;
}

export const flexs: Flex = {
  flexFull: 1,
  flexHalf: 0.5,
  flexZero: 0,
};

export interface Opacity {
  opacity0: number;
  opacityFull: number;
  opacity2: number;
  opacity4: number;
}

export const opacity: Opacity = {
  opacityFull: 1,
  opacity0: 0,
  opacity2: 0.2,
  opacity4: 0.4,
};

export interface LetterSpacing {
  letter05: number;
}

export const letterSpacing: LetterSpacing = {
  letter05: 0.5,
};
