/**
 * BoardScene — M1.5+: soft-unlock, thin prestige, M01/M02 + HT01–HT06 PP spend.
 *
 * Auto-merge rule: every ECONOMY.autoMergeIntervalSec, if two or more
 * free-board entities share the same tier with tier index >= autoMergeMinTierIndex
 * (display Tier ≥ 3), merge any two (no adjacency required). T1–T2 stay manual drag only.
 *
 * Yard A: bottom 2 rows; 8 post capacity, posts_start=4 active + soft-unlock 5–8.
 * Yard B: right side strip beside free board; unlock maxT≥4 OR lifeScrap≥3000;
 *         posts_start=4, income_mult 1.5, defense_base 5 + soft-unlock 5–8.
 */
class BoardScene extends Phaser.Scene {
  constructor() {
    super('BoardScene');
  }

  preload() {
    const pack = THEME.packPath;
    for (let i = 1; i <= 12; i++) {
      const id = 'creature_t' + String(i).padStart(2, '0');
      this.load.image(id, pack + id + '.png');
    }
    this.load.image('yard_post', pack + 'yard_post.png');
    this.load.image('yard_post_empty', pack + 'yard_post_empty.png');
    this.load.image('yard_post_b', pack + 'yard_post_b.png');
    this.load.image('yard_post_b_empty', pack + 'yard_post_b_empty.png');
    this.load.image('yard_region_a', pack + 'yard_region_a.png');
    this.load.image('yard_region_b', pack + 'yard_region_b.png');
    this.load.image('yard_region_b_frame', pack + 'yard_region_b_frame.png');
    this.load.image('gate_dusk', pack + 'gate_dusk.png');
    this.load.image('gate_dusk_wound', pack + 'gate_dusk_wound.png');
    this.load.image('gate_dusk_fallen', pack + 'gate_dusk_fallen.png');
    this.load.image('ui_dusk_meter_frame', pack + 'ui_dusk_meter_frame.png');
    this.load.image('ui_dusk_meter_fill', pack + 'ui_dusk_meter_fill.png');
    this.load.image('icon_prestige', pack + 'icon_prestige.png');
    this.load.image('m01', pack + 'm01.png');
    this.load.image('m02', pack + 'm02.png');
    for (let i = 1; i <= 6; i++) {
      const id = 'ht' + String(i).padStart(2, '0');
      this.load.image(id, pack + id + '.png');
    }
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.COLS = 5;
    this.ROWS = 6;
    this.FREE_ROWS = 4; // rows 0–3 merge board; 4–5 Yard A
    this.PAD = 12;
    this.HUD_H = 96;
    this.CTRL_H = 100;
    // Yard B side strip (right of free board) — stable width so A layout stays put
    this.YARD_B_STRIP_W = 70;
    this.YARD_B_GAP = 4;

    const boardTop = this.HUD_H + 8;
    const boardBottom = H - this.CTRL_H - 8;
    const boardH = boardBottom - boardTop;
    const boardW = W - this.PAD * 2 - this.YARD_B_STRIP_W - this.YARD_B_GAP;

    this.cellW = boardW / this.COLS;
    this.cellH = boardH / this.ROWS;
    this.boardX = this.PAD;
    this.boardY = boardTop;
    this.yardBX = this.boardX + this.COLS * this.cellW + this.YARD_B_GAP;
    this.yardBY = this.boardY;
    this.yardBW = this.YARD_B_STRIP_W;
    this.yardBH = this.FREE_ROWS * this.cellH;
    this.entityR = Math.min(this.cellW, this.cellH) * 0.36;
    this.texSize = this.entityR * 2.05;

    this.scrap = 0;
    this.duskPressure = 0;
    this.gateHp = ECONOMY.dusk.gateHpBase;
    this.gateFallen = false;
    this.gateFrozen = false;
    this.lifetimeScrap = 0;
    this.maxTierReached = 0; // display tier 1–12
    this.prestigeCount = 0;
    this.prestigePoints = 0;
    this.lifetimePpEarned = 0;
    this.milestoneLevels = { M01: 0, M02: 0 };
    this.hiveTraitLevels = {};
    this.prestigePanelOpen = false;
    this.spendPanelOpen = false;

    /** @type {(null|{tier:number, container:Phaser.GameObjects.Container, col:number, row:number})[][]} */
    this.grid = [];
    for (let r = 0; r < this.ROWS; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.COLS; c++) this.grid[r][c] = null;
    }

    /** @type {Array<{slot:number, unlocked:boolean, tier:number|null, col:number, row:number, yardId:string, container:Phaser.GameObjects.Container, icon:Phaser.GameObjects.GameObject|null, badge:Phaser.GameObjects.Text|null, lockText:Phaser.GameObjects.Text|null}>} */
    this.posts = [];
    /** @type {typeof this.posts} */
    this.postsB = [];
    this.yardBUnlocked = false;

    this.dragSource = null;
    this.autosaveTimer = 0;
    this.idleAcc = 0;
    this.autoMergeAcc = 0;
    this.hudAcc = 0;
    this.unlockCheckAcc = 0;
    /** Remaining free-spawn cooldown (sec). 0 = ready. */
    this.spawnCooldownRemaining = 0;
    this._spawnWasReady = true;

    this.drawBackground(W, H);
    this.drawBoard();
    this.buildYardPosts();
    this.buildYardBPosts();
    this.buildHUD(W);
    this.buildControls(W, H);
    this.buildPrestigePanel(W, H);
    this.buildSpendPanel(W, H);

    const saved = SaveSystem.load();
    if (saved) {
      this.scrap = saved.scrap;
      this.duskPressure = saved.duskPressure;
      this.gateHp = saved.gateHp;
      this.gateFallen = saved.gateFallen;
      this.gateFrozen = saved.gateFrozen;
      this.lifetimeScrap = saved.lifetimeScrap;
      this.maxTierReached = saved.maxTierReached;
      this.prestigeCount = saved.prestigeCount;
      this.prestigePoints = saved.prestigePoints;
      this.milestoneLevels = saved.milestoneLevels || { M01: 0, M02: 0 };
      this.hiveTraitLevels = saved.hiveTraitLevels || {};
      this.lifetimePpEarned = saved.lifetimePpEarned || 0;
      // Persist remaining CD; subtract wall time since save so offline counts
      {
        let rem =
          typeof saved.spawnCooldownRemaining === 'number'
            ? saved.spawnCooldownRemaining
            : 0;
        const savedAt =
          typeof saved.savedAt === 'number' ? saved.savedAt : 0;
        if (savedAt > 0 && rem > 0) {
          rem -= Math.max(0, (Date.now() - savedAt) / 1000);
        }
        this.spawnCooldownRemaining = Math.max(0, rem);
        this._spawnWasReady = this.spawnCooldownRemaining <= 0;
      }
      if (!this.lifetimePpEarned) {
        // Migrate v3 saves: reconstruct earned ≈ bank + spent on tracks
        this.lifetimePpEarned = this.prestigePoints + this.estimatePpSpent();
      }
      saved.entities.forEach((e) => {
        if (this.isFreeCell(e.col, e.row) && !this.grid[e.row][e.col]) {
          this.placeEntity(e.col, e.row, e.tier, true);
        }
      });
      if (saved.posts) {
        saved.posts.forEach((p) => {
          const post = this.posts[p.slot];
          if (!post) return;
          // Prefer saved unlock if true; checkPostUnlocks may open more
          if (p.unlocked) post.unlocked = true;
          if (p.tier != null && post.unlocked) {
            post.tier = p.tier;
            this.noteMaxTier(p.tier + 1);
          }
          this.refreshPostVisual(post);
        });
      }
      if (saved.yardBUnlocked) this.yardBUnlocked = true;
      if (saved.postsB) {
        saved.postsB.forEach((p) => {
          const post = this.postsB[p.slot];
          if (!post) return;
          if (p.unlocked) post.unlocked = true;
          if (p.tier != null && post.unlocked) {
            post.tier = p.tier;
            this.noteMaxTier(p.tier + 1);
          }
          this.refreshPostVisual(post);
        });
      }
      this.refreshYardBChrome();
      this.checkPostUnlocks(false);
      if (this.gateFallen) {
        // Soft-fail resume: frozen at 1 HP until prestige
        if (this.gateHp <= 0) this.gateHp = 1;
        this.gateFrozen = true;
        this.showPrestigePanel();
      }
    } else {
      this.placeEntity(1, 1, 0);
      this.placeEntity(3, 1, 0);
    }
    this.refreshHUD();
    this.refreshAllTrackChrome();
    this.refreshSpawnButton();

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);

    this.toastText = this.add
      .text(W / 2, this.boardY + this.FREE_ROWS * this.cellH * 0.5, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: THEME.colors.hudText,
        backgroundColor: '#000000aa',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setAlpha(0);
  }

  // ---------- Drawing ----------

  drawBackground(W, H) {
    this.cameras.main.setBackgroundColor(THEME.colors.bg);
    this.add
      .rectangle(W / 2, this.HUD_H / 2, W, this.HUD_H, THEME.colors.hudBg)
      .setDepth(0);
  }

  drawBoard() {
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(THEME.colors.board, 1);
    g.fillRoundedRect(
      this.boardX - 4,
      this.boardY - 4,
      this.COLS * this.cellW + 8,
      this.ROWS * this.cellH + 8,
      10
    );
    g.lineStyle(2, THEME.colors.boardStroke, 1);
    g.strokeRoundedRect(
      this.boardX - 4,
      this.boardY - 4,
      this.COLS * this.cellW + 8,
      this.ROWS * this.cellH + 8,
      10
    );

    // Yard A region (bottom 2 rows). Use the pack art when available;
    // retain the original palette as a fallback for incomplete packs.
    const yardY = this.boardY + this.FREE_ROWS * this.cellH;
    const yardH = (this.ROWS - this.FREE_ROWS) * this.cellH;
    const yardW = this.COLS * this.cellW;
    // Keep the warm fill under the optional Yard A frame art: the supplied
    // yard_region_a is an alpha frame rather than an opaque panel.
    g.fillStyle(THEME.colors.yardRegion, 0.85);
    g.fillRoundedRect(this.boardX, yardY, yardW, yardH, 6);
    if (this.textures.exists('yard_region_a')) {
      this.yardRegionImage = this.add
        .image(this.boardX + yardW / 2, yardY + yardH / 2, 'yard_region_a')
        .setDisplaySize(yardW, yardH)
        .setDepth(2);
    } else {
      g.lineStyle(2, THEME.colors.yardStroke, 0.9);
      g.strokeRoundedRect(this.boardX, yardY, yardW, yardH, 6);
    }

    // Yard B side strip: cold-ash/blood region art, never the old purple scaffold.
    if (this.textures.exists('yard_region_b')) {
      this.yardBRegionImage = this.add
        .image(
          this.yardBX + this.yardBW / 2,
          this.yardBY + this.yardBH / 2,
          'yard_region_b'
        )
        .setDisplaySize(this.yardBW, this.yardBH)
        .setDepth(1);
      if (this.textures.exists('yard_region_b_frame')) {
        this.yardBRegionFrame = this.add
          .image(
            this.yardBX + this.yardBW / 2,
            this.yardBY + this.yardBH / 2,
            'yard_region_b_frame'
          )
          .setDisplaySize(this.yardBW, this.yardBH)
          .setDepth(2);
      }
    } else {
      g.fillStyle(THEME.colors.yardBRegion, 0.9);
      g.fillRoundedRect(this.yardBX, this.yardBY, this.yardBW, this.yardBH, 6);
      g.lineStyle(2, THEME.colors.yardBStroke, 0.95);
      g.strokeRoundedRect(this.yardBX, this.yardBY, this.yardBW, this.yardBH, 6);
    }

    // Free-board empty cell markers
    for (let r = 0; r < this.FREE_ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const { x, y } = this.cellCenter(c, r);
        g.fillStyle(THEME.colors.cellEmpty, 1);
        g.fillCircle(x, y, this.entityR + 6);
      }
    }

    this.yardLabel = this.add
      .text(
        this.boardX + 6,
        yardY + 2,
        ECONOMY.yardA.name + ' · posts harvest',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '10px',
          color: '#c4b59a',
        }
      )
      .setDepth(3);

    this.yardBLabel = this.add
      .text(
        this.yardBX + this.yardBW / 2,
        this.yardBY + 2,
        ECONOMY.yardB.name + ' · ×' + ECONOMY.yardB.incomeMult,
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '9px',
          color: '#c4b59a',
          align: 'center',
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(3);
  }

  /**
   * Post layout on Yard A (rows 4–5):
   * Row 4 active slots 0–3 at cols 0,1,3,4 (center col reserved for gate icon)
   * Row 5 soft-unlock slots 4–7 at cols 0,1,3,4
   */
  buildYardPosts() {
    const layout = [
      { slot: 0, col: 0, row: 4 },
      { slot: 1, col: 1, row: 4 },
      { slot: 2, col: 3, row: 4 },
      { slot: 3, col: 4, row: 4 },
      { slot: 4, col: 0, row: 5 },
      { slot: 5, col: 1, row: 5 },
      { slot: 6, col: 3, row: 5 },
      { slot: 7, col: 4, row: 5 },
    ];
    const startActive = ECONOMY.yardA.activePostsStart;

    // Gate icon in yard center — tap to reopen prestige when fallen
    const gateCell = this.cellCenter(2, 4);
    const gateTexture = this.getGateTextureKey();
    if (this.textures.exists(gateTexture)) {
      this.gateIcon = this.add
        .image(gateCell.x, gateCell.y + this.cellH * 0.35, gateTexture)
        .setDisplaySize(this.texSize * 0.85, this.texSize * 0.85)
        .setDepth(3)
        .setAlpha(0.9)
        .setInteractive({ useHandCursor: true });
    } else {
      this.gateIcon = this.add
        .rectangle(
          gateCell.x,
          gateCell.y + this.cellH * 0.35,
          this.texSize * 0.7,
          this.texSize * 0.7,
          THEME.colors.danger,
          0.8
        )
        .setDepth(3)
        .setInteractive({ useHandCursor: true });
    }
    this.gateIcon.on('pointerdown', (ptr) => {
      ptr.event.stopPropagation();
      if (this.gateFallen) this.showPrestigePanel();
    });

    layout.forEach((L) => {
      const unlocked = L.slot < startActive;
      const { x, y } = this.cellCenter(L.col, L.row);
      const container = this.add.container(x, y).setDepth(4);
      let postImg;
      const postTexture = this.getPostTextureKey({
        yardId: 'A',
        unlocked,
        tier: null,
      });
      if (this.textures.exists(postTexture)) {
        postImg = this.add
          .image(0, 0, postTexture)
          .setDisplaySize(this.texSize * 0.9, this.texSize * 0.9);
        if (!unlocked) postImg.setTint(0x444444).setAlpha(0.45);
      } else {
        postImg = this.add.circle(
          0,
          0,
          this.entityR * 0.7,
          unlocked ? THEME.colors.yardStroke : THEME.colors.postLocked,
          unlocked ? 0.9 : 0.5
        );
      }
      container.add(postImg);
      let lockText = null;
      if (!unlocked) {
        lockText = this.add
          .text(0, 0, '🔒', { fontSize: '12px' })
          .setOrigin(0.5)
          .setAlpha(0.7);
        container.add(lockText);
      }
      const post = {
        slot: L.slot,
        unlocked,
        tier: null,
        col: L.col,
        row: L.row,
        yardId: 'A',
        container,
        postImg,
        icon: null,
        badge: null,
        lockText,
      };
      this.posts[L.slot] = post;
    });
  }

  /**
   * Yard B side strip: 2×4 posts beside free board.
   * Slots 0–3 start active once region unlocks; 4–7 soft-unlock after.
   * Until region unlock, all posts stay locked (visual stubs).
   */
  buildYardBPosts() {
    const layout = [
      { slot: 0, col: 0, row: 0 },
      { slot: 1, col: 1, row: 0 },
      { slot: 2, col: 0, row: 1 },
      { slot: 3, col: 1, row: 1 },
      { slot: 4, col: 0, row: 2 },
      { slot: 5, col: 1, row: 2 },
      { slot: 6, col: 0, row: 3 },
      { slot: 7, col: 1, row: 3 },
    ];
    // Region locked at create; checkYardUnlocks may open start posts
    layout.forEach((L) => {
      const { x, y } = this.yardBPostCenter(L.col, L.row);
      const container = this.add.container(x, y).setDepth(4);
      let postImg;
      const postR = Math.min(this.yardBW / 2, this.yardBH / 4) * 0.36;
      const postTex = postR * 2.05;
      const postTexture = this.getPostTextureKey({
        yardId: 'B',
        unlocked: false,
        tier: null,
      });
      if (this.textures.exists(postTexture)) {
        postImg = this.add
          .image(0, 0, postTexture)
          .setDisplaySize(postTex * 0.9, postTex * 0.9)
          .setTint(0x444444)
          .setAlpha(0.4);
      } else {
        postImg = this.add.circle(
          0,
          0,
          postR * 0.7,
          THEME.colors.postLocked,
          0.5
        );
      }
      container.add(postImg);
      const lockText = this.add
        .text(0, 0, '🔒', { fontSize: '11px' })
        .setOrigin(0.5)
        .setAlpha(0.7);
      container.add(lockText);
      const post = {
        slot: L.slot,
        unlocked: false,
        tier: null,
        col: L.col,
        row: L.row,
        yardId: 'B',
        container,
        postImg,
        icon: null,
        badge: null,
        lockText,
        _postR: postR,
        _postTex: postTex,
      };
      this.postsB[L.slot] = post;
    });
    this.refreshYardBChrome();
  }

  yardBPostCenter(col, row) {
    const padX = 4;
    const padY = 14; // leave room for label
    const innerW = this.yardBW - padX * 2;
    const innerH = this.yardBH - padY - 4;
    const cellW = innerW / 2;
    const cellH = innerH / 4;
    return {
      x: this.yardBX + padX + (col + 0.5) * cellW,
      y: this.yardBY + padY + (row + 0.5) * cellH,
    };
  }

  refreshYardBChrome() {
    if (this.yardBLabel) {
      if (this.yardBUnlocked) {
        this.yardBLabel.setText(
          ECONOMY.yardB.name + ' · ×' + ECONOMY.yardB.incomeMult
        );
        this.yardBLabel.setColor('#c4b59a');
      } else {
        this.yardBLabel.setText(ECONOMY.yardB.name + ' · locked');
        this.yardBLabel.setColor('#7f8585');
      }
    }
  }

  // Wounded art starts at half of max HP; fallen art covers soft-fail/frozen-at-1.
  getGateTextureKey() {
    if (this.gateFallen || (this.gateFrozen && this.gateHp <= 1)) {
      return 'gate_dusk_fallen';
    }
    if (this.gateHp <= ECONOMY.dusk.gateHpBase * 0.5) {
      return 'gate_dusk_wound';
    }
    return 'gate_dusk';
  }

  refreshGateVisual() {
    if (!this.gateIcon || !this.gateIcon.setTexture) return;
    const texture = this.getGateTextureKey();
    if (this.textures.exists(texture)) this.gateIcon.setTexture(texture);
  }

  getPostTextureKey(post) {
    const isB = post.yardId === 'B';
    if (post.unlocked && post.tier == null) {
      return isB ? 'yard_post_b_empty' : 'yard_post_empty';
    }
    return isB ? 'yard_post_b' : 'yard_post';
  }

  refreshPostVisual(post) {
    if (post.icon) {
      post.icon.destroy();
      post.icon = null;
    }
    if (post.badge) {
      post.badge.destroy();
      post.badge = null;
    }
    if (post.lockText) {
      if (post.unlocked) {
        post.lockText.destroy();
        post.lockText = null;
      }
    } else if (!post.unlocked) {
      post.lockText = this.add
        .text(0, 0, '🔒', { fontSize: '12px' })
        .setOrigin(0.5)
        .setAlpha(0.7);
      post.container.add(post.lockText);
    }
    if (post.postImg) {
      const texture = this.getPostTextureKey(post);
      if (post.postImg.setTexture && this.textures.exists(texture)) {
        post.postImg.setTexture(texture);
      }
      if (post.unlocked) {
        // Yard B art already carries the cold-ash/blood palette; do not tint it purple.
        if (post.postImg.clearTint) post.postImg.clearTint();
        post.postImg.setAlpha(1);
      } else {
        // Keep locked posts consistently dimmed across both yards.
        if (post.postImg.setTint) post.postImg.setTint(0x444444);
        post.postImg.setAlpha(0.4);
      }
    }
    if (post.tier == null || !post.unlocked) return;

    const def = THEME.tiers[post.tier];
    const slotId = def.slotId;
    const iconSize =
      post.yardId === 'B' && post._postTex
        ? post._postTex * 0.55
        : this.texSize * 0.55;
    const badgeY =
      post.yardId === 'B' && post._postR
        ? post._postR * 0.45
        : this.entityR * 0.45;
    let icon;
    if (this.textures.exists(slotId)) {
      icon = this.add
        .image(0, -4, slotId)
        .setDisplaySize(iconSize, iconSize);
    } else {
      const r =
        post.yardId === 'B' && post._postR
          ? post._postR * 0.35
          : this.entityR * 0.35;
      icon = this.add.circle(0, -4, r, def.color, 1);
    }
    const badge = this.add
      .text(0, badgeY, 'T' + (post.tier + 1), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#e8e0d4',
        backgroundColor: '#00000088',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5);
    post.container.add([icon, badge]);
    post.icon = icon;
    post.badge = badge;
  }

  buildHUD(W) {
    this.titleText = this.add
      .text(12, 8, THEME.title, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: THEME.colors.hudText,
      })
      .setDepth(10);

    this.scrapText = this.add
      .text(W - 12, 10, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: THEME.colors.accentHex,
      })
      .setOrigin(1, 0)
      .setDepth(10);

    // PP badge — tap opens Hive / Milestone spend panel mid-run
    const ppX = W - 14;
    const ppY = 36;
    this.ppHudHit = this.add
      .rectangle(ppX - 36, ppY, 78, 22, THEME.colors.prestige, 0.35)
      .setStrokeStyle(1, THEME.colors.prestige, 0.7)
      .setOrigin(0.5)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });
    if (this.textures.exists('icon_prestige')) {
      this.ppHudIcon = this.add
        .image(ppX - 62, ppY, 'icon_prestige')
        .setDisplaySize(16, 16)
        .setDepth(11);
    } else {
      this.ppHudIcon = this.add
        .circle(ppX - 62, ppY, 7, THEME.colors.prestige, 1)
        .setDepth(11);
    }
    this.ppHudText = this.add
      .text(ppX - 50, ppY, 'PP 0', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: THEME.colors.hudText,
      })
      .setOrigin(0, 0.5)
      .setDepth(11);
    this.ppHudHit.on('pointerdown', (ptr) => {
      ptr.event.stopPropagation();
      this.openSpendPanel();
    });

    this.subText = this.add
      .text(12, 30, 'Drag merge · drop on post · tap PP to spend', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        color: '#a898b8',
      })
      .setDepth(10);

    // Dusk meter bar (Marrow ui_dusk_meter_* with rect fallback)
    const barX = 12;
    const barY = 52;
    const barW = W - 24;
    const barH = 12;
    this.duskBarW = barW;
    this.duskBarX = barX;
    this.duskUseMeterArt = this.textures.exists('ui_dusk_meter_frame');
    if (this.duskUseMeterArt) {
      this.duskBarBg = this.add
        .image(barX + barW / 2, barY + barH / 2, 'ui_dusk_meter_frame')
        .setDisplaySize(barW, 18)
        .setDepth(10);
      this.duskBarFill = this.add
        .image(barX + 2, barY + barH / 2, 'ui_dusk_meter_fill')
        .setOrigin(0, 0.5)
        .setDisplaySize(4, 12)
        .setDepth(11);
    } else {
      this.duskBarBg = this.add
        .rectangle(barX + barW / 2, barY + barH / 2, barW, barH, THEME.colors.duskBar, 1)
        .setStrokeStyle(1, 0x6b3a2a, 0.8)
        .setDepth(10);
      this.duskBarFill = this.add
        .rectangle(barX, barY + barH / 2, 2, barH - 2, THEME.colors.duskFill, 1)
        .setOrigin(0, 0.5)
        .setDepth(11);
    }

    this.gateHpText = this.add
      .text(12, 70, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#c4b59a',
      })
      .setDepth(10);

    this.defText = this.add
      .text(W - 12, 70, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#a898b8',
      })
      .setOrigin(1, 0)
      .setDepth(10);
  }

  buildControls(W, H) {
    const cy = H - this.CTRL_H / 2 - 4;
    const btnY = cy;
    const bw = 100;
    const bh = 44;
    const gap = 12;
    const total = bw * 3 + gap * 2;
    let bx = (W - total) / 2 + bw / 2;

    this.spawnBtn = this.makeButton(bx, btnY, bw, bh, THEME.spawnLabel, () =>
      this.spawnBase()
    );
    bx += bw + gap;
    this.saveBtn = this.makeButton(bx, btnY, bw, bh, THEME.saveLabel, () => {
      this.persist();
      this.toast('Saved');
    });
    bx += bw + gap;
    this.resetBtn = this.makeButton(
      bx,
      btnY,
      bw,
      bh,
      THEME.resetLabel,
      () => this.resetBoard(),
      THEME.colors.danger
    );

    this.hintText = this.add
      .text(
        W / 2,
        H - 18,
        'Posts earn scrap · dusk rises · Gate HP drains if defense < pressure',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '10px',
          color: '#887898',
        }
      )
      .setOrigin(0.5)
      .setDepth(10);
  }

  makeButton(x, y, w, h, label, onClick, fillColor) {
    const fill = fillColor != null ? fillColor : THEME.colors.button;
    const container = this.add.container(x, y).setDepth(20);
    const bg = this.add
      .rectangle(0, 0, w, h, fill, 1)
      .setStrokeStyle(2, 0xffffff, 0.25)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: THEME.colors.buttonText,
      })
      .setOrigin(0.5);
    container.add([bg, text]);
    container.bg = bg;
    container.labelText = text;
    container._fillColor = fill;
    container._disabled = false;
    bg.on('pointerdown', (ptr) => {
      ptr.event.stopPropagation();
      if (container._disabled) return;
      onClick();
    });
    bg.on('pointerover', () => {
      if (!container._disabled) bg.setFillStyle(fill, 0.85);
    });
    bg.on('pointerout', () => {
      if (!container._disabled) bg.setFillStyle(fill, 1);
    });
    return container;
  }

  // ---------- Prestige panel ----------

  buildPrestigePanel(W, H) {
    this.prestigeRoot = this.add.container(0, 0).setDepth(200).setVisible(false);

    const dim = this.add
      .rectangle(W / 2, H / 2, W, H, 0x000000, 0.72)
      .setInteractive();
    dim.on('pointerdown', (ptr) => ptr.event.stopPropagation());

    // Leave room for the permanent-track chrome while keeping the panel inside
    // the portrait viewport. The Confirm / Not yet flow remains unchanged.
    const panelW = Math.min(320, W - 32);
    const panelH = Math.min(560, H - 24);
    const panelTop = H / 2 - panelH / 2;
    const panelBottom = H / 2 + panelH / 2;
    const panel = this.add
      .rectangle(W / 2, H / 2, panelW, panelH, 0x2e1a47, 1)
      .setStrokeStyle(2, THEME.colors.prestige, 0.9);

    // Keep the dimmer and panel behind the track chrome.
    this.prestigeRoot.add([dim, panel]);

    const iconY = panelTop + 42;
    if (this.textures.exists('icon_prestige')) {
      this.prestigeIcon = this.add
        .image(W / 2, iconY, 'icon_prestige')
        .setDisplaySize(44, 44);
    } else {
      this.prestigeIcon = this.add.circle(
        W / 2,
        iconY,
        22,
        THEME.colors.prestige,
        1
      );
    }

    this.prestigeTitle = this.add
      .text(W / 2, iconY + 35, 'Ritual prestige', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: THEME.colors.hudText,
      })
      .setOrigin(0.5);

    this.prestigeBody = this.add
      .text(W / 2, iconY + 70, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#c4b59a',
        align: 'center',
        wordWrap: { width: panelW - 36 },
      })
      .setOrigin(0.5, 0);

    this.prestigeChrome = [];
    const sectionStyle = {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#a898b8',
    };
    const trackTop = panelTop + 284;
    const milestoneHeader = this.add
      .text(W / 2, trackTop, 'PERMANENT MILESTONES', sectionStyle)
      .setOrigin(0.5);
    const milestoneY = trackTop + 20;
    const milestoneXs = [W / 2 - 72, W / 2 + 72];
    ECONOMY.milestones.forEach((def, i) => {
      this.addPrestigeTrackItem(def, milestoneXs[i], milestoneY, 32, 118);
    });

    const hiveHeaderY = milestoneY + 58;
    const hiveHeader = this.add
      .text(W / 2, hiveHeaderY, 'HIVE TRAITS', sectionStyle)
      .setOrigin(0.5);
    const hiveXs = [W / 2 - 96, W / 2, W / 2 + 96];
    const hiveRow1Y = hiveHeaderY + 20;
    const hiveRow2Y = hiveRow1Y + 64;
    ECONOMY.hiveTraits.forEach((def, i) => {
      const row = i < 3 ? 0 : 1;
      const col = i % 3;
      this.addPrestigeTrackItem(
        def,
        hiveXs[col],
        row === 0 ? hiveRow1Y : hiveRow2Y,
        30,
        88
      );
    });

    const btnY = panelBottom - 38;
    const confirmBg = this.add
      .rectangle(W / 2 - 70, btnY, 120, 40, THEME.colors.prestige, 1)
      .setStrokeStyle(2, 0xffffff, 0.3)
      .setInteractive({ useHandCursor: true });
    const confirmLabel = this.add
      .text(W / 2 - 70, btnY, 'Confirm', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: THEME.colors.buttonText,
      })
      .setOrigin(0.5);
    confirmBg.on('pointerdown', (ptr) => {
      ptr.event.stopPropagation();
      this.performPrestige();
    });

    const dismissBg = this.add
      .rectangle(W / 2 + 70, btnY, 120, 40, 0x3a2418, 1)
      .setStrokeStyle(2, 0xffffff, 0.2)
      .setInteractive({ useHandCursor: true });
    const dismissLabel = this.add
      .text(W / 2 + 70, btnY, 'Not yet', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#c4b59a',
      })
      .setOrigin(0.5);
    dismissBg.on('pointerdown', (ptr) => {
      ptr.event.stopPropagation();
      this.dismissPrestigePanel();
    });

    this.prestigeRoot.add([
      this.prestigeIcon,
      this.prestigeTitle,
      this.prestigeBody,
      milestoneHeader,
      hiveHeader,
      confirmBg,
      confirmLabel,
      dismissBg,
      dismissLabel,
    ]);
  }

  /**
   * Track chrome item for Ritual prestige panel (purchasable).
   * @param {object} def ECONOMY.milestones / hiveTraits entry
   * @param {'milestone'|'hive'} kind
   */
  addPrestigeTrackItem(def, x, y, iconSize, labelWidth) {
    const kind = def.id.indexOf('HT') === 0 ? 'hive' : 'milestone';
    const textureKey = def.id.toLowerCase();
    const icon = this.textures.exists(textureKey)
      ? this.add
          .image(x, y, textureKey)
          .setDisplaySize(iconSize, iconSize)
          .setInteractive({ useHandCursor: true })
      : this.add
          .circle(x, y, iconSize / 2, THEME.colors.prestige, 1)
          .setStrokeStyle(1, THEME.colors.chrome, 0.4)
          .setInteractive({ useHandCursor: true });
    icon.on('pointerdown', (ptr) => {
      ptr.event.stopPropagation();
      this.tryBuyTrack(def, kind);
    });
    const plus = this.add
      .text(x + iconSize / 2 + 2, y - iconSize / 2 - 2, '+', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: THEME.colors.accentHex,
        backgroundColor: '#1a1028cc',
        padding: { x: 3, y: 0 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    plus.on('pointerdown', (ptr) => {
      ptr.event.stopPropagation();
      this.tryBuyTrack(def, kind);
    });
    const label = this.add
      .text(x, y + iconSize / 2 + 3, def.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: labelWidth < 100 ? '8px' : '9px',
        color: '#c4b59a',
        align: 'center',
        wordWrap: { width: labelWidth - 4 },
        lineSpacing: -1,
      })
      .setOrigin(0.5, 0);
    const level = this.add
      .text(x, y + iconSize / 2 + 28, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: THEME.colors.hudText,
      })
      .setOrigin(0.5, 0);

    this.prestigeChrome.push({
      id: def.id,
      def,
      kind,
      maxLevel: def.maxLevel,
      levelText: level,
      plusBtn: plus,
      icon,
    });
    this.prestigeRoot.add([icon, plus, label, level]);
  }

  refreshPrestigeChrome() {
    if (!this.prestigeChrome) return;
    this.prestigeChrome.forEach((item) => this.refreshTrackItemChrome(item));
  }

  refreshTrackItemChrome(item) {
    const current = this.getTrackLevel(item.id, item.kind);
    const cost = item.def.unlockCostPp;
    const needPc = item.def.unlockPrestigeCount | 0;
    let status;
    if (current >= item.maxLevel) {
      status = 'Lv ' + current + '/' + item.maxLevel + ' MAX';
      if (item.plusBtn) item.plusBtn.setAlpha(0.25);
    } else if (this.prestigeCount < needPc) {
      status = 'Lv ' + current + '/' + item.maxLevel + ' · need #' + needPc;
      if (item.plusBtn) item.plusBtn.setAlpha(0.35);
    } else {
      status = 'Lv ' + current + '/' + item.maxLevel + ' · ' + cost + ' PP';
      const can =
        this.prestigePoints >= cost && this.prestigeCount >= needPc;
      if (item.plusBtn) item.plusBtn.setAlpha(can ? 1 : 0.45);
    }
    item.levelText.setText(status);
    if (item.icon && item.icon.setAlpha) {
      item.icon.setAlpha(current > 0 || this.prestigeCount >= needPc ? 1 : 0.55);
    }
  }

  // ---------- Hive / Milestone spend panel ----------

  buildSpendPanel(W, H) {
    this.spendRoot = this.add.container(0, 0).setDepth(210).setVisible(false);
    this.spendChrome = [];

    const dim = this.add
      .rectangle(W / 2, H / 2, W, H, 0x000000, 0.72)
      .setInteractive();
    dim.on('pointerdown', (ptr) => ptr.event.stopPropagation());

    const panelW = Math.min(340, W - 24);
    const panelH = Math.min(580, H - 20);
    const panelTop = H / 2 - panelH / 2;
    const panelBottom = H / 2 + panelH / 2;
    const panel = this.add
      .rectangle(W / 2, H / 2, panelW, panelH, 0x2e1a47, 1)
      .setStrokeStyle(2, THEME.colors.prestige, 0.95);

    this.spendRoot.add([dim, panel]);

    const titleY = panelTop + 28;
    if (this.textures.exists('icon_prestige')) {
      this.spendTitleIcon = this.add
        .image(W / 2 - 70, titleY, 'icon_prestige')
        .setDisplaySize(28, 28);
    } else {
      this.spendTitleIcon = this.add.circle(
        W / 2 - 70,
        titleY,
        12,
        THEME.colors.prestige,
        1
      );
    }
    this.spendTitle = this.add
      .text(W / 2 + 8, titleY, 'Hive & Milestones', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
        color: THEME.colors.hudText,
      })
      .setOrigin(0.5);

    this.spendPpText = this.add
      .text(W / 2, titleY + 26, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: THEME.colors.accentHex,
      })
      .setOrigin(0.5);

    this.spendSummary = this.add
      .text(W / 2, titleY + 46, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        color: '#a898b8',
        align: 'center',
        wordWrap: { width: panelW - 28 },
      })
      .setOrigin(0.5, 0);

    const sectionStyle = {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#a898b8',
    };
    const trackTop = panelTop + 118;
    const milestoneHeader = this.add
      .text(W / 2, trackTop, 'PERMANENT MILESTONES', sectionStyle)
      .setOrigin(0.5);
    const milestoneY = trackTop + 28;
    const milestoneXs = [W / 2 - 78, W / 2 + 78];
    ECONOMY.milestones.forEach((def, i) => {
      this.addSpendTrackItem(def, 'milestone', milestoneXs[i], milestoneY, 36, 130);
    });

    const hiveHeaderY = milestoneY + 78;
    const hiveHeader = this.add
      .text(W / 2, hiveHeaderY, 'HIVE TRAITS', sectionStyle)
      .setOrigin(0.5);
    const hiveXs = [W / 2 - 100, W / 2, W / 2 + 100];
    const hiveRow1Y = hiveHeaderY + 28;
    const hiveRow2Y = hiveRow1Y + 78;
    ECONOMY.hiveTraits.forEach((def, i) => {
      const row = i < 3 ? 0 : 1;
      const col = i % 3;
      this.addSpendTrackItem(
        def,
        'hive',
        hiveXs[col],
        row === 0 ? hiveRow1Y : hiveRow2Y,
        32,
        96
      );
    });

    const closeBg = this.add
      .rectangle(W / 2, panelBottom - 32, 140, 40, THEME.colors.button, 1)
      .setStrokeStyle(2, 0xffffff, 0.25)
      .setInteractive({ useHandCursor: true });
    const closeLabel = this.add
      .text(W / 2, panelBottom - 32, 'Close', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: THEME.colors.buttonText,
      })
      .setOrigin(0.5);
    closeBg.on('pointerdown', (ptr) => {
      ptr.event.stopPropagation();
      this.closeSpendPanel();
    });

    this.spendRoot.add([
      this.spendTitleIcon,
      this.spendTitle,
      this.spendPpText,
      this.spendSummary,
      milestoneHeader,
      hiveHeader,
      closeBg,
      closeLabel,
    ]);
  }

  addSpendTrackItem(def, kind, x, y, iconSize, labelWidth) {
    const textureKey = def.id.toLowerCase();
    const icon = this.textures.exists(textureKey)
      ? this.add
          .image(x, y, textureKey)
          .setDisplaySize(iconSize, iconSize)
          .setInteractive({ useHandCursor: true })
      : this.add
          .circle(x, y, iconSize / 2, THEME.colors.prestige, 1)
          .setStrokeStyle(1, THEME.colors.chrome, 0.4)
          .setInteractive({ useHandCursor: true });
    icon.on('pointerdown', (ptr) => {
      ptr.event.stopPropagation();
      this.tryBuyTrack(def, kind);
    });
    const plus = this.add
      .text(x + iconSize / 2 + 4, y - iconSize / 2, '+', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: THEME.colors.accentHex,
        backgroundColor: '#1a1028cc',
        padding: { x: 4, y: 0 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    plus.on('pointerdown', (ptr) => {
      ptr.event.stopPropagation();
      this.tryBuyTrack(def, kind);
    });
    const label = this.add
      .text(x, y + iconSize / 2 + 4, def.id + ' ' + def.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: labelWidth < 110 ? '8px' : '9px',
        color: '#c4b59a',
        align: 'center',
        wordWrap: { width: labelWidth - 2 },
        lineSpacing: -1,
      })
      .setOrigin(0.5, 0);
    const level = this.add
      .text(x, y + iconSize / 2 + 30, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: THEME.colors.hudText,
      })
      .setOrigin(0.5, 0);

    this.spendChrome.push({
      id: def.id,
      def,
      kind,
      maxLevel: def.maxLevel,
      levelText: level,
      plusBtn: plus,
      icon,
    });
    this.spendRoot.add([icon, plus, label, level]);
  }

  refreshSpendChrome() {
    if (!this.spendChrome) return;
    this.spendChrome.forEach((item) => this.refreshTrackItemChrome(item));
    if (this.spendPpText) {
      this.spendPpText.setText(
        'Bank ' +
          this.prestigePoints +
          ' PP · prestige #' +
          this.prestigeCount
      );
    }
    if (this.spendSummary) {
      const scrapPct = this.getScrapPctBonus();
      const defPct = this.getDefensePctBonus();
      const duskSlow = this.getDuskSlowBonus();
      const spawnPct = this.getSpawnSpeedPctBonus();
      const offlineH = this.getOfflineCapHours();
      const autoMin = this.getAutoMergeMinTierIndex();
      const cd = this.getSpawnCooldownSec();
      this.spendSummary.setText(
        'Scrap +' +
          Math.round(scrapPct * 100) +
          '% · Def +' +
          Math.round(defPct * 100) +
          '% · Dusk −' +
          Math.round(duskSlow * 100) +
          '%\n' +
          'Spawn +' +
          Math.round(spawnPct * 100) +
          '% (' +
          cd.toFixed(1) +
          's CD) · Offline ' +
          offlineH.toFixed(1) +
          'h · Auto ≥T' +
          (autoMin + 1)
      );
    }
  }

  refreshAllTrackChrome() {
    this.refreshPrestigeChrome();
    this.refreshSpendChrome();
  }

  openSpendPanel() {
    if (this.prestigePanelOpen) return;
    if (!this.spendRoot) return;
    this.refreshSpendChrome();
    this.spendRoot.setVisible(true);
    this.spendPanelOpen = true;
  }

  closeSpendPanel() {
    if (this.spendRoot) this.spendRoot.setVisible(false);
    this.spendPanelOpen = false;
    this.refreshHUD();
  }

  getTrackLevel(id, kind) {
    const levels =
      kind === 'hive' ? this.hiveTraitLevels : this.milestoneLevels;
    return Math.max(0, Number(levels && levels[id]) || 0);
  }

  setTrackLevel(id, kind, level) {
    if (kind === 'hive') {
      if (!this.hiveTraitLevels) this.hiveTraitLevels = {};
      this.hiveTraitLevels[id] = level;
    } else {
      if (!this.milestoneLevels) this.milestoneLevels = { M01: 0, M02: 0 };
      this.milestoneLevels[id] = level;
    }
  }

  /**
   * Sum effect across milestones + hive traits for a given effectType.
   * Milestones use effectPerLevel; hive traits use effectValue.
   */
  sumEffectBonus(effectType) {
    let total = 0;
    const milestones = ECONOMY.milestones || [];
    for (let i = 0; i < milestones.length; i++) {
      const d = milestones[i];
      if (d.effectType !== effectType) continue;
      const lv = this.getTrackLevel(d.id, 'milestone');
      const per = d.effectPerLevel != null ? d.effectPerLevel : 0;
      total += lv * per;
    }
    const traits = ECONOMY.hiveTraits || [];
    for (let i = 0; i < traits.length; i++) {
      const d = traits[i];
      if (d.effectType !== effectType) continue;
      const lv = this.getTrackLevel(d.id, 'hive');
      const per = d.effectValue != null ? d.effectValue : 0;
      total += lv * per;
    }
    return total;
  }

  getScrapPctBonus() {
    return this.sumEffectBonus('scrap_pct');
  }

  getDefensePctBonus() {
    return this.sumEffectBonus('yard_defense_pct');
  }

  getDuskSlowBonus() {
    return this.sumEffectBonus('dusk_slow_pct');
  }

  /** Multiplier for dusk rise rates: (1 - dusk_slow), clamped ≥ 0.2 */
  getDuskRiseMult() {
    return Math.max(0.2, 1 - this.getDuskSlowBonus());
  }

  getSpawnSpeedPctBonus() {
    return this.sumEffectBonus('spawn_speed_pct');
  }

  /**
   * Effective free-spawn cooldown (sec).
   * base / (1 + spawn_speed_pct) — M02 + HT06 via getSpawnSpeedPctBonus().
   */
  getSpawnCooldownSec() {
    const base =
      ECONOMY.spawn && ECONOMY.spawn.baseCooldownSec != null
        ? ECONOMY.spawn.baseCooldownSec
        : 10;
    const bonus = this.getSpawnSpeedPctBonus();
    return base / (1 + Math.max(0, bonus));
  }

  refreshSpawnButton() {
    if (!this.spawnBtn || !this.spawnBtn.labelText) return;
    const rem = this.spawnCooldownRemaining;
    const ready = rem <= 0;
    this.spawnBtn._disabled = !ready;
    if (ready) {
      this.spawnBtn.labelText.setText(THEME.spawnLabel);
      this.spawnBtn.bg.setFillStyle(this.spawnBtn._fillColor, 1);
      this.spawnBtn.bg.setAlpha(1);
    } else {
      const shown = rem >= 10 ? rem.toFixed(0) : rem.toFixed(1);
      this.spawnBtn.labelText.setText(shown + 's');
      this.spawnBtn.bg.setFillStyle(0x3a2418, 1);
      this.spawnBtn.bg.setAlpha(0.75);
    }
  }

  getOfflineCapHours() {
    const base =
      (ECONOMY.offline && ECONOMY.offline.capHoursBase) != null
        ? ECONOMY.offline.capHoursBase
        : 6;
    return base + this.sumEffectBonus('offline_cap_h_add');
  }

  getAutoMergeMinTierIndex() {
    const base = ECONOMY.autoMergeMinTierIndex;
    // HT04 effectValue is -1; sumEffectBonus returns negative delta
    const delta = this.sumEffectBonus('auto_merge_start_tier_delta');
    return Math.max(0, base + delta);
  }


  /** Sum PP spent on permanent tracks (flat unlockCostPp × level). For save migration. */
  estimatePpSpent() {
    let spent = 0;
    const mils = (ECONOMY && ECONOMY.milestones) || [];
    mils.forEach((def) => {
      const lv = (this.milestoneLevels && this.milestoneLevels[def.id]) || 0;
      spent += lv * (def.unlockCostPp | 0);
    });
    const traits = (ECONOMY && ECONOMY.hiveTraits) || [];
    traits.forEach((def) => {
      const lv = (this.hiveTraitLevels && this.hiveTraitLevels[def.id]) || 0;
      spent += lv * (def.unlockCostPp | 0);
    });
    return spent;
  }

  tryBuyTrack(def, kind) {
    const id = def.id;
    const current = this.getTrackLevel(id, kind);
    const maxLevel = def.maxLevel | 0;
    const cost = def.unlockCostPp | 0;
    const needPc = def.unlockPrestigeCount | 0;

    if (current >= maxLevel) {
      this.toast(id + ' already max');
      return false;
    }
    if (this.prestigeCount < needPc) {
      this.toast(id + ' needs prestige #' + needPc);
      return false;
    }
    if (this.prestigePoints < cost) {
      this.toast('Need ' + cost + ' PP (have ' + this.prestigePoints + ')');
      return false;
    }

    this.prestigePoints -= cost;
    this.setTrackLevel(id, kind, current + 1);
    this.persist();
    this.refreshAllTrackChrome();
    this.refreshHUD();

    const next = current + 1;
    let effectNote = '';
    switch (def.effectType) {
      case 'scrap_pct':
        effectNote = ' · scrap +' + Math.round(this.getScrapPctBonus() * 100) + '%';
        break;
      case 'yard_defense_pct':
        effectNote =
          ' · def +' + Math.round(this.getDefensePctBonus() * 100) + '%';
        break;
      case 'dusk_slow_pct':
        effectNote =
          ' · dusk −' + Math.round(this.getDuskSlowBonus() * 100) + '%';
        break;
      case 'spawn_speed_pct':
        effectNote =
          ' · spawn +' +
          Math.round(this.getSpawnSpeedPctBonus() * 100) +
          '% · CD ' +
          this.getSpawnCooldownSec().toFixed(1) +
          's';
        // Clamp remaining CD to new effective length so buys feel immediate
        if (this.spawnCooldownRemaining > 0) {
          this.spawnCooldownRemaining = Math.min(
            this.spawnCooldownRemaining,
            this.getSpawnCooldownSec()
          );
          this.refreshSpawnButton();
        }
        break;
      case 'offline_cap_h_add':
        effectNote = ' · offline ' + this.getOfflineCapHours().toFixed(1) + 'h';
        break;
      case 'auto_merge_start_tier_delta':
        effectNote = ' · auto ≥T' + (this.getAutoMergeMinTierIndex() + 1);
        break;
      default:
        break;
    }
    this.toast(id + ' → Lv ' + next + '/' + maxLevel + effectNote);
    return true;
  }

  calcPpGain() {
    const p = ECONOMY.prestige;
    const fromLife = Math.floor(
      Math.sqrt(Math.max(0, this.lifetimeScrap) / p.ppLifetimeDiv)
    );
    const fromTier = Math.max(
      0,
      (this.maxTierReached - p.ppTierBase) * p.ppTierPer
    );
    return fromLife + fromTier;
  }

  prestigeMult() {
    const p = ECONOMY.prestige;
    const earned = this.lifetimePpEarned || 0;
    if (earned <= 0) return 1;
    return 1 + p.multK * Math.pow(earned, p.multP);
  }

  showPrestigePanel() {
    if (!this.prestigeRoot) return;
    if (this.spendPanelOpen) this.closeSpendPanel();
    this.refreshAllTrackChrome();
    const gain = this.calcPpGain();
    const nextBank = this.prestigePoints + gain;
    const nextEarned = (this.lifetimePpEarned || 0) + gain;
    const nextMult = (() => {
      const p = ECONOMY.prestige;
      if (nextEarned <= 0) return 1;
      return 1 + p.multK * Math.pow(nextEarned, p.multP);
    })();
    this.prestigeBody.setText(
      'Gate has fallen.\n\n' +
        'PP gain: +' +
        gain +
        '  (bank ' +
        this.prestigePoints +
        ' → ' +
        nextBank +
        ')\n' +
        'Scrap mult → ×' +
        nextMult.toFixed(2) +
        '\n' +
        'Run max tier T' +
        this.maxTierReached +
        ' · life scrap ' +
        Math.floor(this.lifetimeScrap) +
        '\n\n' +
        'Confirm clears board + post assigns,\nresets scrap/dusk/Gate. PP & count persist.\n' +
        'Tap M/HT icons to spend banked PP.\n' +
        'Not yet: Gate holds at 1 HP (frozen).'
    );
    this.prestigeRoot.setVisible(true);
    this.prestigePanelOpen = true;
  }

  dismissPrestigePanel() {
    if (this.gateFallen) {
      this.gateHp = Math.max(1, this.gateHp);
      this.gateFrozen = true;
      this.persist();
      this.toast('Gate holds at 1 HP — tap Gate to ritual');
    }
    if (this.prestigeRoot) this.prestigeRoot.setVisible(false);
    this.prestigePanelOpen = false;
    this.refreshHUD();
  }

  performPrestige() {
    const gain = this.calcPpGain();
    this.prestigePoints += gain;
    this.lifetimePpEarned = (this.lifetimePpEarned || 0) + gain;
    this.prestigeCount += 1;

    // Clear free board
    for (let r = 0; r < this.FREE_ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        if (this.grid[r][c]) this.destroyEntityAt(c, r);
      }
    }

    // Clear post assignments; re-lock soft posts (start 4 active)
    const startActive = ECONOMY.yardA.activePostsStart;
    for (let i = 0; i < this.posts.length; i++) {
      const p = this.posts[i];
      if (!p) continue;
      p.tier = null;
      p.unlocked = i < startActive;
      this.refreshPostVisual(p);
    }
    // Yard B re-locks with run trackers (region + soft posts)
    this.yardBUnlocked = false;
    for (let i = 0; i < this.postsB.length; i++) {
      const p = this.postsB[i];
      if (!p) continue;
      p.tier = null;
      p.unlocked = false;
      this.refreshPostVisual(p);
    }
    this.refreshYardBChrome();

    // Scrap wipe (ECONOMY.prestige.scrapKeep = 0); run trackers reset
    this.scrap = ECONOMY.prestige.scrapKeep;
    this.lifetimeScrap = 0;
    this.maxTierReached = 0;
    this.duskPressure = 0;
    this.gateHp = ECONOMY.dusk.gateHpBase;
    this.gateFallen = false;
    this.gateFrozen = false;

    // Milestone / hive stubs persist (levels stay; start at 0 until buy UI)
    if (!this.milestoneLevels) this.milestoneLevels = { M01: 0, M02: 0 };
    if (!this.hiveTraitLevels) this.hiveTraitLevels = {};

    this.placeEntity(1, 1, 0);
    this.placeEntity(3, 1, 0);
    this.spawnCooldownRemaining = 0;
    this._spawnWasReady = true;

    if (this.prestigeRoot) this.prestigeRoot.setVisible(false);
    this.prestigePanelOpen = false;
    this.refreshHUD();
    this.refreshAllTrackChrome();
    this.refreshSpawnButton();
    this.persist();
    this.toast(
      'Prestige #' +
        this.prestigeCount +
        ' · +' +
        gain +
        ' PP (×' +
        this.prestigeMult().toFixed(2) +
        ')'
    );
  }

  // ---------- Soft-unlock posts ----------

  noteMaxTier(displayTier) {
    if (displayTier > this.maxTierReached) {
      this.maxTierReached = displayTier;
    }
  }

  meetsUnlockRequire(req) {
    if (!req) return false;
    if (req.maxTier != null && this.maxTierReached >= req.maxTier) return true;
    const lifeOk =
      req.lifetimeScrap != null && this.lifetimeScrap >= req.lifetimeScrap;
    const tierOrOk =
      req.maxTierOr != null && this.maxTierReached >= req.maxTierOr;
    // post8: lifetimeScrap OR maxTierOr
    if (req.lifetimeScrap != null && req.maxTierOr != null) {
      return lifeOk || tierOrOk;
    }
    if (lifeOk) return true;
    if (tierOrOk) return true;
    return false;
  }

  checkPostUnlocks(toastOnUnlock) {
    const showToast = toastOnUnlock !== false;
    let any = false;

    // Yard A soft posts 5–8
    const rulesA = ECONOMY.postUnlocks || [];
    for (let i = 0; i < rulesA.length; i++) {
      const rule = rulesA[i];
      const post = this.posts[rule.slot];
      if (!post || post.unlocked) continue;
      if (!this.meetsUnlockRequire(rule.require)) continue;
      post.unlocked = true;
      this.refreshPostVisual(post);
      any = true;
      if (showToast) {
        this.toast('Yard A post ' + rule.post + ' unlocked');
      }
    }

    // Yard B region unlock (maxT≥4 OR lifeScrap≥3000)
    if (!this.yardBUnlocked && ECONOMY.yardB && ECONOMY.yardB.unlock) {
      if (this.meetsUnlockRequire(ECONOMY.yardB.unlock)) {
        this.yardBUnlocked = true;
        const startActive = ECONOMY.yardB.activePostsStart;
        for (let i = 0; i < this.postsB.length; i++) {
          const p = this.postsB[i];
          if (!p) continue;
          if (i < startActive) {
            p.unlocked = true;
            this.refreshPostVisual(p);
          }
        }
        this.refreshYardBChrome();
        any = true;
        if (showToast) {
          this.toast('Yard B unlocked · ×' + ECONOMY.yardB.incomeMult);
        }
      }
    }

    // Yard B soft posts 5–8 (only after region unlock)
    if (this.yardBUnlocked) {
      const rulesB = ECONOMY.postUnlocksB || [];
      for (let i = 0; i < rulesB.length; i++) {
        const rule = rulesB[i];
        const post = this.postsB[rule.slot];
        if (!post || post.unlocked) continue;
        if (!this.meetsUnlockRequire(rule.require)) continue;
        post.unlocked = true;
        this.refreshPostVisual(post);
        any = true;
        if (showToast) {
          this.toast('Yard B post ' + rule.post + ' unlocked');
        }
      }
    }

    if (any) this.persist();
    return any;
  }

  // ---------- Grid helpers ----------

  inBounds(col, row) {
    return col >= 0 && col < this.COLS && row >= 0 && row < this.ROWS;
  }

  isFreeCell(col, row) {
    return this.inBounds(col, row) && row < this.FREE_ROWS;
  }

  cellCenter(col, row) {
    return {
      x: this.boardX + (col + 0.5) * this.cellW,
      y: this.boardY + (row + 0.5) * this.cellH,
    };
  }

  cellAt(px, py) {
    const col = Math.floor((px - this.boardX) / this.cellW);
    const row = Math.floor((py - this.boardY) / this.cellH);
    if (!this.inBounds(col, row)) return null;
    return { col, row };
  }

  postAt(px, py) {
    const hitR = this.entityR * 1.1;
    for (let i = 0; i < this.posts.length; i++) {
      const p = this.posts[i];
      if (!p) continue;
      const dx = px - p.container.x;
      const dy = py - p.container.y;
      if (dx * dx + dy * dy <= hitR * hitR) return p;
    }
    // Yard B posts are smaller — use their own radius when present
    for (let i = 0; i < this.postsB.length; i++) {
      const p = this.postsB[i];
      if (!p) continue;
      const r = (p._postR || this.entityR * 0.7) * 1.25;
      const dx = px - p.container.x;
      const dy = py - p.container.y;
      if (dx * dx + dy * dy <= r * r) return p;
    }
    return null;
  }

  findEmptyCell() {
    const empties = [];
    for (let r = 0; r < this.FREE_ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        if (!this.grid[r][c]) empties.push({ col: c, row: r });
      }
    }
    if (!empties.length) return null;
    return empties[Math.floor(Math.random() * empties.length)];
  }

  // ---------- Entities ----------

  hasTexture(slotId) {
    return this.textures.exists(slotId);
  }

  /**
   * @param {boolean} [silent] skip unlock toast (load path)
   */
  placeEntity(col, row, tier, silent) {
    if (!this.isFreeCell(col, row) || this.grid[row][col]) return null;
    const maxTier = THEME.tiers.length - 1;
    tier = Phaser.Math.Clamp(tier, 0, maxTier);
    const def = THEME.tiers[tier];
    const { x, y } = this.cellCenter(col, row);

    const container = this.add.container(x, y).setDepth(5);
    let body;
    if (this.hasTexture(def.slotId)) {
      body = this.add
        .image(0, 0, def.slotId)
        .setDisplaySize(this.texSize, this.texSize);
    } else {
      body = this.add.circle(0, 0, this.entityR, def.color, 1);
      body.setStrokeStyle(3, 0xffffff, 0.35);
    }
    const label = this.add
      .text(0, this.entityR * 0.05, def.name.split(' ')[0], {
        fontFamily: 'system-ui, sans-serif',
        fontSize: Math.max(9, Math.floor(this.entityR * 0.34)) + 'px',
        fontStyle: 'bold',
        color: '#e8e0d4',
        backgroundColor: '#00000066',
        padding: { x: 2, y: 1 },
        align: 'center',
      })
      .setOrigin(0.5);
    const tierBadge = this.add
      .text(0, this.entityR * 0.62, 'T' + (tier + 1), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        color: '#ffd35a',
        backgroundColor: '#00000088',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5);
    container.add([body, label, tierBadge]);
    container.setSize(this.entityR * 2, this.entityR * 2);

    const entity = { tier, container, col, row, body };
    this.grid[row][col] = entity;
    this.noteMaxTier(tier + 1);
    if (!silent) this.checkPostUnlocks(true);
    return entity;
  }

  destroyEntityAt(col, row) {
    const e = this.grid[row][col];
    if (!e) return;
    e.container.destroy(true);
    this.grid[row][col] = null;
  }

  moveEntity(entity, newCol, newRow) {
    if (!this.isFreeCell(newCol, newRow)) {
      const { x, y } = this.cellCenter(entity.col, entity.row);
      entity.container.setPosition(x, y);
      return;
    }
    this.grid[entity.row][entity.col] = null;
    entity.col = newCol;
    entity.row = newRow;
    this.grid[newRow][newCol] = entity;
    const { x, y } = this.cellCenter(newCol, newRow);
    entity.container.setPosition(x, y);
  }

  // ---------- Yard assign / harvest ----------

  tryAssignToPost(src, post) {
    if (!post.unlocked) {
      const { x, y } = this.cellCenter(src.col, src.row);
      src.container.setPosition(x, y);
      this.toast('Post locked');
      return;
    }
    if (post.tier != null) {
      const { x, y } = this.cellCenter(src.col, src.row);
      src.container.setPosition(x, y);
      this.toast('Post occupied');
      return;
    }
    const tier = src.tier;
    this.destroyEntityAt(src.col, src.row);
    post.tier = tier;
    this.noteMaxTier(tier + 1);
    this.refreshPostVisual(post);
    const yardTag = post.yardId === 'B' ? 'Yard B' : 'Yard A';
    this.toast('Assigned T' + (tier + 1) + ' → ' + yardTag);
    this.checkPostUnlocks(true);
    this.persist();
  }

  getDefense() {
    const k = ECONOMY.dusk.defenseFromIncomeK;
    let def = ECONOMY.yardA.defenseBase;
    const multA = ECONOMY.yardA.incomeMult;
    for (let i = 0; i < this.posts.length; i++) {
      const p = this.posts[i];
      if (!p || !p.unlocked || p.tier == null) continue;
      def += THEME.tiers[p.tier].earn * multA * k;
    }
    // Yard B base + assigned posts (income_mult 1.5) — only once region unlocked
    if (ECONOMY.yardB && this.yardBUnlocked) {
      def += ECONOMY.yardB.defenseBase;
      const multB = ECONOMY.yardB.incomeMult;
      for (let i = 0; i < this.postsB.length; i++) {
        const p = this.postsB[i];
        if (!p || !p.unlocked || p.tier == null) continue;
        def += THEME.tiers[p.tier].earn * multB * k;
      }
    }
    // HT01 Bastion Hive: yard_defense_pct
    return def * (1 + this.getDefensePctBonus());
  }

  getPostEarnPerSec() {
    let rate = 0;
    const scrapHive = 1 + this.getScrapPctBonus(); // HT02 Scrap Swarm
    const pMult = this.prestigeMult();
    const multA = ECONOMY.yardA.incomeMult * pMult * scrapHive;
    for (let i = 0; i < this.posts.length; i++) {
      const p = this.posts[i];
      if (!p || !p.unlocked || p.tier == null) continue;
      rate += THEME.tiers[p.tier].earn * multA;
    }
    if (ECONOMY.yardB) {
      const multB = ECONOMY.yardB.incomeMult * pMult * scrapHive;
      for (let i = 0; i < this.postsB.length; i++) {
        const p = this.postsB[i];
        if (!p || !p.unlocked || p.tier == null) continue;
        rate += THEME.tiers[p.tier].earn * multB;
      }
    }
    return rate;
  }

  // ---------- Gameplay ----------

  spawnBase() {
    if (this.prestigePanelOpen || this.spendPanelOpen) return;
    if (this.spawnCooldownRemaining > 0) {
      this.toast(
        'Spawn ready in ' + this.spawnCooldownRemaining.toFixed(1) + 's'
      );
      return;
    }
    const cell = this.findEmptyCell();
    if (!cell) {
      this.toast('Board full');
      return;
    }
    this.placeEntity(cell.col, cell.row, 0);
    this.duskPressure +=
      ECONOMY.dusk.duskRisePerSpawn * this.getDuskRiseMult();
    this.spawnCooldownRemaining = this.getSpawnCooldownSec();
    this._spawnWasReady = false;
    this.refreshSpawnButton();
    if (!this._assignNudgeShown) {
      this._assignNudgeShown = true;
      this.toast('Drop a creature on a post to hold the Gate');
    }
    this.persist();
    this.refreshHUD();
  }

  tryMerge(src, destCol, destRow) {
    const dest = this.grid[destRow] && this.grid[destRow][destCol];
    if (!dest || dest === src) {
      if (!dest && this.isFreeCell(destCol, destRow)) {
        this.moveEntity(src, destCol, destRow);
      } else {
        const { x, y } = this.cellCenter(src.col, src.row);
        src.container.setPosition(x, y);
      }
      return false;
    }

    if (dest.tier !== src.tier) {
      const { x, y } = this.cellCenter(src.col, src.row);
      src.container.setPosition(x, y);
      this.toast('Same tier only');
      return false;
    }

    const maxTier = THEME.tiers.length - 1;
    if (src.tier >= maxTier) {
      const { x, y } = this.cellCenter(src.col, src.row);
      src.container.setPosition(x, y);
      this.toast('Max tier');
      return false;
    }

    const nextTier = src.tier + 1;
    const srcCol = src.col;
    const srcRow = src.row;
    this.destroyEntityAt(srcCol, srcRow);
    this.destroyEntityAt(destCol, destRow);
    this.placeEntity(destCol, destRow, nextTier);

    const bonus = THEME.mergeScrapBonus * (nextTier + 1);
    this.scrap += bonus;
    this.lifetimeScrap += bonus;
    this.duskPressure +=
      ECONOMY.dusk.duskRisePerMerge * this.getDuskRiseMult();
    this.refreshHUD();
    this.toast('+' + bonus + ' ' + THEME.scrapLabel + ' · ' + THEME.tiers[nextTier].name);
    this.persist();
    return true;
  }

  /**
   * Auto-merge: any two free-board same-tier entities with tier >= min index.
   * No adjacency check — idle-friendly (documented in README).
   */
  tryAutoMerge() {
    if (this.prestigePanelOpen || this.spendPanelOpen) return false;
    const minT = this.getAutoMergeMinTierIndex(); // HT04 lowers floor
    const byTier = {};
    for (let r = 0; r < this.FREE_ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const e = this.grid[r][c];
        if (!e || e.tier < minT) continue;
        if (!byTier[e.tier]) byTier[e.tier] = [];
        byTier[e.tier].push(e);
      }
    }
    const tiers = Object.keys(byTier)
      .map(Number)
      .sort((a, b) => b - a);
    for (let i = 0; i < tiers.length; i++) {
      const list = byTier[tiers[i]];
      if (list.length < 2) continue;
      const a = list[0];
      const b = list[1];
      const ok = this.performMergePair(a, b);
      if (ok) {
        this.toast(
          'Auto-merge → ' +
            THEME.tiers[Math.min(a.tier + 1, THEME.tiers.length - 1)].name
        );
        return true;
      }
    }
    return false;
  }

  performMergePair(src, dest) {
    if (!src || !dest || src === dest) return false;
    if (src.tier !== dest.tier) return false;
    const maxTier = THEME.tiers.length - 1;
    if (src.tier >= maxTier) return false;
    const nextTier = src.tier + 1;
    const destCol = dest.col;
    const destRow = dest.row;
    this.destroyEntityAt(src.col, src.row);
    this.destroyEntityAt(destCol, destRow);
    this.placeEntity(destCol, destRow, nextTier);
    const bonus = THEME.mergeScrapBonus * (nextTier + 1);
    this.scrap += bonus;
    this.lifetimeScrap += bonus;
    this.duskPressure +=
      ECONOMY.dusk.duskRisePerMerge * this.getDuskRiseMult();
    this.refreshHUD();
    this.persist();
    return true;
  }

  resetBoard() {
    if (this.prestigeRoot) this.prestigeRoot.setVisible(false);
    this.prestigePanelOpen = false;
    if (this.spendRoot) this.spendRoot.setVisible(false);
    this.spendPanelOpen = false;
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        if (this.grid[r][c]) this.destroyEntityAt(c, r);
      }
    }
    for (let i = 0; i < this.posts.length; i++) {
      const p = this.posts[i];
      if (!p) continue;
      p.tier = null;
      p.unlocked = i < ECONOMY.yardA.activePostsStart;
      this.refreshPostVisual(p);
    }
    this.yardBUnlocked = false;
    for (let i = 0; i < this.postsB.length; i++) {
      const p = this.postsB[i];
      if (!p) continue;
      p.tier = null;
      p.unlocked = false;
      this.refreshPostVisual(p);
    }
    this.refreshYardBChrome();
    this.scrap = 0;
    this.duskPressure = 0;
    this.gateHp = ECONOMY.dusk.gateHpBase;
    this.gateFallen = false;
    this.gateFrozen = false;
    this.lifetimeScrap = 0;
    this.maxTierReached = 0;
    this.prestigeCount = 0;
    this.prestigePoints = 0;
    this.lifetimePpEarned = 0;
    this.milestoneLevels = { M01: 0, M02: 0 };
    this.hiveTraitLevels = {};
    this.spawnCooldownRemaining = 0;
    this._spawnWasReady = true;
    SaveSystem.clear();
    this.placeEntity(1, 1, 0);
    this.placeEntity(3, 1, 0);
    this.refreshHUD();
    this.refreshAllTrackChrome();
    this.refreshSpawnButton();
    this.persist();
    this.toast('Reset');
  }

  // ---------- Input (drag) ----------

  onPointerDown(pointer) {
    if (this.prestigePanelOpen || this.spendPanelOpen) return;
    if (pointer.y < this.boardY || pointer.y > this.boardY + this.FREE_ROWS * this.cellH) {
      return;
    }
    const cell = this.cellAt(pointer.x, pointer.y);
    if (!cell || !this.isFreeCell(cell.col, cell.row)) return;
    const e = this.grid[cell.row][cell.col];
    if (!e) return;
    this.dragSource = e;
    e.container.setDepth(50);
    e.container.setScale(1.08);
  }

  onPointerMove(pointer) {
    if (!this.dragSource) return;
    this.dragSource.container.setPosition(pointer.x, pointer.y);
  }

  onPointerUp(pointer) {
    if (!this.dragSource) return;
    const src = this.dragSource;
    this.dragSource = null;
    src.container.setDepth(5);
    src.container.setScale(1);

    if (this.prestigePanelOpen || this.spendPanelOpen) {
      const { x, y } = this.cellCenter(src.col, src.row);
      src.container.setPosition(x, y);
      return;
    }

    // Prefer post hit (yard assign)
    const post = this.postAt(pointer.x, pointer.y);
    if (post) {
      this.tryAssignToPost(src, post);
      return;
    }

    const cell = this.cellAt(pointer.x, pointer.y);
    if (!cell || !this.isFreeCell(cell.col, cell.row)) {
      const { x, y } = this.cellCenter(src.col, src.row);
      src.container.setPosition(x, y);
      return;
    }
    this.tryMerge(src, cell.col, cell.row);
  }

  // ---------- Scrap / dusk / save / HUD ----------

  refreshHUD() {
    this.refreshGateVisual();
    this.scrapText.setText(
      THEME.scrapLabel + ': ' + Math.floor(this.scrap)
    );
    if (this.ppHudText) {
      this.ppHudText.setText('PP ' + this.prestigePoints);
    }
    if (this.ppHudHit) {
      const lit = this.prestigePoints > 0 || this.prestigeCount > 0;
      this.ppHudHit.setFillStyle(THEME.colors.prestige, lit ? 0.5 : 0.25);
    }
    const def = this.getDefense();
    const pressure = this.duskPressure;
    const softCap = Math.max(40, def * 1.5, pressure, 1);
    const frac = Phaser.Math.Clamp(pressure / softCap, 0, 1);
    const fillW = Math.max(2, this.duskBarW * frac - (this.duskUseMeterArt ? 4 : 0));
    if (this.duskUseMeterArt) {
      this.duskBarFill.setDisplaySize(fillW, 12);
    } else {
      this.duskBarFill.width = fillW;
    }
    const hpColor =
      this.gateHp <= 1 && this.gateFallen
        ? '#8b1e1e'
        : this.gateHp < ECONOMY.dusk.gateHpBase * 0.35
          ? '#f07a1a'
          : '#c4b59a';
    this.gateHpText.setColor(hpColor);
    this.gateHpText.setText(
      'Gate HP ' +
        Math.floor(this.gateHp) +
        '/' +
        ECONOMY.dusk.gateHpBase +
        (this.gateFrozen ? ' ❄' : '')
    );
    this.defText.setText(
      'Def ' +
        def.toFixed(1) +
        ' · Dusk ' +
        pressure.toFixed(1) +
        (def < pressure ? ' ⚠' : '')
    );
  }

  serialize() {
    const entities = [];
    for (let r = 0; r < this.FREE_ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const e = this.grid[r][c];
        if (e) entities.push({ col: c, row: r, tier: e.tier });
      }
    }
    const posts = this.posts.map((p) => ({
      slot: p.slot,
      tier: p.tier,
      unlocked: p.unlocked,
    }));
    const postsB = this.postsB.map((p) => ({
      slot: p.slot,
      tier: p.tier,
      unlocked: p.unlocked,
    }));
    return {
      scrap: this.scrap,
      entities,
      posts,
      postsB,
      yardBUnlocked: !!this.yardBUnlocked,
      duskPressure: this.duskPressure,
      gateHp: this.gateHp,
      gateFallen: this.gateFallen,
      gateFrozen: this.gateFrozen,
      lifetimeScrap: this.lifetimeScrap,
      maxTierReached: this.maxTierReached,
      prestigeCount: this.prestigeCount,
      prestigePoints: this.prestigePoints,
      lifetimePpEarned: this.lifetimePpEarned || 0,
      milestoneLevels: this.milestoneLevels,
      hiveTraitLevels: this.hiveTraitLevels,
      spawnCooldownRemaining: this.spawnCooldownRemaining || 0,
    };
  }

  persist() {
    SaveSystem.save(this.serialize());
  }

  toast(msg) {
    if (!this.toastText) {
      // Create aborted or HUD not ready — avoid secondary crash
      console.warn('[toast]', msg);
      return;
    }
    this.toastText.setText(msg);
    this.toastText.setDepth(
      this.spendPanelOpen || this.prestigePanelOpen ? 220 : 100
    );
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setAlpha(1);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 900,
      duration: 400,
    });
  }

  update(_time, delta) {
    const dt = delta / 1000;

    // Post harvest (primary earn)
    const postRate = this.getPostEarnPerSec();
    if (postRate > 0) {
      const gained = postRate * dt;
      this.scrap += gained;
      this.lifetimeScrap += gained;
    }

    // Secondary free-board idle (not counted toward lifetime unlock scrap)
    let count = 0;
    for (let r = 0; r < this.FREE_ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        if (this.grid[r][c]) count++;
      }
    }
    if (count > 0) {
      this.scrap += count * THEME.idleScrapPerEntityPerSec * dt;
    }

    // Dusk pressure rise (HT03 Lingering Dusk slows all rise rates)
    this.duskPressure +=
      ECONOMY.dusk.duskRisePerSec * this.getDuskRiseMult() * dt;

    // Gate drain when defense < pressure (skipped if frozen after soft-fail dismiss)
    const def = this.getDefense();
    if (
      !this.gateFrozen &&
      !this.gateFallen &&
      def < this.duskPressure &&
      this.gateHp > 0
    ) {
      const deficit = this.duskPressure - def;
      const dmg =
        ECONOMY.dusk.deficitDamagePerSec *
        (deficit / Math.max(1, this.duskPressure)) *
        dt;
      this.gateHp = Math.max(0, this.gateHp - dmg);
      if (this.gateHp <= 0) {
        this.gateHp = 0;
        this.gateFallen = true;
        this.gateFrozen = true;
        this.refreshGateVisual();
        this.persist();
        this.showPrestigePanel();
      }
    }

    // Soft-unlock poll (lifetime scrap thresholds)
    this.unlockCheckAcc += dt;
    if (this.unlockCheckAcc >= 1) {
      this.unlockCheckAcc = 0;
      this.checkPostUnlocks(true);
    }

    // Auto-merge tick
    this.autoMergeAcc += dt;
    if (this.autoMergeAcc >= ECONOMY.autoMergeIntervalSec) {
      this.autoMergeAcc = 0;
      this.tryAutoMerge();
    }

    // Free-spawn cooldown tick
    if (this.spawnCooldownRemaining > 0) {
      this.spawnCooldownRemaining = Math.max(
        0,
        this.spawnCooldownRemaining - dt
      );
      if (this.spawnCooldownRemaining <= 0) {
        this.spawnCooldownRemaining = 0;
        if (!this._spawnWasReady) {
          this._spawnWasReady = true;
          if (!this.prestigePanelOpen && !this.spendPanelOpen) {
            this.toast('Spawn ready');
          }
        }
      }
      // Refresh label ~5×/sec via hudAcc below
    }

    this.hudAcc += dt;
    if (this.hudAcc >= 0.2) {
      this.hudAcc = 0;
      this.refreshHUD();
      this.refreshSpawnButton();
    }

    this.autosaveTimer += dt;
    if (this.autosaveTimer >= 5) {
      this.autosaveTimer = 0;
      this.persist();
    }
  }
}
