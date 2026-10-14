import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/config/theme';
import { AttackScreen } from './src/screens/AttackScreen';
import { DefenseScreen } from './src/screens/DefenseScreen';
import { FinalResultScreen } from './src/screens/FinalResultScreen';
import { HandoffScreen } from './src/screens/HandoffScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { QuestionScreen } from './src/screens/QuestionScreen';
import { RoundIntroScreen } from './src/screens/RoundIntroScreen';
import { RoundResultScreen } from './src/screens/RoundResultScreen';
import { TurnResultScreen } from './src/screens/TurnResultScreen';
import { GameProvider, useGame } from './src/state/GameProvider';

/**
 * 画面遷移はゲームのフェーズ（ステートマシン）で決まるため、
 * ナビゲーションライブラリを使わず phase → 画面のマッピングで表現している。
 */
function PhaseRouter() {
  const { state } = useGame();
  const key = `${state.phase}-${state.roundIndex}-${state.turnIndex}`;

  switch (state.phase) {
    case 'roundIntro':
      return <RoundIntroScreen key={key} />;
    case 'handoff':
      return <HandoffScreen key={`${key}-${state.handoff?.nextPhase ?? ''}`} />;
    case 'defense':
      return <DefenseScreen key={key} />;
    case 'question':
      return <QuestionScreen key={key} />;
    case 'attack':
      return <AttackScreen key={key} />;
    case 'turnResult':
      return <TurnResultScreen key={key} />;
    case 'roundResult':
      return <RoundResultScreen key={key} />;
    case 'final':
      return <FinalResultScreen key={key} />;
    case 'home':
    default:
      return <HomeScreen key="home" />;
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="light" />
        <GameProvider>
          <PhaseRouter />
        </GameProvider>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
