import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polygon as SvgPolygon, Polyline } from 'react-native-svg';
import { colors, fontSize, radii, spacing } from '../../config/theme';
import { ANIMAL_DEFS } from '../../domain/animals';
import {
  isAnimalShape,
  shapeLabel,
  shapeToPolygon,
  transformLocalPoint,
} from '../../domain/shapes';
import type { AnimalRenderMode, Shape, ShapeKind } from '../../domain/types';

const PREVIEW_EXTENT = 1.1;

const toPoints = (points: { x: number; y: number }[]): string =>
  points.map((p) => `${p.x.toFixed(4)},${(-p.y).toFixed(4)}`).join(' ');

interface ShapeThumbnailProps {
  kind: ShapeKind;
  size: number;
  color: string;
  animalRenderMode?: AnimalRenderMode;
}

/**
 * 図形のミニプレビュー。フィールドと同じ輪郭データから描くので、
 * 候補選択で見えている形と実際に配置される形は必ず一致する。
 */
export function ShapeThumbnail({
  kind,
  size,
  color,
  animalRenderMode = 'illustration',
}: ShapeThumbnailProps) {
  const shape: Shape = { kind, cx: 0, cy: 0, size: 0.92, rotation: 0 };
  const outline = shapeToPolygon(shape, 72);
  const details = isAnimalShape(kind) && animalRenderMode === 'illustration'
    ? ANIMAL_DEFS[kind].details
    : [];

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`${-PREVIEW_EXTENT} ${-PREVIEW_EXTENT} ${PREVIEW_EXTENT * 2} ${PREVIEW_EXTENT * 2}`}
    >
      <SvgPolygon
        points={toPoints(outline)}
        fill={color}
        fillOpacity={0.32}
        stroke={color}
        strokeWidth={0.05}
        strokeLinejoin="round"
      />
      {details.map((detail, index) => {
        const key = `${kind}-thumb-${index}`;
        const tone = detail.tone === 'ink' ? colors.fieldBg : '#FFFFFF';
        const opacity = detail.tone === 'ink' ? 0.85 : 0.3;
        if (detail.type === 'dot') {
          const center = transformLocalPoint(detail.center, shape);
          return (
            <Circle
              key={key}
              cx={center.x}
              cy={-center.y}
              r={detail.radius * shape.size}
              fill={tone}
              fillOpacity={opacity}
            />
          );
        }
        if (detail.type === 'poly') {
          return (
            <SvgPolygon
              key={key}
              points={toPoints(detail.points.map((p) => transformLocalPoint(p, shape)))}
              fill={tone}
              fillOpacity={opacity}
            />
          );
        }
        return (
          <Polyline
            key={key}
            points={toPoints(detail.points.map((p) => transformLocalPoint(p, shape)))}
            fill="none"
            stroke={tone}
            strokeOpacity={opacity}
            strokeWidth={detail.width * shape.size}
            strokeLinecap="round"
          />
        );
      })}
    </Svg>
  );
}

interface ShapePickerProps {
  candidates: readonly ShapeKind[];
  selected: ShapeKind;
  onSelect: (kind: ShapeKind) => void;
  color: string;
  animalRenderMode?: AnimalRenderMode;
  /** 候補が多いときに横スクロールにする */
  scrollable?: boolean;
  thumbnailSize?: number;
}

export function ShapePicker({
  candidates,
  selected,
  onSelect,
  color,
  animalRenderMode = 'illustration',
  scrollable = false,
  thumbnailSize = 56,
}: ShapePickerProps) {
  const cards = candidates.map((kind) => {
    const active = kind === selected;
    return (
      <Pressable
        key={kind}
        onPress={() => onSelect(kind)}
        android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${shapeLabel(kind)}を選ぶ`}
        style={({ pressed }) => [
          styles.card,
          scrollable ? styles.cardFixed : styles.cardFlex,
          {
            borderColor: active ? color : colors.border,
            backgroundColor: active ? `${color}1F` : colors.surfaceAlt,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <ShapeThumbnail
          kind={kind}
          size={thumbnailSize}
          color={active ? color : colors.textMuted}
          animalRenderMode={animalRenderMode}
        />
        <Text style={[styles.label, { color: active ? color : colors.textMuted }]} numberOfLines={1}>
          {shapeLabel(kind)}
        </Text>
      </Pressable>
    );
  });

  if (!scrollable) return <View style={styles.row}>{cards}</View>;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollRow}
    >
      {cards}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scrollRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  cardFlex: {
    flex: 1,
  },
  cardFixed: {
    width: 92,
  },
  label: {
    fontSize: fontSize.small,
    fontWeight: '700',
  },
});
