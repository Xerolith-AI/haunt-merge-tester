/**
 * localStorage save/load for board + Yard A/B posts + dusk/gate + soft-unlock + prestige.
 * Key versioned so schema changes migrate cleanly (old keys ignored).
 */
const SaveSystem = {
  KEY: 'haunt-merge-w1-v2',

  /**
   * @param {{
   *   scrap: number,
   *   entities: Array<{col:number,row:number,tier:number}>,
   *   posts: Array<{slot:number,tier:number|null,unlocked:boolean}>,
   *   postsB: Array<{slot:number,tier:number|null,unlocked:boolean}>,
   *   yardBUnlocked: boolean,
   *   duskPressure: number,
   *   gateHp: number,
   *   gateFallen: boolean,
   *   gateFrozen: boolean,
   *   lifetimeScrap: number,
   *   maxTierReached: number,
   *   prestigeCount: number,
   *   prestigePoints: number,
   *   lifetimePpEarned: number,
   *   milestoneLevels: Object,
   *   hiveTraitLevels: Object,
   *   spawnCooldownRemaining: number
   * }} state
   */
  save(state) {
    try {
      const payload = {
        v: 6,
        savedAt: Date.now(),
        scrap: state.scrap,
        entities: state.entities,
        posts: state.posts,
        postsB: state.postsB || [],
        yardBUnlocked: !!state.yardBUnlocked,
        duskPressure: state.duskPressure,
        gateHp: state.gateHp,
        gateFallen: !!state.gateFallen,
        gateFrozen: !!state.gateFrozen,
        lifetimeScrap: state.lifetimeScrap || 0,
        maxTierReached: state.maxTierReached | 0,
        prestigeCount: state.prestigeCount | 0,
        prestigePoints: state.prestigePoints | 0,
        lifetimePpEarned: state.lifetimePpEarned | 0,
        milestoneLevels: state.milestoneLevels || { M01: 0, M02: 0 },
        hiveTraitLevels: state.hiveTraitLevels || {},
        spawnCooldownRemaining:
          typeof state.spawnCooldownRemaining === 'number'
            ? Math.max(0, state.spawnCooldownRemaining)
            : 0,
      };
      localStorage.setItem(this.KEY, JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('SaveSystem.save failed', e);
      return false;
    }
  },

  /**
   * @returns {object | null}
   */
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || (data.v !== 3 && data.v !== 4 && data.v !== 5 && data.v !== 6)) return null;
      if (typeof data.scrap !== 'number' || !Array.isArray(data.entities)) return null;
      const emptyMilestones = { M01: 0, M02: 0 };
      return {
        scrap: data.scrap,
        entities: data.entities.map((e) => ({
          col: e.col | 0,
          row: e.row | 0,
          tier: e.tier | 0,
        })),
        posts: Array.isArray(data.posts)
          ? data.posts.map((p) => ({
              slot: p.slot | 0,
              tier: p.tier == null ? null : p.tier | 0,
              unlocked: !!p.unlocked,
            }))
          : null,
        postsB: Array.isArray(data.postsB)
          ? data.postsB.map((p) => ({
              slot: p.slot | 0,
              tier: p.tier == null ? null : p.tier | 0,
              unlocked: !!p.unlocked,
            }))
          : null,
        yardBUnlocked: !!data.yardBUnlocked,
        duskPressure: typeof data.duskPressure === 'number' ? data.duskPressure : 0,
        gateHp:
          typeof data.gateHp === 'number' ? data.gateHp : ECONOMY.dusk.gateHpBase,
        gateFallen: !!data.gateFallen,
        gateFrozen: !!data.gateFrozen,
        lifetimeScrap:
          typeof data.lifetimeScrap === 'number' ? data.lifetimeScrap : 0,
        maxTierReached: data.maxTierReached | 0,
        prestigeCount: data.prestigeCount | 0,
        prestigePoints: data.prestigePoints | 0,
        lifetimePpEarned: data.lifetimePpEarned | 0,
        milestoneLevels: Object.assign(
          {},
          emptyMilestones,
          data.milestoneLevels && typeof data.milestoneLevels === 'object'
            ? data.milestoneLevels
            : {}
        ),
        hiveTraitLevels:
          data.hiveTraitLevels && typeof data.hiveTraitLevels === 'object'
            ? data.hiveTraitLevels
            : {},
        spawnCooldownRemaining:
          typeof data.spawnCooldownRemaining === 'number'
            ? Math.max(0, data.spawnCooldownRemaining)
            : 0,
        savedAt: typeof data.savedAt === 'number' ? data.savedAt : 0,
      };
    } catch (e) {
      console.warn('SaveSystem.load failed', e);
      return null;
    }
  },

  clear() {
    try {
      localStorage.removeItem(this.KEY);
      // Drop prior milestone key if present
      localStorage.removeItem('haunt-merge-w1-v1');
      return true;
    } catch (e) {
      console.warn('SaveSystem.clear failed', e);
      return false;
    }
  },
};
