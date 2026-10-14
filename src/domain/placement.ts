/**
 * 配置探索。
 *
 * 「配置条件を満たし、かつ被覆率が許容範囲に収まる配置」を実際に 1 つ見つける。
 * 用途は 3 つ。
 *   1. ラウンド生成時の実現可能性チェック（置けない図形を候補に出さない）
 *   2. 守り側の初期配置
 *   3. 「おまかせ配置」ボタン
 */
import { DEFENSE_COVERAGE, FIELD_CONFIG } from '../config/gameConfig';
import { testCondition } from './conditions';
import { isCoverageInRange, shapeCoverage, sizeForCoverage } from './coverage';
import { sampleInRegion } from './regions';
import type { Rng } from './rng';
import {
  boundaryPoint,
  pushToFieldEdge,
  shapeGeometry,
  sizeForAreaShare,
} from './shapes';
import type { PlacementCondition, Shape, ShapeKind } from './types';

/** 探索中の判定は粗いポリゴンで行い、確定時のずれを避けるため安全余裕を持たせる */
const SEARCH_SEGMENTS = 48;

/** 探索時に試す被覆率（上から順に試し、条件を満たした時点で採用する） */
const COVERAGE_ATTEMPTS: readonly number[] = [
  DEFENSE_COVERAGE.target,
  (DEFENSE_COVERAGE.target + DEFENSE_COVERAGE.max) / 2,
  (DEFENSE_COVERAGE.target + DEFENSE_COVERAGE.min) / 2,
  DEFENSE_COVERAGE.min + 0.5,
];

export interface PlacementSearchOptions {
  attempts?: number;
}

/** 図形の中心がフィールド内にあること（極端な置き方を防ぐ最低限の制約） */
export const isCenterInsideField = (shape: Shape): boolean =>
  Math.hypot(shape.cx, shape.cy) <= FIELD_CONFIG.radius;

/** 条件ごとに「当たりやすい」候補を作る */
function proposeCandidate(
  kind: ShapeKind,
  size: number,
  condition: PlacementCondition,
  rng: Rng,
): Shape {
  const rotation = rng.range(0, Math.PI * 2);
  const base: Shape = { kind, cx: 0, cy: 0, size, rotation };

  switch (condition.kind) {
    case 'boundary_through_origin': {
      // 外周上の 1 点を選び、その点が原点に来るよう平行移動する
      const point = boundaryPoint(base, rng.next());
      return { ...base, cx: -point.x, cy: -point.y };
    }
    case 'touches_field_edge': {
      return pushToFieldEdge(base, rng.range(0, Math.PI * 2));
    }
    case 'contains_origin': {
      const maxOffset = size * 0.6;
      const angle = rng.range(0, Math.PI * 2);
      const distance = rng.next() * maxOffset;
      return { ...base, cx: Math.cos(angle) * distance, cy: Math.sin(angle) * distance };
    }
    case 'center_in_region':
    case 'inside_quadrant': {
      const center = sampleInRegion(condition.region ?? 'inner_square', () => rng.next());
      return { ...base, cx: center.x, cy: center.y };
    }
    case 'crosses_x_axis': {
      const center = sampleInRegion('inner_square', () => rng.next());
      return { ...base, cx: center.x, cy: rng.range(-1, 1) * size * 0.7 };
    }
    case 'crosses_y_axis': {
      const center = sampleInRegion('inner_square', () => rng.next());
      return { ...base, cx: rng.range(-1, 1) * size * 0.7, cy: center.y };
    }
    default: {
      const radius = FIELD_CONFIG.radius * Math.sqrt(rng.next());
      const angle = rng.range(0, Math.PI * 2);
      return { ...base, cx: Math.cos(angle) * radius, cy: Math.sin(angle) * radius };
    }
  }
}

function satisfies(shape: Shape, condition: PlacementCondition): boolean {
  return testCondition(condition, shapeGeometry(shape, SEARCH_SEGMENTS));
}

/**
 * 条件と被覆率の両方を満たす配置を 1 つ探す。見つからなければ null。
 */
export function findValidPlacement(
  kind: ShapeKind,
  condition: PlacementCondition,
  rng: Rng,
  options: PlacementSearchOptions = {},
): Shape | null {
  const attempts = options.attempts ?? 400;
  const nominalSize = sizeForAreaShare(kind, DEFENSE_COVERAGE.target);
  if (!(nominalSize > 0)) return null;

  for (let i = 0; i < attempts; i += 1) {
    const candidate = proposeCandidate(kind, nominalSize, condition, rng);
    if (!isCenterInsideField(candidate)) continue;

    for (const targetCoverage of COVERAGE_ATTEMPTS) {
      const sized: Shape = { ...candidate, size: sizeForCoverage(candidate, targetCoverage) };
      if (!isCoverageInRange(shapeCoverage(sized))) continue;
      if (!satisfies(sized, condition)) continue;
      return sized;
    }
  }
  return null;
}

/** その図形と条件の組み合わせが成立しうるか */
export function isPlacementFeasible(
  kind: ShapeKind,
  condition: PlacementCondition,
  rng: Rng,
): boolean {
  return findValidPlacement(kind, condition, rng, { attempts: 140 }) !== null;
}
