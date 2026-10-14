import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ATTACK_SIZE_MULTIPLIERS, FREE_QUESTIONS_PER_TURN } from '../../config/gameConfig';
import { colors, fontSize, radii, spacing } from '../../config/theme';
import { penalizedQuestionCount } from '../../domain/scoring';

interface AttackSizeGaugeProps {
  questionCount: number;
  /** 実際に囲える面積（フィールド全体に対する %） */
  maxCoverage?: number;
}

/** その段階に入る質問回数のラベル（無料ぶんを考慮する） */
function stepLabel(index: number): string {
  const from = index === 0 ? 0 : index + FREE_QUESTIONS_PER_TURN;
  const to = index + FREE_QUESTIONS_PER_TURN;
  return from === to ? `${to}回` : `${from}〜${to}回`;
}

/**
 * 質問回数に応じて 200% → 150% → 100% → 75% → 50% と
 * 攻撃可能サイズが縮んでいくことを可視化する。
 * 最初の FREE_QUESTIONS_PER_TURN 回は無料なのでサイズが下がらない。
 */
export function AttackSizeGauge({ questionCount, maxCoverage }: AttackSizeGaugeProps) {
  const activeIndex = penalizedQuestionCount(questionCount);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>攻撃可能サイズ</Text>
        {maxCoverage !== undefined ? (
          <Text style={styles.maxArea}>フィールドの {maxCoverage.toFixed(2)}% まで</Text>
        ) : null}
      </View>
      <View style={styles.steps}>
        {ATTACK_SIZE_MULTIPLIERS.map((multiplier, index) => {
          const active = index === activeIndex;
          const past = index < activeIndex;
          return (
            <View key={multiplier} style={styles.stepWrap}>
              <View style={[styles.step, past && styles.stepPast, active && styles.stepActive]}>
                <Text
                  style={[
                    styles.stepValue,
                    past && styles.stepValuePast,
                    active && styles.stepValueActive,
                  ]}
                >
                  {Math.round(multiplier * 100)}%
                </Text>
              </View>
              <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>
                {stepLabel(index)}
              </Text>
            </View>
          );
        })}
      </View>
      {FREE_QUESTIONS_PER_TURN > 0 ? (
        <View style={styles.freeNote}>
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>FREE</Text>
          </View>
          <Text style={styles.freeText}>
            このターン最初の {FREE_QUESTIONS_PER_TURN} 回の質問はサイズが減りません
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  maxArea: {
    color: colors.attack,
    fontSize: fontSize.small,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  steps: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stepWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  step: {
    width: '100%',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  stepPast: {
    opacity: 0.35,
  },
  stepActive: {
    borderColor: colors.attack,
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
  },
  stepValue: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  stepValuePast: {
    color: colors.textDim,
  },
  stepValueActive: {
    color: colors.attack,
    fontSize: fontSize.body,
    fontWeight: '800',
  },
  stepLabel: {
    color: colors.textDim,
    fontSize: fontSize.caption,
  },
  stepLabelActive: {
    color: colors.attack,
    fontWeight: '700',
  },
  freeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  freeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(52, 211, 153, 0.16)',
    borderWidth: 1,
    borderColor: colors.success,
  },
  freeBadgeText: {
    color: colors.success,
    fontSize: fontSize.caption,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  freeText: {
    color: colors.textDim,
    fontSize: fontSize.caption,
    flexShrink: 1,
  },
});
