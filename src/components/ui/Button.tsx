import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fontSize, radii, spacing, touch } from '../../config/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  /** ボタン下に表示する補足テキスト */
  caption?: string;
  style?: ViewStyle;
  accent?: string;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  caption,
  style,
  accent,
}: AppButtonProps) {
  const palette = getPalette(variant, accent);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: 'rgba(255,255,255,0.14)' }}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.small,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          opacity: disabled ? 0.42 : pressed ? 0.86 : 1,
        },
        style,
      ]}
    >
      <View style={styles.labelWrap}>
        <Text
          style={[
            styles.label,
            size === 'sm' && styles.labelSmall,
            { color: palette.text },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
        {caption ? <Text style={[styles.caption, { color: palette.text }]}>{caption}</Text> : null}
      </View>
    </Pressable>
  );
}

function getPalette(variant: Variant, accent?: string) {
  switch (variant) {
    case 'secondary':
      return { background: colors.surfaceAlt, border: colors.borderStrong, text: colors.text };
    case 'ghost':
      return { background: 'transparent', border: colors.border, text: colors.textMuted };
    case 'danger':
      return { background: colors.danger, border: colors.danger, text: '#2A0E0E' };
    default:
      return {
        background: accent ?? colors.primary,
        border: accent ?? colors.primary,
        text: colors.primaryText,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch.minHeight,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    minHeight: touch.smallMinHeight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  labelWrap: {
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontSize: fontSize.title,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  labelSmall: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  caption: {
    fontSize: fontSize.caption,
    opacity: 0.82,
  },
});
