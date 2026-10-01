# Haunt pack MANIFEST — realistic / brutal (restart 2026-09-30)

**Canonical art brief:** `/workspace/HauntMerge_ArtDirection_Brutal_2026-09-30.md`  
**Obsolete direction:** cute-spooky Week 0 brief (do not harvest PlayPug candy Halloween as final art).

**Staged assets:** procedural silhouette placeholders (Bot2). License: project-owned placeholders.  
**Style lock:** realistic / brutal — blood / ash / rust / bone / night. Replace placeholders before ship.

**palette.json:** brutal hexes (`#0D0A0C` night, `#8B1E1E` blood, `#6B3A2A` rust, `#C4B59A` bone, `#A67C2D` tarnished gold, `#5C1A1A` prestige).

## Creatures → intended FREE NOW (brutal harvest)

| Key | Intended source | License note |
| --- | --- | --- |
| creature_t01–t12 | Silhouette-simplify from CC0 dark fantasy packs (willYEE Dark Fantasy Pixel Pack · LuizMelo Monsters Creatures Fantasy · Reaktori Debts in the Depths · Hexany Monster Menagerie · OGA Tiny Creatures) | CC0 / verify on pull |
| yard_post, gate_dusk | Brutal generated icons (96×96 PNG, transparent) — Gamma source + postprocess | project-owned |
| prestige / chrome | Kenney Game Icons / UI Pack recolored to blood-sigil palette | CC0 |

## Why placeholders remain

Itch zip fetch / license verify deferred; silhouette PNGs unblock Bot1 `setTexture`. **Must replace** with brutal assets per new brief before ASO/screenshots.

## Art pull update (2026-09-30 evening)

`creature_t01`…`creature_t12` replaced with brutal generated icons (128×128 PNG). Source JPG masters in `/workspace/haunt-merge/assets/previews/creature_t##_source.jpg`. Preview plates: `haunt_preview_plate_t1-t6.jpg`, `haunt_preview_plate_t7-t12.jpg`.

Style: realistic/brutal dark fantasy. CC0 pack harvest may still add alternate silhouettes later; current set is shippable for spike/preview.


## UI icons update (2026-10-01 ~01:00 ET)

`yard_post.png` and `gate_dusk.png` replaced with brutal generated icons (96×96 RGBA, transparent BG). Installed at pack root + `ui/`. Old 64×64 stubs backed up in `_stubs_backup/`.

Source masters: `/workspace/haunt-merge/assets/previews/yard_post_source.jpg` (+ `.png`), `gate_dusk_source.jpg` (+ `.png`).

Optional dusk meter chrome shipped (procedural, clean): `ui_dusk_meter_frame.png` (128×24) + `ui_dusk_meter_fill.png` (128×16 bone→rust→deep wound). Ash may keep Phaser rects; textures available if wanted.


## Prestige / hive-trait chrome (2026-10-01 ~01:10 ET)

Replaced stub prestige UI with brutal blood-sigil / iron crest badges (96×96 RGBA, transparent BG). Installed at pack root + `ui/`. Old stubs in `_stubs_backup/` (`icon_prestige`, `prestige_trait_01/02`).

| Key | Motif | Source |
| --- | --- | --- |
| `icon_prestige` | Cracked Gate seal / ritual reset | Gamma + Pillow postprocess |
| `m01` | Offline Cap — vault/hourglass/ash chest | Gamma + Pillow postprocess |
| `m02` | Spawn Speed — cracked spawn-egg + pulse heart | Gamma + Pillow postprocess |
| `ht01` / `prestige_trait_01` | Bastion Hive — shield / bastion wall | Procedural Pillow crest (Gamma credits exhausted) |
| `ht02` / `prestige_trait_02` | Scrap Swarm — scrap pile + swarm motes | Procedural Pillow crest |
| `ht03` | Lingering Dusk — ash-red sun / dusk flare | Procedural Pillow crest |
| `ht04` | Hive Auto-Merge — two masses + linked posts | Procedural Pillow crest |
| `ht05` | Deep Vault — deep vault / offline chest | Procedural Pillow crest |
| `ht06` | Spawn Pulse — heart-beat spike | Procedural Pillow crest |

Source masters: `/workspace/haunt-merge/assets/previews/{icon_prestige,m01,m02}_source.jpg|.png` and `ht0#_source.png`. Palette: night/blood/rust/bone/sigil/wound/char — no pumpkin/candy.


## Yard B chrome (2026-10-01 ~08:50 ET)

Brutal cold-ash Yard B strip + post (procedural Pillow — Gamma image credits blocked). Installed at pack root + `ui/`. Distinguishes from Yard A warm char: cooler iron/ash body, blood-sigil band, no cute purple tint needed.

| Key | Size | Role |
| --- | --- | --- |
| `yard_post_b` | 96×96 RGBA | Cool iron/ash stake; same silhouette family as `yard_post` (vertical + left crossbeam + right brace); blood-sigil mid-band + iron lower band |
| `yard_region_b` | 96×192 RGBA | Cold ash filled panel + bone rim + blood-sigil corner L-marks (alpha-blend ready) |
| `yard_region_b_frame` | 96×192 RGBA | Transparent-center 9-slice-friendly alternate of region B |
| `yard_region_a` | 96×192 RGBA | Optional matching warm-char frame for Yard A consistency |

**Phaser keys:** load `yard_region_b` + `yard_post_b`; drop purple Graphics / `yard_post` purple tint when wired. Yard A can keep existing `yard_post` + optional `yard_region_a`.

Source masters: `/workspace/haunt-merge/assets/previews/yard_post_b_source.png`, `yard_region_b_source.png`, `yard_region_a_source.png`. Palette: night/ash/blood/rust/bone/sigil/wound/char — no pumpkin/candy/#9B5DE5.


## Consequence / DoT chrome (2026-10-01 ~09:35 ET)

Vale A+B feel-pass soft spots: Gate wound + empty-post ash — battlefield consequence (loss matters). Procedural Pillow (silhouette-first, phone-readable ~48px). Healthy `gate_dusk` / `yard_post` / `yard_post_b` left untouched.

| Key | Size | Role |
| --- | --- | --- |
| `gate_dusk_wound` | 96×96 RGBA | Night Gate wounded/failing — bent bars, deep-wound glow at seams, cracked seal |
| `gate_dusk_fallen` | 96×96 RGBA | Gate fallen/soft-fail — collapsed arch, ash/smoke, ritual-ready prestige tap |
| `yard_post_empty` | 96×96 RGBA | Yard A empty/unassigned — charred stake, ash dust, drained bands (no caste glow) |
| `yard_post_b_empty` | 96×96 RGBA | Yard B empty — cold iron/ash + faded blood-sigil band (abandoned, not locked-gray) |

**Suggested Phaser wiring:** swap `gateIcon` texture → `gate_dusk_wound` on low HP, `gate_dusk_fallen` on soft-fail/fallen; use `yard_post_empty` / `yard_post_b_empty` when post unlocked but unassigned (vs locked tint on healthy post).

Installed at pack root + `ui/`. Masters: `/workspace/haunt-merge/assets/previews/{gate_dusk_wound,gate_dusk_fallen,yard_post_empty,yard_post_b_empty}_source.png` (+ `_96.png`). QA strips: `qa_gate_consequence.png`, `qa_post_consequence.png`. Palette: night/blood/rust/bone/wound/ash/char/sigil — no pumpkin/candy.
