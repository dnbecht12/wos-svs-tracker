import React from "react";
import { useLocalStorage } from "./useLocalStorage.js";

// ─── COLORS ───────────────────────────────────────────────────────────────────
const COLORS = {
  bg:"var(--c-bg)", surface:"var(--c-surface)", card:"var(--c-card)",
  border:"var(--c-border)", borderHi:"var(--c-borderHi)",
  textPri:"var(--c-textPri)", textSec:"var(--c-textSec)", textDim:"var(--c-textDim)",
  accent:"var(--c-accent)", accentBg:"var(--c-accentBg)", accentDim:"var(--c-accentDim)",
  green:"var(--c-green)", greenBg:"var(--c-greenBg)", greenDim:"var(--c-greenDim)",
  blue:"var(--c-blue)", blueBg:"var(--c-blueBg)", blueDim:"var(--c-blueDim)",
  amber:"var(--c-amber)", amberBg:"var(--c-amberBg)", amberDim:"var(--c-amberDim)",
  red:"var(--c-red)", redBg:"var(--c-redBg)", redDim:"var(--c-redDim)",
};

const fmt = n => {
  if (!n) return "—";
  if (n >= 1000000) return (n/1000000).toFixed(1)+"M";
  if (n >= 1000) return (n/1000).toFixed(1)+"K";
  return n.toLocaleString();
};

// ─── Pet Roster ──────────────────────────────────────────────────────────────
const PETS = [
  { name:"Cave Hyena",           gen:1, quality:"C",   maxLevel:50,  skillName:"Builder's Aid",    skillEffect:"Increases construction speed by 15% for 5 min", skillType:"development", cooldown:"23h" },
  { name:"Arctic Wolf",          gen:1, quality:"N",   maxLevel:60,  skillName:"Arctic Embrace",   skillEffect:"Instantly restores 60 Chief Stamina", skillType:"development", cooldown:"23h" },
  { name:"Musk Ox",              gen:1, quality:"N",   maxLevel:60,  skillName:"Burden Bearer",    skillEffect:"Instantly completes gathering from one resource tile", skillType:"development", cooldown:"15h" },
  { name:"Giant Tapir",          gen:2, quality:"R",   maxLevel:70,  skillName:"Natural Intuition",skillEffect:"Provides 500 Pet Food when activated", skillType:"development", cooldown:"23h" },
  { name:"Titan Roc",            gen:2, quality:"R",   maxLevel:70,  skillName:"Armor Rift",       skillEffect:"Reduces enemy Troops' Health by 5% for 2h", skillType:"combat", cooldown:"20h" },
  { name:"Giant Elk",            gen:3, quality:"SR",  maxLevel:80,  skillName:"Mystical Finding", skillEffect:"Unearths a random lost item on the Tundra", skillType:"development", cooldown:"23h" },
  { name:"Snow Leopard",         gen:3, quality:"SR",  maxLevel:80,  skillName:"Lightning Raid",   skillEffect:"Increases March Speed +30% and reduces enemy Troop Lethality by 5% for 2h", skillType:"combat", cooldown:"20h" },
  { name:"Cave Lion",            gen:4, quality:"SSR", maxLevel:100, skillName:"Feral Anthem",     skillEffect:"Increases all Troops' Attack by 10% for 2h", skillType:"combat", cooldown:"20h" },
  { name:"Snow Ape",             gen:4, quality:"SSR", maxLevel:100, skillName:"Tumbling Power",   skillEffect:"Increases Squad Capacity by 15,000 for 2h", skillType:"combat", cooldown:"20h" },
  { name:"Iron Rhino",           gen:5, quality:"SSR", maxLevel:100, skillName:"Rallying Beast",   skillEffect:"Increases Rally Capacity by 150,000 for 2h", skillType:"combat", cooldown:"20h" },
  { name:"Sabertooth Tiger",     gen:5, quality:"SSR", maxLevel:100, skillName:"Apex Assault",     skillEffect:"Increases Troops' Lethality by 10% for 2h", skillType:"combat", cooldown:"20h" },
  { name:"Mammoth",              gen:6, quality:"SSR", maxLevel:100, skillName:"Hardened Skin",    skillEffect:"Increases Troops' Defense by 10% for 2h", skillType:"combat", cooldown:"20h" },
  { name:"Frost Gorilla",        gen:6, quality:"SSR", maxLevel:100, skillName:"Earthbound Vigor", skillEffect:"Increases Troops' Health by 10% for 2h", skillType:"combat", cooldown:"20h" },
  { name:"Frostscale Chameleon", gen:7, quality:"SSR", maxLevel:100, skillName:"Icy Shroud",       skillEffect:"Reduces enemy Troops' Defense by 10% for 2h", skillType:"combat", cooldown:"20h" },
];

// ─── Upgrade Cost Data ────────────────────────────────────────────────────────
// Level rows: integer = pet food to reach that tier; ".1" = advance costs (manual/potion/serum/svs)
// Each quality group shares the same cost table
// C = Cave Hyena | N = Arctic Wolf/Musk Ox | R = Giant Tapir/Titan Roc
// SR = Giant Elk/Snow Leopard | SSR = all SSR pets

const PET_COSTS = {
  "C": {
    10:{"food":1715}, "10.1":{"manual":15,"svs":500},
    20:{"food":3180}, "20.1":{"manual":30,"svs":1000},
    30:{"food":5010}, "30.1":{"manual":45,"potion":10,"svs":2000},
    40:{"food":7660}, "40.1":{"manual":60,"potion":20,"svs":3000},
    50:{"food":11310},"50.1":{"manual":90,"potion":30,"serum":10,"svs":4500},
  },
  "N": {
    10:{"food":2530}, "10.1":{"manual":20,"svs":500},
    20:{"food":5360}, "20.1":{"manual":40,"svs":1000},
    30:{"food":9020}, "30.1":{"manual":60,"potion":10,"svs":2000},
    40:{"food":14320},"40.1":{"manual":90,"potion":20,"svs":3000},
    50:{"food":21620},"50.1":{"manual":130,"potion":30,"serum":10,"svs":4500},
    60:{"food":30920},"60.1":{"manual":175,"potion":50,"serum":20,"svs":6750},
  },
  "R": {
    10:{"food":3795}, "10.1":{"manual":25,"svs":500},
    20:{"food":8040}, "20.1":{"manual":50,"svs":1000},
    30:{"food":13530},"30.1":{"manual":75,"potion":10,"svs":2000},
    40:{"food":21480},"40.1":{"manual":100,"potion":20,"svs":3000},
    50:{"food":32430},"50.1":{"manual":155,"potion":30,"serum":10,"svs":4500},
    60:{"food":46380},"60.1":{"manual":200,"potion":50,"serum":20,"svs":6750},
    70:{"food":63300},"70.1":{"manual":255,"potion":80,"serum":40,"svs":10000},
  },
  "SR": {
    10:{"food":5060}, "10.1":{"manual":30,"svs":500},
    20:{"food":10720},"20.1":{"manual":60,"svs":1000},
    30:{"food":18040},"30.1":{"manual":95,"potion":10,"svs":2000},
    40:{"food":28640},"40.1":{"manual":125,"potion":20,"svs":3000},
    50:{"food":43240},"50.1":{"manual":190,"potion":30,"serum":10,"svs":4500},
    60:{"food":61840},"60.1":{"manual":250,"potion":50,"serum":20,"svs":6750},
    70:{"food":84400},"70.1":{"manual":310,"potion":80,"serum":40,"svs":10000},
    80:{"food":108480},"80.1":{"manual":380,"potion":100,"serum":60,"svs":12000},
  },
  "SSR": {
    10:{"food":6325}, "10.1":{"manual":35,"svs":500},
    20:{"food":13400},"20.1":{"manual":70,"svs":1000},
    30:{"food":22550},"30.1":{"manual":110,"potion":15,"svs":2000},
    40:{"food":35800},"40.1":{"manual":145,"potion":35,"svs":3000},
    50:{"food":54050},"50.1":{"manual":220,"potion":50,"serum":10,"svs":4500},
    60:{"food":77300},"60.1":{"manual":290,"potion":65,"serum":20,"svs":6750},
    70:{"food":105500},"70.1":{"manual":365,"potion":85,"serum":40,"svs":10000},
    80:{"food":135600},"80.1":{"manual":440,"potion":100,"serum":60,"svs":12000},
    90:{"food":172000},"90.1":{"manual":585,"potion":115,"serum":80,"svs":14500},
    100:{"food":212100},"100.1":{"manual":730,"potion":135,"serum":100,"svs":17500},
  },
};

// ─── Calculate upgrade costs from cur → goal ─────────────────────────────────
function calcPetCosts(quality, curLevel, curAdvanced, goalLevel, goalAdvanced) {
  const costs = PET_COSTS[quality];
  if (!costs) return { food:0, manual:0, potion:0, serum:0, svs:0 };

  let food=0, manual=0, potion=0, serum=0, svs=0;
  const allLevels = Object.keys(costs).sort((a,b) => parseFloat(a)-parseFloat(b));

  for (const key of allLevels) {
    const lv = parseFloat(key);
    const isAdv = key.includes(".");

    // Determine if this row is needed
    const rowLevel = isAdv ? Math.floor(lv) : lv;
    const rowIsAdv = isAdv;

    // Convert current position to a comparable float
    const curPos = curLevel + (curAdvanced ? 0.1 : 0);
    const goalPos = goalLevel + (goalAdvanced ? 0.1 : 0);

    if (lv <= curPos) continue;  // already past
    if (lv > goalPos) continue;  // beyond goal

    const c = costs[key];
    if (c.food)   food   += c.food;
    if (c.manual) manual += c.manual;
    if (c.potion) potion += c.potion;
    if (c.serum)  serum  += c.serum;
    if (c.svs)    svs    += c.svs;
  }
  return { food, manual, potion, serum, svs };
}

// ─── Level options for a pet ──────────────────────────────────────────────────
function getLevelOptions(quality, maxLevel) {
  const costs = PET_COSTS[quality] || {};
  const opts = [0];
  for (let lv = 10; lv <= maxLevel; lv += 10) {
    opts.push(lv);
  }
  return opts;
}

// ─── Quality color ────────────────────────────────────────────────────────────
function qualityColor(q) {
  return { C:"#9E9E9E", N:"#4CAF50", R:"#2196F3", SR:"#9C27B0", SSR:"#FF9800" }[q] || "#888";
}
function qualityLabel(q) {
  return { C:"Common", N:"Uncommon", R:"Rare", SR:"Super Rare", SSR:"SSR" }[q] || q;
}

// ─── Default pet state ────────────────────────────────────────────────────────
function defaultPetState() {
  return {
    level:      0,
    advanced:   false, // has the pet been Advanced beyond its current level tier
    goalLevel:  0,
    goalAdv:    false,
    // Refinement sub-stats (user-entered from Beast Cage)
    infLeth:    0, infHp:    0,
    lancLeth:   0, lancHp:   0,
    markLeth:   0, markHp:   0,
  };
}

// ─── Pet Drawer ───────────────────────────────────────────────────────────────
const PetDrawer = React.memo(function PetDrawer({ pet, data, onChange, inv }) {
  const C = COLORS;
  const d = data || defaultPetState();
  const costs = calcPetCosts(pet.quality, d.level, d.advanced, d.goalLevel, d.goalAdv);
  const levelOpts = getLevelOptions(pet.quality, pet.maxLevel);
  const qColor = qualityColor(pet.quality);
  const hasAdv = d.level > 0 && d.level < pet.maxLevel;

  // Check if goal > current to show cost summary
  const hasCost = costs.food > 0 || costs.manual > 0 || costs.potion > 0 || costs.serum > 0;

  const inp = {
    background:"transparent", border:`1px solid ${C.border}`, borderRadius:5,
    color:C.textPri, padding:"3px 6px", fontSize:12,
    fontFamily:"'Space Mono',monospace", outline:"none", width:70, textAlign:"center",
  };
  const sel = {
    ...inp, cursor:"pointer", width:80,
  };
  const pctInp = {
    ...inp, width:60,
  };

  return (
    <div style={{ border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden",
      marginBottom:10 }}>

      {/* Header */}
      <div style={{ padding:"12px 16px", background:C.surface,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:10, fontWeight:800, padding:"2px 8px",
            borderRadius:4, background:qColor+"22", color:qColor,
            border:`1px solid ${qColor}44`, fontFamily:"'Space Mono',monospace" }}>
            {qualityLabel(pet.quality)}
          </span>
          <span style={{ fontSize:14, fontWeight:700, color:C.textPri }}>
            {pet.name}
          </span>
          <span style={{ fontSize:10, color:C.textDim,
            fontFamily:"'Space Mono',monospace" }}>
            Gen {pet.gen} · Max Lv {pet.maxLevel}
          </span>
        </div>

        {/* Current / Goal level pickers */}
        <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          {/* Current */}
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:10, color:C.textDim,
              fontFamily:"'Space Mono',monospace", textTransform:"uppercase",
              letterSpacing:"1px" }}>Current</span>
            <select value={d.level}
              onChange={e => onChange({ level: Number(e.target.value), advanced: false })}
              style={sel}>
              {levelOpts.map(v => (
                <option key={v} value={v}>{v === 0 ? "Not Tamed" : v}</option>
              ))}
            </select>
            {/* Advanced toggle */}
            {d.level > 0 && d.level < pet.maxLevel && (
              <label style={{ display:"flex", alignItems:"center", gap:5,
                cursor:"pointer", fontSize:11, color:C.textSec }}>
                <input type="checkbox" checked={d.advanced}
                  onChange={e => onChange({ advanced: e.target.checked })}
                  style={{ accentColor:C.accent, cursor:"pointer" }} />
                Advanced
              </label>
            )}
          </div>

          {/* Goal */}
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:10, color:C.textDim,
              fontFamily:"'Space Mono',monospace", textTransform:"uppercase",
              letterSpacing:"1px" }}>Goal</span>
            {d.level >= pet.maxLevel && d.advanced ? (
              <span style={{ fontSize:10, fontWeight:800, color:C.green,
                fontFamily:"'Space Mono',monospace", background:C.green+"22",
                border:`1px solid ${C.green}44`, padding:"2px 8px",
                borderRadius:4 }}>MAX</span>
            ) : (
              <>
                <select value={d.goalLevel}
                  onChange={e => onChange({ goalLevel: Number(e.target.value), goalAdv: false })}
                  style={sel}>
                  {levelOpts.filter(v => v >= d.level).map(v => (
                    <option key={v} value={v}>{v === 0 ? "—" : v}</option>
                  ))}
                </select>
                {d.goalLevel > 0 && d.goalLevel < pet.maxLevel && (
                  <label style={{ display:"flex", alignItems:"center", gap:5,
                    cursor:"pointer", fontSize:11, color:C.textSec }}>
                    <input type="checkbox" checked={d.goalAdv}
                      onChange={e => onChange({ goalAdv: e.target.checked })}
                      style={{ accentColor:C.accent, cursor:"pointer" }} />
                    Advanced
                  </label>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cost summary */}
      {hasCost && (
        <div style={{ padding:"8px 16px", background:C.card,
          borderBottom:`1px solid ${C.border}`,
          display:"flex", gap:16, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontSize:10, fontWeight:700, color:C.textDim,
            fontFamily:"'Space Mono',monospace", textTransform:"uppercase",
            letterSpacing:"1px" }}>Cost to Goal</span>
          {[
            ["Pet Food", costs.food, C.green],
            ["Manuals",  costs.manual, C.blue],
            ["Potions",  costs.potion, C.amber],
            ["Serum",    costs.serum,  C.red],
            ["SVS Pts",  costs.svs,    C.accent],
          ].map(([label, val, color]) => val > 0 && (
            <div key={label} style={{ display:"flex", flexDirection:"column",
              alignItems:"center" }}>
              <span style={{ fontSize:9, color:C.textDim,
                fontFamily:"'Space Mono',monospace" }}>{label}</span>
              <span style={{ fontSize:13, fontWeight:700, color,
                fontFamily:"'Space Mono',monospace" }}>{fmt(val)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats + Skill row */}
      <div style={{ display:"flex", gap:0, flexWrap:"wrap" }}>

        {/* Refinement sub-stats */}
        <div style={{ flex:1, minWidth:280, padding:"12px 16px",
          borderRight:`1px solid ${C.border}` }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.textDim,
            fontFamily:"'Space Mono',monospace", textTransform:"uppercase",
            letterSpacing:"1px", marginBottom:8 }}>
            Refinement Stats (from Beast Cage)
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
            gap:8 }}>
            {[
              ["Infantry",  "infLeth",  "infHp"],
              ["Lancer",    "lancLeth", "lancHp"],
              ["Marksman",  "markLeth", "markHp"],
            ].map(([troopLabel, lethKey, hpKey]) => (
              <div key={troopLabel}>
                <div style={{ fontSize:10, fontWeight:700, color:C.textSec,
                  marginBottom:4 }}>{troopLabel}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <label style={{ fontSize:10, color:C.textDim,
                    fontFamily:"'Space Mono',monospace" }}>
                    Lethality %
                    <input type="number" step="0.01" min={0}
                      value={d[lethKey] || ""}
                      onChange={e => onChange({ [lethKey]: parseFloat(e.target.value)||0 })}
                      placeholder="0.00"
                      style={{ ...pctInp, display:"block", marginTop:2, width:"100%" }} />
                  </label>
                  <label style={{ fontSize:10, color:C.textDim,
                    fontFamily:"'Space Mono',monospace" }}>
                    Health %
                    <input type="number" step="0.01" min={0}
                      value={d[hpKey] || ""}
                      onChange={e => onChange({ [hpKey]: parseFloat(e.target.value)||0 })}
                      placeholder="0.00"
                      style={{ ...pctInp, display:"block", marginTop:2, width:"100%" }} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pet Skill */}
        <div style={{ flex:1, minWidth:220, padding:"12px 16px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.textDim,
            fontFamily:"'Space Mono',monospace", textTransform:"uppercase",
            letterSpacing:"1px", marginBottom:8 }}>
            Pet Skill
          </div>
          <div style={{ padding:"10px 12px", background:C.surface,
            borderRadius:8, border:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:12, fontWeight:700, color:C.accent }}>
                {pet.skillName}
              </span>
              <span style={{ fontSize:9, padding:"1px 6px", borderRadius:10,
                fontFamily:"'Space Mono',monospace", fontWeight:700,
                background: pet.skillType === "combat" ? C.red+"22" : C.blue+"22",
                color: pet.skillType === "combat" ? C.red : C.blue,
                border:`1px solid ${pet.skillType === "combat" ? C.red+"44" : C.blue+"44"}` }}>
                {pet.skillType === "combat" ? "COMBAT" : "UTILITY"}
              </span>
            </div>
            <div style={{ fontSize:12, color:C.textSec, lineHeight:1.6 }}>
              {pet.skillEffect}
            </div>
            <div style={{ fontSize:10, color:C.textDim, marginTop:6,
              fontFamily:"'Space Mono',monospace" }}>
              2h duration · {pet.cooldown} cooldown
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ─── Main Pets Page ───────────────────────────────────────────────────────────
export default function PetsPage({ inv, setInv }) {
  const C = COLORS;
  const [petData, setPetData] = useLocalStorage("pets-data", {});
  const [collapsed, setCollapsed] = React.useState({});

  const getPet = name => petData[name] || defaultPetState();
  const setPet = (name, updates) => {
    setPetData(prev => ({
      ...prev,
      [name]: { ...(prev[name] || defaultPetState()), ...updates },
    }));
  };

  // Inventory values
  const manuals = inv?.tamingManuals    ?? 0;
  const potions = inv?.energizingPotion ?? 0;
  const serums  = inv?.strengtheningSerum ?? 0;
  const wildMarks = inv?.wildMarks      ?? 0;
  const advMarks  = inv?.advWildMarks   ?? 0;

  // Grand totals across all goals
  let totalFood=0, totalManuals=0, totalPotions=0, totalSerums=0, totalSvs=0;
  PETS.forEach(pet => {
    const d = getPet(pet.name);
    const c = calcPetCosts(pet.quality, d.level, d.advanced, d.goalLevel, d.goalAdv);
    totalFood    += c.food;
    totalManuals += c.manual;
    totalPotions += c.potion;
    totalSerums  += c.serum;
    totalSvs     += c.svs;
  });

  // Group pets by quality for section headers
  const groupOrder = ["C","N","R","SR","SSR"];
  const groups = groupOrder.map(q => ({
    quality: q,
    label: qualityLabel(q),
    pets: PETS.filter(p => p.quality === q),
  }));

  const inputS = {
    background:"transparent", border:`1px solid ${C.border}`,
    borderRadius:5, color:C.textPri, padding:"4px 8px", fontSize:16,
    fontWeight:800, fontFamily:"Syne,sans-serif", outline:"none",
    width:"100%", textAlign:"left",
  };

  return (
    <div className="fade-in">

      {/* ── Resource Summary Bar ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)",
        gap:10, marginBottom:20 }}>
        {[
          { label:"Taming Manuals",       invKey:"tamingManuals",       value:manuals,   color:C.blue,   needed:totalManuals },
          { label:"Energizing Potions",   invKey:"energizingPotion",    value:potions,   color:C.amber,  needed:totalPotions },
          { label:"Strengthening Serum",  invKey:"strengtheningSerum",  value:serums,    color:C.red,    needed:totalSerums  },
          { label:"Wild Marks",           invKey:"wildMarks",           value:wildMarks, color:C.green,  needed:null },
          { label:"Adv. Wild Marks",      invKey:"advWildMarks",        value:advMarks,  color:C.accent, needed:null },
        ].map(item => (
          <div key={item.label} style={{ background:C.card,
            border:`1px solid ${C.border}`, borderRadius:10,
            padding:"12px 14px", display:"flex", alignItems:"center",
            justifyContent:"space-between", gap:8 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.textDim,
                textTransform:"uppercase", letterSpacing:"1px",
                fontFamily:"'Space Mono',monospace",
                whiteSpace:"nowrap", overflow:"hidden",
                textOverflow:"ellipsis" }}>
                {item.label}
              </div>
              <input type="number" min={0} value={item.value}
                onChange={e => setInv(prev => ({
                  ...prev, [item.invKey]: Math.max(0, Number(e.target.value)||0)
                }))}
                style={inputS} />
            </div>
            {item.needed > 0 && (
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:9, color:C.textDim,
                  fontFamily:"'Space Mono',monospace" }}>All goals</div>
                <div style={{ fontSize:12, fontWeight:700,
                  fontFamily:"'Space Mono',monospace",
                  color: item.needed > item.value ? C.red : C.green }}>
                  {fmt(item.needed)} needed
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Total SVS Points from goals ── */}
      {totalSvs > 0 && (
        <div style={{ marginBottom:16, padding:"10px 16px",
          background:C.accentBg, border:`1px solid ${C.accentDim}`,
          borderRadius:8, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:11, color:C.textDim,
            fontFamily:"'Space Mono',monospace" }}>SVS PTS from all goals:</span>
          <span style={{ fontSize:16, fontWeight:800, color:C.accent,
            fontFamily:"Syne,sans-serif" }}>{fmt(totalSvs)}</span>
        </div>
      )}

      {/* ── Pet Groups ── */}
      {groups.map(group => {
        const isOpen = collapsed[group.quality] !== false; // open by default
        const qColor = qualityColor(group.quality);
        return (
          <div key={group.quality} style={{ marginBottom:16 }}>
            {/* Group header */}
            <div onClick={() => setCollapsed(p => ({
                ...p, [group.quality]: !isOpen
              }))}
              style={{ display:"flex", alignItems:"center",
                justifyContent:"space-between", padding:"10px 16px",
                background:C.surface, border:`1px solid ${C.border}`,
                borderRadius: isOpen ? "10px 10px 0 0" : 10,
                cursor:"pointer", userSelect:"none",
                borderLeft:`3px solid ${qColor}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:12, fontWeight:800, color:qColor,
                  fontFamily:"'Space Mono',monospace" }}>{group.label}</span>
                <span style={{ fontSize:11, color:C.textDim }}>
                  {group.pets.length} pet{group.pets.length !== 1 ? "s" : ""}
                </span>
              </div>
              <span style={{ color:C.textDim, fontSize:13 }}>
                {isOpen ? "▲" : "▼"}
              </span>
            </div>

            {isOpen && (
              <div style={{ border:`1px solid ${C.border}`,
                borderTop:"none", borderRadius:"0 0 10px 10px",
                padding:"12px", background:C.card }}>
                {group.pets.map(pet => (
                  <PetDrawer
                    key={pet.name}
                    pet={pet}
                    data={getPet(pet.name)}
                    onChange={updates => setPet(pet.name, updates)}
                    inv={inv}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
