import React, { useId } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  Polygon as SvgPolygon,
  Polyline,
  Rect,
} from 'react-native-svg';
import { FIELD_CONFIG } from '../../config/gameConfig';
import { colors } from '../../config/theme';
import { ANIMAL_DEFS } from '../../domain/animals';
import type { Polygon } from '../../domain/geometry/polygon';
import {
  GUIDE_SQUARE_HALF,
  isAnimalShape,
  shapeToPolygon,
  transformLocalPoint,
} from '../../domain/shapes';
import type { AnimalRenderMode, Shape } from '../../domain/types';

/** 描画用のポリゴン分割数（採点用の分割数とは独立） */
const RENDER_SEGMENTS = 96;

/** viewBox はフィールド半径 = 1 の正規化座標。少し余白を持たせる。 */
export const VIEW_EXTENT = 1.14;

export interface FieldLayer {
  key: string;
  shape?: Shape;
  polygon?: Polygon;
  fill: string;
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
  dashed?: boolean;
  /** 動物図形の装飾を描くか（イラスト表示のとき true） */
  showDetails?: boolean;
}

interface FieldViewProps {
  layers: FieldLayer[];
  size: number;
  showGuideSquare?: boolean;
  style?: ViewStyle;
  dimmed?: boolean;
  animalRenderMode?: AnimalRenderMode;
}

const toPoints = (polygon: Polygon): string =>
  polygon.map((p) => `${p.x.toFixed(4)},${(-p.y).toFixed(4)}`).join(' ');

const DETAIL_COLORS: Record<'ink' | 'light', string> = {
  ink: colors.fieldBg,
  light: '#FFFFFF',
};

const DETAIL_OPACITY: Record<'ink' | 'light', number> = {
  ink: 0.85,
  light: 0.3,
};

/** 動物図形の装飾。判定には一切使わず、描画だけに使う。 */
function AnimalDetails({ shape }: { shape: Shape }) {
  if (!isAnimalShape(shape.kind)) return null;
  const def = ANIMAL_DEFS[shape.kind];

  return (
    <>
      {def.details.map((detail, index) => {
        const key = `${shape.kind}-detail-${index}`;
        const color = DETAIL_COLORS[detail.tone];
        const opacity = DETAIL_OPACITY[detail.tone];

        if (detail.type === 'dot') {
          const center = transformLocalPoint(detail.center, shape);
          return (
            <Circle
              key={key}
              cx={center.x}
              cy={-center.y}
              r={detail.radius * shape.size}
              fill={color}
              fillOpacity={opacity}
            />
          );
        }
        if (detail.type === 'poly') {
          const points = detail.points.map((point) => transformLocalPoint(point, shape));
          return (
            <SvgPolygon key={key} points={toPoints(points)} fill={color} fillOpacity={opacity} />
          );
        }
        const points = detail.points.map((point) => transformLocalPoint(point, shape));
        return (
          <Polyline
            key={key}
            points={toPoints(points)}
            fill="none"
            stroke={color}
            strokeOpacity={opacity}
            strokeWidth={detail.width * shape.size}
            strokeLinecap="round"
          />
        );
      })}
    </>
  );
}

export function FieldView({
  layers,
  size,
  showGuideSquare = true,
  style,
  dimmed = false,
  animalRenderMode = 'illustration',
}: FieldViewProps) {
  const r = FIELD_CONFIG.radius;
  const guide = GUIDE_SQUARE_HALF;
  // 端末幅が確定する前でも SVG に不正な値を渡さないための下限
  const boxSize = Math.max(1, size);
  const clipId = `field-clip-${useId().replace(/:/g, '')}`;

  const renderLayer = (layer: FieldLayer, options: { outside: boolean }) => {
    const polygon =
      layer.polygon ?? (layer.shape ? shapeToPolygon(layer.shape, RENDER_SEGMENTS) : null);
    if (!polygon || polygon.length < 3) return null;
    const showDetails =
      !options.outside &&
      layer.showDetails !== false &&
      animalRenderMode === 'illustration' &&
      layer.shape !== undefined &&
      isAnimalShape(layer.shape.kind);

    return (
      <React.Fragment key={`${layer.key}-${options.outside ? 'out' : 'in'}`}>
        <SvgPolygon
          points={toPoints(polygon)}
          fill={layer.fill}
          fillOpacity={(layer.fillOpacity ?? 1) * (options.outside ? 0.3 : 1)}
          stroke={layer.stroke ?? 'none'}
          strokeWidth={layer.strokeWidth ?? 0.014}
          strokeOpacity={options.outside ? 0.35 : 1}
          strokeDasharray={layer.dashed ? '0.06 0.045' : undefined}
          strokeLinejoin="round"
        />
        {showDetails && layer.shape ? <AnimalDetails shape={layer.shape} /> : null}
      </React.Fragment>
    );
  };

  return (
    <View style={[{ width: boxSize, height: boxSize }, style]}>
      <Svg
        width={boxSize}
        height={boxSize}
        viewBox={`${-VIEW_EXTENT} ${-VIEW_EXTENT} ${VIEW_EXTENT * 2} ${VIEW_EXTENT * 2}`}
      >
        <Defs>
          <ClipPath id={clipId}>
            <Circle cx={0} cy={0} r={r} />
          </ClipPath>
        </Defs>

        <Circle cx={0} cy={0} r={r} fill={colors.fieldBg} />

        {showGuideSquare ? (
          <Rect
            x={-guide}
            y={-guide}
            width={guide * 2}
            height={guide * 2}
            fill="none"
            stroke={colors.guide}
            strokeWidth={0.008}
            strokeDasharray="0.05 0.04"
          />
        ) : null}

        <Line x1={-r} y1={0} x2={r} y2={0} stroke={colors.axis} strokeWidth={0.009} />
        <Line x1={0} y1={-r} x2={0} y2={r} stroke={colors.axis} strokeWidth={0.009} />

        {/* フィールドからはみ出した部分は薄く描き、採点対象外であることを示す */}
        <G opacity={0.9}>{layers.map((layer) => renderLayer(layer, { outside: true }))}</G>

        {/* フィールド内の部分だけをはっきり描く（採点対象） */}
        <G clipPath={`url(#${clipId})`}>
          {layers.map((layer) => renderLayer(layer, { outside: false }))}
        </G>

        <Circle
          cx={0}
          cy={0}
          r={r}
          fill="none"
          stroke={dimmed ? colors.border : colors.fieldEdge}
          strokeWidth={0.014}
        />
        <Circle cx={0} cy={0} r={0.028} fill={colors.text} />
        <Circle cx={0} cy={0} r={0.055} fill="none" stroke={colors.text} strokeWidth={0.008} />
      </Svg>
    </View>
  );
}

export const fieldStyles = StyleSheet.create({
  centered: {
    alignSelf: 'center',
  },
});
