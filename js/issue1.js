/**
 * Issue #1 patch — load after BoardScene.
 * Merge/upgrade posted units, tap-to-recall, Gate HP bar color.
 */
(function () {
  if (typeof BoardScene === 'undefined') return;
  BoardScene.BUILD_ID = '2026-10-02a';

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
        'Upgraded post → T' + (nextTier + 1) + ' ' + THEME.tiers[nextTier].name
      );
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

  const origHUD = BoardScene.prototype.refreshHUD;
  BoardScene.prototype.refreshHUD = function () {
    origHUD.call(this);
    if (this.subText) {
      this.subText.setText(
        'Drag merge · drop same tier on a post to upgrade · tap post to recall'
      );
    }
    const base = Math.max(1, ECONOMY.dusk.gateHpBase);
    const hpFrac = Phaser.Math.Clamp(this.gateHp / base, 0, 1);
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
        if (this.duskBarFill.setFillStyle) {
          this.duskBarFill.setFillStyle(hpTint, 1);
        }
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
    if (this.gateHpText) this.gateHpText.setColor(hpColor);
    if (this.hintText) {
      this.hintText.setText(
        'Gate bar shifts bone → gold → blood as HP drops · tap a post to pull it back'
      );
    }
  };
})();
