import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, playerColor, radii, spacing } from '../config/theme';
import { Badge } from '../components/ui/Badge';
import { AppButton } from '../components/ui/Button';
import { Card, SectionTitle } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { AttackSizeGauge } from '../components/game/AttackSizeGauge';
import { RoundInfoCard } from '../components/game/RoundInfoCard';
import { QUESTION_DEFS, type QuestionDef } from '../domain/questions';
import { attackerView } from '../domain/visibility';
import { useGame } from '../state/GameProvider';
import type { AskedQuestion } from '../domain/types';

/**
 * ④ 攻め側・質問画面
 *
 * この画面は GameState を直接参照せず、必ず attackerView 経由で描画する。
 * 守り側の図形・配置条件・図形候補はビューに含まれないため、表示しようがない。
 */
export function QuestionScreen() {
  const { state, dispatch } = useGame();
  const view = attackerView(state);
  if (!view) return null;

  const color = playerColor(view.attacker);
  const limitReached = view.questionCount >= view.maxQuestions;
  const answeredMap = new Map<string, AskedQuestion>(
    view.askedQuestions.map((item) => [item.id, item]),
  );

  return (
    <Screen
      footer={
        <AppButton
          label="質問を終了して攻撃する"
          onPress={() => dispatch({ type: 'END_QUESTIONS' })}
          accent={colors.attack}
          caption={
            '質問 ' +
            view.questionCount +
            ' 回 / 攻撃可能サイズ ' +
            Math.round(view.attackMultiplier * 100) +
            '%（最大 ' +
            view.maxAttackCoverage.toFixed(2) +
            '%）'
          }
        />
      }
    >
      <View style={styles.header}>
        <Badge label={'攻め  ROUND ' + view.roundNumber} color={color} filled />
        <Text style={styles.headerName} numberOfLines={1}>
          {view.attackerName}
        </Text>
      </View>

      <RoundInfoCard
        roundNumber={view.roundNumber}
        roundCount={view.roundCount}
        scoreWeight={view.scoreWeight}
        attackerName={view.attackerName}
        defenderName={view.defenderName}
        attackerColor={playerColor(view.attacker)}
        defenderColor={playerColor(view.attacker === 0 ? 1 : 0)}
        compact
      />

      <View style={styles.secretBox}>
        <Text style={styles.secretTitle}>守り側の図形は完全に非公開です</Text>
        <Text style={styles.secretText}>
          形・大きさ・位置のどれも分かりません。相手はフィールドの 15〜25% を覆う図形を
          どこかに置いています。質問で絞り込みましょう。
        </Text>
      </View>

      <AttackSizeGauge questionCount={view.questionCount} maxCoverage={view.maxAttackCoverage} />

      <View style={styles.counterRow}>
        <Text style={styles.counterText}>
          質問回数 <Text style={styles.counterValue}>{view.questionCount}</Text> / {view.maxQuestions}
        </Text>
        <Text style={[styles.counterHint, view.nextQuestionIsFree && styles.counterHintFree]}>
          {limitReached
            ? '質問回数の上限に達しました'
            : view.nextQuestionIsFree
              ? '次の質問は無料です'
              : '1回質問するごとに攻撃可能サイズが縮みます'}
        </Text>
      </View>

      <SectionTitle>質問カード</SectionTitle>
      {QUESTION_DEFS.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          answered={answeredMap.get(question.id)}
          disabled={limitReached}
          free={view.nextQuestionIsFree}
          onAsk={() => dispatch({ type: 'ASK_QUESTION', questionId: question.id })}
        />
      ))}

      {view.askedQuestions.length > 0 ? (
        <>
          <SectionTitle>得られた手がかり</SectionTitle>
          <Card compact>
            {view.askedQuestions.map((item, index) => (
              <View key={item.id} style={styles.clueRow}>
                <Text style={styles.clueIndex}>{index + 1}</Text>
                <View style={styles.clueBody}>
                  <Text style={styles.clueQuestion}>{item.text}</Text>
                  <Text
                    style={[
                      styles.clueAnswer,
                      { color: item.answer ? colors.success : colors.danger },
                    ]}
                  >
                    {item.answerText}
                  </Text>
                </View>
                {!item.penalized ? <Text style={styles.clueFree}>無料</Text> : null}
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

interface QuestionCardProps {
  question: QuestionDef;
  answered?: AskedQuestion;
  disabled: boolean;
  free: boolean;
  onAsk: () => void;
}

function QuestionCard({ question, answered, disabled, free, onAsk }: QuestionCardProps) {
  const isAnswered = Boolean(answered);
  const locked = isAnswered || disabled;

  return (
    <Pressable
      onPress={onAsk}
      disabled={locked}
      android_ripple={locked ? undefined : { color: 'rgba(255,255,255,0.1)' }}
      style={({ pressed }) => [
        styles.card,
        isAnswered && styles.cardAnswered,
        locked && !isAnswered && styles.cardDisabled,
        pressed && !locked && styles.cardPressed,
      ]}
    >
      <View style={styles.cardTextWrap}>
        <Text style={styles.cardQuestion}>{question.text}</Text>
        {answered ? (
          <Text
            style={[styles.cardAnswer, { color: answered.answer ? colors.success : colors.danger }]}
          >
            {answered.answerText}
          </Text>
        ) : null}
      </View>
      {!isAnswered ? (
        <View
          style={[
            styles.askButton,
            free && !disabled && styles.askButtonFree,
            disabled && styles.askButtonDisabled,
          ]}
        >
          <Text
            style={[
              styles.askButtonText,
              free && !disabled && styles.askButtonTextFree,
              disabled && styles.askButtonTextDisabled,
            ]}
          >
            {free && !disabled ? '無料' : '質問'}
          </Text>
        </View>
      ) : (
        <Text style={styles.answeredMark}>済</Text>
      )}
    </Pressable>
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
  secretBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  secretTitle: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  secretText: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    lineHeight: 19,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  counterText: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  counterValue: {
    color: colors.attack,
    fontSize: fontSize.title,
    fontWeight: '800',
  },
  counterHint: {
    color: colors.textDim,
    fontSize: fontSize.caption,
    flexShrink: 1,
    textAlign: 'right',
  },
  counterHintFree: {
    color: colors.success,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 64,
  },
  cardAnswered: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
  },
  cardDisabled: {
    opacity: 0.45,
  },
  cardPressed: {
    borderColor: colors.attack,
  },
  cardTextWrap: {
    flex: 1,
    gap: 3,
  },
  cardQuestion: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
    lineHeight: 21,
  },
  cardAnswer: {
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  askButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(251, 191, 36, 0.16)',
    borderWidth: 1,
    borderColor: colors.attack,
    minWidth: 56,
    alignItems: 'center',
  },
  askButtonFree: {
    backgroundColor: 'rgba(52, 211, 153, 0.16)',
    borderColor: colors.success,
  },
  askButtonDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  askButtonText: {
    color: colors.attack,
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  askButtonTextFree: {
    color: colors.success,
  },
  askButtonTextDisabled: {
    color: colors.textDim,
  },
  answeredMark: {
    color: colors.textDim,
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  clueRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'flex-start',
  },
  clueIndex: {
    color: colors.textDim,
    fontSize: fontSize.small,
    fontWeight: '800',
    width: 16,
  },
  clueBody: {
    flex: 1,
    gap: 2,
  },
  clueQuestion: {
    color: colors.textMuted,
    fontSize: fontSize.small,
  },
  clueAnswer: {
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  clueFree: {
    color: colors.success,
    fontSize: fontSize.caption,
    fontWeight: '800',
  },
});
