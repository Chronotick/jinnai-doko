import React, { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ALL_SHAPE_KINDS, ATTACK_MIN_AREA_FACTOR } from '../config/gameConfig';
import { fieldSizeFor } from '../config/layout';
import { colors, fontSize, playerColor, radii, spacing } from '../config/theme';
import { Badge, CheckItem } from '../components/ui/Badge';
import { AppButton } from '../components/ui/Button';
import { Card, SectionTitle } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { ShapeEditor } from '../components/field/ShapeEditor';
import { ShapePicker } from '../components/game/ShapePicker';
import { shapeCoverage, sizeForCoverage } from '../domain/coverage';
import { isCenterInsideField } from '../domain/placement';
import { attackerView } from '../domain/visibility';
import { useGame } from '../state/GameProvider';
import type { Shape, ShapeKind } from '../domain/types';

/**
 * ⑤ 攻撃図形配置画面
 *
 * 守り側の図形は表示しないどころか、この画面からは参照すらできない
 * （attackerView にしかアクセスしないため）。
 * 攻め側は自分で図形を選び、質問で得た手がかりだけを頼りに配置する。
 */
export function AttackScreen() {
  const { state, dispatch } = useGame();
  const view = attackerView(state);
  const { width } = useWindowDimensions();

  const maxCoverage = view?.maxAttackCoverage ?? 0;

  const [shape, setShape] = useState<Shape>(() => {
    const base: Shape = { kind: 'circle', cx: 0, cy: 0, size: 0.4, rotation: 0 };
    return { ...base, size: sizeForCoverage(base, maxCoverage) };
  });

  if (!view) return null;

  const color = colors.attack;
  const coverage = shapeCoverage(shape);
  const centerOk = isCenterInsideField(shape);
  const sizeOk = coverage <= maxCoverage + 1e-6;
  const valid = centerOk && sizeOk;

  const coverageRange = {
    min: Math.max(0.5, maxCoverage * ATTACK_MIN_AREA_FACTOR),
    max: maxCoverage,
  };

  const selectKind = (kind: ShapeKind) => {
    if (kind === shape.kind) return;
    const next: Shape = { ...shape, kind };
    setShape({ ...next, size: sizeForCoverage(next, Math.min(coverage, maxCoverage)) });
  };

  const fieldSize = fieldSizeFor(width);

  return (
    <Screen
      footer={
        <AppButton
          label="この位置で攻撃する"
          onPress={() => dispatch({ type: 'CONFIRM_ATTACK', shape })}
          disabled={!valid}
          accent={color}
          caption={
            valid ? '守り側の図形と重ね合わせます' : '上限サイズ以内・中心はフィールド内にしてください'
          }
        />
      }
    >
      <View style={styles.header}>
        <Badge label={'攻め  ROUND ' + view.roundNumber} color={playerColor(view.attacker)} filled />
        <Text style={styles.headerName} numberOfLines={1}>
          {view.attackerName}
        </Text>
      </View>

      <View style={styles.banner}>
        <View style={styles.bannerLeft}>
          <Text style={styles.bannerLabel}>最大攻撃可能サイズ</Text>
          <Text style={styles.bannerNote}>
            質問 {view.questionCount} 回 → 基準面積の {Math.round(view.attackMultiplier * 100)}%
          </Text>
        </View>
        <View style={styles.bannerRight}>
          <Text style={styles.bannerValue}>{Math.round(view.attackMultiplier * 100)}%</Text>
          <Text style={styles.bannerArea}>= フィールドの {maxCoverage.toFixed(2)}%</Text>
        </View>
      </View>

      <SectionTitle>攻撃に使う図形</SectionTitle>
      <ShapePicker
        candidates={ALL_SHAPE_KINDS}
        selected={shape.kind}
        onSelect={selectKind}
        color={color}
        animalRenderMode={view.animalRenderMode}
        scrollable
        thumbnailSize={44}
      />

      <ShapeEditor
        shape={shape}
        onChange={setShape}
        color={color}
        coverageRange={coverageRange}
        fieldSize={fieldSize}
        valid={valid}
        animalRenderMode={view.animalRenderMode}
      />

      <Card compact>
        <CheckItem
          ok={sizeOk}
          label="攻撃可能サイズ以内"
          detail={'現在 ' + coverage.toFixed(2) + '% / 上限 ' + maxCoverage.toFixed(2) + '%'}
        />
        <CheckItem ok={centerOk} label="図形の中心がフィールド内にある" />
      </Card>

      {view.askedQuestions.length > 0 ? (
        <>
          <SectionTitle>手がかり</SectionTitle>
          <Card compact>
            {view.askedQuestions.map((item) => (
              <View key={item.id} style={styles.clueRow}>
                <Text style={styles.clueQuestion}>{item.text}</Text>
                <Text
                  style={[
                    styles.clueAnswer,
                    { color: item.answer ? colors.success : colors.danger },
                  ]}
                >
                  {item.answer ? 'はい' : 'いいえ'}
                </Text>
              </View>
            ))}
          </Card>
        </>
      ) : (
        <Text style={styles.noClue}>
          質問なし。守り側の形も位置も完全に未知のまま、大きく囲って狙います。
        </Text>
      )}
    </Screen>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderColor: colors.attack,
    borderWidth: 1.5,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  bannerLeft: {
    flexShrink: 1,
  },
  bannerLabel: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  bannerNote: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    marginTop: 2,
  },
  bannerRight: {
    alignItems: 'flex-end',
  },
  bannerValue: {
    color: colors.attack,
    fontSize: fontSize.display,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    lineHeight: 34,
  },
  bannerArea: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontVariant: ['tabular-nums'],
  },
  clueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 4,
  },
  clueQuestion: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    flex: 1,
  },
  clueAnswer: {
    fontSize: fontSize.body,
    fontWeight: '800',
  },
  noClue: {
    color: colors.textDim,
    fontSize: fontSize.small,
    lineHeight: 19,
  },
});
