/**
 * アプリ全体で使用するデザイントークン。
 * 色・余白・角丸・タイポグラフィをここに集約し、画面側でハードコードしない。
 */

export const colors = {
  bg: '#0D1117',
  bgElevated: '#131A24',
  surface: '#171E29',
  surfaceAlt: '#1E2733',
  border: '#2A3441',
  borderStrong: '#3A4657',

  text: '#E6EDF3',
  textMuted: '#93A1B4',
  textDim: '#64748B',

  primary: '#5B8DEF',
  primaryDark: '#3F6FD1',
  primaryText: '#F8FAFF',

  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',

  playerA: '#38BDF8',
  playerB: '#FB7185',

  defense: '#A78BFA',
  attack: '#FBBF24',
  overlap: '#34D399',

  fieldBg: '#0F1722',
  fieldEdge: '#3A4657',
  axis: '#44536A',
  guide: '#26313F',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const fontSize = {
  caption: 12,
  small: 13,
  body: 15,
  title: 18,
  heading: 22,
  display: 30,
  hero: 42,
} as const;

/** Android のタッチターゲット推奨サイズ（48dp 以上）に合わせた最小値。 */
export const touch = {
  minHeight: 52,
  minWidth: 52,
  smallMinHeight: 44,
} as const;

export const playerColor = (index: 0 | 1): string => (index === 0 ? colors.playerA : colors.playerB);
