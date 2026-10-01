# Haunt pack — canonical default (Night Gate)

**Path:** `assets/packs/haunt/` (Bot1 `THEME.packPath`)
**Role:** Base theme identity for Haunt Merge / Hold the Night Gate. Not an optional seasonal overlay.
**Date staged:** 2026-09-30 (America/New_York)

## Creature keys (required)

| Key | Tier name | File |
| --- | --- | --- |
| `creature_t01` | Candy Skull | `creature_t01.png` (+ `creatures/`) |
| `creature_t02` | Batling | `creature_t02.png` |
| `creature_t03` | Jack Sprout | `creature_t03.png` |
| `creature_t04` | Ghostling | `creature_t04.png` |
| `creature_t05` | Web Spinner | `creature_t05.png` |
| `creature_t06` | Ghoul Hand | `creature_t06.png` |
| `creature_t07` | Hex Apprentice | `creature_t07.png` |
| `creature_t08` | Fangling | `creature_t08.png` |
| `creature_t09` | Bind Mummy | `creature_t09.png` |
| `creature_t10` | Bolt Golem | `creature_t10.png` |
| `creature_t11` | Reaper Shade | `creature_t11.png` |
| `creature_t12` | Haunt Lord | `creature_t12.png` |

Root-level PNGs are the load targets for `setTexture` / `load.image(slotId, packPath + slotId + '.png')`.
Duplicates under `creatures/` keep the folder tidy for atlas packing later.

## Night Gate UI stubs (additive)

| Key | Purpose |
| --- | --- |
| `yard_post` | Yard post / caste station |
| `gate_dusk` | Night Gate / dusk chrome |
| `prestige_trait_01` | Permanent hive-trait milestone A |
| `prestige_trait_02` | Permanent hive-trait milestone B |
| `icon_prestige` | Prestige button |

Also under `ui/`.

## Status

**Creatures** `t01`–`t12`: brutal generated icons (128×128). **`yard_post` / `gate_dusk`**: brutal generated icons (96×96 RGBA, transparent) — no longer stubs. Prestige icons may still be placeholders. Optional Winter/Scrapyard packs are extras only.

