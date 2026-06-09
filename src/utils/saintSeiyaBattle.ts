import {
  SAINT_SEIYA_CLOTH_BY_ID,
  SAINT_SEIYA_CLOTHS,
  SAINT_SEIYA_GOLD_CLOTHS,
  type SaintCloth,
  type SaintClothRank,
  type SaintMove,
  clothRankSortValue,
} from '../data/saintSeiyaCloths';

export interface SaintCombatStats {
  level: number;
  hp: number;
  mp: number;
  atk: number;
  def: number;
  spd: number;
  cosmoRegen: number;
}

export interface SaintEnemy {
  id: string;
  clothId: string;
  rank: SaintClothRank;
  name: string;
  constellation: string;
  level: number;
  stats: SaintCombatStats;
  moves: SaintMove[];
}

export interface SaintBattleReport {
  victory: boolean;
  turns: number;
  expGain: number;
  playerHp: number;
  enemyHp: number;
  usedCosmoBurst: boolean;
  log: string[];
}

export type BattleStrategy = 'attack' | 'skill' | 'guard' | 'cosmo' | 'auto';

const BASIC_ATTACK: SaintMove = {
  id: 'basic-attack',
  name: '音速拳',
  power: 1,
  mpCost: 0,
  kind: 'strike',
};

const AWAKENING_MOVE: SaintMove = {
  id: 'cosmo-awakening',
  name: '燃烧吧小宇宙',
  power: 1.72,
  mpCost: 18,
  kind: 'ultimate',
};

export function saintLevelFromExp(totalExp: number) {
  return Math.max(1, Math.min(99, 1 + Math.floor(Math.max(0, Math.floor(totalExp || 0)) / 10)));
}

export function rankExpValue(rank: SaintClothRank, victory: boolean) {
  if (victory) {
    if (rank === 'gold') return 9;
    if (rank === 'silver') return 6;
    return 3;
  }
  if (rank === 'gold') return 6;
  if (rank === 'silver') return 4;
  return 2;
}

export function rewardExpForRank(rank: SaintClothRank, victory: boolean) {
  return (victory ? 6 : 3) + rankExpValue(rank, victory);
}

export function enemyLevelRange(rank: SaintClothRank): [number, number] {
  if (rank === 'gold') return [67, 99];
  if (rank === 'silver') return [34, 66];
  return [1, 33];
}

export function clampEnemyLevel(rank: SaintClothRank, playerLevel: number, rng: () => number = Math.random) {
  const [min, max] = enemyLevelRange(rank);
  const drift = Math.floor((rng() - 0.35) * 10);
  const suggested = playerLevel + drift;
  return Math.max(min, Math.min(max, suggested));
}

export function bestCollectedCloth(collected: Record<string, unknown> | Partial<Record<string, unknown>>) {
  let best: SaintCloth | null = null;
  for (const cloth of SAINT_SEIYA_CLOTHS) {
    if (!collected[cloth.id]) continue;
    if (!best || clothRankSortValue(cloth.rank) > clothRankSortValue(best.rank)) best = cloth;
  }
  return best;
}

export function buildPlayerStats(level: number, equippedRank?: SaintClothRank | null): SaintCombatStats {
  const base = {
    level,
    hp: 80 + level * 12,
    mp: 28 + level * 4,
    atk: 12 + level * 2.4,
    def: 6 + level * 1.15,
    spd: 8 + level * 0.45,
    cosmoRegen: 0,
  };
  const bonus = equippedRank === 'gold'
    ? { hp: 1.28, mp: 1.22, atk: 1.26, def: 1.24, cosmoRegen: 5 }
    : equippedRank === 'silver'
      ? { hp: 1.16, mp: 1.12, atk: 1.15, def: 1.14, cosmoRegen: 2 }
      : equippedRank === 'bronze'
        ? { hp: 1.08, mp: 1.06, atk: 1.08, def: 1.06, cosmoRegen: 1 }
        : { hp: 1, mp: 1, atk: 1, def: 1, cosmoRegen: 0 };
  return {
    level,
    hp: Math.round(base.hp * bonus.hp),
    mp: Math.round(base.mp * bonus.mp),
    atk: Math.round(base.atk * bonus.atk),
    def: Math.round(base.def * bonus.def),
    spd: Math.round(base.spd),
    cosmoRegen: bonus.cosmoRegen,
  };
}

export function buildEnemyStats(rank: SaintClothRank, level: number): SaintCombatStats {
  if (rank === 'gold') {
    return {
      level,
      hp: Math.round(240 + level * 13),
      mp: Math.round(85 + level * 3.2),
      atk: Math.round(28 + level * 2.8),
      def: Math.round(20 + level * 1.45),
      spd: Math.round(11 + level * 0.5),
      cosmoRegen: 4,
    };
  }
  if (rank === 'silver') {
    return {
      level,
      hp: Math.round(130 + level * 11),
      mp: Math.round(45 + level * 2.6),
      atk: Math.round(18 + level * 2.35),
      def: Math.round(12 + level * 1.25),
      spd: Math.round(9 + level * 0.48),
      cosmoRegen: 2,
    };
  }
  return {
    level,
    hp: Math.round(70 + level * 10),
    mp: Math.round(20 + level * 2),
    atk: Math.round(10 + level * 2.2),
    def: Math.round(5 + level * 1.1),
    spd: Math.round(8 + level * 0.42),
    cosmoRegen: 1,
  };
}

export function buildSaintEnemy(clothId: string, playerLevel: number, rng: () => number = Math.random): SaintEnemy {
  const cloth = SAINT_SEIYA_CLOTH_BY_ID[clothId] || SAINT_SEIYA_CLOTHS[0];
  const level = clampEnemyLevel(cloth.rank, playerLevel, rng);
  return {
    id: `enemy-${cloth.id}-${level}`,
    clothId: cloth.id,
    rank: cloth.rank,
    name: `${cloth.constellation}${cloth.owner}`,
    constellation: cloth.constellation,
    level,
    stats: buildEnemyStats(cloth.rank, level),
    moves: cloth.moves,
  };
}

export function unlockedSaintMoves(collected: Record<string, unknown> | Partial<Record<string, unknown>>) {
  const moves: SaintMove[] = [BASIC_ATTACK, AWAKENING_MOVE];
  const collectedCloths = SAINT_SEIYA_CLOTHS
    .filter((cloth) => Boolean(collected[cloth.id]))
    .sort((a, b) => clothRankSortValue(a.rank) - clothRankSortValue(b.rank));
  for (const cloth of collectedCloths) {
    moves.push(...cloth.moves);
  }
  return moves;
}

function chooseMove(moves: SaintMove[], mp: number, strategy: BattleStrategy, rng: () => number) {
  const affordable = moves.filter((move) => move.mpCost <= mp);
  if (strategy === 'attack' || affordable.length === 0) return BASIC_ATTACK;
  if (strategy === 'guard') return affordable.find((move) => move.kind === 'guard') || BASIC_ATTACK;
  if (strategy === 'cosmo') return affordable.find((move) => move.kind === 'ultimate') || AWAKENING_MOVE;
  if (strategy === 'skill') {
    return affordable
      .filter((move) => move.kind !== 'guard')
      .sort((a, b) => b.power - a.power)[0] || BASIC_ATTACK;
  }
  const usable = affordable.filter((move) => move.kind !== 'guard');
  return usable[Math.floor(rng() * usable.length)] || BASIC_ATTACK;
}

export function saintDamage(atk: number, def: number, power = 1, rng: () => number = Math.random) {
  const variance = 0.9 + rng() * 0.2;
  return Math.max(4, Math.round((atk * power - def * 0.55) * variance));
}

export function simulateSaintBattle(args: {
  totalExp: number;
  collected: Record<string, unknown> | Partial<Record<string, unknown>>;
  enemy: SaintEnemy;
  strategy?: BattleStrategy;
  rng?: () => number;
}): SaintBattleReport {
  const rng = args.rng || Math.random;
  const level = saintLevelFromExp(args.totalExp);
  const equipped = bestCollectedCloth(args.collected);
  const playerStats = buildPlayerStats(level, equipped?.rank);
  const enemyStats = { ...args.enemy.stats };
  let playerHp = playerStats.hp;
  let playerMp = playerStats.mp;
  let enemyHp = enemyStats.hp;
  let enemyMp = enemyStats.mp;
  let guardNext = false;
  let usedCosmoBurst = false;
  const strategy = args.strategy || 'auto';
  const playerMoves = unlockedSaintMoves(args.collected);
  const log = [
    `Lv${level} 对阵 Lv${args.enemy.level} ${args.enemy.name}`,
    equipped ? `装备 ${equipped.label}` : '未装备圣衣，以小宇宙迎战',
  ];

  const maxTurns = 12;
  for (let turn = 1; turn <= maxTurns && playerHp > 0 && enemyHp > 0; turn += 1) {
    const playerFirst = playerStats.spd >= enemyStats.spd || rng() > 0.55;
    const playerMove = chooseMove(playerMoves, playerMp, strategy, rng);
    const enemyMove = chooseMove(args.enemy.moves, enemyMp, 'auto', rng);

    const playerAction = () => {
      if (playerMove.kind === 'guard') {
        guardNext = true;
        playerMp = Math.max(0, playerMp - playerMove.mpCost) + playerStats.cosmoRegen;
        log.push(`T${turn}：使用 ${playerMove.name}，防御姿态展开`);
        return;
      }
      playerMp = Math.max(0, playerMp - playerMove.mpCost) + playerStats.cosmoRegen;
      const boost = strategy === 'cosmo' && !usedCosmoBurst ? 1.22 : 1;
      if (strategy === 'cosmo') usedCosmoBurst = true;
      const damage = saintDamage(playerStats.atk, enemyStats.def, playerMove.power * boost, rng);
      enemyHp = Math.max(0, enemyHp - damage);
      log.push(`T${turn}：${playerMove.name} 命中，造成 ${damage}`);
    };

    const enemyAction = () => {
      if (enemyHp <= 0) return;
      enemyMp = Math.max(0, enemyMp - enemyMove.mpCost) + enemyStats.cosmoRegen;
      const rawDamage = saintDamage(enemyStats.atk, playerStats.def, enemyMove.power, rng);
      const damage = guardNext ? Math.max(2, Math.round(rawDamage * 0.45)) : rawDamage;
      guardNext = false;
      playerHp = Math.max(0, playerHp - damage);
      log.push(`T${turn}：${args.enemy.constellation} ${enemyMove.name} 反击，受到 ${damage}`);
    };

    if (playerFirst) {
      playerAction();
      enemyAction();
    } else {
      enemyAction();
      playerAction();
    }
  }

  const victory = enemyHp <= 0 || (playerHp > 0 && playerHp >= enemyHp);
  const expGain = rewardExpForRank(args.enemy.rank, victory);
  log.push(victory ? `战斗胜利，获得 ${expGain} 经验` : `战斗失败，仍获得 ${expGain} 经验`);
  return {
    victory,
    turns: Math.min(maxTurns, log.length),
    expGain,
    playerHp,
    enemyHp,
    usedCosmoBurst,
    log,
  };
}

export function hasAllGoldCloths(collected: Record<string, unknown> | Partial<Record<string, unknown>>) {
  return SAINT_SEIYA_GOLD_CLOTHS.every((cloth) => Boolean(collected[cloth.id]));
}

export function availableClothsByRank(
  rank: SaintClothRank,
  collected: Record<string, unknown> | Partial<Record<string, unknown>>,
) {
  return SAINT_SEIYA_CLOTHS.filter((cloth) => cloth.rank === rank && !collected[cloth.id]);
}

export function rankWeightsForLevel(level: number): Array<{ rank: SaintClothRank; weight: number }> {
  if (level >= 67) {
    return [
      { rank: 'bronze', weight: 10 },
      { rank: 'silver', weight: 30 },
      { rank: 'gold', weight: 60 },
    ];
  }
  if (level >= 41) {
    return [
      { rank: 'bronze', weight: 30 },
      { rank: 'silver', weight: 50 },
      { rank: 'gold', weight: 20 },
    ];
  }
  if (level >= 21) {
    return [
      { rank: 'bronze', weight: 55 },
      { rank: 'silver', weight: 35 },
      { rank: 'gold', weight: 10 },
    ];
  }
  return [
    { rank: 'bronze', weight: 75 },
    { rank: 'silver', weight: 22 },
    { rank: 'gold', weight: 3 },
  ];
}

export function chooseChestCloth(
  totalExp: number,
  collected: Record<string, unknown> | Partial<Record<string, unknown>>,
  rng: () => number = Math.random,
): SaintCloth | null {
  const level = saintLevelFromExp(totalExp);
  const weighted = rankWeightsForLevel(level)
    .map((item) => ({
      ...item,
      pool: availableClothsByRank(item.rank, collected),
    }))
    .filter((item) => item.pool.length > 0);
  if (weighted.length === 0) return null;
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = rng() * total;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) return item.pool[Math.floor(rng() * item.pool.length)] || item.pool[0];
  }
  const last = weighted[weighted.length - 1];
  return last.pool[Math.floor(rng() * last.pool.length)] || last.pool[0];
}
