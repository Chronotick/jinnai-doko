/**
 * 単純多角形の三角形分割（耳刈り / ear clipping）。
 *
 * 既存の面積・重複計算は Sutherland–Hodgman を使っており、クリップ側が凸である
 * ことを前提にしている。動物図形のような凹多角形をそのまま渡すと結果が壊れるため、
 * 凹多角形は「互いに素な三角形（＝凸）の集合」に分解してから扱う。
 *
 * 分解後の三角形は重なりを持たないので、面積は単純な総和で厳密に求まり、
 * 他図形との重複面積も三角形ごとの総和で厳密に求まる。
 */
import { type Polygon, ensureCounterClockwise } from './polygon';
import type { Vec } from './vec';

const EPSILON = 1e-12;

const cross3 = (a: Vec, b: Vec, c: Vec): number =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

/** 三角形 abc の内部（境界含む）に p があるか */
function pointInTriangle(p: Vec, a: Vec, b: Vec, c: Vec): boolean {
  const d1 = cross3(a, b, p);
  const d2 = cross3(b, c, p);
  const d3 = cross3(c, a, p);
  const hasNegative = d1 < -EPSILON || d2 < -EPSILON || d3 < -EPSILON;
  const hasPositive = d1 > EPSILON || d2 > EPSILON || d3 > EPSILON;
  return !(hasNegative && hasPositive);
}

/** 連続した重複頂点を取り除く */
function dedupe(polygon: Polygon): Polygon {
  const result: Polygon = [];
  for (const point of polygon) {
    const last = result[result.length - 1];
    if (last && Math.abs(last.x - point.x) < 1e-9 && Math.abs(last.y - point.y) < 1e-9) continue;
    result.push(point);
  }
  const first = result[0];
  const last = result[result.length - 1];
  if (
    result.length > 1 &&
    first &&
    last &&
    Math.abs(first.x - last.x) < 1e-9 &&
    Math.abs(first.y - last.y) < 1e-9
  ) {
    result.pop();
  }
  return result;
}

/**
 * 単純多角形を三角形の集合へ分解する。
 * 凸・凹どちらでも扱えるが、自己交差する多角形は想定していない。
 */
export function triangulate(polygon: Polygon): Polygon[] {
  const points = ensureCounterClockwise(dedupe(polygon));
  const count = points.length;
  if (count < 3) return [];
  if (count === 3) return [points];

  const indices = points.map((_, index) => index);
  const triangles: Polygon[] = [];
  let guard = count * count + 16;

  while (indices.length > 3 && guard > 0) {
    guard -= 1;
    let clipped = false;

    for (let i = 0; i < indices.length; i += 1) {
      const previousIndex = indices[(i + indices.length - 1) % indices.length]!;
      const currentIndex = indices[i]!;
      const nextIndex = indices[(i + 1) % indices.length]!;
      const a = points[previousIndex]!;
      const b = points[currentIndex]!;
      const c = points[nextIndex]!;

      // 凹頂点・一直線上の頂点は耳にならない
      if (cross3(a, b, c) <= EPSILON) continue;

      let containsOther = false;
      for (const index of indices) {
        if (index === previousIndex || index === currentIndex || index === nextIndex) continue;
        if (pointInTriangle(points[index]!, a, b, c)) {
          containsOther = true;
          break;
        }
      }
      if (containsOther) continue;

      triangles.push([a, b, c]);
      indices.splice(i, 1);
      clipped = true;
      break;
    }

    // 耳が見つからない（＝想定外の入力）場合は、壊れた結果を返さずに打ち切る
    if (!clipped) break;
  }

  if (indices.length === 3) {
    triangles.push([points[indices[0]!]!, points[indices[1]!]!, points[indices[2]!]!]);
  }

  return triangles;
}

/** 多角形が自己交差していないか（図形定義の検証用） */
export function isSimplePolygon(polygon: Polygon): boolean {
  const points = dedupe(polygon);
  const n = points.length;
  if (n < 3) return false;

  const intersects = (p1: Vec, p2: Vec, p3: Vec, p4: Vec): boolean => {
    const d1 = cross3(p3, p4, p1);
    const d2 = cross3(p3, p4, p2);
    const d3 = cross3(p1, p2, p3);
    const d4 = cross3(p1, p2, p4);
    return (
      ((d1 > EPSILON && d2 < -EPSILON) || (d1 < -EPSILON && d2 > EPSILON)) &&
      ((d3 > EPSILON && d4 < -EPSILON) || (d3 < -EPSILON && d4 > EPSILON))
    );
  };

  for (let i = 0; i < n; i += 1) {
    const a1 = points[i]!;
    const a2 = points[(i + 1) % n]!;
    for (let j = i + 1; j < n; j += 1) {
      // 隣り合う辺どうしは端点を共有するので判定から外す
      if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
      const b1 = points[j]!;
      const b2 = points[(j + 1) % n]!;
      if (intersects(a1, a2, b1, b2)) return false;
    }
  }
  return true;
}
