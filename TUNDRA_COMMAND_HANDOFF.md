# Tundra Command — Project Handoff Document
*WoS SvS Planning Tracker · v3.0 · April 2026*

---

## 1. Project Overview

**Tundra Command** is a web app for Whiteout Survival (WoS) players to track stats, plan SvS (State vs State) events, manage inventory, and analyze power/military capacity. Built and maintained by a single developer (dnbecht12) who plays for alliance [NWA] on State 2713.

**Live URL:** https://tundracommand.com
**Vercel Project:** `wos-svs-tracker` (dnbecht12 account)
**DNS:** Registered on GoDaddy, nameservers delegated to Vercel (DNS managed entirely by Vercel)
**Admin UID:** `c5c3392e-2399-4cc9-b2ab-f22a61e7b91c`
**Admin Email:** deathwishwos@gmail.com

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5 (no TypeScript) |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS) |
| Hosting | Vercel (auto-deploy from GitHub `main` branch) |
| Auth | Email/password + Discord OAuth via Supabase |
| Fonts | Syne (headings), Space Mono (monospace/data) |
| Styling | Inline styles only — no CSS framework, no Tailwind |

**Dependencies (package.json):**
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@supabase/supabase-js": "^2.49.4"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.2"
  }
}
```

**Build commands:**
- Dev: `npm run dev`
- Build: `npm run build`
- Deploy: Push to `main` → Vercel auto-builds (~6 seconds)

---

## 3. Complete File Structure (22 files)

```
wos-svs-tracker/
├── index.html                    ← Entry HTML, inline SVG favicon
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx                  ← React entry point — NEVER MODIFIED
    ├── supabase.js               ← Supabase client config — NEVER MODIFIED
    ├── useAuth.js                ← Auth hook: login/signup/Discord/delete
    ├── GearData.js               ← Hero gear stats lookup tables — NEVER MODIFIED
    ├── svsCalendar.js            ← SvS calendar date math utilities — NEVER MODIFIED
    ├── useCharacters.js          ← Character management hook
    ├── useLocalStorage.js        ← Cloud sync hook + guest/session storage logic
    ├── SvsComplete.jsx           ← ⭐ NEW: Complete Upgrades modal + cost engine
    ├── App.jsx                   ← Shell, routing, auth, theme, nav, modals
    ├── AdminPanel.jsx            ← AdminPage, ReportIssueModal, ThreadView, messaging
    ├── CharacterProfile.jsx      ← CharacterProfilePage, power/military calculations
    ├── ChiefEquipment.jsx        ← ChiefGearPage, ChiefCharmsPage
    ├── ConstructionPlanner.jsx   ← Construction tab with own sync system
    ├── DaybreakIsland.jsx        ← DaybreakIslandPage — NEVER MODIFIED
    ├── Experts.jsx               ← Expert data, ExpertPowerDisplay, ExpertStatsSummary
    ├── Heroes.jsx                ← Hero data, HeroesPage, HeroGearPage (teams system)
    ├── Pets.jsx                  ← 14 pets, per-level stats/power, upgrade costs
    ├── RFCPlanner.jsx            ← RFC Planner tab — NEVER MODIFIED
    ├── ResearchCenter.jsx        ← RC data + page + exports
    ├── SvSCalendar.jsx           ← SvS Calendar tab — NEVER MODIFIED
    ├── TroopsPage.jsx            ← TroopsPage — NEVER MODIFIED
    └── WarAcademy.jsx            ← WA_RESEARCH data + WarAcademyPage
```

**Files marked NEVER MODIFIED** — do not include in zips unless specifically working on them.

---

## 4. ⚠️ CRITICAL FILE SOURCING RULES

These rules prevent regressions where accumulated fixes get silently overwritten.

### Within the same chat session:
**NEVER** run `cp /home/claude/wos-svs-tracker/.../File.jsx /home/claude/File.jsx` to get a "fresh" copy if a working file already exists in `/home/claude/`. This overwrites all fixes made earlier in the chat.

**Before editing any file, always check:**
```bash
ls /home/claude/*.jsx /home/claude/*.js
```
If the file exists there → **use it as the base**. Apply changes on top of it.
If it does NOT exist → copy from source, then apply changes.

### File priority order (highest to lowest):
1. `/home/claude/<File>.jsx` — working copies from **this chat session** (always preferred)
2. `/mnt/user-data/outputs/<File>.jsx` — last packaged output from a previous chat
3. `/mnt/user-data/uploads/` zip — **only** for files not modified in any prior session

### For new chats:
Upload the full `src/` zip. Claude will copy files to `/home/claude/` and work from there.

### Zips — only include changed files:
Only include files with actual changes in the output zip. Do not pad with unchanged files.

---

## 5. Supabase Configuration

**Project URL:** `https://ojoovofaiknswvcncmad.supabase.co`
**Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qb292b2ZhaWtuc3d2Y25jbWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTQyMjAsImV4cCI6MjA5MTIzMDIyMH0.Ul7gUnnK9qAj1CgwCgFS55FZiZDEz-vDCp9MMrPdkJY`

**Auth options (supabase.js):**
```js
auth: {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  storageKey: "sb-wos-auth",   // IMPORTANT: custom key, not default
}
```

### Database Tables

#### `profiles`
| Column | Type |
|--------|------|
| id | uuid (FK → auth.users) |
| display_name | text |

#### `characters`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text | In-game character name |
| state_number | int | |
| alliance | text | 3-char tag e.g. "NWA" |
| is_default | boolean | |
| inventory | jsonb | Snapshot inventory data |
| plan_snapshot | jsonb | RFC planner FC/RFC snapshot |

#### `user_data`
Key-value store for all synced user settings/progress.
| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid FK | |
| char_id | uuid FK | Per-character data isolation |
| key | text | |
| value | jsonb | |
| updated_at | timestamptz | |

**Unique constraint:** `(user_id, char_id, key)`
**RLS:** Users can only read/write their own rows.

**All synced keys:**
- `wa-levels`, `wa-speedbuff`, `wa-buffs`, `wa-dailyshards`
- `cg-slots`, `cc-slots`
- `cp-speedbuff`, `cp-vip-level`, `cp-purchased-queue`, `cp-nonfc-active`
- `hg-heroes`, `hg-hero-stats`, `hg-teams` ← teams system
- `rc-levels`, `rc-collapse`
- `troops-inventory-v2`
- `wos-svs-inventory`
- `wos-rfc-saved-plans`
- `pets-data`, `pets-gen-filter`
- `daybreak-buffs`, `daybreak-prosperity`
- `experts-data`
- `heroes-roster-added` ← premium hero opt-in
- `hg-gen-filter` ← hero gen filter (now synced, not in NO_SYNC_KEYS)

**Keys synced via `saveState` in ConstructionPlanner.jsx:**
- `cp-buildings`, `cp-buffs`, `cp-cycle`, `cp-dailyfc`, `cp-agnes`, `cp-nonfc-active`

**NO_SYNC_KEYS** (local UI prefs, not synced to Supabase):
- `wos-page`, `wos-theme`, `heroes-sort`

#### `user_messages`
User↔admin messaging (Contact the Tundra Commander).
| Column | Type | Notes |
|--------|------|-------|
| thread_id | uuid | Groups messages |
| user_id | uuid FK | |
| user_name | text | |
| contact_info | text | Optional |
| contact_type | text | email / discord / none |
| category | text | Bug Report / Feature Request / Question / Other |
| sender | text | "user" or "admin" |
| message | text | |
| wants_response | boolean | |
| read_by_admin | boolean | |
| read_by_user | boolean | |
| thread_closed | boolean | |
| created_at | timestamptz | |

**RLS:** INSERT WITH CHECK (true). Users read own threads, admin reads all.

**Realtime enabled on:** `user_messages`, `stat_submissions`, `issue_reports`, `issue_notifications`
Enable via: Supabase Dashboard → Database → Publications → `supabase_realtime` → toggle these tables ON (or run `ALTER PUBLICATION supabase_realtime ADD TABLE <table>;`)

#### `stat_submissions`, `hero_stats_data`, `issue_reports`, `issue_notifications`
— unchanged from v2.0, see previous handoff for schema.

---

## 6. Cloud Sync Architecture

**On login:** App.jsx bulk-fetches ALL `user_data` keys for the active character, writes to `localStorage`, fires `wos-user-ready`.

**Guest behavior:** `_isGuest = true` gates writes to `sessionStorage` instead of `localStorage`. On sign-out, all user data keys are cleared from localStorage via `useAuth.js` `signOut()`.

**`wos-user-ready`** — fires once at login (uses `{ once: true }` listener). Only use for initial load.
**`wos-char-ready`** — fires on every character switch and after `SvsComplete` accept. Use this to force all mounted hooks to re-read. **Do not use `wos-user-ready` to trigger post-action refreshes.**

**`SvsComplete.jsx`** reads from `_isGuest ? sessionStorage : localStorage` — matches the hook's write behavior so the modal finds data for both guests and logged-in users.

---

## 7. Navigation Structure

```
CHIEF
  Chief Profile      (char-profile)    → CharacterProfilePage
  Chief Gear         (chief-gear)      → ChiefGearPage
  Chief Charms       (chief-charms)    → ChiefCharmsPage
  Experts            (experts)         → ExpertsPage
  Pets               (pets)            → PetsPage
  Daybreak Island    (daybreak-island) → DaybreakIslandPage
  Inventory          (inventory)       → InventoryPage

COMBAT
  Heroes             (heroes)          → HeroesPage
  Hero Gear          (hero-gear)       → HeroGearPage (Teams system)
  Troops             (troops)          → TroopsPage

CONSTRUCTION & TECHNOLOGY
  Construction       (construction)    → ConstructionPlanner
  Research           (research-center) → ResearchCenterPage
  War Academy        (war-academy)     → WarAcademyPage

PLANNING
  RFC Planner        (rfc-planner)     → RFCPlanner
  SvS Calendar       (svs-calendar)    → SvSCalendar

ADMIN (admin UID only)
  Submissions        (admin)           → AdminPage
```

---

## 8. Feature Inventory

### Chief Profile (`CharacterProfile.jsx`)
- **Total Power** card + **⚔️ Complete Upgrades** button (scope: all tabs)
- **Power Breakdown**: Tech, Chief Gear, Charms, Hero, Hero Gear, Pet Power (live), Expert Power, Troops, Buildings
- **Buildings Power**: gated by `cp-nonfc-active` checkbox (non-FC buildings only count after user confirms they're at max level)
- **Military**: March Queue (1 + RC + VIP + purchased), Deployment, Rally, Reinforcement
- **Hero Gear Power**: skips slots where `status` is blank (no false power for new users)

### Non-FC Buildings Checkbox (`ConstructionPlanner.jsx`)
- `cp-nonfc-active` boolean stored in Supabase per character
- Once checked, checkbox disappears permanently for that character
- Guests: persists during session only (React state)
- `CharacterProfile.jsx` reads `cp-nonfc-active` from localStorage to include/exclude the 817,958 fixed power

### Experts (`Experts.jsx`)
- **Affinity** = resource for leveling (previously mislabeled "sigils")
- **Sigils** = resource for advancement (B-level only, e.g. level 10→11)
- **Relationship Level** = the bonus skill level section (previously "Affinity (Bonus) Level")
- Upgrade Summary shows: 🔐 Affinity needed (leveling) / 🔶 Sigils needed (advancement) / 📚 Books needed

### Pets (`Pets.jsx`)
- **Expert-style card grid** UI — click card to expand drawer
- **SSR-first ordering**: SSR → SR → R → N → C
- **Gen filter** persists via `useLocalStorage("pets-gen-filter", 7)`
- **⚔️ Complete Upgrades** button

### Hero Gear Teams System (`Heroes.jsx`)
- **Data key**: `hg-teams` (object: `{ activeTeam:"A", teams:{ A:[3 slots], B:[3 slots], ... } }`)
- **Migration**: on first load, old `hg-heroes` (6-slot flat array) auto-migrates → slots 0–2 become A-Team, slots 3–5 become B-Team (only if they have data)
- **Exports**: `defaultTeamsData()`, `migrateOldHeroes()` — imported by App.jsx
- **Teams**: A–F (max 6), Add Team button, Remove Team modal
- **Default gear status**: blank (`""`) — user must choose Mythic or Legendary. Existing data unaffected.
- **Premium heroes**: Jeronimo and Natalia marked `premium:true`, hidden from main roster by default. Collapsible "🔒 Premium / Purchasable Heroes" section at bottom with "Add to Roster" button.
- **`heroes-roster-added`**: localStorage key tracking which premium heroes user has added

### HeroesPage roster features
- Gen filter (`hg-gen-filter`) persists and syncs to Supabase
- Favorites (up to 6), sort by quality/type/gen/name
- Profile modal with gear stats

### Admin Panel (`AdminPanel.jsx`)
- Reviewed/closed stat submissions **collapsed by default** (`reviewedOpen: false`)
- Ended user message threads go to **📁 Archived / Ended** section — collapsed by default
- Reply box always available on open threads (removed `wants_response` gate)
- **Realtime notifications**: Supabase Realtime channels replace 30s polling
  - Admin: `admin-realtime` channel — instant badge update on new submissions/issues/messages
  - User: `user-realtime-{userId}` channel — instant red dot on new admin replies/notifications

### User Profile Modal
- **Messages tab**: active threads shown first; ended threads in collapsed `📁 Archived / Ended`
- **`UserArchivedMessages`** component in App.jsx handles the collapsed archive

### Complete Upgrades (`SvsComplete.jsx`) ⭐ NEW FILE
- **⚔️ Complete Upgrades** button on every tab + Chief Profile
- **Chief Profile button**: scope `"all"` — shows all tabs with goals
- **Individual tab buttons**: scope limited to that tab only
- **ⓘ info icon** next to each button with tooltip explaining the function
- **Modal**: column grid showing Field | Current | Goal | Achieved (editable)
- **Achieved column**: number inputs (clamped cur→goal), text dropdowns for status, checkboxes for booleans
- **Materials Consumed** section: shows materials that will be deducted on accept
- **On Accept**: writes achieved values back to storage, deducts materials from `wos-svs-inventory`, fires `wos-char-ready` for immediate UI refresh
- **Guest support**: reads from `sessionStorage` when `_isGuest === true`
- **Embedded cost tables**: CG_LEVELS, CC_LEVELS, EX_AFFINITY, EX_SKILL_BOOKS, PET_COSTS — no cross-module imports needed

**Construction scope**: reads `cp-buildings` and surfaces current vs goal FC levels per building.

**Note on WA/RC/Hero Gear costs**: These have complex cost structures that can't be embedded without the full data files. Modal shows 0 for these with a note to check the respective tab.

### Inventory Tab Navigation
- `ResInput` uses `tabIndex={-1}` + `data-tabseq={N}` to enable ordered Tab navigation
- Global capture handler (`{ capture: true }`) intercepts Tab before browser native handling
- `[data-tabseq]` selector navigates by ascending numeric order (1→56)
- Comma-formatted display restored: `type="text"` when unfocused (shows `1,234,567`), `type="number"` when focused (for editing)
- All tabIndex values are **unique** (1–56) across all inventory inputs — Raw Materials renumbered to 34–37, Stamina 38, Speedups 39–56

### Table Tab Navigation (all tabs)
- Global capture handler also intercepts Tab when focused element is inside a `<table>`
- Navigates by DOM order within the table — no tabIndex required
- Works across War Academy, Research Center, Hero Gear, Chief Gear, Chief Charms

---

## 9. Key Architectural Decisions

### No TypeScript
Plain JavaScript throughout.

### Inline styles only
`style={{...}}` everywhere. Global CSS as a single injected `<style>` tag.

### useLocalStorage hook
- `_isGuest` flag starts `true`, set to `false` when auth resolves
- Guests write to `sessionStorage`; logged-in users write to `localStorage` + Supabase
- `wos-user-ready` (once) fires at login for initial bulk-read
- `wos-char-ready` (persistent) fires on character switch and after Complete Upgrades accept

### hgTeams (Hero Gear Teams)
- Replaces old flat `hgHeroes` (6 slots) with `hgTeams` object
- App.jsx exports a `setHgHeroes` shim for backward compat with HeroesPage widget sync
- HeroGearPage receives `hgTeams`/`setHgTeams` props
- CharacterProfile receives flat `hgHeroes = Object.values(hgTeams.teams).flat()` for power calc

### ConstructionPlanner separate sync
Uses `useState` + `saveState()` (not `useLocalStorage`). Syncs via `supabase.auth.getSession()` directly.

### profileVersion counter
`CharacterProfilePage` reads most data from `localStorage` in `useMemo` hooks. `profileVersion` increments 1.5s after login. `rcLevels` passed as prop for immediate reactivity.

### SvsComplete reads storage directly
`buildChangeList()` reads from `_isGuest ? sessionStorage : localStorage` to match hook write behavior. `applyChanges()` writes to same store and calls `scheduleSync()` for cloud sync.

---

## 10. Known Issues & Pending Work

### ✅ Fixed This Session (v3.0)
- Experts: Affinity vs Sigils mislabeling corrected throughout
- Experts: "Affinity (Bonus) Level" renamed to "Relationship Level"
- Hero Gear: blank default status for new users (no false Mythic power)
- Hero Gear: `— Not Set —` option in gear status dropdowns
- Hero Gear: Teams system (A–F teams, Add/Remove Team, migration from old 6-slot)
- Hero Gear: Premium heroes (Jeronimo, Natalia) hidden by default with opt-in
- Hero Gear Power: skips blank-status slots in CharacterProfile calc (no 6M+ false power)
- Chief Profile: ⚔️ Complete Upgrades button (all-scope)
- All tabs: ⚔️ Complete Upgrades button with ⓘ tooltip
- All tabs: Complete Upgrades deducts materials from inventory on accept
- All tabs: Complete Upgrades fires `wos-char-ready` for immediate UI refresh
- Non-FC buildings: checkbox opt-in (confirmed max level → adds 817,958 power)
- Buildings: `cp-nonfc-active` gating in CharacterProfile
- Pets: Expert-style card grid UI
- Pets: SSR-first ordering
- Pets: Gen filter now persists via useLocalStorage
- Admin: Reviewed submissions collapsed by default
- Admin: Ended threads in collapsed Archived section
- Admin: Reply box always available on open threads
- Admin/User: Supabase Realtime notifications (instant, replaces 30s polling)
- Guest data: all data cleared on sign-out (useAuth.js `signOut()` clears localStorage)
- Guest data: data shows blank on return visit (sessionStorage cleared on browser close)
- Inventory: Tab key navigation (data-tabseq, capture listener, unique indices 1–56)
- Inventory: Comma-formatted display restored after type=number regression
- Tables: Tab key navigation via global capture handler (DOM order within `<table>`)

### ⚠️ Known Limitations
- **WA/RC/Hero Gear costs in Complete Upgrades**: shown as 0 (complex data structures not embedded). Users should check those tabs for material costs.
- **`issue_tracking_patch.sql`**: adds `updated_at` column to `issue_reports`. May not have been run.
- **Per-level pet food costs**: wiki has individual level costs; currently only tier-milestone totals in `PET_COSTS`.
- **Abyssal Shelldragon** (15th pet, Gen 8 SSR): not yet released, excluded.

### 📋 Pending / Requested Features
- Training Speed stat in Chief Profile Military section (RC data exists)
- Expert Power sub-component breakdown in Chief Profile
- Submissions/Issues tab: last-status-change date (requires `updated_at` SQL patch)
- Analytics (Plausible) — add `<script>` to `index.html`
- Guest ads / logged-in no ads (AdSense conditional on `!user` in App.jsx)

---

## 11. VIP March Queue Reference

| VIP Level | March Queue Bonus |
|-----------|------------------|
| 1–5 | 0 |
| 6–12 | +1 |

Stored as `VIP_MARCH_QUEUE = [0,0,0,0,0,0,1,1,1,1,1,1,1]` in CharacterProfile.jsx.

March Queue sources: 1 base + 3 RC (Command Tactics I/II/III) + 1 VIP 6+ + 1 purchased pack = max 6.

---

## 12. Pets Data Reference

**Quality → stat/power table mapping:**
- `"C"` → Cave Hyena (max Lv 50)
- `"N"` → Arctic Wolf, Musk Ox (max Lv 60)
- `"R"` → Giant Tapir, Titan Roc (max Lv 70)
- `"SR"` → Giant Elk, Snow Leopard (max Lv 80)
- `"SSR"` → Cave Lion, Snow Ape, Iron Rhino, Sabertooth Tiger, Mammoth, Frost Gorilla, Frostscale Chameleon (max Lv 100)

**Display order in Pets page:** SSR → SR → R → N → C (SSR first)

**Key example (SSR):**
```
lv80 = 1,728,000 power / 24.00% A/D
"80a" = 1,875,600 power / 26.05% A/D (post-advance)
lv100 = 2,265,120 / 31.46%
"100a" = 2,413,440 / 33.52%
```

---

## 13. Deployment Process

1. Edit files locally (or generate in Claude chat)
2. Copy updated files into the local repo at the correct paths
3. `git add . && git commit -m "description" && git push origin main`
4. Vercel auto-builds in ~6 seconds
5. Visit tundracommand.com (hard refresh: Ctrl+Shift+R if needed)

**Note on GoDaddy:** DNS is managed entirely by Vercel. Do not touch GoDaddy nameservers.

---

## 14. How to Continue Development in a New Chat

**Step 1:** Start a new chat

**Step 2:** Upload the complete `src/` zip (all 22 files including `SvsComplete.jsx`)

**Step 3:** The project file `TUNDRA_COMMAND_HANDOFF.md` will be auto-loaded from the project

**Step 4:** State your task clearly

**Template for first message:**
```
I'm continuing development on Tundra Command (tundracommand.com),
a WoS SvS planning tracker. I'm [NWA] Deathwish, State 2713, admin UID:
c5c3392e-2399-4cc9-b2ab-f22a61e7b91c. See the handoff doc for full
architecture. Today I want to: [YOUR TASK HERE]
```

**Output format:** Always request a downloadable zip of **changed files only**.

**CRITICAL — File sourcing within a chat:**
Before copying any file from the uploaded zip, check `ls /home/claude/*.jsx /home/claude/*.js`.
If the file exists in `/home/claude/`, **use that version** — it has all session fixes applied.
Never overwrite `/home/claude/` working copies with source copies mid-session.

---

## 15. SQL Scripts Reference

| File | Purpose | Status |
|------|---------|--------|
| `issue_tracking_setup.sql` | Creates `issue_reports` + `issue_notifications` with RLS | Run once |
| `issue_tracking_patch.sql` | Adds `updated_at` column + trigger to `issue_reports` | May still need to run |

Run in Supabase Dashboard → SQL Editor.

**Realtime setup** (run once if not done):
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE user_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE stat_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE issue_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE issue_notifications;
```

---

## 16. Daily Backup (GitHub Actions)

- `.github/workflows/daily-backup.yml` — runs at 4am UTC daily
- `scripts/backup.js` — fetches all Supabase tables via service role key
- Requires GitHub secrets: `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Admin panel Data Export tab provides manual per-character JSON export/restore

---

*Generated April 2026 · Tundra Command v3.0*
