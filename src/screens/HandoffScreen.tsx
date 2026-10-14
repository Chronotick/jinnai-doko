import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, playerColor, radii, spacing } from '../config/theme';
import { Badge } from '../components/ui/Badge';
import { AppButton } from '../components/ui/Button';
import { Screen } from '../components/ui/Screen';
import { playerName } from '../domain/gameEngine';
import { useEntrance } from '../hooks/useTween';
import { useGame } from '../state/GameProvider';

/**
 * 端末受け渡し画面。
 * 守り側の図形が攻め側に見えないよう、役割が変わるたびにこの画面を挟む。
 */
export function HandoffScreen() {
  const { state, dispatch } = useGame();
  const handoff = state.handoff;
  const progress = useEntrance(420);
  if (!handoff) return null;

  const color = playerColor(handoff.toPlayer);
  const name = playerName(state, handoff.toPlayer);

  return (
    <Screen
      scroll={false}
      contentStyle={styles.content}
      footer={
        <AppButton
          label="準備OK・進む"
          onPress={() => dispatch({ type: 'HANDOFF_CONTINUE' })}
          accent={color}
          caption={name + ' さんが操作します'}
        />
      }
    >
      <View style={[styles.center, { opacity: progress }]}>
        <View style={[styles.iconCircle, { borderColor: color }]}>
          <Text style={[styles.icon, { color }]}>⇄</Text>
        </View>

        <Text style={styles.lead}>端末を渡してください</Text>
        <Text style={[styles.name, { color }]} numberOfLines={2}>
          {name}
        </Text>
        <Badge label={handoff.roleLabel + '側'} color={color} filled />

        <View style={styles.messageBox}>
          <Text style={styles.message}>{handoff.message}</Text>
        </View>

        <Text style={styles.warning}>
          相手の画面をのぞかないでください。ここから先の内容は{name} さん専用です。
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 44,
    fontWeight: '700',
  },
  lead: {
    color: colors.textMuted,
    fontSize: fontSize.title,
    fontWeight: '600',
  },
  name: {
    fontSize: fontSize.display,
    fontWeight: '900',
    textAlign: 'center',
  },
  messageBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  message: {
    color: colors.text,
    fontSize: fontSize.body,
    lineHeight: 23,
    textAlign: 'center',
  },
  warning: {
    color: colors.textDim,
    fontSize: fontSize.small,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: spacing.md,
  },
});
