import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ALL_CONDITION_KINDS,
  ALL_GEOMETRIC_SHAPE_KINDS,
  ALL_SHAPE_KINDS,
  ATTACK_SIZE_MULTIPLIERS,
  DEFENSE_COVERAGE,
  FREE_QUESTIONS_PER_TURN,
  MAX_QUESTIONS,
  ROUND_COUNT_OPTIONS,
  SHAPE_CANDIDATE_COUNT,
} from '../config/gameConfig';
import { ANIMAL_KINDS } from '../domain/animals';
import { colors, fontSize, playerColor, radii, spacing } from '../config/theme';
import { Badge, ChoiceChip } from '../components/ui/Badge';
import { AppButton } from '../components/ui/Button';
import { Card, SectionTitle } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { CONDITION_DEFS } from '../domain/conditions';
import { shapeLabel } from '../domain/shapes';
import { useGame } from '../state/GameProvider';
import type {
  AnimalRenderMode,
  ConditionKind,
  ConditionMode,
  PlayerIndex,
  ShapeKind,
} from '../domain/types';

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function HomeScreen() {
  const { state, dispatch } = useGame();
  const [names, setNames] = useState<[string, string]>([...state.settings.playerNames]);
  const [roundCount, setRoundCount] = useState(state.settings.roundCount);
  const [mode, setMode] = useState<ConditionMode>(state.settings.conditionMode);
  const [shapes, setShapes] = useState<ShapeKind[]>([...state.settings.allowedShapes]);
  const [conditions, setConditions] = useState<ConditionKind[]>([
    ...state.settings.allowedConditions,
  ]);
  const [firstAttacker, setFirstAttacker] = useState<PlayerIndex | 'random'>(
    state.settings.firstAttacker,
  );
  const [renderMode, setRenderMode] = useState<AnimalRenderMode>(state.settings.animalRenderMode);

  const customInvalid =
    mode === 'custom' && (shapes.length < SHAPE_CANDIDATE_COUNT || conditions.length === 0);
  const multiplierText = ATTACK_SIZE_MULTIPLIERS.map((m) => Math.round(m * 100) + '%').join(' → ');

  const start = () => {
    dispatch({
      type: 'START_GAME',
      settings: {
        roundCount,
        playerNames: [names[0].trim() || 'プレイヤー1', names[1].trim() || 'プレイヤー2'],
        conditionMode: mode,
        allowedConditions: mode === 'custom' ? conditions : [...ALL_CONDITION_KINDS],
        allowedShapes: mode === 'custom' ? shapes : [...ALL_SHAPE_KINDS],
        firstAttacker,
        animalRenderMode: renderMode,
      },
    });
  };

  return (
    <Screen
      footer={
        <AppButton
          label="ゲーム開始"
          onPress={start}
          disabled={customInvalid}
          caption={
            customInvalid
              ? `図形を${SHAPE_CANDIDATE_COUNT}種類以上、条件を1つ以上選んでください`
              : '全 ' + roundCount + ' ラウンド / 2人対戦'
          }
        />
      }
    >
      <View style={styles.hero}>
        <Badge label="陣取り推理ゲーム" color={colors.primary} />
        <Text style={styles.title}>陣内どこ？</Text>
        <Text style={styles.subtitle}>
          相手が隠した図形を、質問と推理で暴いて陣地を削り取れ。
        </Text>
      </View>

      <SectionTitle>プレイヤー</SectionTitle>
      <Card compact>
        {[0, 1].map((index) => (
          <View key={index} style={styles.nameRow}>
            <View style={[styles.nameDot, { backgroundColor: playerColor(index as PlayerIndex) }]} />
            <TextInput
              value={names[index]}
              onChangeText={(text) => {
                const next: [string, string] = [names[0], names[1]];
                next[index] = text;
                setNames(next);
              }}
              placeholder={'プレイヤー' + (index + 1)}
              placeholderTextColor={colors.textDim}
              style={styles.input}
              maxLength={12}
              returnKeyType="done"
            />
          </View>
        ))}
      </Card>

      <SectionTitle>ラウンド数</SectionTitle>
      <View style={styles.chipRow}>
        {ROUND_COUNT_OPTIONS.map((option) => (
          <ChoiceChip
            key={option}
            label={String(option)}
            selected={roundCount === option}
            onPress={() => setRoundCount(option)}
            style={styles.flexChip}
          />
        ))}
      </View>
      <Text style={styles.note}>
        1ラウンド = 2ターン（両プレイヤーが攻め・守りを1回ずつ）。全 {roundCount * 2} ターン。
      </Text>

      <SectionTitle>1ターン目の攻め</SectionTitle>
      <View style={styles.chipRow}>
        <ChoiceChip
          label={names[0].trim() || 'プレイヤー1'}
          selected={firstAttacker === 0}
          onPress={() => setFirstAttacker(0)}
          color={colors.playerA}
          style={styles.flexChip}
        />
        <ChoiceChip
          label={names[1].trim() || 'プレイヤー2'}
          selected={firstAttacker === 1}
          onPress={() => setFirstAttacker(1)}
          color={colors.playerB}
          style={styles.flexChip}
        />
        <ChoiceChip
          label="ランダム"
          selected={firstAttacker === 'random'}
          onPress={() => setFirstAttacker('random')}
          style={styles.flexChip}
        />
      </View>

      <SectionTitle>条件設定</SectionTitle>
      <View style={styles.chipRow}>
        <ChoiceChip
          label="ランダム"
          selected={mode === 'random'}
          onPress={() => setMode('random')}
          style={styles.flexChip}
        />
        <ChoiceChip
          label="カスタム"
          selected={mode === 'custom'}
          onPress={() => setMode('custom')}
          style={styles.flexChip}
        />
      </View>

      {mode === 'random' ? (
        <Text style={styles.note}>
          図形と配置条件を毎ラウンド自動で抽選します。面積的に配置不可能な組み合わせは自動で除外されます。
        </Text>
      ) : (
        <Card compact>
          <Text style={styles.customLabel}>使用する図形（幾何）</Text>
          <View style={styles.chipWrap}>
            {ALL_GEOMETRIC_SHAPE_KINDS.map((kind) => (
              <ChoiceChip
                key={kind}
                label={shapeLabel(kind)}
                selected={shapes.includes(kind)}
                onPress={() => setShapes(toggle(shapes, kind))}
              />
            ))}
          </View>
          <Text style={[styles.customLabel, styles.customLabelSpaced]}>使用する図形（動物）</Text>
          <View style={styles.chipWrap}>
            {ANIMAL_KINDS.map((kind) => (
              <ChoiceChip
                key={kind}
                label={shapeLabel(kind)}
                selected={shapes.includes(kind)}
                onPress={() => setShapes(toggle(shapes, kind))}
                color={colors.defense}
              />
            ))}
          </View>
          <Text style={[styles.customLabel, styles.customLabelSpaced]}>使用する配置条件</Text>
          <View style={styles.chipWrap}>
            {ALL_CONDITION_KINDS.map((kind) => (
              <ChoiceChip
                key={kind}
                label={CONDITION_DEFS[kind].shortLabel}
                selected={conditions.includes(kind)}
                onPress={() => setConditions(toggle(conditions, kind))}
              />
            ))}
          </View>
        </Card>
      )}

      <SectionTitle>動物図形の表示</SectionTitle>
      <View style={styles.chipRow}>
        <ChoiceChip
          label="イラスト"
          selected={renderMode === 'illustration'}
          onPress={() => setRenderMode('illustration')}
          color={colors.defense}
          style={styles.flexChip}
        />
        <ChoiceChip
          label="シルエット"
          selected={renderMode === 'silhouette'}
          onPress={() => setRenderMode('silhouette')}
          color={colors.defense}
          style={styles.flexChip}
        />
      </View>
      <Text style={styles.note}>
        見た目だけの切り替えです。どちらを選んでも図形の当たり判定（面積・重なり）は同じです。
      </Text>

      <SectionTitle>ルール</SectionTitle>
      <Card compact>
        <Rule
          step="1"
          text={
            '守り側は ' +
            SHAPE_CANDIDATE_COUNT +
            ' つの候補から図形を選び、フィールドの ' +
            DEFENSE_COVERAGE.min +
            '〜' +
            DEFENSE_COVERAGE.max +
            '%（目安 ' +
            DEFENSE_COVERAGE.target +
            '%）を覆うように配置します。円の外へはみ出した分は面積に数えません。'
          }
        />
        <Rule
          step="2"
          text="攻め側には図形の種類も位置も知らされません。質問だけが手がかりです。"
        />
        <Rule
          step="3"
          text={
            '質問は最大 ' +
            MAX_QUESTIONS +
            ' 回。最初の ' +
            FREE_QUESTIONS_PER_TURN +
            ' 回は無料で、それ以降は囲める面積が ' +
            multiplierText +
            ' と小さくなります。'
          }
        />
        <Rule
          step="4"
          text="今回削った割合 = ラウンドの配点 × 的中率。これを累積し、100% のうち多く削った方の勝ちです。"
        />
      </Card>
    </Screen>
  );
}

function Rule({ step, text }: { step: string; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.ruleStep}>
        <Text style={styles.ruleStepText}>{step}</Text>
      </View>
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.hero,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    lineHeight: 22,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  nameDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.body,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  flexChip: {
    flex: 1,
  },
  note: {
    color: colors.textDim,
    fontSize: fontSize.small,
    lineHeight: 19,
  },
  customLabel: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  customLabelSpaced: {
    marginTop: spacing.md,
  },
  ruleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  ruleStep: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  ruleStepText: {
    color: colors.primary,
    fontSize: fontSize.caption,
    fontWeight: '800',
  },
  ruleText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: fontSize.small,
    lineHeight: 20,
  },
});
