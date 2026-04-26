import React from "react";
import { useLocalStorage } from "./useLocalStorage.js";

// ─── COLORS ───────────────────────────────────────────────────────────────────
// Inject pet dropdown option colors once
if (typeof document !== "undefined" && !document.getElementById("pets-style")) {
  const s = document.createElement("style");
  s.id = "pets-style";
  s.textContent = `.pet-select option { background: var(--c-card); color: var(--c-textPri); }`;
  document.head.appendChild(s);
}

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

const PET_STATS = {
  "C": {
    1:0.05,2:0.10,3:0.15,4:0.20,5:0.25,6:0.30,7:0.35,8:0.40,9:0.45,
    10:0.50,"10a":0.92,11:0.97,12:1.02,13:1.07,14:1.12,15:1.17,16:1.22,17:1.27,18:1.32,19:1.37,
    20:1.42,"20a":1.85,21:1.90,22:1.95,23:2.00,24:2.05,25:2.10,26:2.15,27:2.20,28:2.25,29:2.30,
    30:2.35,"30a":2.87,31:2.92,32:2.97,33:3.02,34:3.07,35:3.12,36:3.17,37:3.22,38:3.27,39:3.32,
    40:3.37,"40a":3.90,41:3.95,42:4.00,43:4.05,44:4.10,45:4.15,46:4.20,47:4.25,48:4.30,49:4.35,
    50:4.40,"50a":5.02,
  },
  "N": {
    1:0.08,2:0.17,3:0.25,4:0.34,5:0.42,6:0.50,7:0.59,8:0.67,9:0.75,
    10:0.84,"10a":1.51,11:1.59,12:1.68,13:1.76,14:1.84,15:1.93,16:2.01,17:2.09,18:2.18,19:2.26,
    20:2.35,"20a":3.02,21:3.10,22:3.18,23:3.27,24:3.35,25:3.43,26:3.52,27:3.60,28:3.69,29:3.77,
    30:3.85,"30a":4.69,31:4.78,32:4.86,33:4.95,34:5.03,35:5.11,36:5.20,37:5.28,38:5.36,39:5.45,
    40:5.53,"40a":6.37,41:6.46,42:6.54,43:6.62,44:6.71,45:6.79,46:6.87,47:6.96,48:7.04,49:7.13,
    50:7.21,"50a":8.21,51:8.29,52:8.38,53:8.46,54:8.55,55:8.63,56:8.71,57:8.80,58:8.88,59:8.96,
    60:9.05,"60a":10.06,
  },
  "R": {
    1:0.11,2:0.22,3:0.32,4:0.43,5:0.54,6:0.65,7:0.75,8:0.86,9:0.97,
    10:1.08,"10a":1.92,11:2.03,12:2.13,13:2.24,14:2.35,15:2.46,16:2.56,17:2.67,18:2.78,19:2.89,
    20:2.99,"20a":3.83,21:3.94,22:4.05,23:4.16,24:4.27,25:4.37,26:4.48,27:4.59,28:4.70,29:4.80,
    30:4.91,"30a":5.95,31:6.06,32:6.17,33:6.28,34:6.38,35:6.49,36:6.60,37:6.71,38:6.81,39:6.92,
    40:7.03,"40a":8.08,41:8.19,42:8.30,43:8.40,44:8.51,45:8.62,46:8.73,47:8.83,48:8.94,49:9.05,
    50:9.16,"50a":10.42,51:10.52,52:10.63,53:10.74,54:10.85,55:10.96,56:11.06,57:11.17,58:11.28,59:11.39,
    60:11.49,"60a":12.74,61:12.85,62:12.96,63:13.07,64:13.18,65:13.28,66:13.39,67:13.50,68:13.61,69:13.71,
    70:13.82,"70a":15.08,
  },
  "SR": {
    1:0.14,2:0.27,3:0.41,4:0.54,5:0.68,6:0.82,7:0.95,8:1.09,9:1.23,
    10:1.36,"10a":2.37,11:2.51,12:2.64,13:2.78,14:2.92,15:3.05,16:3.16,17:3.32,18:3.46,19:3.60,
    20:3.73,"20a":4.75,21:4.89,22:5.03,23:5.16,24:5.30,25:5.43,26:5.57,27:5.71,28:5.84,29:5.98,
    30:6.12,"30a":7.38,31:7.51,32:7.65,33:7.78,34:7.92,35:8.06,36:8.19,37:8.33,38:8.46,39:8.60,
    40:8.74,"40a":10.01,41:10.14,42:10.28,43:10.42,44:10.55,45:10.69,46:10.82,47:10.96,48:11.10,49:11.23,
    50:11.37,"50a":12.89,51:13.02,52:13.16,53:13.30,54:13.43,55:13.57,56:13.71,57:13.84,58:13.98,59:14.11,
    60:14.25,"60a":15.77,61:15.91,62:16.04,63:16.18,64:16.32,65:16.45,66:16.59,67:16.75,68:16.86,69:17.00,
    70:17.13,"70a":18.65,71:18.79,72:18.92,73:19.06,74:19.20,75:19.33,76:19.47,77:19.61,78:19.74,79:19.88,
    80:20.01,"80a":21.78,
  },
  "SSR": {
    1:0.17,2:0.34,3:0.50,4:0.67,5:0.84,6:1.01,7:1.17,8:1.34,9:1.51,
    10:1.68,"10a":2.86,11:3.02,12:3.19,13:3.36,14:3.53,15:3.69,16:3.86,17:4.03,18:4.20,19:4.36,
    20:4.53,"20a":5.70,21:5.87,22:6.04,23:6.20,24:6.37,25:6.54,26:6.71,27:6.88,28:7.04,29:7.21,
    30:7.38,"30a":8.85,31:9.02,32:9.18,33:9.35,34:9.52,35:9.69,36:9.85,37:10.02,38:10.19,39:10.36,
    40:10.52,"40a":11.99,41:12.16,42:12.33,43:12.50,44:12.66,45:12.83,46:13.00,47:13.17,48:13.33,49:13.50,
    50:13.67,"50a":15.44,51:15.61,52:15.78,53:15.94,54:16.11,55:16.28,56:16.45,57:16.61,58:16.78,59:16.95,
    60:17.12,"60a":18.88,61:19.04,62:19.21,63:19.38,64:19.55,65:19.71,66:19.88,67:20.05,68:20.22,69:20.38,
    70:20.55,"70a":22.32,71:22.49,72:22.66,73:22.82,74:22.99,75:23.16,76:23.33,77:23.50,78:23.66,79:23.83,
    80:24.00,"80a":26.05,81:26.22,82:26.38,83:26.55,84:26.72,85:26.89,86:27.05,87:27.22,88:27.39,89:27.56,
    90:27.72,"90a":29.78,91:29.95,92:30.12,93:30.29,94:30.45,95:30.62,96:30.79,97:30.96,98:31.12,99:31.29,
    100:31.46,"100a":33.52,
  },
};

// ─── Troops Power per level per quality tier ─────────────────────────────────
// "Xa" keys = power AFTER advancing at level X
// Source: whiteoutsurvival.wiki — all same-quality pets share identical tables
const PET_POWER = {
  "C": {
    1:3600,2:7200,3:10800,4:14400,5:18000,6:21600,7:25200,8:28800,9:32400,
    10:36000,"10a":66240,
    11:69840,12:73440,13:77040,14:80640,15:84240,16:87840,17:91440,18:95040,19:98640,
    20:102960,"20a":136800,
    21:136800,22:140400,23:144000,24:147600,25:151200,26:154800,27:158400,28:162000,29:165600,
    30:169200,"30a":210240,
    31:210240,32:213840,33:217440,34:221040,35:224640,36:228240,37:231840,38:235440,39:239040,
    40:242640,"40a":280800,
    41:284400,42:288000,43:291600,44:295200,45:298800,46:302400,47:306000,48:309600,49:313200,
    50:316800,"50a":361440,
  },
  "N": {
    1:5760,2:12240,3:18000,4:24480,5:30240,6:36000,7:42480,8:48240,9:54000,
    10:60480,"10a":108720,
    11:114480,12:120960,13:126720,14:130480,15:138960,16:144720,17:150480,18:156960,19:162720,
    20:169200,"20a":223200,
    21:223200,22:228960,23:235440,24:241200,25:246960,26:253440,27:259200,28:264960,29:270720,
    30:277200,"30a":337680,
    31:344160,32:349920,33:356400,34:362160,35:367920,36:374400,37:380160,38:385920,39:392400,
    40:398160,"40a":458640,
    41:465120,42:470880,43:476640,44:483120,45:488880,46:494640,47:501120,48:506880,49:513360,
    50:518820,"50a":591120,
    51:596380,52:603360,53:609120,54:615600,55:621660,56:627120,57:633600,58:639360,59:645120,
    60:651900,"60a":724320,
  },
  "R": {
    1:7920,2:15840,3:23040,4:30960,5:38880,6:46800,7:54000,8:61920,9:69840,
    10:77760,"10a":138240,
    11:146160,12:153360,13:161280,14:169200,15:177120,16:184120,17:192240,18:200160,19:208080,
    20:215760,"20a":275760,
    21:283680,22:291600,23:299528,24:307440,25:314640,26:322560,27:330480,28:338400,29:345600,
    30:353520,"30a":428400,
    31:436320,32:444240,33:452160,34:459360,35:467280,36:475200,37:483120,38:490320,39:498240,
    40:506160,"40a":581760,
    41:589680,42:597600,43:604800,44:612720,45:620640,46:628560,47:635760,48:643680,49:651600,
    50:659520,"50a":750240,
    51:757440,52:765360,53:773280,54:781200,55:789120,56:796320,57:804240,58:812180,59:820080,
    60:827280,"60a":917280,
    61:925200,62:933120,63:941040,64:948960,65:956160,66:964080,67:972000,68:979920,69:987120,
    70:995040,"70a":1085760,
  },
  "SR": {
    1:10080,2:19440,3:29520,4:38880,5:48960,6:59040,7:68400,8:78480,9:88560,
    10:97920,"10a":170640,
    11:180720,12:190080,13:200160,14:210240,15:219600,16:229680,17:239040,18:249120,19:259200,
    20:268500,"20a":342000,
    21:352080,22:362160,23:371520,24:381040,25:390960,26:401040,27:411120,28:420480,29:430560,
    30:440640,"30a":531360,
    31:540720,32:550800,33:560160,34:570240,35:580320,36:589680,37:599760,38:609120,39:619200,
    40:629280,"40a":720720,
    41:730080,42:740160,43:750240,44:759600,45:769680,46:779040,47:789120,48:799200,49:808560,
    50:818640,"50a":928080,
    51:937440,52:947520,53:957600,54:966960,55:977040,56:987120,57:996480,58:1006580,59:1015920,
    60:1026000,"60a":1135440,
    61:1145520,62:1154880,63:1164960,64:1175040,65:1184400,66:1194480,67:1203840,68:1213920,69:1224000,
    70:1233360,"70a":1342800,
    71:1352880,72:1362240,73:1372320,74:1382400,75:1391760,76:1401840,77:1411920,78:1421280,79:1431360,
    80:1440720,"80a":1568160,
  },
  "SSR": {
    1:12240,2:24480,3:36000,4:48240,5:60480,6:72720,7:84240,8:96480,9:108720,
    10:120960,"10a":205920,
    11:217440,12:229680,13:241920,14:254160,15:265680,16:277920,17:290160,18:302400,19:313920,
    20:326160,"20a":410400,
    21:422640,22:434880,23:446400,24:458640,25:470880,26:483120,27:495360,28:506880,29:519120,
    30:531360,"30a":637200,
    31:649440,32:660960,33:673200,34:685440,35:697680,36:709200,37:721440,38:733680,39:745920,
    40:757440,"40a":863280,
    41:875520,42:887760,43:900000,44:911520,45:923760,46:936000,47:948240,48:959760,49:972000,
    50:984240,"50a":1116680,
    51:1123920,52:1136160,53:1147680,54:1159920,55:1172160,56:1184400,57:1195920,58:1208160,59:1220400,
    60:1232640,"60a":1359360,
    61:1370880,62:1383120,63:1395360,64:1407600,65:1419120,66:1431360,67:1443600,68:1455840,69:1467360,
    70:1479600,"70a":1607040,
    71:1619280,72:1631520,73:1634040,74:1655280,75:1667520,76:1679760,77:1692000,78:1703520,79:1715760,
    80:1728000,"80a":1875600,
    81:1887840,82:1899360,83:1911600,84:1923840,85:1936080,86:1947600,87:1959840,88:1972080,89:1984320,
    90:1995840,"90a":2144160,
    91:2156400,92:2168640,93:2180880,94:2192400,95:2204640,96:2216880,97:2229120,98:2240640,99:2252880,
    100:2265120,"100a":2413440,
  },
};

function getPetPower(quality, level, advanced) {
  const table = PET_POWER[quality];
  if (!table || !level) return null;
  const key = advanced ? `${level}a` : level;
  return table[key] ?? table[level] ?? null;
}

function getPetStat(quality, level, advanced) {
  const table = PET_STATS[quality];
  if (!table || !level) return null;
  const key = advanced ? `${level}a` : level;
  return table[key] ?? table[level] ?? null;
}

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
function getLevelOptions(maxLevel) {
  const opts = [0];
  for (let lv = 1; lv <= maxLevel; lv++) {
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
  const levelOpts = getLevelOptions(pet.maxLevel);
  const qColor = qualityColor(pet.quality);
  const hasAdv = d.level > 0 && d.level % 10 === 0; // advance available at every 10-level tier

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
              className="pet-select" style={sel}>
              {levelOpts.map(v => (
                <option key={v} value={v}>{v === 0 ? "Not Tamed" : v}</option>
              ))}
            </select>
            {/* Advanced toggle */}
            {d.level > 0 && d.level % 10 === 0 && (
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
                  className="pet-select" style={sel}>
                  {levelOpts.filter(v => v >= d.level).map(v => (
                    <option key={v} value={v}>{v === 0 ? "—" : v}</option>
                  ))}
                </select>
                {d.goalLevel > 0 && d.goalLevel % 10 === 0 && (
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

      {/* Current stat display */}
      {d.level > 0 && (() => {
        const baseStat  = getPetStat(pet.quality, d.level, false);
        const advStat   = getPetStat(pet.quality, d.level, true);
        const hasAdvStat = advStat !== null && advStat !== baseStat;
        const stat      = d.advanced && advStat !== null ? advStat : baseStat;

        const basePow   = getPetPower(pet.quality, d.level, false);
        const advPow    = getPetPower(pet.quality, d.level, true);
        const hasAdvPow = advPow !== null && advPow !== basePow;
        const power     = d.advanced && advPow !== null ? advPow : basePow;

        // Advancement power = delta between adv and base at current level
        // Sum of all advance deltas up to current level (including this one if advanced)
        // Simplified: just show current level's advance delta if advanced
        const advDelta = (d.advanced && advPow && basePow) ? (advPow - basePow) : 0;
        // Level power = base power at current level (pre-advance)
        const levelPow = basePow ?? 0;

        return stat !== null ? (
          <div style={{ padding:"10px 16px", background:C.accentBg,
            borderBottom:`1px solid ${C.accentDim}`,
            display:"flex", alignItems:"center", gap:24, flexWrap:"wrap" }}>

            {/* Troop A/D */}
            <div>
              <div style={{ fontSize:9, fontWeight:700, color:C.textDim,
                fontFamily:"'Space Mono',monospace", textTransform:"uppercase",
                letterSpacing:"1px", marginBottom:4 }}>Troop Buffs</div>
              <div style={{ display:"flex", gap:16 }}>
                {["Attack","Defense"].map(label => (
                  <div key={label} style={{ display:"flex", flexDirection:"column" }}>
                    <span style={{ fontSize:9, color:C.textDim,
                      fontFamily:"'Space Mono',monospace" }}>Troops' {label}</span>
                    <span style={{ fontSize:14, fontWeight:800, color:C.accent,
                      fontFamily:"Syne,sans-serif" }}>+{stat.toFixed(2)}%</span>
                    {hasAdvStat && !d.advanced && (
                      <span style={{ fontSize:9, color:C.green,
                        fontFamily:"'Space Mono',monospace" }}>
                        → +{advStat.toFixed(2)}% after Advance
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{ width:1, height:40, background:C.border }} />

            {/* Pet Power breakdown */}
            {power !== null && (
              <div>
                <div style={{ fontSize:9, fontWeight:700, color:C.textDim,
                  fontFamily:"'Space Mono',monospace", textTransform:"uppercase",
                  letterSpacing:"1px", marginBottom:4 }}>Pet Power</div>
                <div style={{ display:"flex", gap:20, alignItems:"flex-end" }}>
                  <div style={{ display:"flex", flexDirection:"column" }}>
                    <span style={{ fontSize:9, color:C.textDim,
                      fontFamily:"'Space Mono',monospace" }}>Level Power</span>
                    <span style={{ fontSize:13, fontWeight:700, color:C.textPri,
                      fontFamily:"Syne,sans-serif" }}>{levelPow.toLocaleString()}</span>
                  </div>
                  {d.advanced && advDelta > 0 && (
                    <div style={{ display:"flex", flexDirection:"column" }}>
                      <span style={{ fontSize:9, color:C.textDim,
                        fontFamily:"'Space Mono',monospace" }}>Advancement Power</span>
                      <span style={{ fontSize:13, fontWeight:700, color:C.green,
                        fontFamily:"Syne,sans-serif" }}>+{advDelta.toLocaleString()}</span>
                    </div>
                  )}
                  {!d.advanced && hasAdvPow && advPow && basePow && (
                    <div style={{ display:"flex", flexDirection:"column" }}>
                      <span style={{ fontSize:9, color:C.textDim,
                        fontFamily:"'Space Mono',monospace" }}>After Advance</span>
                      <span style={{ fontSize:13, fontWeight:700, color:C.green,
                        fontFamily:"Syne,sans-serif" }}>→ {advPow.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display:"flex", flexDirection:"column" }}>
                    <span style={{ fontSize:9, color:C.textDim,
                      fontFamily:"'Space Mono',monospace" }}>Total</span>
                    <span style={{ fontSize:14, fontWeight:800, color:C.accent,
                      fontFamily:"Syne,sans-serif" }}>{power.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {d.advanced && (
              <span style={{ fontSize:9, padding:"2px 8px", borderRadius:10,
                background:C.green+"22", color:C.green,
                border:`1px solid ${C.green}44`,
                fontFamily:"'Space Mono',monospace", fontWeight:700,
                alignSelf:"center" }}>✓ ADVANCED</span>
            )}
          </div>
        ) : null;
      })()}

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
  const [openCard, setOpenCard] = React.useState(null); // which pet card is expanded
  const [genFilter, setGenFilter] = useLocalStorage("pets-gen-filter", 7);

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

  // ── Live stat totals from all owned pets ──────────────────────────────────
  const statTotals = React.useMemo(() => {
    let troopAtk = 0, troopDef = 0;
    let infLeth = 0, infHp = 0;
    let lancLeth = 0, lancHp = 0;
    let markLeth = 0, markHp = 0;

    PETS.forEach(pet => {
      const d = getPet(pet.name);
      if (!d.level) return; // not tamed

      // Troops' Attack & Defense from PET_STATS
      const stat = getPetStat(pet.quality, d.level, d.advanced) ?? 0;
      troopAtk += stat;
      troopDef += stat;

      // Per-troop refinement sub-stats (user-entered)
      infLeth  += parseFloat(d.infLeth)  || 0;
      infHp    += parseFloat(d.infHp)    || 0;
      lancLeth += parseFloat(d.lancLeth) || 0;
      lancHp   += parseFloat(d.lancHp)   || 0;
      markLeth += parseFloat(d.markLeth) || 0;
      markHp   += parseFloat(d.markHp)   || 0;
    });

    return { troopAtk, troopDef, infLeth, infHp, lancLeth, lancHp, markLeth, markHp };
  }, [petData]);

  // Group pets by quality for section headers
  const groupOrder = ["SSR","SR","R","N","C"]; // SSR first, down to Common
  const groups = groupOrder.map(q => ({
    quality: q,
    label: qualityLabel(q),
    pets: PETS.filter(p => p.quality === q && p.gen <= genFilter),
  })).filter(g => g.pets.length > 0);

  const inputS = {
    background:"transparent", border:`1px solid ${C.border}`,
    borderRadius:5, color:C.textPri, padding:"4px 8px", fontSize:16,
    fontWeight:800, fontFamily:"Syne,sans-serif", outline:"none",
    width:"100%", textAlign:"left",
  };

  return (
    <div className="fade-in">

      {/* ── Pet Stat Totals ── */}
      {(() => {
        const { troopAtk, troopDef, infLeth, infHp, lancLeth, lancHp, markLeth, markHp } = statTotals;
        const anyTamed = PETS.some(p => (getPet(p.name).level || 0) > 0);
        if (!anyTamed) return null;
        const rows = [
          { label:"Troops' Attack",    value:troopAtk,  color:C.accent },
          { label:"Troops' Defense",   value:troopDef,  color:C.accent },
          { label:"Infantry Lethality",  value:infLeth,   color:C.blue   },
          { label:"Infantry Health",     value:infHp,     color:C.blue   },
          { label:"Lancer Lethality",    value:lancLeth,  color:C.green  },
          { label:"Lancer Health",       value:lancHp,    color:C.green  },
          { label:"Marksman Lethality",  value:markLeth,  color:C.amber  },
          { label:"Marksman Health",     value:markHp,    color:C.amber  },
        ];
        return (
          <div style={{ marginBottom:20, border:`1px solid ${C.border}`,
            borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"10px 16px", background:C.surface,
              borderBottom:`1px solid ${C.border}`,
              display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, fontWeight:800, color:C.textPri,
                fontFamily:"Syne,sans-serif" }}>Pet Stat Bonuses — All Pets</span>
              <span style={{ fontSize:10, color:C.textDim,
                fontFamily:"'Space Mono',monospace" }}>
                {PETS.filter(p => (getPet(p.name).level||0) > 0).length} / {PETS.length} tamed
              </span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
              background:C.card }}>
              {rows.map((row, i) => (
                <div key={row.label} style={{
                  display:"flex", alignItems:"center",
                  justifyContent:"space-between",
                  padding:"10px 16px",
                  borderBottom: i < rows.length - 2 ? `1px solid ${C.border}` : "none",
                  borderRight: i % 2 === 0 ? `1px solid ${C.border}` : "none",
                  background: i < 2 ? C.accentBg : "transparent",
                }}>
                  <span style={{ fontSize:12, color:C.textSec }}>{row.label}</span>
                  <span style={{ fontSize:13, fontWeight:800,
                    fontFamily:"'Space Mono',monospace",
                    color: row.value > 0 ? row.color : C.textDim }}>
                    {row.value > 0 ? `+${row.value.toFixed(2)}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Generation Filter ── */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <span style={{ fontSize:11, fontWeight:700, color:C.textDim,
          fontFamily:"'Space Mono',monospace", textTransform:"uppercase",
          letterSpacing:"1px" }}>Generation Filter</span>
        <div style={{ display:"flex", gap:6 }}>
          {[1,2,3,4,5,6,7].map(g => (
            <button key={g}
              onClick={() => setGenFilter(g)}
              style={{ padding:"4px 12px", borderRadius:6, fontSize:11,
                fontWeight:700, cursor:"pointer",
                fontFamily:"'Space Mono',monospace",
                background: genFilter >= g ? C.accentBg : "transparent",
                color:      genFilter >= g ? C.accent   : C.textDim,
                border:`1px solid ${genFilter >= g ? C.accentDim : C.border}`,
                transition:"all 0.15s" }}>
              Gen {g}
            </button>
          ))}
        </div>
        <span style={{ fontSize:10, color:C.textDim,
          fontFamily:"'Space Mono',monospace" }}>
          (showing up to Gen {genFilter})
        </span>
      </div>

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
        const qColor = qualityColor(group.quality);
        return (
          <div key={group.quality} style={{ marginBottom:20 }}>
            {/* Quality section header */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10,
              paddingBottom:8, borderBottom:`2px solid ${qColor}33` }}>
              <span style={{ fontSize:13, fontWeight:800, color:qColor,
                fontFamily:"'Space Mono',monospace", letterSpacing:"0.5px" }}>
                {group.label}
              </span>
              <span style={{ fontSize:10, color:C.textDim,
                fontFamily:"'Space Mono',monospace" }}>
                {group.pets.length} pet{group.pets.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Pet card grid */}
            <div style={{ display:"grid",
              gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:12 }}>
              {group.pets.map(pet => {
                const d = getPet(pet.name);
                const isOpen = openCard === pet.name;
                const isTamed = (d.level || 0) > 0;
                const curPower = isTamed
                  ? (getPetPower(pet.quality, d.level, d.advanced) ?? 0)
                  : null;
                const curStat = isTamed
                  ? (getPetStat(pet.quality, d.level, d.advanced) ?? 0)
                  : null;
                const pct = Math.round(((d.level || 0) / pet.maxLevel) * 100);
                const costs = calcPetCosts(pet.quality, d.level, d.advanced, d.goalLevel, d.goalAdv);
                const hasCost = costs.manual > 0 || costs.potion > 0 || costs.serum > 0;

                return (
                  <div key={pet.name} style={{
                    borderRadius:10, overflow:"hidden",
                    border:`1px solid ${isOpen ? qColor : C.border}`,
                    transition:"border-color 0.2s",
                    gridColumn: isOpen ? "1 / -1" : "auto",
                  }}>
                    {/* Card header — always visible */}
                    <div
                      onClick={() => setOpenCard(isOpen ? null : pet.name)}
                      style={{ background:C.card, padding:"14px 16px", cursor:"pointer",
                        borderBottom: isOpen ? `1px solid ${qColor}44` : "none",
                        display:"flex", alignItems:"center", gap:12,
                        transition:"background 0.15s", userSelect:"none" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.surface}
                      onMouseLeave={e => e.currentTarget.style.background = C.card}
                    >
                      {/* Quality badge avatar */}
                      <div style={{
                        width:42, height:42, borderRadius:8, flexShrink:0,
                        background:qColor+"22", border:`2px solid ${qColor}66`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:12, fontWeight:800, color:qColor,
                        fontFamily:"'Space Mono',monospace",
                      }}>
                        {pet.quality}
                      </div>

                      {/* Name + level bar */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                          <span style={{ fontSize:14, fontWeight:800, color:C.textPri,
                            fontFamily:"Syne,sans-serif" }}>
                            {pet.name}
                          </span>
                          {isTamed && d.advanced && (
                            <span style={{ fontSize:9, padding:"1px 5px", borderRadius:4,
                              background:C.amber+"22", color:C.amber,
                              border:`1px solid ${C.amber}44`,
                              fontFamily:"'Space Mono',monospace", fontWeight:700 }}>
                              ADV
                            </span>
                          )}
                          {pet.skillType === "combat" ? (
                            <span style={{ fontSize:9, padding:"1px 5px", borderRadius:4,
                              background:C.red+"22", color:C.red,
                              border:`1px solid ${C.red}33`,
                              fontFamily:"'Space Mono',monospace" }}>COMBAT</span>
                          ) : (
                            <span style={{ fontSize:9, padding:"1px 5px", borderRadius:4,
                              background:C.blue+"22", color:C.blue,
                              border:`1px solid ${C.blue}33`,
                              fontFamily:"'Space Mono',monospace" }}>UTILITY</span>
                          )}
                        </div>
                        <div style={{ fontSize:10, color:C.textDim,
                          fontFamily:"'Space Mono',monospace", marginBottom:5 }}>
                          Gen {pet.gen} · Max Lv {pet.maxLevel}
                        </div>
                        {/* Level progress bar */}
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ flex:1, height:4, borderRadius:2,
                            background:C.border, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${pct}%`,
                              background: pct >= 100 ? C.green : qColor,
                              borderRadius:2, transition:"width 0.3s" }} />
                          </div>
                          <span style={{ fontSize:10, color: isTamed ? qColor : C.textDim,
                            fontFamily:"'Space Mono',monospace", fontWeight:700, flexShrink:0 }}>
                            {isTamed ? `Lv ${d.level}` : "Not Tamed"}
                          </span>
                        </div>
                      </div>

                      {/* Right col: power + cost hint + chevron */}
                      <div style={{ textAlign:"right", flexShrink:0, minWidth:80 }}>
                        {curPower ? (
                          <div style={{ fontSize:11, fontWeight:700, color:qColor,
                            fontFamily:"'Space Mono',monospace" }}>
                            {(curPower/1000).toFixed(0)}K pwr
                          </div>
                        ) : (
                          <div style={{ fontSize:10, color:C.textDim,
                            fontFamily:"'Space Mono',monospace" }}>—</div>
                        )}
                        {curStat ? (
                          <div style={{ fontSize:10, color:C.textDim,
                            fontFamily:"'Space Mono',monospace" }}>
                            +{curStat.toFixed(2)}% A/D
                          </div>
                        ) : null}
                        {hasCost && (
                          <div style={{ fontSize:9, color:C.amber,
                            fontFamily:"'Space Mono',monospace", marginTop:2 }}>
                            {costs.manual}📖 goal
                          </div>
                        )}
                        <div style={{ fontSize:14, color:C.textDim, marginTop:4 }}>
                          {isOpen ? "▲" : "▼"}
                        </div>
                      </div>
                    </div>

                    {/* Expanded drawer */}
                    {isOpen && (
                      <PetDrawer
                        pet={pet}
                        data={getPet(pet.name)}
                        onChange={updates => setPet(pet.name, updates)}
                        inv={inv}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
