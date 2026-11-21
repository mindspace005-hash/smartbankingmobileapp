import { TextStyle } from 'react-native';

export type ThemeType = 'emerald' | 'teal' | 'cream';

export interface SemanticPalette {
  success: string;
  successBg: string;
  successText: string;
  warning: string;
  warningBg: string;
  warningText: string;
  danger: string;
  dangerBg: string;
  dangerText: string;
  info: string;
  infoBg: string;
  infoText: string;
}

export interface ThemeColors extends SemanticPalette {
  primaryDark: string;
  primaryMid: string;
  primary: string;
  primaryLight: string;
  gradientColors: readonly [string, string, string];
  background: string;
  card: string;
  surfaceMuted: string;
  border: string;
  divider: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  headerSubtext: string;
}

const SEMANTIC: SemanticPalette = {
  success: '#10B981',
  successBg: '#DCFCE7',
  successText: '#047857',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  warningText: '#B45309',
  danger: '#EF4444',
  dangerBg: '#FEE2E2',
  dangerText: '#B91C1C',
  info: '#0D9488',
  infoBg: '#CCFBF1',
  infoText: '#0F766E',
};

export const THEME_PALETTES: Record<ThemeType, ThemeColors> = {
  emerald: {
    ...SEMANTIC,
    primaryDark: '#064E3B',
    primaryMid: '#047857',
    primary: '#059669',
    primaryLight: '#10B981',
    gradientColors: ['#064E3B', '#047857', '#059669'],
    background: '#F2F7F5',
    card: '#FFFFFF',
    surfaceMuted: '#F7FBF9',
    border: '#D1E7DD',
    divider: '#E6F2EC',
    text: '#0F291E',
    textSecondary: '#335C4B',
    textMuted: '#5C7D6F',
    headerSubtext: '#A7F3D0',
  },
  teal: {
    ...SEMANTIC,
    primaryDark: '#134E4A',
    primaryMid: '#115E59',
    primary: '#0D9488',
    primaryLight: '#14B8A6',
    gradientColors: ['#134E4A', '#115E59', '#0D9488'],
    background: '#F0F9FA',
    card: '#FFFFFF',
    surfaceMuted: '#F5FCFC',
    border: '#CCFBF1',
    divider: '#E2F5F5',
    text: '#1E293B',
    textSecondary: '#475569',
    textMuted: '#64748B',
    headerSubtext: '#99F6E4',
  },
  cream: {
    ...SEMANTIC,
    primaryDark: '#7C2D12',
    primaryMid: '#9A3412',
    primary: '#D97706',
    primaryLight: '#F59E0B',
    gradientColors: ['#7C2D12', '#B45309', '#D97706'],
    background: '#FFFDF7',
    card: '#FFFFFF',
    surfaceMuted: '#FFF7ED',
    border: '#FED7AA',
    divider: '#FFEDD5',
    text: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#78716C',
    headerSubtext: '#FED7AA',
  },
};

export const PRODUCT_THEME = {
  PIGMY: {
    accent: '#047857',
    bg: '#DCFCE7',
    border: '#A7F3D0',
    labelMr: 'दैनिक पिग्मी',
    labelEn: 'Pigmy Deposit',
  },
  LOAN: {
    accent: '#B45309',
    bg: '#FEF3C7',
    border: '#FDE68A',
    labelMr: 'कर्ज हप्ता',
    labelEn: 'Loan EMI',
  },
  SAVING: {
    accent: '#0F766E',
    bg: '#CCFBF1',
    border: '#99F6E4',
    labelMr: 'बचत ठेव',
    labelEn: 'Saving',
  },
  RD: {
    accent: '#7C2D12',
    bg: '#FFEDD5',
    border: '#FED7AA',
    labelMr: 'आवर्ती ठेव (RD)',
    labelEn: 'RD Installment',
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const TABULAR_NUMS: TextStyle = {
  fontVariant: ['tabular-nums'],
};
