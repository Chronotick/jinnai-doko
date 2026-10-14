import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  DEFENSE_COVERAGE,
  DEFENSE_COVERAGE_SLIDER,
  DEFENSE_COVERAGE_SNAP,
} from '../config/gameConfig';
import { fieldSizeFor } from '../config/layout';
import { colors, fontSize, playerColor, radii, spacing } from '../config/theme';
import { Badge, CheckItem } from '../components/ui/Badge';
import { AppButton } from '../components/ui/Button';
import { Card, SectionTitle } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { ShapeEditor } from '../components/field/ShapeEditor';
import { ShapePicker } from '../components/game/ShapePicker';
import { conditionCheckLabel, describeCondition, testCondition } from '../domain/conditions';
import { isCoverageInRange, shapeCoverage, sizeForCoverage } from '../domain/coverage';
import { currentDefender, currentRound, playerName } from '../domain/gameEngine';
import { findValidPlacement, isCenterInsideField } from '../domain/placement';
import { createRng } from '../domain/rng';
import { shapeGeometry } from '../domain/shapes';
import { useGame } from '../state/GameProvider';
import type { AnimalRenderMode, Shape, ShapeKind } from '../domain/types';

/** ③ 守り側・図形選択 / 配置画面 */
export function DefenseScreen() {
  const { state, dispatch } = useGame();
  const round = currentRound(state);
  const { width } = useWindowDimensions();
  const defender = currentDefender(state);
  const color = playerColor(defender);
  const renderMode = state.settings.animalRenderMode;

  const rngRef = useRef(createRng(state.seed + state.roundIndex * 1013 + state.turnIndex * 37 + 5));

  const placeShape = (kind: ShapeKind): Shape => {
    if (!round) return { kind, cx: 0, cy: 0, size: 0.4, rotation: 0 };
    const found = findValidPlacement(kind, round.condition, rngRef.current, { attempts: 900 });
    if (found) return found;
    const fallback: Shape = { kind, cx: 0, cy: 0, size: 0.4, rotation: 0 };
    return { ...fallback, size: sizeForCoverage(fallback, DEFENSE_COVERAGE.target) };
  };

  const [shape, setShape] = useState<Shape>(() => placeShape(round?.shapeCandidates[0] ?? 'circle'));

  const checks = useMemo(() => {
    if (!round) return null;
    const coverage = shapeCoverage(shape);
    const coverageOk = isCoverageInRange(coverage);
    const centerOk = isCenterInsideField(shape);
    const conditionOk = testCondition(round.condition, shapeGeometry(shape));
    return { coverage, coverageOk, centerOk, conditionOk, all: coverageOk && centerOk && conditionOk };
  }, [round, shape]);

  if (!round || !checks) return null;

  const selectCandidate = (kind: ShapeKind) => {
    if (kind === shape.kind) return;
    setShape(placeShape(kind));
  };

  const autoPlace = () => setShape(placeShape(shape.kind));

  const toggleRenderMode = () => {
    const mode: AnimalRenderMode = renderMode === 'illustration' ? 'silhouette' : 'illustration';
    dispatch({ type: 'SET_ANIMAL_RENDER_MODE', mode });
  };

  const fieldSize = fieldSizeFor(width);

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <AppButton label="おまかせ配置" onPress={autoPlace} variant="secondary" size="sm" />
          <AppButton
            label="この図形・この位置で決定"
            onPress={() => dispatch({ type: 'CONFIRM_DEFENSE', shape })}
            disabled={!checks.all}
            accent={color}
            caption={
              checks.all ? '図形も位置も相手には伏せられます' : 'すべての条件を満たしてください'
            }
          />
        </View>
      }
    >
      <View style={styles.header}>
        <Badge label={'守り  ROUND ' + (round.index + 1)} color={color} filled />
        <Text style={styles.headerName} numberOfLines={1}>
          {playerName(state, defender)}
        </Text>
      </View>

      <SectionTitle>図形を選ぶ</SectionTitle>
      <ShapePicker
        candidates={round.shapeCandidates}
        selected={shape.kind}
        onSelect={selectCandidate}
        color={color}
        animalRenderMode={renderMode}
      />
      <Text style={styles.pickerNote}>
        選んだ図形は攻め側に知らされません。質問されるまで形も場所も秘密です。
      </Text>

      <Card compact style={styles.requirement}>
        <View style={styles.requirementRow}>
          <RequirementItem
            label="覆う割合"
            value={`${DEFENSE_COVERAGE.min}〜${DEFENSE_COVERAGE.max}%`}
            highlight
          />
          <RequirementItem label="目安" value={`${DEFENSE_COVERAGE.target}%`} />
        </View>
        <Text style={styles.conditionText}>{describeCondition(round.condition)}</Text>
      </Card>

      <ShapeEditor
        shape={shape}
        onChange={setShape}
        color={color}
        coverageRange={DEFENSE_COVERAGE_SLIDER}
        coverageSnap={DEFENSE_COVERAGE.target}
        coverageSnapWindow={DEFENSE_COVERAGE_SNAP}
        fieldSize={fieldSize}
        valid={checks.all}
        animalRenderMode={renderMode}
      />

      <Card compact>
        <CheckItem
          ok={checks.coverageOk}
          label="フィールドを覆う割合"
          detail={
            '必要 ' +
            DEFENSE_COVERAGE.min +
            '〜' +
            DEFENSE_COVERAGE.max +
            '% / 現在 ' +
            checks.coverage.toFixed(2) +
            '%（円の外側は数えません）'
          }
        />
        <CheckItem ok={checks.conditionOk} label={conditionCheckLabel(round.condition)} />
        <CheckItem ok={checks.centerOk} label="図形の中心がフィールド内にある" />
      </Card>

      <Pressable
        onPress={toggleRenderMode}
        android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
        accessibilityRole="button"
        style={({ pressed }) => [styles.modeToggle, pressed && styles.modeTogglePressed]}
      >
        <Text style={styles.modeLabel}>動物の表示</Text>
        <Text style={[styles.modeValue, { color }]}>
          {renderMode === 'illustration' ? 'イラスト' : 'シルエット'}
        </Text>
      </Pressable>
      <Text style={styles.modeNote}>表示を変えても図形の当たり判定は変わりません。</Text>
    </Screen>
  );
}

function RequirementItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.requirementItem}>
      <Text style={styles.requirementLabel}>{label}</Text>
      <Text style={[styles.requirementValue, highlight && styles.requirementValueHighlight]}>
        {value}
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
  headerName: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: '700',
    flexShrink: 1,
  },
  pickerNote: {
    color: colors.textDim,
    fontSize: fontSize.caption,
    lineHeight: 18,
  },
  requirement: {
    gap: spacing.sm,
  },
  requirementRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  requirementItem: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  requirementLabel: {
    color: colors.textDim,
    fontSize: fontSize.caption,
  },
  requirementValue: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  requirementValueHighlight: {
    color: colors.primary,
  },
  conditionText: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
    lineHeight: 21,
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  modeTogglePressed: {
    backgroundColor: colors.surfaceAlt,
  },
  modeLabel: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  modeValue: {
    fontSize: fontSize.body,
    fontWeight: '800',
  },
  modeNote: {
    color: colors.textDim,
    fontSize: fontSize.caption,
  },
  footer: {
    gap: spacing.sm,
  },
});
