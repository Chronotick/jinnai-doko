/**
 * 配置条件のレジストリ。
 *
 * 条件は「種類 (ConditionKind) + パラメータ」のデータとして表現し、
 * 判定ロジックはこのファイルの CONDITION_DEFS に閉じ込めている。
 * 新しい条件を追加する場合は ConditionKind に種類を足し、ここに定義を 1 つ追加するだけでよい。
 *
 * 判定には ShapeGeometry（輪郭 + 凸パーツ集合）を渡すため、
 * 動物図形のような凹形状でも同じ定義がそのまま使える。
 */
import { CONDITION_TOLERANCE, FIELD_CONFIG } from '../config/gameConfig';
import type { ConditionKind, PlacementCondition } from './types';
import {
  crossesHorizontalAxis,
  crossesVerticalAxis,
  distanceToBoundary,
} from './geometry/polygon';
import { ORIGIN } from './geometry/vec';
import { CENTER_REGIONS, QUADRANT_REGIONS, isInRegion, regionLabel } from './regions';
import type { Rng } from './rng';
import { shapeCenter, shapeContainsPoint, type ShapeGeometry } from './shapes';

export interface ConditionDef {
  kind: ConditionKind;
  /** ホーム画面のカスタム設定で表示する短いラベル */
  shortLabel: string;
  /** 守り側に提示する説明文 */
  describe(condition: PlacementCondition): string;
  /** 守り側のチェックリストに表示する文言 */
  checkLabel(condition: PlacementCondition): string;
  test(geometry: ShapeGeometry, condition: PlacementCondition): boolean;
  /** ランダム生成時にパラメータを決める */
  create(rng: Rng): PlacementCondition;
}

const boundaryTolerance = CONDITION_TOLERANCE.originOnBoundary * FIELD_CONFIG.radius;
const edgeTolerance = CONDITION_TOLERANCE.fieldEdgeTouch * FIELD_CONFIG.radius;

const farthestRadius = (geometry: ShapeGeometry): number => {
  let far = 0;
  for (const p of geometry.outline) far = Math.max(far, Math.hypot(p.x, p.y));
  return far;
};

export const CONDITION_DEFS: Record<ConditionKind, ConditionDef> = {
  boundary_through_origin: {
    kind: 'boundary_through_origin',
    shortLabel: '外周が原点を通る',
    describe: () => '図形の外周が原点を通ること',
    checkLabel: () => '外周が原点を通る',
    test: (geometry) => distanceToBoundary(ORIGIN, geometry.outline) <= boundaryTolerance,
    create: () => ({ kind: 'boundary_through_origin' }),
  },

  contains_origin: {
    kind: 'contains_origin',
    shortLabel: '原点を含む',
    describe: () => '図形が原点を含むこと',
    checkLabel: () => '原点を含む',
    test: (geometry) => shapeContainsPoint(geometry, ORIGIN),
    create: () => ({ kind: 'contains_origin' }),
  },

  crosses_x_axis: {
    kind: 'crosses_x_axis',
    shortLabel: 'X軸と交差',
    describe: () => '図形がX軸と交差すること',
    checkLabel: () => 'X軸と交差している',
    test: (geometry) => crossesHorizontalAxis(geometry.outline),
    create: () => ({ kind: 'crosses_x_axis' }),
  },

  crosses_y_axis: {
    kind: 'crosses_y_axis',
    shortLabel: 'Y軸と交差',
    describe: () => '図形がY軸と交差すること',
    checkLabel: () => 'Y軸と交差している',
    test: (geometry) => crossesVerticalAxis(geometry.outline),
    create: () => ({ kind: 'crosses_y_axis' }),
  },

  center_in_region: {
    kind: 'center_in_region',
    shortLabel: '中心が指定範囲内',
    describe: (condition) =>
      `図形の中心が「${regionLabel(condition.region ?? 'inner_square')}」にあること`,
    checkLabel: (condition) => `中心が${regionLabel(condition.region ?? 'inner_square')}にある`,
    test: (geometry, condition) =>
      isInRegion(shapeCenter(geometry.shape), condition.region ?? 'inner_square'),
    create: (rng) => ({ kind: 'center_in_region', region: rng.pick(CENTER_REGIONS) }),
  },

  inside_quadrant: {
    kind: 'inside_quadrant',
    shortLabel: '図形全体が象限内',
    describe: (condition) =>
      `図形全体が「${regionLabel(condition.region ?? 'quadrant1')}」に収まること`,
    checkLabel: (condition) => `全体が${regionLabel(condition.region ?? 'quadrant1')}に収まる`,
    test: (geometry, condition) => {
      const region = condition.region ?? 'quadrant1';
      return geometry.outline.every((point) => isInRegion(point, region));
    },
    create: (rng) => ({ kind: 'inside_quadrant', region: rng.pick(QUADRANT_REGIONS) }),
  },

  touches_field_edge: {
    kind: 'touches_field_edge',
    shortLabel: 'フィールド外周に届く',
    describe: () => '図形がフィールドの外周に届くこと',
    checkLabel: () => 'フィールド外周に届いている',
    test: (geometry) => farthestRadius(geometry) >= FIELD_CONFIG.radius - edgeTolerance,
    create: () => ({ kind: 'touches_field_edge' }),
  },
};

export const conditionDef = (condition: PlacementCondition): ConditionDef =>
  CONDITION_DEFS[condition.kind];

export const describeCondition = (condition: PlacementCondition): string =>
  conditionDef(condition).describe(condition);

export const conditionCheckLabel = (condition: PlacementCondition): string =>
  conditionDef(condition).checkLabel(condition);

export const testCondition = (
  condition: PlacementCondition,
  geometry: ShapeGeometry,
): boolean => conditionDef(condition).test(geometry, condition);
