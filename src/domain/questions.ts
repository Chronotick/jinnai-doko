/**
 * 絞り込み質問のレジストリ。
 *
 * 守り側の図形は攻め側に一切見えないため、位置だけでなく
 * 「どんな図形か」も質問で特定する必要がある。
 *
 * 回答は守り側プレイヤーではなくシステムが図形データから自動判定する。
 * 質問を追加する場合は QUESTION_DEFS に 1 件足すだけでよい。
 */
import { FIELD_CONFIG } from '../config/gameConfig';
import type { AskedQuestion } from './types';
import {
  crossesHorizontalAxis,
  crossesVerticalAxis,
  intersectionArea,
  polygonBounds,
  type Polygon,
} from './geometry/polygon';
import { ORIGIN } from './geometry/vec';
import {
  GUIDE_SQUARE_HALF,
  isAnimalShape,
  shapeContainsPoint,
  type ShapeGeometry,
} from './shapes';

export interface QuestionDef {
  id: string;
  text: string;
  /** 短縮ラベル（結果画面などの一覧表示用） */
  shortText: string;
  yesLabel: string;
  noLabel: string;
  evaluate(geometry: ShapeGeometry): boolean;
}

const GUIDE_SQUARE: Polygon = [
  { x: -GUIDE_SQUARE_HALF, y: -GUIDE_SQUARE_HALF },
  { x: GUIDE_SQUARE_HALF, y: -GUIDE_SQUARE_HALF },
  { x: GUIDE_SQUARE_HALF, y: GUIDE_SQUARE_HALF },
  { x: -GUIDE_SQUARE_HALF, y: GUIDE_SQUARE_HALF },
];

const farthestRadius = (geometry: ShapeGeometry): number => {
  let far = 0;
  for (const p of geometry.outline) far = Math.max(far, Math.hypot(p.x, p.y));
  return far;
};

export const QUESTION_DEFS: QuestionDef[] = [
  {
    id: 'is_animal',
    text: '守り側の図形は動物の形ですか？',
    shortText: '動物の形？',
    yesLabel: 'はい（動物の形）',
    noLabel: 'いいえ（幾何図形）',
    evaluate: ({ shape }) => isAnimalShape(shape.kind),
  },
  {
    id: 'center_above_x_axis',
    text: '図形の中心はX軸より上ですか？',
    shortText: '中心はX軸より上？',
    yesLabel: 'はい（中心はX軸より上）',
    noLabel: 'いいえ（中心はX軸より下）',
    evaluate: ({ shape }) => shape.cy > 0,
  },
  {
    id: 'center_right_of_y_axis',
    text: '図形の中心はY軸より右ですか？',
    shortText: '中心はY軸より右？',
    yesLabel: 'はい（中心はY軸より右）',
    noLabel: 'いいえ（中心はY軸より左）',
    evaluate: ({ shape }) => shape.cx > 0,
  },
  {
    id: 'crosses_x_axis',
    text: '図形はX軸と交差していますか？',
    shortText: 'X軸と交差？',
    yesLabel: 'はい（X軸と交差している）',
    noLabel: 'いいえ（X軸と交差していない）',
    evaluate: ({ outline }) => crossesHorizontalAxis(outline),
  },
  {
    id: 'crosses_y_axis',
    text: '図形はY軸と交差していますか？',
    shortText: 'Y軸と交差？',
    yesLabel: 'はい（Y軸と交差している）',
    noLabel: 'いいえ（Y軸と交差していない）',
    evaluate: ({ outline }) => crossesVerticalAxis(outline),
  },
  {
    id: 'contains_origin',
    text: '図形は原点を含んでいますか？',
    shortText: '原点を含む？',
    yesLabel: 'はい（原点を含む）',
    noLabel: 'いいえ（原点を含まない）',
    evaluate: (geometry) => shapeContainsPoint(geometry, ORIGIN),
  },
  {
    id: 'center_in_inner_square',
    text: '図形の中心は中央の補助正方形の内側にありますか？',
    shortText: '中心は補助正方形の内側？',
    yesLabel: 'はい（補助正方形の内側）',
    noLabel: 'いいえ（補助正方形の外側）',
    evaluate: ({ shape }) =>
      Math.abs(shape.cx) <= GUIDE_SQUARE_HALF && Math.abs(shape.cy) <= GUIDE_SQUARE_HALF,
  },
  {
    id: 'overlaps_inner_square',
    text: '図形は中央の補助正方形と重なっていますか？',
    shortText: '補助正方形と重なる？',
    yesLabel: 'はい（補助正方形と重なる）',
    noLabel: 'いいえ（まったく重ならない）',
    evaluate: ({ parts }) => parts.some((part) => intersectionArea(part, GUIDE_SQUARE) > 1e-9),
  },
  {
    id: 'center_far_from_origin',
    text: '図形の中心は原点からフィールド半径の半分より遠いですか？',
    shortText: '中心は原点から遠い？',
    yesLabel: 'はい（半径の半分より遠い）',
    noLabel: 'いいえ（半径の半分より近い）',
    evaluate: ({ shape }) => Math.hypot(shape.cx, shape.cy) > FIELD_CONFIG.radius * 0.5,
  },
  {
    id: 'is_wide',
    text: '図形は縦よりも横に広いですか？',
    shortText: '横長？',
    yesLabel: 'はい（横に広い）',
    noLabel: 'いいえ（縦に長い、またはほぼ同じ）',
    evaluate: ({ outline }) => {
      const bounds = polygonBounds(outline);
      return bounds.maxX - bounds.minX > bounds.maxY - bounds.minY;
    },
  },
  {
    id: 'touches_field_edge',
    text: '図形はフィールドの外周に届いていますか？',
    shortText: 'フィールド外周に届く？',
    yesLabel: 'はい（外周に届いている）',
    noLabel: 'いいえ（外周には届いていない）',
    evaluate: (geometry) => farthestRadius(geometry) >= FIELD_CONFIG.radius * 0.93,
  },
];

export const questionById = (id: string): QuestionDef | undefined =>
  QUESTION_DEFS.find((question) => question.id === id);

export function answerQuestion(
  definition: QuestionDef,
  geometry: ShapeGeometry,
  penalized: boolean,
): AskedQuestion {
  const answer = definition.evaluate(geometry);
  return {
    id: definition.id,
    text: definition.text,
    answer,
    answerText: answer ? definition.yesLabel : definition.noLabel,
    penalized,
  };
}
