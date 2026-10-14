import { useEffect, useRef, useState } from 'react';

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

/**
 * 目標値へ滑らかに追従する数値を返す。
 * requestAnimationFrame ベースなので Android / Web のどちらでも同じ挙動になる。
 */
export function useTween(target: number, duration = 700, delay = 0): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (Math.abs(from - target) < 1e-6 || duration <= 0) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const start = Date.now() + delay;
    const step = () => {
      const elapsed = Date.now() - start;
      if (elapsed < 0) {
        frameRef.current = requestAnimationFrame(step);
        return;
      }
      const progress = Math.min(1, elapsed / duration);
      const next = from + (target - from) * easeOutCubic(progress);
      fromRef.current = next;
      setValue(next);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };
    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, delay]);

  return value;
}

/** マウント時に 0 → 1 へ動く進捗値（登場アニメーション用） */
export function useEntrance(duration = 450, delay = 0): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame: number | null = null;
    const start = Date.now() + delay;
    const step = () => {
      const elapsed = Date.now() - start;
      const t = Math.max(0, Math.min(1, elapsed / duration));
      setProgress(easeOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [duration, delay]);
  return progress;
}
