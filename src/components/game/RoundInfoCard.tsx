import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radii, spacing } from '../../config/theme';
import { Badge } from '../ui/Badge';

interface RoundInfoCardProps {
  roundNumber: number;
  roundCount: number;
  /** ラウンドの配点（守り側の図形面積とは無関係なので誰に見せてもよい） */
  scoreWeight: number;
  attackerName: string;
  defenderName: string;
  attackerColor: string;
  defenderColor: string;
  /**
   * 配置条件の説明文。**守り側の画面でのみ渡すこと**。
   * 攻め側の画面では省略され、条件は質問でしか分からない。
   */
  conditionText?: string;
  compact?: boolean;
}

/**
 * ラウンドの概要カード。
 * 秘密情報（図形の種類・配置条件）は props で明示的に渡されたときだけ表示するので、
 * 攻め側の画面から誤って表示してしまうことがない。
 */
export function RoundInfoCard({
  roundNumber,
  roundCount,
  scoreWeight,
  attackerName,
  defenderName,
  attackerColor,
  defenderColor,
  conditionText,
  compact = false,
}: RoundInfoCardProps) {
  return (
    <View style={[styles.card, compact && styles.compact]}>
      <View style={styles.topRow}>
        <Badge label={`ROUND ${roundNumber} / ${roundCount}`} color={colors.primary} />
        <View style={styles.weightWrap}>
          <Text style={styles.weightLabel}>配点</Text>
          <Text style={styles.weight}>
            {scoreWeight.toFixed(2)}
            <Text style={styles.weightUnit}>%</Text>
          </Text>
        </View>
      </View>

      {conditionText ? (
        <View style={styles.conditionBox}>
          <Text style={styles.conditionLabel}>配置条件（守り側のみ）</Text>
          <Text style={styles.conditionText}>{conditionText}</Text>
        </View>
      ) : null}

      <View style={styles.roleRow}>
        <RoleTag role="攻め" name={attackerName} color={attackerColor} />
        <RoleTag role="守り" name={defenderName} color={defenderColor} />
      </View>
    </View>
  );
}

function RoleTag({ role, name, color }: { role: string; name: string; color: string }) {
  return (
    <View style={[styles.roleTag, { borderColor: color, backgroundColor: `${color}18` }]}>
      <Text style={[styles.roleName, { color }]}>{role}</Text>
      <Text style={styles.rolePlayer} numberOfLines={1}>
        {name}
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
    gap: spacing.md,
  },
  compact: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weightWrap: {
    alignItems: 'flex-end',
  },
  weightLabel: {
    color: colors.textDim,
    fontSize: fontSize.caption,
  },
  weight: {
    color: colors.text,
    fontSize: fontSize.heading,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    lineHeight: 26,
  },
  weightUnit: {
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  conditionBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  conditionLabel: {
    color: colors.textDim,
    fontSize: fontSize.caption,
  },
  conditionText: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
    lineHeight: 21,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleTag: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  roleName: {
    fontSize: fontSize.caption,
    fontWeight: '800',
    letterSpacing: 1,
  },
  rolePlayer: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
});
