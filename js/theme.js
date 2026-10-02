/**
 * Theme-pack stub — Halloween v1 (Haunt).
 * Slot IDs match Bot2 art brief: creature_t01 … creature_t12.
 * Gameplay uses tier index only; labels/colors/slotIds swap per pack.
 * Pack path convention: assets/packs/{theme}/ (identical keys across themes).
 */
const THEME = {
  id: 'haunt',
  title: 'Haunt Merge',
  subtitle: 'Yard A · Yard B · Night Gate',
  packPath: 'assets/packs/haunt/',

  // Bot2 palette (Halloween v1) — spike chrome; pack palette.json is brutal target
  colors: {
    bg: 0x1a1028,
    board: 0x2e1a47,
    boardStroke: 0x3d2b1f,
    cellEmpty: 0x2e1a47,
    yardRegion: 0x3a2418,
    yardStroke: 0x6b3a2a,
    // Cold-ash/blood fallbacks for packs without Yard B region art.
    yardBRegion: 0x242729,
    yardBStroke: 0x8b1e1e,
    yardBTint: 0xc4b59a, // legacy key; Yard B art is no longer tinted when unlocked.
    postLocked: 0x1a1210,
    hudBg: 0x1a1028,
    hudText: '#E8E0D4',
    accent: 0xf07a1a,
    accentHex: '#F07A1A',
    button: 0x9b5de5,
    buttonText: '#E8E0D4', 
    danger: 0x8b1e1e,
    reward: 0xffd35a,
    chrome: 0xe8e0d4,
    prestige: 0x9b5de5,
    duskBar: 0x5c1a1a,
    duskFill: 0x8b1e1e,
    gateOk: 0x7cfc6b,
  },

  // 12 merge tiers — names + slotIds locked to Bot2 Week 0 art
  // earn = scrap_per_sec from economy/tiers.csv (1.72^ curve) — keep in sync with Vale
  tiers: [
    { slotId: 'creature_t01', name: 'Candy Skull',    color: 0xe8e0d4, earn: 1.0 },
    { slotId: 'creature_t02', name: 'Batling',        color: 0x5a4a6a, earn: 1.72 },
    { slotId: 'creature_t03', name: 'Jack Sprout',    color: 0xf07a1a, earn: 2.9584 },
    { slotId: 'creature_t04', name: 'Ghostling',      color: 0xc8b0ff, earn: 5.0884 },
    { slotId: 'creature_t05', name: 'Web Spinner',    color: 0x7cfc6b, earn: 8.7521 },
    { slotId: 'creature_t06', name: 'Ghoul Hand',     color: 0xff6b8a, earn: 15.0537 },
    { slotId: 'creature_t07', name: 'Hex Apprentice', color: 0x9b5de5, earn: 25.8923 },
    { slotId: 'creature_t08', name: 'Fangling',       color: 0xff4466, earn: 44.5348 },
    { slotId: 'creature_t09', name: 'Bind Mummy',     color: 0xe8e0d4, earn: 76.5998 },
    { slotId: 'creature_t10', name: 'Bolt Golem',     color: 0xb8c0c8, earn: 131.7516 },
    { slotId: 'creature_t11', name: 'Reaper Shade',   color: 0x2e1a47, earn: 226.6128 },
    { slotId: 'creature_t12', name: 'Haunt Lord',     color: 0xffd35a, earn: 389.774 },
  ],

  scrapLabel: 'Scrap',
  scrapSlotId: 'currency_scrap',
  spawnLabel: 'Spawn',
  saveLabel: 'Save',
  resetLabel: 'Reset',

  // Free-board idle is secondary; posts are primary earn
  idleScrapPerEntityPerSec: 0.05,
  mergeScrapBonus: 2, // multiplied by result tier+1
};

/**
 * Economy knobs mirrored from economy/*.csv (LOCKED — do not edit CSVs here).
 * Yard A: 8 slot capacity, milestone-1 starts with 4 active.
 * Yard B: 8 slots, posts_start=4, income_mult 1.5, defense_base 5; region unlock T4/3k.
 * M1.5: soft-unlock posts 5–8 + thin prestige on Gate fall.
 */
const ECONOMY = {
  yardA: {
    id: 'A',
    name: 'Yard A',
    postSlots: 8,
    activePostsStart: 4,
    incomeMult: 1.0,
    defenseBase: 0,
  },
  /**
   * Soft-unlock schedule for Yard A posts 5–8 (1-based post / 0-based slot).
   * maxTier = display tier (1–12). lifetimeScrap = run lifetime.
   * Documented in README unlock table.
   */
  postUnlocks: [
    { slot: 4, post: 5, require: { maxTier: 3 } },
    { slot: 5, post: 6, require: { maxTier: 5 } },
    { slot: 6, post: 7, require: { lifetimeScrap: 3000 } },
    { slot: 7, post: 8, require: { lifetimeScrap: 8000, maxTierOr: 7 } },
  ],
  /**
   * Yard B (from economy/yards.csv + YardB_Spec_2026-10-01.md).
   * Region unlock: maxTier≥4 OR lifetimeScrap≥3000.
   * Soft posts 5–8 only after region unlock (absolute run trackers).
   */
  yardB: {
    id: 'B',
    name: 'Yard B',
    postSlots: 8,
    activePostsStart: 4,
    incomeMult: 1.5,
    defenseBase: 5,
    unlock: { maxTier: 4, lifetimeScrap: 3000 },
  },
  postUnlocksB: [
    { slot: 4, post: 5, require: { maxTier: 5 } },
    { slot: 5, post: 6, require: { maxTier: 7 } },
    { slot: 6, post: 7, require: { lifetimeScrap: 8000 } },
    { slot: 7, post: 8, require: { lifetimeScrap: 15000, maxTierOr: 9 } },
  ],
  dusk: {
    gateHpBase: 1000,
    duskRisePerSec: 0.35,
    duskRisePerSpawn: 0.8,
    duskRisePerMerge: 1.2,
    defenseFromIncomeK: 1.0,
    deficitDamagePerSec: 2.0,
  },
  // Auto-merge ON for tier index >= 2 (display Tier ≥ 3)
  autoMergeMinTierIndex: 2,
  autoMergeIntervalSec: 2.5,
  /**
   * Prestige (from economy/prestige.csv + Week0 locks).
   * Mult: 1 + 0.18 * PP^0.85. Scrap → 0 on prestige (L03).
   */
  prestige: {
    multK: 0.18,
    multP: 0.85,
    // ppGain = floor(sqrt(lifetimeScrap/1000)) + max(0, (maxTierReached - 5) * 2)
    ppLifetimeDiv: 1000,
    ppTierBase: 5,
    ppTierPer: 2,
    scrapKeep: 0, // full wipe; partial keep not in prestige.csv yet
  },
  /**
   * Free-spawn cooldown (from Week0 FREE_SPAWN_INTERVAL_S = 10).
   * Not a CSV row — Phaser lane constant. Effective CD =
   * baseCooldownSec / (1 + M02*effectPerLevel + HT06*effectValue). M02 retuned 0.08/lv (2026-10-01). Paid spawn deferred.
   */
  spawn: {
    baseCooldownSec: 10,
  },
  /** Offline base (from Week0 sheet). M01/HT05 add permanent hours. */
  offline: {
    capHoursBase: 6.0,
  },
  /** Permanent milestones (M01/M02) — PP spend UI on Ritual + Hive panel. */
  milestones: [
    {
      id: 'M01',
      name: 'Offline Cap Permanent',
      effectType: 'offline_cap_h_add',
      effectPerLevel: 0.5,
      maxLevel: 4,
      unlockCostPp: 5,
      unlockPrestigeCount: 1,
    },
    {
      id: 'M02',
      name: 'Spawn Speed Permanent',
      effectType: 'spawn_speed_pct',
      effectPerLevel: 0.08,
      maxLevel: 4,
      unlockCostPp: 5,
      unlockPrestigeCount: 1,
    },
  ],
  /** Hive traits (HT01–HT06) — PP spend UI on Ritual + Hive panel. */
  hiveTraits: [
    { id: 'HT01', name: 'Bastion Hive', effectType: 'yard_defense_pct', effectValue: 0.08, maxLevel: 5, unlockCostPp: 3, unlockPrestigeCount: 0 },
    { id: 'HT02', name: 'Scrap Swarm', effectType: 'scrap_pct', effectValue: 0.06, maxLevel: 5, unlockCostPp: 3, unlockPrestigeCount: 0 },
    { id: 'HT03', name: 'Lingering Dusk', effectType: 'dusk_slow_pct', effectValue: 0.05, maxLevel: 4, unlockCostPp: 4, unlockPrestigeCount: 1 },
    { id: 'HT04', name: 'Hive Auto-Merge', effectType: 'auto_merge_start_tier_delta', effectValue: -1, maxLevel: 2, unlockCostPp: 5, unlockPrestigeCount: 2 },
    { id: 'HT05', name: 'Deep Vault', effectType: 'offline_cap_h_add', effectValue: 0.5, maxLevel: 4, unlockCostPp: 4, unlockPrestigeCount: 1 },
    { id: 'HT06', name: 'Spawn Pulse', effectType: 'spawn_speed_pct', effectValue: 0.04, maxLevel: 4, unlockCostPp: 3, unlockPrestigeCount: 0 },
  ],
};

Object.freeze(THEME.colors);
Object.freeze(THEME.tiers);
Object.freeze(THEME);
Object.freeze(ECONOMY.yardA);
Object.freeze(ECONOMY.postUnlocks);
Object.freeze(ECONOMY.yardB);
Object.freeze(ECONOMY.yardB.unlock);
Object.freeze(ECONOMY.postUnlocksB);
Object.freeze(ECONOMY.dusk);
Object.freeze(ECONOMY.prestige);
Object.freeze(ECONOMY.spawn);
Object.freeze(ECONOMY.offline);
Object.freeze(ECONOMY.milestones);
Object.freeze(ECONOMY.hiveTraits);
Object.freeze(ECONOMY);
