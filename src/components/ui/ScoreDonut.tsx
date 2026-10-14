import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, fontSize, spacing } from '../../config/theme';
import { useTween } from '../../hooks/useTween';

interface ScoreDonutProps {
  /** 削った割合 (0〜100) */
  value: number;
  /** 直前の値。value との差分をハイライト表示する（今回削った分の演出） */
  previousValue?: number;
  color: string;
  highlightColor?: string;
  size?: number;
  label?: string;
  caption?: string;
  animate?: boolean;
}

/**
 * 「100% のうちどれだけ削ったか」を示すドーナツ。
 * 直前値との差分を明るい色で重ねることで、今回の攻撃で削れた部分が一目で分かる。
 */
export function ScoreDonut({
  value,
  previousValue,
  color,
  highlightColor = colors.overlap,
  size = 132,
  label,
  caption,
  animate = true,
}: ScoreDonutProps) {
  const animated = useTween(value, animate ? 900 : 0, animate ? 220 : 0);
  const shown = animate ? animated : value;

  // 端末幅が確定する前でも SVG に不正な値を渡さないための下限
  const boxSize = Math.max(48, size);
  const stroke = Math.max(6, boxSize * 0.11);
  const radius = (boxSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  const total = clamp(shown);
  const base = previousValue === undefined ? total : Math.min(clamp(previousValue), total);
  const highlight = total - base;

  const arc = (from: number, length: number, arcColor: string, key: string) => {
    if (length <= 0.01) return null;
    return (
      <Circle
        key={key}
        cx={boxSize / 2}
        cy={boxSize / 2}
        r={radius}
        stroke={arcColor}
        strokeWidth={stroke}
        strokeLinecap="butt"
        fill="none"
        strokeDasharray={`${(length / 100) * circumference} ${circumference}`}
        strokeDashoffset={-(from / 100) * circumference}
      />
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={{ width: boxSize, height: boxSize }}>
        <Svg width={boxSize} height={boxSize}>
          <G transform={`rotate(-90 ${boxSize / 2} ${boxSize / 2})`}>
            <Circle
              cx={boxSize / 2}
              cy={boxSize / 2}
              r={radius}
              stroke={colors.surfaceAlt}
              strokeWidth={stroke}
              fill="none"
            />
            {arc(0, base, color, 'base')}
            {arc(base, highlight, highlightColor, 'highlight')}
          </G>
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={[styles.value, { fontSize: boxSize * 0.2 }]}>{total.toFixed(1)}</Text>
          <Text style={styles.unit}>/ 100%</Text>
        </View>
      </View>
      {label ? <Text style={[styles.label, { color }]} numberOfLines={1}>{label}</Text> : null}
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

interface ScoreBarProps {
  value: number;
  color: string;
  label: string;
  trailing?: string;
}

export function ScoreBar({ value, color, label, trailing }: ScoreBarProps) {
  const animated = useTween(value, 800, 120);
  const ratio = Math.max(0, Math.min(1, animated / 100));
  return (
    <View style={styles.barWrapper}>
      <View style={styles.barHeader}>
        <Text style={[styles.barLabel, { color }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.barValue}>{trailing ?? `${animated.toFixed(2)}%`}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    color: colors.text,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    color: colors.textDim,
    fontSize: fontSize.caption,
    marginTop: -2,
  },
  label: {
    fontSize: fontSize.body,
    fontWeight: '700',
    maxWidth: 150,
    textAlign: 'center',
  },
  caption: {
    color: colors.textDim,
    fontSize: fontSize.caption,
  },
  barWrapper: {
    gap: spacing.xs,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barLabel: {
    fontSize: fontSize.body,
    fontWeight: '700',
    flexShrink: 1,
  },
  barValue: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
});
