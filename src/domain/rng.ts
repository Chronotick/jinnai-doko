/**
 * シード付き擬似乱数。
 * 同じシードから同じ盤面を再生成できるため、将来のオンライン対戦（サーバーが
 * シードだけを配る方式）やリプレイにそのまま流用できる。
 */
export interface Rng {
  next(): number;
  int(maxExclusive: number): number;
  range(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (maxExclusive: number) => Math.floor(next() * maxExclusive),
    range: (min: number, max: number) => min + next() * (max - min),
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('pick() received an empty list');
      return items[Math.floor(next() * items.length)] as T;
    },
  };
}

export const randomSeed = (): number => Math.floor(Math.random() * 0xffffffff) >>> 0;
