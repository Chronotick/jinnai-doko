import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { donutSizeFor } from '../config/layout';
import { colors, fontSize, playerColor, radii, spacing } from '../config/theme';
import { Badge } from '../components/ui/Badge';
import { AppButton } from '../components/ui/Button';
import { Card, SectionTitle } from '../components/ui/Card';
import { ScoreBar, ScoreDonut } from '../components/ui/ScoreDonut';
import { Screen } from '../components/ui/Screen';
import { playerName, winnerOf } from '../domain/gameEngine';
import { shapeLabel } from '../domain/shapes';
import { useGame } from '../state/GameProvider';
import type { PlayerIndex, TurnRecord } from '../domain/types';

/** ⑧ 最終結果画面 */
export function FinalResultScreen() {
  const { state, dispatch } = useGame();
  const { width } = useWindowDimensions();
  const winner = winnerOf(state);
  const donutSize = donutSizeFor(width, 160);

  const recordFor = (roundIndex: number, player: PlayerIndex): TurnRecord | undefined =>
    state.history.find(
      (record) => record.roundIndex === roundIndex && record.attacker === player,
    );

  return (
    <Screen
      footer={
        <AppButton label="もう一度遊ぶ" onPress={() => dispatch({ type: 'PLAY_AGAIN' })} />
      }
    >
      <View style={styles.hero}>
        <Badge label="FINAL RESULT" color={colors.primary} />
        {winner === 'draw' ? (
          <Text style={styles.winnerName}>引き分け</Text>
        ) : (
          <>
            <Text style={styles.winnerLabel}>WINNER</Text>
            <Text style={[styles.winnerName, { color: playerColor(winner) }]} numberOfLines={2}>
              {playerName(state, winner)}
            </Text>
            <Text style={styles.winnerSub}>
              {state.scores[winner].toFixed(2)}% を削り取りました
            </Text>
          </>
        )}
      </View>

      <View style={styles.donutRow}>
        <ScoreDonut
          value={state.scores[0]}
          color={colors.playerA}
          label={playerName(state, 0)}
          caption="削った領域"
          size={donutSize}
        />
        <ScoreDonut
          value={state.scores[1]}
          color={colors.playerB}
          label={playerName(state, 1)}
          caption="削った領域"
          size={donutSize}
        />
      </View>

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

      <SectionTitle>ラウンド別の結果</SectionTitle>
      <Card compact style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.cell, styles.cellRound, styles.headerCell]}>R</Text>
          <Text style={[styles.cell, styles.cellShape, styles.headerCell]}>配点</Text>
          <Text style={[styles.cell, styles.cellScore, styles.headerCell, { color: colors.playerA }]}>
            {playerName(state, 0)}
          </Text>
          <Text style={[styles.cell, styles.cellScore, styles.headerCell, { color: colors.playerB }]}>
            {playerName(state, 1)}
          </Text>
        </View>
        {state.rounds.map((round) => {
          const a = recordFor(round.index, 0);
          const b = recordFor(round.index, 1);
          return (
            <View key={round.index} style={styles.tableRow}>
              <Text style={[styles.cell, styles.cellRound]}>{round.index + 1}</Text>
              <Text style={[styles.cell, styles.cellShape]}>
                {round.scoreWeight.toFixed(2)}%
                {'\n'}
                <Text style={styles.cellSub}>
                  {a ? shapeLabel(a.shapeKind) : '-'} / {b ? shapeLabel(b.shapeKind) : '-'}
                </Text>
              </Text>
              <Text style={[styles.cell, styles.cellScore]}>
                {a ? a.carved.toFixed(2) + '%' : '-'}
                {'\n'}
                <Text style={styles.cellSub}>的中 {a ? a.hitRate.toFixed(1) : '-'}%</Text>
              </Text>
              <Text style={[styles.cell, styles.cellScore]}>
                {b ? b.carved.toFixed(2) + '%' : '-'}
                {'\n'}
                <Text style={styles.cellSub}>的中 {b ? b.hitRate.toFixed(1) : '-'}%</Text>
              </Text>
            </View>
          );
        })}
        <View style={[styles.tableRow, styles.tableTotal]}>
          <Text style={[styles.cell, styles.cellRound, styles.totalText]}>計</Text>
          <Text style={[styles.cell, styles.cellShape, styles.totalText]}>100.00%</Text>
          <Text style={[styles.cell, styles.cellScore, styles.totalText, { color: colors.playerA }]}>
            {state.scores[0].toFixed(2)}%
          </Text>
          <Text style={[styles.cell, styles.cellScore, styles.totalText, { color: colors.playerB }]}>
            {state.scores[1].toFixed(2)}%
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  winnerLabel: {
    color: colors.textDim,
    fontSize: fontSize.small,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: spacing.sm,
  },
  winnerName: {
    color: colors.text,
    fontSize: fontSize.hero,
    fontWeight: '900',
    textAlign: 'center',
  },
  winnerSub: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  donutRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  spacer: {
    height: spacing.sm,
  },
  table: {
    gap: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tableTotal: {
    borderBottomWidth: 0,
    paddingTop: spacing.md,
  },
  cell: {
    color: colors.text,
    fontSize: fontSize.small,
    fontVariant: ['tabular-nums'],
  },
  headerCell: {
    color: colors.textDim,
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  cellRound: {
    width: 24,
    fontWeight: '700',
  },
  cellShape: {
    flex: 1.2,
  },
  cellScore: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '700',
  },
  cellSub: {
    color: colors.textDim,
    fontSize: fontSize.caption,
    fontWeight: '400',
  },
  totalText: {
    fontSize: fontSize.body,
    fontWeight: '800',
  },
});
