/**
 * 動物図形の定義。
 *
 * 各動物は「輪郭（単純多角形）」と「装飾（目・鼻・耳の内側など）」を持つ。
 *
 * 当たり判定・面積計算に使われるのは **輪郭だけ** であり、装飾はいっさい関与しない。
 * そのため、イラスト表示（装飾あり）とシルエット表示（装飾なし）を切り替えても
 * 判定ジオメトリは完全に同一になる。
 *
 * 座標は原作者が描きやすい任意のスケールで記述し、読み込み時に
 *   1. 輪郭の重心が原点に来るよう平行移動
 *   2. 原点からの最遠点が 1 になるようスケール
 * して正規化する。幾何図形の「外接円半径 = size」と同じ意味づけになる。
 */
import { polygonCentroid, maxRadius, type Polygon } from './geometry/polygon';
import type { Vec } from './geometry/vec';

export type AnimalKind = 'cat' | 'rabbit' | 'bird' | 'fish' | 'bear';

/** 装飾の塗り分け。実際の色は描画側がテーマから解決する。 */
export type DetailTone = 'ink' | 'light';

export type AnimalDetail =
  | { type: 'dot'; center: Vec; radius: number; tone: DetailTone }
  | { type: 'poly'; points: Polygon; tone: DetailTone }
  | { type: 'line'; points: Polygon; width: number; tone: DetailTone };

export interface AnimalDef {
  kind: AnimalKind;
  label: string;
  /** 正規化済みの輪郭（単純多角形）。判定に使うのはこれだけ。 */
  outline: Polygon;
  /** 正規化済みの装飾。描画のみに使う。 */
  details: AnimalDetail[];
}

type RawPoint = readonly [number, number];

interface RawAnimal {
  kind: AnimalKind;
  label: string;
  outline: readonly RawPoint[];
  details: readonly RawDetail[];
}

type RawDetail =
  | { type: 'dot'; center: RawPoint; radius: number; tone: DetailTone }
  | { type: 'poly'; points: readonly RawPoint[]; tone: DetailTone }
  | { type: 'line'; points: readonly RawPoint[]; width: number; tone: DetailTone };

const RAW_ANIMALS: readonly RawAnimal[] = [
  {
    kind: 'cat',
    label: 'ねこ',
    outline: [
      [-16, 40],
      [-34, 72],
      [-40, 36],
      [-44, 14],
      [-40, -6],
      [-30, -22],
      [-34, -52],
      [-30, -74],
      [-44, -78],
      [-46, -86],
      [20, -86],
      [34, -78],
      [46, -58],
      [58, -62],
      [70, -44],
      [74, -16],
      [62, -10],
      [58, -34],
      [50, -40],
      [44, -24],
      [40, -4],
      [44, 14],
      [40, 36],
      [34, 72],
      [16, 40],
    ],
    details: [
      { type: 'poly', points: [[-32, 64], [-36, 42], [-21, 49]], tone: 'light' },
      { type: 'poly', points: [[32, 64], [36, 42], [21, 49]], tone: 'light' },
      { type: 'dot', center: [-17, 9], radius: 6, tone: 'ink' },
      { type: 'dot', center: [17, 9], radius: 6, tone: 'ink' },
      { type: 'poly', points: [[0, -7], [-8, 2], [8, 2]], tone: 'ink' },
      { type: 'line', points: [[-19, -2], [-44, -8]], width: 2.5, tone: 'ink' },
      { type: 'line', points: [[-19, -8], [-44, -20]], width: 2.5, tone: 'ink' },
      { type: 'line', points: [[19, -2], [44, -8]], width: 2.5, tone: 'ink' },
      { type: 'line', points: [[19, -8], [44, -20]], width: 2.5, tone: 'ink' },
    ],
  },
  {
    kind: 'rabbit',
    label: 'うさぎ',
    outline: [
      [-30, 24],
      [-34, 60],
      [-24, 88],
      [-12, 86],
      [-10, 44],
      [10, 44],
      [12, 86],
      [24, 88],
      [34, 60],
      [30, 24],
      [38, 6],
      [34, -14],
      [44, -30],
      [48, -58],
      [44, -78],
      [20, -84],
      [-20, -84],
      [-44, -78],
      [-48, -58],
      [-44, -30],
      [-34, -14],
      [-38, 6],
    ],
    details: [
      { type: 'poly', points: [[-27, 58], [-21, 80], [-15, 78], [-15, 48]], tone: 'light' },
      { type: 'poly', points: [[27, 58], [21, 80], [15, 78], [15, 48]], tone: 'light' },
      { type: 'dot', center: [-15, 2], radius: 5.5, tone: 'ink' },
      { type: 'dot', center: [15, 2], radius: 5.5, tone: 'ink' },
      { type: 'dot', center: [0, -14], radius: 4.5, tone: 'ink' },
      { type: 'line', points: [[0, -14], [0, -24]], width: 2.5, tone: 'ink' },
      { type: 'dot', center: [0, -58], radius: 16, tone: 'light' },
    ],
  },
  {
    kind: 'bird',
    label: 'とり',
    outline: [
      [-70, 10],
      [-40, 24],
      [-18, 40],
      [6, 46],
      [24, 62],
      [38, 60],
      [44, 44],
      [62, 36],
      [84, 28],
      [62, 16],
      [46, 20],
      [44, 8],
      [30, -4],
      [20, -26],
      [0, -40],
      [-24, -36],
      [-48, -22],
      [-72, -14],
    ],
    details: [
      { type: 'poly', points: [[-10, 20], [16, 20], [6, -10], [-22, -4]], tone: 'light' },
      { type: 'dot', center: [38, 40], radius: 5, tone: 'ink' },
      { type: 'line', points: [[48, 22], [82, 27]], width: 2.5, tone: 'ink' },
      { type: 'line', points: [[-62, 6], [-40, 2]], width: 3, tone: 'light' },
    ],
  },
  {
    kind: 'fish',
    label: 'さかな',
    outline: [
      [60, 0],
      [40, 26],
      [10, 36],
      [-20, 28],
      [-44, 18],
      [-64, 46],
      [-48, 0],
      [-64, -46],
      [-44, -18],
      [-20, -28],
      [10, -36],
      [40, -26],
    ],
    details: [
      { type: 'dot', center: [38, 6], radius: 5.5, tone: 'ink' },
      { type: 'line', points: [[24, 22], [16, 0], [24, -20]], width: 3, tone: 'ink' },
      { type: 'poly', points: [[-2, -8], [20, -16], [0, -26]], tone: 'light' },
      { type: 'poly', points: [[-8, 20], [12, 18], [0, 30]], tone: 'light' },
    ],
  },
  {
    kind: 'bear',
    label: 'くま',
    outline: [
      [-46, 20],
      [-62, 34],
      [-58, 60],
      [-34, 44],
      [-14, 52],
      [14, 52],
      [34, 44],
      [58, 60],
      [62, 34],
      [46, 20],
      [52, -2],
      [44, -30],
      [22, -50],
      [0, -54],
      [-22, -50],
      [-44, -30],
      [-52, -2],
    ],
    details: [
      { type: 'dot', center: [-51, 42], radius: 9, tone: 'light' },
      { type: 'dot', center: [51, 42], radius: 9, tone: 'light' },
      { type: 'dot', center: [0, -24], radius: 20, tone: 'light' },
      { type: 'dot', center: [-19, 6], radius: 6, tone: 'ink' },
      { type: 'dot', center: [19, 6], radius: 6, tone: 'ink' },
      { type: 'dot', center: [0, -14], radius: 7, tone: 'ink' },
      { type: 'line', points: [[0, -14], [0, -30]], width: 2.5, tone: 'ink' },
    ],
  },
];

const toVec = ([x, y]: RawPoint): Vec => ({ x, y });

function normalizeAnimal(raw: RawAnimal): AnimalDef {
  const outline = raw.outline.map(toVec);
  const centroid = polygonCentroid(outline);
  const centered = outline.map((p) => ({ x: p.x - centroid.x, y: p.y - centroid.y }));
  const scale = 1 / maxRadius(centered);

  const mapPoint = (p: Vec): Vec => ({
    x: (p.x - centroid.x) * scale,
    y: (p.y - centroid.y) * scale,
  });

  const details: AnimalDetail[] = raw.details.map((detail) => {
    switch (detail.type) {
      case 'dot':
        return {
          type: 'dot',
          center: mapPoint(toVec(detail.center)),
          radius: detail.radius * scale,
          tone: detail.tone,
        };
      case 'poly':
        return { type: 'poly', points: detail.points.map(toVec).map(mapPoint), tone: detail.tone };
      case 'line':
        return {
          type: 'line',
          points: detail.points.map(toVec).map(mapPoint),
          width: detail.width * scale,
          tone: detail.tone,
        };
    }
  });

  return {
    kind: raw.kind,
    label: raw.label,
    outline: centered.map((p) => ({ x: p.x * scale, y: p.y * scale })),
    details,
  };
}

export const ANIMAL_DEFS: Record<AnimalKind, AnimalDef> = RAW_ANIMALS.reduce(
  (acc, raw) => {
    acc[raw.kind] = normalizeAnimal(raw);
    return acc;
  },
  {} as Record<AnimalKind, AnimalDef>,
);

export const ANIMAL_KINDS: readonly AnimalKind[] = RAW_ANIMALS.map((raw) => raw.kind);

export const isAnimalKind = (kind: string): kind is AnimalKind =>
  (ANIMAL_KINDS as readonly string[]).includes(kind);
