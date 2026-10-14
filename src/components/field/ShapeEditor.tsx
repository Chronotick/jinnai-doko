import React, { useCallback, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fontSize, radii, spacing, touch } from '../../config/theme';
import { shapeCoverage, sizeForCoverage } from '../../domain/coverage';
import { shapeLabel } from '../../domain/shapes';
import type { AnimalRenderMode, Shape } from '../../domain/types';
import { Slider } from '../ui/Slider';
import { FieldView, type FieldLayer, VIEW_EXTENT } from './FieldView';

const NUDGE_STEP = 0.02;

interface ShapeEditorProps {
  shape: Shape;
  onChange: (shape: Shape) => void;
  color: string;
  /** サイズスライダーが動かせる被覆率 (%) の範囲 */
  coverageRange: { min: number; max: number };
  /** スライダーがスナップする被覆率 (%) */
  coverageSnap?: number;
  coverageSnapWindow?: number;
  /** フィールドに重ねて表示する追加レイヤー */
  extraLayers?: FieldLayer[];
  fieldSize: number;
  valid?: boolean;
  animalRenderMode?: AnimalRenderMode;
}

/**
 * 図形を「ドラッグで移動 / スライダーでサイズ・回転」できるエディタ。
 * 守り側・攻め側の両方で共有し、被覆率の制約だけを props で切り替える。
 *
 * サイズは「フィールドをどれだけ覆うか（被覆率）」で指定する。
 * フィールド外へはみ出した部分は数えないため、スライダーの値は常に実効面積を表す。
 */
export function ShapeEditor({
  shape,
  onChange,
  color,
  coverageRange,
  coverageSnap,
  coverageSnapWindow = 0,
  extraLayers = [],
  fieldSize,
  valid = true,
  animalRenderMode = 'illustration',
}: ShapeEditorProps) {
  const [containerWidth, setContainerWidth] = useState(fieldSize);
  const widthRef = useRef(fieldSize);
  const dragRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  const handleLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    widthRef.current = next;
    setContainerWidth(next);
  };

  /** 画面上の 1px が正規化座標でいくつ分か */
  const pixelsPerUnit = () => (widthRef.current || fieldSize) / (VIEW_EXTENT * 2);

  /**
   * 移動量の算出には pageX / pageY を使う。
   * locationX はプラットフォームによって基準要素が変わることがあるため、
   * 画面全体を基準とする座標の「差分」を使うほうが Android / Web で挙動が揃う。
   */
  const pointOf = (event: GestureResponderEvent) => {
    const native = event.nativeEvent;
    const x = Number.isFinite(native.pageX) ? native.pageX : native.locationX;
    const y = Number.isFinite(native.pageY) ? native.pageY : native.locationY;
    return { x, y };
  };

  const onGrant = useCallback(
    (event: GestureResponderEvent) => {
      const point = pointOf(event);
      dragRef.current = { x: point.x, y: point.y, cx: shape.cx, cy: shape.cy };
    },
    [shape.cx, shape.cy],
  );

  const onMove = useCallback(
    (event: GestureResponderEvent) => {
      const start = dragRef.current;
      if (!start) return;
      const point = pointOf(event);
      const scale = pixelsPerUnit();
      const dx = (point.x - start.x) / scale;
      const dy = -(point.y - start.y) / scale;
      onChange({ ...shape, cx: start.cx + dx, cy: start.cy + dy });
    },
    [onChange, shape],
  );

  const onRelease = useCallback(() => {
    dragRef.current = null;
  }, []);

  const currentCoverage = shapeCoverage(shape);

  const setCoverage = (coverage: number) => {
    const clamped = Math.max(coverageRange.min, Math.min(coverageRange.max, coverage));
    onChange({ ...shape, size: sizeForCoverage(shape, clamped) });
  };

  const setRotation = (rotation: number) => onChange({ ...shape, rotation });

  const nudge = (dx: number, dy: number) =>
    onChange({ ...shape, cx: shape.cx + dx * NUDGE_STEP, cy: shape.cy + dy * NUDGE_STEP });

  const layers: FieldLayer[] = [
    ...extraLayers,
    {
      key: 'active',
      shape,
      fill: color,
      fillOpacity: 0.3,
      stroke: valid ? color : colors.danger,
      strokeWidth: 0.018,
    },
  ];

  return (
    <View style={styles.wrapper}>
      <View
        style={[styles.fieldWrapper, { width: fieldSize, height: fieldSize }]}
        onLayout={handleLayout}
      >
        <FieldView
          layers={layers}
          size={containerWidth || fieldSize}
          animalRenderMode={animalRenderMode}
        />
        <View
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={onGrant}
          onResponderMove={onMove}
          onResponderRelease={onRelease}
          onResponderTerminate={onRelease}
          onResponderTerminationRequest={() => false}
        />
      </View>

      <View style={styles.hintRow}>
        <Text style={styles.hint}>
          フィールドをドラッグして{shapeLabel(shape.kind)}を移動 / スライダーは左右にドラッグ
        </Text>
        <Text style={[styles.areaValue, { color }]}>{currentCoverage.toFixed(2)}%</Text>
      </View>

      <View style={styles.controls}>
        <Slider
          label="大きさ（フィールドを覆う割合）"
          value={currentCoverage}
          min={coverageRange.min}
          max={coverageRange.max}
          onChange={setCoverage}
          color={color}
          displayValue={`${currentCoverage.toFixed(2)}%`}
          snapTo={coverageSnap}
          snapWindow={coverageSnapWindow}
        />
        {shape.kind !== 'circle' ? (
          <Slider
            label="回転"
            value={shape.rotation}
            min={0}
            max={Math.PI * 2}
            onChange={setRotation}
            color={colors.textMuted}
            displayValue={`${Math.round((shape.rotation * 180) / Math.PI)}°`}
          />
        ) : null}
      </View>

      <View style={styles.padRow}>
        <Text style={styles.padLabel}>微調整</Text>
        <View style={styles.pad}>
          <NudgeButton label="←" onPress={() => nudge(-1, 0)} />
          <View style={styles.padColumn}>
            <NudgeButton label="↑" onPress={() => nudge(0, 1)} />
            <NudgeButton label="↓" onPress={() => nudge(0, -1)} />
          </View>
          <NudgeButton label="→" onPress={() => nudge(1, 0)} />
        </View>
      </View>
    </View>
  );
}

function NudgeButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.14)', borderless: false }}
      style={({ pressed }) => [styles.nudge, pressed && styles.nudgePressed]}
      accessibilityRole="button"
      accessibilityLabel={`図形を${label}へ微調整`}
    >
      <Text style={styles.nudgeText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  fieldWrapper: {
    alignSelf: 'center',
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hint: {
    color: colors.textDim,
    fontSize: fontSize.caption,
    flexShrink: 1,
  },
  areaValue: {
    fontSize: fontSize.title,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  controls: {
    gap: spacing.xs,
  },
  padRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  padLabel: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '600',
  },
  pad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  padColumn: {
    gap: spacing.xs,
  },
  nudge: {
    minWidth: touch.smallMinHeight,
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgePressed: {
    backgroundColor: colors.border,
  },
  nudgeText: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
});
