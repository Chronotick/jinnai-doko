/**
 * 「指定された範囲」の定義。
 * 条件（conditions.ts）と質問（questions.ts）の双方から参照する。
 */
import { FIELD_CONFIG } from '../config/gameConfig';
import { GUIDE_SQUARE_HALF } from './shapes';
import type { RegionId } from './types';
import type { Vec } from './geometry/vec';

export interface RegionDef {
  id: RegionId;
  label: string;
  contains(point: Vec): boolean;
}

const H = GUIDE_SQUARE_HALF;

export const REGION_DEFS: Record<RegionId, RegionDef> = {
  quadrant1: { id: 'quadrant1', label: '第1象限（右上）', contains: (p) => p.x > 0 && p.y > 0 },
  quadrant2: { id: 'quadrant2', label: '第2象限（左上）', contains: (p) => p.x < 0 && p.y > 0 },
  quadrant3: { id: 'quadrant3', label: '第3象限（左下）', contains: (p) => p.x < 0 && p.y < 0 },
  quadrant4: { id: 'quadrant4', label: '第4象限（右下）', contains: (p) => p.x > 0 && p.y < 0 },
  inner_square: {
    id: 'inner_square',
    label: '中央の補助正方形の内側',
    contains: (p) => Math.abs(p.x) <= H && Math.abs(p.y) <= H,
  },
  outer_ring: {
    id: 'outer_ring',
    label: '中央の補助正方形の外側',
    contains: (p) => Math.abs(p.x) > H || Math.abs(p.y) > H,
  },
  upper_half: { id: 'upper_half', label: 'X軸より上', contains: (p) => p.y > 0 },
  right_half: { id: 'right_half', label: 'Y軸より右', contains: (p) => p.x > 0 },
};

export const QUADRANT_REGIONS: RegionId[] = ['quadrant1', 'quadrant2', 'quadrant3', 'quadrant4'];

export const CENTER_REGIONS: RegionId[] = [
  'quadrant1',
  'quadrant2',
  'quadrant3',
  'quadrant4',
  'inner_square',
  'outer_ring',
  'upper_half',
  'right_half',
];

export const regionLabel = (id: RegionId): string => REGION_DEFS[id].label;

export const isInRegion = (point: Vec, id: RegionId): boolean => REGION_DEFS[id].contains(point);

/**
 * 象限内にランダムな点をサンプリングする（配置探索の初期値づくり用）。
 * region が象限以外の場合はフィールド全体からサンプリングする。
 */
export function sampleInRegion(id: RegionId, random: () => number): Vec {
  const r = FIELD_CONFIG.radius * Math.sqrt(random());
  const baseAngle = 2 * Math.PI * random();
  const point = { x: r * Math.cos(baseAngle), y: r * Math.sin(baseAngle) };
  switch (id) {
    case 'quadrant1':
      return { x: Math.abs(point.x), y: Math.abs(point.y) };
    case 'quadrant2':
      return { x: -Math.abs(point.x), y: Math.abs(point.y) };
    case 'quadrant3':
      return { x: -Math.abs(point.x), y: -Math.abs(point.y) };
    case 'quadrant4':
      return { x: Math.abs(point.x), y: -Math.abs(point.y) };
    case 'upper_half':
      return { x: point.x, y: Math.abs(point.y) };
    case 'right_half':
      return { x: Math.abs(point.x), y: point.y };
    case 'inner_square':
      return { x: (random() * 2 - 1) * H, y: (random() * 2 - 1) * H };
    default:
      return point;
  }
}
