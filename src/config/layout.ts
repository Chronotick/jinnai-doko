/**
 * 画面幅から描画サイズを求めるヘルパー。
 *
 * 端末幅が確定する前の初回レンダリングでは useWindowDimensions が 0 を返すことがあり、
 * そのまま計算すると SVG に負の幅が渡ってしまう。ここで必ず下限を設けている。
 */
import { spacing } from './theme';

/** 画面の左右パディング（Screen コンポーネントと揃える） */
export const SCREEN_HORIZONTAL_PADDING = spacing.lg;

const FIELD_MIN = 220;
const FIELD_MAX = 460;

/** フィールド（円）の一辺の描画サイズ */
export function fieldSizeFor(windowWidth: number): number {
  const available = windowWidth - SCREEN_HORIZONTAL_PADDING * 2;
  return Math.max(FIELD_MIN, Math.min(available, FIELD_MAX));
}

/** 2 つ並べるドーナツの直径 */
export function donutSizeFor(windowWidth: number, maxSize = 150): number {
  const available = (windowWidth - SCREEN_HORIZONTAL_PADDING * 2 - spacing.md) / 2;
  return Math.max(96, Math.min(maxSize, available));
}
