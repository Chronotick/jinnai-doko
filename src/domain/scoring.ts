/**
 * 採点ロジック。
 *   的中率   = 重複面積 ÷ 守り側の被覆面積 × 100
 *   削った割合 = ラウンドの配点 × 的中率 ÷ 100
 *
 * 面積はすべて「フィールド円の内側だけ」を数える（coverage.ts 参照）。
 */
import {
  ATTACK_SIZE_MULTIPLIERS,
  DEFENSE_COVERAGE,
  DISPLAY_DECIMALS,
  FREE_QUESTIONS_PER_TURN,
  MAX_QUESTIONS,
} from '../config/gameConfig';
import { overlapCoverage, shapeCoverage } from './coverage';
import type { AskedQuestion, PlayerIndex, RoundSpec, Shape, TurnRecord } from './types';

/**
 * 攻撃可能サイズを減らす「有料」の質問回数。
 * 各ターンの最初の FREE_QUESTIONS_PER_TURN 回は無料。
 */
export const penalizedQuestionCount = (questionCount: number): number =>
  Math.max(0, questionCount - FREE_QUESTIONS_PER_TURN);

/** これから行う質問（0 始まりの通し番号）が無料かどうか */
export const isQuestionFree = (questionIndex: number): boolean =>
  questionIndex < FREE_QUESTIONS_PER_TURN;

/** 残りの無料質問回数 */
export const freeQuestionsLeft = (questionCount: number): number =>
  Math.max(0, FREE_QUESTIONS_PER_TURN - questionCount);

/** 質問回数に対応する攻撃可能倍率 */
export function attackMultiplierFor(questionCount: number): number {
  const index = Math.min(penalizedQuestionCount(questionCount), ATTACK_SIZE_MULTIPLIERS.length - 1);
  return ATTACK_SIZE_MULTIPLIERS[index]!;
}

/**
 * 攻撃可能な最大被覆率（フィールド全体に対する %）。
 *
 * 守り側の「実際の」被覆率ではなく基準値（DEFENSE_COVERAGE.target）を使う。
 * 実際の値を使うと、攻撃可能サイズから守り側の面積が逆算できてしまうため。
 */
export function maxAttackCoverage(questionCount: number): number {
  return DEFENSE_COVERAGE.target * attackMultiplierFor(questionCount);
}

export const remainingQuestions = (questionCount: number): number =>
  Math.max(0, MAX_QUESTIONS - questionCount);

export interface TurnComputationInput {
  round: RoundSpec;
  turnIndex: 0 | 1;
  attacker: PlayerIndex;
  defender: PlayerIndex;
  askedQuestions: AskedQuestion[];
  defenseShape: Shape;
  attackShape: Shape;
}

export function computeTurnRecord(input: TurnComputationInput): TurnRecord {
  const { round, defenseShape, attackShape, askedQuestions } = input;

  const defenseCoverage = shapeCoverage(defenseShape);
  const attackCoverage = shapeCoverage(attackShape);
  const overlap = overlapCoverage(defenseShape, attackShape);

  const rawHitRate = defenseCoverage > 0 ? (overlap / defenseCoverage) * 100 : 0;
  const hitRate = Math.max(0, Math.min(100, rawHitRate));
  const questionCount = askedQuestions.length;
  const freeQuestionCount = askedQuestions.filter((question) => !question.penalized).length;

  return {
    roundIndex: round.index,
    turnIndex: input.turnIndex,
    attacker: input.attacker,
    defender: input.defender,
    scoreWeight: round.scoreWeight,
    shapeKind: defenseShape.kind,
    condition: round.condition,
    questionCount,
    freeQuestionCount,
    askedQuestions,
    attackMultiplier: attackMultiplierFor(questionCount),
    maxAttackCoverage: maxAttackCoverage(questionCount),
    defenseShape,
    attackShape,
    defenseCoverage,
    attackCoverage,
    overlapCoverage: overlap,
    hitRate,
    carved: (round.scoreWeight * hitRate) / 100,
  };
}

export const formatPercent = (value: number, decimals = DISPLAY_DECIMALS): string =>
  `${value.toFixed(decimals)}%`;

export const formatMultiplier = (multiplier: number): string => `${Math.round(multiplier * 100)}%`;
