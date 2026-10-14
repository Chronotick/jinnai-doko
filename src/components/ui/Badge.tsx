import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fontSize, radii, spacing, touch } from '../../config/theme';

interface BadgeProps {
  label: string;
  color?: string;
  filled?: boolean;
  style?: ViewStyle;
}

export function Badge({ label, color = colors.primary, filled = false, style }: BadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        { borderColor: color, backgroundColor: filled ? color : 'transparent' },
        style,
      ]}
    >
      <Text style={[styles.badgeText, { color: filled ? colors.bg : color }]}>{label}</Text>
    </View>
  );
}

interface ChoiceChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
}

/** 単一/複数選択用のチップ。ラウンド数・条件選択などで使用。 */
export function ChoiceChip({ label, selected, onPress, color = colors.primary, style }: ChoiceChipProps) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? color : colors.border,
          backgroundColor: selected ? `${color}22` : colors.surfaceAlt,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? color : colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

interface CheckItemProps {
  label: string;
  ok: boolean;
  detail?: string;
}

export function CheckItem({ label, ok, detail }: CheckItemProps) {
  return (
    <View style={styles.checkRow}>
      <View style={[styles.checkMark, { backgroundColor: ok ? colors.success : colors.surfaceAlt }]}>
        <Text style={[styles.checkGlyph, { color: ok ? colors.bg : colors.danger }]}>
          {ok ? '✓' : '✕'}
        </Text>
      </View>
      <View style={styles.checkTextWrap}>
        <Text style={[styles.checkLabel, { color: ok ? colors.text : colors.textMuted }]}>
          {label}
        </Text>
        {detail ? <Text style={styles.checkDetail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  chip: {
    minHeight: touch.smallMinHeight,
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 5,
  },
  checkMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkGlyph: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
  checkTextWrap: {
    flex: 1,
  },
  checkLabel: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  checkDetail: {
    color: colors.textDim,
    fontSize: fontSize.caption,
  },
});
