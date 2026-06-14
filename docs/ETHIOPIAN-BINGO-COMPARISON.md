# TEBIB-Bingo vs Ethiopian bingo platforms — comparison

This compares **TEBIB-Bingo** (your offline desktop agent tool) with popular **online/mobile** bingo products used in Ethiopia.

---

## Summary

| | **TEBIB-Bingo** | **Typical Ethiopian online bingo** (Bingo 10:20, Ade Bingo, City Bingo, King Bingo) |
|---|----------------|-------------------------------------------------------------------------------------|
| **Type** | Offline Windows desktop for **agents/operators** | Online/mobile apps for **players** |
| **Internet** | Not required | Required |
| **Who runs the game** | Local agent on their PC | Platform server |
| **Payments** | Agent wallet + admin recharge (offline) | Telebirr, CBE Birr, M-Pesa, etc. |
| **Amharic voice** | Built-in offline audio (balls 1–75) | Often Amharic + English in app |
| **Commission** | **Agent sets % per game** | Platform takes fee; agent cut varies |
| **Cards** | Agent creates/manages locally | Platform-generated digital cards |
| **Best for** | Shop/hall agents, offline halls | Individual players on phones |

TEBIB-Bingo is **not a competitor** to Bingo 10:20 — it is the **operator console** an agent would use in a physical bingo hall, similar to how a POS system differs from a customer shopping app.

---

## Feature comparison

### Game mechanics

| Feature | TEBIB-Bingo | Bingo 10:20 | Ade / City Bingo | King Bingo |
|---------|-------------|-------------|------------------|------------|
| Ball range (called) | **1–75** (standard B-I-N-G-O columns) | Varies (often 75–90) | Platform-defined | Platform-defined |
| Cartella (card numbers) | **1–150** | Platform-defined | Platform-defined | Platform-defined |
| Live caller voice | **Amharic + English** | Amharic, English, Tigrigna | Amharic UI | Amharic UI |
| Auto-draw timer | Yes (1–10 sec) | Yes | Yes | Yes |
| Winning patterns | Line, 2 lines, corners, X, full house | Multiple modes | Multiple | Multiple |
| BINGO claim check | **Pause + card validation** | Auto / platform | Platform | Platform |
| Draw counter | **e.g. 42/75** | Yes | Yes | Yes |

### Agent / operator tools

| Feature | TEBIB-Bingo | Online platforms |
|---------|-------------|------------------|
| Multi-agent accounts | **Admin creates agents** | N/A (players only) |
| Agent wallet | **Yes** | Player wallet on platform |
| **Commission % per game** | **Agent sets before each game** | Fixed platform fee |
| Card management | **Create/print cards locally** | Digital cards in app |
| Reports | Per-agent games, profit | Player history in app |
| Offline operation | **Full offline** | Needs connection |

### Language & voice

| Feature | TEBIB-Bingo | Others |
|---------|-------------|--------|
| Amharic UI | Partial (key labels) | Full Amharic common |
| Amharic number calling | **Bundled MP3, no install** | TTS or recorded in app |
| English calling | Windows / browser TTS | Usually included |

### Distribution

| Feature | TEBIB-Bingo | Online platforms |
|---------|-------------|------------------|
| Install | **Single .exe installer** | APK / Telegram bot / website |
| Updates | Manual reinstall | Auto-update in app |
| Data ownership | **SQLite on agent PC** | Platform servers |

---

## What TEBIB-Bingo does better (for hall agents)

1. **Works with no internet** — important when connectivity is poor
2. **Agent controls commission** each game — flexible earnings
3. **Offline Amharic voice** — no speech pack or espeak setup
4. **75-ball calling + 150 cartella** — matches common Ethiopian hall rules
5. **Admin + multi-agent** — one admin PC manages many agents
6. **Local data** — games and money stay on the operator’s machine

---

## What online platforms do better (for players)

1. **Telebirr / mobile money** built in
2. **Thousands of concurrent players** nationwide
3. **Telegram / phone registration** — no desktop install
4. **Polished consumer UI** and marketing
5. **Jackpots and promotions** (10,000+ ETB prizes advertised)

---

## Gaps in TEBIB-Bingo vs market expectations

| Gap | Priority | Notes |
|-----|----------|-------|
| Telebirr / CBE integration | Medium | Online apps lead here; offline uses vouchers/admin recharge |
| Full Amharic UI everywhere | Medium | Game board and voice are strong; some admin screens English |
| Card printing | High | Many halls still use paper cards |
| Code-signed installer | High | Reduces SmartScreen warnings |
| Auto-update | Low | Manual `.exe` for now |
| Socket.IO live sync | Low | Single-machine agent use case first |

---

## Recommendation

**TEBIB-Bingo** fits **physical bingo agents** who call numbers in a shop or hall and need:

- Reliable Amharic voice
- Commission control per round
- Wallet and reporting without internet

**Online apps** (Bingo 10:20, Ade Bingo, etc.) fit **players** betting from phones.

For your rollout: build the installer (`npm run pack:win`), give agents the `.exe`, and train them on **Commission %** + **Language Amharic** before each game.

---

## Sources (public websites, June 2025)

- [Bingo 10:20](https://bingo1020.com/) — Amharic/English/Tigrigna, mobile APK
- [Ade Bingo](https://adebingobot.com/) — Telegram, Telebirr, real-time rooms
- [City Bingo](http://citybingobot.com/) — similar to Ade Bingo
- [King Bingo](http://kingbingogame.com/) — Amharic onboarding, daily prizes
