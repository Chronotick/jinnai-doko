/**
 * ゲームドメインの型定義。UI からは独立しており、
 * 将来オンライン対戦でサーバーと共有することを想定した純データ構造にしている。
 */
import type { AnimalKind } from './animals';

/** 0 = プレイヤー1, 1 = プレイヤー2 */
export type PlayerIndex = 0 | 1;

/** 幾何図形（すべて凸） */
export type GeometricShapeKind =
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'square'
  | 'pentagon'
  | 'hexagon';

/** 動物図形は凹形状を含むため、内部的には三角形分割して扱う（shapes.ts 参照） */
export type ShapeKind = GeometricShapeKind | AnimalKind;

/** 動物図形の描画モード。判定ジオメトリには影響しない。 */
export type AnimalRenderMode = 'illustration' | 'silhouette';

/**
 * フィールド上の図形。
 * 座標系はフィールド半径 = 1 の正規化座標（原点 = フィールド中心, +y = 画面上方向）。
 * `size` は図形ごとの代表寸法（原点からの最遠点までの距離 = 外接円半径）。
 */
export interface Shape {
  kind: ShapeKind;
  cx: number;
  cy: number;
  size: number;
  /** ラジアン */
  rotation: number;
}

export type ConditionKind =
  | 'boundary_through_origin'
  | 'contains_origin'
  | 'crosses_x_axis'
  | 'crosses_y_axis'
  | 'center_in_region'
  | 'inside_quadrant'
  | 'touches_field_edge';

/** 「指定された範囲」の定義。条件の追加に合わせて増やせる。 */
export type RegionId =
  | 'quadrant1'
  | 'quadrant2'
  | 'quadrant3'
  | 'quadrant4'
  | 'inner_square'
  | 'outer_ring'
  | 'upper_half'
  | 'right_half';

/** ラウンドごとに提示される配置条件（種類 + パラメータ）。 */
export interface PlacementCondition {
  kind: ConditionKind;
  region?: RegionId;
}

/**
 * ラウンドの出題内容。
 *
 * `shapeCandidates` と `condition` は **守り側だけに見せる秘密情報**。
 * 攻め側へ渡す状態には含めないこと（visibility.ts の attackerView を使う）。
 */
export interface RoundSpec {
  /** 0 始まり */
  index: number;
  /** そのラウンドの配点（全ラウンドの合計が 100）。守り側の図形面積とは独立。 */
  scoreWeight: number;
  /** 守り側が選べる図形の候補 */
  shapeCandidates: ShapeKind[];
  /** 守り側が満たすべき配置条件 */
  condition: PlacementCondition;
}

export interface AskedQuestion {
  id: string;
  text: string;
  answer: boolean;
  answerText: string;
  /** この質問が攻撃可能サイズを減らしたか（無料質問なら false） */
  penalized: boolean;
}

/** 1 ターン分の確定結果。結果画面でのみ参照されるので秘密情報を含んでよい。 */
export interface TurnRecord {
  roundIndex: number;
  /** ラウンド内のターン番号（0 または 1） */
  turnIndex: 0 | 1;
  attacker: PlayerIndex;
  defender: PlayerIndex;
  /** ラウンドの配点 */
  scoreWeight: number;
  /** 守り側が選んだ図形種別 */
  shapeKind: ShapeKind;
  condition: PlacementCondition;
  questionCount: number;
  /** 無料だった質問の回数 */
  freeQuestionCount: number;
  askedQuestions: AskedQuestion[];
  /** 質問回数に対応する攻撃可能倍率（例: 2.0） */
  attackMultiplier: number;
  /** 攻撃可能な最大被覆率（フィールド全体に対する %） */
  maxAttackCoverage: number;
  defenseShape: Shape;
  attackShape: Shape;
  /** フィールド円の内側だけを数えた被覆率 (%) */
  defenseCoverage: number;
  attackCoverage: number;
  overlapCoverage: number;
  /** 的中率 (%) = 重複 ÷ 守り側の被覆面積 × 100 */
  hitRate: number;
  /** 今回削った割合 (%) = 配点 × 的中率 ÷ 100 */
  carved: number;
}

export type ConditionMode = 'random' | 'custom';

export interface GameSettings {
  roundCount: number;
  playerNames: [string, string];
  conditionMode: ConditionMode;
  /** カスタムモードで使用する条件プール（ランダムモードでは全条件を使用） */
  allowedConditions: ConditionKind[];
  /** カスタムモードで使用する図形プール */
  allowedShapes: ShapeKind[];
  /** 各ラウンドの 1 ターン目に攻め側となるプレイヤー。'random' は開始時に抽選。 */
  firstAttacker: PlayerIndex | 'random';
  /** 動物図形の描画モード。判定には影響しない見た目だけの設定。 */
  animalRenderMode: AnimalRenderMode;
}

export type GamePhase =
  | 'home'
  | 'roundIntro'
  | 'handoff'
  | 'defense'
  | 'question'
  | 'attack'
  | 'turnResult'
  | 'roundResult'
  | 'final';

/** 端末受け渡し画面の内容。 */
export interface HandoffInfo {
  toPlayer: PlayerIndex;
  roleLabel: string;
  message: string;
  nextPhase: Extract<GamePhase, 'defense' | 'question'>;
}

export interface GameState {
  phase: GamePhase;
  settings: GameSettings;
  seed: number;
  rounds: RoundSpec[];
  roundIndex: number;
  turnIndex: 0 | 1;
  attacker: PlayerIndex;
  /** 各ラウンドの 1 ターン目に攻め側となるプレイヤー（'random' 設定は開始時に確定させる） */
  firstAttacker: PlayerIndex;
  /**
   * 現在のターンで守り側が確定した図形（未確定なら null）。
   * **攻め側に見せてはいけない秘密情報**。attackerView で必ず取り除く。
   */
  defenseShape: Shape | null;
  askedQuestions: AskedQuestion[];
  attackShape: Shape | null;
  /** 直近に確定したターン結果 */
  lastTurn: TurnRecord | null;
  history: TurnRecord[];
  scores: [number, number];
  handoff: HandoffInfo | null;
}
