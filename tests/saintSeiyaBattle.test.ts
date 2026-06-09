import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const compiledRoot = join(tmpdir(), `t8-saint-seiya-test-${Date.now()}-${Math.random().toString(16).slice(2)}`);

function compileSource(sourceRel: string, outputRel: string, rewrite?: (source: string) => string) {
  const sourcePath = resolve(repoRoot, sourceRel);
  const outputPath = join(compiledRoot, outputRel);
  mkdirSync(dirname(outputPath), { recursive: true });
  const source = rewrite ? rewrite(readFileSync(sourcePath, 'utf8')) : readFileSync(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: sourcePath,
  }).outputText;
  writeFileSync(outputPath, compiled);
}

compileSource('src/data/saintSeiyaCloths.ts', 'src/data/saintSeiyaCloths.js');
compileSource('src/utils/saintSeiyaBattle.ts', 'src/utils/saintSeiyaBattle.js', (source) =>
  source.replace("from '../data/saintSeiyaCloths';", "from '../data/saintSeiyaCloths.js';"),
);

const cloths = await import(pathToFileURL(join(compiledRoot, 'src/data/saintSeiyaCloths.js')).href);
const battle = await import(pathToFileURL(join(compiledRoot, 'src/utils/saintSeiyaBattle.js')).href);

const { SAINT_SEIYA_GOLD_CLOTHS, SAINT_SEIYA_CLOTH_BY_ID } = cloths;
const {
  buildEnemyStats,
  buildPlayerStats,
  chooseChestCloth,
  enemyLevelRange,
  hasAllGoldCloths,
  rankWeightsForLevel,
  rewardExpForRank,
  saintLevelFromExp,
  simulateSaintBattle,
  buildSaintEnemy,
} = battle;

test('Saint Seiya battle math follows roadmap level and reward rules', () => {
  assert.equal(saintLevelFromExp(0), 1);
  assert.equal(saintLevelFromExp(9), 1);
  assert.equal(saintLevelFromExp(10), 2);
  assert.equal(saintLevelFromExp(980), 99);
  assert.equal(saintLevelFromExp(9999), 99);

  assert.equal(rewardExpForRank('bronze', true), 9);
  assert.equal(rewardExpForRank('silver', true), 12);
  assert.equal(rewardExpForRank('gold', true), 15);
  assert.equal(rewardExpForRank('bronze', false), 5);
  assert.equal(rewardExpForRank('silver', false), 7);
  assert.equal(rewardExpForRank('gold', false), 9);

  assert.deepEqual(enemyLevelRange('bronze'), [1, 33]);
  assert.deepEqual(enemyLevelRange('silver'), [34, 66]);
  assert.deepEqual(enemyLevelRange('gold'), [67, 99]);
});

test('Saint Seiya stats scale by cloth rank and enemy tier', () => {
  const bare = buildPlayerStats(10, null);
  const bronze = buildPlayerStats(10, 'bronze');
  const silver = buildPlayerStats(10, 'silver');
  const gold = buildPlayerStats(10, 'gold');

  assert.ok(bronze.hp > bare.hp);
  assert.ok(silver.atk > bronze.atk);
  assert.ok(gold.def > silver.def);
  assert.equal(gold.cosmoRegen, 5);

  const bronzeEnemy = buildEnemyStats('bronze', 20);
  const goldEnemy = buildEnemyStats('gold', 80);
  assert.ok(goldEnemy.hp > bronzeEnemy.hp);
  assert.ok(goldEnemy.atk > bronzeEnemy.atk);
});

test('Saint Seiya chest selection excludes collected cloths and unlocks Hades after twelve gold cloths', () => {
  const collected: Record<string, unknown> = {};
  for (const cloth of SAINT_SEIYA_GOLD_CLOTHS.slice(0, 11)) {
    collected[cloth.id] = { clothId: cloth.id };
  }
  assert.equal(hasAllGoldCloths(collected), false);
  collected[SAINT_SEIYA_GOLD_CLOTHS[11].id] = { clothId: SAINT_SEIYA_GOLD_CLOTHS[11].id };
  assert.equal(hasAllGoldCloths(collected), true);

  const allGoldCollected = { ...collected };
  const chosen = chooseChestCloth(990, allGoldCollected, () => 0.99);
  assert.notEqual(chosen?.rank, 'gold');

  const highLevelWeights = rankWeightsForLevel(80);
  assert.equal(highLevelWeights.find((item) => item.rank === 'gold')?.weight, 60);
});

test('Saint Seiya battle simulation can resolve a collected gold user against a gold saint', () => {
  const collected = {
    aries: { clothId: 'aries' },
    leo: { clothId: 'leo' },
  };
  const enemy = buildSaintEnemy('taurus', 99, () => 0.4);
  const report = simulateSaintBattle({
    totalExp: 980,
    collected,
    enemy,
    strategy: 'cosmo',
    rng: () => 0.8,
  });

  assert.equal(enemy.rank, 'gold');
  assert.equal(SAINT_SEIYA_CLOTH_BY_ID[enemy.clothId].constellation, '金牛座');
  assert.equal(typeof report.victory, 'boolean');
  assert.ok(report.expGain === 15 || report.expGain === 9);
  assert.equal(report.usedCosmoBurst, true);
  assert.ok(report.log.some((line) => line.includes('小宇宙') || line.includes('星光灭绝') || line.includes('星屑旋转功')));
});
