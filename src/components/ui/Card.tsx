import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fontSize, radii, spacing } from '../../config/theme';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  accent?: string;
  style?: ViewStyle;
  compact?: boolean;
}

export function Card({ children, title, subtitle, accent, style, compact }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        compact && styles.compact,
        accent ? { borderColor: accent, borderWidth: 1.5 } : null,
        style,
      ]}
    >
      {title ? (
        <View style={styles.header}>
          <Text style={[styles.title, accent ? { color: accent } : null]}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

interface StatRowProps {
  label: string;
  value: string;
  emphasis?: boolean;
  color?: string;
}

export function StatRow({ label, value, emphasis, color }: StatRowProps) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          emphasis && styles.statValueEmphasis,
          color ? { color } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  compact: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  header: {
    gap: 2,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.small,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    gap: spacing.md,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    flexShrink: 1,
  },
  statValue: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statValueEmphasis: {
    fontSize: fontSize.heading,
  },
});
