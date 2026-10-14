/**
 * 攻め側に見せてよい情報だけを取り出すビュー。
 *
 * 守り側の図形・配置条件・図形候補は秘密情報であり、攻め側の画面からは
 * 一切参照できてはならない。攻め側の画面は GameState を直接触らず
 * 必ずこの AttackerView 経由で描画することで、UI の実装ミスによる
 * 情報漏れを型レベルで防ぐ。
 */
import { MAX_QUESTIONS } from '../config/gameConfig';
import { currentRound, otherPlayer, playerName } from './gameEngine';
import {
  attackMultiplierFor,
  freeQuestionsLeft,
  isQuestionFree,
  maxAttackCoverage,
} from './scoring';
import type { AnimalRenderMode, AskedQuestion, GameState, PlayerIndex } from './types';

/**
 * 攻め側の画面が参照してよいデータ。
 * 守り側の図形（kind / 位置 / サイズ）と配置条件・図形候補は意図的に含めない。
 */
export interface AttackerView {
  roundNumber: number;
  roundCount: number;
  /** ラウンドの配点。守り側の図形面積とは無関係なので公開してよい。 */
  scoreWeight: number;
  attacker: PlayerIndex;
  attackerName: string;
  defenderName: string;
  /** 質問で得た手がかり（攻め側が正当に獲得した情報） */
  askedQuestions: AskedQuestion[];
  questionCount: number;
  maxQuestions: number;
  /** 次の質問が無料かどうか */
  nextQuestionIsFree: boolean;
  freeQuestionsLeft: number;
  attackMultiplier: number;
  /** 攻撃可能な最大被覆率 (%)。基準面積から計算するので実際の守備面積は漏れない。 */
  maxAttackCoverage: number;
  scores: [number, number];
  animalRenderMode: AnimalRenderMode;
}

export function attackerView(state: GameState): AttackerView | null {
  const round = currentRound(state);
  if (!round) return null;

  const questionCount = state.askedQuestions.length;
  const defender = otherPlayer(state.attacker);

  return {
    roundNumber: round.index + 1,
    roundCount: state.settings.roundCount,
    scoreWeight: round.scoreWeight,
    attacker: state.attacker,
    attackerName: playerName(state, state.attacker),
    defenderName: playerName(state, defender),
    askedQuestions: state.askedQuestions,
    questionCount,
    maxQuestions: MAX_QUESTIONS,
    nextQuestionIsFree: isQuestionFree(questionCount),
    freeQuestionsLeft: freeQuestionsLeft(questionCount),
    attackMultiplier: attackMultiplierFor(questionCount),
    maxAttackCoverage: maxAttackCoverage(questionCount),
    scores: state.scores,
    animalRenderMode: state.settings.animalRenderMode,
  };
}

/**
 * テスト用: 攻め側へ渡すデータに守り側の秘密情報が混ざっていないか検査する。
 *
 * 図形の座標・サイズ・回転は実質的に一意な浮動小数なので、値が一致したら漏洩とみなす。
 * 質問 ID は条件名と文字列が重なりうるため、`id` キーは走査対象から外している。
 */
export function findDefenseLeaks(payload: unknown, state: GameState): string[] {
  const leaks: string[] = [];
  const round = currentRound(state);
  const secretNumbers = new Map<number, string>();
  const secretStrings = new Map<string, string>();

  if (state.defenseShape) {
    const shape = state.defenseShape;
    secretNumbers.set(shape.cx, 'defenseShape.cx');
    secretNumbers.set(shape.cy, 'defenseShape.cy');
    secretNumbers.set(shape.size, 'defenseShape.size');
    secretNumbers.set(shape.rotation, 'defenseShape.rotation');
    secretStrings.set(shape.kind, 'defenseShape.kind');
  }
  if (round) {
    if (round.condition.region) secretStrings.set(round.condition.region, 'condition.region');
    for (const candidate of round.shapeCandidates) {
      secretStrings.set(candidate, 'shapeCandidates');
    }
  }

  const visit = (value: unknown, path: string, key: string | null): void => {
    if (value === null || value === undefined) return;
    if (typeof value === 'number') {
      const label = secretNumbers.get(value);
      if (label !== undefined && value !== 0) leaks.push(`${path} が ${label} と一致`);
      return;
    }
    if (typeof value === 'string') {
      if (key === 'id') return;
      const label = secretStrings.get(value);
      if (label !== undefined) leaks.push(`${path} が ${label} と一致`);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`, null));
      return;
    }
    if (typeof value === 'object') {
      for (const [childKey, child] of Object.entries(value)) {
        visit(child, `${path}.${childKey}`, childKey);
      }
    }
  };

  visit(payload, 'view', null);
  return leaks;
}
