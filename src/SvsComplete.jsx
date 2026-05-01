import React, { useState, useMemo } from "react";
import { scheduleSync, _isGuest } from "./useLocalStorage.js";

function useIsMobile() {
  const [mobile, setMobile] = React.useState(() => window.innerWidth <= 768);
  React.useEffect(() => {
    const handler = () => setMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

const C = {
  bg:"var(--c-bg)", surface:"var(--c-surface)", card:"var(--c-card)",
  border:"var(--c-border)", borderHi:"var(--c-borderHi)",
  textPri:"var(--c-textPri)", textSec:"var(--c-textSec)", textDim:"var(--c-textDim)",
  accent:"var(--c-accent)", accentBg:"var(--c-accentBg)", accentDim:"var(--c-accentDim)",
  green:"var(--c-green)", blue:"var(--c-blue)", red:"var(--c-red)", amber:"var(--c-amber)",
};
const mono = { fontFamily:"'Space Mono',monospace" };
const fmt = n => n >= 1_000_000 ? (n/1_000_000).toFixed(2)+"M" : n >= 1000 ? (n/1000).toFixed(1)+"K" : String(Math.round(n));

// ─── Cost tables (embedded to avoid cross-module imports) ─────────────────────
const CG_LEVELS = [
  [1,"UC",0,15,1500,0],[2,"UC1★",0,40,3800,0],[3,"R",0,70,7000,0],[4,"R1★",0,95,9700,0],
  [5,"R2★",45,0,0,0],[6,"R3★",50,0,0,0],[7,"E",60,0,0,0],[8,"E1★",70,0,0,0],
  [9,"E2★",40,65,6500,0],[10,"E3★",50,80,8000,0],[11,"ET1",60,95,10000,0],[12,"ET1 1★",70,110,11000,0],
  [13,"ET1 2★",85,130,13000,0],[14,"ET1 3★",100,160,15000,0],[15,"M",40,220,22000,0],
  [16,"M1★",40,230,23000,0],[17,"M2★",45,250,25000,0],[18,"M3★",45,260,26000,0],
  [19,"MT1",45,280,28000,0],[20,"MT1 1★",55,280,28000,0],[21,"MT1 2★",55,320,32000,0],
  [22,"MT1 3★",55,340,35000,0],[23,"MT2",55,360,38000,0],[24,"MT2 1★",75,430,43000,0],
  [25,"MT2 2★",80,460,45000,0],[26,"MT2 3★",85,500,48000,0],[27,"L",21,132,12500,2],
  [28,"L+1",21,132,12500,2],[29,"L+2",21,132,12500,2],[30,"L+3",22,134,12500,4],
  [31,"L1★",22,140,13000,2],[32,"L1★+1",22,140,13000,2],[33,"L1★+2",22,140,13000,2],
  [34,"L1★+3",24,140,13000,4],[35,"L2★",23,147,13500,2],[36,"L2★+1",23,147,13500,2],
  [37,"L2★+2",23,147,13500,2],[38,"L2★+3",26,149,13500,4],[39,"L3★",25,155,14000,2],
  [40,"L3★+1",25,155,14000,2],[41,"L3★+2",25,155,14000,2],[42,"L3★+3",25,155,14000,4],
  [43,"LT1",27,167,14750,3],[44,"LT1+1",27,167,14750,3],[45,"LT1+2",27,167,14750,3],
  [46,"LT1+3",29,169,14750,6],[47,"LT1 1★",28,175,15250,3],[48,"LT1 1★+1",28,175,15250,3],
  [49,"LT1 1★+2",28,175,15250,3],[50,"LT1 1★+3",31,175,15250,6],
];
function cgCost(cur, goal) {
  let plans=0,polish=0,alloy=0,amber=0;
  for (let i=cur+1;i<=goal;i++) { const r=CG_LEVELS[i]; if(r){plans+=r[2];polish+=r[3];alloy+=r[4];amber+=r[5];} }
  return {plans,polish,alloy,amber};
}

const CC_LEVELS = [
  {g:5,d:5,s:0},{g:40,d:15,s:0},{g:60,d:40,s:0},{g:80,d:100,s:0},
  {g:25,d:50,s:0},{g:25,d:50,s:0},{g:25,d:50,s:0},{g:25,d:50,s:0},
  {g:30,d:75,s:0},{g:30,d:75,s:0},{g:30,d:75,s:0},{g:30,d:75,s:0},
  {g:35,d:100,s:0},{g:35,d:100,s:0},{g:35,d:100,s:0},{g:35,d:100,s:0},
  {g:50,d:100,s:0},{g:50,d:100,s:0},{g:50,d:100,s:0},{g:50,d:100,s:0},
  {g:75,d:100,s:0},{g:75,d:100,s:0},{g:75,d:100,s:0},{g:75,d:100,s:0},
  {g:105,d:105,s:0},{g:105,d:105,s:0},{g:105,d:105,s:0},{g:105,d:105,s:0},
  {g:112,d:84,s:0},{g:112,d:84,s:0},{g:112,d:84,s:0},{g:112,d:84,s:0},{g:112,d:84,s:0},
  {g:116,d:90,s:3},{g:116,d:90,s:3},{g:116,d:90,s:3},{g:116,d:90,s:3},{g:116,d:90,s:3},
  {g:116,d:90,s:6},{g:116,d:90,s:6},{g:116,d:90,s:6},{g:116,d:90,s:6},{g:116,d:90,s:6},
  {g:120,d:100,s:9},{g:120,d:100,s:9},{g:120,d:100,s:9},{g:120,d:100,s:9},{g:120,d:100,s:9},
  {g:120,d:100,s:14},{g:120,d:100,s:14},{g:120,d:100,s:14},{g:120,d:100,s:14},{g:120,d:100,s:14},
  {g:130,d:110,s:20},{g:130,d:110,s:20},{g:130,d:110,s:20},{g:130,d:110,s:20},{g:130,d:110,s:20},{g:130,d:110,s:20},
];
function ccCost(cur, goal) {
  let guides=0,designs=0,secrets=0;
  for (let i=cur;i<goal;i++) { const r=CC_LEVELS[i]; if(r){guides+=r.g;designs+=r.d;secrets+=r.s;} }
  return {guides,designs,secrets};
}

const EX_AFFINITY = {
  Cyrille:[0,1000,200,210,220,230,240,260,280,300,320,340,360,380,400,420,440,460,480,500,520,540,560,580,600,620,640,660,680,700,730,760,790,820,850,880,910,940,970,1000,1040,1080,1120,1160,1200,1240,1280,1320,1360,1400,1450,1500,1550,1600,1650,1700,1750,1800,1850,1900,1950,2000,2050,2100,2150,2200,2250,2300,2350,2400,2450,2500,2550,2600,2650,2700,2750,2800,2850,2900,2950,3000,3050,3100,3150,3200,3250,3300,3350,3400,3450,3500,3550,3600,3650,3700,3750,3800,3850,3900,3950],
  Agnes:  [0,1000,240,260,270,280,290,320,340,360,390,410,440,460,480,510,530,560,580,600,630,650,680,700,720,750,770,800,820,840,880,920,950,990,1020,1060,1100,1130,1170,1210,1250,1300,1350,1400,1440,1490,1540,1590,1640,1680,1740,1800,1860,1920,1980,2040,2100,2160,2220,2280,2340,2400,2460,2520,2580,2640,2700,2760,2820,2880,2940,3000,3060,3120,3180,3240,3300,3360,3420,3480,3540,3600,3660,3720,3780,3840,3900,3960,4020,4080,4140,4200,4260,4320,4380,4440,4500,4560,4620,4680,4740],
  Romulus:[0,1000,1100,1160,1210,1270,1320,1430,1540,1650,1760,1870,1980,2090,2200,2310,2420,2530,2640,2750,2860,2970,3080,3190,3300,3520,3620,3720,3820,3920,4020,4180,4350,4510,4680,4840,5000,5170,5330,5500,5720,5940,6160,6380,6600,6820,7040,7260,7480,7700,7980,8250,8530,8800,9080,9350,9630,9900,10180,10450,10730,11000,11280,11560,11830,12110,12380,12660,12930,13210,13480,13750,14030,14300,14580,14850,15130,15400,15680,15950,16230,16500,16780,17050,17330,17600,17880,18150,18430,18700,18980,19250,19530,19800,20080,20350,20630,20900,21180,21450,21730],
  Holger: [0,1000,600,630,660,690,720,780,840,900,960,1020,1080,1140,1200,1260,1320,1380,1440,1500,1560,1620,1680,1740,1800,1860,1920,1980,2040,2100,2190,2280,2370,2460,2550,2640,2730,2820,2910,3000,3120,3240,3360,3480,3600,3720,3840,3960,4080,4200,4350,4500,4650,4800,4950,5100,5250,5400,5550,5700,5850,6000,6150,6300,6450,6600,6750,6900,7050,7200,7350,7500,7650,7800,7950,8100,8250,8400,8550,8700,8850,9000,9150,9300,9450,9600,9750,9900,10050,10200,10350,10500,10650,10800,10950,11100,11250,11400,11550,11700,11850],
  Fabian: [0,1000,1000,1050,1100,1150,1200,1300,1400,1500,1600,1700,1800,1900,2000,2100,2200,2300,2400,2500,2600,2700,2800,2900,3000,3100,3200,3300,3400,3500,3650,3800,3950,4100,4250,4400,4550,4700,4850,5000,5200,5400,5600,5800,6000,6200,6400,6600,6800,7000,7250,7500,7750,8000,8250,8500,8750,9000,9250,9500,9750,10000,10250,10500,10750,11000,11250,11500,11750,12000,12250,12500,12750,13000,13250,13500,13750,14000,14250,14500,14750,15000,15250,15500,15750,16000,16250,16500,16750,17000,17250,17500,17750,18000,18250,18500,18750,19000,19250,19500,19750],
  Baldur: [0,1000,400,420,440,460,480,520,560,600,640,680,720,760,800,840,880,920,960,1000,1040,1080,1120,1160,1200,1240,1280,1320,1360,1400,1460,1520,1580,1640,1700,1760,1820,1880,1940,2000,2080,2160,2240,2320,2400,2480,2560,2640,2720,2800,2900,3000,3100,3200,3300,3400,3500,3600,3700,3800,3900,4000,4100,4200,4300,4400,4500,4600,4700,4800,4900,5000,5100,5200,5300,5400,5500,5600,5700,5800,5900,6000,6100,6200,6300,6400,6500,6600,6700,6800,6900,7000,7100,7200,7300,7400,7500,7600,7700,7800,7900],
  Valeria:[0,1000,1840,1940,2030,2120,2210,2400,2580,2760,2950,3130,3320,3500,3680,3870,4050,4240,4420,4600,4790,4970,5160,5340,5520,5710,5890,6080,6260,6440,6720,7000,7270,7550,7820,8100,8380,8650,8930,9200,9570,9940,10310,10680,11040,11410,11780,12150,12520,12880,13340,13800,14260,14720,15180,15640,16100,16560,17020,17480,17940,18400,18860,19320,19780,20240,20700,21160,21620,22080,22540,23000,23460,23920,24380,24840,25300,25760,26220,26680,27140,27600,28060,28520,28980,29440,29900,30360,30820,31280,31740,32200,32660,33120,33580,34040,34500,34960,35420,35880,36340],
  Ronne:  [0,1000,600,630,660,690,720,780,840,900,960,1020,1080,1140,1200,1260,1320,1380,1440,1500,1560,1620,1680,1740,1800,1860,1920,1980,2040,2100,2190,2280,2370,2460,2550,2640,2730,2820,2910,3000,3120,3240,3360,3480,3600,3720,3840,3960,4080,4200,4350,4500,4650,4800,4950,5100,5250,5400,5550,5700,5850,6000,6150,6300,6450,6600,6750,6900,7050,7200,7350,7500,7650,7800,7950,8100,8250,8400,8550,8700,8850,9000,9150,9300,9450,9600,9750,9900,10050,10200,10350,10500,10650,10800,10950,11100,11250,11400,11550,11700,11850],
  Kathy:  [0,1000,900,950,990,1040,1080,1170,1260,1350,1440,1530,1620,1710,1800,1890,1980,2070,2160,2250,2340,2430,2520,2610,2700,2790,2880,2970,3060,3150,3290,3420,3560,3690,3830,3960,4100,4230,4370,4500,4680,4860,5040,5220,5400,5580,5760,5940,6120,6300,6530,6750,6980,7200,7430,7650,7880,8100,8330,8550,8780,9000,9230,9450,9680,9900,10130,10350,10580,10800,11030,11250,11480,11700,11930,12150,12380,12600,12830,13050,13280,13500,13730,13950,14180,14400,14630,14850,15080,15300,15530,15750,15980,16200,16430,16650,16880,17100,17330,17550,17780],
};
const EX_AFFINITY_SIGILS = {
  Cyrille:[0,0,5,10,15,20,25,30,35,40,45,50],Agnes:[0,0,5,10,15,20,25,30,35,40,45,50],
  Romulus:[0,0,20,40,80,120,160,200,240,280,320,360],Holger:[0,0,8,16,24,32,40,48,56,64,72,80],
  Fabian:[0,0,12,24,36,48,60,72,84,96,108,120],Baldur:[0,0,6,12,18,24,30,36,42,48,54,60],
  Valeria:[0,0,20,40,60,80,100,120,140,160,180,200],Ronne:[0,0,8,16,24,32,40,48,56,64,72,80],
  Kathy:[0,0,10,20,30,40,50,60,70,80,90,100],
};
const EX_SKILL_BOOKS = {
  Cyrille:{sk1:[0,0,70,140,210,280,350,420,490,560,630],sk2:[0,0,400,800,1600,3200],sk3:[0,0,500,1000,2000,4000],sk4:[0,0,100,200,300,400,500,600,700,800,900]},
  Agnes:  {sk1:[0,0,500,1000,2000,4000],sk2:[0,0,400,800,1600,3200],sk3:[0,0,200,400,800,1600],sk4:[0,0,100,200,300,400,500,600,700,800,900]},
  Romulus:{sk1:[0,0,300,600,900,1200,1500,1800,2100,2400,2700],sk2:[0,0,500,1000,1500,2000,2500,3000,3500,4000,4500,5000,5500,6000,7000,8000,8000,9000,9000,10000,10000],sk3:[0,0,800,1500,2200,3000,3800,4500,5200,6000,6800,7500,8200,9000,10500,12000,12000,13500,13500,15000,15000],sk4:[0,0,800,1500,2200,3000,3800,4500,5200,6000,6800,7500,8200,9000,10500,12000,12000,13500,13500,15000,15000]},
  Holger: {sk1:[0,0,600,1200,1800,2400,3000,3600,4200,4800,5400],sk2:[0,0,300,600,900,1200,1500,1800,2100,2400,2700],sk3:[0,0,300,600,900,1200,1500,1800,2100,2400,2700],sk4:[0,0,600,1200,1800,2400,3000,3600,4200,4800,5400]},
  Fabian: {sk1:[0,0,300,600,900,1200,1500,1800,2100,2400,2700],sk2:[0,0,500,1000,1500,2000,2500,3000,3500,4000,4500],sk3:[0,0,200,500,700,1000,1200,1500,1700,2000,2300,2500,2700,3000,3500,4000,4000,4500,4500,5100,5100],sk4:[0,0,300,700,1000,1400,1800,2100,2400,2800,3200,3500,3800,4200,4900,5700,5700,6400,6400,7100,7100]},
  Baldur: {sk1:[0,0,300,600,900,1200,1500,1800,2100,2400,2700],sk2:[0,0,300,600,900,1200,1500,1800,2100,2400,2700],sk3:[0,0,300,600,900,1200,1500,1800,2100,2400,2700],sk4:[0,0,500,1000,1500,2000,2500,3000,3500,4000,4500]},
  Valeria:{sk1:[0,0,500,1000,1500,2000,2500,3000,3500,4000,4500],sk2:[0,0,500,1000,1500,2000,2500,3000,3500,4000,4500],sk3:[0,0,800,1500,2200,3000,3800,4500,5200,6000,6800,7500,8200,9000,10500,12000,12000,13500,13500,15000,15000],sk4:[0,0,800,1500,2200,3000,3800,4500,5200,6000,6800,7500,8200,9000,10500,12000,12000,13500,13500,15000,15000]},
  Ronne:  {sk1:[0,0,300,600,900,1200,1500,1800,2100,2400,2700],sk2:[0,0,300,600,900,1200,1500,1800,2100,2400,2700],sk3:[0,0,600,1200,1800,2400,3000,3600,4200,4800,5400],sk4:[0,0,1200,2400,3600,4800,6000,7200,8400,9600,10800]},
  Kathy:  {sk1:[0,0,300,600,900,1200,1500,1800,2100,2400,2700],sk2:[0,0,300,600,900,1200,1500,1800,2100,2400,2700],sk3:[0,0,1000,2000,3000,4000,5000,6000,7000,8000,9000],sk4:[0,0,1200,2400,3600,4800,6000,7200,8400,9600,10800]},
};
const EX_INVKEYS = {Cyrille:"cyrilleSigils",Agnes:"agnesSigils",Romulus:"romulusSigils",Holger:"holgerSigils",Fabian:"fabianSigils",Baldur:"baldurSigils",Valeria:"valeriaSigils",Ronne:"ronneSigils",Kathy:"kathySigils"};

// WA ids (used for cost lookup)
const WA_IDS = [
  {id:"flameSquad",label:"Flame Squad"},
  {id:"lethality",label:"Lethality"},{id:"defense",label:"Defense"},
  {id:"flameLegion",label:"Flame Legion"},{id:"attack",label:"Attack"},
  {id:"health",label:"Health"},{id:"helios",label:"Helios"},
  {id:"heliosHealing",label:"Helios Healing"},{id:"heliosTraining",label:"Helios Training"},
  {id:"heliosFirstAid",label:"Helios First Aid"},
];
const WA_TROOPS = ["Infantry","Lancer","Marksman"];
const EXPERT_NAMES = ["Cyrille","Agnes","Romulus","Holger","Fabian","Baldur","Valeria","Ronne","Kathy"];
const EXPERT_SKILL_KEYS = ["sk1","sk2","sk3","sk4"];

// ─── Build change list from localStorage ──────────────────────────────────────
function buildChangeList(scope) {
  const changes = [];
  // Read from sessionStorage for guests, localStorage for logged-in users
  // This matches the useLocalStorage hook's write behavior
  const getLS = k => {
    try {
      const store = _isGuest ? sessionStorage : localStorage;
      const v = store.getItem(k);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  };
  const inScope = tab => !scope || scope==="all" || scope===tab;

  // Chief Gear
  if (inScope("chief-gear")) {
    const slots = getLS("cg-slots") || [];
    slots.forEach(s => {
      if (s.goal > s.current) {
        const cost = cgCost(s.current, s.achieved ?? s.goal);
        changes.push({ tab:"chief-gear", section:"Chief Gear", key:`cg:${s.piece}`,
          label:s.piece, cur:s.current, goal:s.goal, achieved:s.goal,
          materials:{ chiefPlans:cost.plans, chiefPolish:cost.polish, chiefAlloy:cost.alloy, chiefAmber:cost.amber } });
      }
    });
  }

  // Chief Charms
  if (inScope("chief-charms")) {
    const slots = getLS("cc-slots") || [];
    slots.forEach(s => {
      if (s.goal > s.current) {
        const cost = ccCost(s.current, s.goal);
        changes.push({ tab:"chief-charms", section:"Chief Charms", key:`cc:${s.charm}`,
          label:`${s.gear} — ${s.charm}`, cur:s.current, goal:s.goal, achieved:s.goal,
          materials:{ charmGuides:cost.guides, charmDesigns:cost.designs, charmSecrets:cost.secrets } });
      }
    });
  }

  // Experts
  if (inScope("experts")) {
    const expertData = getLS("experts-data") || {};
    EXPERT_NAMES.forEach(name => {
      const d = expertData[name] || {};
      const curLv = Number(d.level ?? 0), goalLv = Number(d.goalLevel ?? curLv);
      if (goalLv > curLv) {
        const arr = EX_AFFINITY[name] || [];
        let affinity = 0;
        for (let i=curLv+1;i<=goalLv;i++) affinity += (arr[i]||0);
        changes.push({ tab:"experts", section:"Experts", key:`ex:${name}:level`,
          label:`${name} — Level`, cur:curLv, goal:goalLv, achieved:goalLv,
          materials:{ exAffinity:affinity } });
      }
      const curB = Number(d.affinity ?? 0), goalB = Number(d.goalAffinity ?? curB);
      if (goalB > curB) {
        const arr = EX_AFFINITY_SIGILS[name] || [];
        let sigils = 0;
        for (let i=curB+1;i<=goalB;i++) sigils += (arr[i]||0);
        const invKey = EX_INVKEYS[name] || "generalSigils";
        changes.push({ tab:"experts", section:"Experts", key:`ex:${name}:affinity`,
          label:`${name} — Relationship Level`, cur:curB, goal:goalB, achieved:goalB,
          materials:{ [invKey]: sigils } });
      }
      EXPERT_SKILL_KEYS.forEach(sk => {
        const curSk = Number(d[`${sk}Level`]??0), goalSk = Number(d[`${sk}Goal`]??curSk);
        if (goalSk > curSk) {
          const arr = EX_SKILL_BOOKS[name]?.[sk] || [];
          let books = 0;
          for (let i=curSk+1;i<=goalSk;i++) books += (arr[i]||0);
          changes.push({ tab:"experts", section:"Experts", key:`ex:${name}:${sk}`,
            label:`${name} — Skill ${sk.replace("sk","")}`, cur:curSk, goal:goalSk, achieved:goalSk,
            materials:{ books } });
        }
      });
    });
  }

  // Pets
  if (inScope("pets")) {
    const petData = getLS("pets-data") || {};
    // PET_COSTS structure - simplified cost lookup
    const PET_COSTS = {
      "C": {10:{food:1715,"10.1":{manual:15,svs:500}},20:{food:3180,"20.1":{manual:30,svs:1000}},30:{food:5010,"30.1":{manual:45,potion:10,svs:2000}},40:{food:7660,"40.1":{manual:60,potion:20,svs:3000}},50:{food:11310,"50.1":{manual:90,potion:30,serum:10,svs:4500}}},
      "N": {10:{food:2530},20:{food:5360},30:{food:9020,"30.1":{manual:60,potion:10}},40:{food:14320,"40.1":{manual:90,potion:20}},50:{food:21620,"50.1":{manual:130,potion:30,serum:10}},60:{food:30920,"60.1":{manual:175,potion:50,serum:20}}},
      "R": {10:{food:3795},20:{food:8040},30:{food:13530},40:{food:21480,"40.1":{manual:100,potion:20}},50:{food:32430,"50.1":{manual:155,potion:30,serum:10}},60:{food:46380,"60.1":{manual:200,potion:50,serum:20}},70:{food:63300,"70.1":{manual:255,potion:80,serum:40}}},
      "SR":{10:{food:5060},20:{food:10720},30:{food:18040},40:{food:28640},50:{food:43240,"50.1":{manual:190,potion:30,serum:10}},60:{food:61840,"60.1":{manual:250,potion:50,serum:20}},70:{food:84400,"70.1":{manual:310,potion:80,serum:40}},80:{food:108480,"80.1":{manual:380,potion:100,serum:60}}},
      "SSR":{10:{food:6325},20:{food:13400},30:{food:22550},40:{food:35800},50:{food:54050,"50.1":{manual:220,potion:50,serum:10}},60:{food:77300,"60.1":{manual:290,potion:65,serum:20}},70:{food:105500,"70.1":{manual:365,potion:85,serum:40}},80:{food:135600,"80.1":{manual:440,potion:100,serum:60}},90:{food:172000,"90.1":{manual:585,potion:115,serum:80}},100:{food:212100,"100.1":{manual:730,potion:135,serum:100}}},
    };
    // lookup pet quality from PETS list
    const PETS_Q = {"Cave Hyena":"C","Arctic Wolf":"N","Musk Ox":"N","Giant Tapir":"R","Titan Roc":"R","Giant Elk":"SR","Snow Leopard":"SR","Cave Lion":"SSR","Snow Ape":"SSR","Iron Rhino":"SSR","Sabertooth Tiger":"SSR","Mammoth":"SSR","Frost Gorilla":"SSR","Frostscale Chameleon":"SSR"};
    Object.entries(petData).forEach(([name, d]) => {
      if (!d) return;
      const curLv = d.level || 0, goalLv = d.goalLevel || 0;
      if (goalLv > curLv) {
        const q = PETS_Q[name] || "SSR";
        const costs = PET_COSTS[q] || {};
        let manual=0,potion=0,serum=0;
        const allKeys = Object.keys(costs).sort((a,b)=>parseFloat(a)-parseFloat(b));
        const curPos = curLv + (d.advanced?0.1:0), goalPos = goalLv + (d.goalAdv?0.1:0);
        for (const key of allKeys) {
          const lv = parseFloat(key);
          if (lv<=curPos||lv>goalPos) continue;
          const c = typeof costs[key]==="object"?costs[key]:{};
          manual += c.manual||0; potion += c.potion||0; serum += c.serum||0;
        }
        changes.push({ tab:"pets", section:"Pets", key:`pet:${name}:level`,
          label:`${name} — Level`, cur:curLv, goal:goalLv, achieved:goalLv,
          materials:{ tamingManuals:manual, energizingPotion:potion, strengtheningSerum:serum } });
      }
    });
  }

  // War Academy
  if (inScope("war-academy")) {
    const waLevels = getLS("wa-levels") || {};
    const waData = getLS("wa-research-data"); // cached if available
    WA_TROOPS.forEach(troop => {
      const troopData = waLevels[troop] || {};
      WA_IDS.forEach(({id, label}) => {
        const {cur=0,goal=0} = troopData[id] || {};
        if (goal > cur) {
          // WA shards/steel costs vary by research — use 0 if lookup unavailable
          // The modal shows the changes; users know WA costs from the WA tab
          changes.push({ tab:"war-academy", section:"War Academy", key:`wa:${troop}:${id}`,
            label:`${troop} — ${label}`, cur, goal, achieved:goal,
            materials:{ shards:0, steel:0 }, // WA costs require full WA data structure; show 0
            note:"Check War Academy tab for material costs" });
        }
      });
    });
  }

  // Research Center
  if (inScope("research-center")) {
    const rcLevels = getLS("rc-levels") || {};
    Object.entries(rcLevels).forEach(([id, {cur=0,goal=0}={}]) => {
      if (goal > cur) {
        const label = id.replace(/([A-Z])/g," $1").replace(/([0-9]+)/g," $1").trim();
        changes.push({ tab:"research-center", section:"Research Center", key:`rc:${id}`,
          label, cur, goal, achieved:goal,
          materials:{}, // RC raw material costs vary widely; shown in RC tab
          note:"Check Research Center for material costs" });
      }
    });
  }

  // Hero Gear
  if (inScope("hero-gear")) {
    let heroData = [];
    const teamsRaw = getLS("hg-teams");
    if (teamsRaw?.teams) heroData = Object.values(teamsRaw.teams).flat();
    else heroData = getLS("hg-heroes") || [];
    heroData.forEach(hd => {
      if (!hd?.hero) return;
      (hd.slots||[]).forEach((s,si) => {
        if (!s) return;
        const slotName = ["Goggles","Gloves","Belt","Boots","Widget"][si] || `Slot ${si}`;
        if (si<4) {
          if ((s.gearGoal??0)>(s.gearCurrent??0)) {
            changes.push({ tab:"hero-gear", section:"Hero Gear", key:`hg:${hd.hero}:${si}:gear`,
              label:`${hd.hero} — ${slotName} Gear`, cur:s.gearCurrent??0, goal:s.gearGoal??0, achieved:s.gearGoal??0,
              materials:{ mithril:0 }, note:"Check Hero Gear tab" });
          }
          if ((s.masteryGoal??0)>(s.masteryCurrent??0)) {
            changes.push({ tab:"hero-gear", section:"Hero Gear", key:`hg:${hd.hero}:${si}:mastery`,
              label:`${hd.hero} — ${slotName} Mastery`, cur:s.masteryCurrent??0, goal:s.masteryGoal??0, achieved:s.masteryGoal??0,
              materials:{ stones:0 }, note:"Check Hero Gear tab" });
          }
          if (s.goalStatus && s.goalStatus!==s.status && s.goalStatus!=="") {
            changes.push({ tab:"hero-gear", section:"Hero Gear", key:`hg:${hd.hero}:${si}:status`,
              label:`${hd.hero} — ${slotName} Status`, cur:s.status||"Mythic", goal:s.goalStatus, achieved:s.goalStatus, isText:true,
              materials:{} });
          }
        } else if ((s.widgetGoal??0)>(s.widgetCurrent??0)) {
          changes.push({ tab:"hero-gear", section:"Hero Gear", key:`hg:${hd.hero}:widget`,
            label:`${hd.hero} — Widget`, cur:s.widgetCurrent??0, goal:s.widgetGoal??0, achieved:s.widgetGoal??0,
            materials:{} });
        }
      });
    });
  }

  return changes;
}

// ─── Aggregate material totals across all changes ─────────────────────────────
function sumMaterials(changes) {
  const totals = {};
  changes.forEach(c => {
    Object.entries(c.materials||{}).forEach(([k,v]) => {
      totals[k] = (totals[k]||0) + (Number(v)||0);
    });
  });
  return totals;
}

// ─── Apply changes to localStorage ───────────────────────────────────────────
function applyChanges(finalList, userId, charId) {
  const getLS = k => { try{const store=_isGuest?sessionStorage:localStorage;const v=store.getItem(k);return v?JSON.parse(v):null;}catch{return null;} };
  const setLS = (k,v) => { try{const store=_isGuest?sessionStorage:localStorage;store.setItem(k,JSON.stringify(v));}catch{} };
  const sync = (k,v) => { if(!_isGuest&&userId&&charId) scheduleSync(k,v); };
  const map = Object.fromEntries(finalList.map(c=>[c.key,c.achieved]));

  const cgChanged = finalList.some(c=>c.tab==="chief-gear");
  if (cgChanged) {
    const slots=(getLS("cg-slots")||[]).map(s=>{const a=map[`cg:${s.piece}`];return a!==undefined?{...s,current:a,goal:a}:s;});
    setLS("cg-slots",slots); sync("cg-slots",slots);
  }
  const ccChanged = finalList.some(c=>c.tab==="chief-charms");
  if (ccChanged) {
    const slots=(getLS("cc-slots")||[]).map(s=>{const a=map[`cc:${s.charm}`];return a!==undefined?{...s,current:a,goal:a}:s;});
    setLS("cc-slots",slots); sync("cc-slots",slots);
  }
  const exChanged = finalList.some(c=>c.tab==="experts");
  if (exChanged) {
    const ed=getLS("experts-data")||{};
    finalList.filter(c=>c.tab==="experts").forEach(c=>{
      const[,name,field]=c.key.split(":");
      if(!ed[name])ed[name]={};
      if(field==="level"){ed[name].level=c.achieved;ed[name].goalLevel=c.achieved;}
      else if(field==="affinity"){ed[name].affinity=c.achieved;ed[name].goalAffinity=c.achieved;}
      else if(field.startsWith("sk")){ed[name][`${field}Level`]=c.achieved;ed[name][`${field}Goal`]=c.achieved;}
    });
    setLS("experts-data",ed); sync("experts-data",ed);
  }
  const petsChanged = finalList.some(c=>c.tab==="pets");
  if (petsChanged) {
    const pd=getLS("pets-data")||{};
    finalList.filter(c=>c.tab==="pets").forEach(c=>{
      const[,name,field]=c.key.split(":");
      if(!pd[name])pd[name]={};
      if(field==="level"){pd[name].level=c.achieved;pd[name].goalLevel=c.achieved;}
    });
    setLS("pets-data",pd); sync("pets-data",pd);
  }
  const waChanged = finalList.some(c=>c.tab==="war-academy");
  if (waChanged) {
    const wl=JSON.parse(JSON.stringify(getLS("wa-levels")||{}));
    finalList.filter(c=>c.tab==="war-academy").forEach(c=>{
      const[,troop,id]=c.key.split(":");
      if(!wl[troop])wl[troop]={};
      wl[troop][id]={cur:c.achieved,goal:c.achieved};
    });
    setLS("wa-levels",wl); sync("wa-levels",wl);
  }
  const rcChanged = finalList.some(c=>c.tab==="research-center");
  if (rcChanged) {
    const rl={...getLS("rc-levels")||{}};
    finalList.filter(c=>c.tab==="research-center").forEach(c=>{
      const id=c.key.replace("rc:","");
      rl[id]={cur:c.achieved,goal:c.achieved};
    });
    setLS("rc-levels",rl); sync("rc-levels",rl);
  }
  const hgChanged = finalList.some(c=>c.tab==="hero-gear");
  if (hgChanged) {
    const teamsRaw=getLS("hg-teams");
    if(teamsRaw?.teams){
      const ut=JSON.parse(JSON.stringify(teamsRaw));
      finalList.filter(c=>c.tab==="hero-gear").forEach(c=>{
        const parts=c.key.split(":");const hn=parts[1],siStr=parts[2],field=parts[3];
        Object.keys(ut.teams).forEach(l=>{
          ut.teams[l]=ut.teams[l].map(hd=>{
            if(hd.hero!==hn)return hd;
            return{...hd,slots:hd.slots.map((s,si)=>{
              if(siStr==="widget"&&si===4)return{...s,widgetCurrent:c.achieved,widgetGoal:c.achieved};
              if(si===Number(siStr)){
                const u={...s};
                if(field==="gear"){u.gearCurrent=c.achieved;u.gearGoal=c.achieved;}
                if(field==="mastery"){u.masteryCurrent=c.achieved;u.masteryGoal=c.achieved;}
                if(field==="status"){u.status=c.achieved;u.goalStatus=c.achieved;}
                return u;
              }
              return s;
            })};
          });
        });
      });
      setLS("hg-teams",ut); sync("hg-teams",ut);
    }
  }

  // Deduct materials from inventory
  const matTotals = sumMaterials(finalList);
  if (Object.keys(matTotals).length > 0) {
    const inv = getLS("wos-svs-inventory") || {};
    const updated = { ...inv };
    Object.entries(matTotals).forEach(([k, cost]) => {
      if (!cost) return;
      // steel and raw materials stored in M units
      if (["steel","meat","wood","coal","iron"].includes(k)) {
        updated[k] = Math.max(0, (Number(updated[k])||0) - cost/1_000_000);
      } else {
        updated[k] = Math.max(0, (Number(updated[k])||0) - cost);
      }
    });
    setLS("wos-svs-inventory", updated);
    sync("wos-svs-inventory",updated);
  }

  // Fire wos-char-ready — this re-triggers readFromLocal() in every mounted useLocalStorage hook
  // (wos-user-ready uses { once:true } so it won't fire again; wos-char-ready has no such limit)
  window.dispatchEvent(new CustomEvent("wos-char-ready"));
}

// ─── Material label map ───────────────────────────────────────────────────────
const MAT_LABELS = {
  chiefPlans:"Chief Plans", chiefPolish:"Chief Polish", chiefAlloy:"Chief Alloy", chiefAmber:"Chief Amber",
  charmGuides:"Charm Guides", charmDesigns:"Charm Designs", charmSecrets:"Charm Secrets",
  books:"Books of Knowledge",
  cyrilleSigils:"Cyrille Sigils", agnesSigils:"Agnes Sigils", romulusSigils:"Romulus Sigils",
  holgerSigils:"Holger Sigils", fabianSigils:"Fabian Sigils", baldurSigils:"Baldur Sigils",
  valeriaSigils:"Valeria Sigils", ronneSigils:"Ronne Sigils", kathySigils:"Kathy Sigils",
  generalSigils:"General Sigils", exAffinity:"Affinity (Expert leveling)",
  tamingManuals:"Taming Manuals", energizingPotion:"Energizing Potions", strengtheningSerum:"Strengthening Serum",
  shards:"Research Shards", steel:"Steel (M)", stones:"Mastery Stones", mithril:"Mithril",
};
const MAT_ICON = {
  chiefPlans:"📋", chiefPolish:"🪡", chiefAlloy:"⚙️", chiefAmber:"🟡",
  charmGuides:"📖", charmDesigns:"✏️", charmSecrets:"🔮",
  books:"📚", cyrilleSigils:"🔶", agnesSigils:"🔶", romulusSigils:"🔶",
  holgerSigils:"🔶", fabianSigils:"🔶", baldurSigils:"🔶", valeriaSigils:"🔶",
  ronneSigils:"🔶", kathySigils:"🔶", generalSigils:"🔶", exAffinity:"🔐",
  tamingManuals:"📖", energizingPotion:"🧪", strengtheningSerum:"💉",
  shards:"💠", steel:"🔩", stones:"🪨", mithril:"⚗️",
};

function SectionDivider({ label }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,margin:"14px 0 6px"}}>
      <div style={{flex:1,height:1,background:C.border}}/>
      <span style={{fontSize:10,fontWeight:800,color:C.textDim,letterSpacing:"1.5px",
        textTransform:"uppercase",...mono,flexShrink:0}}>{label}</span>
      <div style={{flex:1,height:1,background:C.border}}/>
    </div>
  );
}

export function SvsCompleteModal({ open, onClose, scope, userId, charId }) {
  const initialChanges = useMemo(()=>buildChangeList(scope),[open,scope]);
  const [changes, setChanges] = useState(initialChanges);
  const isMobile = useIsMobile();
  if (!open) return null;

  const updateAchieved = (key, val) =>
    setChanges(prev => prev.map(c => c.key===key ? {...c, achieved:val} : c));

  const handleAccept = () => { applyChanges(changes, userId, charId); onClose(); };

  const sections = {};
  changes.forEach(c => { if(!sections[c.section])sections[c.section]=[]; sections[c.section].push(c); });
  const sectionOrder = ["Construction","Chief Gear","Chief Charms","Experts","Pets","War Academy","Research Center","Hero Gear"];
  const orderedSections = sectionOrder.filter(s=>sections[s]);
  const matTotals = sumMaterials(changes);
  const nonZeroMats = Object.entries(matTotals).filter(([,v])=>v>0);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}
      onClick={onClose}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,
        width:"100%",maxWidth:720,maxHeight:"90vh",display:"flex",flexDirection:"column",
        boxShadow:"0 24px 80px rgba(0,0,0,0.5)"}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{padding:"18px 24px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:17,fontWeight:800,color:C.textPri,fontFamily:"Syne,sans-serif",marginBottom:2}}>
                ⚔️ Complete Upgrades
                {scope&&scope!=="all"&&<span style={{fontSize:11,fontWeight:400,color:C.textDim,marginLeft:10,...mono}}>
                  ({scope.replace(/-/g," ").replace(/\b\w/g,l=>l.toUpperCase())} only)</span>}
              </div>
              <div style={{fontSize:11,color:C.textDim}}>
                Review changes, adjust any you didn't fully achieve, then accept.
              </div>
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",color:C.textDim,fontSize:20,cursor:"pointer",padding:4}}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"8px 24px 16px"}}>
          {changes.length===0 ? (
            <div style={{textAlign:"center",padding:"40px 0",color:C.textDim,fontSize:13,...mono}}>
              No goals set — nothing to complete!
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 54px 54px 80px":"1fr 72px 72px 110px",
                gap:8,padding:"8px 0 4px",borderBottom:`1px solid ${C.border}`,marginBottom:4}}>
                {["Field","Current","Goal","Achieved"].map((h,i)=>(
                  <div key={h} style={{fontSize:10,fontWeight:700,color:i===3?C.accent:C.textDim,
                    ...mono,textTransform:"uppercase",letterSpacing:"1px",
                    textAlign:i===0?"left":"center"}}>{h}</div>
                ))}
              </div>

              {orderedSections.map(sectionName => (
                <React.Fragment key={sectionName}>
                  <SectionDivider label={sectionName} />
                  {sections[sectionName].map(c => (
                    <div key={c.key} style={{display:"grid",gridTemplateColumns:isMobile?"1fr 54px 54px 80px":"1fr 72px 72px 110px",
                      gap:8,alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${C.border}22`}}>
                      <div style={{fontSize:11,color:C.textSec,...mono,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.label}</div>
                      <div style={{fontSize:11,color:C.textDim,...mono,textAlign:"center"}}>{c.cur}</div>
                      <div style={{fontSize:11,color:C.green,...mono,textAlign:"center",fontWeight:700}}>{c.goal}</div>
                      <div style={{display:"flex",justifyContent:"center"}}>
                        {c.isText ? (
                          <select value={c.achieved} onChange={e=>updateAchieved(c.key,e.target.value)}
                            style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:5,
                              color:C.textPri,padding:"2px 4px",fontSize:10,...mono,outline:"none",cursor:"pointer"}}>
                            <option value="Mythic">Mythic</option>
                            <option value="Legendary">Legendary</option>
                          </select>
                        ) : (
                          <input type="number" min={c.cur} max={c.goal} value={c.achieved}
                            onChange={e=>{const v=Number(e.target.value);updateAchieved(c.key,Math.max(c.cur,Math.min(c.goal,v)));}}
                            style={{background:C.surface,border:`1px solid ${C.accentDim}`,borderRadius:5,
                              color:C.accent,padding:"3px 4px",fontSize:12,...mono,outline:"none",
                              width:90,textAlign:"center",fontWeight:700}}/>
                        )}
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              ))}

              {/* Materials Summary */}
              {nonZeroMats.length > 0 && (
                <>
                  <SectionDivider label="Materials Consumed" />
                  <div style={{background:C.surface,borderRadius:8,border:`1px solid ${C.border}`,
                    padding:"12px 16px"}}>
                    <div style={{fontSize:10,color:C.textDim,...mono,marginBottom:8,letterSpacing:"0.5px"}}>
                      These will be deducted from your inventory upon acceptance.
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 16px"}}>
                      {nonZeroMats.map(([k,v])=>(
                        <div key={k} style={{display:"flex",justifyContent:"space-between",
                          alignItems:"center",padding:"3px 0"}}>
                          <span style={{fontSize:11,color:C.textSec}}>
                            {MAT_ICON[k]||"•"} {MAT_LABELS[k]||k}
                          </span>
                          <span style={{fontSize:12,fontWeight:700,...mono,
                            color:C.accent}}>{fmt(v)}</span>
                        </div>
                      ))}
                    </div>
                    {changes.some(c=>c.note) && (
                      <div style={{marginTop:8,fontSize:10,color:C.textDim,...mono,
                        borderTop:`1px solid ${C.border}`,paddingTop:6}}>
                        ℹ️ Some tabs show 0 for complex costs — check those tabs for detailed material needs.
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:"12px 24px",borderTop:`1px solid ${C.border}`,
          display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,gap:10}}>
          <div style={{fontSize:11,color:C.textDim,...mono}}>
            {changes.length} change{changes.length!==1?"s":""} · {orderedSections.length} section{orderedSections.length!==1?"s":""}
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{padding:"8px 18px",borderRadius:7,cursor:"pointer",
              border:`1px solid ${C.border}`,background:"transparent",color:C.textSec,fontSize:12,fontWeight:600}}>
              Cancel
            </button>
            <button onClick={handleAccept} disabled={changes.length===0} style={{
              padding:"8px 22px",borderRadius:7,cursor:changes.length===0?"not-allowed":"pointer",
              border:"none",background:changes.length===0?C.border:C.accent,
              color:changes.length===0?C.textDim:C.bg,fontSize:13,fontWeight:800,
              fontFamily:"Syne,sans-serif",opacity:changes.length===0?0.5:1}}>
              ✓ Accept & Complete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SvsCompleteModal;
