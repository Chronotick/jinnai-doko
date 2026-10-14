/**
 * ゲームバランスに関わる設定値。
 * ルール調整はこのファイルの値を書き換えるだけで完結するようにしている。
 */
import { ANIMAL_KINDS } from '../domain/animals';
import type { ConditionKind, GeometricShapeKind, ShapeKind } from '../domain/types';

export const FIELD_CONFIG = {
  /** 正規化座標でのフィールド半径 */
  radius: 1,
  /** 円・楕円をポリゴン近似する際の分割数（面積計算と重複計算の精度を決める） */
  circleSegments: 240,
  /** 補助正方形の面積（フィールド面積比）。仕様書 2.1 の「フィールドの 50% の面積を持つ正方形」 */
  guideSquareAreaRatio: 0.5,
} as const;

/**
 * 質問回数 → 攻撃可能サイズ（守り側の基準面積に対する倍率）。
 * 配列の index は「有料の質問回数」に対応する。要素を増やせば段階も増える。
 */
export const ATTACK_SIZE_MULTIPLIERS: readonly number[] = [2.0, 1.5, 1.0, 0.75, 0.5];

/**
 * ラウンドごとに無料で使える質問数。
 * この回数までの質問は攻撃可能サイズを減らさない。
 */
export const FREE_QUESTIONS_PER_TURN = 1;

/** 1 ターンあたりの質問回数の上限（無料ぶんを上乗せする） */
export const MAX_QUESTIONS = ATTACK_SIZE_MULTIPLIERS.length - 1 + FREE_QUESTIONS_PER_TURN;

export const ROUND_COUNT_OPTIONS: readonly number[] = [3, 4, 5, 6, 8];
export const DEFAULT_ROUND_COUNT = 5;

/**
 * 守り側がフィールド円を覆うべき面積の範囲（フィールド全体に対する %）。
 * 実際の被覆面積は、フィールド円でクリップし、重なりを二重に数えずに計算する。
 */
export const DEFENSE_COVERAGE = {
  min: 15,
  target: 20,
  max: 25,
} as const;

/** 各ラウンドへの配点の制約（合計は必ず 100%） */
export const SCORE_WEIGHT_LIMITS = {
  absoluteMin: 4,
  absoluteMax: 38,
  /** 平均値 (100 / ラウンド数) に対する下限・上限の倍率 */
  minFactor: 0.45,
  maxFactor: 1.7,
} as const;

/** 幾何条件の判定許容誤差（フィールド半径に対する比率） */
export const CONDITION_TOLERANCE = {
  originOnBoundary: 0.035,
  fieldEdgeTouch: 0.035,
} as const;

/** 楕円の短半径 / 長半径 */
export const ELLIPSE_RATIO = 0.6;

/** 守り側に提示する図形候補の数 */
export const SHAPE_CANDIDATE_COUNT = 3;

/** 攻撃側サイズスライダーの下限（最大攻撃面積に対する比率） */
export const ATTACK_MIN_AREA_FACTOR = 0.12;

/**
 * 守り側サイズスライダーの可動範囲（被覆率 %）。
 * 許容範囲の外側にも少し動かせるようにして、条件を満たしていないことが分かるようにする。
 */
export const DEFENSE_COVERAGE_SLIDER = {
  min: DEFENSE_COVERAGE.min - 6,
  max: DEFENSE_COVERAGE.max + 6,
} as const;

/** スライダーが目標被覆率付近でスナップする幅（%ポイント） */
export const DEFENSE_COVERAGE_SNAP = 0.35;

export const ALL_GEOMETRIC_SHAPE_KINDS: readonly GeometricShapeKind[] = [
  'circle',
  'ellipse',
  'triangle',
  'square',
  'pentagon',
  'hexagon',
];

export const ALL_SHAPE_KINDS: readonly ShapeKind[] = [
  ...ALL_GEOMETRIC_SHAPE_KINDS,
  ...ANIMAL_KINDS,
];

export const ALL_CONDITION_KINDS: readonly ConditionKind[] = [
  'boundary_through_origin',
  'contains_origin',
  'crosses_x_axis',
  'crosses_y_axis',
  'center_in_region',
  'inside_quadrant',
  'touches_field_edge',
];

export const DEFAULT_PLAYER_NAMES: [string, string] = ['プレイヤー1', 'プレイヤー2'];

/** 表示上の小数桁数（仕様書 2.3: 小数点以下第 2 位まで） */
export const DISPLAY_DECIMALS = 2;
