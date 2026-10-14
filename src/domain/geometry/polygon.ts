/**
 * 多角形ユーティリティ。
 *
 * 円・楕円は十分細かいポリゴンに近似し、すべての面積計算・重複計算を
 * ポリゴン演算に一本化している。これにより「表示している図形」と
 * 「採点に使う図形」が完全に一致する。
 *
 * 動物図形のような凹多角形は triangulate.ts で三角形（＝凸）に分解してから扱うため、
 * ここにある凸多角形前提の関数群はそのまま再利用できる。
 */
import { type Vec, cross, sub } from './vec';

export type Polygon = Vec[];

/** 符号付き面積（反時計回りが正） */
export function signedArea(polygon: Polygon): number {
  let sum = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

export const polygonArea = (polygon: Polygon): number => Math.abs(signedArea(polygon));

export function ensureCounterClockwise(polygon: Polygon): Polygon {
  return signedArea(polygon) < 0 ? [...polygon].reverse() : polygon;
}

export function polygonCentroid(polygon: Polygon): Vec {
  const area = signedArea(polygon);
  if (Math.abs(area) < 1e-12) {
    const n = polygon.length || 1;
    return polygon.reduce((acc, p) => ({ x: acc.x + p.x / n, y: acc.y + p.y / n }), { x: 0, y: 0 });
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const f = a.x * b.y - b.x * a.y;
    cx += (a.x + b.x) * f;
    cy += (a.y + b.y) * f;
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

/** 凸多角形に対する内外判定（境界上は内側とみなす） */
export function pointInConvexPolygon(point: Vec, polygon: Polygon, epsilon = 1e-9): boolean {
  const ccw = ensureCounterClockwise(polygon);
  for (let i = 0; i < ccw.length; i += 1) {
    const a = ccw[i]!;
    const b = ccw[(i + 1) % ccw.length]!;
    if (cross(sub(b, a), sub(point, a)) < -epsilon) return false;
  }
  return true;
}

/** 一般の単純多角形に対する内外判定（レイキャスティング）。凹多角形でも正しい。 */
export function pointInPolygon(point: Vec, polygon: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    const straddles = a.y > point.y !== b.y > point.y;
    if (straddles && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

export function distanceToSegment(point: Vec, a: Vec, b: Vec): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  if (lengthSq < 1e-18) return Math.hypot(point.x - a.x, point.y - a.y);
  let t = ((point.x - a.x) * abx + (point.y - a.y) * aby) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(point.x - (a.x + abx * t), point.y - (a.y + aby * t));
}

/** 点から多角形の外周（辺）までの最短距離。内外に関わらず正の値を返す。 */
export function distanceToBoundary(point: Vec, polygon: Polygon): number {
  let best = Infinity;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    best = Math.min(best, distanceToSegment(point, a, b));
  }
  return best;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function polygonBounds(polygon: Polygon): Bounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of polygon) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

/** 原点から最も遠い頂点までの距離 */
export function maxRadius(polygon: Polygon): number {
  let best = 0;
  for (const p of polygon) best = Math.max(best, Math.hypot(p.x, p.y));
  return best;
}

/**
 * 有向直線 a→b の片側で多角形を切り取る。
 * `keepLeft` が true なら左側（反時計回り多角形の内側）、false なら右側を残す。
 */
export function clipByHalfPlane(subject: Polygon, a: Vec, b: Vec, keepLeft: boolean): Polygon {
  if (subject.length === 0) return [];
  const edgeX = b.x - a.x;
  const edgeY = b.y - a.y;
  const sign = keepLeft ? 1 : -1;
  const side = (p: Vec): number => sign * (edgeX * (p.y - a.y) - edgeY * (p.x - a.x));

  const output: Polygon = [];
  for (let j = 0; j < subject.length; j += 1) {
    const current = subject[j]!;
    const previous = subject[(j + subject.length - 1) % subject.length]!;
    const currentSide = side(current);
    const previousSide = side(previous);

    if (currentSide >= 0) {
      if (previousSide < 0) {
        const t = previousSide / (previousSide - currentSide);
        output.push({
          x: previous.x + (current.x - previous.x) * t,
          y: previous.y + (current.y - previous.y) * t,
        });
      }
      output.push(current);
    } else if (previousSide >= 0) {
      const t = previousSide / (previousSide - currentSide);
      output.push({
        x: previous.x + (current.x - previous.x) * t,
        y: previous.y + (current.y - previous.y) * t,
      });
    }
  }
  return output;
}

/**
 * Sutherland–Hodgman による凸多角形どうしのクリッピング。
 * subject / clip がともに凸であれば、結果は正確な交差多角形になる。
 */
export function intersectConvexPolygons(subject: Polygon, clip: Polygon): Polygon {
  const clipCcw = ensureCounterClockwise(clip);
  let output = ensureCounterClockwise(subject);

  for (let i = 0; i < clipCcw.length && output.length > 0; i += 1) {
    const a = clipCcw[i]!;
    const b = clipCcw[(i + 1) % clipCcw.length]!;
    output = clipByHalfPlane(output, a, b, true);
  }
  return output;
}

/** 2 つの凸多角形の重複面積 */
export function intersectionArea(a: Polygon, b: Polygon): number {
  const clipped = intersectConvexPolygons(a, b);
  return clipped.length < 3 ? 0 : polygonArea(clipped);
}

/** 2 つの多角形のバウンディングボックスが重なっているか（高速な足切り用） */
export function boundsOverlap(a: Polygon, b: Polygon): boolean {
  const ba = polygonBounds(a);
  const bb = polygonBounds(b);
  return !(ba.maxX < bb.minX || bb.maxX < ba.minX || ba.maxY < bb.minY || bb.maxY < ba.minY);
}

/**
 * 凸多角形 a から凸多角形 b を取り除いた領域を、互いに素な凸多角形の集合として返す。
 *
 * b の各辺 k について「k までの辺の内側 ∩ 辺 k の外側」を取ると、
 * それらは互いに重ならず、合わせて a \ b になる。
 */
export function subtractConvex(a: Polygon, b: Polygon): Polygon[] {
  if (a.length < 3) return [];
  if (b.length < 3 || !boundsOverlap(a, b)) return [a];

  const clip = ensureCounterClockwise(b);
  const pieces: Polygon[] = [];
  let remaining = ensureCounterClockwise(a);

  for (let i = 0; i < clip.length && remaining.length >= 3; i += 1) {
    const p = clip[i]!;
    const q = clip[(i + 1) % clip.length]!;
    const outside = clipByHalfPlane(remaining, p, q, false);
    if (outside.length >= 3 && polygonArea(outside) > 1e-12) pieces.push(outside);
    remaining = clipByHalfPlane(remaining, p, q, true);
  }
  return pieces;
}

/**
 * 互いに重なりうる凸多角形の集合について、和集合の面積を厳密に求める。
 * 重なった部分を二重に数えないよう、各要素から既出の領域を差し引いてから加算する。
 */
export function unionArea(parts: Polygon[]): number {
  const disjoint: Polygon[] = [];
  for (const part of parts) {
    if (part.length < 3) continue;
    let pending: Polygon[] = [part];
    for (const existing of disjoint) {
      if (pending.length === 0) break;
      const next: Polygon[] = [];
      for (const piece of pending) next.push(...subtractConvex(piece, existing));
      pending = next;
    }
    disjoint.push(...pending);
  }
  return disjoint.reduce((sum, piece) => sum + polygonArea(piece), 0);
}

/** 凸多角形が直線 y = 0 と交差するか */
export function crossesHorizontalAxis(polygon: Polygon): boolean {
  const { minY, maxY } = polygonBounds(polygon);
  return minY < 0 && maxY > 0;
}

/** 凸多角形が直線 x = 0 と交差するか */
export function crossesVerticalAxis(polygon: Polygon): boolean {
  const { minX, maxX } = polygonBounds(polygon);
  return minX < 0 && maxX > 0;
}

/** SVG の points 属性用の文字列に変換 */
export function toPointsString(polygon: Polygon): string {
  return polygon.map((p) => `${p.x},${p.y}`).join(' ');
}
