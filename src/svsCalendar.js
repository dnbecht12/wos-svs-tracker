// ─── Shared SvS Calendar Utility ─────────────────────────────────────────────
// First SvS week starts Monday April 20, 2026
// Cycle: Prep1 (wk1) → KOI (wk2) → Prep3 (wk3) → SvS (wk4), repeating forever
// All day calculations use UTC so every user sees the same "day" boundary.

export const FIRST_SVS_MONDAY = new Date(Date.UTC(2026, 3, 20)); // Apr 20 2026 00:00 UTC

// Returns midnight UTC for today — use instead of new Date() for day math.
export function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function addDaysToDate(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

// Format Date object as MM/DD/YY using UTC date parts
export function fmtDate(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return "";
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dy = String(d.getUTCDate()).padStart(2, "0");
  const yr = String(d.getUTCFullYear()).slice(2);
  return `${mo}/${dy}/${yr}`;
}

// Format ISO string (YYYY-MM-DD) as MM/DD/YY
export function fmtIso(isoStr) {
  if (!isoStr) return "";
  const [y, m, d] = isoStr.split("-");
  if (!y || !m || !d) return "";
  return `${m}/${d}/${y.slice(2)}`;
}

// Convert Date to ISO string YYYY-MM-DD
export function toIso(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return "";
  return d.toISOString().slice(0, 10);
}

// Parse ISO string to Date (midnight UTC)
export function fromIso(isoStr) {
  if (!isoStr) return null;
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Given any date, find the Monday of that week (UTC day boundary)
export function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Returns the week index (0-based) from FIRST_SVS_MONDAY for a given date.
// Week 0 = first SvS week (Apr 20, 2026)
export function weeksSinceAnchor(date) {
  const d = getMondayOf(date);
  const ms = d - FIRST_SVS_MONDAY;
  return Math.floor(ms / (7 * 86400000));
}

// Given a week index from anchor, return { cyclePos, isSvS, isKOI, weekStart, weekEnd }
// cyclePos: 0=Prep1, 1=KOI, 2=Prep3, 3=SvS
export function getCycleInfo(weekIndex) {
  const cyclePos = ((weekIndex % 4) + 4) % 4;
  const isSvS = cyclePos === 3;
  const isKOI = cyclePos === 1;
  const weekStart = addDaysToDate(FIRST_SVS_MONDAY, weekIndex * 7);
  const weekEnd   = addDaysToDate(weekStart, 6);
  const cycleNum  = Math.floor(weekIndex / 4) + 1; // which SvS cycle (1-based)
  return { cyclePos, isSvS, isKOI, weekStart, weekEnd, cycleNum };
}

// Build an array of N upcoming cycles starting from a given cycle number
// Each cycle has 4 weeks. Returns array of cycles, each with 4 week objects.
export function buildCycles(startCycleNum, count = 12) {
  const cycles = [];
  for (let c = 0; c < count; c++) {
    const cn = startCycleNum + c; // 1-based cycle number
    // Week index of the first week of this cycle
    // Cycle 1 starts at weekIndex=0 (SvS), but SvS is week 4 of the cycle
    // Actually: cycle 1's Prep1 is weekIndex = -3 (before first SvS)
    // Simpler: SvS of cycle N is at weekIndex = (N-1)*4 + 3
    // So Prep1 of cycle N is at weekIndex = (N-1)*4 (which is -ve for cycle 1)
    // But FIRST_SVS_MONDAY is the SvS week itself (week 4), so:
    // SvS week of cycle N = weekIndex (N-1)*4
    // KOI of cycle N = weekIndex (N-1)*4 - 2
    // Prep1 of cycle N = weekIndex (N-1)*4 - 3
    // Prep3 of cycle N = weekIndex (N-1)*4 - 1
    // So week order is: Prep1(-3), KOI(-2), Prep3(-1), SvS(0) relative to each cycle's SvS
    const svsWeekIdx = (cn - 1) * 4;
    const weekIdxs = [svsWeekIdx - 3, svsWeekIdx - 2, svsWeekIdx - 1, svsWeekIdx];
    const weeks = weekIdxs.map((wi, wpos) => {
      const { weekStart, weekEnd, cyclePos } = getCycleInfo(wi);
      return {
        weekIndex: wi,
        weekInCycle: wpos + 1, // 1-4
        cyclePos,
        isSvS: wpos === 3,
        isKOI: wpos === 1,
        isPrep1: wpos === 0,
        isPrep3: wpos === 2,
        weekStart,
        weekEnd,
        cycleNum: cn,
      };
    });
    cycles.push({ cycleNum: cn, svsWeekStart: weeks[3].weekStart, weeks });
  }
  return cycles;
}

// Get the current cycle number (which SvS cycle are we in right now)
export function getCurrentCycleNum() {
  const today = todayUTC();
  const wIdx = weeksSinceAnchor(today);
  // FIRST_SVS_MONDAY is the SvS week of cycle 1 (weekIndex 0).
  // Each cycle is 4 weeks: prep1, KOI, prep3, SvS.
  // Cycle 1: wIdx -3 to 0. Cycle 2: wIdx 1 to 4. Etc.
  // Formula: floor((wIdx + 3) / 4) + 1
  const cn = Math.floor((wIdx + 3) / 4) + 1;
  return Math.max(1, cn);
}

// For a given cycle, return the RFC planner start date (Monday of Prep1 = 3 weeks before SvS)
export function getCycleStartDate(cycleNum) {
  const svsWeekIdx = (cycleNum - 1) * 4;
  const prep1WeekIdx = svsWeekIdx - 3;
  return addDaysToDate(FIRST_SVS_MONDAY, prep1WeekIdx * 7);
}

// Cycle label for dropdown
export function cycleLabelFull(cycleNum, cycles) {
  const cycle = cycles.find(c => c.cycleNum === cycleNum);
  if (!cycle) return `Cycle ${cycleNum}`;
  return `Cycle ${cycleNum} — SvS ${fmtDate(cycle.svsWeekStart)}`;
}
