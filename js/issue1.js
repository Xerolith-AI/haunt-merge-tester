/**
 * Haunt Merge tester patch — issue #1 plus readability.
 * Load after BoardScene, before main.js.
 */
(function () {
  if (typeof BoardScene === 'undefined') return;
  BoardScene.BUILD_ID = '2026-10-02b';

  BoardScene.prototype.snapBack = function (src) {
    const pos = this.cellCenter(src.col, src.row);
    src.container.setPosition(pos.x, pos.y);
  };

  BoardScene.prototype.recallPost = function (post) {
    if (!post || !post.unlocked || post.tier == null) return false;
    const cell = this.findEmptyCell();
    if (!cell) {
      this.toast('Board full — can’t recall');
      return false;
    }
    const tier = post.tier;
    post.tier = null;
    this.refreshPostVisual(post);
    this.placeEntity(cell.col, cell.row, tier);
    this.toast('Recalled T' + (tier + 1) + ' to the board');
    this.persist();
    this.refreshHUD();
    return true;
  };

  BoardScene.prototype.tryAssignToPost = function (src, post) {
    if (!post.unlocked) {
      this.snapBack(src);
      this.toast('Post locked');
      return;
    }
    const maxTier = THEME.tiers.length - 1;
    if (post.tier != null) {
      if (post.tier !== src.tier) {
        this.snapBack(src);
        this.toast('Same tier to upgrade · tap post to recall');
        return;
      }
      if (src.tier >= maxTier) {
        this.snapBack(src);
        this.toast('Max tier');
        return;
      }
      const nextTier = src.tier + 1;
      this.destroyEntityAt(src.col, src.row);
      post.tier = nextTier;
      this.noteMaxTier(nextTier + 1);
      this.refreshPostVisual(post);
      const bonus = THEME.mergeScrapBonus * (nextTier + 1);
      this.scrap += bonus;
      this.lifetimeScrap += bonus;
      this.duskPressure += ECONOMY.dusk.duskRisePerMerge * this.getDuskRiseMult();
      this.checkPostUnlocks(true);
      this.refreshHUD();
      this.persist();
      this.toast(
        'Wall upgraded → T' + (nextTier + 1) + ' ' + THEME.tiers[nextTier].name
      );
      return;
    }
    const tier = src.tier;
    this.destroyEntityAt(src.col, src.row);
    post.tier = tier;
    this.noteMaxTier(tier + 1);
    this.refreshPostVisual(post);
    const yardTag = post.yardId === 'B' ? 'Side yard' : 'the wall';
    this.toast('Stationed T' + (tier + 1) + ' on ' + yardTag);
    this.checkPostUnlocks(true);
    this.persist();
  };

  const origDown = BoardScene.prototype.onPointerDown;
  BoardScene.prototype.onPointerDown = function (pointer) {
    if (this.prestigePanelOpen || this.spendPanelOpen) return;
    const tappedPost = this.postAt(pointer.x, pointer.y);
    if (tappedPost && tappedPost.unlocked && tappedPost.tier != null) {
      this.recallPost(tappedPost);
      return;
    }
    origDown.call(this, pointer);
  };

  BoardScene.prototype.ensureReadability = function () {
    if (this._readabilityReady) return;
    this._readabilityReady = true;
    if (this.gateIcon) {
      this.gateIcon.setScale(this.gateIcon.scaleX * 1.35);
      this.gateIcon.setDepth(6);
    }
    const W = this.scale.width;
    const veilH = 28;
    this.duskVeil = this.add
      .rectangle(W / 2, this.boardY + veilH / 2, W - 16, veilH, 0x1a0508, 0)
      .setDepth(8);
    this.orderText = this.add
      .text(this.boardX + 8, this.boardY + 6, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#e8e0d4',
      })
      .setDepth(9);
  };

  const origHUD = BoardScene.prototype.refreshHUD;
  BoardScene.prototype.refreshHUD = function () {
    origHUD.call(this);
    this.ensureReadability();

    const base = Math.max(1, ECONOMY.dusk.gateHpBase);
    const hpFrac = Phaser.Math.Clamp(this.gateHp / base, 0, 1);
    const def = this.getDefense();
    const pressure = this.duskPressure;
    const losing = pressure > def + 0.5 && !this.gateFrozen;
    const fillW = Math.max(
      2,
      this.duskBarW * hpFrac - (this.duskUseMeterArt ? 4 : 0)
    );
    const hpTint =
      hpFrac > 0.6
        ? 0xc4b59a
        : hpFrac > 0.35
          ? 0xa67c2d
          : hpFrac > 0.15
            ? 0xf07a1a
            : 0x8b1e1e;
    if (this.duskBarFill) {
      if (this.duskUseMeterArt) {
        this.duskBarFill.setDisplaySize(fillW, 12);
        if (this.duskBarFill.setTint) this.duskBarFill.setTint(hpTint);
      } else {
        this.duskBarFill.width = fillW;
        if (this.duskBarFill.setFillStyle) this.duskBarFill.setFillStyle(hpTint, 1);
      }
    }
    const hpColor =
      hpFrac <= 0.15
        ? '#8b1e1e'
        : hpFrac <= 0.35
          ? '#f07a1a'
          : hpFrac <= 0.6
            ? '#a67c2d'
            : '#c4b59a';
    if (this.gateHpText) {
      this.gateHpText.setColor(losing ? '#f07a1a' : hpColor);
      this.gateHpText.setText(
        (losing ? 'GATE UNDER DUSK  ' : 'Hold the Gate  ') +
          Math.floor(this.gateHp) +
          '/' +
          ECONOMY.dusk.gateHpBase
      );
    }
    if (this.subText) {
      this.subText.setText('Station the hive on the wall. Empty posts are unmanned.');
    }
    if (this.hintText) {
      this.hintText.setText(
        losing
          ? 'Dusk is over the wall — station a stronger caste or the Gate falls'
          : 'Tap a post to pull it back · drop the same tier on a post to upgrade'
      );
    }
    if (this.yardLabel) {
      const manned = this.posts.filter(function (p) {
        return p && p.unlocked && p.tier != null;
      }).length;
      this.yardLabel.setText('Yard A · the wall · ' + manned + ' stationed');
      this.yardLabel.setColor(manned === 0 ? '#f07a1a' : '#c4b59a');
    }
    if (this.yardBLabel) {
      this.yardBLabel.setText(this.yardBUnlocked ? 'Side yard' : 'Side yard · locked');
    }
    if (this.defText) {
      this.defText.setColor(losing ? '#f07a1a' : '#a898b8');
      this.defText.setText(
        'Wall ' +
          def.toFixed(0) +
          '  ·  Dusk ' +
          pressure.toFixed(0) +
          (losing ? '  OVER' : '  held')
      );
    }
    if (this.orderText) {
      this.orderText.setText(losing ? 'DUSK IS OVER THE WALL' : 'HOLD THE NIGHT GATE');
      this.orderText.setColor(losing ? '#f07a1a' : '#e8e0d4');
    }
    if (this.duskVeil) {
      const threat = losing
        ? Phaser.Math.Clamp((pressure - def) / Math.max(40, pressure), 0.25, 0.85)
        : 0.08;
      this.duskVeil.setFillStyle(0x1a0508, threat);
    }
    if (this.gateIcon && this.gateIcon.setAlpha) {
      this.gateIcon.setAlpha(losing ? 1 : 0.92);
    }
  };
})();
