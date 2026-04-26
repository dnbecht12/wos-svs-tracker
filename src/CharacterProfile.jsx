import React, { useState, useEffect, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage.js";
import { supabase } from "./supabase.js";
import { CHIEF_GEAR_LEVELS, CHIEF_CHARM_LEVELS } from "./ChiefEquipment.jsx";
import { WA_RESEARCH, waPower } from "./WarAcademy.jsx";
import { getRCTechPower, getRCDeployRally, getRCMarchQueue } from "./ResearchCenter.jsx";
import {
  EXPERT_AFFINITY_POWER_RATE, EXPERT_TALENT_POWER_RATE, EXPERT_LEVEL_POWER,
  EXPERT_SKILL_POWER, RESEARCH_POWER, ROMULUS_SK4_RALLY, ROMULUS_BONUS_DEPLOY,
} from "./Experts.jsx";
import { getBuildingPower, BUILDINGS_LIST } from "./ConstructionPlanner.jsx";
import { SLOT_TO_GEAR, getGearStats } from "./GearData.js";
import { HERO_ROSTER, GEAR_SLOTS } from "./Heroes.jsx";

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

// ─── Formatting helpers ───────────────────────────────────────────────────────
const fmt = n => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(1)+"M";
  if (Math.abs(n) >= 1000) return (n/1000).toFixed(1)+"K";
  return Math.round(n).toLocaleString();
};

// ─── Character Profile Page ───────────────────────────────────────────────────

// Embassy Reinforcement Cap by level (F30 = index 0, FC1-FC10 = index 1-10)
const EMBASSY_REINFORCE = {
  "F30":840000, "FC1":865000, "FC2":890000, "FC3":915000, "FC4":940000,
  "FC5":965000, "FC6":990000, "FC7":1015000, "FC8":1040000, "FC9":1065000, "FC10":1090000,
};

// Command Center Rally + Deployment Cap by level
const COMMAND_CENTER_STATS = {
  "F30": { rally:840000, deploy:67000  },
  "FC1": { rally:865000, deploy:70500  },
  "FC2": { rally:890000, deploy:74000  },
  "FC3": { rally:915000, deploy:77500  },
  "FC4": { rally:940000, deploy:81000  },
  "FC5": { rally:965000, deploy:84500  },
  "FC6": { rally:990000, deploy:88000  },
  "FC7": { rally:1015000, deploy:91500 },
  "FC8": { rally:1040000, deploy:95000 },
  "FC9": { rally:1065000, deploy:98500 },
  "FC10":{ rally:1090000, deploy:102000},
};


// VIP badge colors per level group
const VIP_BADGE_COLOR = (lv) => {
  if (lv === 0)            return { bg:"#4a4a4a", text:"#aaa",    border:"#666" };
  if (lv <= 3)             return { bg:"#1a3a1a", text:"#4caf50", border:"#388e3c" };
  if (lv <= 6)             return { bg:"#1a2a4a", text:"#64b5f6", border:"#1976d2" };
  if (lv <= 9)             return { bg:"#3a1a3a", text:"#ce93d8", border:"#9c27b0" };
  return                          { bg:"#3a2a0a", text:"#ffb74d", border:"#f57c00" };
};

// Read building current level string from cp-buildings, normalized to lookup key
function getBuildingLevel(buildingName) {
  try {
    const raw = localStorage.getItem("cp-buildings");
    if (!raw) return null;
    const buildings = JSON.parse(raw);
    const b = buildings.find(b => b.name === buildingName);
    if (!b?.current) return null;
    // Normalize: "FC8" stays "FC8", "FC8.1" → "FC8", "30.1" / "30.x" → "F30"
    const cur = b.current;
    if (/^\d+\.\d+$/.test(cur)) return "F30"; // e.g. "30.1"
    const fcMatch = cur.match(/^FC(\d+)(?:\.\d+)?$/);
    if (fcMatch) return `FC${fcMatch[1]}`;
    return null;
  } catch { return null; }
}

function CharacterProfilePage({ hgHeroes, inv, rcLevels, profileVersion, cpSpeedBuff: cpSpeedBuffProp, setCpSpeedBuff: setCpSpeedBuffProp, onCompleteSvs }) {
  const C = COLORS;

  // VIP level
  const [vipLevel, setVipLevel] = useLocalStorage("cp-vip-level", 0);

  // VIP march queue: +1 at VIP 6+ (cumulative benefit, not per-level stacking)
  const VIP_MARCH_QUEUE = [0,0,0,0,0,0,1,1,1,1,1,1,1]; // index = VIP level 0-12
  const vipMarchQueue = VIP_MARCH_QUEUE[Math.min(vipLevel, 12)] ?? 0;
  const [purchasedQueue, setPurchasedQueue] = useLocalStorage("cp-purchased-queue", false);

  // Pet power — read from pets-data localStorage key (same as Pets tab)
  const petPower = React.useMemo(() => {
    try {
      const QUALITY_MAP = {
        "Cave Hyena":"C",
        "Arctic Wolf":"N","Musk Ox":"N",
        "Giant Tapir":"R","Titan Roc":"R",
        "Giant Elk":"SR","Snow Leopard":"SR",
        "Cave Lion":"SSR","Snow Ape":"SSR","Iron Rhino":"SSR",
        "Sabertooth Tiger":"SSR","Mammoth":"SSR","Frost Gorilla":"SSR",
        "Frostscale Chameleon":"SSR",
      };
      const PWR = {
        C:{1:3600,2:7200,3:10800,4:14400,5:18000,6:21600,7:25200,8:28800,9:32400,10:36000,"10a":66240,11:69840,12:73440,13:77040,14:80640,15:84240,16:87840,17:91440,18:95040,19:98640,20:102960,"20a":136800,21:136800,22:140400,23:144000,24:147600,25:151200,26:154800,27:158400,28:162000,29:165600,30:169200,"30a":210240,31:210240,32:213840,33:217440,34:221040,35:224640,36:228240,37:231840,38:235440,39:239040,40:242640,"40a":280800,41:284400,42:288000,43:291600,44:295200,45:298800,46:302400,47:306000,48:309600,49:313200,50:316800,"50a":361440},
        N:{1:5760,2:12240,3:18000,4:24480,5:30240,6:36000,7:42480,8:48240,9:54000,10:60480,"10a":108720,11:114480,12:120960,13:126720,14:130480,15:138960,16:144720,17:150480,18:156960,19:162720,20:169200,"20a":223200,21:223200,22:228960,23:235440,24:241200,25:246960,26:253440,27:259200,28:264960,29:270720,30:277200,"30a":337680,31:344160,32:349920,33:356400,34:362160,35:367920,36:374400,37:380160,38:385920,39:392400,40:398160,"40a":458640,41:465120,42:470880,43:476640,44:483120,45:488880,46:494640,47:501120,48:506880,49:513360,50:518820,"50a":591120,51:596380,52:603360,53:609120,54:615600,55:621660,56:627120,57:633600,58:639360,59:645120,60:651900,"60a":724320},
        R:{1:7920,2:15840,3:23040,4:30960,5:38880,6:46800,7:54000,8:61920,9:69840,10:77760,"10a":138240,11:146160,12:153360,13:161280,14:169200,15:177120,16:184120,17:192240,18:200160,19:208080,20:215760,"20a":275760,21:283680,22:291600,23:299528,24:307440,25:314640,26:322560,27:330480,28:338400,29:345600,30:353520,"30a":428400,31:436320,32:444240,33:452160,34:459360,35:467280,36:475200,37:483120,38:490320,39:498240,40:506160,"40a":581760,41:589680,42:597600,43:604800,44:612720,45:620640,46:628560,47:635760,48:643680,49:651600,50:659520,"50a":750240,51:757440,52:765360,53:773280,54:781200,55:789120,56:796320,57:804240,58:812180,59:820080,60:827280,"60a":917280,61:925200,62:933120,63:941040,64:948960,65:956160,66:964080,67:972000,68:979920,69:987120,70:995040,"70a":1085760},
        SR:{1:10080,2:19440,3:29520,4:38880,5:48960,6:59040,7:68400,8:78480,9:88560,10:97920,"10a":170640,11:180720,12:190080,13:200160,14:210240,15:219600,16:229680,17:239040,18:249120,19:259200,20:268500,"20a":342000,21:352080,22:362160,23:371520,24:381040,25:390960,26:401040,27:411120,28:420480,29:430560,30:440640,"30a":531360,31:540720,32:550800,33:560160,34:570240,35:580320,36:589680,37:599760,38:609120,39:619200,40:629280,"40a":720720,41:730080,42:740160,43:750240,44:759600,45:769680,46:779040,47:789120,48:799200,49:808560,50:818640,"50a":928080,51:937440,52:947520,53:957600,54:966960,55:977040,56:987120,57:996480,58:1006580,59:1015920,60:1026000,"60a":1135440,61:1145520,62:1154880,63:1164960,64:1175040,65:1184400,66:1194480,67:1203840,68:1213920,69:1224000,70:1233360,"70a":1342800,71:1352880,72:1362240,73:1372320,74:1382400,75:1391760,76:1401840,77:1411920,78:1421280,79:1431360,80:1440720,"80a":1568160},
        SSR:{1:12240,2:24480,3:36000,4:48240,5:60480,6:72720,7:84240,8:96480,9:108720,10:120960,"10a":205920,11:217440,12:229680,13:241920,14:254160,15:265680,16:277920,17:290160,18:302400,19:313920,20:326160,"20a":410400,21:422640,22:434880,23:446400,24:458640,25:470880,26:483120,27:495360,28:506880,29:519120,30:531360,"30a":637200,31:649440,32:660960,33:673200,34:685440,35:697680,36:709200,37:721440,38:733680,39:745920,40:757440,"40a":863280,41:875520,42:887760,43:900000,44:911520,45:923760,46:936000,47:948240,48:959760,49:972000,50:984240,"50a":1116680,51:1123920,52:1136160,53:1147680,54:1159920,55:1172160,56:1184400,57:1195920,58:1208160,59:1220400,60:1232640,"60a":1359360,61:1370880,62:1383120,63:1395360,64:1407600,65:1419120,66:1431360,67:1443600,68:1455840,69:1467360,70:1479600,"70a":1607040,71:1619280,72:1631520,73:1634040,74:1655280,75:1667520,76:1679760,77:1692000,78:1703520,79:1715760,80:1728000,"80a":1875600,81:1887840,82:1899360,83:1911600,84:1923840,85:1936080,86:1947600,87:1959840,88:1972080,89:1984320,90:1995840,"90a":2144160,91:2156400,92:2168640,93:2180880,94:2192400,95:2204640,96:2216880,97:2229120,98:2240640,99:2252880,100:2265120,"100a":2413440},
      };
      const raw = localStorage.getItem("pets-data");
      const saved = raw ? JSON.parse(raw) : {};
      let total = 0;
      Object.entries(QUALITY_MAP).forEach(([name, quality]) => {
        const d = saved[name];
        if (!d || !d.level) return;
        const table = PWR[quality];
        if (!table) return;
        const key = d.advanced ? `${d.level}a` : d.level;
        total += table[key] ?? table[d.level] ?? 0;
      });
      return total;
    } catch { return 0; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion]);

  // Embassy Reinforcement Cap
  const reinforceCap = React.useMemo(() => {
    const embLvl = getBuildingLevel("Embassy");
    return EMBASSY_REINFORCE[embLvl] ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion]);

  // ── All power sources ──────────────────────────────────────────────────────

  // Hero Gear power — reactive via hgHeroes prop
  const heroGearPower = React.useMemo(() => {
    if (!hgHeroes) return 0;
    let total = 0;
    const gearSlotNames = ["Goggles","Gloves","Belt","Boots"];
    hgHeroes.forEach(hd => {
      if (!hd?.hero) return;
      const troopType = HERO_ROSTER.find(h => h.name === hd.hero)?.type;
      if (!troopType) return;
      gearSlotNames.forEach(slot => {
        const slotIdx = GEAR_SLOTS.indexOf(slot);
        const s = hd.slots?.[slotIdx];
        if (!s) return;
        const gearName = SLOT_TO_GEAR(troopType, slot);
        if (!gearName || !s.status) return;
        const gs = getGearStats(gearName, s.status, s.gearCurrent ?? 0, s.masteryCurrent ?? 0);
        total += gs?.power ?? 0;
      });
    });
    return Math.round(total);
  }, [hgHeroes]);

  // Hero Power — from Supabase accepted stats
  const [heroPower, setHeroPower] = React.useState(0);
  React.useEffect(() => {
    supabase.from("hero_stats_data")
      .select("stats")
      .eq("is_current", true)
      .then(({ data }) => {
        if (!data) return;
        let total = 0;
        data.forEach(row => {
          const s = row.stats || {};
          total += (s.levelPower || 0) + (s.starPower || 0) + (s.skillPower || 0) + (s.gearStrength || 0);
        });
        setHeroPower(Math.round(total));
      });
  }, []);

  // Chief Gear power — reads from localStorage, refreshes on profileVersion
  const chiefGearPower = React.useMemo(() => {
    try {
      const raw = localStorage.getItem("cg-slots");
      if (!raw) return 0;
      return JSON.parse(raw).reduce((sum, s) => sum + (CHIEF_GEAR_LEVELS[s.current ?? 0]?.[6] ?? 0), 0);
    } catch { return 0; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion]);

  // Chief Charms power — reads from localStorage, refreshes on profileVersion
  const chiefCharmsPower = React.useMemo(() => {
    try {
      const raw = localStorage.getItem("cc-slots");
      if (!raw) return 0;
      return JSON.parse(raw).reduce((sum, s) => {
        const cur = s.current ?? 0;
        return cur === 0 ? sum : sum + (CHIEF_CHARM_LEVELS[cur - 1]?.power ?? 0);
      }, 0);
    } catch { return 0; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion]);

  // Tech power — WA from localStorage + RC from rcLevels prop, refreshes on profileVersion
  const { techPower, waTechPower, rcTechPower } = React.useMemo(() => {
    let waTotal = 0;
    try {
      const raw = localStorage.getItem("wa-levels");
      if (raw) {
        const levels = JSON.parse(raw);
        ["Infantry","Lancer","Marksman"].forEach(troop => {
          WA_RESEARCH.forEach(res => {
            waTotal += waPower(res, levels[troop]?.[res.id]?.cur ?? 0);
          });
        });
      }
    } catch {}
    const rcTotal = getRCTechPower(rcLevels);
    return {
      techPower:   Math.round(waTotal + rcTotal),
      waTechPower: Math.round(waTotal),
      rcTechPower: Math.round(rcTotal),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion, rcLevels]);

  // Deployment + Rally capacity — WA research + Chief Gear + Command Center + RC research
  const { deployCapacity, rallyCapacityTotal, deployBreakdown, rallyBreakdown } = React.useMemo(() => {
    let deployWA = 0, rallyWA = 0;
    try {
      const raw = localStorage.getItem("wa-levels");
      if (raw) {
        const levels = JSON.parse(raw);
        const fsRes = WA_RESEARCH.find(r => r.id === "flameSquad");
        const htRes = WA_RESEARCH.find(r => r.id === "heliosTraining");
        const flRes = WA_RESEARCH.find(r => r.id === "flameLegion");
        ["Infantry","Lancer","Marksman"].forEach(troop => {
          deployWA += fsRes?.levels[levels[troop]?.flameSquad?.cur ?? 0]?.[2] ?? 0;
          deployWA += htRes?.levels[levels[troop]?.heliosTraining?.cur ?? 0]?.[2] ?? 0;
          rallyWA  += flRes?.levels[levels[troop]?.flameLegion?.cur ?? 0]?.[2] ?? 0;
        });
      }
    } catch {}
    let deployGear = 0;
    try {
      const raw = localStorage.getItem("cg-slots");
      if (raw) JSON.parse(raw).forEach(s => { deployGear += CHIEF_GEAR_LEVELS[s.current ?? 0]?.[9] ?? 0; });
    } catch {}
    const cmdBase = COMMAND_CENTER_STATS[getBuildingLevel("Command")] ?? null;
    // Research Center contributions
    const rcContrib = getRCDeployRally(rcLevels);
    const rcMarchQueue = getRCMarchQueue(rcLevels);
    // Romulus expert contributions — Bonus (Commander's Crest) for deploy, Skill 4 (One Heart) for rally
    let romulusExpertDeploy = 0, romulusExpertRally = 0;
    try {
      const ed = localStorage.getItem("experts-data");
      if (ed) {
        const parsed = JSON.parse(ed);
        const rom = parsed["Romulus"] || {};
        const romB   = Number(rom.affinity  ?? 0);
        const romSk4 = Number(rom.sk4Level  ?? 0);
        const ROMULUS_B_DEPLOY  = [0,300,600,1000,1500,200,3000,4000,5500,7000,8500,10000];
        const ROMULUS_SK4_RALLY = [0,5000,10000,15000,20000,25000,30000,35000,40000,45000,50000,55000,60000,65000,70000,75000,80000,85000,90000,95000,100000];
        romulusExpertDeploy = ROMULUS_B_DEPLOY[romB]   ?? 0;
        romulusExpertRally  = ROMULUS_SK4_RALLY[romSk4] ?? 0;
      }
    } catch {}
    let daybreakDeploy = 0;
    try {
      const dbRaw = localStorage.getItem("daybreak-buffs");
      if (dbRaw) daybreakDeploy = Number(String(JSON.parse(dbRaw).deployCap ?? "").replace(/,/g, "")) || 0;
    } catch {}
    const cmdDeploy = cmdBase?.deploy ?? 0;
    const cmdRally  = cmdBase?.rally  ?? 0;
    const BASE_DEPLOY = 500; // all players start with 500 base deployment capacity
    return {
      deployCapacity:     Math.round(BASE_DEPLOY + deployWA + deployGear + cmdDeploy + rcContrib.deploy + romulusExpertDeploy + daybreakDeploy),
      rallyCapacityTotal: Math.round(rallyWA  + cmdRally  + rcContrib.rally + romulusExpertRally),
      deployBreakdown: [
        { label: "Base (all players)",  value: BASE_DEPLOY },
        { label: "Command Center",   value: cmdDeploy },
        { label: "War Academy (Flame Squad + Helios Training × 3)", value: Math.round(deployWA) },
        { label: "Chief Gear",       value: Math.round(deployGear) },
        { label: "Research Center",  value: Math.round(rcContrib.deploy) },
        { label: "Romulus (Commander's Crest)", value: romulusExpertDeploy },
        { label: "Daybreak Island",  value: daybreakDeploy },
      ],
      rallyBreakdown: [
        { label: "Command Center",   value: cmdRally },
        { label: "War Academy (Flame Legion × 3)", value: Math.round(rallyWA) },
        { label: "Research Center",  value: Math.round(rcContrib.rally) },
        { label: "Romulus (One Heart)", value: romulusExpertRally },
      ],
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion, rcLevels]);

  // Construction Speed — reactive via prop from App.jsx (cloud-synced)
  const constructionSpeed = cpSpeedBuffProp !== undefined ? Number(cpSpeedBuffProp) : 0;

  // Research Speed — reads from localStorage, refreshes on profileVersion
  const researchSpeed = React.useMemo(() => {
    try { return Number(localStorage.getItem("wa-speedbuff") || 0); } catch { return 0; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion]);

  // Troops power — reads from localStorage, refreshes on profileVersion
  const troopsPower = React.useMemo(() => {
    try {
      const troopsRaw = localStorage.getItem("troops-inventory-v2");
      const bldgsRaw  = localStorage.getItem("cp-buildings");
      if (!troopsRaw) return 0;
      const troops = JSON.parse(troopsRaw);
      const bldgs  = bldgsRaw ? JSON.parse(bldgsRaw) : [];
      const getFCNum = name => {
        const b = bldgs.find(b => b.name === name);
        if (!b?.current) return 0;
        const m = b.current.match(/FC(\d+)/i);
        return m ? parseInt(m[1]) : 0;
      };
      const buildingMap = { infantry:"Infantry", lancer:"Lancer", marksman:"Marksman" };
      const POWER_ONLY = {
        infantry: { 0:[[1,3],[2,4],[3,6],[4,9],[5,13],[6,20],[7,28],[8,38],[9,50],[10,66],[11,80]], 1:[[1,3],[2,4],[3,6],[4,10],[5,14],[6,21],[7,30],[8,41],[9,54],[10,71],[11,86]], 2:[[1,3],[2,4],[3,6],[4,10],[5,15],[6,22],[7,32],[8,44],[9,58],[10,76],[11,92]], 3:[[1,3],[2,4],[3,6],[4,11],[5,16],[6,24],[7,34],[8,47],[9,62],[10,83],[11,100]], 4:[[1,3],[2,4],[3,8],[4,12],[5,17],[6,26],[7,37],[8,51],[9,67],[10,88],[11,106]], 5:[[1,4],[2,5],[3,9],[4,13],[5,18],[6,28],[7,40],[8,54],[9,72],[10,94],[11,114]], 6:[[1,4],[2,5],[3,9],[4,14],[5,19],[6,30],[7,43],[8,57],[9,77],[10,99],[11,120]], 7:[[1,4],[2,5],[3,10],[4,15],[5,20],[6,32],[7,46],[8,60],[9,82],[10,104],[11,126]], 8:[[1,5],[2,6],[3,11],[4,16],[5,21],[6,34],[7,49],[8,63],[9,87],[10,110],[11,135]], 9:[[1,5],[2,6],[3,11],[4,16],[5,22],[6,35],[7,51],[8,66],[9,91],[10,115],[11,141]], 10:[[1,5],[2,6],[3,12],[4,17],[5,23],[6,37],[7,54],[8,69],[9,95],[10,121],[11,148]] },
        lancer:   { 0:[[1,3],[2,4],[3,6],[4,9],[5,13],[6,20],[7,28],[8,38],[9,50],[10,66],[11,80]], 1:[[1,3],[2,4],[3,6],[4,10],[5,14],[6,21],[7,30],[8,41],[9,54],[10,71],[11,86]], 2:[[1,3],[2,5],[3,6],[4,10],[5,15],[6,22],[7,32],[8,44],[9,58],[10,76],[11,92]], 3:[[1,3],[2,4],[3,6],[4,11],[5,16],[6,24],[7,34],[8,47],[9,62],[10,83],[11,100]], 4:[[1,3],[2,4],[3,8],[4,12],[5,17],[6,26],[7,37],[8,51],[9,67],[10,88],[11,106]], 5:[[1,3],[2,4],[3,8],[4,12],[5,17],[6,26],[7,37],[8,54],[9,72],[10,94],[11,114]], 6:[[1,4],[2,5],[3,9],[4,14],[5,19],[6,30],[7,43],[8,57],[9,77],[10,99],[11,120]], 7:[[1,4],[2,5],[3,10],[4,15],[5,20],[6,32],[7,46],[8,60],[9,82],[10,104],[11,126]], 8:[[1,5],[2,6],[3,11],[4,16],[5,21],[6,34],[7,49],[8,63],[9,87],[10,110],[11,135]], 9:[[1,5],[2,6],[3,11],[4,16],[5,22],[6,35],[7,51],[8,66],[9,91],[10,115],[11,141]], 10:[[1,5],[2,6],[3,12],[4,17],[5,23],[6,37],[7,54],[8,69],[9,95],[10,121],[11,148]] },
        marksman: { 0:[[1,3],[2,4],[3,6],[4,9],[5,13],[6,20],[7,28],[8,38],[9,50],[10,66],[11,80]], 1:[[1,3],[2,4],[3,6],[4,10],[5,14],[6,21],[7,30],[8,41],[9,54],[10,71],[11,86]], 2:[[1,3],[2,4],[3,6],[4,10],[5,15],[6,22],[7,32],[8,44],[9,58],[10,76],[11,92]], 3:[[1,3],[2,4],[3,6],[4,11],[5,16],[6,24],[7,34],[8,47],[9,62],[10,83],[11,100]], 4:[[1,3],[2,4],[3,8],[4,12],[5,17],[6,26],[7,37],[8,51],[9,67],[10,88],[11,106]], 5:[[1,4],[2,5],[3,9],[4,13],[5,18],[6,28],[7,40],[8,54],[9,72],[10,94],[11,114]], 6:[[1,4],[2,5],[3,9],[4,14],[5,19],[6,30],[7,43],[8,57],[9,77],[10,99],[11,120]], 7:[[1,4],[2,5],[3,10],[4,15],[5,20],[6,32],[7,46],[8,60],[9,82],[10,104],[11,126]], 8:[[1,5],[2,6],[3,11],[4,16],[5,21],[6,34],[7,49],[8,63],[9,87],[10,110],[11,135]], 9:[[1,5],[2,6],[3,11],[4,16],[5,22],[6,35],[7,51],[8,66],[9,91],[10,115],[11,141]], 10:[[1,5],[2,6],[3,12],[4,17],[5,23],[6,37],[7,54],[8,69],[9,95],[10,121],[11,148]] },
      };
      const getPower = (type, tierNum, fc) => {
        const rows = POWER_ONLY[type]?.[Math.min(Math.max(fc,0),10)];
        const r = rows?.find(r => r[0] === tierNum);
        return r ? r[1] : 0;
      };
      let total = 0;
      ["infantry","lancer","marksman"].forEach(id => {
        const fc = getFCNum(buildingMap[id]);
        (troops[id] || []).forEach(row => {
          total += (Number(row.count)||0) * getPower(id, parseInt((row.tier||"T0").replace("T","")), fc);
        });
      });
      return Math.round(total);
    } catch { return 0; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion]);

  // Building power — reads from localStorage, refreshes on profileVersion
  const NON_FC_FIXED = 817958;
  const buildingPower = React.useMemo(() => {
    let fcTotal = 0;
    let nonFcEnabled = false;
    try {
      const raw = localStorage.getItem("cp-buildings");
      if (raw) {
        JSON.parse(raw).forEach(b => {
          if (BUILDINGS_LIST.includes(b.name) && b.current) {
            fcTotal += getBuildingPower(b.name, b.current, b.currentSub || 0);
          }
        });
      }
      const nonFcRaw = localStorage.getItem("cp-nonfc-active");
      if (nonFcRaw) nonFcEnabled = JSON.parse(nonFcRaw) === true;
    } catch {}
    return fcTotal + (nonFcEnabled ? NON_FC_FIXED : 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion]);

  // Expert Power — reads experts-data from localStorage, refreshes on profileVersion
  const expertPower = React.useMemo(() => {
    try {
      const raw = localStorage.getItem("experts-data");
      if (!raw) return 0;
      const ed = JSON.parse(raw);
      let total = 0;
      const EXPERTS_LIST = ["Cyrille","Agnes","Romulus","Holger","Fabian","Baldur","Valeria","Ronne","Kathy"];
      EXPERTS_LIST.forEach(name => {
        const d = ed[name] || {};
        const lv  = Number(d.level    ?? 0);
        const aff = Number(d.affinity ?? 0);
        // Level Power
        const lpCfg = EXPERT_LEVEL_POWER[name];
        if (lpCfg && lv > 0) total += Math.round(lpCfg.rate * (lv + lpCfg.offset));
        // Affinity Power
        const affRate = EXPERT_AFFINITY_POWER_RATE[name];
        if (affRate) total += affRate * aff;
        // Talent Power (= affinity level in-game)
        const talRate = EXPERT_TALENT_POWER_RATE[name];
        if (talRate) total += talRate * aff;
        // Skill Power
        const skPwr = EXPERT_SKILL_POWER[name];
        if (skPwr) {
          ["sk1","sk2","sk3","sk4"].forEach(sk => {
            total += (skPwr[sk] ?? 0) * Number(d[`${sk}Level`] ?? 0);
          });
        }
        // Research Power — unlocks at L100, B11, all skills maxed
        const resProg = Number(d.researchProgress ?? 0);
        if (lv >= 100 && aff >= 11 && resProg > 0) {
          total += RESEARCH_POWER(resProg);
        }
      });
      return Math.round(total);
    } catch { return 0; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion]);

  // Grand total
  const totalPower = techPower + chiefGearPower + chiefCharmsPower + heroPower + heroGearPower + troopsPower + buildingPower + expertPower;

  // ── Styles ─────────────────────────────────────────────────────────────────
  const sectionHead = (label, sub) => (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:16, fontWeight:800, color:C.textPri, fontFamily:"Syne,sans-serif",
        letterSpacing:"0.3px" }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:C.textSec, marginTop:3 }}>{sub}</div>}
    </div>
  );

  const fmt = n => Math.round(n).toLocaleString();

  // Buffered number input — holds local string state, commits to parent only on blur
  const BufferedInput = ({ value, onCommit, suffix, width=110 }) => {
    const fmt = v => Number(v) > 0 ? Number(v).toLocaleString() : String(v ?? "");
    const [local, setLocal] = React.useState(fmt(value));
    React.useEffect(() => { setLocal(fmt(value)); }, [value]);
    return (
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <input type="text" inputMode="numeric"
          value={local}
          onChange={e => setLocal(e.target.value)}
          onFocus={e => setLocal(String(Number(String(local).replace(/,/g,"")) || ""))}
          onBlur={e => {
            const v = Number(String(e.target.value).replace(/,/g,"")) || 0;
            setLocal(fmt(v));
            onCommit(v);
          }}
          style={{ width, textAlign:"right", background:C.card,
            border:`1px solid ${C.border}`, borderRadius:5,
            color:C.textPri, padding:"4px 8px", fontSize:12, outline:"none",
            fontFamily:"'Space Mono',monospace" }} />
        {suffix && <span style={{ fontSize:11, color:C.textDim }}>{suffix}</span>}
      </div>
    );
  };

  const Row = ({ label, value, source, breakdown, isEntry, onEntry, entryVal, accent, dim, suffix="", noBorder=false }) => {
    const [hovered, setHovered] = React.useState(false);
    return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"11px 0", borderBottom: noBorder ? "none" : `1px solid ${C.border}`, position:"relative" }}
      onMouseEnter={() => breakdown && setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      <div style={{ flex:1, paddingRight:12 }}>
        <div style={{ fontSize:13, fontWeight:700, color: dim ? C.textSec : C.textPri,
          display:"flex", alignItems:"center", gap:6 }}>
          {label}
          {breakdown && <span style={{ fontSize:9, color:C.textDim,
            fontFamily:"'Space Mono',monospace", cursor:"default", userSelect:"none" }}>ⓘ</span>}
        </div>
        {source && <div style={{ fontSize:11, color:C.textSec, fontFamily:"'Space Mono',monospace",
          marginTop:2, lineHeight:1.4 }}>{source}</div>}
      </div>
      {isEntry ? (
        <BufferedInput value={entryVal} onCommit={onEntry} suffix={suffix} />
      ) : (
        <div style={{ fontSize:13, fontFamily:"'Space Mono',monospace", fontWeight:700,
          color: accent ? C.accent : dim ? C.textSec : C.textPri, whiteSpace:"nowrap" }}>
          {value}{suffix}
        </div>
      )}
      {breakdown && hovered && (
        <div style={{
          position:"absolute", bottom:"calc(100% + 4px)", right:0, zIndex:200,
          background:C.card, border:`1px solid ${C.border}`, borderRadius:8,
          padding:"10px 14px", minWidth:280, maxWidth:360,
          boxShadow:"0 4px 16px rgba(0,0,0,0.5)", pointerEvents:"none",
        }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.textDim, textTransform:"uppercase",
            letterSpacing:"1.2px", fontFamily:"'Space Mono',monospace", marginBottom:8 }}>
            {label} Breakdown
          </div>
          {breakdown.map((item, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between",
              alignItems:"baseline", padding:"3px 0",
              borderBottom: i < breakdown.length-1 ? `1px solid ${C.border}` : "none", gap:12 }}>
              <span style={{ fontSize:11, color:C.textSec, lineHeight:1.3 }}>{item.label}</span>
              <span style={{ fontSize:11, fontFamily:"'Space Mono',monospace", fontWeight:700,
                color: typeof item.value === "number" && item.value > 0 ? C.textPri : C.textDim,
                whiteSpace:"nowrap", flexShrink:0 }}>
                {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
    );
  };

  const SectionCard = ({ children, style }) => (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10,
      padding:"20px 20px", marginBottom:16, ...style }}>
      {children}
    </div>
  );

  // Total power header card
  const TotalCard = () => {
    const badge = VIP_BADGE_COLOR(vipLevel);
    return (
    <div style={{ background:C.accentBg, border:`1px solid ${C.accentDim}`,
      borderRadius:10, padding:"20px 24px", marginBottom:20 }}>
      <div style={{ display:"flex", alignItems:"flex-start",
        justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"2px", textTransform:"uppercase",
            color:C.accent, fontFamily:"'Space Mono',monospace", marginBottom:4 }}>Total Power</div>
          <div style={{ fontSize:32, fontWeight:800, color:C.textPri, fontFamily:"Syne,sans-serif",
            letterSpacing:"-0.5px" }}>{fmt(totalPower)}</div>
          <div style={{ fontSize:11, color:C.textSec, marginTop:4 }}>
            Sum of all tracked power sources
          </div>
        </div>

        {/* VIP Badge */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
          <div style={{
            width:72, height:72, borderRadius:10,
            background:badge.bg, border:`2px solid ${badge.border}`,
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            boxShadow:`0 0 12px ${badge.border}40`,
            cursor:"default", userSelect:"none",
          }}>
            <div style={{ fontSize:9, fontWeight:700, color:badge.text,
              fontFamily:"'Space Mono',monospace", letterSpacing:"2px",
              textTransform:"uppercase", marginBottom:2 }}>VIP</div>
            <div style={{ fontSize:28, fontWeight:900, color:badge.text,
              fontFamily:"Syne,sans-serif", lineHeight:1 }}>
              {vipLevel}
            </div>
          </div>
          <select value={vipLevel}
            onChange={e => setVipLevel(Number(e.target.value))}
            style={{ background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:5, color:C.textSec, fontSize:11, padding:"3px 6px",
              outline:"none", cursor:"pointer", fontFamily:"'Space Mono',monospace",
              width:72 }}>
            {Array.from({length:13},(_,i)=>i).map(lv => (
              <option key={lv} value={lv}>VIP {lv}</option>
            ))}
          </select>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px 24px", fontSize:11,
          fontFamily:"'Space Mono',monospace" }}>
          {[
            ["Tech",         techPower],
            ["Chief Gear",   chiefGearPower],
            ["Chief Charms", chiefCharmsPower],
            ["Hero",         heroPower + heroGearPower],
            ["Troops",       troopsPower],
            ["Buildings",    buildingPower],
            ["Experts",      expertPower],
          ].map(([lbl, val]) => (
            <div key={lbl} style={{ display:"flex", justifyContent:"space-between", gap:16 }}>
              <span style={{ color:C.textDim }}>{lbl}</span>
              <span style={{ color:C.textSec }}>{fmt(val)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="fade-in" style={{ maxWidth:680, padding:"0 0 40px" }}>

      {/* Complete Upgrades button */}
      {onCompleteSvs && (
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={onCompleteSvs} style={{
              padding:"9px 18px", borderRadius:7, cursor:"pointer",
              border:"1px solid var(--c-accentDim)",
              background:"rgba(227,107,26,0.12)",
              color:"var(--c-accent)", fontSize:12, fontWeight:700,
              fontFamily:"Syne,sans-serif",
              display:"flex", alignItems:"center", gap:7,
            }}>
              ⚔️ Complete Upgrades
            </button>
            <span title="Reviews all goal levels across every tab. Lets you adjust what you actually achieved in SvS, then pushes those values to Current and deducts materials from inventory."
              style={{fontSize:14,color:"var(--c-textDim)",cursor:"default",userSelect:"none",lineHeight:1}}>ⓘ</span>
          </div>
        </div>
      )}

      <TotalCard />

      {/* ── Power Breakdown ─────────────────────────────────────────────── */}
      <SectionCard>
        {sectionHead("Power Breakdown", "Current levels across all tracked categories")}

        <Row label="Tech Power" value={fmt(techPower)}
          source="War Academy (current levels) · Research Center (current levels)"
          breakdown={[
            { label: "War Academy",     value: waTechPower },
            { label: "Research Center", value: rcTechPower },
          ]} />

        <Row label="Chief Gear Power" value={fmt(chiefGearPower)}
          source="Chief Gear tab · current levels" />

        <Row label="Chief Charms Power" value={fmt(chiefCharmsPower)}
          source="Chief Charms tab · current levels (18 charms)" />

        <Row label="Hero Power" value={fmt(heroPower)}
          source="Heroes tab · level + star + skill + gear strength (submitted stats)" />

        <Row label="Hero Gear Power" value={fmt(heroGearPower)}
          source="Hero Gear Calculator · 4 gear slots × 3 hero slots" />

        <Row label="Pet Power" value={petPower > 0 ? fmt(petPower) : "—"}
          source="Sum of Troops Power from all tamed pets at current level/advancement (Pets tab)"
          dim={petPower === 0} />

        <Row label="Expert Power"
          value={expertPower > 0 ? fmt(expertPower) : "—"}
          source="Sum of all expert Level, Affinity, Talent & Skill power (Experts tab) — Research power added manually when unlocked at L100/B11/max skills"
          dim={expertPower === 0} />

        <Row label="Troops Power"
          value={fmt(troopsPower)}
          source="Calculated from Troops tab · count × power per troop at Training Camp FC level"
          breakdown={[
            { label: "Infantry (count × tier power at FC level)",  value: "→ Troops tab" },
            { label: "Lancer (count × tier power at FC level)",    value: "→ Troops tab" },
            { label: "Marksman (count × tier power at FC level)",  value: "→ Troops tab" },
          ]} />

        <Row label="Buildings Power"
          value={fmt(buildingPower)}
          source="FC buildings at current level (Construction tab) + fixed non-FC buildings at max level (Hunter's Hut, Sawmill, Coal Mine, Iron Mine, Cookhouse, Clinic, Shelter ×8, Research Center, Storehouse)" />
      </SectionCard>

      {/* ── Military ────────────────────────────────────────────────────── */}
      <SectionCard>
        {sectionHead("Military", "March, deployment and training stats")}

        {(() => {
          const rcQ = getRCMarchQueue(rcLevels);
          const vipQ = vipMarchQueue;
          const purchQ = purchasedQueue ? 1 : 0;
          const total = 1 + rcQ + vipQ + purchQ;
          const breakdown = [
            { label: "Base", value: "1" },
            { label: "Research Center (Command Tactics I/II/III)", value: `+${rcQ}` },
            { label: `VIP ${vipLevel} benefit`, value: vipQ > 0 ? `+${vipQ}` : "0 (need VIP 6+)" },
            { label: "Purchased queue (real-money pack)", value: purchQ > 0 ? "+1" : "0" },
          ];
          return (
            <div style={{ borderBottom:`1px solid ${C.border}` }}>
              <Row label="March Queue" value={String(total)}
                source="1 base + Research Center (max +3) + VIP 6+ (+1) + optional purchased queue (+1)"
                breakdown={breakdown}
                noBorder />
              <div style={{ display:"flex", alignItems:"center", gap:8,
                padding:"2px 16px 10px 16px" }}>
                <label style={{ display:"flex", alignItems:"center", gap:6,
                  cursor:"pointer", fontSize:11, color:C.textDim,
                  userSelect:"none" }}>
                  <input type="checkbox" checked={purchasedQueue}
                    onChange={e => setPurchasedQueue(e.target.checked)}
                    style={{ accentColor:C.accent, cursor:"pointer", width:13, height:13 }} />
                  <span>+1 Purchased Queue (extra march queue from real-money pack)</span>
                </label>
              </div>
            </div>
          );
        })()}

        <Row label="Deployment Capacity"
          value={deployCapacity > 0 ? fmt(deployCapacity) : "—"}
          source="Command Center base + War Academy (Flame Squad + Helios Training) × 3 troops + Chief Gear + Research Center + Romulus + Daybreak Island"
          breakdown={deployBreakdown} />

        <Row label="Rally Capacity"
          value={rallyCapacityTotal > 0 ? fmt(rallyCapacityTotal) : "—"}
          source="Command Center base + War Academy Flame Legion × 3 troops + Research Center + Romulus"
          breakdown={rallyBreakdown}
          dim={rallyCapacityTotal === 0} />

        <Row label="Reinforcement Cap"
          value={reinforceCap != null ? fmt(reinforceCap) : "—"}
          source="Embassy · set building level in Construction tab"
          dim={reinforceCap == null} />

        <Row label="Training Speed" value="—"
          source="Research Center (coming soon)" dim />
      </SectionCard>

      {/* ── Growth ──────────────────────────────────────────────────────── */}
      <SectionCard>
        {sectionHead("Growth", "Construction and research speed — synced with Construction and War Academy tabs")}

        <Row label="Construction Speed"
          isEntry
          entryVal={constructionSpeed}
          onEntry={v => setCpSpeedBuffProp?.(v)}
          source="Synced with Construction tab · Bonus Overview > Growth"
          suffix="%" />

        <Row label="Research Speed"
          isEntry
          entryVal={researchSpeed}
          onEntry={v => {
            try {
              localStorage.setItem("wa-speedbuff", JSON.stringify(v));
              localStorage.setItem("wa-speedbuff__ts", new Date().toISOString());
              scheduleSync("wa-speedbuff", v);
            } catch {}
          }}
          source="Synced with War Academy tab · Bonus Overview > Growth"
          suffix="%" />
      </SectionCard>

    </div>
  );
}

// Troops page — see ./TroopsPage.jsx
// ─── Error Boundary ───────────────────────────────────────────────────────────

// ─── Export ───────────────────────────────────────────────────────────────────
export default CharacterProfilePage;
export { getBuildingLevel };
