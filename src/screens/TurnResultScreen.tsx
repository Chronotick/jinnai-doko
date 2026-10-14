import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { donutSizeFor, fieldSizeFor } from '../config/layout';
import { colors, fontSize, playerColor, radii, spacing } from '../config/theme';
import { Badge } from '../components/ui/Badge';
import { AppButton } from '../components/ui/Button';
import { Card, SectionTitle, StatRow } from '../components/ui/Card';
import { ScoreDonut } from '../components/ui/ScoreDonut';
import { Screen } from '../components/ui/Screen';
import { FieldView, type FieldLayer } from '../components/field/FieldView';
import { describeCondition } from '../domain/conditions';
import { overlapPolygons } from '../domain/coverage';
import { playerName } from '../domain/gameEngine';
import { shapeLabel } from '../domain/shapes';
import { useEntrance, useTween } from '../hooks/useTween';
import { useGame } from '../state/GameProvider';

/** ⑥ ターン結果画面。ここで初めて守り側の図形が公開される。 */
export function TurnResultScreen() {
  const { state, dispatch } = useGame();
  const turn = state.lastTurn;
  const { width } = useWindowDimensions();
  const reveal = useEntrance(700, 260);
  const hitRate = useTween(turn ? turn.hitRate : 0, 900, 300);

  const layers = useMemo<FieldLayer[]>(() => {
    if (!turn) return [];
    const result: FieldLayer[] = [
      {
        key: 'attack',
        shape: turn.attackShape,
        fill: colors.attack,
        fillOpacity: 0.22,
        stroke: colors.attack,
        strokeWidth: 0.016,
        dashed: true,
        showDetails: false,
      },
      {
        key: 'defense',
        shape: turn.defenseShape,
        fill: colors.defense,
        fillOpacity: 0.28,
        stroke: colors.defense,
        strokeWidth: 0.016,
      },
    ];
    // 凹図形どうしの重なりは 1 枚の多角形にならないため、断片ごとに描く。
    // 断片は隙間なく並ぶので、輪郭線を引かずに塗りだけで 1 つの領域として見せる。
    overlapPolygons(turn.defenseShape, turn.attackShape).forEach((polygon, index) => {
      result.push({
        key: `overlap-${index}`,
        polygon,
        fill: colors.overlap,
        fillOpacity: 0.6 * reveal,
      });
    });
    return result;
  }, [turn, reveal]);

  if (!turn) return null;

  const attacker = turn.attacker;
  const defender = turn.defender;
  const previousAttackerScore = Math.max(0, state.scores[attacker] - turn.carved);
  const fieldSize = fieldSizeFor(width);
  const donutSize = donutSizeFor(width);

  return (
    <Screen
      footer={
        <AppButton
          label={turn.turnIndex === 0 ? '次のターンへ' : 'ラウンド結果へ'}
          onPress={() => dispatch({ type: 'NEXT_AFTER_TURN' })}
        />
      }
    >
      <View style={styles.header}>
        <Badge
          label={'ROUND ' + (turn.roundIndex + 1) + '  TURN ' + (turn.turnIndex + 1)}
          color={colors.primary}
        />
        <Text style={styles.headerText} numberOfLines={1}>
          {playerName(state, attacker)} の攻撃
        </Text>
      </View>

      <View style={styles.reveal}>
        <Text style={styles.revealLabel}>守り側が隠していた図形</Text>
        <Text style={[styles.revealValue, { color: colors.defense }]}>
          {shapeLabel(turn.shapeKind)}
        </Text>
        <Text style={styles.revealCondition}>{describeCondition(turn.condition)}</Text>
      </View>

      <View style={styles.fieldWrapper}>
        <FieldView
          layers={layers}
          size={fieldSize}
          animalRenderMode={state.settings.animalRenderMode}
        />
      </View>

      <View style={styles.legend}>
        <LegendItem color={colors.defense} label={'守り ' + playerName(state, defender)} />
        <LegendItem color={colors.attack} label={'攻め ' + playerName(state, attacker)} />
        <LegendItem color={colors.overlap} label="重複（的中）" />
      </View>

      <View style={styles.highlight}>
        <Text style={styles.highlightLabel}>的中率</Text>
        <Text style={styles.highlightValue}>{hitRate.toFixed(2)}%</Text>
        <Text style={styles.highlightSub}>
          今回削った割合 {((turn.scoreWeight * hitRate) / 100).toFixed(2)}%
        </Text>
      </View>

      <Card compact>
        <StatRow
          label="質問回数"
          value={
            turn.questionCount +
            ' 回' +
            (turn.freeQuestionCount > 0 ? `（うち無料 ${turn.freeQuestionCount} 回）` : '')
          }
        />
        <StatRow
          label="攻撃可能サイズ"
          value={
            Math.round(turn.attackMultiplier * 100) +
            '%（' +
            turn.maxAttackCoverage.toFixed(2) +
            '%）'
          }
        />
        <StatRow label="守り側が覆った割合" value={turn.defenseCoverage.toFixed(2) + '%'} />
        <StatRow label="攻め側が覆った割合" value={turn.attackCoverage.toFixed(2) + '%'} />
        <StatRow label="重複面積" value={turn.overlapCoverage.toFixed(2) + '%'} />
        <StatRow label="ラウンドの配点" value={turn.scoreWeight.toFixed(2) + '%'} />
        <StatRow
          label="的中率"
          value={turn.hitRate.toFixed(2) + '%'}
          emphasis
          color={colors.overlap}
        />
        <StatRow
          label="今回削った割合"
          value={turn.carved.toFixed(2) + '%'}
          emphasis
          color={playerColor(attacker)}
        />
      </Card>

      <SectionTitle>累計（100% のうち削った領域）</SectionTitle>
      <View style={styles.donutRow}>
        <ScoreDonut
          value={state.scores[0]}
          previousValue={attacker === 0 ? previousAttackerScore : undefined}
          color={colors.playerA}
          label={playerName(state, 0)}
          size={donutSize}
        />
        <ScoreDonut
          value={state.scores[1]}
          previousValue={attacker === 1 ? previousAttackerScore : undefined}
          color={colors.playerB}
          label={playerName(state, 1)}
          size={donutSize}
        />
      </View>
    </Screen>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: '700',
    flexShrink: 1,
  },
  reveal: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: 2,
  },
  revealLabel: {
    color: colors.textDim,
    fontSize: fontSize.caption,
  },
  revealValue: {
    fontSize: fontSize.heading,
    fontWeight: '900',
  },
  revealCondition: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    textAlign: 'center',
  },
  fieldWrapper: {
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    maxWidth: 130,
  },
  highlight: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    gap: 2,
  },
  highlightLabel: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '700',
    letterSpacing: 2,
  },
  highlightValue: {
    color: colors.overlap,
    fontSize: 52,
    lineHeight: 58,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  highlightSub: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  donutRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
});
