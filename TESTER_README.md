# Haunt Merge — Web Tester Build

**No paywalls.** This is a free static web build for Tyler’s playtesters.  
Open on phone or desktop. Needs network once (Phaser CDN).

---

## How to open

### Live from this box (local)

```bash
cd /workspace/haunt-merge
./serve-tester.sh          # or: python3 -m http.server 8080
# visit http://127.0.0.1:8080/
```

### Zip (if you need hosting)

Static package: `/workspace/haunt-merge-tester/haunt-merge-web-tester.zip`  
Unzip → serve the folder with any static host (`python3 -m http.server`, Netlify Drop, Surge, GitHub Pages, etc.).  
Do **not** open `index.html` as a `file://` URL if the CDN/assets fail — use a real HTTP server.

---

## How to play (quick)

| Action | How |
|--------|-----|
| **Merge** | Drag a free-board creature onto another of the **same tier**. |
| **Auto-merge** | Tier 3+ auto-merge periodically (no adjacency). T1–T2 = manual only. |
| **Assign** | Drag a creature onto an unlocked **Yard A** (bottom) or **Yard B** (right strip) post. |
| **Spawn** | Tap **Spawn** (free cooldown ~10s; shorter with M02/HT06). |
| **Scrap** | Earned mainly from assigned posts (Yard B ×1.5 income). |
| **Dusk / Gate** | Pressure rises; when defense < pressure, Gate HP drains. At 0 → Ritual prestige. |
| **Prestige** | Confirm ritual → PP + reset run board/posts/scrap/dusk. |
| **Spend PP** | Tap HUD **PP badge** (or Ritual panel) for M01/M02 + HT01–HT06. |
| **Save / Reset** | HUD buttons. Autosave ~5s. Reset wipes prestige too. |

Portrait canvas **390×700**, FIT-scaled — best on phone portrait.

---

## What’s in this build

- Milestone **1.5+**: Yard A soft-unlock, Yard B region + soft posts, dusk Gate, thin prestige, PP spend (Hive & Milestones).
- Haunt art pack (`assets/packs/haunt/`) — creatures T1–T12, posts, Gate, prestige icons.
- Save key `haunt-merge-w1-v2` (schema v6) in `localStorage`.

---

## Monetization / paywalls

**None live.**

| Item | Status |
|------|--------|
| RV hooks (`economy/rv_hooks.csv`) | Design stubs only — **LOCKED**, not in JS UI |
| IAP stubs (`economy/iap_stubs.csv`) | Design stubs only — **LOCKED**, not in JS UI |
| Paid spawn | Deferred — free spawn only |
| Ads / Remove Ads / Watch Ad UI | **Absent** |

In-game **PP buys** (milestones / hive traits) use prestige points, not real money.

---

## Known limitations

- No public tunnel from this sandbox right now (outbound reverse-tunnel ports blocked). Host the zip or serve locally.
- Offline scrap claim not implemented (M01/HT05 show stub offline-cap hours only).
- Phaser loads from jsDelivr CDN — needs first-load network.
- Account-less Cloudflare/localtunnel/ngrok/bore attempts from this box failed; use external hosting for shareable links.
- Economy numbers are **hold** — please don’t ask for retunes in this pass.

---

## Feedback asks (please note)

1. **Gate timing** — Does dusk feel fair vs posts defense? Too fast / too slow / OK?
2. **Yard B unlock** — Clear when it opens? Threshold feel (`maxTier ≥ 4` OR `lifetimeScrap ≥ 3000`)?
3. **Posts worth assigning** — Is parking creatures on posts rewarding vs leaving them on the free board?
4. **Creature / yard readability on phone** — Icons, Yard A vs B, locked posts, Gate — readable in portrait?

Send short notes + device (iOS/Android/desktop) + approx play time.

---

## Restart server (box)

```bash
cd /workspace/haunt-merge
./serve-tester.sh
# Port: 8080
# Log: .tunnel/http.log
```
