import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ViewportPortal, useReactFlow } from '@xyflow/react';
import { Crown, Gem, MapPin, Power, RotateCcw, Shield, Sparkles, Swords } from 'lucide-react';
import {
  SAINT_CLOTH_RANK_ACCENT,
  SAINT_SEIYA_CLOTH_BY_ID,
  SAINT_SEIYA_GOLD_CLOTHS,
  SAINT_SEIYA_CLOTHS,
  clothRankLabel,
  type SaintClothRank,
} from '../data/saintSeiyaCloths';
import { trackAchievementEvent } from '../stores/achievements';
import {
  SAINT_SEIYA_OPEN_MS,
  SAINT_SEIYA_SPAWN_INTERVAL_MS,
  buildSaintSeiyaChest,
  useSaintSeiyaSanctuaryStore,
} from '../stores/saintSeiyaSanctuary';
import {
  type BattleStrategy,
  saintLevelFromExp,
  unlockedSaintMoves,
} from '../utils/saintSeiyaBattle';

interface SaintSeiyaSanctuaryProps {
  visualStyle: string;
  viewportMoving: boolean;
  nodeDragging: boolean;
}

interface SanctuaryRuntimeSnapshot {
  collected: ReturnType<typeof useSaintSeiyaSanctuaryStore.getState>['collected'];
  activeChest: ReturnType<typeof useSaintSeiyaSanctuaryStore.getState>['activeChest'];
  openingTarget: ReturnType<typeof useSaintSeiyaSanctuaryStore.getState>['openingTarget'];
  battle: ReturnType<typeof useSaintSeiyaSanctuaryStore.getState>['battle'];
  nextSpawnAt: number;
  totalExp: number;
  hadesModeActive: boolean;
  viewportMoving: boolean;
  nodeDragging: boolean;
}

const SANCTUARY_COLLAPSED_STORAGE_KEY = 't8.saintSeiyaSanctuary.collapsed.v1';

function formatMs(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function countByRank(
  collected: ReturnType<typeof useSaintSeiyaSanctuaryStore.getState>['collected'],
  rank: SaintClothRank,
) {
  return Object.values(collected).filter((item) => item?.rank === rank).length;
}

function rankTotal(rank: SaintClothRank) {
  return SAINT_SEIYA_CLOTHS.filter((cloth) => cloth.rank === rank).length;
}

function playSaintChestSound(rank: SaintClothRank) {
  try {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor() as AudioContext;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(rank === 'gold' ? 0.14 : 0.1, ctx.currentTime + 0.018);
    master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.72);
    master.connect(ctx.destination);
    const base = rank === 'gold' ? 440 : rank === 'silver' ? 392 : 330;
    [0, 0.12, 0.24, 0.42].forEach((at, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + at;
      osc.type = index % 2 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(base * (1 + index * 0.25), start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + 0.28);
    });
    window.setTimeout(() => void ctx.close(), 900);
  } catch {
    /* best-effort feedback */
  }
}

function chestBounds(
  getNodes: ReturnType<typeof useReactFlow>['getNodes'],
  screenToFlowPosition: ReturnType<typeof useReactFlow>['screenToFlowPosition'],
) {
  const nodes = getNodes();
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    const w = (node as any).measured?.width || (node as any).width || 360;
    const h = (node as any).measured?.height || (node as any).height || 260;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + w);
    maxY = Math.max(maxY, node.position.y + h);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    const shell = document.querySelector<HTMLElement>('.t8-canvas-shell');
    const rect = shell?.getBoundingClientRect();
    const center = screenToFlowPosition({
      x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
    });
    return {
      minX: center.x - 1200,
      maxX: center.x + 1200,
      minY: center.y - 900,
      maxY: center.y + 900,
    };
  }

  const padX = Math.max(900, (maxX - minX) * 0.34);
  const padY = Math.max(680, (maxY - minY) * 0.34);
  return {
    minX: minX - padX,
    maxX: maxX + padX,
    minY: minY - padY,
    maxY: maxY + padY,
  };
}

export default function SaintSeiyaSanctuary({ visualStyle, viewportMoving, nodeDragging }: SaintSeiyaSanctuaryProps) {
  const { getNodes, getViewport, screenToFlowPosition, setCenter } = useReactFlow();
  const [now, setNow] = useState(Date.now());
  const [collapsed, setCollapsed] = useState(false);
  const [feedback, setFeedback] = useState('');
  const holdStartedRef = useRef<number | null>(null);
  const isSaintSeiyaTheme = visualStyle === 'saint-seiya';

  const collected = useSaintSeiyaSanctuaryStore((state) => state.collected);
  const activeChest = useSaintSeiyaSanctuaryStore((state) => state.activeChest);
  const openingTarget = useSaintSeiyaSanctuaryStore((state) => state.openingTarget);
  const nextSpawnAt = useSaintSeiyaSanctuaryStore((state) => state.nextSpawnAt);
  const battle = useSaintSeiyaSanctuaryStore((state) => state.battle);
  const totalExp = useSaintSeiyaSanctuaryStore((state) => state.totalExp);
  const winCount = useSaintSeiyaSanctuaryStore((state) => state.winCount);
  const hadesUnlockedAt = useSaintSeiyaSanctuaryStore((state) => state.hadesUnlockedAt);
  const hadesModeActive = useSaintSeiyaSanctuaryStore((state) => state.hadesModeActive);
  const hadesAnimationUntil = useSaintSeiyaSanctuaryStore((state) => state.hadesAnimationUntil);
  const cleanupExpired = useSaintSeiyaSanctuaryStore((state) => state.cleanupExpired);
  const setNextSpawnAt = useSaintSeiyaSanctuaryStore((state) => state.setNextSpawnAt);
  const spawnChest = useSaintSeiyaSanctuaryStore((state) => state.spawnChest);
  const expireActiveChest = useSaintSeiyaSanctuaryStore((state) => state.expireActiveChest);
  const beginOpening = useSaintSeiyaSanctuaryStore((state) => state.beginOpening);
  const setOpeningProgress = useSaintSeiyaSanctuaryStore((state) => state.setOpeningProgress);
  const openTrackedChest = useSaintSeiyaSanctuaryStore((state) => state.openTrackedChest);
  const resolveBattle = useSaintSeiyaSanctuaryStore((state) => state.resolveBattle);
  const clearBattle = useSaintSeiyaSanctuaryStore((state) => state.clearBattle);
  const setHadesModeActive = useSaintSeiyaSanctuaryStore((state) => state.setHadesModeActive);
  const resetSanctuary = useSaintSeiyaSanctuaryStore((state) => state.resetSanctuary);
  const runtimeRef = useRef<SanctuaryRuntimeSnapshot>({
    collected,
    activeChest,
    openingTarget,
    battle,
    nextSpawnAt,
    totalExp,
    hadesModeActive,
    viewportMoving,
    nodeDragging,
  });
  runtimeRef.current = {
    collected,
    activeChest,
    openingTarget,
    battle,
    nextSpawnAt,
    totalExp,
    hadesModeActive,
    viewportMoving,
    nodeDragging,
  };

  const level = saintLevelFromExp(totalExp);
  const expInLevel = Math.max(0, totalExp % 10);
  const bronzeCount = useMemo(() => countByRank(collected, 'bronze'), [collected]);
  const silverCount = useMemo(() => countByRank(collected, 'silver'), [collected]);
  const goldCount = useMemo(() => countByRank(collected, 'gold'), [collected]);
  const availableMoves = useMemo(() => unlockedSaintMoves(collected).slice(-5), [collected]);
  const openingRatio = openingTarget ? Math.max(0, Math.min(1, openingTarget.progressMs / SAINT_SEIYA_OPEN_MS)) : 0;
  const nextSpawnRemainingMs = Math.max(0, nextSpawnAt - now);
  const showHadesAnimation = isSaintSeiyaTheme && hadesAnimationUntil > now;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isSaintSeiyaTheme && hadesModeActive) {
      root.setAttribute('data-saint-mode', 'hades');
    } else {
      root.removeAttribute('data-saint-mode');
    }
    return () => root.removeAttribute('data-saint-mode');
  }, [hadesModeActive, isSaintSeiyaTheme]);

  useEffect(() => {
    if (!isSaintSeiyaTheme || typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(SANCTUARY_COLLAPSED_STORAGE_KEY);
    setCollapsed(saved === '1');
  }, [isSaintSeiyaTheme]);

  useEffect(() => {
    if (!isSaintSeiyaTheme) return;
    cleanupExpired(Date.now());
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      cleanupExpired(current);
      const snapshot = runtimeRef.current;
      if (snapshot.activeChest && snapshot.activeChest.expiresAt <= current) {
        expireActiveChest();
        return;
      }
      if (
        snapshot.activeChest
        || snapshot.openingTarget
        || snapshot.battle
        || snapshot.viewportMoving
        || snapshot.nodeDragging
      ) return;
      if (typeof document !== 'undefined' && (document.visibilityState !== 'visible' || !document.hasFocus())) return;
      if (current < snapshot.nextSpawnAt) return;
      const chest = buildSaintSeiyaChest({
        now: current,
        totalExp: snapshot.totalExp,
        collected: snapshot.collected,
        bounds: chestBounds(getNodes, screenToFlowPosition),
      });
      if (!chest) {
        setNextSpawnAt(current + SAINT_SEIYA_SPAWN_INTERVAL_MS);
        return;
      }
      spawnChest(chest);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [
    cleanupExpired,
    expireActiveChest,
    getNodes,
    isSaintSeiyaTheme,
    screenToFlowPosition,
    setNextSpawnAt,
    spawnChest,
  ]);

  useEffect(() => {
    if (!isSaintSeiyaTheme || !openingTarget) {
      holdStartedRef.current = null;
      return;
    }
    const timer = window.setInterval(() => {
      const current = Date.now();
      const shell = document.querySelector<HTMLElement>('.t8-canvas-shell');
      const rect = shell?.getBoundingClientRect();
      const center = screenToFlowPosition({
        x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
        y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
      });
      const zoom = Math.max(0.12, getViewport().zoom || 1);
      const threshold = Math.max(150, 170 / zoom);
      const distance = Math.hypot(center.x - openingTarget.x, center.y - openingTarget.y);
      if (distance <= threshold) {
        if (!holdStartedRef.current) holdStartedRef.current = current;
        const progressMs = current - holdStartedRef.current;
        setOpeningProgress(progressMs, holdStartedRef.current);
        if (progressMs >= SAINT_SEIYA_OPEN_MS) {
          const nextBattle = openTrackedChest(current);
          if (nextBattle) {
            playSaintChestSound(nextBattle.chest.rank);
            const cloth = SAINT_SEIYA_CLOTH_BY_ID[nextBattle.chest.clothId];
            setFeedback(`${cloth?.label || '圣衣'} 已开启试炼`);
          }
        }
      } else {
        holdStartedRef.current = null;
        setOpeningProgress(0, null);
      }
    }, 180);
    return () => window.clearInterval(timer);
  }, [
    getViewport,
    isSaintSeiyaTheme,
    openTrackedChest,
    openingTarget?.chestId,
    openingTarget?.x,
    openingTarget?.y,
    screenToFlowPosition,
    setOpeningProgress,
  ]);

  if (!isSaintSeiyaTheme) return null;

  const handleChestClick = () => {
    if (!activeChest) return;
    beginOpening(activeChest);
    const { zoom } = getViewport();
    setCenter(activeChest.x, activeChest.y, {
      zoom: Math.max(0.48, Math.min(1.15, zoom || 0.8)),
      duration: 620,
    });
  };

  const handleToggleCollapsed = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SANCTUARY_COLLAPSED_STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* local preference is best-effort */
      }
      return next;
    });
  };

  const handleHadesModeSwitch = () => {
    const next = !hadesModeActive;
    setHadesModeActive(next);
    if (next) {
      trackAchievementEvent({
        type: 'hidden_mode.enabled',
        theme: 'saint-seiya',
        kind: 'saint-seiya-hades',
        mode: 'enabled',
      });
    }
  };

  const handleResolveBattle = (strategy: BattleStrategy) => {
    const result = resolveBattle(strategy);
    if (!result.battle) return;
    const cloth = result.clothId ? SAINT_SEIYA_CLOTH_BY_ID[result.clothId] : null;
    if (result.victory && cloth) {
      trackAchievementEvent({
        type: 'saint_seiya.cloth_collected',
        theme: 'saint-seiya',
        kind: cloth.rank,
      });
    }
    if (result.victory) {
      trackAchievementEvent({
        type: 'saint_seiya.battle_won',
        theme: 'saint-seiya',
        kind: result.rank || 'unknown',
      });
      if (hadesModeActive) {
        trackAchievementEvent({
          type: 'hidden_mode.used',
          theme: 'saint-seiya',
          kind: 'saint-seiya-hades',
          mode: 'used',
        });
      }
    }
    if (result.usedCosmoBurst) {
      trackAchievementEvent({
        type: 'saint_seiya.cosmo_burst',
        theme: 'saint-seiya',
        kind: 'cosmo',
      });
    }
    if (result.firstHadesUnlock) {
      trackAchievementEvent({
        type: 'saint_seiya.gold_completed',
        theme: 'saint-seiya',
        kind: 'twelve-gold',
      });
      trackAchievementEvent({
        type: 'hidden_mode.enabled',
        theme: 'saint-seiya',
        kind: 'saint-seiya-hades',
        mode: 'enabled',
      });
    }
    setFeedback(result.victory && cloth
      ? `${cloth.label} 获得，Lv${result.levelBefore} -> Lv${result.levelAfter}`
      : `试炼失败，获得 ${result.expGain} 经验`);
  };

  const chestCloth = activeChest ? SAINT_SEIYA_CLOTH_BY_ID[activeChest.clothId] : null;
  const battleCloth = battle ? SAINT_SEIYA_CLOTH_BY_ID[battle.chest.clothId] : null;

  return (
    <>
      <div
        className={`t8-saint-sanctuary nodrag nopan ${collapsed ? 'is-collapsed' : 'is-expanded'} ${activeChest ? 'has-active-chest' : ''}`}
        data-canvas-floating-ui="saint-seiya-sanctuary"
      >
        <button
          type="button"
          className="t8-saint-sanctuary__toolbar-toggle"
          onClick={handleToggleCollapsed}
          title={collapsed ? '展开圣域罗盘' : '折叠圣域罗盘'}
          aria-label={collapsed ? '展开圣域罗盘' : '折叠圣域罗盘'}
          aria-expanded={!collapsed}
        >
          <Shield size={14} />
          <span>圣域</span>
          <strong>Lv{level}</strong>
        </button>

        {!collapsed && (
          <section className={`t8-saint-sanctuary__panel ${hadesModeActive ? 'is-hades' : ''}`}>
            <div className="t8-saint-sanctuary__header">
              <span>
                <Shield size={14} />
                圣域罗盘
              </span>
              <strong>Lv{level}</strong>
            </div>
            <div className="t8-saint-sanctuary__exp">
              <span>EXP {expInLevel}/10</span>
              <i style={{ width: `${Math.round((expInLevel / 10) * 100)}%` }} />
            </div>
            <div className="t8-saint-sanctuary__cloth-grid">
              <span style={{ '--saint-rank': SAINT_CLOTH_RANK_ACCENT.bronze } as any}>青铜 {bronzeCount}/{rankTotal('bronze')}</span>
              <span style={{ '--saint-rank': SAINT_CLOTH_RANK_ACCENT.silver } as any}>白银 {silverCount}/{rankTotal('silver')}</span>
              <span style={{ '--saint-rank': SAINT_CLOTH_RANK_ACCENT.gold } as any}>黄金 {goldCount}/12</span>
            </div>
            <div className="t8-saint-sanctuary__status">
              {feedback
                || (battle
                  ? `${battle.enemy.name} 试炼中`
                  : openingTarget
                    ? `保持视角 ${Math.max(0, Math.ceil((SAINT_SEIYA_OPEN_MS - openingTarget.progressMs) / 1000))}s`
                    : activeChest && chestCloth
                      ? `${clothRankLabel(activeChest.rank)}反应：${chestCloth.constellation} · ${Math.max(0, Math.ceil((activeChest.expiresAt - now) / 1000))}s`
                      : hadesModeActive
                        ? '冥界篇已开启'
                        : `下一次宝箱 ${formatMs(nextSpawnRemainingMs)}`)}
            </div>
            {openingTarget && (
              <div className="t8-saint-sanctuary__hold">
                <span style={{ width: `${Math.round(openingRatio * 100)}%` }} />
              </div>
            )}
            <div className="t8-saint-sanctuary__moves">
              {availableMoves.map((move) => (
                <span key={move.id}>{move.name}</span>
              ))}
            </div>
            <div className="t8-saint-sanctuary__actions">
              <button type="button" onClick={() => setNextSpawnAt(Date.now())} title="立即扫描下一处宝箱">
                <MapPin size={12} />
                巡查
              </button>
              <button
                type="button"
                onClick={handleHadesModeSwitch}
                disabled={!hadesUnlockedAt}
                title={hadesModeActive ? '退出冥界篇' : '进入冥界篇'}
              >
                <Power size={12} />
                {hadesModeActive ? '圣域' : '冥界'}
              </button>
              <button type="button" onClick={resetSanctuary} title="重置圣衣收集">
                <RotateCcw size={12} />
              </button>
            </div>
          </section>
        )}
      </div>

      <div
        className={`t8-saint-sanctuary__map-layer nodrag nopan ${activeChest ? 'has-active-chest' : ''}`}
        data-canvas-floating-ui="saint-seiya-sanctuary-map"
        aria-hidden={!activeChest}
      >
        {activeChest && chestCloth && (
          <button
            type="button"
            className={`t8-saint-sanctuary__ping is-${activeChest.rank} ${openingTarget?.chestId === activeChest.id ? 'is-opening' : ''}`}
            style={{ left: `${activeChest.mapX}%`, top: `${activeChest.mapY}%` }}
            onClick={(event) => {
              event.stopPropagation();
              if (!openingTarget) handleChestClick();
            }}
            title={`发现 ${chestCloth.label}，点击跳转`}
            aria-label={`发现 ${chestCloth.label}，点击跳转`}
          >
            {activeChest.rank === 'gold' ? <Crown size={14} /> : activeChest.rank === 'silver' ? <Sparkles size={14} /> : <Gem size={14} />}
          </button>
        )}
      </div>

      {openingTarget && (
        <ViewportPortal>
          <div
            className={`t8-saint-sanctuary__target is-${openingTarget.rank}`}
            style={
              {
                left: openingTarget.x,
                top: openingTarget.y,
                '--saint-open-progress': openingRatio,
              } as any
            }
          >
            <span className="t8-saint-sanctuary__chest" aria-hidden="true">
              {openingTarget.rank === 'gold' ? <Crown size={18} /> : openingTarget.rank === 'silver' ? <Sparkles size={18} /> : <Gem size={18} />}
            </span>
            <strong>{Math.round(openingRatio * 100)}%</strong>
          </div>
        </ViewportPortal>
      )}

      {battle && (
        <div className={`t8-saint-battle nodrag nopan is-${battle.enemy.rank}`} data-canvas-floating-ui="saint-seiya-battle">
          <div className="t8-saint-battle__header">
            <span>
              <Swords size={15} />
              {battle.enemy.name}
            </span>
            <strong>Lv{battle.enemy.level}</strong>
          </div>
          <div className="t8-saint-battle__stats">
            <span>敌 HP {battle.report ? Math.max(0, battle.report.enemyHp) : battle.enemy.stats.hp}</span>
            <span>ATK {battle.enemy.stats.atk}</span>
            <span>{battleCloth?.label || '圣衣试炼'}</span>
          </div>
          {battle.report ? (
            <>
              <div className={`t8-saint-battle__result ${battle.report.victory ? 'is-win' : 'is-lose'}`}>
                {battle.report.victory ? '胜利' : '失败'} · +{battle.report.expGain} EXP
              </div>
              <div className="t8-saint-battle__log">
                {battle.report.log.slice(-5).map((line, index) => (
                  <span key={`${battle.id}-log-${index}`}>{line}</span>
                ))}
              </div>
              <button type="button" className="t8-saint-battle__primary" onClick={clearBattle}>
                收起战报
              </button>
            </>
          ) : (
            <>
              <div className="t8-saint-battle__log">
                <span>{battleCloth ? `${battleCloth.constellation} ${battleCloth.owner} 发起试炼` : '圣斗士试炼开始'}</span>
                <span>选择战斗方式，结算后获得经验；胜利才会获得圣衣。</span>
              </div>
              <div className="t8-saint-battle__actions">
                <button type="button" onClick={() => handleResolveBattle('attack')}>攻击</button>
                <button type="button" onClick={() => handleResolveBattle('skill')}>招式</button>
                <button type="button" onClick={() => handleResolveBattle('guard')}>防御</button>
                <button type="button" onClick={() => handleResolveBattle('cosmo')}>小宇宙</button>
                <button type="button" className="t8-saint-battle__primary" onClick={() => handleResolveBattle('auto')}>自动</button>
              </div>
            </>
          )}
          <div className="t8-saint-battle__meta">胜场 {winCount} · 黄金 {goldCount}/12</div>
        </div>
      )}

      {showHadesAnimation && (
        <div className="t8-saint-hades-cutscene" data-canvas-floating-ui="saint-seiya-hades-cutscene">
          <div className="t8-saint-hades-cutscene__zodiac">
            {SAINT_SEIYA_GOLD_CLOTHS.map((cloth, index) => (
              <span key={cloth.id} style={{ '--saint-zodiac-index': index } as any}>{cloth.constellation.slice(0, 2)}</span>
            ))}
          </div>
          <div className="t8-saint-hades-cutscene__athena" aria-hidden="true" />
          <div className="t8-saint-hades-cutscene__title">
            <Sparkles size={22} />
            ATHENA RESCUED
            <small>HADES CHAPTER UNLOCKED</small>
          </div>
        </div>
      )}
    </>
  );
}
