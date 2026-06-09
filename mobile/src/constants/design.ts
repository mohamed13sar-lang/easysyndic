import { Platform } from 'react-native';
import { colors } from '@/constants/colors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800' as const,
    color: colors.text,
  },
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800' as const,
    color: colors.text,
  },
  h2: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800' as const,
    color: colors.text,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500' as const,
    color: colors.textSoft,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700' as const,
    color: colors.muted,
  },
} as const;

export const shadows = {
  card: Platform.select({
    web: { boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)' },
    default: { elevation: 2 },
  }),
  soft: Platform.select({
    web: { boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)' },
    default: { elevation: 1 },
  }),
} as const;

export const layout = {
  maxWidth: 1120,
  screenPadding: 20,
} as const;
