import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, playerColor, radii, spacing } from '../config/theme';
import { Badge } from '../components/ui/Badge';
import { AppButton } from '../components/ui/Button';
import { Card, SectionTitle } from '../components/ui/Card';
import { ScoreBar } from '../components/ui/ScoreDonut';
import { Screen } from '../components/ui/Screen';
import { describeCondition } from '../domain/conditions';
import { currentRound, playerName, turnsOfRound } from '../domain/gameEngine';
import { shapeLabel } from '../domain/shapes';
import { useGame } from '../state/GameProvider';
import type { PlayerIndex, TurnRecord } from '../domain/types';

/** ⑦ ラウンド結果画面 */
export function RoundResultScreen() {
  const { state, dispatch } = useGame();
  const round = currentRound(state);
  if (!round) return null;

  const records = turnsOfRound(state, round.index);
  const isLastRound = round.index + 1 >= state.rounds.length;

  const recordFor = (player: PlayerIndex): TurnRecord | undefined =>
    records.find((record) => record.attacker === player);

  return (
    <Screen
      footer={
        <AppButton
          label={isLastRound ? '最終結果へ' : '次のラウンドへ'}
          onPress={() => dispatch({ type: 'NEXT_AFTER_ROUND' })}
          caption={
            isLastRound
              ? '全ラウンド終了'
              : 'ROUND ' + (round.index + 2) + ' / ' + state.settings.roundCount
          }
        />
      }
    >
      <View style={styles.header}>
        <Badge label={'ROUND ' + (round.index + 1) + ' 結果'} color={colors.primary} filled />
        <Text style={styles.headerArea}>配点 {round.scoreWeight.toFixed(2)}%</Text>
      </View>

      <Card compact>
        <Text style={styles.conditionTitle}>このラウンドの配置条件</Text>
        <Text style={styles.conditionText}>{describeCondition(round.condition)}</Text>
      </Card>

      <View style={styles.cardRow}>
        {[0, 1].map((index) => {
          const player = index as PlayerIndex;
          const record = recordFor(player);
          const color = playerColor(player);
          return (
            <View key={index} style={[styles.playerCard, { borderColor: color }]}>
              <Text style={[styles.playerName, { color }]} numberOfLines={1}>
                {playerName(state, player)}
              </Text>
              <Text style={styles.playerRole}>攻めターン</Text>

              <View style={styles.metric}>
                <Text style={styles.metricLabel}>的中率</Text>
                <Text style={styles.metricValue}>
                  {record ? record.hitRate.toFixed(2) : '0.00'}
                  <Text style={styles.metricUnit}>%</Text>
                </Text>
              </View>

              <View style={styles.metric}>
                <Text style={styles.metricLabel}>削った割合</Text>
                <Text style={[styles.metricValue, { color }]}>
                  {record ? record.carved.toFixed(2) : '0.00'}
                  <Text style={styles.metricUnit}>%</Text>
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.metric}>
                <Text style={styles.metricLabel}>累計</Text>
                <Text style={styles.metricTotal}>
                  {state.scores[player].toFixed(2)}
                  <Text style={styles.metricUnit}> / 100%</Text>
                </Text>
              </View>

              <Text style={styles.playerSub}>
                質問 {record ? record.questionCount : 0} 回
              </Text>
              <Text style={styles.playerSub}>
                守った図形: {record ? shapeLabel(record.shapeKind) : '-'}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.note}>
        「守った図形」は、そのプレイヤーが守り側のターンで隠していた図形です。
      </Text>

      <SectionTitle>累計スコア</SectionTitle>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  headerArea: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  conditionTitle: {
    color: colors.textDim,
    fontSize: fontSize.caption,
  },
  conditionText: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
    lineHeight: 20,
  },
  cardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  playerCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    padding: spacing.md,
    gap: spacing.xs,
  },
  playerName: {
    fontSize: fontSize.title,
    fontWeight: '800',
  },
  playerRole: {
    color: colors.textDim,
    fontSize: fontSize.caption,
    marginBottom: spacing.xs,
  },
  metric: {
    gap: 0,
  },
  metricLabel: {
    color: colors.textDim,
    fontSize: fontSize.caption,
  },
  metricValue: {
    color: colors.text,
    fontSize: fontSize.heading,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  metricUnit: {
    fontSize: fontSize.small,
    color: colors.textMuted,
    fontWeight: '600',
  },
  metricTotal: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  playerSub: {
    color: colors.textDim,
    fontSize: fontSize.caption,
    marginTop: 2,
  },
  note: {
    color: colors.textDim,
    fontSize: fontSize.caption,
    lineHeight: 18,
  },
  spacer: {
    height: spacing.sm,
  },
});
