import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fontSize, radii, spacing } from '../../config/theme';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
  displayValue?: string;
  color?: string;
  /** この値の近く（±snapWindow）ではスナップする */
  snapTo?: number;
  snapWindow?: number;
  disabled?: boolean;
}

/**
 * 依存パッケージを増やさないための自前スライダー。
 *
 * 値の更新は「ドラッグの移動量」から求める。pageX の差分だけを使うため
 * Android / Web のどちらでも同じ挙動になり、タップ位置へ値が飛ぶこともないので
 * 面積の微調整に向いている。
 *
 * トラック幅は onLayout で取得するが、レイアウト通知が来ない環境でも
 * 操作不能にならないよう measureInWindow によるフォールバックを併用し、
 * つまみの位置は測定値に依存しない % 指定で描画している。
 */
export function Slider({
  value,
  min,
  max,
  onChange,
  label,
  displayValue,
  color = colors.primary,
  snapTo,
  snapWindow = 0,
  disabled = false,
}: SliderProps) {
  const trackRef = useRef<View>(null);
  const widthRef = useRef(0);
  const [, setMeasuredWidth] = useState(0);
  const dragRef = useRef<{ x: number; value: number } | null>(null);

  const applyWidth = useCallback((next: number) => {
    if (next > 0 && Math.abs(next - widthRef.current) > 0.5) {
      widthRef.current = next;
      setMeasuredWidth(next);
    }
  }, []);

  const measure = useCallback(() => {
    trackRef.current?.measureInWindow((_x, _y, measuredWidth) => applyWidth(measuredWidth));
  }, [applyWidth]);

  useEffect(() => {
    measure();
    const timer = setTimeout(measure, 120);
    return () => clearTimeout(timer);
  }, [measure]);

  const handleLayout = (event: LayoutChangeEvent) => applyWidth(event.nativeEvent.layout.width);

  const pageXOf = (event: GestureResponderEvent): number => {
    const native = event.nativeEvent;
    return Number.isFinite(native.pageX) ? native.pageX : native.locationX;
  };

  const onGrant = useCallback(
    (event: GestureResponderEvent) => {
      if (disabled) return;
      measure();
      dragRef.current = { x: pageXOf(event), value };
    },
    [disabled, measure, value],
  );

  const onMove = useCallback(
    (event: GestureResponderEvent) => {
      const start = dragRef.current;
      const trackWidth = widthRef.current;
      if (!start || disabled || trackWidth <= 0) return;
      const delta = ((pageXOf(event) - start.x) / trackWidth) * (max - min);
      let next = Math.max(min, Math.min(max, start.value + delta));
      if (snapTo !== undefined && Math.abs(next - snapTo) <= snapWindow) next = snapTo;
      onChange(next);
    },
    [disabled, max, min, onChange, snapTo, snapWindow],
  );

  const onRelease = useCallback(() => {
    dragRef.current = null;
  }, []);

  const ratio = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;
  const snapRatio =
    snapTo !== undefined && max > min
      ? Math.max(0, Math.min(1, (snapTo - min) / (max - min)))
      : null;

  return (
    <View style={styles.wrapper}>
      {label || displayValue ? (
        <View style={styles.header}>
          {label ? <Text style={styles.label}>{label}</Text> : <View />}
          {displayValue ? <Text style={[styles.value, { color }]}>{displayValue}</Text> : null}
        </View>
      ) : null}
      <View ref={trackRef} style={styles.trackArea} onLayout={handleLayout}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
        </View>
        {snapRatio !== null ? (
          <View style={[styles.snapMark, { left: `${snapRatio * 100}%` }]} />
        ) : null}
        <View
          style={[
            styles.knob,
            { left: `${ratio * 100}%`, borderColor: color, opacity: disabled ? 0.4 : 1 },
          ]}
        />
        <View
          style={styles.touchOverlay}
          onStartShouldSetResponder={() => !disabled}
          onMoveShouldSetResponder={() => !disabled}
          onResponderGrant={onGrant}
          onResponderMove={onMove}
          onResponderRelease={onRelease}
          onResponderTerminate={onRelease}
          onResponderTerminationRequest={() => false}
        />
      </View>
    </View>
  );
}

const KNOB = 28;

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '600',
  },
  value: {
    fontSize: fontSize.body,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  trackArea: {
    height: KNOB,
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  track: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  snapMark: {
    position: 'absolute',
    width: 2,
    height: 16,
    marginLeft: -1,
    borderRadius: 1,
    backgroundColor: colors.textDim,
    pointerEvents: 'none',
  },
  knob: {
    position: 'absolute',
    width: KNOB,
    height: KNOB,
    marginLeft: -KNOB / 2,
    borderRadius: KNOB / 2,
    borderWidth: 3,
    backgroundColor: colors.bgElevated,
    pointerEvents: 'none',
  },
  touchOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -14,
    bottom: -14,
  },
});
