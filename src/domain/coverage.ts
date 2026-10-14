/**
 * 被覆率の計算。
 *
 * 「フィールド円のうち、図形が実際に覆っている面積の割合」を求める。
 *   - フィールド円の外へはみ出した部分は数えない（円の境界でクリップする）
 *   - 複数図形が重なった部分を二重に数えない（和集合として計算する）
 *   - 凹図形（動物）は三角形分割した互いに素な凸パーツの上で計算するので厳密
 *
 * 守り側の配置はこの被覆率が規定の範囲（既定 15〜25%）に収まっている必要がある。
 */
import { DEFENSE_COVERAGE, FIELD_CONFIG } from '../config/gameConfig';
import {
  type Polygon,
  intersectConvexPolygons,
  intersectionArea,
  maxRadius,
  polygonArea,
  unionArea,
} from './geometry/polygon';
import {
  FIELD_AREA,
  FIELD_POLYGON,
  shapeAreaShare,
  shapeOuterBound,
  shapeParts,
  sizeForAreaShare,
} from './shapes';
import type { Shape } from './types';

/** パーツをフィールド円でクリップする。完全に内側なら何もしない。 */
function clipPartToField(part: Polygon): Polygon {
  if (maxRadius(part) <= FIELD_CONFIG.radius) return part;
  return intersectConvexPolygons(part, FIELD_POLYGON);
}

/** 図形のうちフィールド内に入っている部分を、互いに素な凸パーツ集合として返す */
export function clippedParts(shape: Shape): Polygon[] {
  const parts = shapeParts(shape);
  const result: Polygon[] = [];
  for (const part of parts) {
    const clipped = clipPartToField(part);
    if (clipped.length >= 3) result.push(clipped);
  }
  return result;
}

const sumArea = (parts: Polygon[]): number =>
  parts.reduce((total, part) => total + polygonArea(part), 0);

/** 複数図形がフィールド円を覆う面積（重なりは 1 回だけ数える） */
export function coveredArea(shapes: Shape[]): number {
  if (shapes.length === 0) return 0;
  if (shapes.length === 1) {
    const shape = shapes[0]!;
    // 図形全体がフィールド内なら、クリップせずに解析的な面積をそのまま使える
    if (shapeOuterBound(shape) <= FIELD_CONFIG.radius) {
      return (shapeAreaShare(shape) / 100) * FIELD_AREA;
    }
    // 1 図形のパーツは三角形分割により互いに素なので、単純な総和で厳密
    return sumArea(clippedParts(shape));
  }
  const parts: Polygon[] = [];
  for (const shape of shapes) parts.push(...clippedParts(shape));
  return unionArea(parts);
}

/** フィールド全体を 100 としたときの被覆率 (%) */
export const coverageShare = (shapes: Shape[]): number => (coveredArea(shapes) / FIELD_AREA) * 100;

/** 単一図形の被覆率 (%) */
export const shapeCoverage = (shape: Shape): number => coverageShare([shape]);

/**
 * 2 つの図形が重なっている部分の面積（フィールド内のみ）。
 * どちらのパーツ集合も互いに素なので、総当たりの総和で厳密に求まる。
 */
export function overlapArea(a: Shape, b: Shape): number {
  const partsA = clippedParts(a);
  const partsB = clippedParts(b);
  let total = 0;
  for (const pa of partsA) {
    for (const pb of partsB) {
      total += intersectionArea(pa, pb);
    }
  }
  return total;
}

/** 重なり部分がフィールド全体に占める割合 (%) */
export const overlapCoverage = (a: Shape, b: Shape): number =>
  (overlapArea(a, b) / FIELD_AREA) * 100;

/**
 * 重なり部分を多角形の集合として返す（結果画面の描画用）。
 * 凹図形どうしの重なりは 1 枚の多角形にならないため配列で返す。
 */
export function overlapPolygons(a: Shape, b: Shape): Polygon[] {
  const partsA = clippedParts(a);
  const partsB = clippedParts(b);
  const result: Polygon[] = [];
  for (const pa of partsA) {
    for (const pb of partsB) {
      const piece = intersectConvexPolygons(pa, pb);
      if (piece.length >= 3 && polygonArea(piece) > 1e-10) result.push(piece);
    }
  }
  return result;
}

/** 図形をフィールドでクリップした多角形の集合（結果画面の描画用） */
export const clippedPolygons = (shape: Shape): Polygon[] => clippedParts(shape);

/** 被覆率が守り側の許容範囲に収まっているか */
export const isCoverageInRange = (coverage: number): boolean =>
  coverage >= DEFENSE_COVERAGE.min - 1e-9 && coverage <= DEFENSE_COVERAGE.max + 1e-9;

/**
 * 中心・回転を保ったまま、被覆率が目標値になる size を求める。
 * 被覆率は size に対して単調非減少なので二分探索できる。
 */
export function sizeForCoverage(shape: Shape, targetCoverage: number): number {
  const direct = sizeForAreaShare(shape.kind, targetCoverage);
  // はみ出しがなければクリップは効かないので、解析解がそのまま答えになる
  if (shapeOuterBound({ ...shape, size: direct }) <= FIELD_CONFIG.radius) return direct;

  let low = 0;
  let high = Math.max(direct, FIELD_CONFIG.radius) * 4;
  for (let i = 0; i < 20; i += 1) {
    const mid = (low + high) / 2;
    if (shapeCoverage({ ...shape, size: mid }) < targetCoverage) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}
