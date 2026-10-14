/**
 * 図形の定義と面積計算。
 *
 * 図形はすべて「種別 + 中心 + 代表寸法 + 回転」というパラメトリックな表現で保持し、
 * 描画・判定の直前にポリゴンへ変換する。
 *
 * 幾何図形（円・楕円・多角形）は凸なのでポリゴン 1 枚で表せるが、
 * 動物図形は凹形状を含むため「互いに素な三角形の集合」にも分解しておく。
 * 面積・重複計算はこの凸パーツ集合（`shapeParts`）の上で行うので、
 * 凸・凹を区別せず同じコードで厳密に計算できる。
 */
import { ELLIPSE_RATIO, FIELD_CONFIG } from '../config/gameConfig';
import { ANIMAL_DEFS, isAnimalKind, type AnimalKind } from './animals';
import type { GeometricShapeKind, Shape, ShapeKind } from './types';
import { type Polygon, maxRadius, polygonArea } from './geometry/polygon';
import { triangulate } from './geometry/triangulate';
import type { Vec } from './geometry/vec';

const SEGMENTS = FIELD_CONFIG.circleSegments;

/** 見た目が自然になるよう、rotation = 0 のときの頂点角度に加えるオフセット */
const ANGLE_OFFSET: Record<GeometricShapeKind, number> = {
  circle: 0,
  ellipse: 0,
  triangle: Math.PI / 2,
  square: Math.PI / 4,
  pentagon: Math.PI / 2,
  hexagon: 0,
};

const VERTEX_COUNT: Record<GeometricShapeKind, number> = {
  circle: SEGMENTS,
  ellipse: SEGMENTS,
  triangle: 3,
  square: 4,
  pentagon: 5,
  hexagon: 6,
};

export const isAnimalShape = (kind: ShapeKind): kind is AnimalKind => isAnimalKind(kind);

const GEOMETRIC_LABELS: Record<GeometricShapeKind, string> = {
  circle: '円',
  ellipse: '楕円',
  triangle: '三角形',
  square: '四角形',
  pentagon: '五角形',
  hexagon: '六角形',
};

export const shapeLabel = (kind: ShapeKind): string =>
  isAnimalShape(kind) ? ANIMAL_DEFS[kind].label : GEOMETRIC_LABELS[kind];

/** 幾何図形か動物図形か（UI のグルーピング用） */
export const shapeFamily = (kind: ShapeKind): 'geometric' | 'animal' =>
  isAnimalShape(kind) ? 'animal' : 'geometric';

/** size = 1・中心原点・回転 0 のときの輪郭 */
function buildLocalOutline(kind: ShapeKind, segments?: number): Polygon {
  if (isAnimalShape(kind)) return ANIMAL_DEFS[kind].outline;

  const n = segments && (kind === 'circle' || kind === 'ellipse') ? segments : VERTEX_COUNT[kind];
  const offset = ANGLE_OFFSET[kind];
  const yScale = kind === 'ellipse' ? ELLIPSE_RATIO : 1;
  const points: Polygon = [];
  for (let i = 0; i < n; i += 1) {
    const angle = offset + (2 * Math.PI * i) / n;
    points.push({ x: Math.cos(angle), y: yScale * Math.sin(angle) });
  }
  return points;
}

const LOCAL_OUTLINE: Record<string, Polygon> = {};
const LOCAL_PARTS: Record<string, Polygon[]> = {};

function localOutline(kind: ShapeKind, segments?: number): Polygon {
  if (segments && (kind === 'circle' || kind === 'ellipse')) {
    return buildLocalOutline(kind, segments);
  }
  const cached = LOCAL_OUTLINE[kind];
  if (cached) return cached;
  const built = buildLocalOutline(kind);
  LOCAL_OUTLINE[kind] = built;
  return built;
}

/** size = 1 のときの凸パーツ集合。動物図形は三角形分割の結果を使う。 */
function localParts(kind: ShapeKind, segments?: number): Polygon[] {
  if (!isAnimalShape(kind)) return [localOutline(kind, segments)];
  const cached = LOCAL_PARTS[kind];
  if (cached) return cached;
  const built = triangulate(ANIMAL_DEFS[kind].outline);
  LOCAL_PARTS[kind] = built;
  return built;
}

/** size = 1 のときの面積 */
function buildUnitArea(kind: ShapeKind): number {
  return polygonArea(localOutline(kind));
}

const UNIT_AREA: Record<string, number> = {};

function unitArea(kind: ShapeKind): number {
  const cached = UNIT_AREA[kind];
  if (cached !== undefined) return cached;
  const built = buildUnitArea(kind);
  UNIT_AREA[kind] = built;
  return built;
}

/** フィールド（円）のポリゴン表現。面積比の基準となる。 */
export const FIELD_POLYGON: Polygon = buildLocalOutline('circle').map((p) => ({
  x: p.x * FIELD_CONFIG.radius,
  y: p.y * FIELD_CONFIG.radius,
}));

/** フィールド全体の面積（この値を 100% とする） */
export const FIELD_AREA = polygonArea(FIELD_POLYGON);

/** 補助正方形（フィールド面積の 50%）の半辺長 */
export const GUIDE_SQUARE_HALF = Math.sqrt(FIELD_CONFIG.guideSquareAreaRatio * FIELD_AREA) / 2;

/** 図形の中心座標 */
export const shapeCenter = (shape: Shape): Vec => ({ x: shape.cx, y: shape.cy });

function transformPolygon(local: Polygon, shape: Shape): Polygon {
  const cos = Math.cos(shape.rotation);
  const sin = Math.sin(shape.rotation);
  return local.map((p) => {
    const lx = p.x * shape.size;
    const ly = p.y * shape.size;
    return {
      x: shape.cx + lx * cos - ly * sin,
      y: shape.cy + lx * sin + ly * cos,
    };
  });
}

/** ローカル座標の点を、図形の配置に合わせて変換する（装飾の描画にも使う） */
export function transformLocalPoint(point: Vec, shape: Shape): Vec {
  const cos = Math.cos(shape.rotation);
  const sin = Math.sin(shape.rotation);
  const lx = point.x * shape.size;
  const ly = point.y * shape.size;
  return {
    x: shape.cx + lx * cos - ly * sin,
    y: shape.cy + lx * sin + ly * cos,
  };
}

/**
 * 図形の輪郭ポリゴン。
 * `segments` を渡すと円・楕円の分割数を上書きできる（配置探索を軽くする用途）。
 */
export function shapeToPolygon(shape: Shape, segments?: number): Polygon {
  return transformPolygon(localOutline(shape.kind, segments), shape);
}

/**
 * 図形を互いに素な凸多角形の集合として返す。
 * 面積・重複計算はすべてこれを通すため、凹形状でも結果が厳密になる。
 */
export function shapeParts(shape: Shape, segments?: number): Polygon[] {
  return localParts(shape.kind, segments).map((part) => transformPolygon(part, shape));
}

/** 判定に必要なジオメトリをまとめて 1 度だけ計算する */
export interface ShapeGeometry {
  shape: Shape;
  outline: Polygon;
  parts: Polygon[];
}

export function shapeGeometry(shape: Shape, segments?: number): ShapeGeometry {
  return {
    shape,
    outline: shapeToPolygon(shape, segments),
    parts: shapeParts(shape, segments),
  };
}

/** 図形の面積（フィールドでクリップしない生の面積） */
export const shapeArea = (shape: Shape): number => unitArea(shape.kind) * shape.size * shape.size;

/** フィールド全体を 100 としたときの面積割合 (%)（クリップなし） */
export const shapeAreaShare = (shape: Shape): number => (shapeArea(shape) / FIELD_AREA) * 100;

/** 指定した面積割合 (%) になる代表寸法を求める */
export function sizeForAreaShare(kind: ShapeKind, areaShare: number): number {
  const targetArea = (areaShare / 100) * FIELD_AREA;
  return Math.sqrt(Math.max(targetArea, 0) / unitArea(kind));
}

/**
 * その図形種別をフィールドに内接させたときの面積割合 (%)。
 * 例: 四角形は円に内接させても約 63.66% までしか取れない。
 */
export function maxFittableAreaShare(kind: ShapeKind): number {
  const size = FIELD_CONFIG.radius;
  return ((unitArea(kind) * size * size) / FIELD_AREA) * 100;
}

/** 原点から図形の最遠点までの距離 */
export function shapeMaxRadius(shape: Shape, segments?: number): number {
  return maxRadius(shapeToPolygon(shape, segments));
}

/**
 * 原点から図形の最遠点までの距離の上界（安価）。
 *
 * すべての図形種別はローカル座標で「中心から最遠点までが 1」になるよう
 * 正規化されている（幾何図形は外接円半径、動物図形は読み込み時のスケール）。
 * したがって |中心| + size は必ず最遠点距離以上になる。
 *
 * この値がフィールド半径以下なら、図形は確実にフィールド内に収まっている。
 * ポリゴンを組み立てずに判定できるので、被覆率計算の高速パスに使う。
 */
export function shapeOuterBound(shape: Shape): number {
  return Math.hypot(shape.cx, shape.cy) + shape.size;
}

/** ローカル輪郭の最遠点距離（1 であることを検証するためにテストから使う） */
export const localOutlineMaxRadius = (kind: ShapeKind): number => maxRadius(localOutline(kind));

/** 図形がフィールド（円）に完全に収まっているか */
export function isShapeInsideField(shape: Shape): boolean {
  return shapeMaxRadius(shape) <= FIELD_CONFIG.radius + 1e-6;
}

/** 点が図形の内部にあるか（凹形状でも正しい） */
export function shapeContainsPoint(geometry: ShapeGeometry, point: Vec): boolean {
  for (const part of geometry.parts) {
    if (partContains(part, point)) return true;
  }
  return false;
}

function partContains(part: Polygon, point: Vec, epsilon = 1e-9): boolean {
  for (let i = 0; i < part.length; i += 1) {
    const a = part[i]!;
    const b = part[(i + 1) % part.length]!;
    const side = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    if (side < -epsilon) return false;
  }
  return true;
}

/** フィールドからはみ出した分だけ中心を内側へ寄せる（サイズ変更時の救済） */
export function nudgeIntoField(shape: Shape, iterations = 6): Shape {
  let current = shape;
  for (let i = 0; i < iterations; i += 1) {
    const polygon = shapeToPolygon(current);
    let worst: Vec | null = null;
    let worstDistance: number = FIELD_CONFIG.radius;
    for (const p of polygon) {
      const d = Math.hypot(p.x, p.y);
      if (d > worstDistance) {
        worstDistance = d;
        worst = p;
      }
    }
    if (!worst) return current;
    const overshoot = worstDistance - FIELD_CONFIG.radius;
    const nx = worst.x / worstDistance;
    const ny = worst.y / worstDistance;
    current = {
      ...current,
      cx: current.cx - nx * overshoot * 1.02,
      cy: current.cy - ny * overshoot * 1.02,
    };
  }
  return current;
}

/** 中心方向を保ったまま、フィールド外周に接する位置まで押し出す */
export function pushToFieldEdge(shape: Shape, angle: number): Shape {
  let low = 0;
  let high = FIELD_CONFIG.radius * 2;
  const at = (distance: number): Shape => ({
    ...shape,
    cx: Math.cos(angle) * distance,
    cy: Math.sin(angle) * distance,
  });
  for (let i = 0; i < 40; i += 1) {
    const mid = (low + high) / 2;
    if (maxRadius(shapeToPolygon(at(mid))) > FIELD_CONFIG.radius) high = mid;
    else low = mid;
  }
  return at(low);
}

/** 図形の外周上の点（t は 0〜1）。原点通過条件の配置探索に使う。 */
export function boundaryPoint(shape: Shape, t: number): Vec {
  const polygon = shapeToPolygon(shape);
  const n = polygon.length;
  const scaled = t * n;
  const index = Math.floor(scaled) % n;
  const frac = scaled - Math.floor(scaled);
  const a = polygon[index]!;
  const b = polygon[(index + 1) % n]!;
  return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
}
