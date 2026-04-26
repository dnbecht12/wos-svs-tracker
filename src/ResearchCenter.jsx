import React, { useState, useMemo } from "react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtSecs(s) {
  if (!s || s <= 0) return "—";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (sec > 0 && d === 0) parts.push(`${sec}s`);
  return parts.join(" ") || "—";
}

function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (abs >= 1000) return (n / 1000).toFixed(1) + "K";
  return Math.round(n).toLocaleString();
}

// ─── Research Data ────────────────────────────────────────────────────────────
// Format: levels array = [{meat,wood,coal,iron,steel,secs,power,buff}, ...]
// Level index = actual level (1-based), index 0 = level 0 (nothing)

const RC = {
  Growth: {
    tiers: [
      {
        tier: "I", minRCLevel: 4,
        researches: [
          { id:"toolingUp1", name:"Tooling Up I", levels:[
            {},{meat:2700,wood:2700,coal:540,iron:130,steel:160,secs:2,power:2000,buff:"+0.40% Construction Speed"},
            {meat:3700,wood:3700,coal:750,iron:180,steel:220,secs:40,power:2000,buff:"+0.40% Construction Speed"},
            {meat:8100,wood:8100,coal:1600,iron:400,steel:480,secs:108,power:2500,buff:"+0.50% Construction Speed"},
          ]},
          { id:"wardExp1", name:"Ward Expansion I", levels:[
            {},{meat:670,wood:670,coal:130,iron:30,steel:40,secs:13,power:1080,buff:"+540 Infirmary Capacity"},
            {meat:940,wood:940,coal:180,iron:40,steel:50,secs:20,power:1080,buff:"+540 Infirmary Capacity"},
            {meat:2000,wood:2000,coal:400,iron:100,steel:120,secs:54,power:1440,buff:"+720 Infirmary Capacity"},
          ]},
          { id:"campExp1", name:"Camp Expansion I", levels:[
            {},{meat:2000,wood:2000,coal:400,iron:100,steel:120,secs:27,power:1300,buff:"+2 Training Capacity"},
            {meat:2800,wood:2800,coal:560,iron:140,steel:160,secs:40,power:1300,buff:"+2 Training Capacity"},
            {meat:6000,wood:6000,coal:1200,iron:300,steel:360,secs:108,power:1950,buff:"+3 Training Capacity"},
          ]},
          { id:"toolEnhance1", name:"Tool Enhancement I", levels:[
            {},{meat:2200,wood:2200,coal:450,iron:110,steel:140,secs:35,power:2000,buff:"+0.40% Research Speed"},
            {meat:3200,wood:3200,coal:640,iron:160,steel:190,secs:52,power:2000,buff:"+0.40% Research Speed"},
            {meat:6800,wood:6800,coal:1300,iron:340,steel:420,secs:140,power:2500,buff:"+0.50% Research Speed"},
          ]},
          { id:"bandaging1", name:"Bandaging I", levels:[
            {},{meat:6700,wood:6700,coal:1300,iron:330,steel:400,secs:94,power:4600,buff:"+4.60% Healing Speed"},
            {meat:9400,wood:9400,coal:1800,iron:470,steel:560,secs:141,power:4600,buff:"+4.60% Healing Speed"},
            {meat:20000,wood:20000,coal:4000,iron:1000,steel:1200,secs:378,power:6000,buff:"+6.00% Healing Speed"},
          ]},
          { id:"trainerTools1", name:"Trainer Tools I", levels:[
            {},{meat:5400,wood:5400,coal:1000,iron:270,steel:320,secs:81,power:3960,buff:"+2.20% Training Speed"},
            {meat:7500,wood:7500,coal:1500,iron:370,steel:440,secs:121,power:3960,buff:"+2.20% Training Speed"},
            {meat:16000,wood:16000,coal:3200,iron:810,steel:960,secs:324,power:5400,buff:"+3.00% Training Speed"},
          ]},
          { id:"cmdTactics1", name:"Command Tactics I", levels:[
            {},{meat:6700,wood:6700,coal:1300,iron:330,steel:400,secs:270,power:2700,buff:"+1 March Queue"},
          ]},
        ]
      },
      {
        tier: "II", minRCLevel: 10,
        researches: [
          { id:"toolingUp2", name:"Tooling Up II", levels:[
            {},{meat:27000,wood:27000,coal:5400,iron:1300,steel:320,secs:300,power:3000,buff:"+0.60% Construction Speed"},
            {meat:37000,wood:37000,coal:7500,iron:1800,steel:440,secs:450,power:3000,buff:"+0.60% Construction Speed"},
            {meat:81000,wood:81000,coal:16000,iron:4000,steel:960,secs:1200,power:5000,buff:"+1.00% Construction Speed"},
          ]},
          { id:"wardExp2", name:"Ward Expansion II", levels:[
            {},{meat:6700,wood:6700,coal:1300,iron:330,steel:80,secs:150,power:2200,buff:"+1,100 Infirmary Capacity"},
            {meat:9400,wood:9400,coal:1800,iron:470,steel:110,secs:225,power:2200,buff:"+1,100 Infirmary Capacity"},
            {meat:20000,wood:20000,coal:4000,iron:1000,steel:240,secs:600,power:2800,buff:"+1,400 Infirmary Capacity"},
          ]},
          { id:"campExp2", name:"Camp Expansion II", levels:[
            {},{meat:20000,wood:20000,coal:4000,iron:1000,steel:240,secs:300,power:2600,buff:"+4 Training Capacity"},
            {meat:28000,wood:28000,coal:5600,iron:1400,steel:330,secs:450,power:3250,buff:"+5 Training Capacity"},
            {meat:60000,wood:60000,coal:12000,iron:3000,steel:720,secs:1200,power:3900,buff:"+6 Training Capacity"},
          ]},
          { id:"toolEnhance2", name:"Tool Enhancement II", levels:[
            {},{meat:22000,wood:22000,coal:4500,iron:1100,steel:280,secs:390,power:3000,buff:"+0.60% Research Speed"},
            {meat:32000,wood:32000,coal:6400,iron:1600,steel:390,secs:585,power:3000,buff:"+0.60% Research Speed"},
            {meat:68000,wood:68000,coal:13000,iron:3400,steel:840,secs:1560,power:5000,buff:"+1.00% Research Speed"},
          ]},
          { id:"bandaging2", name:"Bandaging II", levels:[
            {},{meat:67000,wood:67000,coal:13000,iron:3300,steel:800,secs:1050,power:9000,buff:"+9.00% Healing Speed"},
            {meat:94000,wood:94000,coal:18000,iron:4700,steel:1100,secs:1575,power:9000,buff:"+9.00% Healing Speed"},
            {meat:200000,wood:200000,coal:40000,iron:10000,steel:2400,secs:4200,power:12000,buff:"+12.00% Healing Speed"},
          ]},
          { id:"trainerTools2", name:"Trainer Tools II", levels:[
            {},{meat:54000,wood:54000,coal:10000,iron:2700,steel:640,secs:900,power:8280,buff:"+4.60% Training Speed"},
            {meat:75000,wood:75000,coal:15000,iron:3700,steel:890,secs:1350,power:8280,buff:"+4.60% Training Speed"},
            {meat:160000,wood:160000,coal:32000,iron:8100,steel:1900,secs:3600,power:10800,buff:"+6.00% Training Speed"},
          ]},
        ]
      },
      {
        tier: "III", minRCLevel: 13,
        researches: [
          { id:"toolingUp3", name:"Tooling Up III", levels:[
            {},{meat:86000,wood:86000,coal:17000,iron:4300,steel:960,secs:1200,power:5000,buff:"+1.00% Construction Speed"},
            {meat:120000,wood:120000,coal:24000,iron:6000,steel:1300,secs:1800,power:5000,buff:"+1.00% Construction Speed"},
            {meat:250000,wood:250000,coal:51000,iron:12000,steel:2800,secs:4800,power:5000,buff:"+1.00% Construction Speed"},
          ]},
          { id:"wardExp3", name:"Ward Expansion III", levels:[
            {},{meat:21000,wood:21000,coal:4300,iron:1000,steel:240,secs:600,power:4400,buff:"+2,200 Infirmary Capacity"},
            {meat:30000,wood:30000,coal:6000,iron:1500,steel:330,secs:900,power:4400,buff:"+2,200 Infirmary Capacity"},
            {meat:64000,wood:64000,coal:12000,iron:3200,steel:720,secs:2400,power:5800,buff:"+2,900 Infirmary Capacity"},
          ]},
          { id:"campExp3", name:"Camp Expansion III", levels:[
            {},{meat:64000,wood:64000,coal:12000,iron:3200,steel:720,secs:1200,power:4550,buff:"+7 Training Capacity"},
            {meat:90000,wood:90000,coal:18000,iron:4500,steel:1000,secs:1800,power:4550,buff:"+7 Training Capacity"},
            {meat:190000,wood:190000,coal:38000,iron:9700,steel:2100,secs:4800,power:5850,buff:"+9 Training Capacity"},
          ]},
          { id:"toolEnhance3", name:"Tool Enhancement III", levels:[
            {},{meat:73000,wood:73000,coal:14000,iron:3600,steel:840,secs:1560,power:5000,buff:"+1.00% Research Speed"},
            {meat:100000,wood:100000,coal:20000,iron:5100,steel:1100,secs:2340,power:5000,buff:"+1.00% Research Speed"},
            {meat:220000,wood:220000,coal:44000,iron:11000,steel:2500,secs:6240,power:5000,buff:"+1.00% Research Speed"},
          ]},
          { id:"bandaging3", name:"Bandaging III", levels:[
            {},{meat:210000,wood:210000,coal:43000,iron:10000,steel:2400,secs:4200,power:13400,buff:"+13.40% Healing Speed"},
            {meat:300000,wood:300000,coal:60000,iron:15000,steel:3300,secs:6300,power:13400,buff:"+13.40% Healing Speed"},
            {meat:640000,wood:640000,coal:120000,iron:32000,steel:7200,secs:16800,power:18000,buff:"+18.00% Healing Speed"},
          ]},
          { id:"trainerTools3", name:"Trainer Tools III", levels:[
            {},{meat:170000,wood:170000,coal:34000,iron:8600,steel:1900,secs:3600,power:12240,buff:"+6.80% Training Speed"},
            {meat:240000,wood:240000,coal:48000,iron:12000,steel:2600,secs:5400,power:12240,buff:"+6.80% Training Speed"},
            {meat:510000,wood:510000,coal:100000,iron:25000,steel:5700,secs:14400,power:16200,buff:"+9.00% Training Speed"},
          ]},
          { id:"cmdTactics2", name:"Command Tactics II", levels:[
            {},{meat:67000,wood:67000,coal:13000,iron:33000,steel:800,secs:3000,power:2700,buff:"+1 March Queue"},
          ]},
        ]
      },
      {
        tier: "IV", minRCLevel: 19,
        researches: [
          { id:"toolingUp4", name:"Tooling Up IV", levels:[
            {},{meat:240000,wood:240000,coal:49000,iron:12000,steel:3200,secs:8000,power:6000,buff:"+1.20% Construction Speed"},
            {meat:340000,wood:340000,coal:69000,iron:17000,steel:4400,secs:12000,power:6000,buff:"+1.20% Construction Speed"},
            {meat:740000,wood:740000,coal:140000,iron:37000,steel:9600,secs:32000,power:7500,buff:"+1.50% Construction Speed"},
          ]},
          { id:"wardExp4", name:"Ward Expansion IV", levels:[
            {},{meat:62000,wood:62000,coal:12000,iron:3100,steel:800,secs:4000,power:8600,buff:"+4,300 Infirmary Capacity"},
            {meat:86000,wood:86000,coal:17000,iron:4300,steel:1100,secs:6000,power:8600,buff:"+4,300 Infirmary Capacity"},
            {meat:180000,wood:180000,coal:37000,iron:9300,steel:2400,secs:16000,power:11600,buff:"+5,800 Infirmary Capacity"},
          ]},
          { id:"campExp4", name:"Camp Expansion IV", levels:[
            {},{meat:180000,wood:180000,coal:37000,iron:9300,steel:2400,secs:8000,power:5850,buff:"+9 Training Capacity"},
            {meat:260000,wood:260000,coal:52000,iron:13000,steel:3300,secs:12000,power:5850,buff:"+9 Training Capacity"},
            {meat:550000,wood:550000,coal:110000,iron:27000,steel:7200,secs:32000,power:7800,buff:"+12 Training Capacity"},
          ]},
          { id:"toolEnhance4", name:"Tool Enhancement IV", levels:[
            {},{meat:210000,wood:210000,coal:42000,iron:10000,steel:2800,secs:10400,power:6000,buff:"+1.20% Research Speed"},
            {meat:290000,wood:290000,coal:59000,iron:14000,steel:3900,secs:15600,power:6000,buff:"+1.20% Research Speed"},
            {meat:630000,wood:630000,coal:120000,iron:31000,steel:8400,secs:41600,power:7500,buff:"+1.50% Research Speed"},
          ]},
          { id:"bandaging4", name:"Bandaging IV", levels:[
            {},{meat:620000,wood:620000,coal:120000,iron:31000,steel:8000,secs:28000,power:18000,buff:"+18.00% Healing Speed"},
            {meat:860000,wood:860000,coal:170000,iron:43000,steel:11000,secs:42000,power:18000,buff:"+18.00% Healing Speed"},
            {meat:1800000,wood:1800000,coal:170000,iron:93000,steel:24000,secs:112000,power:24000,buff:"+24.00% Healing Speed"},
          ]},
          { id:"trainerTools4", name:"Trainer Tools IV", levels:[
            {},{meat:490000,wood:490000,coal:99000,iron:24000,steel:6400,secs:24000,power:16200,buff:"+9.00% Training Speed"},
            {meat:690000,wood:690000,coal:130000,iron:34000,steel:8900,secs:36000,power:16200,buff:"+9.00% Training Speed"},
            {meat:1400000,wood:1400000,coal:290000,iron:74000,steel:19000,secs:96000,power:21600,buff:"+12.00% Training Speed"},
          ]},
          { id:"cmdTactics3", name:"Command Tactics III", levels:[
            {},{meat:210000,wood:210000,coal:43000,iron:10000,steel:2400,secs:12000,power:2700,buff:"+1 March Queue"},
          ]},
        ]
      },
      {
        tier: "V", minRCLevel: 24,
        researches: [
          { id:"toolingUp5", name:"Tooling Up V", levels:[
            {},{meat:440000,wood:440000,coal:88000,iron:22000,steel:12000,secs:50000,power:8000,buff:"+1.60% Construction Speed"},
            {meat:610000,wood:610000,coal:120000,iron:30000,steel:17000,secs:75000,power:8000,buff:"+1.60% Construction Speed"},
            {meat:1300000,wood:1300000,coal:260000,iron:66000,steel:38000,secs:200000,power:10000,buff:"+2.00% Construction Speed"},
          ]},
          { id:"wardExp5", name:"Ward Expansion V", levels:[
            {},{meat:110000,wood:110000,coal:22000,iron:5500,steel:3200,secs:25000,power:17200,buff:"+8,600 Infirmary Capacity"},
            {meat:150000,wood:150000,coal:30000,iron:7700,steel:4400,secs:37500,power:17200,buff:"+8,600 Infirmary Capacity"},
            {meat:330000,wood:330000,coal:66000,iron:16000,steel:9600,secs:100000,power:24000,buff:"+12,000 Infirmary Capacity"},
          ]},
          { id:"campExp5", name:"Camp Expansion V", levels:[
            {},{meat:330000,wood:330000,coal:66000,iron:16000,steel:9600,secs:50000,power:7150,buff:"+11 Training Capacity"},
            {meat:460000,wood:460000,coal:92000,iron:23000,steel:13000,secs:75000,power:7150,buff:"+11 Training Capacity"},
            {meat:990000,wood:990000,coal:190000,iron:49000,steel:28000,secs:200000,power:9750,buff:"+15 Training Capacity"},
          ]},
          { id:"toolEnhance5", name:"Tool Enhancement V", levels:[
            {},{meat:370000,wood:370000,coal:75000,iron:18000,steel:11000,secs:65000,power:8000,buff:"+1.60% Research Speed"},
            {meat:520000,wood:520000,coal:100000,iron:26000,steel:15000,secs:97500,power:8000,buff:"+1.60% Research Speed"},
            {meat:1100000,wood:1100000,coal:220000,iron:56000,steel:33000,secs:260000,power:10000,buff:"+2.00% Research Speed"},
          ]},
          { id:"bandaging5", name:"Bandaging V", levels:[
            {},{meat:1100000,wood:1100000,coal:220000,iron:55000,steel:32000,secs:175000,power:22400,buff:"+22.40% Healing Speed"},
            {meat:1500000,wood:1500000,coal:300000,iron:77000,steel:44000,secs:262500,power:22400,buff:"+22.40% Healing Speed"},
            {meat:3300000,wood:3300000,coal:66000,iron:160000,steel:96000,secs:700000,power:30000,buff:"+30.00% Healing Speed"},
          ]},
          { id:"trainerTools5", name:"Trainer Tools V", levels:[
            {},{meat:880000,wood:880000,coal:170000,iron:44000,steel:25000,secs:150000,power:20160,buff:"+11.20% Training Speed"},
            {meat:1200000,wood:1200000,coal:240000,iron:61000,steel:35000,secs:225000,power:20160,buff:"+11.20% Training Speed"},
            {meat:2600000,wood:2600000,coal:530000,iron:130000,steel:76000,secs:600000,power:27000,buff:"+15.00% Training Speed"},
          ]},
        ]
      },
      {
        tier: "VI", minRCLevel: 29,
        researches: [
          { id:"toolingUp6", name:"Tooling Up VI", levels:[
            {},{meat:1500000,wood:1500000,coal:530000,iron:77000,steel:25000,secs:240000,power:9000,buff:"+1.80% Construction Speed"},
            {meat:2100000,wood:2100000,coal:430000,iron:100000,steel:35000,secs:360000,power:9000,buff:"+1.80% Construction Speed"},
            {meat:4600000,wood:4600000,coal:930000,iron:230000,steel:76000,secs:960000,power:12500,buff:"+2.50% Construction Speed"},
          ]},
          { id:"wardExp6", name:"Ward Expansion VI", levels:[
            {},{meat:380000,wood:380000,coal:77000,iron:19000,steel:6400,secs:120000,power:24000,buff:"+12,000 Infirmary Capacity"},
            {meat:540000,wood:540000,coal:100000,iron:27000,steel:8900,secs:180000,power:24000,buff:"+12,000 Infirmary Capacity"},
            {meat:1100000,wood:1100000,coal:230000,iron:58000,steel:19000,secs:480000,power:32000,buff:"+16,000 Infirmary Capacity"},
          ]},
          { id:"campExp6", name:"Camp Expansion VI", levels:[
            {},{meat:1100000,wood:1100000,coal:230000,iron:58000,steel:19000,secs:240000,power:9100,buff:"+14 Training Capacity"},
            {meat:1600000,wood:1600000,coal:320000,iron:81000,steel:26000,secs:360000,power:9100,buff:"+14 Training Capacity"},
            {meat:3400000,wood:3400000,coal:690000,iron:170000,steel:57000,secs:960000,power:11700,buff:"+18 Training Capacity"},
          ]},
          { id:"toolEnhance6", name:"Tool Enhancement VI", levels:[
            {},{meat:1300000,wood:1300000,coal:260000,iron:66000,steel:22000,secs:312000,power:9000,buff:"+1.80% Research Speed"},
            {meat:1800000,wood:1800000,coal:370000,iron:92000,steel:31000,secs:468000,power:9000,buff:"+1.80% Research Speed"},
            {meat:3900000,wood:3900000,coal:790000,iron:190000,steel:67000,secs:1248000,power:12500,buff:"+2.50% Research Speed"},
          ]},
          { id:"bandaging6", name:"Bandaging VI", levels:[
            {},{meat:3800000,wood:3800000,coal:770000,iron:190000,steel:64000,secs:840000,power:27000,buff:"+27.00% Healing Speed"},
            {meat:5400000,wood:5400000,coal:1000000,iron:270000,steel:89000,secs:1260000,power:27000,buff:"+27.00% Healing Speed"},
            {meat:11000000,wood:11000000,coal:2300000,iron:580000,steel:190000,secs:3360000,power:36000,buff:"+36.00% Healing Speed"},
          ]},
          { id:"trainerTools6", name:"Trainer Tools VI", levels:[
            {},{meat:3100000,wood:3100000,coal:620000,iron:150000,steel:51000,secs:720000,power:24120,buff:"+13.40% Training Speed"},
            {meat:4300000,wood:4300000,coal:870000,iron:210000,steel:71000,secs:1080000,power:24120,buff:"+13.40% Training Speed"},
            {meat:9300000,wood:9300000,coal:1800000,iron:460000,steel:150000,secs:2880000,power:32400,buff:"+18.00% Training Speed"},
          ]},
        ]
      },
      {
        tier: "VII", minRCLevel: 30,
        researches: [
          { id:"toolingUp7", name:"Tooling Up VII", levels:[
            {},{meat:3100000,wood:3100000,coal:620000,iron:150000,steel:48000,secs:840000,power:9000,buff:"+1.80% Construction Speed"},
            {meat:4300000,wood:4300000,coal:870000,iron:210000,steel:67000,secs:1260000,power:9000,buff:"+1.80% Construction Speed"},
            {meat:9300000,wood:9300000,coal:1800000,iron:460000,steel:140000,secs:3360000,power:12500,buff:"+2.50% Construction Speed"},
          ]},
          { id:"wardExp7", name:"Ward Expansion VII", levels:[
            {},{meat:770000,wood:770000,coal:150000,iron:38000,steel:12000,secs:420000,power:40000,buff:"+20,000 Infirmary Capacity"},
            {meat:1000000,wood:1000000,coal:210000,iron:54000,steel:16000,secs:630000,power:40000,buff:"+20,000 Infirmary Capacity"},
            {meat:2300000,wood:2300000,coal:460000,iron:110000,steel:36000,secs:1680000,power:54000,buff:"+27,000 Infirmary Capacity"},
          ]},
          { id:"campExp7", name:"Camp Expansion VII", levels:[
            {},{meat:2300000,wood:2300000,coal:460000,iron:110000,steel:36000,secs:840000,power:9100,buff:"+14 Training Capacity"},
            {meat:3200000,wood:3200000,coal:650000,iron:160000,steel:50000,secs:1260000,power:9100,buff:"+14 Training Capacity"},
            {meat:6900000,wood:6900000,coal:1300000,iron:340000,steel:100000,secs:3360000,power:11700,buff:"+18 Training Capacity"},
          ]},
          { id:"toolEnhance7", name:"Tool Enhancement VII", levels:[
            {},{meat:2600000,wood:2600000,coal:520000,iron:130000,steel:42000,secs:1092000,power:9000,buff:"+1.80% Research Speed"},
            {meat:3700000,wood:3700000,coal:740000,iron:180000,steel:58000,secs:1638000,power:9000,buff:"+1.80% Research Speed"},
            {meat:7900000,wood:7900000,coal:1500000,iron:390000,steel:120000,secs:4368000,power:12500,buff:"+2.50% Research Speed"},
          ]},
          { id:"bandaging7", name:"Bandaging VII", levels:[
            {},{meat:7700000,wood:7700000,coal:1500000,iron:380000,steel:120000,secs:2940000,power:27000,buff:"+27.00% Healing Speed"},
            {meat:10000000,wood:10000000,coal:2100000,iron:540000,steel:160000,secs:4410000,power:27000,buff:"+27.00% Healing Speed"},
            {meat:23000000,wood:23000000,coal:4600000,iron:1100000,steel:360000,secs:11760000,power:36000,buff:"+36.00% Healing Speed"},
          ]},
          { id:"trainerTools7", name:"Trainer Tools VII", levels:[
            {},{meat:6200000,wood:6200000,coal:1200000,iron:310000,steel:96000,secs:2520000,power:24120,buff:"+13.40% Training Speed"},
            {meat:8700000,wood:8700000,coal:1700000,iron:430000,steel:130000,secs:3780000,power:24120,buff:"+13.40% Training Speed"},
            {meat:18000000,wood:18000000,coal:3700000,iron:930000,steel:280000,secs:10080000,power:32400,buff:"+18.00% Training Speed"},
          ]},
        ]
      },
    ]
  },

  Economy: {
    tiers: [
      {
        tier: "I", minRCLevel: 9,
        researches: [
          { id:"meatOut1", name:"Meat Output I", levels:[
            {},{meat:5400,wood:5400,coal:1000,iron:270,steel:320,secs:27,power:1040,buff:"+4.00% Meat Output"},
            {meat:7500,wood:7500,coal:1500,iron:370,steel:440,secs:40,power:1040,buff:"+4.00% Meat Output"},
            {meat:16000,wood:16000,coal:3200,iron:810,steel:960,secs:108,power:1430,buff:"+5.50% Meat Output"},
          ]},
          { id:"woodOut1", name:"Wood Output I", levels:[
            {},{meat:5400,wood:5400,coal:1000,iron:270,steel:320,secs:27,power:1040,buff:"+4.00% Wood Output"},
            {meat:7500,wood:7500,coal:1500,iron:370,steel:440,secs:40,power:1040,buff:"+4.00% Wood Output"},
            {meat:16000,wood:16000,coal:3200,iron:810,steel:960,secs:108,power:1430,buff:"+5.50% Wood Output"},
          ]},
          { id:"foodGather1", name:"Food Gathering I", levels:[
            {},{meat:4000,wood:4000,coal:810,iron:200,steel:240,secs:27,power:1000,buff:"+8.00% Meat Gathering Speed"},
            {meat:5600,wood:5600,coal:1100,iron:280,steel:330,secs:40,power:1000,buff:"+8.00% Meat Gathering Speed"},
            {meat:12000,wood:12000,coal:2400,iron:600,steel:720,secs:108,power:1375,buff:"+11.00% Meat Gathering Speed"},
          ]},
          { id:"woodGather1", name:"Wood Gathering I", levels:[
            {},{meat:4000,wood:4000,coal:810,iron:200,steel:240,secs:27,power:1000,buff:"+8.00% Wood Gathering Speed"},
            {meat:5600,wood:5600,coal:1100,iron:280,steel:330,secs:40,power:1000,buff:"+8.00% Wood Gathering Speed"},
            {meat:12000,wood:12000,coal:2400,iron:600,steel:720,secs:108,power:1375,buff:"+11.00% Wood Gathering Speed"},
          ]},
          { id:"coalOut1", name:"Coal Output I", levels:[
            {},{meat:13000,wood:13000,coal:2700,iron:670,steel:800,secs:135,power:2080,buff:"+8.00% Coal Output"},
            {meat:18000,wood:18000,coal:3700,iron:940,steel:1100,secs:202,power:2080,buff:"+8.00% Coal Output"},
            {meat:40000,wood:40000,coal:8100,iron:2000,steel:2400,secs:540,power:2860,buff:"+11.00% Coal Output"},
          ]},
          { id:"coalMine1", name:"Coal Mining I", levels:[
            {},{meat:10000,wood:10000,coal:2000,iron:500,steel:600,secs:94,power:2000,buff:"+16.00% Coal Gathering Speed"},
            {meat:14000,wood:14000,coal:2800,iron:700,steel:840,secs:141,power:2000,buff:"+16.00% Coal Gathering Speed"},
            {meat:30000,wood:30000,coal:6000,iron:1500,steel:1800,secs:378,power:2687,buff:"+21.50% Coal Gathering Speed"},
          ]},
        ]
      },
      {
        tier: "II", minRCLevel: 14,
        researches: [
          { id:"meatOut2", name:"Meat Output II", levels:[
            {},{meat:54000,wood:54000,coal:10000,iron:2700,steel:640,secs:300,power:1040,buff:"+4.00% Meat Output"},
            {meat:75000,wood:75000,coal:15000,iron:3700,steel:890,secs:450,power:1040,buff:"+4.00% Meat Output"},
            {meat:160000,wood:160000,coal:32000,iron:8100,steel:1900,secs:1200,power:1430,buff:"+5.50% Meat Output"},
          ]},
          { id:"woodOut2", name:"Wood Output II", levels:[
            {},{meat:54000,wood:54000,coal:10000,iron:2700,steel:640,secs:300,power:1040,buff:"+4.00% Wood Output"},
            {meat:75000,wood:75000,coal:15000,iron:3700,steel:890,secs:450,power:1040,buff:"+4.00% Wood Output"},
            {meat:160000,wood:160000,coal:32000,iron:8100,steel:1900,secs:1200,power:1430,buff:"+5.50% Wood Output"},
          ]},
          { id:"ironOut1", name:"Iron Output I", levels:[
            {},{meat:13000,wood:13000,coal:2700,iron:670,steel:800,secs:135,power:2080,buff:"+8.00% Iron Output"},
            {meat:18000,wood:18000,coal:3700,iron:940,steel:1100,secs:202,power:2080,buff:"+8.00% Iron Output"},
            {meat:40000,wood:40000,coal:8100,iron:2000,steel:2400,secs:540,power:2860,buff:"+11.00% Iron Output"},
          ]},
          { id:"foodGather2", name:"Food Gathering II", levels:[
            {},{meat:40000,wood:40000,coal:8100,iron:2000,steel:480,secs:300,power:1000,buff:"+8.00% Meat Gathering Speed"},
            {meat:56000,wood:56000,coal:11000,iron:2800,steel:670,secs:450,power:1000,buff:"+8.00% Meat Gathering Speed"},
            {meat:120000,wood:120000,coal:24000,iron:6000,steel:1400,secs:1200,power:1375,buff:"+11.00% Meat Gathering Speed"},
          ]},
          { id:"woodGather2", name:"Wood Gathering II", levels:[
            {},{meat:40000,wood:40000,coal:8100,iron:2000,steel:480,secs:300,power:1000,buff:"+8.00% Wood Gathering Speed"},
            {meat:56000,wood:56000,coal:11000,iron:2800,steel:670,secs:450,power:1000,buff:"+8.00% Wood Gathering Speed"},
            {meat:120000,wood:120000,coal:24000,iron:6000,steel:1400,secs:1200,power:1375,buff:"+11.00% Wood Gathering Speed"},
          ]},
          { id:"ironMine1", name:"Iron Mining I", levels:[
            {},{meat:10000,wood:10000,coal:2000,iron:500,steel:600,secs:94,power:2000,buff:"+16.00% Iron Gathering Speed"},
            {meat:14000,wood:14000,coal:2800,iron:700,steel:840,secs:141,power:2000,buff:"+16.00% Iron Gathering Speed"},
            {meat:30000,wood:30000,coal:6000,iron:1500,steel:1800,secs:378,power:2687,buff:"+21.50% Iron Gathering Speed"},
          ]},
        ]
      },
      {
        tier: "III", minRCLevel: 19,
        researches: [
          { id:"meatOut3", name:"Meat Output III", levels:[
            {},{meat:170000,wood:170000,coal:34000,iron:8600,steel:1900,secs:1200,power:1430,buff:"+5.50% Meat Output"},
            {meat:240000,wood:240000,coal:48000,iron:12000,steel:2600,secs:1800,power:1430,buff:"+5.50% Meat Output"},
            {meat:510000,wood:510000,coal:100000,iron:25000,steel:5700,secs:4800,power:1820,buff:"+7.00% Meat Output"},
          ]},
          { id:"coalOut2", name:"Coal Output II", levels:[
            {},{meat:130000,wood:130000,coal:27000,iron:6700,steel:1600,secs:1500,power:1430,buff:"+5.50% Coal Output"},
            {meat:180000,wood:180000,coal:37000,iron:9400,steel:2200,secs:2250,power:1430,buff:"+5.50% Coal Output"},
            {meat:400000,wood:400000,coal:81000,iron:20000,steel:4800,secs:6000,power:1820,buff:"+7.00% Coal Output"},
          ]},
          { id:"woodOut3", name:"Wood Output III", levels:[
            {},{meat:170000,wood:170000,coal:34000,iron:8600,steel:1900,secs:1200,power:1430,buff:"+5.50% Wood Output"},
            {meat:240000,wood:240000,coal:48000,iron:12000,steel:2600,secs:1800,power:1430,buff:"+5.50% Wood Output"},
            {meat:510000,wood:510000,coal:100000,iron:25000,steel:5700,secs:4800,power:1820,buff:"+7.00% Wood Output"},
          ]},
          { id:"ironOut2", name:"Iron Output II", levels:[
            {},{meat:130000,wood:130000,coal:27000,iron:6700,steel:1600,secs:1500,power:1430,buff:"+5.50% Iron Output"},
            {meat:180000,wood:180000,coal:37000,iron:9400,steel:2200,secs:2250,power:1430,buff:"+5.50% Iron Output"},
            {meat:400000,wood:400000,coal:81000,iron:20000,steel:4800,secs:6000,power:1820,buff:"+7.00% Iron Output"},
          ]},
          { id:"foodGather3", name:"Food Gathering III", levels:[
            {},{meat:120000,wood:120000,coal:25000,iron:6400,steel:1400,secs:1200,power:1375,buff:"+11.00% Meat Gathering Speed"},
            {meat:180000,wood:180000,coal:36000,iron:9000,steel:2000,secs:1800,power:1375,buff:"+11.00% Meat Gathering Speed"},
            {meat:380000,wood:380000,coal:77000,iron:19000,steel:4300,secs:4800,power:1812,buff:"+14.50% Meat Gathering Speed"},
          ]},
          { id:"coalMine2", name:"Coal Mining II", levels:[
            {},{meat:100000,wood:100000,coal:20000,iron:5000,steel:1200,secs:1050,power:1375,buff:"+11.00% Coal Gathering Speed"},
            {meat:140000,wood:140000,coal:28000,iron:7000,steel:1600,secs:1575,power:1375,buff:"+11.00% Coal Gathering Speed"},
            {meat:300000,wood:300000,coal:60000,iron:15000,steel:3600,secs:4200,power:1812,buff:"+14.50% Coal Gathering Speed"},
          ]},
          { id:"woodGather3", name:"Wood Gathering III", levels:[
            {},{meat:120000,wood:120000,coal:25000,iron:6400,steel:1400,secs:1200,power:1375,buff:"+11.00% Wood Gathering Speed"},
            {meat:180000,wood:180000,coal:36000,iron:9000,steel:2000,secs:1800,power:1375,buff:"+11.00% Wood Gathering Speed"},
            {meat:380000,wood:380000,coal:77000,iron:19000,steel:4300,secs:4800,power:1812,buff:"+14.50% Wood Gathering Speed"},
          ]},
          { id:"ironMine2", name:"Iron Mining II", levels:[
            {},{meat:100000,wood:100000,coal:20000,iron:5000,steel:1200,secs:1050,power:1375,buff:"+11.00% Iron Gathering Speed"},
            {meat:140000,wood:140000,coal:28000,iron:7000,steel:1600,secs:1575,power:1375,buff:"+11.00% Iron Gathering Speed"},
            {meat:300000,wood:300000,coal:60000,iron:15000,steel:3600,secs:4200,power:1812,buff:"+14.50% Iron Gathering Speed"},
          ]},
        ]
      },
      {
        tier: "IV", minRCLevel: 24,
        researches: [
          { id:"meatOut4", name:"Meat Output IV", levels:[
            {},{meat:490000,wood:490000,coal:99000,iron:24000,steel:6400,secs:8000,power:1820,buff:"+7.00% Meat Output"},
            {meat:690000,wood:690000,coal:130000,iron:34000,steel:8900,secs:12000,power:1690,buff:"+6.50% Meat Output"},
            {meat:1400000,wood:1400000,coal:290000,iron:74000,steel:19000,secs:32000,power:2340,buff:"+9.00% Meat Output"},
          ]},
          { id:"coalOut3", name:"Coal Output III", levels:[
            {},{meat:430000,wood:430000,coal:86000,iron:21000,steel:4800,secs:6000,power:1820,buff:"+7.00% Coal Output"},
            {meat:600000,wood:600000,coal:120000,iron:30000,steel:6700,secs:9000,power:1690,buff:"+6.50% Coal Output"},
            {meat:1200000,wood:1200000,coal:250000,iron:64000,steel:14000,secs:24000,power:2340,buff:"+9.00% Coal Output"},
          ]},
          { id:"woodOut4", name:"Wood Output IV", levels:[
            {},{meat:490000,wood:490000,coal:99000,iron:24000,steel:6400,secs:8000,power:1820,buff:"+7.00% Wood Output"},
            {meat:690000,wood:690000,coal:130000,iron:34000,steel:8900,secs:12000,power:1690,buff:"+6.50% Wood Output"},
            {meat:1400000,wood:1400000,coal:290000,iron:74000,steel:19000,secs:32000,power:2340,buff:"+9.00% Wood Output"},
          ]},
          { id:"ironOut3", name:"Iron Output III", levels:[
            {},{meat:430000,wood:430000,coal:86000,iron:21000,steel:4800,secs:6000,power:1820,buff:"+7.00% Iron Output"},
            {meat:600000,wood:600000,coal:120000,iron:30000,steel:6700,secs:9000,power:1690,buff:"+6.50% Iron Output"},
            {meat:1200000,wood:1200000,coal:250000,iron:64000,steel:14000,secs:24000,power:2340,buff:"+9.00% Iron Output"},
          ]},
          { id:"foodGather4", name:"Food Gathering IV", levels:[
            {},{meat:370000,wood:370000,coal:74000,iron:18000,steel:4800,secs:8000,power:1687,buff:"+13.50% Meat Gathering Speed"},
            {meat:520000,wood:520000,coal:100000,iron:26000,steel:6700,secs:12000,power:1688,buff:"+13.50% Meat Gathering Speed"},
            {meat:1100000,wood:1100000,coal:220000,iron:55000,steel:14000,secs:32000,power:2250,buff:"+18.00% Meat Gathering Speed"},
          ]},
          { id:"coalMine3", name:"Coal Mining III", levels:[
            {},{meat:320000,wood:320000,coal:64000,iron:16000,steel:3600,secs:4200,power:1687,buff:"+13.50% Coal Gathering Speed"},
            {meat:450000,wood:450000,coal:90000,iron:22000,steel:5000,secs:6300,power:1688,buff:"+13.50% Coal Gathering Speed"},
            {meat:970000,wood:970000,coal:190000,iron:48000,steel:10000,secs:16800,power:2250,buff:"+18.00% Coal Gathering Speed"},
          ]},
          { id:"woodGather4", name:"Wood Gathering IV", levels:[
            {},{meat:370000,wood:370000,coal:74000,iron:18000,steel:4800,secs:8000,power:1687,buff:"+13.50% Wood Gathering Speed"},
            {meat:520000,wood:520000,coal:100000,iron:26000,steel:6700,secs:12000,power:1688,buff:"+13.50% Wood Gathering Speed"},
            {meat:1100000,wood:1100000,coal:220000,iron:55000,steel:14000,secs:32000,power:2250,buff:"+18.00% Wood Gathering Speed"},
          ]},
          { id:"ironMine3", name:"Iron Mining III", levels:[
            {},{meat:320000,wood:320000,coal:64000,iron:16000,steel:3600,secs:4200,power:1687,buff:"+13.50% Iron Gathering Speed"},
            {meat:450000,wood:450000,coal:90000,iron:22000,steel:5000,secs:6300,power:1688,buff:"+13.50% Iron Gathering Speed"},
            {meat:970000,wood:970000,coal:190000,iron:48000,steel:10000,secs:16800,power:2250,buff:"+18.00% Iron Gathering Speed"},
          ]},
        ]
      },
      {
        tier: "V", minRCLevel: 29,
        researches: [
          { id:"meatOut5", name:"Meat Output V", levels:[
            {},{meat:880000,wood:880000,coal:170000,iron:44000,steel:25000,secs:50000,power:2080,buff:"+8.00% Meat Output"},
            {meat:1200000,wood:1200000,coal:240000,iron:61000,steel:35000,secs:75000,power:2080,buff:"+8.00% Meat Output"},
            {meat:2600000,wood:2600000,coal:530000,iron:130000,steel:76000,secs:200000,power:2600,buff:"+10.00% Meat Output"},
          ]},
          { id:"coalOut4", name:"Coal Output IV", levels:[
            {},{meat:1200000,wood:1200000,coal:240000,iron:62000,steel:16000,secs:40000,power:2080,buff:"+8.00% Coal Output"},
            {meat:1700000,wood:1700000,coal:340000,iron:86000,steel:22000,secs:60000,power:2080,buff:"+8.00% Coal Output"},
            {meat:3700000,wood:3700000,coal:740000,iron:180000,steel:48000,secs:160000,power:2600,buff:"+10.00% Coal Output"},
          ]},
          { id:"woodOut5", name:"Wood Output V", levels:[
            {},{meat:880000,wood:880000,coal:170000,iron:44000,steel:25000,secs:50000,power:2080,buff:"+8.00% Wood Output"},
            {meat:1200000,wood:1200000,coal:240000,iron:61000,steel:35000,secs:75000,power:2080,buff:"+8.00% Wood Output"},
            {meat:2600000,wood:2600000,coal:530000,iron:130000,steel:76000,secs:200000,power:2600,buff:"+10.00% Wood Output"},
          ]},
          { id:"ironOut4", name:"Iron Output IV", levels:[
            {},{meat:1200000,wood:1200000,coal:240000,iron:62000,steel:16000,secs:40000,power:1820,buff:"+7.00% Iron Output"},
            {meat:1700000,wood:1700000,coal:340000,iron:86000,steel:22000,secs:60000,power:1690,buff:"+6.50% Iron Output"},
            {meat:3700000,wood:3700000,coal:740000,iron:180000,steel:48000,secs:160000,power:2340,buff:"+9.00% Iron Output"},
          ]},
          { id:"foodGather5", name:"Food Gathering V", levels:[
            {},{meat:660000,wood:660000,coal:130000,iron:33000,steel:19000,secs:50000,power:2000,buff:"+16.00% Meat Gathering Speed"},
            {meat:920000,wood:920000,coal:180000,iron:46000,steel:26000,secs:75000,power:2000,buff:"+16.00% Meat Gathering Speed"},
            {meat:1900000,wood:1900000,coal:390000,iron:99000,steel:57000,secs:200000,power:2687,buff:"+21.50% Meat Gathering Speed"},
          ]},
          { id:"coalMine4", name:"Coal Mining IV", levels:[
            {},{meat:930000,wood:930000,coal:180000,iron:46000,steel:12000,secs:28000,power:2000,buff:"+16.00% Coal Gathering Speed"},
            {meat:1300000,wood:1300000,coal:260000,iron:65000,steel:16000,secs:42000,power:2000,buff:"+16.00% Coal Gathering Speed"},
            {meat:2700000,wood:2700000,coal:550000,iron:130000,steel:36000,secs:112000,power:2687,buff:"+21.50% Coal Gathering Speed"},
          ]},
          { id:"woodGather5", name:"Wood Gathering V", levels:[
            {},{meat:660000,wood:660000,coal:130000,iron:33000,steel:19000,secs:50000,power:2000,buff:"+16.00% Wood Gathering Speed"},
            {meat:920000,wood:920000,coal:180000,iron:46000,steel:26000,secs:75000,power:2000,buff:"+16.00% Wood Gathering Speed"},
            {meat:1900000,wood:1900000,coal:390000,iron:99000,steel:57000,secs:200000,power:2687,buff:"+21.50% Wood Gathering Speed"},
          ]},
          { id:"ironMine4", name:"Iron Mining IV", levels:[
            {},{meat:930000,wood:930000,coal:180000,iron:46000,steel:12000,secs:28000,power:2000,buff:"+16.00% Iron Gathering Speed"},
            {meat:1300000,wood:1300000,coal:260000,iron:65000,steel:16000,secs:42000,power:2000,buff:"+16.00% Iron Gathering Speed"},
            {meat:2700000,wood:2700000,coal:550000,iron:130000,steel:36000,secs:112000,power:2687,buff:"+21.50% Iron Gathering Speed"},
          ]},
        ]
      },
      {
        tier: "VI", minRCLevel: 30,
        researches: [
          { id:"meatOut6", name:"Meat Output VI", levels:[
            {},{meat:3100000,wood:3100000,coal:620000,iron:150000,steel:51000,secs:240000,power:2080,buff:"+8.00% Meat Output"},
            {meat:4300000,wood:4300000,coal:870000,iron:210000,steel:71000,secs:360000,power:2080,buff:"+8.00% Meat Output"},
            {meat:9300000,wood:9300000,coal:1800000,iron:460000,steel:150000,secs:960000,power:2600,buff:"+10.00% Meat Output"},
          ]},
          { id:"coalOut5", name:"Coal Output V", levels:[
            {},{meat:2200000,wood:2200000,coal:440000,iron:110000,steel:64000,secs:250000,power:2080,buff:"+8.00% Coal Output"},
            {meat:3000000,wood:3000000,coal:610000,iron:150000,steel:89000,secs:375000,power:2080,buff:"+8.00% Coal Output"},
            {meat:6600000,wood:6600000,coal:1300000,iron:330000,steel:190000,secs:1000000,power:2600,buff:"+10.00% Coal Output"},
          ]},
          { id:"woodOut6", name:"Wood Output VI", levels:[
            {},{meat:3100000,wood:3100000,coal:620000,iron:150000,steel:51000,secs:240000,power:2080,buff:"+8.00% Wood Output"},
            {meat:4300000,wood:4300000,coal:870000,iron:210000,steel:71000,secs:360000,power:2080,buff:"+8.00% Wood Output"},
            {meat:9300000,wood:9300000,coal:1800000,iron:460000,steel:150000,secs:960000,power:2600,buff:"+10.00% Wood Output"},
          ]},
          { id:"ironOut5", name:"Iron Output V", levels:[
            {},{meat:2200000,wood:2200000,coal:440000,iron:110000,steel:64000,secs:250000,power:2080,buff:"+8.00% Iron Output"},
            {meat:3000000,wood:3000000,coal:610000,iron:150000,steel:89000,secs:375000,power:2080,buff:"+8.00% Iron Output"},
            {meat:6600000,wood:6600000,coal:1300000,iron:330000,steel:190000,secs:1000000,power:2600,buff:"+10.00% Iron Output"},
          ]},
          { id:"foodGather6", name:"Food Gathering VI", levels:[
            {},{meat:2300000,wood:2300000,coal:460000,iron:110000,steel:38000,secs:240000,power:2000,buff:"+16.00% Meat Gathering Speed"},
            {meat:3200000,wood:3200000,coal:650000,iron:160000,steel:53000,secs:360000,power:2000,buff:"+16.00% Meat Gathering Speed"},
            {meat:6900000,wood:6900000,coal:1300000,iron:340000,steel:110000,secs:960000,power:2687,buff:"+21.50% Meat Gathering Speed"},
          ]},
          { id:"coalMine5", name:"Coal Mining V", levels:[
            {},{meat:1600000,wood:1600000,coal:330000,iron:83000,steel:48000,secs:175000,power:2000,buff:"+16.00% Coal Gathering Speed"},
            {meat:2300000,wood:2300000,coal:460000,iron:110000,steel:67000,secs:262500,power:2000,buff:"+16.00% Coal Gathering Speed"},
            {meat:4900000,wood:4900000,coal:990000,iron:240000,steel:140000,secs:700000,power:2687,buff:"+21.50% Coal Gathering Speed"},
          ]},
          { id:"woodGather6", name:"Wood Gathering VI", levels:[
            {},{meat:2300000,wood:2300000,coal:460000,iron:110000,steel:38000,secs:240000,power:2000,buff:"+16.00% Wood Gathering Speed"},
            {meat:3200000,wood:3200000,coal:650000,iron:160000,steel:53000,secs:360000,power:2000,buff:"+16.00% Wood Gathering Speed"},
            {meat:6900000,wood:6900000,coal:1300000,iron:340000,steel:110000,secs:960000,power:2687,buff:"+21.50% Wood Gathering Speed"},
          ]},
          { id:"ironMine5", name:"Iron Mining V", levels:[
            {},{meat:1600000,wood:1600000,coal:330000,iron:83000,steel:48000,secs:175000,power:2000,buff:"+16.00% Iron Gathering Speed"},
            {meat:2300000,wood:2300000,coal:460000,iron:110000,steel:67000,secs:262500,power:2000,buff:"+16.00% Iron Gathering Speed"},
            {meat:4900000,wood:4900000,coal:990000,iron:240000,steel:140000,secs:700000,power:2687,buff:"+21.50% Iron Gathering Speed"},
          ]},
        ]
      },
    ]
  },

  Battle: {
    tiers: [
      {
        tier: "I", minRCLevel: 9,
        researches: [
          { id:"weaponsPrep1", name:"Weapons Prep I", levels:[
            {},{meat:8700,wood:8700,coal:1700,iron:430,steel:520,secs:175,power:4200,buff:"+0.50% All Troops Attack"},
            {meat:12000,wood:12000,coal:2400,iron:610,steel:720,secs:263,power:4200,buff:"+0.50% All Troops Attack"},
            {meat:26000,wood:26000,coal:5200,iron:1300,steel:1500,secs:702,power:4200,buff:"+0.50% All Troops Attack"},
          ]},
          { id:"reprisalTactics1", name:"Reprisal Tactics I", levels:[
            {},{meat:3300,wood:3300,coal:670,iron:160,steel:200,secs:67,power:1750,buff:"+1.25% Infantry Attack"},
            {meat:4700,wood:4700,coal:940,iron:230,steel:280,secs:101,power:1750,buff:"+1.25% Infantry Attack"},
            {meat:10000,wood:10000,coal:20000,iron:500,steel:600,secs:270,power:2100,buff:"+1.50% Infantry Attack"},
          ]},
          { id:"precisionTarget1", name:"Precision Targeting I", levels:[
            {},{meat:8100,wood:8100,coal:1600,iron:400,steel:480,secs:162,power:4375,buff:"+1.25% Marksman Attack"},
            {meat:11000,wood:11000,coal:2200,iron:560,steel:670,secs:243,power:4375,buff:"+1.25% Marksman Attack"},
            {meat:24000,wood:24000,coal:4800,iron:1200,steel:1400,secs:648,power:5250,buff:"+1.50% Marksman Attack"},
          ]},
          { id:"skirmishing1", name:"Skirmishing I", levels:[
            {},{meat:8100,wood:8100,coal:1600,iron:400,steel:480,secs:162,power:4375,buff:"+1.25% Lancer Attack"},
            {meat:11000,wood:11000,coal:2200,iron:560,steel:670,secs:243,power:4375,buff:"+1.25% Lancer Attack"},
            {meat:24000,wood:24000,coal:4800,iron:1200,steel:1400,secs:648,power:5250,buff:"+1.50% Lancer Attack"},
          ]},
          { id:"defFormations1", name:"Defensive Formations I", levels:[
            {},{meat:10000,wood:10000,coal:2000,iron:500,steel:600,secs:202,power:5625,buff:"+1.25% Infantry Defense"},
            {meat:14000,wood:14000,coal:2800,iron:700,steel:840,secs:303,power:5625,buff:"+1.25% Infantry Defense"},
            {meat:30000,wood:30000,coal:6000,iron:1500,steel:1800,secs:810,power:6750,buff:"+1.50% Infantry Defense"},
          ]},
          { id:"picketLines1", name:"Picket Lines I", levels:[
            {},{meat:5400,wood:5400,coal:1000,iron:270,steel:320,secs:108,power:3000,buff:"+1.25% Marksman Defense"},
            {meat:7500,wood:7500,coal:1500,iron:370,steel:440,secs:162,power:3000,buff:"+1.25% Marksman Defense"},
            {meat:16000,wood:16000,coal:3200,iron:810,steel:960,secs:432,power:3600,buff:"+1.50% Marksman Defense"},
          ]},
          { id:"bulwark1", name:"Bulwark Formations I", levels:[
            {},{meat:5400,wood:5400,coal:1000,iron:270,steel:320,secs:108,power:3000,buff:"+1.25% Lancer Defense"},
            {meat:7500,wood:7500,coal:1500,iron:370,steel:440,secs:162,power:3000,buff:"+1.25% Lancer Defense"},
            {meat:16000,wood:16000,coal:3200,iron:810,steel:960,secs:432,power:3600,buff:"+1.50% Lancer Defense"},
          ]},
          { id:"specDefTraining1", name:"Special Def. Training I", levels:[
            {},{meat:8700,wood:8700,coal:1700,iron:430,steel:520,secs:175,power:4200,buff:"+0.50% All Troops Defense"},
            {meat:12000,wood:12000,coal:2400,iron:610,steel:720,secs:263,power:4200,buff:"+0.50% All Troops Defense"},
            {meat:26000,wood:26000,coal:5200,iron:1300,steel:1500,secs:702,power:4200,buff:"+0.50% All Troops Defense"},
          ]},
          { id:"survival1", name:"Survival Techniques I", levels:[
            {},{meat:8700,wood:8700,coal:1700,iron:430,steel:520,secs:175,power:4200,buff:"+0.50% All Troops Health"},
            {meat:12000,wood:12000,coal:2400,iron:610,steel:720,secs:263,power:4200,buff:"+0.50% All Troops Health"},
            {meat:26000,wood:26000,coal:5200,iron:1300,steel:1500,secs:702,power:4200,buff:"+0.50% All Troops Health"},
          ]},
          { id:"assault1", name:"Assault Techniques I", levels:[
            {},{meat:8700,wood:8700,coal:1700,iron:430,steel:520,secs:175,power:4200,buff:"+0.50% All Troops Lethality"},
            {meat:12000,wood:12000,coal:2400,iron:610,steel:720,secs:263,power:4200,buff:"+0.50% All Troops Lethality"},
            {meat:26000,wood:26000,coal:5200,iron:1300,steel:1500,secs:702,power:4200,buff:"+0.50% All Troops Lethality"},
          ]},
          { id:"regExpansion1", name:"Regimental Expansion I", levels:[
            {},{meat:9400,wood:9400,coal:1800,iron:470,steel:560,secs:216,power:5760,buff:"+320 Deployment Capacity"},
            {meat:13000,wood:13000,coal:2600,iron:660,steel:780,secs:324,power:5760,buff:"+320 Deployment Capacity"},
            {meat:28000,wood:28000,coal:5600,iron:1400,steel:1600,secs:864,power:6480,buff:"+360 Deployment Capacity"},
          ]},
          { id:"closeCombat1", name:"Close Combat I", levels:[
            {},{meat:3300,wood:3300,coal:670,iron:160,steel:200,secs:67,power:1750,buff:"+1.25% Infantry Lethality"},
            {meat:4700,wood:4700,coal:940,iron:230,steel:280,secs:101,power:1750,buff:"+1.25% Infantry Lethality"},
            {meat:10000,wood:10000,coal:2000,iron:500,steel:600,secs:270,power:2100,buff:"+1.50% Infantry Lethality"},
          ]},
          { id:"targetSniping1", name:"Targeted Sniping I", levels:[
            {},{meat:8100,wood:8100,coal:1600,iron:400,steel:480,secs:162,power:4375,buff:"+1.25% Marksman Lethality"},
            {meat:11000,wood:11000,coal:2200,iron:560,steel:670,secs:243,power:4375,buff:"+1.25% Marksman Lethality"},
            {meat:24000,wood:24000,coal:4800,iron:1200,steel:1400,secs:648,power:5250,buff:"+1.50% Marksman Lethality"},
          ]},
          { id:"lanceUpgrade1", name:"Lance Upgrade I", levels:[
            {},{meat:8100,wood:8100,coal:1600,iron:400,steel:480,secs:162,power:4375,buff:"+1.25% Lancer Lethality"},
            {meat:11000,wood:11000,coal:2200,iron:560,steel:670,secs:243,power:4375,buff:"+1.25% Lancer Lethality"},
            {meat:24000,wood:24000,coal:4800,iron:1200,steel:1400,secs:648,power:5250,buff:"+1.50% Lancer Lethality"},
          ]},
          { id:"shieldUpgrade1", name:"Shield Upgrade I", levels:[
            {},{meat:10000,wood:10000,coal:20000,iron:500,steel:600,secs:202,power:5625,buff:"+1.25% Infantry Health"},
            {meat:14000,wood:14000,coal:2800,iron:700,steel:840,secs:303,power:5625,buff:"+1.25% Infantry Health"},
            {meat:30000,wood:30000,coal:6000,iron:1500,steel:1800,secs:810,power:6750,buff:"+1.50% Infantry Health"},
          ]},
          { id:"marksmanArmor1", name:"Marksman Armor I", levels:[
            {},{meat:5400,wood:5400,coal:1000,iron:270,steel:320,secs:108,power:3000,buff:"+1.25% Marksman Health"},
            {meat:7500,wood:7500,coal:1500,iron:370,steel:440,secs:162,power:3000,buff:"+1.25% Marksman Health"},
            {meat:16000,wood:16000,coal:3200,iron:810,steel:960,secs:432,power:3600,buff:"+1.50% Marksman Health"},
          ]},
          { id:"lancerArmor1", name:"Lancer Armor I", levels:[
            {},{meat:5400,wood:5400,coal:1000,iron:270,steel:320,secs:108,power:3000,buff:"+1.25% Lancer Health"},
            {meat:7500,wood:7500,coal:1500,iron:370,steel:440,secs:162,power:3000,buff:"+1.25% Lancer Health"},
            {meat:16000,wood:16000,coal:3200,iron:810,steel:960,secs:432,power:3600,buff:"+1.50% Lancer Health"},
          ]},
        ]
      },
      {
        tier: "II", minRCLevel: 14,
        researches: [
          { id:"weaponsPrep2", name:"Weapons Prep II", levels:[
            {},{meat:87000,wood:87000,coal:17000,iron:4300,steel:1000,secs:1950,power:6300,buff:"+0.75% All Troops Attack"},
            {meat:120000,wood:120000,coal:24000,iron:6100,steel:1400,secs:2925,power:6300,buff:"+0.75% All Troops Attack"},
            {meat:260000,wood:260000,coal:52000,iron:13000,steel:3100,secs:7800,power:8400,buff:"+1.00% All Troops Attack"},
          ]},
          { id:"reprisalTactics2", name:"Reprisal Tactics II", levels:[
            {},{meat:33000,wood:33000,coal:6700,iron:1600,steel:400,secs:750,power:2450,buff:"+1.75% Infantry Attack"},
            {meat:47000,wood:47000,coal:9400,iron:2300,steel:560,secs:1125,power:2450,buff:"+1.75% Infantry Attack"},
            {meat:100000,wood:100000,coal:20000,iron:5000,steel:1200,secs:3000,power:2800,buff:"+2.00% Infantry Attack"},
          ]},
          { id:"precisionTarget2", name:"Precision Targeting II", levels:[
            {},{meat:81000,wood:81000,coal:16000,iron:4000,steel:960,secs:1800,power:6125,buff:"+1.75% Marksman Attack"},
            {meat:110000,wood:110000,coal:22000,iron:5600,steel:1300,secs:2700,power:6125,buff:"+1.75% Marksman Attack"},
            {meat:240000,wood:240000,coal:48000,iron:12000,steel:2800,secs:7200,power:7000,buff:"+2.00% Marksman Attack"},
          ]},
          { id:"skirmishing2", name:"Skirmishing II", levels:[
            {},{meat:81000,wood:81000,coal:16000,iron:4000,steel:960,secs:1800,power:6125,buff:"+1.75% Lancer Attack"},
            {meat:110000,wood:110000,coal:22000,iron:5600,steel:1300,secs:2700,power:6125,buff:"+1.75% Lancer Attack"},
            {meat:240000,wood:240000,coal:48000,iron:12000,steel:2800,secs:7200,power:7000,buff:"+2.00% Lancer Attack"},
          ]},
          { id:"defFormations2", name:"Defensive Formations II", levels:[
            {},{meat:100000,wood:100000,coal:20000,iron:5000,steel:1200,secs:2250,power:7875,buff:"+1.75% Infantry Defense"},
            {meat:140000,wood:140000,coal:28000,iron:7000,steel:1600,secs:3375,power:7875,buff:"+1.75% Infantry Defense"},
            {meat:300000,wood:300000,coal:60000,iron:15000,steel:3600,secs:9000,power:9000,buff:"+2.00% Infantry Defense"},
          ]},
          { id:"picketLines2", name:"Picket Lines II", levels:[
            {},{meat:54000,wood:54000,coal:10000,iron:2700,steel:640,secs:1200,power:4200,buff:"+1.75% Marksman Defense"},
            {meat:75000,wood:75000,coal:15000,iron:3700,steel:890,secs:1800,power:4200,buff:"+1.75% Marksman Defense"},
            {meat:160000,wood:160000,coal:32000,iron:8100,steel:1900,secs:4800,power:4800,buff:"+2.00% Marksman Defense"},
          ]},
          { id:"bulwark2", name:"Bulwark Formations II", levels:[
            {},{meat:54000,wood:54000,coal:10000,iron:2700,steel:640,secs:1200,power:4200,buff:"+1.75% Lancer Defense"},
            {meat:75000,wood:75000,coal:15000,iron:3700,steel:890,secs:1800,power:4200,buff:"+1.75% Lancer Defense"},
            {meat:160000,wood:160000,coal:32000,iron:8100,steel:1900,secs:4800,power:4800,buff:"+2.00% Lancer Defense"},
          ]},
          { id:"specDefTraining2", name:"Special Def. Training II", levels:[
            {},{meat:87000,wood:87000,coal:17000,iron:4300,steel:1000,secs:1950,power:6300,buff:"+0.75% All Troops Defense"},
            {meat:120000,wood:120000,coal:24000,iron:6100,steel:1400,secs:2925,power:6300,buff:"+0.75% All Troops Defense"},
            {meat:260000,wood:260000,coal:52000,iron:13000,steel:3100,secs:7800,power:8400,buff:"+1.00% All Troops Defense"},
          ]},
          { id:"survival2", name:"Survival Techniques II", levels:[
            {},{meat:87000,wood:87000,coal:17000,iron:4300,steel:1000,secs:1950,power:6300,buff:"+0.75% All Troops Health"},
            {meat:120000,wood:120000,coal:24000,iron:6100,steel:1400,secs:2925,power:6300,buff:"+0.75% All Troops Health"},
            {meat:260000,wood:260000,coal:52000,iron:13000,steel:3100,secs:7800,power:8400,buff:"+1.00% All Troops Health"},
          ]},
          { id:"assault2", name:"Assault Techniques II", levels:[
            {},{meat:87000,wood:87000,coal:17000,iron:4300,steel:1000,secs:1950,power:6300,buff:"+0.75% All Troops Lethality"},
            {meat:120000,wood:120000,coal:24000,iron:6100,steel:1400,secs:2925,power:6300,buff:"+0.75% All Troops Lethality"},
            {meat:260000,wood:260000,coal:52000,iron:13000,steel:3100,secs:7800,power:8400,buff:"+1.00% All Troops Lethality"},
          ]},
          { id:"regExpansion2", name:"Regimental Expansion II", levels:[
            {},{meat:94000,wood:94000,coal:18000,iron:4700,steel:1100,secs:2400,power:5760,buff:"+320 Deployment Capacity"},
            {meat:130000,wood:130000,coal:26000,iron:6600,steel:1500,secs:3600,power:5760,buff:"+320 Deployment Capacity"},
            {meat:280000,wood:280000,coal:56000,iron:14000,steel:3300,secs:9600,power:13680,buff:"+760 Deployment Capacity"},
          ]},
          { id:"closeCombat2", name:"Close Combat II", levels:[
            {},{meat:33000,wood:33000,coal:6700,iron:1600,steel:400,secs:750,power:2450,buff:"+1.75% Infantry Lethality"},
            {meat:47000,wood:47000,coal:9400,iron:2300,steel:560,secs:1125,power:2450,buff:"+1.75% Infantry Lethality"},
            {meat:100000,wood:100000,coal:20000,iron:5000,steel:1200,secs:3000,power:2800,buff:"+2.00% Infantry Lethality"},
          ]},
          { id:"targetSniping2", name:"Targeted Sniping II", levels:[
            {},{meat:81000,wood:81000,coal:16000,iron:4000,steel:960,secs:1800,power:6125,buff:"+1.75% Marksman Lethality"},
            {meat:110000,wood:110000,coal:22000,iron:5600,steel:1300,secs:2700,power:6125,buff:"+1.75% Marksman Lethality"},
            {meat:240000,wood:240000,coal:48000,iron:12000,steel:2800,secs:7200,power:7000,buff:"+2.00% Marksman Lethality"},
          ]},
          { id:"lanceUpgrade2", name:"Lance Upgrade II", levels:[
            {},{meat:81000,wood:81000,coal:16000,iron:4000,steel:960,secs:1800,power:6125,buff:"+1.75% Lancer Lethality"},
            {meat:110000,wood:110000,coal:22000,iron:5600,steel:1300,secs:2700,power:6125,buff:"+1.75% Lancer Lethality"},
            {meat:240000,wood:240000,coal:48000,iron:12000,steel:2800,secs:7200,power:7000,buff:"+2.00% Lancer Lethality"},
          ]},
          { id:"shieldUpgrade2", name:"Shield Upgrade II", levels:[
            {},{meat:100000,wood:100000,coal:20000,iron:5000,steel:1200,secs:2250,power:7875,buff:"+1.75% Infantry Health"},
            {meat:140000,wood:140000,coal:28000,iron:7000,steel:1600,secs:3375,power:7875,buff:"+1.75% Infantry Health"},
            {meat:300000,wood:300000,coal:60000,iron:15000,steel:3600,secs:9000,power:9000,buff:"+2.00% Infantry Health"},
          ]},
          { id:"marksmanArmor2", name:"Marksman Armor II", levels:[
            {},{meat:54000,wood:54000,coal:10000,iron:2700,steel:640,secs:1200,power:4200,buff:"+1.75% Marksman Health"},
            {meat:75000,wood:75000,coal:15000,iron:3700,steel:890,secs:1800,power:4200,buff:"+1.75% Marksman Health"},
            {meat:160000,wood:160000,coal:32000,iron:8100,steel:1900,secs:4800,power:4800,buff:"+2.00% Marksman Health"},
          ]},
          { id:"lancerArmor2", name:"Lancer Armor II", levels:[
            {},{meat:54000,wood:54000,coal:10000,iron:2700,steel:640,secs:1200,power:4200,buff:"+1.75% Lancer Health"},
            {meat:75000,wood:75000,coal:15000,iron:3700,steel:890,secs:1800,power:4200,buff:"+1.75% Lancer Health"},
            {meat:160000,wood:160000,coal:32000,iron:8100,steel:1900,secs:4800,power:4800,buff:"+2.00% Lancer Health"},
          ]},
        ]
      },
      {
        tier: "III", minRCLevel: 20,
        researches: [
          { id:"weaponsPrep3", name:"Weapons Prep III", levels:[
            {},{meat:280000,wood:280000,coal:56000,iron:14000,steel:3100,secs:7800,power:8400,buff:"+1.00% All Troops Attack"},
            {meat:360000,wood:360000,coal:73000,iron:18000,steel:4000,secs:9360,power:8400,buff:"+1.00% All Troops Attack"},
            {meat:470000,wood:470000,coal:95000,iron:23000,steel:5300,secs:15600,power:8400,buff:"+1.00% All Troops Attack"},
            {meat:1100000,wood:1100000,coal:220000,iron:56000,steel:12000,secs:46800,power:12600,buff:"+1.50% All Troops Attack"},
          ]},
          { id:"reprisalTactics3", name:"Reprisal Tactics III", levels:[
            {},{meat:100000,wood:100000,coal:21000,iron:5400,steel:1200,secs:3000,power:3500,buff:"+2.50% Infantry Attack"},
            {meat:140000,wood:140000,coal:28000,iron:7000,steel:1500,secs:3600,power:3500,buff:"+2.50% Infantry Attack"},
            {meat:180000,wood:180000,coal:36000,iron:9100,steel:2000,secs:6000,power:3500,buff:"+2.50% Infantry Attack"},
            {meat:430000,wood:430000,coal:86000,iron:21000,steel:4800,secs:18000,power:5600,buff:"+4.00% Infantry Attack"},
          ]},
          { id:"precisionTarget3", name:"Precision Targeting III", levels:[
            {},{meat:250000,wood:250000,coal:51000,iron:12000,steel:2800,secs:7200,power:8750,buff:"+2.50% Marksman Attack"},
            {meat:330000,wood:330000,coal:67000,iron:16000,steel:3700,secs:8640,power:8750,buff:"+2.50% Marksman Attack"},
            {meat:440000,wood:440000,coal:88000,iron:22000,steel:4800,secs:14400,power:8750,buff:"+2.50% Marksman Attack"},
            {meat:1000000,wood:1000000,coal:200000,iron:51000,steel:11000,secs:43200,power:14000,buff:"+4.00% Marksman Attack"},
          ]},
          { id:"skirmishing3", name:"Skirmishing III", levels:[
            {},{meat:250000,wood:250000,coal:51000,iron:12000,steel:2800,secs:7200,power:8750,buff:"+2.50% Lancer Attack"},
            {meat:330000,wood:330000,coal:67000,iron:16000,steel:3700,secs:8640,power:8750,buff:"+2.50% Lancer Attack"},
            {meat:440000,wood:440000,coal:88000,iron:22000,steel:4800,secs:14400,power:8750,buff:"+2.50% Lancer Attack"},
            {meat:1000000,wood:1000000,coal:200000,iron:51000,steel:11000,secs:43200,power:14000,buff:"+4.00% Lancer Attack"},
          ]},
          { id:"defFormations3", name:"Defensive Formations III", levels:[
            {},{meat:320000,wood:320000,coal:64000,iron:16000,steel:3600,secs:9000,power:11250,buff:"+2.50% Infantry Defense"},
            {meat:420000,wood:420000,coal:84000,iron:21000,steel:4600,secs:10800,power:11250,buff:"+2.50% Infantry Defense"},
            {meat:550000,wood:550000,coal:110000,iron:27000,steel:6100,secs:18000,power:11250,buff:"+2.50% Infantry Defense"},
            {meat:1200000,wood:1200000,coal:250000,iron:64000,steel:14000,secs:54000,power:18000,buff:"+4.00% Infantry Defense"},
          ]},
          { id:"picketLines3", name:"Picket Lines III", levels:[
            {},{meat:170000,wood:170000,coal:34000,iron:8600,steel:1900,secs:4800,power:6000,buff:"+2.50% Marksman Defense"},
            {meat:220000,wood:220000,coal:44000,iron:11000,steel:2400,secs:5760,power:6000,buff:"+2.50% Marksman Defense"},
            {meat:290000,wood:290000,coal:58000,iron:14000,steel:3200,secs:9600,power:6000,buff:"+2.50% Marksman Defense"},
            {meat:690000,wood:690000,coal:130000,iron:34000,steel:7600,secs:28800,power:9600,buff:"+4.00% Marksman Defense"},
          ]},
          { id:"bulwark3", name:"Bulwark Formations III", levels:[
            {},{meat:170000,wood:170000,coal:34000,iron:8600,steel:1900,secs:4800,power:6000,buff:"+2.50% Lancer Defense"},
            {meat:220000,wood:220000,coal:44000,iron:11000,steel:2400,secs:5760,power:6000,buff:"+2.50% Lancer Defense"},
            {meat:290000,wood:290000,coal:58000,iron:14000,steel:3200,secs:9600,power:6000,buff:"+2.50% Lancer Defense"},
            {meat:690000,wood:690000,coal:130000,iron:34000,steel:7600,secs:28800,power:9600,buff:"+4.00% Lancer Defense"},
          ]},
          { id:"specDefTraining3", name:"Special Def. Training III", levels:[
            {},{meat:280000,wood:280000,coal:56000,iron:14000,steel:3100,secs:7800,power:8400,buff:"+1.00% All Troops Defense"},
            {meat:360000,wood:360000,coal:73000,iron:18000,steel:4000,secs:8760,power:8400,buff:"+1.00% All Troops Defense"},
            {meat:470000,wood:470000,coal:95000,iron:23000,steel:5300,secs:15600,power:8400,buff:"+1.00% All Troops Defense"},
            {meat:1100000,wood:1100000,coal:220000,iron:56000,steel:12000,secs:46800,power:12600,buff:"+1.50% All Troops Defense"},
          ]},
          { id:"survival3", name:"Survival Techniques III", levels:[
            {},{meat:280000,wood:280000,coal:56000,iron:14000,steel:3100,secs:7800,power:8400,buff:"+1.00% All Troops Health"},
            {meat:360000,wood:360000,coal:73000,iron:18000,steel:4000,secs:9360,power:8400,buff:"+1.00% All Troops Health"},
            {meat:470000,wood:470000,coal:95000,iron:23000,steel:5300,secs:15600,power:8400,buff:"+1.00% All Troops Health"},
            {meat:1100000,wood:1100000,coal:220000,iron:56000,steel:12000,secs:46800,power:12600,buff:"+1.50% All Troops Health"},
          ]},
          { id:"assault3", name:"Assault Techniques III", levels:[
            {},{meat:280000,wood:280000,coal:56000,iron:14000,steel:3100,secs:7800,power:8400,buff:"+1.00% All Troops Lethality"},
            {meat:360000,wood:360000,coal:73000,iron:18000,steel:4000,secs:9360,power:8400,buff:"+1.00% All Troops Lethality"},
            {meat:470000,wood:470000,coal:95000,iron:23000,steel:5300,secs:15600,power:8400,buff:"+1.00% All Troops Lethality"},
            {meat:1100000,wood:1100000,coal:220000,iron:56000,steel:12000,secs:46800,power:12600,buff:"+1.50% All Troops Lethality"},
          ]},
          { id:"regExpansion3", name:"Regimental Expansion III", levels:[
            {},{meat:300000,wood:300000,coal:60000,iron:15000,steel:3300,secs:9600,power:11160,buff:"+620 Deployment Capacity"},
            {meat:390000,wood:390000,coal:78000,iron:19000,steel:4300,secs:11520,power:10440,buff:"+580 Deployment Capacity"},
            {meat:510000,wood:510000,coal:100000,iron:25000,steel:5700,secs:19200,power:10800,buff:"+600 Deployment Capacity"},
            {meat:1200000,wood:1200000,coal:240000,iron:60000,steel:13000,secs:57600,power:18000,buff:"+1,000 Deployment Capacity"},
          ]},
          { id:"closeCombat3", name:"Close Combat III", levels:[
            {},{meat:100000,wood:100000,coal:21000,iron:5400,steel:1200,secs:3000,power:3500,buff:"+2.50% Infantry Lethality"},
            {meat:140000,wood:140000,coal:28000,iron:7000,steel:1500,secs:3600,power:3500,buff:"+2.50% Infantry Lethality"},
            {meat:180000,wood:180000,coal:36000,iron:9100,steel:2000,secs:6000,power:3500,buff:"+2.50% Infantry Lethality"},
            {meat:430000,wood:430000,coal:86000,iron:21000,steel:4800,secs:18000,power:5600,buff:"+4.00% Infantry Lethality"},
          ]},
          { id:"targetSniping3", name:"Targeted Sniping III", levels:[
            {},{meat:250000,wood:250000,coal:51000,iron:12000,steel:2800,secs:7200,power:8750,buff:"+2.50% Marksman Lethality"},
            {meat:330000,wood:330000,coal:67000,iron:16000,steel:3700,secs:8640,power:8750,buff:"+2.50% Marksman Lethality"},
            {meat:440000,wood:440000,coal:88000,iron:22000,steel:4800,secs:14400,power:8750,buff:"+2.50% Marksman Lethality"},
            {meat:1000000,wood:1000000,coal:200000,iron:51000,steel:11000,secs:43200,power:14000,buff:"+4.00% Marksman Lethality"},
          ]},
          { id:"lanceUpgrade3", name:"Lance Upgrade III", levels:[
            {},{meat:250000,wood:250000,coal:51000,iron:12000,steel:2800,secs:7200,power:8750,buff:"+2.50% Lancer Lethality"},
            {meat:330000,wood:330000,coal:67000,iron:16000,steel:3700,secs:8640,power:8750,buff:"+2.50% Lancer Lethality"},
            {meat:440000,wood:440000,coal:88000,iron:22000,steel:4800,secs:14400,power:8750,buff:"+2.50% Lancer Lethality"},
            {meat:1000000,wood:1000000,coal:200000,iron:51000,steel:11000,secs:43200,power:14000,buff:"+4.00% Lancer Lethality"},
          ]},
          { id:"shieldUpgrade3", name:"Shield Upgrade III", levels:[
            {},{meat:320000,wood:320000,coal:64000,iron:16000,steel:3600,secs:9000,power:11250,buff:"+2.50% Infantry Health"},
            {meat:420000,wood:420000,coal:84000,iron:21000,steel:4600,secs:10800,power:11250,buff:"+2.50% Infantry Health"},
            {meat:550000,wood:550000,coal:110000,iron:27000,steel:6100,secs:18000,power:11250,buff:"+2.50% Infantry Health"},
            {meat:1200000,wood:1200000,coal:250000,iron:64000,steel:14000,secs:54000,power:18000,buff:"+4.00% Infantry Health"},
          ]},
          { id:"marksmanArmor3", name:"Marksman Armor III", levels:[
            {},{meat:170000,wood:170000,coal:34000,iron:8600,steel:1900,secs:4800,power:6000,buff:"+2.50% Marksman Health"},
            {meat:220000,wood:220000,coal:44000,iron:11000,steel:2400,secs:5760,power:6000,buff:"+2.50% Marksman Health"},
            {meat:290000,wood:290000,coal:58000,iron:14000,steel:3200,secs:9600,power:6000,buff:"+2.50% Marksman Health"},
            {meat:690000,wood:690000,coal:130000,iron:34000,steel:7600,secs:28800,power:9600,buff:"+4.00% Marksman Health"},
          ]},
          { id:"lancerArmor3", name:"Lancer Armor III", levels:[
            {},{meat:170000,wood:170000,coal:34000,iron:8600,steel:1900,secs:4800,power:6000,buff:"+2.50% Lancer Health"},
            {meat:220000,wood:220000,coal:44000,iron:11000,steel:2400,secs:5760,power:6000,buff:"+2.50% Lancer Health"},
            {meat:290000,wood:290000,coal:58000,iron:14000,steel:3200,secs:9600,power:6000,buff:"+2.50% Lancer Health"},
            {meat:690000,wood:690000,coal:130000,iron:34000,steel:7600,secs:28800,power:9600,buff:"+4.00% Lancer Health"},
          ]},
        ]
      },
      // Tiers IV-VI abbreviated for space — use same pattern
      {
        tier: "IV", minRCLevel: 26,
        researches: [
          { id:"weaponsPrep4", name:"Weapons Prep IV", levels:[
            {},{meat:800000,wood:800000,coal:160000,iron:40000,steel:10000,secs:52000,power:14700,buff:"+1.75% All Troops Attack"},
            {meat:960000,wood:960000,coal:190000,iron:48000,steel:12000,secs:67600,power:14700,buff:"+1.75% All Troops Attack"},
            {meat:1100000,wood:1100000,coal:220000,iron:56000,steel:14000,secs:104000,power:14700,buff:"+1.75% All Troops Attack"},
            {meat:1400000,wood:1400000,coal:290000,iron:72000,steel:18000,secs:156000,power:14700,buff:"+1.75% All Troops Attack"},
            {meat:2900000,wood:2900000,coal:590000,iron:140000,steel:38000,secs:390000,power:25200,buff:"+3.00% All Troops Attack"},
          ]},
          { id:"regExpansion4", name:"Regimental Expansion IV", levels:[
            {},{meat:860000,wood:860000,coal:170000,iron:43000,steel:11000,secs:64000,power:17820,buff:"+990 Deployment Capacity"},
            {meat:1000000,wood:1000000,coal:200000,iron:52000,steel:13000,secs:83200,power:16380,buff:"+910 Deployment Capacity"},
            {meat:1200000,wood:1200000,coal:240000,iron:60000,steel:15000,secs:128000,power:18000,buff:"+1,000 Deployment Capacity"},
            {meat:1500000,wood:1500000,coal:310000,iron:78000,steel:20000,secs:192000,power:18000,buff:"+1,000 Deployment Capacity"},
            {meat:3200000,wood:3200000,coal:640000,iron:160000,steel:41000,secs:480000,power:30600,buff:"+1,700 Deployment Capacity"},
          ]},
          { id:"reprisalTactics4", name:"Reprisal Tactics IV", levels:[
            {},{meat:310000,wood:310000,coal:62000,iron:15000,steel:4000,secs:20000,power:5600,buff:"+4.00% Infantry Attack"},
            {meat:370000,wood:370000,coal:74000,iron:18000,steel:4800,secs:26000,power:5600,buff:"+4.00% Infantry Attack"},
            {meat:430000,wood:430000,coal:86000,iron:21000,steel:5600,secs:40000,power:5600,buff:"+4.00% Infantry Attack"},
            {meat:550000,wood:550000,coal:110000,iron:27000,steel:7200,secs:60000,power:5600,buff:"+4.00% Infantry Attack"},
            {meat:1100000,wood:1100000,coal:220000,iron:57000,steel:14000,secs:150000,power:9100,buff:"+6.50% Infantry Attack"},
          ]},
          { id:"precisionTarget4", name:"Precision Targeting IV", levels:[
            {},{meat:740000,wood:740000,coal:140000,iron:37000,steel:9600,secs:48000,power:14000,buff:"+4.00% Marksman Attack"},
            {meat:890000,wood:890000,coal:170000,iron:44000,steel:11000,secs:62400,power:14000,buff:"+4.00% Marksman Attack"},
            {meat:1000000,wood:1000000,coal:200000,iron:52000,steel:13000,secs:96000,power:14000,buff:"+4.00% Marksman Attack"},
            {meat:1300000,wood:1300000,coal:260000,iron:67000,steel:17000,secs:144000,power:14000,buff:"+4.00% Marksman Attack"},
            {meat:2700000,wood:2700000,coal:550000,iron:130000,steel:35000,secs:360000,power:22750,buff:"+6.50% Marksman Attack"},
          ]},
          { id:"skirmishing4", name:"Skirmishing IV", levels:[
            {},{meat:740000,wood:740000,coal:140000,iron:37000,steel:9600,secs:48000,power:14000,buff:"+4.00% Lancer Attack"},
            {meat:890000,wood:890000,coal:170000,iron:44000,steel:11000,secs:62400,power:14000,buff:"+4.00% Lancer Attack"},
            {meat:1000000,wood:1000000,coal:200000,iron:52000,steel:13000,secs:96000,power:14000,buff:"+4.00% Lancer Attack"},
            {meat:1300000,wood:1300000,coal:260000,iron:67000,steel:17000,secs:144000,power:14000,buff:"+4.00% Lancer Attack"},
            {meat:2700000,wood:2700000,coal:550000,iron:130000,steel:35000,secs:360000,power:22750,buff:"+6.50% Lancer Attack"},
          ]},
          { id:"defFormations4", name:"Defensive Formations IV", levels:[
            {},{meat:930000,wood:930000,coal:180000,iron:46000,steel:12000,secs:60000,power:18000,buff:"+4.00% Infantry Defense"},
            {meat:1100000,wood:1100000,coal:220000,iron:55000,steel:14000,secs:78000,power:18000,buff:"+4.00% Infantry Defense"},
            {meat:1300000,wood:1300000,coal:260000,iron:65000,steel:16000,secs:120000,power:18000,buff:"+4.00% Infantry Defense"},
            {meat:1600000,wood:1600000,coal:330000,iron:83000,steel:21000,secs:180000,power:18000,buff:"+4.00% Infantry Defense"},
            {meat:3400000,wood:3400000,coal:680000,iron:170000,steel:44000,secs:450000,power:29250,buff:"+6.50% Infantry Defense"},
          ]},
          { id:"picketLines4", name:"Picket Lines IV", levels:[
            {},{meat:490000,wood:490000,coal:99000,iron:24000,steel:6400,secs:32000,power:9600,buff:"+4.00% Marksman Defense"},
            {meat:590000,wood:590000,coal:110000,iron:29000,steel:7600,secs:41600,power:9600,buff:"+4.00% Marksman Defense"},
            {meat:690000,wood:690000,coal:130000,iron:34000,steel:8900,secs:64000,power:9600,buff:"+4.00% Marksman Defense"},
            {meat:890000,wood:890000,coal:170000,iron:44000,steel:11000,secs:96000,power:9600,buff:"+4.00% Marksman Defense"},
            {meat:1800000,wood:1800000,coal:360000,iron:91000,steel:23000,secs:240000,power:15600,buff:"+6.50% Marksman Defense"},
          ]},
          { id:"bulwark4", name:"Bulwark Formations IV", levels:[
            {},{meat:490000,wood:490000,coal:99000,iron:24000,steel:6400,secs:32000,power:9600,buff:"+4.00% Lancer Defense"},
            {meat:590000,wood:590000,coal:110000,iron:29000,steel:7600,secs:41600,power:9600,buff:"+4.00% Lancer Defense"},
            {meat:690000,wood:690000,coal:130000,iron:34000,steel:8900,secs:64000,power:9600,buff:"+4.00% Lancer Defense"},
            {meat:890000,wood:890000,coal:170000,iron:44000,steel:11000,secs:96000,power:9600,buff:"+4.00% Lancer Defense"},
            {meat:1800000,wood:1800000,coal:360000,iron:91000,steel:23000,secs:240000,power:15600,buff:"+6.50% Lancer Defense"},
          ]},
          { id:"specDefTraining4", name:"Special Def. Training IV", levels:[
            {},{meat:800000,wood:800000,coal:160000,iron:40000,steel:10000,secs:52000,power:14700,buff:"+1.75% All Troops Defense"},
            {meat:960000,wood:960000,coal:190000,iron:48000,steel:12000,secs:67600,power:14700,buff:"+1.75% All Troops Defense"},
            {meat:1100000,wood:1100000,coal:220000,iron:56000,steel:14000,secs:104000,power:14700,buff:"+1.75% All Troops Defense"},
            {meat:1400000,wood:1400000,coal:290000,iron:72000,steel:18000,secs:156000,power:14700,buff:"+1.75% All Troops Defense"},
            {meat:2900000,wood:2900000,coal:590000,iron:140000,steel:38000,secs:390000,power:25200,buff:"+3.00% All Troops Defense"},
          ]},
          { id:"survival4", name:"Survival Techniques IV", levels:[
            {},{meat:800000,wood:800000,coal:160000,iron:40000,steel:10000,secs:52000,power:14700,buff:"+1.75% All Troops Health"},
            {meat:960000,wood:960000,coal:190000,iron:48000,steel:12000,secs:67600,power:14700,buff:"+1.75% All Troops Health"},
            {meat:1100000,wood:1100000,coal:220000,iron:56000,steel:14000,secs:104000,power:14700,buff:"+1.75% All Troops Health"},
            {meat:1400000,wood:1400000,coal:290000,iron:72000,steel:18000,secs:156000,power:14700,buff:"+1.75% All Troops Health"},
            {meat:2900000,wood:2900000,coal:590000,iron:140000,steel:38000,secs:390000,power:25200,buff:"+3.00% All Troops Health"},
          ]},
          { id:"assault4", name:"Assault Techniques IV", levels:[
            {},{meat:800000,wood:800000,coal:160000,iron:40000,steel:10000,secs:52000,power:14700,buff:"+1.75% All Troops Lethality"},
            {meat:960000,wood:960000,coal:190000,iron:48000,steel:12000,secs:67600,power:14700,buff:"+1.75% All Troops Lethality"},
            {meat:1100000,wood:1100000,coal:220000,iron:56000,steel:14000,secs:104000,power:14700,buff:"+1.75% All Troops Lethality"},
            {meat:1400000,wood:1400000,coal:290000,iron:72000,steel:18000,secs:156000,power:14700,buff:"+1.75% All Troops Lethality"},
            {meat:2900000,wood:2900000,coal:590000,iron:140000,steel:38000,secs:390000,power:25200,buff:"+3.00% All Troops Lethality"},
          ]},
          { id:"closeCombat4", name:"Close Combat IV", levels:[
            {},{meat:310000,wood:310000,coal:62000,iron:15000,steel:4000,secs:20000,power:5600,buff:"+4.00% Infantry Lethality"},
            {meat:370000,wood:370000,coal:74000,iron:18000,steel:4800,secs:26000,power:5600,buff:"+4.00% Infantry Lethality"},
            {meat:430000,wood:430000,coal:86000,iron:21000,steel:5600,secs:40000,power:5600,buff:"+4.00% Infantry Lethality"},
            {meat:550000,wood:550000,coal:110000,iron:27000,steel:7200,secs:60000,power:5600,buff:"+4.00% Infantry Lethality"},
            {meat:1100000,wood:1100000,coal:220000,iron:57000,steel:14000,secs:150000,power:9100,buff:"+6.50% Infantry Lethality"},
          ]},
          { id:"targetSniping4", name:"Targeted Sniping IV", levels:[
            {},{meat:740000,wood:740000,coal:140000,iron:37000,steel:9600,secs:48000,power:14000,buff:"+4.00% Marksman Lethality"},
            {meat:890000,wood:890000,coal:170000,iron:44000,steel:11000,secs:62400,power:14000,buff:"+4.00% Marksman Lethality"},
            {meat:1000000,wood:1000000,coal:200000,iron:52000,steel:13000,secs:96000,power:14000,buff:"+4.00% Marksman Lethality"},
            {meat:1300000,wood:1300000,coal:260000,iron:67000,steel:17000,secs:144000,power:14000,buff:"+4.00% Marksman Lethality"},
            {meat:2700000,wood:2700000,coal:550000,iron:130000,steel:35000,secs:360000,power:22750,buff:"+6.50% Marksman Lethality"},
          ]},
          { id:"lanceUpgrade4", name:"Lance Upgrade IV", levels:[
            {},{meat:740000,wood:740000,coal:140000,iron:37000,steel:9600,secs:48000,power:14000,buff:"+4.00% Lancer Lethality"},
            {meat:890000,wood:890000,coal:170000,iron:44000,steel:11000,secs:62400,power:14000,buff:"+4.00% Lancer Lethality"},
            {meat:1000000,wood:1000000,coal:200000,iron:52000,steel:13000,secs:96000,power:14000,buff:"+4.00% Lancer Lethality"},
            {meat:1300000,wood:1300000,coal:260000,iron:67000,steel:17000,secs:144000,power:14000,buff:"+4.00% Lancer Lethality"},
            {meat:2700000,wood:2700000,coal:550000,iron:130000,steel:35000,secs:360000,power:22750,buff:"+6.50% Lancer Lethality"},
          ]},
          { id:"shieldUpgrade4", name:"Shield Upgrade IV", levels:[
            {},{meat:930000,wood:930000,coal:180000,iron:46000,steel:12000,secs:60000,power:18000,buff:"+4.00% Infantry Health"},
            {meat:1100000,wood:1100000,coal:220000,iron:55000,steel:14000,secs:78000,power:18000,buff:"+4.00% Infantry Health"},
            {meat:1300000,wood:1300000,coal:260000,iron:65000,steel:16000,secs:120000,power:18000,buff:"+4.00% Infantry Health"},
            {meat:1600000,wood:1600000,coal:330000,iron:83000,steel:21000,secs:180000,power:18000,buff:"+4.00% Infantry Health"},
            {meat:3400000,wood:3400000,coal:680000,iron:170000,steel:44000,secs:450000,power:29250,buff:"+6.50% Infantry Health"},
          ]},
          { id:"marksmanArmor4", name:"Marksman Armor IV", levels:[
            {},{meat:490000,wood:490000,coal:99000,iron:24000,steel:6400,secs:32000,power:9600,buff:"+4.00% Marksman Health"},
            {meat:590000,wood:590000,coal:110000,iron:29000,steel:7600,secs:41600,power:9600,buff:"+4.00% Marksman Health"},
            {meat:690000,wood:690000,coal:130000,iron:34000,steel:8900,secs:64000,power:9600,buff:"+4.00% Marksman Health"},
            {meat:890000,wood:890000,coal:170000,iron:44000,steel:11000,secs:96000,power:9600,buff:"+4.00% Marksman Health"},
            {meat:1800000,wood:1800000,coal:360000,iron:91000,steel:23000,secs:240000,power:15600,buff:"+6.50% Marksman Health"},
          ]},
          { id:"lancerArmor4", name:"Lancer Armor IV", levels:[
            {},{meat:490000,wood:490000,coal:99000,iron:24000,steel:6400,secs:32000,power:9600,buff:"+4.00% Lancer Health"},
            {meat:590000,wood:590000,coal:110000,iron:29000,steel:7600,secs:41600,power:9600,buff:"+4.00% Lancer Health"},
            {meat:690000,wood:690000,coal:130000,iron:34000,steel:8900,secs:64000,power:9600,buff:"+4.00% Lancer Health"},
            {meat:890000,wood:890000,coal:170000,iron:44000,steel:11000,secs:96000,power:9600,buff:"+4.00% Lancer Health"},
            {meat:1800000,wood:1800000,coal:360000,iron:91000,steel:23000,secs:240000,power:15600,buff:"+6.50% Lancer Health"},
          ]},
        ]
      },
      {
        tier: "V", minRCLevel: 30,
        researches: [
          { id:"weaponsPrep5", name:"Weapons Prep V", levels:[
            {},{meat:1400000,wood:1400000,coal:280000,iron:71000,steel:41000,secs:325000,power:16800,buff:"+2.00% All Troops Attack"},
            {meat:1400000,wood:1400000,coal:280000,iron:71000,steel:41000,secs:325000,power:16800,buff:"+2.00% All Troops Attack"},
            {meat:1400000,wood:1400000,coal:280000,iron:71000,steel:41000,secs:357500,power:16800,buff:"+2.00% All Troops Attack"},
            {meat:1700000,wood:1700000,coal:340000,iron:86000,steel:49000,secs:568750,power:16800,buff:"+2.00% All Troops Attack"},
            {meat:2000000,wood:2000000,coal:400000,iron:100000,steel:58000,secs:682500,power:16800,buff:"+2.00% All Troops Attack"},
            {meat:3900000,wood:3900000,coal:790000,iron:190000,steel:110000,secs:1625000,power:29400,buff:"+3.50% All Troops Attack"},
          ]},
          { id:"regExpansion5", name:"Regimental Expansion V", levels:[
            {},{meat:1500000,wood:1500000,coal:300000,iron:77000,steel:44000,secs:400000,power:21600,buff:"+1,200 Deployment Capacity"},
            {meat:1500000,wood:1500000,coal:300000,iron:77000,steel:44000,secs:400000,power:21600,buff:"+1,200 Deployment Capacity"},
            {meat:1500000,wood:1500000,coal:300000,iron:77000,steel:44000,secs:440000,power:21600,buff:"+1,200 Deployment Capacity"},
            {meat:1500000,wood:1500000,coal:300000,iron:77000,steel:44000,secs:440000,power:21600,buff:"+1,200 Deployment Capacity"},
            {meat:2100000,wood:2100000,coal:430000,iron:100000,steel:62000,secs:840000,power:21600,buff:"+1,200 Deployment Capacity"},
            {meat:4200000,wood:4200000,coal:850000,iron:210000,steel:120000,secs:2000000,power:36000,buff:"+2,000 Deployment Capacity"},
          ]},
          { id:"reprisalTactics5", name:"Reprisal Tactics V", levels:[
            {},{meat:550000,wood:550000,coal:110000,iron:27000,steel:16000,secs:125000,power:6650,buff:"+4.75% Infantry Attack"},
            {meat:550000,wood:550000,coal:110000,iron:27000,steel:16000,secs:125000,power:6650,buff:"+4.75% Infantry Attack"},
            {meat:550000,wood:550000,coal:110000,iron:27000,steel:16000,secs:137500,power:6650,buff:"+4.75% Infantry Attack"},
            {meat:660000,wood:660000,coal:130000,iron:33000,steel:19000,secs:218750,power:6650,buff:"+4.75% Infantry Attack"},
            {meat:770000,wood:770000,coal:150000,iron:38000,steel:22000,secs:262500,power:6650,buff:"+4.75% Infantry Attack"},
            {meat:1500000,wood:1500000,coal:300000,iron:76000,steel:44000,secs:625000,power:11200,buff:"+8.00% Infantry Attack"},
          ]},
          { id:"precisionTarget5", name:"Precision Targeting V", levels:[
            {},{meat:1300000,wood:1300000,coal:260000,iron:66000,steel:38000,secs:300000,power:16625,buff:"+4.75% Marksman Attack"},
            {meat:1300000,wood:1300000,coal:260000,iron:66000,steel:38000,secs:300000,power:16625,buff:"+4.75% Marksman Attack"},
            {meat:1300000,wood:1300000,coal:260000,iron:66000,steel:38000,secs:330000,power:16625,buff:"+4.75% Marksman Attack"},
            {meat:1500000,wood:1500000,coal:310000,iron:79000,steel:46000,secs:525000,power:16625,buff:"+4.75% Marksman Attack"},
            {meat:1800000,wood:1800000,coal:370000,iron:92000,steel:53000,secs:630000,power:16625,buff:"+4.75% Marksman Attack"},
            {meat:3600000,wood:3600000,coal:730000,iron:180000,steel:100000,secs:1500000,power:28000,buff:"+8.00% Marksman Attack"},
          ]},
          { id:"skirmishing5", name:"Skirmishing V", levels:[
            {},{meat:1300000,wood:1300000,coal:260000,iron:66000,steel:38000,secs:300000,power:16625,buff:"+4.75% Lancer Attack"},
            {meat:1300000,wood:1300000,coal:260000,iron:66000,steel:38000,secs:300000,power:16625,buff:"+4.75% Lancer Attack"},
            {meat:1300000,wood:1300000,coal:260000,iron:66000,steel:38000,secs:330000,power:16625,buff:"+4.75% Lancer Attack"},
            {meat:1500000,wood:1500000,coal:310000,iron:79000,steel:46000,secs:525000,power:16625,buff:"+4.75% Lancer Attack"},
            {meat:1800000,wood:1800000,coal:370000,iron:92000,steel:53000,secs:630000,power:16625,buff:"+4.75% Lancer Attack"},
            {meat:3600000,wood:3600000,coal:730000,iron:180000,steel:100000,secs:1500000,power:28000,buff:"+8.00% Lancer Attack"},
          ]},
          { id:"defFormations5", name:"Defensive Formations V", levels:[
            {},{meat:1600000,wood:1600000,coal:330000,iron:83000,steel:48000,secs:375000,power:21375,buff:"+4.75% Infantry Defense"},
            {meat:1600000,wood:1600000,coal:330000,iron:83000,steel:48000,secs:375000,power:21375,buff:"+4.75% Infantry Defense"},
            {meat:1600000,wood:1600000,coal:330000,iron:83000,steel:48000,secs:412500,power:21375,buff:"+4.75% Infantry Defense"},
            {meat:1900000,wood:1900000,coal:390000,iron:99000,steel:57000,secs:656250,power:21375,buff:"+4.75% Infantry Defense"},
            {meat:2300000,wood:2300000,coal:460000,iron:110000,steel:67000,secs:787500,power:21375,buff:"+4.75% Infantry Defense"},
            {meat:4500000,wood:4500000,coal:910000,iron:220000,steel:130000,secs:1875000,power:36000,buff:"+8.00% Infantry Defense"},
          ]},
          { id:"picketLines5", name:"Picket Lines V", levels:[
            {},{meat:880000,wood:880000,coal:170000,iron:44000,steel:25000,secs:200000,power:11400,buff:"+4.75% Marksman Defense"},
            {meat:880000,wood:880000,coal:170000,iron:44000,steel:25000,secs:200000,power:11400,buff:"+4.75% Marksman Defense"},
            {meat:880000,wood:880000,coal:170000,iron:44000,steel:25000,secs:220000,power:11400,buff:"+4.75% Marksman Defense"},
            {meat:1000000,wood:1000000,coal:210000,iron:53000,steel:30000,secs:350000,power:11400,buff:"+4.75% Marksman Defense"},
            {meat:1200000,wood:1200000,coal:240000,iron:61000,steel:35000,secs:420000,power:11400,buff:"+4.75% Marksman Defense"},
            {meat:2400000,wood:2400000,coal:480000,iron:120000,steel:70000,secs:1000000,power:19200,buff:"+8.00% Marksman Defense"},
          ]},
          { id:"bulwark5", name:"Bulwark Formations V", levels:[
            {},{meat:880000,wood:880000,coal:170000,iron:44000,steel:25000,secs:200000,power:11400,buff:"+4.75% Lancer Defense"},
            {meat:880000,wood:880000,coal:170000,iron:44000,steel:25000,secs:200000,power:11400,buff:"+4.75% Lancer Defense"},
            {meat:880000,wood:880000,coal:170000,iron:44000,steel:25000,secs:220000,power:11400,buff:"+4.75% Lancer Defense"},
            {meat:1000000,wood:1000000,coal:210000,iron:53000,steel:30000,secs:350000,power:11400,buff:"+4.75% Lancer Defense"},
            {meat:1200000,wood:1200000,coal:240000,iron:61000,steel:35000,secs:420000,power:11400,buff:"+4.75% Lancer Defense"},
            {meat:2400000,wood:2400000,coal:480000,iron:120000,steel:70000,secs:1000000,power:19200,buff:"+8.00% Lancer Defense"},
          ]},
          { id:"specDefTraining5", name:"Special Def. Training V", levels:[
            {},{meat:1400000,wood:1400000,coal:280000,iron:71000,steel:41000,secs:325000,power:16800,buff:"+2.00% All Troops Defense"},
            {meat:1400000,wood:1400000,coal:280000,iron:71000,steel:41000,secs:325000,power:16800,buff:"+2.00% All Troops Defense"},
            {meat:1400000,wood:1400000,coal:280000,iron:71000,steel:41000,secs:357500,power:16800,buff:"+2.00% All Troops Defense"},
            {meat:1700000,wood:1700000,coal:340000,iron:86000,steel:49000,secs:568750,power:16800,buff:"+2.00% All Troops Defense"},
            {meat:2000000,wood:2000000,coal:400000,iron:100000,steel:58000,secs:682500,power:16800,buff:"+2.00% All Troops Defense"},
            {meat:3900000,wood:3900000,coal:790000,iron:190000,steel:110000,secs:1625000,power:29400,buff:"+3.50% All Troops Defense"},
          ]},
          { id:"survival5", name:"Survival Techniques V", levels:[
            {},{meat:1400000,wood:1400000,coal:280000,iron:71000,steel:41000,secs:325000,power:16800,buff:"+2.00% All Troops Health"},
            {meat:1400000,wood:1400000,coal:280000,iron:71000,steel:41000,secs:325000,power:16800,buff:"+2.00% All Troops Health"},
            {meat:1400000,wood:1400000,coal:280000,iron:71000,steel:41000,secs:357500,power:16800,buff:"+2.00% All Troops Health"},
            {meat:1700000,wood:1700000,coal:340000,iron:86000,steel:49000,secs:568750,power:16800,buff:"+2.00% All Troops Health"},
            {meat:2000000,wood:2000000,coal:400000,iron:100000,steel:58000,secs:682500,power:16800,buff:"+2.00% All Troops Health"},
            {meat:3900000,wood:3900000,coal:790000,iron:190000,steel:110000,secs:1625000,power:29400,buff:"+3.50% All Troops Health"},
          ]},
          { id:"assault5", name:"Assault Techniques V", levels:[
            {},{meat:1400000,wood:1400000,coal:280000,iron:71000,steel:41000,secs:325000,power:16800,buff:"+2.00% All Troops Lethality"},
            {meat:1400000,wood:1400000,coal:280000,iron:71000,steel:41000,secs:325000,power:16800,buff:"+2.00% All Troops Lethality"},
            {meat:1400000,wood:1400000,coal:280000,iron:71000,steel:41000,secs:357500,power:16800,buff:"+2.00% All Troops Lethality"},
            {meat:1700000,wood:1700000,coal:340000,iron:86000,steel:49000,secs:568750,power:16800,buff:"+2.00% All Troops Lethality"},
            {meat:2000000,wood:2000000,coal:400000,iron:100000,steel:58000,secs:682500,power:16800,buff:"+2.00% All Troops Lethality"},
            {meat:3900000,wood:3900000,coal:790000,iron:190000,steel:110000,secs:1625000,power:29400,buff:"+3.50% All Troops Lethality"},
          ]},
          { id:"closeCombat5", name:"Close Combat V", levels:[
            {},{meat:550000,wood:550000,coal:110000,iron:27000,steel:16000,secs:125000,power:6650,buff:"+4.75% Infantry Lethality"},
            {meat:550000,wood:550000,coal:110000,iron:27000,steel:16000,secs:125000,power:6650,buff:"+4.75% Infantry Lethality"},
            {meat:550000,wood:550000,coal:110000,iron:27000,steel:16000,secs:137500,power:6650,buff:"+4.75% Infantry Lethality"},
            {meat:660000,wood:660000,coal:130000,iron:33000,steel:19000,secs:218750,power:6650,buff:"+4.75% Infantry Lethality"},
            {meat:770000,wood:770000,coal:150000,iron:38000,steel:22000,secs:262500,power:6650,buff:"+4.75% Infantry Lethality"},
            {meat:1500000,wood:1500000,coal:300000,iron:76000,steel:44000,secs:625000,power:11200,buff:"+8.00% Infantry Lethality"},
          ]},
          { id:"targetSniping5", name:"Targeted Sniping V", levels:[
            {},{meat:1300000,wood:1300000,coal:260000,iron:66000,steel:38000,secs:300000,power:16625,buff:"+4.75% Marksman Lethality"},
            {meat:1300000,wood:1300000,coal:260000,iron:66000,steel:38000,secs:300000,power:16625,buff:"+4.75% Marksman Lethality"},
            {meat:1300000,wood:1300000,coal:260000,iron:66000,steel:38000,secs:330000,power:16625,buff:"+4.75% Marksman Lethality"},
            {meat:1500000,wood:1500000,coal:310000,iron:79000,steel:46000,secs:525000,power:16625,buff:"+4.75% Marksman Lethality"},
            {meat:1800000,wood:1800000,coal:370000,iron:92000,steel:53000,secs:630000,power:16625,buff:"+4.75% Marksman Lethality"},
            {meat:3600000,wood:3600000,coal:730000,iron:180000,steel:100000,secs:1500000,power:28000,buff:"+8.00% Marksman Lethality"},
          ]},
          { id:"lanceUpgrade5", name:"Lance Upgrade V", levels:[
            {},{meat:1300000,wood:1300000,coal:260000,iron:66000,steel:38000,secs:300000,power:16625,buff:"+4.75% Lancer Lethality"},
            {meat:1300000,wood:1300000,coal:260000,iron:66000,steel:38000,secs:300000,power:16625,buff:"+4.75% Lancer Lethality"},
            {meat:1300000,wood:1300000,coal:260000,iron:66000,steel:38000,secs:330000,power:16625,buff:"+4.75% Lancer Lethality"},
            {meat:1500000,wood:1500000,coal:310000,iron:79000,steel:46000,secs:525000,power:16625,buff:"+4.75% Lancer Lethality"},
            {meat:1800000,wood:1800000,coal:370000,iron:92000,steel:53000,secs:630000,power:16625,buff:"+4.75% Lancer Lethality"},
            {meat:3600000,wood:3600000,coal:730000,iron:180000,steel:100000,secs:1500000,power:28000,buff:"+8.00% Lancer Lethality"},
          ]},
          { id:"shieldUpgrade5", name:"Shield Upgrade V", levels:[
            {},{meat:1600000,wood:1600000,coal:330000,iron:83000,steel:48000,secs:375000,power:21375,buff:"+4.75% Infantry Health"},
            {meat:1600000,wood:1600000,coal:330000,iron:83000,steel:48000,secs:375000,power:21375,buff:"+4.75% Infantry Health"},
            {meat:1600000,wood:1600000,coal:330000,iron:83000,steel:48000,secs:412500,power:21375,buff:"+4.75% Infantry Health"},
            {meat:1900000,wood:1900000,coal:390000,iron:99000,steel:57000,secs:656250,power:21375,buff:"+4.75% Infantry Health"},
            {meat:2300000,wood:2300000,coal:460000,iron:110000,steel:67000,secs:787500,power:21375,buff:"+4.75% Infantry Health"},
            {meat:4500000,wood:4500000,coal:910000,iron:220000,steel:130000,secs:1875000,power:36000,buff:"+8.00% Infantry Health"},
          ]},
          { id:"marksmanArmor5", name:"Marksman Armor V", levels:[
            {},{meat:880000,wood:880000,coal:170000,iron:44000,steel:25000,secs:200000,power:11400,buff:"+4.75% Marksman Health"},
            {meat:880000,wood:880000,coal:170000,iron:44000,steel:25000,secs:200000,power:11400,buff:"+4.75% Marksman Health"},
            {meat:880000,wood:880000,coal:170000,iron:44000,steel:25000,secs:220000,power:11400,buff:"+4.75% Marksman Health"},
            {meat:1000000,wood:1000000,coal:210000,iron:53000,steel:30000,secs:350000,power:11400,buff:"+4.75% Marksman Health"},
            {meat:1200000,wood:1200000,coal:240000,iron:61000,steel:35000,secs:420000,power:11400,buff:"+4.75% Marksman Health"},
            {meat:2400000,wood:2400000,coal:480000,iron:120000,steel:70000,secs:1000000,power:19200,buff:"+8.00% Marksman Health"},
          ]},
          { id:"lancerArmor5", name:"Lancer Armor V", levels:[
            {},{meat:880000,wood:880000,coal:170000,iron:44000,steel:25000,secs:200000,power:11400,buff:"+4.75% Lancer Health"},
            {meat:880000,wood:880000,coal:170000,iron:44000,steel:25000,secs:200000,power:11400,buff:"+4.75% Lancer Health"},
            {meat:880000,wood:880000,coal:170000,iron:44000,steel:25000,secs:220000,power:11400,buff:"+4.75% Lancer Health"},
            {meat:1000000,wood:1000000,coal:210000,iron:53000,steel:30000,secs:350000,power:11400,buff:"+4.75% Lancer Health"},
            {meat:1200000,wood:1200000,coal:240000,iron:61000,steel:35000,secs:420000,power:11400,buff:"+4.75% Lancer Health"},
            {meat:2400000,wood:2400000,coal:480000,iron:120000,steel:70000,secs:1000000,power:19200,buff:"+8.00% Lancer Health"},
          ]},
        ]
      },
      {
        tier: "VI", minRCLevel: 30,
        researches: [
          { id:"weaponsPrep6", name:"Weapons Prep VI", levels:[
            {},{meat:5000000,wood:5000000,coal:1000000,iron:250000,steel:83000,secs:1560000,power:18900,buff:"+2.25% All Troops Attack"},
            {meat:5000000,wood:5000000,coal:1000000,iron:250000,steel:83000,secs:1560000,power:18900,buff:"+2.25% All Troops Attack"},
            {meat:5000000,wood:5000000,coal:1000000,iron:250000,steel:83000,secs:1716000,power:18900,buff:"+2.25% All Troops Attack"},
            {meat:6000000,wood:6000000,coal:1200000,iron:300000,steel:99000,secs:2730000,power:18900,buff:"+2.25% All Troops Attack"},
            {meat:7000000,wood:7000000,coal:1400000,iron:350000,steel:110000,secs:3276000,power:18900,buff:"+2.25% All Troops Attack"},
            {meat:13000000,wood:13000000,coal:2700000,iron:690000,steel:220000,secs:7800000,power:33600,buff:"+4.00% All Troops Attack"},
          ]},
          { id:"regExpansion6", name:"Regimental Expansion VI", levels:[
            {},{meat:5400000,wood:5400000,coal:1000000,iron:270000,steel:89000,secs:1920000,power:36000,buff:"+2,000 Deployment Capacity"},
            {meat:5400000,wood:5400000,coal:1000000,iron:270000,steel:89000,secs:1920000,power:36000,buff:"+2,000 Deployment Capacity"},
            {meat:5400000,wood:5400000,coal:1000000,iron:270000,steel:89000,secs:2112000,power:36000,buff:"+2,000 Deployment Capacity"},
            {meat:6500000,wood:6500000,coal:1300000,iron:320000,steel:100000,secs:3360000,power:36000,buff:"+2,000 Deployment Capacity"},
            {meat:7600000,wood:7600000,coal:1500000,iron:380000,steel:120000,secs:4032000,power:36000,buff:"+2,000 Deployment Capacity"},
            {meat:14000000,wood:14000000,coal:2900000,iron:740000,steel:240000,secs:9600000,power:61200,buff:"+3,400 Deployment Capacity"},
          ]},
          { id:"reprisalTactics6", name:"Reprisal Tactics VI", levels:[
            {},{meat:1900000,wood:1900000,coal:380000,iron:97000,steel:32000,secs:600000,power:7700,buff:"+5.50% Infantry Attack"},
            {meat:1900000,wood:1900000,coal:380000,iron:97000,steel:32000,secs:600000,power:7700,buff:"+5.50% Infantry Attack"},
            {meat:1900000,wood:1900000,coal:380000,iron:97000,steel:32000,secs:660000,power:7700,buff:"+5.50% Infantry Attack"},
            {meat:2300000,wood:2300000,coal:460000,iron:110000,steel:38000,secs:1050000,power:7700,buff:"+5.50% Infantry Attack"},
            {meat:2700000,wood:2700000,coal:540000,iron:130000,steel:44000,secs:1260000,power:7700,buff:"+5.50% Infantry Attack"},
            {meat:5300000,wood:5300000,coal:1000000,iron:260000,steel:88000,secs:3000000,power:12600,buff:"+9.00% Infantry Attack"},
          ]},
          { id:"precisionTarget6", name:"Precision Targeting VI", levels:[
            {},{meat:4600000,wood:4600000,coal:930000,iron:230000,steel:76000,secs:1440000,power:19250,buff:"+5.50% Marksman Attack"},
            {meat:4600000,wood:4600000,coal:930000,iron:230000,steel:76000,secs:1440000,power:19250,buff:"+5.50% Marksman Attack"},
            {meat:4600000,wood:4600000,coal:930000,iron:230000,steel:76000,secs:1584000,power:19250,buff:"+5.50% Marksman Attack"},
            {meat:5500000,wood:5500000,coal:1100000,iron:270000,steel:92000,secs:2520000,power:19250,buff:"+5.50% Marksman Attack"},
            {meat:6500000,wood:6500000,coal:1300000,iron:320000,steel:100000,secs:3024000,power:19250,buff:"+5.50% Marksman Attack"},
            {meat:12000000,wood:12000000,coal:2500000,iron:640000,steel:210000,secs:7200000,power:31500,buff:"+9.00% Marksman Attack"},
          ]},
          { id:"skirmishing6", name:"Skirmishing VI", levels:[
            {},{meat:4600000,wood:4600000,coal:930000,iron:230000,steel:76000,secs:1440000,power:19250,buff:"+5.50% Lancer Attack"},
            {meat:4600000,wood:4600000,coal:930000,iron:230000,steel:76000,secs:1440000,power:19250,buff:"+5.50% Lancer Attack"},
            {meat:4600000,wood:4600000,coal:930000,iron:230000,steel:76000,secs:1584000,power:19250,buff:"+5.50% Lancer Attack"},
            {meat:5500000,wood:5500000,coal:1100000,iron:270000,steel:92000,secs:2520000,power:19250,buff:"+5.50% Lancer Attack"},
            {meat:6500000,wood:6500000,coal:1300000,iron:320000,steel:100000,secs:3024000,power:19250,buff:"+5.50% Lancer Attack"},
            {meat:12000000,wood:12000000,coal:2500000,iron:640000,steel:210000,secs:7200000,power:31500,buff:"+9.00% Lancer Attack"},
          ]},
          { id:"defFormations6", name:"Defensive Formations VI", levels:[
            {},{meat:5800000,wood:5800000,coal:1100000,iron:290000,steel:96000,secs:1800000,power:24750,buff:"+5.50% Infantry Defense"},
            {meat:5800000,wood:5800000,coal:1100000,iron:290000,steel:96000,secs:1800000,power:24750,buff:"+5.50% Infantry Defense"},
            {meat:5800000,wood:5800000,coal:1100000,iron:290000,steel:96000,secs:1980000,power:24750,buff:"+5.50% Infantry Defense"},
            {meat:6900000,wood:6900000,coal:1300000,iron:340000,steel:110000,secs:3150000,power:24750,buff:"+5.50% Infantry Defense"},
            {meat:8100000,wood:8100000,coal:1600000,iron:400000,steel:130000,secs:3780000,power:24750,buff:"+5.50% Infantry Defense"},
            {meat:16000000,wood:16000000,coal:3200000,iron:800000,steel:260000,secs:9000000,power:40500,buff:"+9.00% Infantry Defense"},
          ]},
          { id:"picketLines6", name:"Picket Lines VI", levels:[
            {},{meat:3100000,wood:3100000,coal:620000,iron:150000,steel:51000,secs:960000,power:13200,buff:"+5.50% Marksman Defense"},
            {meat:3100000,wood:3100000,coal:620000,iron:150000,steel:51000,secs:960000,power:13200,buff:"+5.50% Marksman Defense"},
            {meat:3100000,wood:3100000,coal:620000,iron:150000,steel:51000,secs:1056000,power:13200,buff:"+5.50% Marksman Defense"},
            {meat:3700000,wood:3700000,coal:740000,iron:180000,steel:61000,secs:1680000,power:13200,buff:"+5.50% Marksman Defense"},
            {meat:4300000,wood:4300000,coal:870000,iron:210000,steel:71000,secs:2016000,power:13200,buff:"+5.50% Marksman Defense"},
            {meat:8500000,wood:8500000,coal:1700000,iron:420000,steel:140000,secs:4800000,power:21600,buff:"+9.00% Marksman Defense"},
          ]},
          { id:"bulwark6", name:"Bulwark Formations VI", levels:[
            {},{meat:3100000,wood:3100000,coal:620000,iron:150000,steel:51000,secs:960000,power:13200,buff:"+5.50% Lancer Defense"},
            {meat:3100000,wood:3100000,coal:620000,iron:150000,steel:51000,secs:960000,power:13200,buff:"+5.50% Lancer Defense"},
            {meat:3100000,wood:3100000,coal:620000,iron:150000,steel:51000,secs:1056000,power:13200,buff:"+5.50% Lancer Defense"},
            {meat:3700000,wood:3700000,coal:740000,iron:180000,steel:61000,secs:1680000,power:13200,buff:"+5.50% Lancer Defense"},
            {meat:4300000,wood:4300000,coal:870000,iron:210000,steel:71000,secs:2016000,power:13200,buff:"+5.50% Lancer Defense"},
            {meat:8500000,wood:8500000,coal:1700000,iron:420000,steel:140000,secs:4800000,power:21600,buff:"+9.00% Lancer Defense"},
          ]},
          { id:"specDefTraining6", name:"Special Def. Training VI", levels:[
            {},{meat:5000000,wood:5000000,coal:1000000,iron:250000,steel:83000,secs:1560000,power:18900,buff:"+2.25% All Troops Defense"},
            {meat:5000000,wood:5000000,coal:1000000,iron:250000,steel:83000,secs:1560000,power:18900,buff:"+2.25% All Troops Defense"},
            {meat:5000000,wood:5000000,coal:1000000,iron:250000,steel:83000,secs:1716000,power:18900,buff:"+2.25% All Troops Defense"},
            {meat:6000000,wood:6000000,coal:1200000,iron:300000,steel:99000,secs:2730000,power:18900,buff:"+2.25% All Troops Defense"},
            {meat:7000000,wood:7000000,coal:1400000,iron:350000,steel:110000,secs:3276000,power:18900,buff:"+2.25% All Troops Defense"},
            {meat:13000000,wood:13000000,coal:2700000,iron:690000,steel:220000,secs:7800000,power:33600,buff:"+4.00% All Troops Defense"},
          ]},
          { id:"survival6", name:"Survival Techniques VI", levels:[
            {},{meat:5000000,wood:5000000,coal:1000000,iron:250000,steel:83000,secs:1560000,power:18900,buff:"+2.25% All Troops Health"},
            {meat:5000000,wood:5000000,coal:1000000,iron:250000,steel:83000,secs:1560000,power:18900,buff:"+2.25% All Troops Health"},
            {meat:5000000,wood:5000000,coal:1000000,iron:250000,steel:83000,secs:1716000,power:18900,buff:"+2.25% All Troops Health"},
            {meat:6000000,wood:6000000,coal:1200000,iron:300000,steel:99000,secs:2730000,power:18900,buff:"+2.25% All Troops Health"},
            {meat:7000000,wood:7000000,coal:1400000,iron:350000,steel:110000,secs:3276000,power:18900,buff:"+2.25% All Troops Health"},
            {meat:13000000,wood:13000000,coal:2700000,iron:690000,steel:220000,secs:7800000,power:33600,buff:"+4.00% All Troops Health"},
          ]},
          { id:"assault6", name:"Assault Techniques VI", levels:[
            {},{meat:5000000,wood:5000000,coal:1000000,iron:250000,steel:83000,secs:1560000,power:18900,buff:"+2.25% All Troops Lethality"},
            {meat:5000000,wood:5000000,coal:1000000,iron:250000,steel:83000,secs:1560000,power:18900,buff:"+2.25% All Troops Lethality"},
            {meat:5000000,wood:5000000,coal:1000000,iron:250000,steel:83000,secs:1716000,power:18900,buff:"+2.25% All Troops Lethality"},
            {meat:6000000,wood:6000000,coal:1200000,iron:300000,steel:99000,secs:2730000,power:18900,buff:"+2.25% All Troops Lethality"},
            {meat:7000000,wood:7000000,coal:1400000,iron:350000,steel:110000,secs:3276000,power:18900,buff:"+2.25% All Troops Lethality"},
            {meat:13000000,wood:13000000,coal:2700000,iron:690000,steel:220000,secs:7800000,power:33600,buff:"+4.00% All Troops Lethality"},
          ]},
          { id:"closeCombat6", name:"Close Combat VI", levels:[
            {},{meat:1900000,wood:1900000,coal:380000,iron:97000,steel:32000,secs:600000,power:7700,buff:"+5.50% Infantry Lethality"},
            {meat:1900000,wood:1900000,coal:380000,iron:97000,steel:32000,secs:600000,power:7700,buff:"+5.50% Infantry Lethality"},
            {meat:1900000,wood:1900000,coal:380000,iron:97000,steel:32000,secs:660000,power:7700,buff:"+5.50% Infantry Lethality"},
            {meat:2300000,wood:2300000,coal:460000,iron:110000,steel:38000,secs:1050000,power:7700,buff:"+5.50% Infantry Lethality"},
            {meat:2700000,wood:2700000,coal:540000,iron:130000,steel:44000,secs:1260000,power:7700,buff:"+5.50% Infantry Lethality"},
            {meat:5300000,wood:5300000,coal:1000000,iron:260000,steel:88000,secs:3000000,power:12600,buff:"+9.00% Infantry Lethality"},
          ]},
          { id:"targetSniping6", name:"Targeted Sniping VI", levels:[
            {},{meat:4600000,wood:4600000,coal:930000,iron:230000,steel:76000,secs:1440000,power:19250,buff:"+5.50% Marksman Lethality"},
            {meat:4600000,wood:4600000,coal:930000,iron:230000,steel:76000,secs:1440000,power:19250,buff:"+5.50% Marksman Lethality"},
            {meat:4600000,wood:4600000,coal:930000,iron:230000,steel:76000,secs:1584000,power:19250,buff:"+5.50% Marksman Lethality"},
            {meat:5500000,wood:5500000,coal:1100000,iron:270000,steel:92000,secs:2520000,power:19250,buff:"+5.50% Marksman Lethality"},
            {meat:6500000,wood:6500000,coal:1300000,iron:320000,steel:100000,secs:3024000,power:19250,buff:"+5.50% Marksman Lethality"},
            {meat:12000000,wood:12000000,coal:2500000,iron:640000,steel:210000,secs:7200000,power:31500,buff:"+9.00% Marksman Lethality"},
          ]},
          { id:"lanceUpgrade6", name:"Lance Upgrade VI", levels:[
            {},{meat:4600000,wood:4600000,coal:930000,iron:230000,steel:76000,secs:1440000,power:19250,buff:"+5.50% Lancer Lethality"},
            {meat:4600000,wood:4600000,coal:930000,iron:230000,steel:76000,secs:1440000,power:19250,buff:"+5.50% Lancer Lethality"},
            {meat:4600000,wood:4600000,coal:930000,iron:230000,steel:76000,secs:1584000,power:19250,buff:"+5.50% Lancer Lethality"},
            {meat:5500000,wood:5500000,coal:1100000,iron:270000,steel:92000,secs:2520000,power:19250,buff:"+5.50% Lancer Lethality"},
            {meat:6500000,wood:6500000,coal:1300000,iron:320000,steel:100000,secs:3024000,power:19250,buff:"+5.50% Lancer Lethality"},
            {meat:12000000,wood:12000000,coal:2500000,iron:640000,steel:210000,secs:7200000,power:31500,buff:"+9.00% Lancer Lethality"},
          ]},
          { id:"shieldUpgrade6", name:"Shield Upgrade VI", levels:[
            {},{meat:5800000,wood:5800000,coal:1100000,iron:290000,steel:96000,secs:1800000,power:24750,buff:"+5.50% Infantry Health"},
            {meat:5800000,wood:5800000,coal:1100000,iron:290000,steel:96000,secs:1800000,power:24750,buff:"+5.50% Infantry Health"},
            {meat:5800000,wood:5800000,coal:1100000,iron:290000,steel:96000,secs:1980000,power:24750,buff:"+5.50% Infantry Health"},
            {meat:6900000,wood:6900000,coal:1300000,iron:340000,steel:110000,secs:3150000,power:24750,buff:"+5.50% Infantry Health"},
            {meat:8100000,wood:8100000,coal:1600000,iron:400000,steel:130000,secs:3780000,power:24750,buff:"+5.50% Infantry Health"},
            {meat:16000000,wood:16000000,coal:3200000,iron:800000,steel:260000,secs:9000000,power:40500,buff:"+9.00% Infantry Health"},
          ]},
          { id:"marksmanArmor6", name:"Marksman Armor VI", levels:[
            {},{meat:3100000,wood:3100000,coal:620000,iron:150000,steel:51000,secs:960000,power:13200,buff:"+5.50% Marksman Health"},
            {meat:3100000,wood:3100000,coal:620000,iron:150000,steel:51000,secs:960000,power:13200,buff:"+5.50% Marksman Health"},
            {meat:3100000,wood:3100000,coal:620000,iron:150000,steel:51000,secs:1056000,power:13200,buff:"+5.50% Marksman Health"},
            {meat:3700000,wood:3700000,coal:740000,iron:180000,steel:61000,secs:1680000,power:13200,buff:"+5.50% Marksman Health"},
            {meat:4300000,wood:4300000,coal:870000,iron:210000,steel:71000,secs:2016000,power:13200,buff:"+5.50% Marksman Health"},
            {meat:8500000,wood:8500000,coal:1700000,iron:420000,steel:140000,secs:4800000,power:21600,buff:"+9.00% Marksman Health"},
          ]},
          { id:"lancerArmor6", name:"Lancer Armor VI", levels:[
            {},{meat:3100000,wood:3100000,coal:620000,iron:150000,steel:51000,secs:960000,power:13200,buff:"+5.50% Lancer Health"},
            {meat:3100000,wood:3100000,coal:620000,iron:150000,steel:51000,secs:960000,power:13200,buff:"+5.50% Lancer Health"},
            {meat:3100000,wood:3100000,coal:620000,iron:150000,steel:51000,secs:1056000,power:13200,buff:"+5.50% Lancer Health"},
            {meat:3700000,wood:3700000,coal:740000,iron:180000,steel:61000,secs:1680000,power:13200,buff:"+5.50% Lancer Health"},
            {meat:4300000,wood:4300000,coal:870000,iron:210000,steel:71000,secs:2016000,power:13200,buff:"+5.50% Lancer Health"},
            {meat:8500000,wood:8500000,coal:1700000,iron:420000,steel:140000,secs:4800000,power:21600,buff:"+9.00% Lancer Health"},
          ]},
        ]
      },
    ]
  }
};

// ─── Cost calculator ──────────────────────────────────────────────────────────

function calcResearchCost(res, curLv, goalLv) {
  let meat=0,wood=0,coal=0,iron=0,steel=0,secs=0,power=0;
  const maxLv = res.levels.length - 1;
  const from = Math.min(curLv, maxLv);
  const to   = Math.min(goalLv, maxLv);
  for (let i = from + 1; i <= to; i++) {
    const row = res.levels[i];
    if (!row || !row.secs) continue;
    meat  += row.meat  || 0;
    wood  += row.wood  || 0;
    coal  += row.coal  || 0;
    iron  += row.iron  || 0;
    steel += row.steel || 0;
    secs  += row.secs  || 0;
    power += row.power || 0;
  }
  return { meat, wood, coal, iron, steel, secs, power };
}

function getBuff(res, lv) {
  const maxLv = res.levels.length - 1;
  const row = res.levels[Math.min(lv, maxLv)];
  return row?.buff || "—";
}

// Sum power from levels 1→lv (each level row stores incremental power gained)
function getRCPower(res, lv) {
  if (!lv || lv <= 0) return 0;
  const maxLv = res.levels.length - 1;
  let total = 0;
  for (let i = 1; i <= Math.min(lv, maxLv); i++) {
    total += res.levels[i]?.power || 0;
  }
  return total;
}

// Exported — called by CharacterProfilePage to add RC power into techPower
// Accepts optional rcLevels prop so it can use reactive state instead of localStorage
// Parse a buff string like "+320 Deployment Capacity" → { deploy: 320, rally: 0 }
function parseDeployRallyBuff(buff) {
  if (!buff) return { deploy: 0, rally: 0 };
  const deployMatch = buff.match(/\+?([\d,]+)\s*Deployment Capacity/i);
  const rallyMatch  = buff.match(/\+?([\d,]+)\s*Rally Capacity/i);
  return {
    deploy: deployMatch ? parseInt(deployMatch[1].replace(/,/g,"")) : 0,
    rally:  rallyMatch  ? parseInt(rallyMatch[1].replace(/,/g,""))  : 0,
  };
}

// Exported — sums Deployment and Rally Capacity from all RC researches at current levels
export function getRCDeployRally(rcLevelsProp) {
  try {
    const saved = rcLevelsProp ?? (() => {
      const raw = localStorage.getItem("rc-levels");
      return raw ? JSON.parse(raw) : {};
    })();
    let deploy = 0, rally = 0;
    ["Growth","Economy","Battle"].forEach(treeName => {
      RC[treeName].tiers.forEach(tier => {
        tier.researches.forEach(res => {
          const cur = saved[res.id]?.cur ?? 0;
          if (cur <= 0) return;
          // Sum incremental buffs from level 1 up to cur
          for (let i = 1; i <= cur; i++) {
            const lv = res.levels[i];
            if (!lv) continue;
            const parsed = parseDeployRallyBuff(lv.buff);
            deploy += parsed.deploy;
            rally  += parsed.rally;
          }
        });
      });
    });
    return { deploy, rally };
  } catch { return { deploy: 0, rally: 0 }; }
}

// Exported — counts +1 March Queue buffs from RC research at current levels
// cmdTactics I/II/III each give +1 when researched (max +3 from RC)
export function getRCMarchQueue(rcLevelsProp) {
  try {
    const saved = rcLevelsProp ?? (() => {
      const raw = localStorage.getItem("rc-levels");
      return raw ? JSON.parse(raw) : {};
    })();
    let count = 0;
    ["Growth","Economy","Battle"].forEach(treeName => {
      RC[treeName].tiers.forEach(tier => {
        tier.researches.forEach(res => {
          const cur = saved[res.id]?.cur ?? 0;
          if (cur <= 0) return;
          for (let i = 1; i <= cur; i++) {
            const lv = res.levels[i];
            if (lv?.buff?.includes("+1 March Queue")) count++;
          }
        });
      });
    });
    return count;
  } catch { return 0; }
}

export function getRCTechPower(rcLevelsProp) {
  try {
    const saved = rcLevelsProp ?? (() => {
      const raw = localStorage.getItem("rc-levels");
      return raw ? JSON.parse(raw) : {};
    })();
    let total = 0;
    ["Growth","Economy","Battle"].forEach(treeName => {
      RC[treeName].tiers.forEach(tier => {
        tier.researches.forEach(res => {
          const cur = saved[res.id]?.cur ?? 0;
          total += getRCPower(res, cur);
        });
      });
    });
    return Math.round(total);
  } catch { return 0; }
}

// ─── COLORS helper ────────────────────────────────────────────────────────────
const COLORS = {
  bg:"var(--c-bg)",surface:"var(--c-surface)",card:"var(--c-card)",
  border:"var(--c-border)",borderHi:"var(--c-borderHi)",
  textPri:"var(--c-textPri)",textSec:"var(--c-textSec)",textDim:"var(--c-textDim)",
  accent:"var(--c-accent)",accentBg:"var(--c-accentBg)",accentDim:"var(--c-accentDim)",
  green:"var(--c-green)",greenBg:"var(--c-greenBg)",greenDim:"var(--c-greenDim)",
  blue:"var(--c-blue)",blueBg:"var(--c-blueBg)",blueDim:"var(--c-blueDim)",
  amber:"var(--c-amber)",amberBg:"var(--c-amberBg)",
  red:"var(--c-red)",redBg:"var(--c-redBg)",redDim:"var(--c-redDim)",
};

// ─── RC localStorage hook ────────────────────────────────────────────────────

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResearchCenterPage({ inv, rcLevels, setRcLevels, rcCollapse, setRcCollapse, onCompleteSvs }) {
  const C = COLORS;
  const [tree, setTree] = useState("Growth");

  // Use props (cloud-synced from App.jsx) — fall back to empty obj if not yet loaded
  const levels    = rcLevels   ?? {};
  const setLevels = setRcLevels ?? (() => {});
  const collapseAllMaxed    = rcCollapse   ?? {};
  const setCollapseAllMaxed = setRcCollapse ?? (() => {});
  const [speedBuff, setSpeedBuffState] = useState(() => {
    try { return Number(localStorage.getItem("wa-speedbuff") || 0); } catch { return 0; }
  });
  const [buffs, setBuffsState] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wa-buffs") || "{}"); } catch { return {}; }
  });

  // Listen for wa-speedbuff/wa-buffs changes from War Academy tab (cross-tab)
  // and re-read on character switch
  React.useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "wa-speedbuff") setSpeedBuffState(Number(e.newValue || 0));
      if (e.key === "wa-buffs") { try { setBuffsState(JSON.parse(e.newValue || "{}")); } catch {} }
    };
    const onCharReady = () => {
      try { setSpeedBuffState(Number(localStorage.getItem("wa-speedbuff") || 0)); } catch {}
      try { setBuffsState(JSON.parse(localStorage.getItem("wa-buffs") || "{}")); } catch {}
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("wos-char-ready", onCharReady);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("wos-char-ready", onCharReady);
    };
  }, []);

  const setSpeedBuff = (v) => {
    setSpeedBuffState(v);
    try { localStorage.setItem("wa-speedbuff", v); } catch {}
  };
  const toggleBuff = (k) => {
    const next = { ...buffs, [k]: !buffs[k] };
    setBuffsState(next);
    try { localStorage.setItem("wa-buffs", JSON.stringify(next)); } catch {}
  };

  const buffTotal = useMemo(() => {
    let t = speedBuff / 100;
    if (buffs.presSkill) t += 0.10;
    if (buffs.presPos)   t += 0.10;
    return t;
  }, [speedBuff, buffs]);

  // ── Toggle collapse — writes to cloud-synced rcCollapse prop ──────────────
  const toggleCollapseAllMaxed = (treeKey, tierKey) => {
    setCollapseAllMaxed(p => ({ ...p, [`${treeKey}-${tierKey}`]: !p[`${treeKey}-${tierKey}`] }));
  };

  const getLv = (id) => levels[id] || { cur: 0, goal: 0 };
  const setLv = (id, field, val) => {
    setLevels(prev => {
      const cur  = prev[id]?.cur  ?? 0;
      const goal = prev[id]?.goal ?? 0;
      let next = { cur, goal, [field]: val };
      if (field === "cur" && val > next.goal) next.goal = val;
      if (field === "goal" && val < next.cur) next.goal = next.cur;
      return { ...prev, [id]: next };
    });
  };

  // ── Summary across ALL trees ──────────────────────────────────────────────
  const globalSummary = useMemo(() => {
    let meat=0,wood=0,coal=0,iron=0,steel=0,secs=0;
    ["Growth","Economy","Battle"].forEach(tr => {
      RC[tr].tiers.forEach(tier => {
        tier.researches.forEach(res => {
          const { cur, goal } = getLv(res.id);
          const cost = calcResearchCost(res, cur, goal);
          meat  += cost.meat;
          wood  += cost.wood;
          coal  += cost.coal;
          iron  += cost.iron;
          steel += cost.steel;
          secs  += cost.secs;
        });
      });
    });
    const actual = secs > 0 ? Math.round(secs / (1 + buffTotal)) : 0;
    return { meat, wood, coal, iron, steel, secs, actual };
  }, [levels, buffTotal]);

  // ── Inv resource values (respect unit multipliers) ────────────────────────
  const invMeat  = inv ? (inv.meat  ?? 0) * (inv.meatUnit  === "B" ? 1e9 : 1e6) : 0;
  const invWood  = inv ? (inv.wood  ?? 0) * (inv.woodUnit  === "B" ? 1e9 : 1e6) : 0;
  const invCoal  = inv ? (inv.coal  ?? 0) * (inv.coalUnit  === "B" ? 1e9 : 1e6) : 0;
  const invIron  = inv ? (inv.iron  ?? 0) * (inv.ironUnit  === "B" ? 1e9 : 1e6) : 0;
  const invSteel = inv ? (inv.steel ?? 0) * (inv.steelUnit === "B" ? 1000 : 1) * 1e6 : 0;

  // ── Styles ────────────────────────────────────────────────────────────────
  const thS = {
    padding:"8px 10px", fontSize:10, fontWeight:700, letterSpacing:"1px",
    textTransform:"uppercase", color:C.textDim,
    borderBottom:`1px solid ${C.border}`, background:C.surface, whiteSpace:"nowrap",
  };
  const tdS = {
    padding:"7px 10px", borderBottom:`1px solid ${C.border}`,
    fontSize:12, color:C.textSec, verticalAlign:"middle",
  };
  const sel = {
    background:C.card, border:`1px solid ${C.border}`, borderRadius:5,
    color:C.textPri, fontSize:11, padding:"3px 5px", fontFamily:"'Space Mono',monospace",
    outline:"none", cursor:"pointer",
  };

  const treeColor = { Growth:C.green, Economy:C.amber, Battle:C.red };
  const treeData = RC[tree];

  return (
    <div className="fade-in">
      {/* Complete Upgrades button */}
      {onCompleteSvs && (
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={onCompleteSvs} style={{
              padding:"8px 16px", borderRadius:7, cursor:"pointer",
              border:"1px solid var(--c-accentDim)",
              background:"rgba(227,107,26,0.12)",
              color:"var(--c-accent)", fontSize:12, fontWeight:700,
              fontFamily:"Syne,sans-serif", display:"flex", alignItems:"center", gap:6,
            }}>⚔️ Complete Upgrades</button>
            <span title="Reviews all fields where Goal ≠ Current for this tab. Lets you adjust what you actually achieved, then pushes those values to Current and deducts materials from inventory."
              style={{fontSize:14,color:"var(--c-textDim)",cursor:"default",userSelect:"none",lineHeight:1}}>ⓘ</span>
          </div>
        </div>
      )}

      {/* ── Research Speed Buffs — matches War Academy exactly ───────────── */}
      <div style={{ marginBottom:24, padding:"16px", background:C.surface,
        borderRadius:8, border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase",
          color:C.textDim, fontFamily:"'Space Mono',monospace", marginBottom:10,
          paddingBottom:5, borderBottom:`1px solid ${C.border}` }}>
          Research Buffs (Time Reduction)
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:16, alignItems:"flex-start" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:5, minWidth:260 }}>
            <label style={{ fontSize:11, color:C.textSec }}>
              Bonus Overview Total — Research Speed (%)
            </label>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <input type="number" min={0} max={500} step={0.5}
                value={speedBuff}
                onChange={e => setSpeedBuff(Number(e.target.value))}
                style={{ width:100, textAlign:"right", background:C.card,
                  border:`1px solid ${C.border}`, borderRadius:6,
                  color:C.textPri, padding:"5px 8px", fontSize:12, outline:"none" }} />
              <span style={{ fontSize:12, color:C.textSec, fontFamily:"Space Mono,monospace" }}>%</span>
            </div>
            <div style={{ fontSize:11, color:C.textSec, marginTop:2, lineHeight:1.5 }}>
              Non-buffed Research speed — located in{" "}
              <span style={{ color:C.accent, fontFamily:"Space Mono,monospace" }}>
                Bonus Overview &gt; Growth
              </span>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, alignSelf:"flex-end" }}>
            {[
              { k:"presSkill", label:"President Skill — Research Advancement", val:"10%" },
              { k:"presPos",   label:"Vice President",                          val:"10%" },
            ].map(b => (
              <button key={b.k} type="button" onClick={() => toggleBuff(b.k)}
                style={{ padding:"7px 13px", borderRadius:7, fontSize:11, fontWeight:700,
                  cursor:"pointer", fontFamily:"Syne,sans-serif", transition:"all 0.15s",
                  textAlign:"left",
                  background: buffs[b.k] ? C.greenBg  : C.surface,
                  color:      buffs[b.k] ? C.green    : C.textDim,
                  border:     `1px solid ${buffs[b.k] ? C.greenDim : C.border}` }}>
                {b.label} <span style={{ opacity:0.7 }}>+{b.val}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop:10, fontSize:12, color:C.textSec }}>
          Total research speed bonus:{" "}
          <span style={{ color:C.green, fontFamily:"Space Mono,monospace", fontWeight:700 }}>
            {(buffTotal*100).toFixed(1)}%
          </span>
          {" · "}Actual time = base time ÷ (1 + {(buffTotal*100).toFixed(1)}%)
        </div>
      </div>

      {/* ── Global Summary ──────────────────────────────────────────────── */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-header">
          <div className="card-title">Summary — All Trees Combined</div>
          <span style={{fontSize:11,color:C.textDim,fontFamily:"'Space Mono',monospace"}}>
            Net cost from current → goal across Growth + Economy + Battle
          </span>
        </div>
        <div className="card-body">
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
            {[
              {label:"Meat",        needed:globalSummary.meat,  have:invMeat,  color:C.green},
              {label:"Wood",        needed:globalSummary.wood,  have:invWood,  color:C.green},
              {label:"Coal",        needed:globalSummary.coal,  have:invCoal,  color:C.textSec},
              {label:"Iron",        needed:globalSummary.iron,  have:invIron,  color:C.textSec},
              {label:"Steel (M)",   needed:globalSummary.steel/1e6, have:invSteel/1e6, color:C.blue},
              {label:"Orig. Time",  needed:null, display:fmtSecs(globalSummary.secs),  color:C.textSec},
              {label:"Actual Time", needed:null, display:fmtSecs(globalSummary.actual),color:C.accent},
            ].map(({label,needed,have,display,color}) => {
              const short = needed != null && have != null && needed > have;
              return (
                <div key={label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px"}}>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",color:C.textDim,fontFamily:"'Space Mono',monospace",marginBottom:4}}>{label}</div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:13,color:short?C.red:color}}>
                    {display ?? (needed === 0 ? "—" : fmtNum(needed))}
                  </div>
                  {have != null && needed != null && needed > 0 && (
                    <div style={{fontSize:10,color:C.textDim,fontFamily:"'Space Mono',monospace",marginTop:2}}>
                      have {fmtNum(have)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Research Speedup Cards ───────────────────────────────────────── */}
      {inv && (
        <div className="card" style={{marginBottom:16}}>
          <div className="card-header">
            <div className="card-title">Current Research Speed-ups</div>
          </div>
          <div className="card-body">
            <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
              {[
                {label:"General",  d:inv.speedGenD,      h:inv.speedGenH,      m:inv.speedGenM},
                {label:"Research", d:inv.speedResearchD, h:inv.speedResearchH, m:inv.speedResearchM},
                {label:"Learning", d:inv.speedLearningD, h:inv.speedLearningH, m:inv.speedLearningM},
              ].map(({label,d,h,m}) => {
                const totalMins = (d||0)*1440 + (h||0)*60 + (m||0);
                const parts = [];
                const days = Math.floor(totalMins/1440);
                const hrs  = Math.floor((totalMins%1440)/60);
                const mins = totalMins%60;
                if (days > 0) parts.push(`${days}d`);
                if (hrs  > 0) parts.push(`${hrs}h`);
                if (mins > 0) parts.push(`${mins}m`);
                const display = parts.join(" ") || "—";
                return (
                  <div key={label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 16px",minWidth:140}}>
                    <div style={{fontSize:9,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",color:C.textDim,fontFamily:"'Space Mono',monospace",marginBottom:4}}>{label}</div>
                    <div style={{fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:14,color:totalMins>0?C.blue:C.textDim}}>{display}</div>
                    {totalMins > 0 && <div style={{fontSize:10,color:C.textDim,fontFamily:"'Space Mono',monospace",marginTop:2}}>{(totalMins/60).toFixed(1)} hrs total</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Tree Selector ───────────────────────────────────────────────── */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {["Growth","Economy","Battle"].map(t => (
          <button key={t} type="button"
            onClick={() => setTree(t)}
            style={{padding:"8px 20px",borderRadius:7,fontSize:13,fontWeight:700,
              cursor:"pointer",fontFamily:"Syne,sans-serif",
              background: tree===t ? treeColor[t]+"22" : "transparent",
              color: tree===t ? treeColor[t] : C.textSec,
              border:`1px solid ${tree===t ? treeColor[t]+"66" : C.border}`,
              transition:"all 0.15s"}}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Tier Tables ─────────────────────────────────────────────────── */}
      {[...treeData.tiers]
        .sort((a, b) => {
          const aHidden = !!collapseAllMaxed[`${tree}-${a.tier}`];
          const bHidden = !!collapseAllMaxed[`${tree}-${b.tier}`];
          if (aHidden === bHidden) return 0; // preserve original order within each group
          return aHidden ? 1 : -1;           // hidden tiers sink to bottom
        })
        .map((tier) => {
        const tc = treeColor[tree];
        const collapseKey = `${tree}-${tier.tier}`;
        const isHiding = !!collapseAllMaxed[collapseKey];

        // Per-tier cost totals (goal → current diff)
        let tierMeat=0,tierWood=0,tierCoal=0,tierIron=0,tierSteel=0,tierSecs=0;
        tier.researches.forEach(res => {
          const {cur,goal} = getLv(res.id);
          const cost = calcResearchCost(res, cur, goal);
          tierMeat+=cost.meat; tierWood+=cost.wood; tierCoal+=cost.coal;
          tierIron+=cost.iron; tierSteel+=cost.steel; tierSecs+=cost.secs;
        });
        const tierActual = tierSecs > 0 ? Math.round(tierSecs/(1+buffTotal)) : 0;

        // Check if ALL researches in this tier are maxed at current level
        const allCurMaxed = tier.researches.every(res => {
          const maxLv = res.levels.length - 1;
          return (getLv(res.id).cur ?? 0) >= maxLv;
        });

        return (
          <div key={tier.tier} style={{marginBottom:24}}>
            {/* Tier header */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap"}}>
              <div style={{fontSize:15,fontWeight:800,color:tc,fontFamily:"Syne,sans-serif"}}>
                Tier {tier.tier}
              </div>
              <div style={{fontSize:10,color:C.textDim,fontFamily:"'Space Mono',monospace"}}>
                Min RC Lv. {tier.minRCLevel}
              </div>

              {/* Cost chips */}
              {tierSecs > 0 && (
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginLeft:4}}>
                  {[
                    {l:"Meat",  v:tierMeat,  c:C.green},
                    {l:"Wood",  v:tierWood,  c:C.green},
                    {l:"Coal",  v:tierCoal,  c:C.textSec},
                    {l:"Iron",  v:tierIron,  c:C.textSec},
                    {l:"Steel", v:tierSteel, c:C.blue},
                  ].filter(x=>x.v>0).map(x=>(
                    <span key={x.l} style={{fontSize:10,fontFamily:"'Space Mono',monospace",
                      color:x.c,background:C.surface,border:`1px solid ${C.border}`,
                      borderRadius:4,padding:"2px 6px"}}>
                      {x.l}: {fmtNum(x.v)}
                    </span>
                  ))}
                  <span style={{fontSize:10,fontFamily:"'Space Mono',monospace",
                    color:C.textSec,background:C.surface,border:`1px solid ${C.border}`,
                    borderRadius:4,padding:"2px 6px"}}>
                    {fmtSecs(tierActual)} actual
                  </span>
                </div>
              )}

              {/* Right side buttons */}
              <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
                {/* Collapse all-maxed toggle — only shown when whole tier is maxed */}
                {allCurMaxed && (
                  <button type="button"
                    onClick={() => toggleCollapseAllMaxed(tree, tier.tier)}
                    style={{padding:"4px 10px",borderRadius:5,fontSize:11,fontWeight:700,
                      cursor:"pointer",fontFamily:"'Space Mono',monospace",
                      background: isHiding ? C.accentBg : C.surface,
                      color: isHiding ? C.accent : C.textSec,
                      border:`1px solid ${isHiding ? C.accentDim : C.border}`}}>
                    {isHiding ? `▶ Show Tier ${tier.tier}` : `◀ Hide Tier ${tier.tier}`}
                  </button>
                )}
                {/* Max Tier — sets CURRENT to max for all researches */}
                <button type="button"
                  onClick={() => {
                    setLevels(prev => {
                      const next = {...prev};
                      tier.researches.forEach(res => {
                        const maxLv = res.levels.length - 1;
                        next[res.id] = { cur: maxLv, goal: maxLv };
                      });
                      return next;
                    });
                  }}
                  style={{padding:"4px 12px",borderRadius:5,fontSize:11,
                    fontWeight:700,cursor:"pointer",fontFamily:"'Space Mono',monospace",
                    background:C.accentBg,color:C.accent,border:`1px solid ${C.accentDim}`}}>
                  ⚡ Max Tier {tier.tier}
                </button>
              </div>
            </div>

            {/* Hide table when collapsed */}
            {!isHiding && (
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:720}}>
                  <thead>
                    <tr>
                      <th style={{...thS,minWidth:160}}>Research</th>
                      <th style={{...thS,textAlign:"center",width:70}}>Current</th>
                      <th style={{...thS,width:190}}>Current Buff</th>
                      <th style={{...thS,textAlign:"center",width:70}}>Goal</th>
                      <th style={{...thS,width:190}}>Goal Buff</th>
                      <th style={{...thS,textAlign:"right"}}>Power</th>
                      <th style={{...thS,textAlign:"right"}}>Orig. Time</th>
                      <th style={{...thS,textAlign:"right",color:C.accent}}>Actual Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tier.researches.map((res, ri) => {
                      const {cur, goal} = getLv(res.id);
                      const maxLv = res.levels.length - 1;
                      const cost = calcResearchCost(res, cur, goal);
                      const actualSecs = cost.secs > 0 ? Math.round(cost.secs / (1 + buffTotal)) : 0;
                      const curIsMax  = cur  >= maxLv;
                      const goalIsMax = goal >= maxLv;
                      const hasUpgrade = goal > cur;
                      const curPower = getRCPower(res, cur);

                      return (
                        <tr key={res.id} style={{
                          background: ri%2===0 ? "transparent" : C.surface,
                          opacity: curIsMax && !hasUpgrade ? 0.65 : 1,
                        }}>
                          <td style={{...tdS,fontWeight:600,color:C.textPri}}>
                            <div>{res.name}</div>
                            {curIsMax && !hasUpgrade && (
                              <span style={{fontSize:9,fontFamily:"'Space Mono',monospace",
                                color:C.green,fontWeight:700}}>MAXED</span>
                            )}
                          </td>

                          {/* Current level — always shows dropdown */}
                          <td style={{...tdS,textAlign:"center"}}>
                            <select value={cur}
                              onChange={e => setLv(res.id, "cur", Number(e.target.value))}
                              style={sel}>
                              {res.levels.map((_,i) => (
                                <option key={i} value={i}>{i}</option>
                              ))}
                            </select>
                          </td>

                          {/* Current buff */}
                          <td style={{...tdS,color:C.textSec,fontSize:11}}>
                            {cur === 0 ? <span style={{color:C.textDim}}>—</span> : getBuff(res, cur)}
                          </td>

                          {/* Goal level — Max badge only when cur is also at max */}
                          <td style={{...tdS,textAlign:"center"}}>
                            {goalIsMax && curIsMax ? (
                              <span style={{fontSize:10,color:C.green,fontFamily:"'Space Mono',monospace",fontWeight:700}}>Max</span>
                            ) : (
                              <select value={goal}
                                onChange={e => setLv(res.id, "goal", Number(e.target.value))}
                                style={{...sel,color: goal > cur ? C.accent : C.textPri}}>
                                {res.levels.map((_,i) => (
                                  <option key={i} value={i}>{i}</option>
                                ))}
                              </select>
                            )}
                          </td>

                          {/* Goal buff */}
                          <td style={{...tdS,color:goal>cur?C.accent:C.textSec,fontSize:11}}>
                            {goal === 0 ? <span style={{color:C.textDim}}>—</span> : getBuff(res, goal)}
                          </td>

                          {/* Power at current level */}
                          <td style={{...tdS,textAlign:"right",fontFamily:"'Space Mono',monospace",
                            color:curPower>0?C.textPri:C.textDim}}>
                            {curPower > 0 ? curPower.toLocaleString() : "—"}
                          </td>

                          {/* Original time */}
                          <td style={{...tdS,textAlign:"right",fontFamily:"'Space Mono',monospace",
                            color:hasUpgrade?C.textPri:C.textDim}}>
                            {hasUpgrade ? fmtSecs(cost.secs) : "—"}
                          </td>

                          {/* Actual time */}
                          <td style={{...tdS,textAlign:"right",fontFamily:"'Space Mono',monospace",
                            color:hasUpgrade?C.accent:C.textDim}}>
                            {hasUpgrade ? fmtSecs(actualSecs) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Per-Tree Stat Summary Tables ── */}
      {["Growth","Economy","Battle"].filter(treeName => treeName === tree).map(treeName => {
        // Sum buff values across ALL tiers and ALL researches in this tree at current levels
        const statTotals = {}; // stat → { value, isPct }
        RC[treeName].tiers.forEach(tier => {
          tier.researches.forEach(res => {
            const cur = levels[res.id]?.cur ?? 0;
            if (!cur || cur <= 0) return;
            const maxLv = res.levels.length - 1;
            const row = res.levels[Math.min(cur, maxLv)];
            if (!row?.buff) return;
            // Parse "+X% Stat" or "+X Stat"
            const m = row.buff.match(/^\+?([\d,]+\.?\d*)(%?)\s+(.+)$/);
            if (!m) return;
            const stat  = m[3].trim();
            const val   = parseFloat(m[1].replace(/,/g,""));
            const isPct = m[2] === "%";
            if (!statTotals[stat]) statTotals[stat] = { value: 0, isPct };
            statTotals[stat].value += val;
          });
        });

        const entries = Object.entries(statTotals);
        if (entries.length === 0) return null;

        // Define display order for each tree
        const ORDER = {
          Growth:  ["Construction Speed","Research Speed","Training Speed","Healing Speed","Training Capacity","Infirmary Capacity","March Queue"],
          Economy: ["Meat Output","Wood Output","Coal Output","Iron Output","Meat Gathering Speed","Wood Gathering Speed","Coal Gathering Speed","Iron Gathering Speed"],
          Battle:  ["All Troops Attack","All Troops Defense","All Troops Lethality","All Troops Health","Infantry Attack","Infantry Defense","Infantry Lethality","Infantry Health","Lancer Attack","Lancer Defense","Lancer Lethality","Lancer Health","Marksman Attack","Marksman Defense","Marksman Lethality","Marksman Health","Deployment Capacity"],
        };
        const order = ORDER[treeName] ?? [];
        const sorted = [
          ...order.filter(s => statTotals[s]),
          ...entries.map(([s]) => s).filter(s => !order.includes(s)).sort(),
        ];

        const treeColor = { Growth: C.green, Economy: C.amber, Battle: C.red }[treeName] ?? C.accent;

        const statColor = (stat) => {
          if (stat.includes("Attack"))      return C.red;
          if (stat.includes("Lethality"))   return C.amber;
          if (stat.includes("Defense"))     return C.blue;
          if (stat.includes("Health"))      return C.green;
          if (stat.includes("Deployment") || stat.includes("Rally") || stat.includes("March")) return C.accent;
          return C.textSec;
        };

        const fmt = (v, isPct) => {
          if (!isPct) return v.toLocaleString();
          const rounded = Math.round(v * 100) / 100;
          return (Number.isInteger(rounded) ? rounded : rounded.toFixed(2)) + "%";
        };

        return (
          <div key={treeName} style={{ marginBottom: 20,
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "10px 16px", background: C.surface,
              borderBottom: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: treeColor,
                fontFamily: "Syne,sans-serif" }}>{treeName} Tree</span>
              <span style={{ fontSize: 10, color: C.textDim,
                fontFamily: "'Space Mono',monospace" }}>— Current level stat totals</span>
            </div>
            {/* Table */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {sorted.map((stat, i) => {
                  const { value, isPct } = statTotals[stat];
                  return (
                    <tr key={stat} style={{ background: i % 2 === 0 ? "transparent" : C.surface }}>
                      <td style={{ padding: "7px 16px", fontSize: 12, color: C.textSec,
                        borderBottom: `1px solid ${C.border}` }}>
                        {stat}
                      </td>
                      <td style={{ padding: "7px 16px", fontSize: 12, fontWeight: 700,
                        fontFamily: "'Space Mono',monospace", textAlign: "right",
                        color: statColor(stat), borderBottom: `1px solid ${C.border}` }}>
                        +{fmt(value, isPct)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
