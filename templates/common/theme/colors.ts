/**
 * Semantic colours – what components use. They change with light / dark mode, so a
 * component written with them works in both themes without any extra code.
 */
export interface SemanticColors {
  /** Brand colour: primary buttons, links, active tab, focused input. */
  primary: string;
  primaryPressed: string;
  /** Text / icons drawn on top of `primary` (and `error`). */
  onPrimary: string;
  /** Tinted background for secondary buttons and chips. */
  primarySoft: string;
  primarySoftPressed: string;
  /** Screen background. */
  background: string;
  /** Cards, inputs, headers, tab bar. */
  surface: string;
  /** Pressed state of transparent buttons. */
  pressed: string;
  text: string;
  textSecondary: string;
  placeholder: string;
  border: string;
  error: string;
  errorPressed: string;
  tabInactive: string;
  /** Loading overlay. */
  overlay: string;
}

/** Raw brand palette – the same in both themes. Prefer the semantic names above in components. */
export interface PaletteColors {
  primaryYellow: string;
  primaryBlue: string;
  primaryBlack: string;
  titleGray: string;
  primaryWhite: string;
  primaryMainPlaceholderGrey: string;
  primaryGrey3B: string;
  primaryPlaceholderGreyC5: string;
  primaryBlack50: string;
  successLinearLigtGreyF3: string;
  unfocusTabPrimary: string;
  primaryTypeGrey63: string;
  primaryLightGreenVerify97: string;
  primaryLightGreenVerifyF4: string;
  primaryLightGreyF6: string;
  primaryLightGrey6E: string;
  primaryBlack72: string;
  rejectRed: string;
  cardBorder: string;
  backgroundLight: string;
  primaryLightGrey68: string;
  primaryWhite20: string;
  primaryBlackOriginal: string;
  primaryLightOrange: string;
  primaryDarkOrange: string;
  primaryLightBlue51: string;
  primaryLightBlueEB: string;
  primaryLihhtGreen4A: string;
  primaryLightBlueF0: string;
  primaryBlack38: string;
  primaryLightOrange37: string;
  primaryLightOrangeE3: string;
  primaryLightBlueE5: string;
  primaryLightGrey69: string;
  primaryLightGrey4F6: string;
  primaryLightGreen50: string;
  primaryWhiteLightF3: string;
  primaryBlue27: string;
  primaryRed60: string;
  primaryLightGreenF4: string;
  primaryGreen3B: string;
  primaryWhiteFF: string;
  primaryLightBlue9A: string;
  primaryBlack12: string;
  primaryLightGrey8A: string;
  primaryLightWhiteF3: string;
  primaryLightOrange8D: string;
  primaryLightWhiteFB: string;
  textDark: string;
  primaryLightWhiteFD: string;
  primaryLightBlue20: string;
  primaryLightGreenE7: string;
  primaryDarkGreen3D: string;
  primaryGolden14: string;
  primaryBlack30: string;
  primaryLightYellowE8: string;
  primaryDarkYellow: string;
  lightBlue: string;
  primaryGreen: string;
}

export interface ColorScheme extends SemanticColors, PaletteColors {}

export const lightColors: ColorScheme = {
  primary: '#1E3A8A',
  primaryPressed: '#111827',
  onPrimary: '#FFFFFF',
  primarySoft: '#EFF6FF',
  primarySoftPressed: '#E5ECFF',
  background: '#F6F9FD',
  surface: '#FFFFFF',
  pressed: '#F3F4F6',
  text: '#333333',
  textSecondary: '#6C7278',
  placeholder: '#C5C5C5',
  border: '#EDF1F3',
  error: '#FF2D55',
  errorPressed: '#FF6060',
  tabInactive: '#A6A6A6',
  overlay: '#FFFFFF80',

  primaryDarkYellow: '#CA8A04',
  primaryLightYellowE8: '#FEFCE8',
  primaryBlack72: '#00000072',
  primaryBlackOriginal: '#000000',
  rejectRed: '#FF2D55',
  cardBorder: '#EDF1F3',
  backgroundLight: '#F6F9FD',
  textDark: '#2B3038',
  primaryYellow: '#EEB609',
  primaryBlue: '#1E3A8A',
  lightBlue: '#5A92F3',
  primaryBlack: '#333333',
  titleGray: '#6C7278',
  primaryWhite: '#FFFFFF',
  primaryMainPlaceholderGrey: '#6C7278',
  primaryGrey3B: '#2B313B',
  primaryPlaceholderGreyC5: '#C5C5C5',
  primaryBlack50: '#00000050',
  successLinearLigtGreyF3: '#E8EBF3',
  unfocusTabPrimary: '#A6A6A6',
  primaryTypeGrey63: '#4B5563',
  primaryLightGreenVerify97: '#00C897',
  primaryLightGreenVerifyF4: '#F0FDF4',
  primaryLightGreyF6: '#EEF1F6',
  primaryLightGrey6E: '#6E6E6E',
  primaryLightGrey68: '#5F6368',
  primaryWhite20: '#FFFFFF20',
  primaryLightOrange: '#FFEDD5',
  primaryDarkOrange: '#F97E22',
  primaryWhiteLightF3: '#EDF1F3',
  primaryLightBlue51: '#374151',
  primaryLightBlueEB: '#2563EB',
  primaryLihhtGreen4A: '#16A34A',
  primaryLightBlueF0: '#EFF6FF',
  primaryBlack38: '#2B3038',
  primaryLightOrange37: '#D4AF37',
  primaryLightOrangeE3: '#FFF8E3',
  primaryLightBlueE5: '#E5ECFF',
  primaryLightGrey69: '#696969',
  primaryLightGrey4F6: '#F3F4F6',
  primaryLightGreen50: '#4CAF50',
  primaryBlue27: '#111827',
  primaryRed60: '#FF6060',
  primaryLightGreenF4: '#EEFFF4',
  primaryGreen3B: '#00AD3B',
  primaryWhiteFF: '#F6F8FF',
  primaryLightBlue9A: '#6B779A',
  primaryBlack12: '#0A0812',
  primaryLightGrey8A: '#8A8A8A',
  primaryLightWhiteF3: '#FFF8F3',
  primaryLightOrange8D: '#FCBA8D',
  primaryLightWhiteFB: '#F9FAFB',
  primaryLightWhiteFD: '#F6F9FD',
  primaryLightBlue20: '#171A20',
  primaryLightGreenE7: '#DCFCE7',
  primaryDarkGreen3D: '#15803D',
  primaryGolden14: '#DBA514',
  primaryBlack30: '#0000004D',
  primaryGreen: '#00AD3B',
};

/** Dark mode: only the semantic colours change – the brand palette stays the same. */
export const darkColors: ColorScheme = {
  primary: '#5A92F3',
  primaryPressed: '#3F77D9',
  onPrimary: '#FFFFFF',
  primarySoft: '#1E2A44',
  primarySoftPressed: '#27365A',
  background: '#0F1115',
  surface: '#1A1D23',
  pressed: '#23272F',
  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  placeholder: '#6B7280',
  border: '#2B313B',
  error: '#FF6B81',
  errorPressed: '#E0294A',
  tabInactive: '#6B7280',
  overlay: '#00000080',

  primaryDarkYellow: '#CA8A04',
  primaryLightYellowE8: '#FEFCE8',
  primaryBlack72: '#00000072',
  rejectRed: '#FF2D55',
  cardBorder: '#EDF1F3',
  backgroundLight: '#F6F9FD',
  textDark: '#2B3038',
  primaryYellow: '#EEB609',
  primaryBlue: '#1E3A8A',
  lightBlue: '#5A92F3',
  primaryBlack: '#333333',
  titleGray: '#6C7278',
  primaryWhite: '#FFFFFF',
  primaryMainPlaceholderGrey: '#6C7278',
  primaryGrey3B: '#2B313B',
  primaryPlaceholderGreyC5: '#C5C5C5',
  primaryBlack50: '#00000050',
  successLinearLigtGreyF3: '#E8EBF3',
  unfocusTabPrimary: '#A6A6A6',
  primaryTypeGrey63: '#4B5563',
  primaryLightGreenVerify97: '#00C897',
  primaryLightGreenVerifyF4: '#F0FDF4',
  primaryLightGreyF6: '#EEF1F6',
  primaryLightGrey6E: '#6E6E6E',
  primaryLightGrey68: '#5F6368',
  primaryWhite20: '#FFFFFF20',
  primaryLightOrange: '#FFEDD5',
  primaryDarkOrange: '#F97E22',
  primaryWhiteLightF3: '#EDF1F3',
  primaryLightBlue51: '#374151',
  primaryLightBlueEB: '#2563EB',
  primaryLihhtGreen4A: '#16A34A',
  primaryLightBlueF0: '#EFF6FF',
  primaryBlack38: '#2B3038',
  primaryLightOrange37: '#D4AF37',
  primaryLightOrangeE3: '#FFF8E3',
  primaryLightBlueE5: '#E5ECFF',
  primaryLightGrey69: '#696969',
  primaryLightGrey4F6: '#F3F4F6',
  primaryLightGreen50: '#4CAF50',
  primaryBlue27: '#111827',
  primaryRed60: '#FF6060',
  primaryLightGreenF4: '#EEFFF4',
  primaryGreen3B: '#00AD3B',
  primaryWhiteFF: '#F6F8FF',
  primaryLightBlue9A: '#6B779A',
  primaryBlack12: '#0A0812',
  primaryLightGrey8A: '#8A8A8A',
  primaryLightWhiteF3: '#FFF8F3',
  primaryLightOrange8D: '#FCBA8D',
  primaryLightWhiteFB: '#F9FAFB',
  primaryLightWhiteFD: '#F6F9FD',
  primaryLightBlue20: '#171A20',
  primaryLightGreenE7: '#DCFCE7',
  primaryDarkGreen3D: '#15803D',
  primaryGolden14: '#DBA514',
  primaryBlack30: '#0000004D',
  primaryBlackOriginal: '#000000',
  primaryGreen: '#00AD3B',
};
