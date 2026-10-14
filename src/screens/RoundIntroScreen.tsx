import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DEFENSE_COVERAGE, FREE_QUESTIONS_PER_TURN } from '../config/gameConfig';
import { colors, fontSize, playerColor, spacing } from '../config/theme';
import { AppButton } from '../components/ui/Button';
import { Card, SectionTitle } from '../components/ui/Card';
import { ScoreBar } from '../components/ui/ScoreDonut';
import { Screen } from '../components/ui/Screen';
import { RoundInfoCard } from '../components/game/RoundInfoCard';
import { currentDefender, currentRound, playerName } from '../domain/gameEngine';
import { useGame } from '../state/GameProvider';

/**
 * ② ラウンド開始画面
 *
 * この画面は両プレイヤーが一緒に見るため、守り側の秘密情報
 * （図形候補・配置条件）はいっさい表示しない。
 */
export function RoundIntroScreen() {
  const { state, dispatch } = useGame();
  const round = currentRound(state);
  if (!round) return null;

  const attacker = state.attacker;
  const defender = currentDefender(state);

  return (
    <Screen
      footer={
        <AppButton
          label="開始"
          onPress={() => dispatch({ type: 'BEGIN_ROUND' })}
          caption={playerName(state, defender) + ' さんの図形選択から始めます'}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.roundLabel}>ROUND</Text>
        <Text style={styles.roundNumber}>
          {round.index + 1}
          <Text style={styles.roundTotal}> / {state.settings.roundCount}</Text>
        </Text>
      </View>

      <RoundInfoCard
        roundNumber={round.index + 1}
        roundCount={state.settings.roundCount}
        scoreWeight={round.scoreWeight}
        attackerName={playerName(state, attacker)}
        defenderName={playerName(state, defender)}
        attackerColor={playerColor(attacker)}
        defenderColor={playerColor(defender)}
      />

      <Card compact>
        <Text style={styles.ruleTitle}>このラウンドのルール</Text>
        <Text style={styles.ruleText}>
          守り側は提示された候補から図形を 1 つ選び、フィールドの{' '}
          {DEFENSE_COVERAGE.min}〜{DEFENSE_COVERAGE.max}% を覆うように配置します。
          図形の種類も位置も攻め側には知らされません。
        </Text>
        <Text style={styles.ruleText}>
          攻め側は質問で絞り込んでから攻撃します。最初の {FREE_QUESTIONS_PER_TURN}{' '}
          回の質問は無料で、攻撃可能サイズは減りません。
        </Text>
      </Card>

      <SectionTitle>現在の削り取り状況</SectionTitle>
      <Card compact>
        <ScoreBar
          value={state.scores[0]}
          color={colors.playerA}
          label={playerName(state, 0)}
          trailing={state.scores[0].toFixed(2) + ' / 100%'}
        />
        <View style={styles.spacer} />
        <ScoreBar
          value={state.scores[1]}
          color={colors.playerB}
          label={playerName(state, 1)}
          trailing={state.scores[1].toFixed(2) + ' / 100%'}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  roundLabel: {
    color: colors.textDim,
    fontSize: fontSize.small,
    fontWeight: '800',
    letterSpacing: 4,
  },
  roundNumber: {
    color: colors.text,
    fontSize: 64,
    fontWeight: '900',
    lineHeight: 70,
    fontVariant: ['tabular-nums'],
  },
  roundTotal: {
    color: colors.textDim,
    fontSize: fontSize.heading,
    fontWeight: '700',
  },
  ruleTitle: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  ruleText: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    lineHeight: 20,
  },
  spacer: {
    height: spacing.sm,
  },
});
