/**
 * ラウンド生成。
 *
 * - 100% の配点を各ラウンドへランダム配分する（合計は必ず 100%）
 * - 各ラウンドの配置条件と、守り側に提示する図形候補を抽選する
 * - 「その条件では置けない図形」は配置探索で弾き、候補に出さない
 *
 * 配点と守り側の図形面積は独立している。守り側は配点に関係なく、
 * 常にフィールドの 15〜25%（DEFENSE_COVERAGE）を覆う必要がある。
 */
import {
  ALL_CONDITION_KINDS,
  ALL_SHAPE_KINDS,
  DISPLAY_DECIMALS,
  SCORE_WEIGHT_LIMITS,
  SHAPE_CANDIDATE_COUNT,
} from '../config/gameConfig';
import { CONDITION_DEFS } from './conditions';
import { isPlacementFeasible } from './placement';
import type { Rng } from './rng';
import type { ConditionKind, GameSettings, PlacementCondition, RoundSpec, ShapeKind } from './types';

const round2 = (value: number): number => {
  const factor = 10 ** DISPLAY_DECIMALS;
  return Math.round(value * factor) / factor;
};

/**
 * 100% の配点を roundCount 個に配分する。合計は必ず 100%。
 */
export function distributeScoreWeights(roundCount: number, rng: Rng): number[] {
  const average = 100 / roundCount;
  const min = Math.max(SCORE_WEIGHT_LIMITS.absoluteMin, average * SCORE_WEIGHT_LIMITS.minFactor);
  const max = Math.min(SCORE_WEIGHT_LIMITS.absoluteMax, average * SCORE_WEIGHT_LIMITS.maxFactor);
  const lowerBound = Math.min(min, average);
  const upperBound = Math.max(max, average);

  const weights = Array.from({ length: roundCount }, () => rng.next() + 0.3);
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  let shares = weights.map((w) => (w / weightSum) * 100);

  for (let iteration = 0; iteration < 60; iteration += 1) {
    shares = shares.map((share) => Math.min(upperBound, Math.max(lowerBound, share)));
    const total = shares.reduce((sum, s) => sum + s, 0);
    const diff = 100 - total;
    if (Math.abs(diff) < 1e-9) break;
    const adjustable = shares
      .map((share, index) => ({ share, index }))
      .filter(({ share }) => (diff > 0 ? share < upperBound - 1e-9 : share > lowerBound + 1e-9));
    if (adjustable.length === 0) break;
    const step = diff / adjustable.length;
    for (const { index } of adjustable) shares[index] = shares[index]! + step;
  }

  const rounded = shares.map(round2);
  const residual = round2(100 - rounded.reduce((sum, s) => sum + s, 0));
  if (Math.abs(residual) > 0) {
    let targetIndex = 0;
    for (let i = 1; i < rounded.length; i += 1) {
      if (rounded[i]! > rounded[targetIndex]!) targetIndex = i;
    }
    rounded[targetIndex] = round2(rounded[targetIndex]! + residual);
  }
  return rounded;
}

const shapePool = (settings: GameSettings): ShapeKind[] => {
  const pool = settings.conditionMode === 'custom' ? settings.allowedShapes : [...ALL_SHAPE_KINDS];
  return pool.length > 0 ? pool : [...ALL_SHAPE_KINDS];
};

const conditionPool = (settings: GameSettings): ConditionKind[] => {
  const pool =
    settings.conditionMode === 'custom' ? settings.allowedConditions : [...ALL_CONDITION_KINDS];
  return pool.length > 0 ? pool : [...ALL_CONDITION_KINDS];
};

const conditionKey = (condition: PlacementCondition): string =>
  `${condition.kind}:${condition.region ?? '-'}`;

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = rng.int(i + 1);
    const a = copy[i]!;
    const b = copy[j]!;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

/**
 * 条件に対して配置可能な図形を最大 `wanted` 個集める。
 * 連続して失敗した場合はその条件自体が厳しすぎると判断して早めに打ち切る。
 */
function collectCandidates(
  condition: PlacementCondition,
  pool: ShapeKind[],
  rng: Rng,
  memo: Map<string, boolean>,
  wanted: number,
): ShapeKind[] {
  const found: ShapeKind[] = [];
  let consecutiveFailures = 0;

  for (const kind of shuffled(pool, rng)) {
    if (found.length >= wanted) break;
    const key = `${kind}|${conditionKey(condition)}`;
    let feasible = memo.get(key);
    if (feasible === undefined) {
      feasible = isPlacementFeasible(kind, condition, rng);
      memo.set(key, feasible);
    }
    if (feasible) {
      found.push(kind);
      consecutiveFailures = 0;
    } else {
      consecutiveFailures += 1;
      if (consecutiveFailures >= 4 && found.length === 0) break;
    }
  }
  return found;
}

export function generateRounds(settings: GameSettings, rng: Rng): RoundSpec[] {
  const weights = distributeScoreWeights(settings.roundCount, rng);
  const shapes = shapePool(settings);
  const conditions = conditionPool(settings);
  const wanted = Math.min(SHAPE_CANDIDATE_COUNT, shapes.length);
  const feasibilityMemo = new Map<string, boolean>();
  const rounds: RoundSpec[] = [];
  let previousCondition: string | null = null;

  weights.forEach((scoreWeight, index) => {
    let chosen: { condition: PlacementCondition; shapeCandidates: ShapeKind[] } | null = null;

    for (let attempt = 0; attempt < 10 && !chosen; attempt += 1) {
      const condition = CONDITION_DEFS[rng.pick(conditions)].create(rng);
      // 直前のラウンドと同じ条件は序盤の試行では避け、出題に変化をつける
      if (attempt < 4 && conditionKey(condition) === previousCondition) continue;
      const candidates = collectCandidates(condition, shapes, rng, feasibilityMemo, wanted);
      if (candidates.length >= Math.min(2, wanted)) {
        chosen = { condition, shapeCandidates: candidates };
      }
    }

    const fallbackCondition: PlacementCondition = { kind: 'contains_origin' };
    const fallback = {
      condition: fallbackCondition,
      shapeCandidates: collectCandidates(fallbackCondition, shapes, rng, feasibilityMemo, wanted),
    };
    const result = chosen ?? fallback;
    if (result.shapeCandidates.length === 0) result.shapeCandidates = ['circle'];

    previousCondition = conditionKey(result.condition);
    rounds.push({
      index,
      scoreWeight,
      shapeCandidates: result.shapeCandidates,
      condition: result.condition,
    });
  });

  return rounds;
}
