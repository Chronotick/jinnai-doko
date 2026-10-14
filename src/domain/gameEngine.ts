/**
 * ゲーム進行のステートマシン。
 *
 * 純粋な reducer として実装しているため UI に依存せず、
 * 将来オンライン対戦にする際もサーバー側でそのまま再利用できる。
 */
import {
  ALL_CONDITION_KINDS,
  ALL_SHAPE_KINDS,
  DEFAULT_PLAYER_NAMES,
  DEFAULT_ROUND_COUNT,
  MAX_QUESTIONS,
} from '../config/gameConfig';
import { answerQuestion, questionById } from './questions';
import { createRng, randomSeed } from './rng';
import { generateRounds } from './roundSetup';
import { computeTurnRecord, isQuestionFree } from './scoring';
import { shapeGeometry } from './shapes';
import type {
  AnimalRenderMode,
  GameSettings,
  GameState,
  HandoffInfo,
  PlayerIndex,
  RoundSpec,
  Shape,
  TurnRecord,
} from './types';

export const otherPlayer = (player: PlayerIndex): PlayerIndex => (player === 0 ? 1 : 0);

export const defaultSettings = (): GameSettings => ({
  roundCount: DEFAULT_ROUND_COUNT,
  playerNames: [...DEFAULT_PLAYER_NAMES] as [string, string],
  conditionMode: 'random',
  allowedConditions: [...ALL_CONDITION_KINDS],
  allowedShapes: [...ALL_SHAPE_KINDS],
  firstAttacker: 0,
  animalRenderMode: 'illustration',
});

export const initialGameState = (): GameState => ({
  phase: 'home',
  settings: defaultSettings(),
  seed: 0,
  rounds: [],
  roundIndex: 0,
  turnIndex: 0,
  attacker: 0,
  firstAttacker: 0,
  defenseShape: null,
  askedQuestions: [],
  attackShape: null,
  lastTurn: null,
  history: [],
  scores: [0, 0],
  handoff: null,
});

export type GameAction =
  | { type: 'START_GAME'; settings: GameSettings; seed?: number }
  | { type: 'BEGIN_ROUND' }
  | { type: 'HANDOFF_CONTINUE' }
  | { type: 'CONFIRM_DEFENSE'; shape: Shape }
  | { type: 'ASK_QUESTION'; questionId: string }
  | { type: 'END_QUESTIONS' }
  | { type: 'CONFIRM_ATTACK'; shape: Shape }
  | { type: 'NEXT_AFTER_TURN' }
  | { type: 'NEXT_AFTER_ROUND' }
  | { type: 'SET_ANIMAL_RENDER_MODE'; mode: AnimalRenderMode }
  | { type: 'PLAY_AGAIN' };

const handoffToDefender = (defender: PlayerIndex): HandoffInfo => ({
  toPlayer: defender,
  roleLabel: '守り',
  message: '図形を選んで配置します。相手に画面が見えない状態で操作してください。',
  nextPhase: 'defense',
});

const handoffToAttacker = (attacker: PlayerIndex): HandoffInfo => ({
  toPlayer: attacker,
  roleLabel: '攻め',
  message:
    '守り側の配置が完了しました。図形も位置も伏せられています。質問で絞り込んでから攻撃してください。',
  nextPhase: 'question',
});

const clearTurnWork = (state: GameState): GameState => ({
  ...state,
  defenseShape: null,
  askedQuestions: [],
  attackShape: null,
});

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const seed = action.seed ?? randomSeed();
      const rng = createRng(seed);
      const rounds = generateRounds(action.settings, rng);
      const firstAttacker: PlayerIndex =
        action.settings.firstAttacker === 'random'
          ? ((rng.int(2) as PlayerIndex) ?? 0)
          : action.settings.firstAttacker;
      return {
        ...initialGameState(),
        phase: 'roundIntro',
        settings: action.settings,
        seed,
        rounds,
        roundIndex: 0,
        turnIndex: 0,
        attacker: firstAttacker,
        firstAttacker,
      };
    }

    case 'BEGIN_ROUND': {
      const defender = otherPlayer(state.attacker);
      return {
        ...clearTurnWork(state),
        phase: 'handoff',
        handoff: handoffToDefender(defender),
      };
    }

    case 'HANDOFF_CONTINUE': {
      if (!state.handoff) return state;
      return { ...state, phase: state.handoff.nextPhase, handoff: null };
    }

    case 'CONFIRM_DEFENSE': {
      return {
        ...state,
        defenseShape: action.shape,
        askedQuestions: [],
        attackShape: null,
        phase: 'handoff',
        handoff: handoffToAttacker(state.attacker),
      };
    }

    case 'ASK_QUESTION': {
      if (state.askedQuestions.length >= MAX_QUESTIONS) return state;
      if (state.askedQuestions.some((question) => question.id === action.questionId)) return state;
      const definition = questionById(action.questionId);
      if (!definition || !state.defenseShape) return state;
      const asked = answerQuestion(
        definition,
        shapeGeometry(state.defenseShape),
        !isQuestionFree(state.askedQuestions.length),
      );
      return { ...state, askedQuestions: [...state.askedQuestions, asked] };
    }

    case 'END_QUESTIONS': {
      return { ...state, phase: 'attack' };
    }

    case 'CONFIRM_ATTACK': {
      const round = state.rounds[state.roundIndex];
      if (!round || !state.defenseShape) return state;
      const record = computeTurnRecord({
        round,
        turnIndex: state.turnIndex,
        attacker: state.attacker,
        defender: otherPlayer(state.attacker),
        askedQuestions: state.askedQuestions,
        defenseShape: state.defenseShape,
        attackShape: action.shape,
      });
      const scores: [number, number] = [...state.scores] as [number, number];
      scores[state.attacker] += record.carved;
      return {
        ...state,
        attackShape: action.shape,
        lastTurn: record,
        history: [...state.history, record],
        scores,
        phase: 'turnResult',
      };
    }

    case 'NEXT_AFTER_TURN': {
      if (state.turnIndex === 0) {
        const nextAttacker = otherPlayer(state.attacker);
        return {
          ...clearTurnWork(state),
          turnIndex: 1,
          attacker: nextAttacker,
          phase: 'handoff',
          handoff: handoffToDefender(otherPlayer(nextAttacker)),
        };
      }
      return { ...state, phase: 'roundResult' };
    }

    case 'NEXT_AFTER_ROUND': {
      const nextRoundIndex = state.roundIndex + 1;
      if (nextRoundIndex >= state.rounds.length) {
        return { ...state, phase: 'final' };
      }
      return {
        ...clearTurnWork(state),
        roundIndex: nextRoundIndex,
        turnIndex: 0,
        attacker: state.firstAttacker,
        phase: 'roundIntro',
      };
    }

    case 'SET_ANIMAL_RENDER_MODE': {
      return { ...state, settings: { ...state.settings, animalRenderMode: action.mode } };
    }

    case 'PLAY_AGAIN': {
      return { ...initialGameState(), settings: state.settings };
    }

    default:
      return state;
  }
}

// --- セレクタ -----------------------------------------------------------

export const currentRound = (state: GameState): RoundSpec | null =>
  state.rounds[state.roundIndex] ?? null;

export const currentDefender = (state: GameState): PlayerIndex => otherPlayer(state.attacker);

export const playerName = (state: GameState, player: PlayerIndex): string =>
  state.settings.playerNames[player] || DEFAULT_PLAYER_NAMES[player];

export const turnsOfRound = (state: GameState, roundIndex: number): TurnRecord[] =>
  state.history.filter((record) => record.roundIndex === roundIndex);

export const winnerOf = (state: GameState): PlayerIndex | 'draw' => {
  const [a, b] = state.scores;
  if (Math.abs(a - b) < 1e-9) return 'draw';
  return a > b ? 0 : 1;
};
