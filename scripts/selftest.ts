/**
 * ゲームロジックの自己検証スクリプト（UI 非依存）。
 *
 *   npm run selftest
 *
 * 幾何演算・被覆率・情報の非公開・質問の課金ルール・ラウンド生成・
 * ステートマシンを、実際の対戦フローと同じ順序で回して検証する。
 */
import {
  ALL_SHAPE_KINDS,
  ATTACK_SIZE_MULTIPLIERS,
  DEFENSE_COVERAGE,
  FREE_QUESTIONS_PER_TURN,
  MAX_QUESTIONS,
  SHAPE_CANDIDATE_COUNT,
} from '../src/config/gameConfig';
import { ANIMAL_DEFS, ANIMAL_KINDS } from '../src/domain/animals';
import { testCondition } from '../src/domain/conditions';
import {
  coverageShare,
  isCoverageInRange,
  overlapCoverage,
  shapeCoverage,
  sizeForCoverage,
} from '../src/domain/coverage';
import {
  type GameAction,
  defaultSettings,
  gameReducer,
  initialGameState,
  otherPlayer,
} from '../src/domain/gameEngine';
import {
  intersectionArea,
  polygonArea,
  subtractConvex,
  unionArea,
} from '../src/domain/geometry/polygon';
import { isSimplePolygon, triangulate } from '../src/domain/geometry/triangulate';
import { findValidPlacement } from '../src/domain/placement';
import { QUESTION_DEFS } from '../src/domain/questions';
import { createRng } from '../src/domain/rng';
import { distributeScoreWeights, generateRounds } from '../src/domain/roundSetup';
import {
  attackMultiplierFor,
  isQuestionFree,
  maxAttackCoverage,
  penalizedQuestionCount,
} from '../src/domain/scoring';
import {
  FIELD_AREA,
  FIELD_POLYGON,
  localOutlineMaxRadius,
  shapeAreaShare,
  shapeGeometry,
  shapeParts,
  shapeToPolygon,
  sizeForAreaShare,
} from '../src/domain/shapes';
import { attackerView, findDefenseLeaks } from '../src/domain/visibility';
import type { GameSettings, GameState, Shape, ShapeKind } from '../src/domain/types';

let failures = 0;
let checks = 0;

function check(condition: boolean, message: string): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error('  ✗ ' + message);
  }
}

function section(title: string): void {
  console.log('\n== ' + title + ' ==');
}

const square = (cx: number, cy: number, half: number) => [
  { x: cx - half, y: cy - half },
  { x: cx + half, y: cy - half },
  { x: cx + half, y: cy + half },
  { x: cx - half, y: cy + half },
];

// --- 1. 幾何 ------------------------------------------------------------

section('幾何演算');
{
  const circle: Shape = { kind: 'circle', cx: 0, cy: 0, size: 0.5, rotation: 0 };
  const same = shapeToPolygon(circle);
  check(
    Math.abs(polygonArea(same) - Math.PI * 0.25) / (Math.PI * 0.25) < 0.001,
    '円のポリゴン面積が解析解と一致する',
  );
  check(
    Math.abs(intersectionArea(same, same) - polygonArea(same)) < 1e-6,
    '同一図形どうしの重複面積は自身の面積',
  );

  const far: Shape = { kind: 'circle', cx: 0.9, cy: 0, size: 0.05, rotation: 0 };
  check(intersectionArea(same, shapeToPolygon(far)) === 0, '離れた図形の重複面積は 0');

  const half: Shape = { kind: 'circle', cx: 0.5, cy: 0, size: 0.5, rotation: 0 };
  const ratio = intersectionArea(same, shapeToPolygon(half)) / polygonArea(same);
  check(Math.abs(ratio - 0.391) < 0.005, '半径ぶんずらした 2 円の重複比が理論値と一致する');

  check(Math.abs(polygonArea(FIELD_POLYGON) - FIELD_AREA) < 1e-9, 'フィールド面積が定数と一致');

  for (const kind of ALL_SHAPE_KINDS) {
    check(
      Math.abs(localOutlineMaxRadius(kind) - 1) < 1e-9,
      kind + ' のローカル輪郭は最遠点距離が 1 に正規化されている',
    );
    for (const target of [3, 12.5, 27.3]) {
      const size = sizeForAreaShare(kind, target);
      const actual = shapeAreaShare({ kind, cx: 0, cy: 0, size, rotation: 0.3 });
      check(Math.abs(actual - target) < 1e-6, kind + ' の面積指定と実面積が一致 (' + target + '%)');
    }
  }
}

// --- 2. 凹多角形の分解と集合演算 ----------------------------------------

section('凹多角形（動物図形）の分解');
for (const kind of ANIMAL_KINDS) {
  const def = ANIMAL_DEFS[kind];
  check(isSimplePolygon(def.outline), kind + ' の輪郭が自己交差していない');

  const triangles = triangulate(def.outline);
  check(triangles.length >= def.outline.length - 2 - 1, kind + ' が三角形に分解できている');

  const outlineArea = polygonArea(def.outline);
  const triangleArea = triangles.reduce((sum, t) => sum + polygonArea(t), 0);
  check(
    Math.abs(outlineArea - triangleArea) / outlineArea < 1e-9,
    kind + ' の三角形分割の総面積が輪郭面積と一致する',
  );

  // 分解された三角形どうしは重ならない（重なると面積を二重に数えてしまう）
  let pairwiseOverlap = 0;
  for (let i = 0; i < triangles.length; i += 1) {
    for (let j = i + 1; j < triangles.length; j += 1) {
      pairwiseOverlap += intersectionArea(triangles[i]!, triangles[j]!);
    }
  }
  check(pairwiseOverlap / outlineArea < 1e-9, kind + ' の三角形どうしが重なっていない');
}

section('集合演算（重なりの打ち消し）');
{
  const a = square(0, 0, 0.2);
  const b = square(0.2, 0, 0.2);
  const areaA = polygonArea(a);
  const overlap = intersectionArea(a, b);
  check(Math.abs(overlap - 0.2 * 0.4) < 1e-9, '2 つの正方形の重複面積が理論値と一致');

  const pieces = subtractConvex(a, b);
  const diffArea = pieces.reduce((sum, piece) => sum + polygonArea(piece), 0);
  check(Math.abs(diffArea - (areaA - overlap)) < 1e-9, 'subtractConvex の面積が A - A∩B と一致');

  const union = unionArea([a, b]);
  check(
    Math.abs(union - (areaA * 2 - overlap)) < 1e-9,
    'unionArea が重なりを 1 回だけ数える (A + B - A∩B)',
  );
  check(Math.abs(unionArea([a, a]) - areaA) < 1e-9, '同一図形の和集合は 1 つぶんの面積');
  check(
    Math.abs(unionArea([a, square(0.9, 0.9, 0.2)]) - areaA * 2) < 1e-9,
    '離れた図形の和集合は単純な和',
  );
}

// --- 3. 被覆率（フィールド円でのクリップ） ------------------------------

section('被覆率');
{
  for (const kind of ALL_SHAPE_KINDS) {
    const shape: Shape = {
      kind,
      cx: 0,
      cy: 0,
      size: sizeForAreaShare(kind, DEFENSE_COVERAGE.target),
      rotation: 0,
    };
    check(
      Math.abs(shapeCoverage(shape) - DEFENSE_COVERAGE.target) < 1e-6,
      kind + ' はフィールド内に収まっていれば被覆率 = 面積',
    );
  }

  const outside: Shape = { kind: 'circle', cx: 3, cy: 0, size: 0.3, rotation: 0 };
  check(shapeCoverage(outside) === 0, 'フィールド外の図形の被覆率は 0');

  const huge: Shape = { kind: 'circle', cx: 0, cy: 0, size: 5, rotation: 0 };
  check(Math.abs(shapeCoverage(huge) - 100) < 0.01, 'フィールドを包む図形の被覆率は 100%');

  const overflowing: Shape = { kind: 'circle', cx: 0.8, cy: 0, size: 0.5, rotation: 0 };
  check(
    shapeCoverage(overflowing) < shapeAreaShare(overflowing) - 1,
    'はみ出した図形は被覆率が面積より小さくなる（円の境界でクリップされる）',
  );

  // すべての図形種別で、はみ出した配置でも目標被覆率にぴったり合わせられる
  for (const kind of ALL_SHAPE_KINDS) {
    const base: Shape = { kind, cx: 0.75, cy: 0.25, size: 0.4, rotation: 0.7 };
    const fitted: Shape = { ...base, size: sizeForCoverage(base, DEFENSE_COVERAGE.target) };
    check(
      Math.abs(shapeCoverage(fitted) - DEFENSE_COVERAGE.target) < 0.01,
      kind + ' ではみ出す配置でも目標被覆率に合わせられる',
    );
  }

  // 複数図形の被覆率は重なりを二重に数えない
  const shapeA: Shape = { kind: 'square', cx: -0.1, cy: 0, size: 0.4, rotation: 0 };
  const shapeB: Shape = { kind: 'square', cx: 0.1, cy: 0, size: 0.4, rotation: 0 };
  const union = coverageShare([shapeA, shapeB]);
  const sum = shapeCoverage(shapeA) + shapeCoverage(shapeB);
  const pairOverlap = overlapCoverage(shapeA, shapeB);
  check(union < sum - 1, '重なり合う 2 図形の被覆率は単純な和より小さい');
  check(Math.abs(union - (sum - pairOverlap)) < 1e-6, '被覆率 = 面積の和 - 重なり');
  check(
    Math.abs(coverageShare([shapeA, shapeA]) - shapeCoverage(shapeA)) < 1e-9,
    '同じ図形を重ねても被覆率は増えない',
  );

  check(isCoverageInRange(DEFENSE_COVERAGE.target), '目安値は許容範囲内');
  check(isCoverageInRange(DEFENSE_COVERAGE.min), '下限は許容範囲内');
  check(isCoverageInRange(DEFENSE_COVERAGE.max), '上限は許容範囲内');
  check(!isCoverageInRange(DEFENSE_COVERAGE.min - 0.1), '下限未満は許容範囲外');
  check(!isCoverageInRange(DEFENSE_COVERAGE.max + 0.1), '上限超えは許容範囲外');
}

// --- 4. 描画モードと判定ジオメトリの独立性 ------------------------------

section('イラスト / シルエットの判定ジオメトリ');
for (const kind of ANIMAL_KINDS) {
  const shape: Shape = { kind, cx: 0.1, cy: -0.2, size: 0.5, rotation: 1.1 };

  // 判定に使うジオメトリは描画モードを引数に取らない（＝影響を受けようがない）
  const partsA = shapeParts(shape);
  const partsB = shapeParts(shape);
  check(
    JSON.stringify(partsA) === JSON.stringify(partsB),
    kind + ' の凸パーツ集合は常に同一',
  );

  const def = ANIMAL_DEFS[kind];
  check(def.details.length > 0, kind + ' にイラスト用の装飾が定義されている');

  // 装飾は輪郭に含まれない（頂点数が輪郭と一致する＝装飾が混ざっていない）
  check(
    shapeToPolygon(shape).length === def.outline.length,
    kind + ' の判定輪郭に装飾が混ざっていない',
  );
}
{
  // 設定が違っても採点結果が一致することを、実際のターン計算で確認する
  const defense: Shape = { kind: 'cat', cx: 0.1, cy: 0.1, size: 0.45, rotation: 0.4 };
  const attack: Shape = { kind: 'circle', cx: 0.15, cy: 0.05, size: 0.45, rotation: 0 };
  const run = (mode: 'illustration' | 'silhouette') => {
    const settings: GameSettings = { ...defaultSettings(), roundCount: 3, animalRenderMode: mode };
    let state: GameState = gameReducer(initialGameState(), {
      type: 'START_GAME',
      settings,
      seed: 4242,
    });
    state = gameReducer(state, { type: 'BEGIN_ROUND' });
    state = gameReducer(state, { type: 'HANDOFF_CONTINUE' });
    state = gameReducer(state, { type: 'CONFIRM_DEFENSE', shape: defense });
    state = gameReducer(state, { type: 'HANDOFF_CONTINUE' });
    state = gameReducer(state, { type: 'END_QUESTIONS' });
    state = gameReducer(state, { type: 'CONFIRM_ATTACK', shape: attack });
    return state.lastTurn!;
  };
  const illustration = run('illustration');
  const silhouette = run('silhouette');
  check(
    illustration.hitRate === silhouette.hitRate &&
      illustration.defenseCoverage === silhouette.defenseCoverage &&
      illustration.overlapCoverage === silhouette.overlapCoverage,
    'イラスト表示とシルエット表示で採点結果が完全に一致する',
  );
}

// --- 5. 質問の課金ルール（無料の初回質問） ------------------------------

section('質問回数と攻撃可能サイズ');
{
  check(FREE_QUESTIONS_PER_TURN === 1, '無料質問は 1 回');
  check(
    MAX_QUESTIONS === ATTACK_SIZE_MULTIPLIERS.length - 1 + FREE_QUESTIONS_PER_TURN,
    '質問上限が無料ぶんだけ増えている',
  );
  check(isQuestionFree(0), '1 回目の質問は無料');
  check(!isQuestionFree(1), '2 回目の質問は有料');
  check(penalizedQuestionCount(0) === 0 && penalizedQuestionCount(1) === 0, '1 回目までは無課金');
  check(penalizedQuestionCount(2) === 1, '2 回目から課金が始まる');

  check(attackMultiplierFor(0) === 2.0, '質問 0 回 → 200%');
  check(attackMultiplierFor(1) === 2.0, '質問 1 回でも 200%（無料のため）');
  check(attackMultiplierFor(2) === 1.5, '質問 2 回 → 150%');
  check(attackMultiplierFor(3) === 1.0, '質問 3 回 → 100%');
  check(attackMultiplierFor(4) === 0.75, '質問 4 回 → 75%');
  check(attackMultiplierFor(5) === 0.5, '質問 5 回 → 50%');

  const base = DEFENSE_COVERAGE.target;
  check(Math.abs(maxAttackCoverage(0) - base * 2) < 1e-9, '質問 0 回の攻撃可能面積は基準の 200%');
  check(Math.abs(maxAttackCoverage(1) - base * 2) < 1e-9, '無料質問では攻撃可能面積が減らない');
  check(Math.abs(maxAttackCoverage(2) - base * 1.5) < 1e-9, '2 回目以降で攻撃可能面積が減る');
  for (let i = 1; i < ATTACK_SIZE_MULTIPLIERS.length; i += 1) {
    check(
      ATTACK_SIZE_MULTIPLIERS[i]! < ATTACK_SIZE_MULTIPLIERS[i - 1]!,
      '質問するほど攻撃可能サイズが小さくなる',
    );
  }
}

// --- 6. ラウンド生成と図形候補 ------------------------------------------

section('ラウンド生成と図形候補');
for (const roundCount of [3, 4, 5, 6, 8]) {
  for (let seed = 0; seed < 20; seed += 1) {
    const shares = distributeScoreWeights(roundCount, createRng(seed * 7919 + roundCount));
    const total = shares.reduce((sum, s) => sum + s, 0);
    check(Math.abs(total - 100) < 1e-9, roundCount + ' ラウンドの配点合計が 100%');
    check(shares.every((s) => s > 0), roundCount + ' ラウンドの各配点が正の値');
  }
}
for (const roundCount of [3, 5, 8]) {
  for (let seed = 0; seed < 6; seed += 1) {
    const settings: GameSettings = { ...defaultSettings(), roundCount };
    const rng = createRng(seed * 104729 + roundCount);
    const rounds = generateRounds(settings, rng);
    check(
      Math.abs(rounds.reduce((sum, r) => sum + r.scoreWeight, 0) - 100) < 1e-9,
      '生成ラウンドの配点合計が 100%',
    );

    for (const round of rounds) {
      const label = 'R' + (round.index + 1) + ' ' + round.condition.kind;
      check(round.shapeCandidates.length >= 2, '図形候補が 2 つ以上ある: ' + label);
      check(
        round.shapeCandidates.length <= SHAPE_CANDIDATE_COUNT,
        '図形候補が上限を超えない: ' + label,
      );
      check(
        new Set(round.shapeCandidates).size === round.shapeCandidates.length,
        '図形候補が重複していない: ' + label,
      );

      for (const kind of round.shapeCandidates) {
        const solverRng = createRng(seed * 31 + round.index + kind.length);
        const shape = findValidPlacement(kind, round.condition, solverRng, { attempts: 1200 });
        check(shape !== null, '候補 ' + kind + ' に配置解がある: ' + label);
        if (!shape) continue;
        check(isCoverageInRange(shapeCoverage(shape)), '候補 ' + kind + ' が被覆率条件を満たす');
        check(
          testCondition(round.condition, shapeGeometry(shape)),
          '候補 ' + kind + ' が配置条件を満たす',
        );
      }
    }
  }
}

// --- 7. 守り側情報の非公開 ----------------------------------------------

section('守り側情報の非公開');
{
  const forbiddenKeys = ['defenseShape', 'condition', 'shapeCandidates', 'rounds', 'settings'];

  for (let seed = 0; seed < 8; seed += 1) {
    const rng = createRng(seed * 611 + 3);
    let state: GameState = gameReducer(initialGameState(), {
      type: 'START_GAME',
      settings: { ...defaultSettings(), roundCount: 3 },
      seed: seed * 611 + 3,
    });
    state = gameReducer(state, { type: 'BEGIN_ROUND' });
    state = gameReducer(state, { type: 'HANDOFF_CONTINUE' });

    const round = state.rounds[state.roundIndex]!;
    const kind = round.shapeCandidates[seed % round.shapeCandidates.length]!;
    const defense = findValidPlacement(kind, round.condition, rng, { attempts: 1200 })!;
    state = gameReducer(state, { type: 'CONFIRM_DEFENSE', shape: defense });
    state = gameReducer(state, { type: 'HANDOFF_CONTINUE' });

    const view = attackerView(state)!;
    check(view !== null, '攻め側ビューが取得できる');
    for (const key of forbiddenKeys) {
      check(!(key in view), '攻め側ビューに ' + key + ' が含まれない');
    }
    const leaks = findDefenseLeaks(view, state);
    check(leaks.length === 0, '質問前の攻め側ビューに漏洩がない: ' + leaks.join(' / '));

    // 質問してもなお、聞いていない情報は漏れない
    state = gameReducer(state, { type: 'ASK_QUESTION', questionId: 'center_above_x_axis' });
    state = gameReducer(state, { type: 'ASK_QUESTION', questionId: 'crosses_y_axis' });
    const viewAfter = attackerView(state)!;
    const leaksAfter = findDefenseLeaks(viewAfter, state);
    check(leaksAfter.length === 0, '質問後の攻め側ビューにも漏洩がない: ' + leaksAfter.join(' / '));
    check(viewAfter.askedQuestions.length === 2, '聞いた質問の答えは攻め側ビューに含まれる');

    // 漏洩検出そのものが機能していることの確認（秘密を混ぜたら検出される）
    const tampered = { ...viewAfter, leaked: defense };
    check(
      findDefenseLeaks(tampered, state).length > 0,
      '秘密情報を混ぜた場合は漏洩として検出される',
    );
  }

  // 図形の種類は「動物かどうか」を質問しない限り分からない
  const animalQuestion = QUESTION_DEFS.find((q) => q.id === 'is_animal');
  check(animalQuestion !== undefined, '図形の種類を探る質問が用意されている');
  if (animalQuestion) {
    const catGeometry = shapeGeometry({ kind: 'cat', cx: 0, cy: 0, size: 0.5, rotation: 0 });
    const circleGeometry = shapeGeometry({ kind: 'circle', cx: 0, cy: 0, size: 0.5, rotation: 0 });
    check(animalQuestion.evaluate(catGeometry), '動物図形には「はい」と答える');
    check(!animalQuestion.evaluate(circleGeometry), '幾何図形には「いいえ」と答える');
  }
}

// --- 8. 対戦フルシミュレーション ----------------------------------------

section('対戦フローのシミュレーション');
function simulate(roundCount: number, seed: number, questionPolicy: (turn: number) => number): void {
  const rng = createRng(seed);
  let state: GameState = initialGameState();
  const apply = (action: GameAction) => {
    state = gameReducer(state, action);
  };

  apply({ type: 'START_GAME', settings: { ...defaultSettings(), roundCount }, seed });
  check(state.phase === 'roundIntro', 'START_GAME でラウンド開始画面へ');
  check(state.rounds.length === roundCount, 'ラウンド数が設定どおり');

  let turnCounter = 0;
  for (let r = 0; r < roundCount; r += 1) {
    const roundAttackers: number[] = [];
    check(state.phase === 'roundIntro', 'ラウンド ' + (r + 1) + ' 開始フェーズ');
    apply({ type: 'BEGIN_ROUND' });

    for (let t = 0; t < 2; t += 1) {
      check(state.phase === 'handoff', '守り側への受け渡し画面');
      check(state.handoff?.nextPhase === 'defense', '受け渡し後は守り側の配置');
      check(
        state.handoff?.toPlayer === otherPlayer(state.attacker),
        '端末は守り側プレイヤーに渡される',
      );
      apply({ type: 'HANDOFF_CONTINUE' });
      check(state.phase === 'defense', '守り側の配置フェーズ');

      const round = state.rounds[state.roundIndex]!;
      const kind: ShapeKind = round.shapeCandidates[turnCounter % round.shapeCandidates.length]!;
      const defense = findValidPlacement(kind, round.condition, rng, { attempts: 1200 });
      check(defense !== null, '守り側の配置解が存在する');
      if (!defense) return;
      check(isCoverageInRange(shapeCoverage(defense)), '守り側の被覆率が規定範囲内');
      apply({ type: 'CONFIRM_DEFENSE', shape: defense });

      check(state.phase === 'handoff', '攻め側への受け渡し画面');
      check(state.handoff?.toPlayer === state.attacker, '端末は攻め側プレイヤーに渡される');
      apply({ type: 'HANDOFF_CONTINUE' });
      check(state.phase === 'question', '質問フェーズ');

      const questionTarget = questionPolicy(turnCounter);
      for (let q = 0; q < questionTarget; q += 1) {
        apply({ type: 'ASK_QUESTION', questionId: QUESTION_DEFS[q % QUESTION_DEFS.length]!.id });
      }
      if (questionTarget >= 1) {
        check(state.askedQuestions[0]!.penalized === false, '1 回目の質問は無料と記録される');
      }
      if (questionTarget >= 2) {
        check(state.askedQuestions[1]!.penalized === true, '2 回目の質問は有料と記録される');
      }

      const before = state.askedQuestions.length;
      for (const definition of QUESTION_DEFS) {
        apply({ type: 'ASK_QUESTION', questionId: definition.id });
      }
      check(state.askedQuestions.length <= MAX_QUESTIONS, '質問回数の上限を超えない');
      check(state.askedQuestions.length >= before, '質問結果が失われない');

      apply({ type: 'END_QUESTIONS' });
      check(state.phase === 'attack', '攻撃配置フェーズ');

      const view = attackerView(state)!;
      const attackBase: Shape = {
        kind: 'circle',
        cx: rng.range(-0.2, 0.2),
        cy: rng.range(-0.2, 0.2),
        size: 0.4,
        rotation: rng.range(0, Math.PI * 2),
      };
      const attack: Shape = {
        ...attackBase,
        size: sizeForCoverage(attackBase, view.maxAttackCoverage * 0.9),
      };
      const attacker = state.attacker;
      roundAttackers.push(attacker);
      const scoreBefore = state.scores[attacker];
      apply({ type: 'CONFIRM_ATTACK', shape: attack });

      check(state.phase === 'turnResult', 'ターン結果フェーズ');
      const record = state.lastTurn!;
      check(record.hitRate >= 0 && record.hitRate <= 100, '的中率が 0〜100% に収まる');
      check(
        Math.abs(record.carved - (record.scoreWeight * record.hitRate) / 100) < 1e-9,
        '削った割合 = 配点 × 的中率',
      );
      check(
        Math.abs(state.scores[attacker] - (scoreBefore + record.carved)) < 1e-9,
        '累計スコアに削った割合が加算される',
      );
      check(
        record.attackCoverage <= record.maxAttackCoverage + 1e-6,
        '攻撃の被覆率が上限以内',
      );
      check(record.shapeKind === kind, '守り側が選んだ図形が結果に記録される');

      apply({ type: 'NEXT_AFTER_TURN' });
      turnCounter += 1;
    }

    check(roundAttackers[0] !== roundAttackers[1], '1ラウンドで攻め側が入れ替わる');
    check(state.phase === 'roundResult', 'ラウンド結果フェーズ');
    apply({ type: 'NEXT_AFTER_ROUND' });
  }

  check(state.phase === 'final', '全ラウンド終了で最終結果へ');
  check(state.history.length === roundCount * 2, 'ターン記録数 = ラウンド数 × 2');
  check(state.scores[0] >= 0 && state.scores[0] <= 100.000001, 'Player1 の累計が 0〜100%');
  check(state.scores[1] >= 0 && state.scores[1] <= 100.000001, 'Player2 の累計が 0〜100%');

  apply({ type: 'PLAY_AGAIN' });
  check(state.phase === 'home', 'もう一度遊ぶでホームへ戻る');
  check(state.scores[0] === 0 && state.scores[1] === 0, 'スコアがリセットされる');
}

simulate(3, 12345, () => 0);
simulate(5, 777, (turn) => turn % (MAX_QUESTIONS + 1));
simulate(4, 98765, (turn) => (turn % 2 === 0 ? 2 : 5));

// --- 9. 満点シナリオ ----------------------------------------------------

section('理論上の満点シナリオ');
{
  const rng = createRng(2024);
  let state: GameState = initialGameState();
  const apply = (action: GameAction) => {
    state = gameReducer(state, action);
  };
  apply({ type: 'START_GAME', settings: { ...defaultSettings(), roundCount: 5 }, seed: 2024 });

  for (let r = 0; r < 5; r += 1) {
    apply({ type: 'BEGIN_ROUND' });
    for (let t = 0; t < 2; t += 1) {
      apply({ type: 'HANDOFF_CONTINUE' });
      const round = state.rounds[state.roundIndex]!;
      const kind = round.shapeCandidates[0]!;
      const defense = findValidPlacement(kind, round.condition, rng, { attempts: 1200 })!;
      apply({ type: 'CONFIRM_DEFENSE', shape: defense });
      apply({ type: 'HANDOFF_CONTINUE' });
      apply({ type: 'END_QUESTIONS' });
      // 守り側とまったく同じ図形を置けば的中率 100%
      apply({ type: 'CONFIRM_ATTACK', shape: defense });
      check(Math.abs(state.lastTurn!.hitRate - 100) < 0.01, '完全一致で的中率 100%');
      apply({ type: 'NEXT_AFTER_TURN' });
    }
    apply({ type: 'NEXT_AFTER_ROUND' });
  }
  check(
    Math.abs(state.scores[0] - 100) < 0.01 && Math.abs(state.scores[1] - 100) < 0.01,
    '全ターン的中で累計 100%: ' + state.scores[0].toFixed(4) + ' / ' + state.scores[1].toFixed(4),
  );
}

console.log('\n--------------------------------------');
if (failures === 0) {
  console.log('すべて成功: ' + checks + ' 件のチェックをパスしました。');
} else {
  console.log(failures + ' 件失敗 / 全 ' + checks + ' 件');
  process.exitCode = 1;
}
