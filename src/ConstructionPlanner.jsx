import React, { useState, useMemo, useEffect } from "react";
import { _isGuest } from "./useLocalStorage.js";
import { useTierContext, GuestBanner } from "./TierContext.jsx";
import { buildCycles, getCurrentCycleNum, getCycleStartDate, fmtDate as fmtDateCal, cycleLabelFull, addDaysToDate, toIso, FIRST_SVS_MONDAY } from "./svsCalendar.js";
import { supabase } from "./supabase.js";

// ─── Exact building data from Misc. Data Tables AO3:BE399 ────────────────────
// Columns: AO=Building, AP=Level, AT=FC, AU=RFC, AV=Meat, AW=Wood, AX=Coal, AY=Iron, BD=TtlMins
// Each entry: one sub-level upgrade cost + construction time in minutes
const BLDG_DB = {
"Embassy":{"30.1":{"fc":33,"rfc":0,"meat":13000000,"wood":13000000,"coal":2700000,"iron":670000,"mins":6652},"30.2":{"fc":33,"rfc":0,"meat":13000000,"wood":13000000,"coal":2700000,"iron":670000,"mins":6652},"30.3":{"fc":33,"rfc":0,"meat":13000000,"wood":13000000,"coal":2700000,"iron":670000,"mins":6652},"30.4":{"fc":33,"rfc":0,"meat":13000000,"wood":13000000,"coal":2700000,"iron":670000,"mins":6652},"FC1":{"fc":33,"rfc":0,"meat":13000000,"wood":13000000,"coal":2700000,"iron":670000,"mins":6652},"FC1.1":{"fc":39,"rfc":0,"meat":14000000,"wood":14000000,"coal":2900000,"iron":720000,"mins":8553},"FC1.2":{"fc":39,"rfc":0,"meat":14000000,"wood":14000000,"coal":2900000,"iron":720000,"mins":8553},"FC1.3":{"fc":39,"rfc":0,"meat":14000000,"wood":14000000,"coal":2900000,"iron":720000,"mins":8553},"FC1.4":{"fc":39,"rfc":0,"meat":14000000,"wood":14000000,"coal":2900000,"iron":720000,"mins":8553},"FC2":{"fc":39,"rfc":0,"meat":14000000,"wood":14000000,"coal":2900000,"iron":720000,"mins":8553},"FC2.1":{"fc":59,"rfc":0,"meat":15000000,"wood":15000000,"coal":3100000,"iron":790000,"mins":10454},"FC2.2":{"fc":59,"rfc":0,"meat":15000000,"wood":15000000,"coal":3100000,"iron":790000,"mins":10454},"FC2.3":{"fc":59,"rfc":0,"meat":15000000,"wood":15000000,"coal":3100000,"iron":790000,"mins":10454},"FC2.4":{"fc":59,"rfc":0,"meat":15000000,"wood":15000000,"coal":3100000,"iron":790000,"mins":10454},"FC3":{"fc":59,"rfc":0,"meat":15000000,"wood":15000000,"coal":3100000,"iron":790000,"mins":10454},"FC3.1":{"fc":70,"rfc":0,"meat":16000000,"wood":16000000,"coal":3200000,"iron":820000,"mins":11404},"FC3.2":{"fc":70,"rfc":0,"meat":16000000,"wood":16000000,"coal":3200000,"iron":820000,"mins":11404},"FC3.3":{"fc":70,"rfc":0,"meat":16000000,"wood":16000000,"coal":3200000,"iron":820000,"mins":11404},"FC3.4":{"fc":70,"rfc":0,"meat":16000000,"wood":16000000,"coal":3200000,"iron":820000,"mins":11404},"FC4":{"fc":70,"rfc":0,"meat":16000000,"wood":16000000,"coal":3200000,"iron":820000,"mins":11404},"FC4.1":{"fc":83,"rfc":0,"meat":16000000,"wood":16000000,"coal":3300000,"iron":840000,"mins":13305},"FC4.2":{"fc":83,"rfc":0,"meat":16000000,"wood":16000000,"coal":3300000,"iron":840000,"mins":13305},"FC4.3":{"fc":83,"rfc":0,"meat":16000000,"wood":16000000,"coal":3300000,"iron":840000,"mins":13305},"FC4.4":{"fc":83,"rfc":0,"meat":16000000,"wood":16000000,"coal":3300000,"iron":840000,"mins":13305},"FC5":{"fc":83,"rfc":0,"meat":16000000,"wood":16000000,"coal":3300000,"iron":840000,"mins":13305},"FC5.1":{"fc":50,"rfc":2,"meat":19000000,"wood":19000000,"coal":3800000,"iron":960000,"mins":14256},"FC5.2":{"fc":50,"rfc":2,"meat":19000000,"wood":19000000,"coal":3800000,"iron":960000,"mins":14256},"FC5.3":{"fc":50,"rfc":2,"meat":19000000,"wood":19000000,"coal":3800000,"iron":960000,"mins":14256},"FC5.4":{"fc":50,"rfc":2,"meat":19000000,"wood":19000000,"coal":3800000,"iron":960000,"mins":14256},"FC6":{"fc":25,"rfc":5,"meat":19000000,"wood":19000000,"coal":3800000,"iron":960000,"mins":14256},"FC6.1":{"fc":60,"rfc":3,"meat":21000000,"wood":21000000,"coal":4300000,"iron":1100000,"mins":15462},"FC6.2":{"fc":60,"rfc":3,"meat":21000000,"wood":21000000,"coal":4300000,"iron":1100000,"mins":15462},"FC6.3":{"fc":60,"rfc":3,"meat":21000000,"wood":21000000,"coal":4300000,"iron":1100000,"mins":15462},"FC6.4":{"fc":60,"rfc":3,"meat":21000000,"wood":21000000,"coal":4300000,"iron":1100000,"mins":15462},"FC7":{"fc":30,"rfc":7,"meat":21000000,"wood":21000000,"coal":4300000,"iron":1100000,"mins":15462},"FC7.1":{"fc":60,"rfc":5,"meat":26000000,"wood":26000000,"coal":5300000,"iron":1300000,"mins":17280},"FC7.2":{"fc":60,"rfc":5,"meat":26000000,"wood":26000000,"coal":5300000,"iron":1300000,"mins":17280},"FC7.3":{"fc":60,"rfc":5,"meat":26000000,"wood":26000000,"coal":5300000,"iron":1300000,"mins":17280},"FC7.4":{"fc":60,"rfc":5,"meat":26000000,"wood":26000000,"coal":5300000,"iron":1300000,"mins":17280},"FC8":{"fc":30,"rfc":10,"meat":26000000,"wood":26000000,"coal":5300000,"iron":1300000,"mins":17280},"FC8.1":{"fc":70,"rfc":7,"meat":29000000,"wood":29000000,"coal":5800000,"iron":1500000,"mins":18662},"FC8.2":{"fc":70,"rfc":7,"meat":29000000,"wood":29000000,"coal":5800000,"iron":1500000,"mins":18662},"FC8.3":{"fc":70,"rfc":7,"meat":29000000,"wood":29000000,"coal":5800000,"iron":1500000,"mins":18662},"FC8.4":{"fc":70,"rfc":7,"meat":29000000,"wood":29000000,"coal":5800000,"iron":1500000,"mins":18662},"FC9":{"fc":35,"rfc":15,"meat":29000000,"wood":29000000,"coal":5800000,"iron":1500000,"mins":18662},"FC9.1":{"fc":87,"rfc":17,"meat":33000000,"wood":33000000,"coal":6700000,"iron":1700000,"mins":20275},"FC9.2":{"fc":87,"rfc":17,"meat":33000000,"wood":33000000,"coal":6700000,"iron":1700000,"mins":20275},"FC9.3":{"fc":87,"rfc":17,"meat":33000000,"wood":33000000,"coal":6700000,"iron":1700000,"mins":20275},"FC9.4":{"fc":87,"rfc":17,"meat":33000000,"wood":33000000,"coal":6700000,"iron":1700000,"mins":20275},"FC10":{"fc":43,"rfc":35,"meat":33000000,"wood":33000000,"coal":6700000,"iron":1700000,"mins":20275}},
"Furnace":{"30.1":{"fc":132,"rfc":0,"meat":67000000,"wood":67000000,"coal":13000000,"iron":3300000,"mins":10080},"30.2":{"fc":132,"rfc":0,"meat":67000000,"wood":67000000,"coal":13000000,"iron":3300000,"mins":10080},"30.3":{"fc":132,"rfc":0,"meat":67000000,"wood":67000000,"coal":13000000,"iron":3300000,"mins":10080},"30.4":{"fc":132,"rfc":0,"meat":67000000,"wood":67000000,"coal":13000000,"iron":3300000,"mins":10080},"FC1":{"fc":132,"rfc":0,"meat":67000000,"wood":67000000,"coal":13000000,"iron":3300000,"mins":10080},"FC1.1":{"fc":158,"rfc":0,"meat":72000000,"wood":72000000,"coal":14000000,"iron":3600000,"mins":12960},"FC1.2":{"fc":158,"rfc":0,"meat":72000000,"wood":72000000,"coal":14000000,"iron":3600000,"mins":12960},"FC1.3":{"fc":158,"rfc":0,"meat":72000000,"wood":72000000,"coal":14000000,"iron":3600000,"mins":12960},"FC1.4":{"fc":158,"rfc":0,"meat":72000000,"wood":72000000,"coal":14000000,"iron":3600000,"mins":12960},"FC2":{"fc":158,"rfc":0,"meat":72000000,"wood":72000000,"coal":14000000,"iron":3600000,"mins":12960},"FC2.1":{"fc":238,"rfc":0,"meat":79000000,"wood":79000000,"coal":15000000,"iron":3900000,"mins":17280},"FC2.2":{"fc":238,"rfc":0,"meat":79000000,"wood":79000000,"coal":15000000,"iron":3900000,"mins":17280},"FC2.3":{"fc":238,"rfc":0,"meat":79000000,"wood":79000000,"coal":15000000,"iron":3900000,"mins":17280},"FC2.4":{"fc":238,"rfc":0,"meat":79000000,"wood":79000000,"coal":15000000,"iron":3900000,"mins":17280},"FC3":{"fc":238,"rfc":0,"meat":79000000,"wood":79000000,"coal":15000000,"iron":3900000,"mins":17280},"FC3.1":{"fc":280,"rfc":0,"meat":82000000,"wood":82000000,"coal":16000000,"iron":4100000,"mins":20160},"FC3.2":{"fc":280,"rfc":0,"meat":82000000,"wood":82000000,"coal":16000000,"iron":4100000,"mins":20160},"FC3.3":{"fc":280,"rfc":0,"meat":82000000,"wood":82000000,"coal":16000000,"iron":4100000,"mins":20160},"FC3.4":{"fc":280,"rfc":0,"meat":82000000,"wood":82000000,"coal":16000000,"iron":4100000,"mins":20160},"FC4":{"fc":280,"rfc":0,"meat":82000000,"wood":82000000,"coal":16000000,"iron":4100000,"mins":20160},"FC4.1":{"fc":335,"rfc":0,"meat":84000000,"wood":84000000,"coal":16000000,"iron":4100000,"mins":21600},"FC4.2":{"fc":335,"rfc":0,"meat":84000000,"wood":84000000,"coal":16000000,"iron":4100000,"mins":21600},"FC4.3":{"fc":335,"rfc":0,"meat":84000000,"wood":84000000,"coal":16000000,"iron":4100000,"mins":21600},"FC4.4":{"fc":335,"rfc":0,"meat":84000000,"wood":84000000,"coal":16000000,"iron":4100000,"mins":21600},"FC5":{"fc":335,"rfc":0,"meat":84000000,"wood":84000000,"coal":16000000,"iron":4100000,"mins":21600},"FC5.1":{"fc":200,"rfc":10,"meat":96000000,"wood":96000000,"coal":19000000,"iron":4800000,"mins":21600},"FC5.2":{"fc":200,"rfc":10,"meat":96000000,"wood":96000000,"coal":19000000,"iron":4800000,"mins":21600},"FC5.3":{"fc":200,"rfc":10,"meat":96000000,"wood":96000000,"coal":19000000,"iron":4800000,"mins":21600},"FC5.4":{"fc":200,"rfc":10,"meat":96000000,"wood":96000000,"coal":19000000,"iron":4800000,"mins":21600},"FC6":{"fc":100,"rfc":20,"meat":96000000,"wood":96000000,"coal":19000000,"iron":4800000,"mins":21600},"FC6.1":{"fc":240,"rfc":15,"meat":100000000,"wood":100000000,"coal":21000000,"iron":5200000,"mins":25920},"FC6.2":{"fc":240,"rfc":15,"meat":100000000,"wood":100000000,"coal":21000000,"iron":5200000,"mins":25920},"FC6.3":{"fc":240,"rfc":15,"meat":100000000,"wood":100000000,"coal":21000000,"iron":5200000,"mins":25920},"FC6.4":{"fc":240,"rfc":15,"meat":100000000,"wood":100000000,"coal":21000000,"iron":5200000,"mins":25920},"FC7":{"fc":120,"rfc":30,"meat":100000000,"wood":100000000,"coal":21000000,"iron":5200000,"mins":25920},"FC7.1":{"fc":240,"rfc":20,"meat":130000000,"wood":130000000,"coal":26000000,"iron":6500000,"mins":28800},"FC7.2":{"fc":240,"rfc":20,"meat":130000000,"wood":130000000,"coal":26000000,"iron":6500000,"mins":28800},"FC7.3":{"fc":240,"rfc":20,"meat":130000000,"wood":130000000,"coal":26000000,"iron":6500000,"mins":28800},"FC7.4":{"fc":240,"rfc":20,"meat":130000000,"wood":130000000,"coal":26000000,"iron":6500000,"mins":28800},"FC8":{"fc":120,"rfc":40,"meat":130000000,"wood":130000000,"coal":26000000,"iron":6500000,"mins":28800},"FC8.1":{"fc":280,"rfc":30,"meat":140000000,"wood":140000000,"coal":29000000,"iron":7200000,"mins":28800},"FC8.2":{"fc":280,"rfc":30,"meat":140000000,"wood":140000000,"coal":29000000,"iron":7200000,"mins":28800},"FC8.3":{"fc":280,"rfc":30,"meat":140000000,"wood":140000000,"coal":29000000,"iron":7200000,"mins":28800},"FC8.4":{"fc":280,"rfc":30,"meat":140000000,"wood":140000000,"coal":29000000,"iron":7200000,"mins":28800},"FC9":{"fc":140,"rfc":60,"meat":140000000,"wood":140000000,"coal":29000000,"iron":7200000,"mins":28800},"FC9.1":{"fc":350,"rfc":70,"meat":160000000,"wood":160000000,"coal":33000000,"iron":8400000,"mins":28800},"FC9.2":{"fc":350,"rfc":70,"meat":160000000,"wood":160000000,"coal":33000000,"iron":8400000,"mins":28800},"FC9.3":{"fc":350,"rfc":70,"meat":160000000,"wood":160000000,"coal":33000000,"iron":8400000,"mins":28800},"FC9.4":{"fc":350,"rfc":70,"meat":160000000,"wood":160000000,"coal":33000000,"iron":8400000,"mins":28800},"FC10":{"fc":175,"rfc":140,"meat":160000000,"wood":160000000,"coal":33000000,"iron":8400000,"mins":28800}},
"Infantry":{"30.1":{"fc":59,"rfc":0,"meat":23000000,"wood":23000000,"coal":4700000,"iron":1200000,"mins":1512},"30.2":{"fc":59,"rfc":0,"meat":23000000,"wood":23000000,"coal":4700000,"iron":1200000,"mins":1512},"30.3":{"fc":59,"rfc":0,"meat":23000000,"wood":23000000,"coal":4700000,"iron":1200000,"mins":1512},"30.4":{"fc":59,"rfc":0,"meat":23000000,"wood":23000000,"coal":4700000,"iron":1200000,"mins":1512},"FC1":{"fc":59,"rfc":0,"meat":23000000,"wood":23000000,"coal":4700000,"iron":1200000,"mins":1512},"FC1.1":{"fc":71,"rfc":0,"meat":25000000,"wood":25000000,"coal":5000000,"iron":1300000,"mins":2016},"FC1.2":{"fc":71,"rfc":0,"meat":25000000,"wood":25000000,"coal":5000000,"iron":1300000,"mins":2016},"FC1.3":{"fc":71,"rfc":0,"meat":25000000,"wood":25000000,"coal":5000000,"iron":1300000,"mins":2016},"FC1.4":{"fc":71,"rfc":0,"meat":25000000,"wood":25000000,"coal":5000000,"iron":1300000,"mins":2016},"FC2":{"fc":71,"rfc":0,"meat":25000000,"wood":25000000,"coal":5000000,"iron":1300000,"mins":2016},"FC2.1":{"fc":107,"rfc":0,"meat":27000000,"wood":27000000,"coal":5500000,"iron":1400000,"mins":2880},"FC2.2":{"fc":107,"rfc":0,"meat":27000000,"wood":27000000,"coal":5500000,"iron":1400000,"mins":2880},"FC2.3":{"fc":107,"rfc":0,"meat":27000000,"wood":27000000,"coal":5500000,"iron":1400000,"mins":2880},"FC2.4":{"fc":107,"rfc":0,"meat":27000000,"wood":27000000,"coal":5500000,"iron":1400000,"mins":2880},"FC3":{"fc":107,"rfc":0,"meat":27000000,"wood":27000000,"coal":5500000,"iron":1400000,"mins":2880},"FC3.1":{"fc":126,"rfc":0,"meat":28000000,"wood":28000000,"coal":5700000,"iron":1400000,"mins":3456},"FC3.2":{"fc":126,"rfc":0,"meat":28000000,"wood":28000000,"coal":5700000,"iron":1400000,"mins":3456},"FC3.3":{"fc":126,"rfc":0,"meat":28000000,"wood":28000000,"coal":5700000,"iron":1400000,"mins":3456},"FC3.4":{"fc":126,"rfc":0,"meat":28000000,"wood":28000000,"coal":5700000,"iron":1400000,"mins":3456},"FC4":{"fc":126,"rfc":0,"meat":28000000,"wood":28000000,"coal":5700000,"iron":1400000,"mins":3456},"FC4.1":{"fc":150,"rfc":0,"meat":29000000,"wood":29000000,"coal":5900000,"iron":1500000,"mins":4032},"FC4.2":{"fc":150,"rfc":0,"meat":29000000,"wood":29000000,"coal":5900000,"iron":1500000,"mins":4032},"FC4.3":{"fc":150,"rfc":0,"meat":29000000,"wood":29000000,"coal":5900000,"iron":1500000,"mins":4032},"FC4.4":{"fc":150,"rfc":0,"meat":29000000,"wood":29000000,"coal":5900000,"iron":1500000,"mins":4032},"FC5":{"fc":150,"rfc":0,"meat":29000000,"wood":29000000,"coal":5900000,"iron":1500000,"mins":4032},"FC5.1":{"fc":90,"rfc":4,"meat":33000000,"wood":33000000,"coal":6700000,"iron":1700000,"mins":4608},"FC5.2":{"fc":90,"rfc":4,"meat":33000000,"wood":33000000,"coal":6700000,"iron":1700000,"mins":4608},"FC5.3":{"fc":90,"rfc":4,"meat":33000000,"wood":33000000,"coal":6700000,"iron":1700000,"mins":4608},"FC5.4":{"fc":90,"rfc":4,"meat":33000000,"wood":33000000,"coal":6700000,"iron":1700000,"mins":4608},"FC6":{"fc":45,"rfc":9,"meat":33000000,"wood":33000000,"coal":6700000,"iron":1700000,"mins":4608},"FC6.1":{"fc":108,"rfc":6,"meat":38000000,"wood":38000000,"coal":7600000,"iron":1900000,"mins":5760},"FC6.2":{"fc":108,"rfc":6,"meat":38000000,"wood":38000000,"coal":7600000,"iron":1900000,"mins":5760},"FC6.3":{"fc":108,"rfc":6,"meat":38000000,"wood":38000000,"coal":7600000,"iron":1900000,"mins":5760},"FC6.4":{"fc":108,"rfc":6,"meat":38000000,"wood":38000000,"coal":7600000,"iron":1900000,"mins":5760},"FC7":{"fc":54,"rfc":13,"meat":38000000,"wood":38000000,"coal":7600000,"iron":1900000,"mins":5760},"FC7.1":{"fc":108,"rfc":9,"meat":46000000,"wood":46000000,"coal":9300000,"iron":2300000,"mins":6912},"FC7.2":{"fc":108,"rfc":9,"meat":46000000,"wood":46000000,"coal":9300000,"iron":2300000,"mins":6912},"FC7.3":{"fc":108,"rfc":9,"meat":46000000,"wood":46000000,"coal":9300000,"iron":2300000,"mins":6912},"FC7.4":{"fc":108,"rfc":9,"meat":46000000,"wood":46000000,"coal":9300000,"iron":2300000,"mins":6912},"FC8":{"fc":54,"rfc":19,"meat":46000000,"wood":46000000,"coal":9300000,"iron":2300000,"mins":6912},"FC8.1":{"fc":126,"rfc":13,"meat":50000000,"wood":50000000,"coal":10000000,"iron":2500000,"mins":8064},"FC8.2":{"fc":126,"rfc":13,"meat":50000000,"wood":50000000,"coal":10000000,"iron":2500000,"mins":8064},"FC8.3":{"fc":126,"rfc":13,"meat":50000000,"wood":50000000,"coal":10000000,"iron":2500000,"mins":8064},"FC8.4":{"fc":126,"rfc":13,"meat":50000000,"wood":50000000,"coal":10000000,"iron":2500000,"mins":8064},"FC9":{"fc":63,"rfc":27,"meat":50000000,"wood":50000000,"coal":10000000,"iron":2500000,"mins":8064},"FC9.1":{"fc":157,"rfc":31,"meat":59000000,"wood":59000000,"coal":11000000,"iron":2900000,"mins":9504},"FC9.2":{"fc":157,"rfc":31,"meat":59000000,"wood":59000000,"coal":11000000,"iron":2900000,"mins":9504},"FC9.3":{"fc":157,"rfc":31,"meat":59000000,"wood":59000000,"coal":11000000,"iron":2900000,"mins":9504},"FC9.4":{"fc":157,"rfc":31,"meat":59000000,"wood":59000000,"coal":11000000,"iron":2900000,"mins":9504},"FC10":{"fc":78,"rfc":63,"meat":59000000,"wood":59000000,"coal":11000000,"iron":2900000,"mins":9504}},
"Command":{"30.1":{"fc":26,"rfc":0,"meat":20000000,"wood":20000000,"coal":4000000,"iron":1000000,"mins":1209},"30.2":{"fc":26,"rfc":0,"meat":20000000,"wood":20000000,"coal":4000000,"iron":1000000,"mins":1209},"30.3":{"fc":26,"rfc":0,"meat":20000000,"wood":20000000,"coal":4000000,"iron":1000000,"mins":1209},"30.4":{"fc":26,"rfc":0,"meat":20000000,"wood":20000000,"coal":4000000,"iron":1000000,"mins":1209},"FC1":{"fc":26,"rfc":0,"meat":20000000,"wood":20000000,"coal":4000000,"iron":1000000,"mins":1209},"FC1.1":{"fc":31,"rfc":0,"meat":21000000,"wood":21000000,"coal":4300000,"iron":1100000,"mins":1613},"FC1.2":{"fc":31,"rfc":0,"meat":21000000,"wood":21000000,"coal":4300000,"iron":1100000,"mins":1613},"FC1.3":{"fc":31,"rfc":0,"meat":21000000,"wood":21000000,"coal":4300000,"iron":1100000,"mins":1613},"FC1.4":{"fc":31,"rfc":0,"meat":21000000,"wood":21000000,"coal":4300000,"iron":1100000,"mins":1613},"FC2":{"fc":31,"rfc":0,"meat":21000000,"wood":21000000,"coal":4300000,"iron":1100000,"mins":1613},"FC2.1":{"fc":47,"rfc":0,"meat":23000000,"wood":23000000,"coal":4700000,"iron":1200000,"mins":2318},"FC2.2":{"fc":47,"rfc":0,"meat":23000000,"wood":23000000,"coal":4700000,"iron":1200000,"mins":2318},"FC2.3":{"fc":47,"rfc":0,"meat":23000000,"wood":23000000,"coal":4700000,"iron":1200000,"mins":2318},"FC2.4":{"fc":47,"rfc":0,"meat":23000000,"wood":23000000,"coal":4700000,"iron":1200000,"mins":2318},"FC3":{"fc":47,"rfc":0,"meat":23000000,"wood":23000000,"coal":4700000,"iron":1200000,"mins":2318},"FC3.1":{"fc":56,"rfc":0,"meat":24000000,"wood":24000000,"coal":4900000,"iron":1200000,"mins":2822},"FC3.2":{"fc":56,"rfc":0,"meat":24000000,"wood":24000000,"coal":4900000,"iron":1200000,"mins":2822},"FC3.3":{"fc":56,"rfc":0,"meat":24000000,"wood":24000000,"coal":4900000,"iron":1200000,"mins":2822},"FC3.4":{"fc":56,"rfc":0,"meat":24000000,"wood":24000000,"coal":4900000,"iron":1200000,"mins":2822},"FC4":{"fc":56,"rfc":0,"meat":24000000,"wood":24000000,"coal":4900000,"iron":1200000,"mins":2822},"FC4.1":{"fc":67,"rfc":0,"meat":25000000,"wood":25000000,"coal":5000000,"iron":1300000,"mins":3427},"FC4.2":{"fc":67,"rfc":0,"meat":25000000,"wood":25000000,"coal":5000000,"iron":1300000,"mins":3427},"FC4.3":{"fc":67,"rfc":0,"meat":25000000,"wood":25000000,"coal":5000000,"iron":1300000,"mins":3427},"FC4.4":{"fc":67,"rfc":0,"meat":25000000,"wood":25000000,"coal":5000000,"iron":1300000,"mins":3427},"FC5":{"fc":67,"rfc":0,"meat":25000000,"wood":25000000,"coal":5000000,"iron":1300000,"mins":3427},"FC5.1":{"fc":40,"rfc":2,"meat":29000000,"wood":29000000,"coal":5800000,"iron":1500000,"mins":3830},"FC5.2":{"fc":40,"rfc":2,"meat":29000000,"wood":29000000,"coal":5800000,"iron":1500000,"mins":3830},"FC5.3":{"fc":40,"rfc":2,"meat":29000000,"wood":29000000,"coal":5800000,"iron":1500000,"mins":3830},"FC5.4":{"fc":40,"rfc":2,"meat":29000000,"wood":29000000,"coal":5800000,"iron":1500000,"mins":3830},"FC6":{"fc":20,"rfc":4,"meat":29000000,"wood":29000000,"coal":5800000,"iron":1500000,"mins":3830},"FC6.1":{"fc":48,"rfc":3,"meat":32000000,"wood":32000000,"coal":6500000,"iron":1600000,"mins":4636},"FC6.2":{"fc":48,"rfc":3,"meat":32000000,"wood":32000000,"coal":6500000,"iron":1600000,"mins":4636},"FC6.3":{"fc":48,"rfc":3,"meat":32000000,"wood":32000000,"coal":6500000,"iron":1600000,"mins":4636},"FC6.4":{"fc":48,"rfc":3,"meat":32000000,"wood":32000000,"coal":6500000,"iron":1600000,"mins":4636},"FC7":{"fc":24,"rfc":6,"meat":32000000,"wood":32000000,"coal":6500000,"iron":1600000,"mins":4636},"FC7.1":{"fc":48,"rfc":4,"meat":39000000,"wood":39000000,"coal":7900000,"iron":2000000,"mins":5644},"FC7.2":{"fc":48,"rfc":4,"meat":39000000,"wood":39000000,"coal":7900000,"iron":2000000,"mins":5644},"FC7.3":{"fc":48,"rfc":4,"meat":39000000,"wood":39000000,"coal":7900000,"iron":2000000,"mins":5644},"FC7.4":{"fc":48,"rfc":4,"meat":39000000,"wood":39000000,"coal":7900000,"iron":2000000,"mins":5644},"FC8":{"fc":24,"rfc":8,"meat":39000000,"wood":39000000,"coal":7900000,"iron":2000000,"mins":5644},"FC8.1":{"fc":56,"rfc":6,"meat":43000000,"wood":43000000,"coal":8700000,"iron":2200000,"mins":6450},"FC8.2":{"fc":56,"rfc":6,"meat":43000000,"wood":43000000,"coal":8700000,"iron":2200000,"mins":6450},"FC8.3":{"fc":56,"rfc":6,"meat":43000000,"wood":43000000,"coal":8700000,"iron":2200000,"mins":6450},"FC8.4":{"fc":56,"rfc":6,"meat":43000000,"wood":43000000,"coal":8700000,"iron":2200000,"mins":6450},"FC9":{"fc":28,"rfc":12,"meat":43000000,"wood":43000000,"coal":8700000,"iron":2200000,"mins":6450},"FC9.1":{"fc":70,"rfc":14,"meat":50000000,"wood":50000000,"coal":10000000,"iron":2500000,"mins":7862},"FC9.2":{"fc":70,"rfc":14,"meat":50000000,"wood":50000000,"coal":10000000,"iron":2500000,"mins":7862},"FC9.3":{"fc":70,"rfc":14,"meat":50000000,"wood":50000000,"coal":10000000,"iron":2500000,"mins":7862},"FC9.4":{"fc":70,"rfc":14,"meat":50000000,"wood":50000000,"coal":10000000,"iron":2500000,"mins":7862},"FC10":{"fc":35,"rfc":28,"meat":50000000,"wood":50000000,"coal":10000000,"iron":2500000,"mins":7862}},
"Infirmary":{"30.1":{"fc":26,"rfc":0,"meat":16000000,"wood":16000000,"coal":3300000,"iron":820000,"mins":1411},"30.2":{"fc":26,"rfc":0,"meat":16000000,"wood":16000000,"coal":3300000,"iron":820000,"mins":1411},"30.3":{"fc":26,"rfc":0,"meat":16000000,"wood":16000000,"coal":3300000,"iron":820000,"mins":1411},"30.4":{"fc":26,"rfc":0,"meat":16000000,"wood":16000000,"coal":3300000,"iron":820000,"mins":1411},"FC1":{"fc":26,"rfc":0,"meat":16000000,"wood":16000000,"coal":3300000,"iron":820000,"mins":1411},"FC1.1":{"fc":31,"rfc":0,"meat":18000000,"wood":18000000,"coal":3600000,"iron":910000,"mins":1814},"FC1.2":{"fc":31,"rfc":0,"meat":18000000,"wood":18000000,"coal":3600000,"iron":910000,"mins":1814},"FC1.3":{"fc":31,"rfc":0,"meat":18000000,"wood":18000000,"coal":3600000,"iron":910000,"mins":1814},"FC1.4":{"fc":31,"rfc":0,"meat":18000000,"wood":18000000,"coal":3600000,"iron":910000,"mins":1814},"FC2":{"fc":31,"rfc":0,"meat":18000000,"wood":18000000,"coal":3600000,"iron":910000,"mins":1814},"FC2.1":{"fc":47,"rfc":0,"meat":19000000,"wood":19000000,"coal":3900000,"iron":980000,"mins":2318},"FC2.2":{"fc":47,"rfc":0,"meat":19000000,"wood":19000000,"coal":3900000,"iron":980000,"mins":2318},"FC2.3":{"fc":47,"rfc":0,"meat":19000000,"wood":19000000,"coal":3900000,"iron":980000,"mins":2318},"FC2.4":{"fc":47,"rfc":0,"meat":19000000,"wood":19000000,"coal":3900000,"iron":980000,"mins":2318},"FC3":{"fc":47,"rfc":0,"meat":19000000,"wood":19000000,"coal":3900000,"iron":980000,"mins":2318},"FC3.1":{"fc":56,"rfc":0,"meat":20000000,"wood":20000000,"coal":4100000,"iron":1000000,"mins":2822},"FC3.2":{"fc":56,"rfc":0,"meat":20000000,"wood":20000000,"coal":4100000,"iron":1000000,"mins":2822},"FC3.3":{"fc":56,"rfc":0,"meat":20000000,"wood":20000000,"coal":4100000,"iron":1000000,"mins":2822},"FC3.4":{"fc":56,"rfc":0,"meat":20000000,"wood":20000000,"coal":4100000,"iron":1000000,"mins":2822},"FC4":{"fc":56,"rfc":0,"meat":20000000,"wood":20000000,"coal":4100000,"iron":1000000,"mins":2822},"FC4.1":{"fc":67,"rfc":0,"meat":21000000,"wood":21000000,"coal":4200000,"iron":1100000,"mins":3225},"FC4.2":{"fc":67,"rfc":0,"meat":21000000,"wood":21000000,"coal":4200000,"iron":1100000,"mins":3225},"FC4.3":{"fc":67,"rfc":0,"meat":21000000,"wood":21000000,"coal":4200000,"iron":1100000,"mins":3225},"FC4.4":{"fc":67,"rfc":0,"meat":21000000,"wood":21000000,"coal":4200000,"iron":1100000,"mins":3225},"FC5":{"fc":67,"rfc":0,"meat":21000000,"wood":21000000,"coal":4200000,"iron":1100000,"mins":3225},"FC5.1":{"fc":40,"rfc":2,"meat":24000000,"wood":24000000,"coal":4800000,"iron":1200000,"mins":3830},"FC5.2":{"fc":40,"rfc":2,"meat":24000000,"wood":24000000,"coal":4800000,"iron":1200000,"mins":3830},"FC5.3":{"fc":40,"rfc":2,"meat":24000000,"wood":24000000,"coal":4800000,"iron":1200000,"mins":3830},"FC5.4":{"fc":40,"rfc":2,"meat":24000000,"wood":24000000,"coal":4800000,"iron":1200000,"mins":3830},"FC6":{"fc":20,"rfc":4,"meat":24000000,"wood":24000000,"coal":4800000,"iron":1200000,"mins":3830},"FC6.1":{"fc":48,"rfc":3,"meat":27000000,"wood":27000000,"coal":5400000,"iron":1400000,"mins":4636},"FC6.2":{"fc":48,"rfc":3,"meat":27000000,"wood":27000000,"coal":5400000,"iron":1400000,"mins":4636},"FC6.3":{"fc":48,"rfc":3,"meat":27000000,"wood":27000000,"coal":5400000,"iron":1400000,"mins":4636},"FC6.4":{"fc":48,"rfc":3,"meat":27000000,"wood":27000000,"coal":5400000,"iron":1400000,"mins":4636},"FC7":{"fc":24,"rfc":6,"meat":27000000,"wood":27000000,"coal":5400000,"iron":1400000,"mins":4636},"FC7.1":{"fc":48,"rfc":4,"meat":33000000,"wood":33000000,"coal":6600000,"iron":1700000,"mins":5644},"FC7.2":{"fc":48,"rfc":4,"meat":33000000,"wood":33000000,"coal":6600000,"iron":1700000,"mins":5644},"FC7.3":{"fc":48,"rfc":4,"meat":33000000,"wood":33000000,"coal":6600000,"iron":1700000,"mins":5644},"FC7.4":{"fc":48,"rfc":4,"meat":33000000,"wood":33000000,"coal":6600000,"iron":1700000,"mins":5644},"FC8":{"fc":24,"rfc":8,"meat":33000000,"wood":33000000,"coal":6600000,"iron":1700000,"mins":5644},"FC8.1":{"fc":56,"rfc":6,"meat":36000000,"wood":36000000,"coal":7200000,"iron":1800000,"mins":6450},"FC8.2":{"fc":56,"rfc":6,"meat":36000000,"wood":36000000,"coal":7200000,"iron":1800000,"mins":6450},"FC8.3":{"fc":56,"rfc":6,"meat":36000000,"wood":36000000,"coal":7200000,"iron":1800000,"mins":6450},"FC8.4":{"fc":56,"rfc":6,"meat":36000000,"wood":36000000,"coal":7200000,"iron":1800000,"mins":6450},"FC9":{"fc":28,"rfc":12,"meat":36000000,"wood":36000000,"coal":7200000,"iron":1800000,"mins":6450},"FC9.1":{"fc":70,"rfc":14,"meat":42000000,"wood":42000000,"coal":8400000,"iron":2100000,"mins":7862},"FC9.2":{"fc":70,"rfc":14,"meat":42000000,"wood":42000000,"coal":8400000,"iron":2100000,"mins":7862},"FC9.3":{"fc":70,"rfc":14,"meat":42000000,"wood":42000000,"coal":8400000,"iron":2100000,"mins":7862},"FC9.4":{"fc":70,"rfc":14,"meat":42000000,"wood":42000000,"coal":8400000,"iron":2100000,"mins":7862},"FC10":{"fc":35,"rfc":28,"meat":42000000,"wood":42000000,"coal":8400000,"iron":2100000,"mins":7862}},
"WA":{"FC1":{"fc":0,"rfc":0,"meat":0,"wood":0,"coal":0,"iron":0,"mins":0},"FC1.1":{"fc":71,"rfc":0,"meat":36000000,"wood":36000000,"coal":7200000,"iron":1800000,"mins":2592},"FC1.2":{"fc":71,"rfc":0,"meat":36000000,"wood":36000000,"coal":7200000,"iron":1800000,"mins":2592},"FC1.3":{"fc":71,"rfc":0,"meat":36000000,"wood":36000000,"coal":7200000,"iron":1800000,"mins":2592},"FC1.4":{"fc":71,"rfc":0,"meat":36000000,"wood":36000000,"coal":7200000,"iron":1800000,"mins":2592},"FC2":{"fc":71,"rfc":0,"meat":36000000,"wood":36000000,"coal":7200000,"iron":1800000,"mins":2592},"FC2.1":{"fc":107,"rfc":0,"meat":39000000,"wood":39000000,"coal":7900000,"iron":1900000,"mins":3456},"FC2.2":{"fc":107,"rfc":0,"meat":39000000,"wood":39000000,"coal":7900000,"iron":1900000,"mins":3456},"FC2.3":{"fc":107,"rfc":0,"meat":39000000,"wood":39000000,"coal":7900000,"iron":1900000,"mins":3456},"FC2.4":{"fc":107,"rfc":0,"meat":39000000,"wood":39000000,"coal":7900000,"iron":1900000,"mins":3456},"FC3":{"fc":107,"rfc":0,"meat":39000000,"wood":39000000,"coal":7900000,"iron":1900000,"mins":3456},"FC3.1":{"fc":126,"rfc":0,"meat":41000000,"wood":41000000,"coal":8200000,"iron":2000000,"mins":4320},"FC3.2":{"fc":126,"rfc":0,"meat":41000000,"wood":41000000,"coal":8200000,"iron":2000000,"mins":4320},"FC3.3":{"fc":126,"rfc":0,"meat":41000000,"wood":41000000,"coal":8200000,"iron":2000000,"mins":4320},"FC3.4":{"fc":126,"rfc":0,"meat":41000000,"wood":41000000,"coal":8200000,"iron":2000000,"mins":4320},"FC4":{"fc":126,"rfc":0,"meat":41000000,"wood":41000000,"coal":8200000,"iron":2000000,"mins":4320},"FC4.1":{"fc":150,"rfc":0,"meat":42000000,"wood":42000000,"coal":8200000,"iron":2000000,"mins":5184},"FC4.2":{"fc":150,"rfc":0,"meat":42000000,"wood":42000000,"coal":8200000,"iron":2000000,"mins":5184},"FC4.3":{"fc":150,"rfc":0,"meat":42000000,"wood":42000000,"coal":8200000,"iron":2000000,"mins":5184},"FC4.4":{"fc":150,"rfc":0,"meat":42000000,"wood":42000000,"coal":8200000,"iron":2000000,"mins":5184},"FC5":{"fc":150,"rfc":0,"meat":42000000,"wood":42000000,"coal":8200000,"iron":2000000,"mins":5184},"FC5.1":{"fc":90,"rfc":4,"meat":48000000,"wood":48000000,"coal":9600000,"iron":2400000,"mins":5760},"FC5.2":{"fc":90,"rfc":4,"meat":48000000,"wood":48000000,"coal":9600000,"iron":2400000,"mins":5760},"FC5.3":{"fc":90,"rfc":4,"meat":48000000,"wood":48000000,"coal":9600000,"iron":2400000,"mins":5760},"FC5.4":{"fc":90,"rfc":4,"meat":48000000,"wood":48000000,"coal":9600000,"iron":2400000,"mins":5760},"FC6":{"fc":45,"rfc":9,"meat":48000000,"wood":48000000,"coal":9600000,"iron":2400000,"mins":5760},"FC6.1":{"fc":108,"rfc":6,"meat":54000000,"wood":54000000,"coal":10000000,"iron":2700000,"mins":6912},"FC6.2":{"fc":108,"rfc":6,"meat":54000000,"wood":54000000,"coal":10000000,"iron":2700000,"mins":6912},"FC6.3":{"fc":108,"rfc":6,"meat":54000000,"wood":54000000,"coal":10000000,"iron":2700000,"mins":6912},"FC6.4":{"fc":108,"rfc":6,"meat":54000000,"wood":54000000,"coal":10000000,"iron":2700000,"mins":6912},"FC7":{"fc":54,"rfc":13,"meat":54000000,"wood":54000000,"coal":10000000,"iron":2700000,"mins":6912},"FC7.1":{"fc":108,"rfc":9,"meat":66000000,"wood":66000000,"coal":13000000,"iron":3300000,"mins":8064},"FC7.2":{"fc":108,"rfc":9,"meat":66000000,"wood":66000000,"coal":13000000,"iron":3300000,"mins":8064},"FC7.3":{"fc":108,"rfc":9,"meat":66000000,"wood":66000000,"coal":13000000,"iron":3300000,"mins":8064},"FC7.4":{"fc":108,"rfc":9,"meat":66000000,"wood":66000000,"coal":13000000,"iron":3300000,"mins":8064},"FC8":{"fc":108,"rfc":9,"meat":66000000,"wood":66000000,"coal":13000000,"iron":3300000,"mins":8064},"FC8.1":{"fc":126,"rfc":13,"meat":72000000,"wood":72000000,"coal":14000000,"iron":3600000,"mins":9216},"FC8.2":{"fc":126,"rfc":13,"meat":72000000,"wood":72000000,"coal":14000000,"iron":3600000,"mins":9216},"FC8.3":{"fc":126,"rfc":13,"meat":72000000,"wood":72000000,"coal":14000000,"iron":3600000,"mins":9216},"FC8.4":{"fc":126,"rfc":13,"meat":72000000,"wood":72000000,"coal":14000000,"iron":3600000,"mins":9216},"FC9":{"fc":63,"rfc":27,"meat":72000000,"wood":72000000,"coal":14000000,"iron":3600000,"mins":9216},"FC9.1":{"fc":157,"rfc":31,"meat":84000000,"wood":84000000,"coal":16000000,"iron":4100000,"mins":10368},"FC9.2":{"fc":157,"rfc":31,"meat":84000000,"wood":84000000,"coal":16000000,"iron":4100000,"mins":10368},"FC9.3":{"fc":157,"rfc":31,"meat":84000000,"wood":84000000,"coal":16000000,"iron":4100000,"mins":10368},"FC9.4":{"fc":157,"rfc":31,"meat":84000000,"wood":84000000,"coal":16000000,"iron":4100000,"mins":10368},"FC10":{"fc":78,"rfc":63,"meat":84000000,"wood":84000000,"coal":16000000,"iron":4100000,"mins":10368}}
};
// Marksman and Lancer share Infantry data
BLDG_DB["Marksman"] = BLDG_DB["Infantry"];
BLDG_DB["Lancer"]   = BLDG_DB["Infantry"];
BLDG_DB["War Academy"] = BLDG_DB["WA"];

// Sub-level key sets per major FC level (5 entries each: base + .1 .2 .3 .4)
const SUB_KEYS = {
  FC1: ["FC1","FC1.1","FC1.2","FC1.3","FC1.4"],
  FC2: ["FC2","FC2.1","FC2.2","FC2.3","FC2.4"],
  FC3: ["FC3","FC3.1","FC3.2","FC3.3","FC3.4"],
  FC4: ["FC4","FC4.1","FC4.2","FC4.3","FC4.4"],
  FC5: ["FC5","FC5.1","FC5.2","FC5.3","FC5.4"],
  FC6: ["FC6","FC6.1","FC6.2","FC6.3","FC6.4"],
  FC7: ["FC7","FC7.1","FC7.2","FC7.3","FC7.4"],
  FC8: ["FC8","FC8.1","FC8.2","FC8.3","FC8.4"],
  FC9: ["FC9","FC9.1","FC9.2","FC9.3","FC9.4"],
  FC10:["FC10"],
};

// Compute totals from fromLevel to toLevel (exclusive of fromLevel base row).
// Algorithm verified against spreadsheet: Furnace FC5→FC8 = 3060 FC, 270 RFC.
//   fromLevel (e.g. FC5): include only .1–.4 rows (skip base — already at this level)
//   intermediate levels  : include all 5 rows (base + .1–.4)
//   toLevel (e.g. FC8)   : include only the base row (just arriving at this level)
// Build a flat ordered list of all BLDG_DB keys from F30.1 to FC10
const ALL_LEVEL_KEYS = (() => {
  const keys = [];
  ["30.1","30.2","30.3","30.4"].forEach(k => keys.push(k));
  for (let fc = 1; fc <= 9; fc++) {
    keys.push(`FC${fc}`);
    for (let s = 1; s <= 4; s++) keys.push(`FC${fc}.${s}`);
  }
  keys.push("FC10");
  return keys;
})();

// Convert {level, sub} to BLDG_DB key. sub=0 = base level key.
function levelKey(level, sub) {
  if (!sub || sub === 0) return level;
  if (level === "F30") return `30.${sub}`;
  return `${level}.${sub}`;
}

function keyIndex(level, sub) {
  return ALL_LEVEL_KEYS.indexOf(levelKey(level, sub === undefined ? 0 : sub));
}

// Compute upgrade cost from (fromLevel, fromSub) to (toLevel, toSub)
// Sums all BLDG_DB rows strictly after fromKey up to and including toKey
function computeUpgradeFull(building, fromLevel, fromSub, toLevel, toSub) {
  // Legacy 3-arg call: computeUpgradeFull(building, from, to)
  if (toSub === undefined && toLevel === undefined) {
    toLevel = fromSub; toSub = 0; fromSub = 0;
  }
  if (toLevel === undefined) { toLevel = fromSub; toSub = 0; fromSub = 0; }
  const db = BLDG_DB[building] || BLDG_DB["Infantry"];
  const fromIdx = keyIndex(fromLevel, fromSub);
  const toIdx   = keyIndex(toLevel,   toSub);
  if (fromIdx < 0 || toIdx < 0 || fromIdx >= toIdx)
    return {fc:0,rfc:0,meat:0,wood:0,coal:0,iron:0,mins:0,subLevels:0};
  let fc=0,rfc=0,meat=0,wood=0,coal=0,iron=0,mins=0,subLevels=0;
  for (let i = fromIdx + 1; i <= toIdx; i++) {
    const k = ALL_LEVEL_KEYS[i];
    const row = db[k];
    if (!row) continue;
    fc   += row.fc   || 0;
    rfc  += row.rfc  || 0;
    meat += row.meat || 0;
    wood += row.wood || 0;
    coal += row.coal || 0;
    iron += row.iron || 0;
    mins += row.mins || 0;
    subLevels++;
  }
  return {fc,rfc,meat,wood,coal,iron,mins,subLevels};
}


// ─── Complete material cost database from Misc. Data Tables ──────────────────
// Each entry is costs for ONE sub-level upgrade. FC1 has 5 sub-levels (FC1, FC1.1-FC1.4)
// Columns: rfc, meat(M), wood(M), coal(M), iron(M)  — materials in actual numbers
const MAT_COSTS = {
  Furnace:{
    FC1: [{rfc:132,meat:0,wood:67e6,coal:67e6,iron:13e6},{rfc:158,meat:0,wood:72e6,coal:72e6,iron:14e6},{rfc:158,meat:0,wood:72e6,coal:72e6,iron:14e6},{rfc:158,meat:0,wood:72e6,coal:72e6,iron:14e6},{rfc:158,meat:0,wood:72e6,coal:72e6,iron:14e6}],
    FC2: [{rfc:158,meat:0,wood:72e6,coal:72e6,iron:14e6},{rfc:238,meat:0,wood:79e6,coal:79e6,iron:15e6},{rfc:238,meat:0,wood:79e6,coal:79e6,iron:15e6},{rfc:238,meat:0,wood:79e6,coal:79e6,iron:15e6},{rfc:238,meat:0,wood:79e6,coal:79e6,iron:15e6}],
    FC3: [{rfc:238,meat:0,wood:79e6,coal:79e6,iron:15e6},{rfc:280,meat:0,wood:82e6,coal:82e6,iron:16e6},{rfc:280,meat:0,wood:82e6,coal:82e6,iron:16e6},{rfc:280,meat:0,wood:82e6,coal:82e6,iron:16e6},{rfc:280,meat:0,wood:82e6,coal:82e6,iron:16e6}],
    FC4: [{rfc:280,meat:0,wood:82e6,coal:82e6,iron:16e6},{rfc:335,meat:0,wood:84e6,coal:84e6,iron:16e6},{rfc:335,meat:0,wood:84e6,coal:84e6,iron:16e6},{rfc:335,meat:0,wood:84e6,coal:84e6,iron:16e6},{rfc:335,meat:0,wood:84e6,coal:84e6,iron:16e6}],
    FC5: [{rfc:335,meat:0,wood:84e6,coal:84e6,iron:16e6},{rfc:200,meat:10,wood:96e6,coal:96e6,iron:19e6},{rfc:200,meat:10,wood:96e6,coal:96e6,iron:19e6},{rfc:200,meat:10,wood:96e6,coal:96e6,iron:19e6},{rfc:200,meat:10,wood:96e6,coal:96e6,iron:19e6}],
    FC6: [{rfc:100,meat:20,wood:96e6,coal:96e6,iron:19e6},{rfc:240,meat:15,wood:100e6,coal:100e6,iron:21e6},{rfc:240,meat:15,wood:100e6,coal:100e6,iron:21e6},{rfc:240,meat:15,wood:100e6,coal:100e6,iron:21e6},{rfc:240,meat:15,wood:100e6,coal:100e6,iron:21e6}],
    FC7: [{rfc:120,meat:30,wood:100e6,coal:100e6,iron:21e6},{rfc:240,meat:20,wood:130e6,coal:130e6,iron:26e6},{rfc:240,meat:20,wood:130e6,coal:130e6,iron:26e6},{rfc:240,meat:20,wood:130e6,coal:130e6,iron:26e6},{rfc:240,meat:20,wood:130e6,coal:130e6,iron:26e6}],
    FC8: [{rfc:120,meat:40,wood:130e6,coal:130e6,iron:26e6},{rfc:280,meat:30,wood:140e6,coal:140e6,iron:29e6},{rfc:280,meat:30,wood:140e6,coal:140e6,iron:29e6},{rfc:280,meat:30,wood:140e6,coal:140e6,iron:29e6},{rfc:280,meat:30,wood:140e6,coal:140e6,iron:29e6}],
    FC9: [{rfc:140,meat:60,wood:140e6,coal:140e6,iron:29e6},{rfc:350,meat:70,wood:160e6,coal:160e6,iron:33e6},{rfc:350,meat:70,wood:160e6,coal:160e6,iron:33e6},{rfc:350,meat:70,wood:160e6,coal:160e6,iron:33e6},{rfc:350,meat:70,wood:160e6,coal:160e6,iron:33e6}],
    FC10:[{rfc:175,meat:140,wood:160e6,coal:160e6,iron:33e6},{rfc:175,meat:140,wood:160e6,coal:160e6,iron:33e6},{rfc:175,meat:140,wood:160e6,coal:160e6,iron:33e6},{rfc:175,meat:140,wood:160e6,coal:160e6,iron:33e6},{rfc:175,meat:140,wood:160e6,coal:160e6,iron:33e6}],
  },
  Embassy:{
    FC1: [{rfc:33,meat:0,wood:13e6,coal:13e6,iron:2.7e6},{rfc:39,meat:0,wood:14e6,coal:14e6,iron:2.9e6},{rfc:39,meat:0,wood:14e6,coal:14e6,iron:2.9e6},{rfc:39,meat:0,wood:14e6,coal:14e6,iron:2.9e6},{rfc:39,meat:0,wood:14e6,coal:14e6,iron:2.9e6}],
    FC2: [{rfc:39,meat:0,wood:14e6,coal:14e6,iron:2.9e6},{rfc:59,meat:0,wood:15e6,coal:15e6,iron:3.1e6},{rfc:59,meat:0,wood:15e6,coal:15e6,iron:3.1e6},{rfc:59,meat:0,wood:15e6,coal:15e6,iron:3.1e6},{rfc:59,meat:0,wood:15e6,coal:15e6,iron:3.1e6}],
    FC3: [{rfc:59,meat:0,wood:15e6,coal:15e6,iron:3.1e6},{rfc:70,meat:0,wood:16e6,coal:16e6,iron:3.2e6},{rfc:70,meat:0,wood:16e6,coal:16e6,iron:3.2e6},{rfc:70,meat:0,wood:16e6,coal:16e6,iron:3.2e6},{rfc:70,meat:0,wood:16e6,coal:16e6,iron:3.2e6}],
    FC4: [{rfc:70,meat:0,wood:16e6,coal:16e6,iron:3.2e6},{rfc:83,meat:0,wood:16e6,coal:16e6,iron:3.3e6},{rfc:83,meat:0,wood:16e6,coal:16e6,iron:3.3e6},{rfc:83,meat:0,wood:16e6,coal:16e6,iron:3.3e6},{rfc:83,meat:0,wood:16e6,coal:16e6,iron:3.3e6}],
    FC5: [{rfc:83,meat:0,wood:16e6,coal:16e6,iron:3.3e6},{rfc:50,meat:2,wood:19e6,coal:19e6,iron:3.8e6},{rfc:50,meat:2,wood:19e6,coal:19e6,iron:3.8e6},{rfc:50,meat:2,wood:19e6,coal:19e6,iron:3.8e6},{rfc:50,meat:2,wood:19e6,coal:19e6,iron:3.8e6}],
    FC6: [{rfc:25,meat:5,wood:19e6,coal:19e6,iron:3.8e6},{rfc:60,meat:3,wood:21e6,coal:21e6,iron:4.3e6},{rfc:60,meat:3,wood:21e6,coal:21e6,iron:4.3e6},{rfc:60,meat:3,wood:21e6,coal:21e6,iron:4.3e6},{rfc:60,meat:3,wood:21e6,coal:21e6,iron:4.3e6}],
    FC7: [{rfc:30,meat:7,wood:21e6,coal:21e6,iron:4.3e6},{rfc:60,meat:5,wood:26e6,coal:26e6,iron:5.3e6},{rfc:60,meat:5,wood:26e6,coal:26e6,iron:5.3e6},{rfc:60,meat:5,wood:26e6,coal:26e6,iron:5.3e6},{rfc:60,meat:5,wood:26e6,coal:26e6,iron:5.3e6}],
    FC8: [{rfc:30,meat:10,wood:26e6,coal:26e6,iron:5.3e6},{rfc:70,meat:7,wood:29e6,coal:29e6,iron:5.8e6},{rfc:70,meat:7,wood:29e6,coal:29e6,iron:5.8e6},{rfc:70,meat:7,wood:29e6,coal:29e6,iron:5.8e6},{rfc:70,meat:7,wood:29e6,coal:29e6,iron:5.8e6}],
    FC9: [{rfc:35,meat:15,wood:29e6,coal:29e6,iron:5.8e6},{rfc:87,meat:17,wood:33e6,coal:33e6,iron:6.7e6},{rfc:87,meat:17,wood:33e6,coal:33e6,iron:6.7e6},{rfc:87,meat:17,wood:33e6,coal:33e6,iron:6.7e6},{rfc:87,meat:17,wood:33e6,coal:33e6,iron:6.7e6}],
    FC10:[{rfc:43,meat:35,wood:33e6,coal:33e6,iron:6.7e6},{rfc:43,meat:35,wood:33e6,coal:33e6,iron:6.7e6},{rfc:43,meat:35,wood:33e6,coal:33e6,iron:6.7e6},{rfc:43,meat:35,wood:33e6,coal:33e6,iron:6.7e6},{rfc:43,meat:35,wood:33e6,coal:33e6,iron:6.7e6}],
  },
  Infantry:{
    FC1: [{rfc:59,meat:0,wood:23e6,coal:23e6,iron:4.7e6},{rfc:71,meat:0,wood:25e6,coal:25e6,iron:5e6},{rfc:71,meat:0,wood:25e6,coal:25e6,iron:5e6},{rfc:71,meat:0,wood:25e6,coal:25e6,iron:5e6},{rfc:71,meat:0,wood:25e6,coal:25e6,iron:5e6}],
    FC2: [{rfc:71,meat:0,wood:25e6,coal:25e6,iron:5e6},{rfc:107,meat:0,wood:27e6,coal:27e6,iron:5.5e6},{rfc:107,meat:0,wood:27e6,coal:27e6,iron:5.5e6},{rfc:107,meat:0,wood:27e6,coal:27e6,iron:5.5e6},{rfc:107,meat:0,wood:27e6,coal:27e6,iron:5.5e6}],
    FC3: [{rfc:107,meat:0,wood:27e6,coal:27e6,iron:5.5e6},{rfc:126,meat:0,wood:28e6,coal:28e6,iron:5.7e6},{rfc:126,meat:0,wood:28e6,coal:28e6,iron:5.7e6},{rfc:126,meat:0,wood:28e6,coal:28e6,iron:5.7e6},{rfc:126,meat:0,wood:28e6,coal:28e6,iron:5.7e6}],
    FC4: [{rfc:126,meat:0,wood:28e6,coal:28e6,iron:5.7e6},{rfc:150,meat:0,wood:29e6,coal:29e6,iron:5.9e6},{rfc:150,meat:0,wood:29e6,coal:29e6,iron:5.9e6},{rfc:150,meat:0,wood:29e6,coal:29e6,iron:5.9e6},{rfc:150,meat:0,wood:29e6,coal:29e6,iron:5.9e6}],
    FC5: [{rfc:150,meat:0,wood:29e6,coal:29e6,iron:5.9e6},{rfc:90,meat:4,wood:33e6,coal:33e6,iron:6.7e6},{rfc:90,meat:4,wood:33e6,coal:33e6,iron:6.7e6},{rfc:90,meat:4,wood:33e6,coal:33e6,iron:6.7e6},{rfc:90,meat:4,wood:33e6,coal:33e6,iron:6.7e6}],
    FC6: [{rfc:45,meat:9,wood:33e6,coal:33e6,iron:6.7e6},{rfc:108,meat:6,wood:38e6,coal:38e6,iron:7.6e6},{rfc:108,meat:6,wood:38e6,coal:38e6,iron:7.6e6},{rfc:108,meat:6,wood:38e6,coal:38e6,iron:7.6e6},{rfc:108,meat:6,wood:38e6,coal:38e6,iron:7.6e6}],
    FC7: [{rfc:54,meat:13,wood:38e6,coal:38e6,iron:7.6e6},{rfc:108,meat:9,wood:46e6,coal:46e6,iron:9.3e6},{rfc:108,meat:9,wood:46e6,coal:46e6,iron:9.3e6},{rfc:108,meat:9,wood:46e6,coal:46e6,iron:9.3e6},{rfc:108,meat:9,wood:46e6,coal:46e6,iron:9.3e6}],
    FC8: [{rfc:54,meat:19,wood:46e6,coal:46e6,iron:9.3e6},{rfc:126,meat:13,wood:50e6,coal:50e6,iron:10e6},{rfc:126,meat:13,wood:50e6,coal:50e6,iron:10e6},{rfc:126,meat:13,wood:50e6,coal:50e6,iron:10e6},{rfc:126,meat:13,wood:50e6,coal:50e6,iron:10e6}],
    FC9: [{rfc:63,meat:27,wood:50e6,coal:50e6,iron:10e6},{rfc:157,meat:31,wood:59e6,coal:59e6,iron:11e6},{rfc:157,meat:31,wood:59e6,coal:59e6,iron:11e6},{rfc:157,meat:31,wood:59e6,coal:59e6,iron:11e6},{rfc:157,meat:31,wood:59e6,coal:59e6,iron:11e6}],
    FC10:[{rfc:78,meat:63,wood:59e6,coal:59e6,iron:11e6},{rfc:78,meat:63,wood:59e6,coal:59e6,iron:11e6},{rfc:78,meat:63,wood:59e6,coal:59e6,iron:11e6},{rfc:78,meat:63,wood:59e6,coal:59e6,iron:11e6},{rfc:78,meat:63,wood:59e6,coal:59e6,iron:11e6}],
  },
  // Marksman and Lancer identical to Infantry
  Marksman:{},
  Lancer:{},
  Command:{
    FC1: [{rfc:26,meat:0,wood:20e6,coal:20e6,iron:4e6},{rfc:31,meat:0,wood:21e6,coal:21e6,iron:4.3e6},{rfc:31,meat:0,wood:21e6,coal:21e6,iron:4.3e6},{rfc:31,meat:0,wood:21e6,coal:21e6,iron:4.3e6},{rfc:31,meat:0,wood:21e6,coal:21e6,iron:4.3e6}],
    FC2: [{rfc:31,meat:0,wood:21e6,coal:21e6,iron:4.3e6},{rfc:47,meat:0,wood:23e6,coal:23e6,iron:4.7e6},{rfc:47,meat:0,wood:23e6,coal:23e6,iron:4.7e6},{rfc:47,meat:0,wood:23e6,coal:23e6,iron:4.7e6},{rfc:47,meat:0,wood:23e6,coal:23e6,iron:4.7e6}],
    FC3: [{rfc:47,meat:0,wood:23e6,coal:23e6,iron:4.7e6},{rfc:56,meat:0,wood:24e6,coal:24e6,iron:4.9e6},{rfc:56,meat:0,wood:24e6,coal:24e6,iron:4.9e6},{rfc:56,meat:0,wood:24e6,coal:24e6,iron:4.9e6},{rfc:56,meat:0,wood:24e6,coal:24e6,iron:4.9e6}],
    FC4: [{rfc:56,meat:0,wood:24e6,coal:24e6,iron:4.9e6},{rfc:67,meat:0,wood:25e6,coal:25e6,iron:5e6},{rfc:67,meat:0,wood:25e6,coal:25e6,iron:5e6},{rfc:67,meat:0,wood:25e6,coal:25e6,iron:5e6},{rfc:67,meat:0,wood:25e6,coal:25e6,iron:5e6}],
    FC5: [{rfc:67,meat:0,wood:25e6,coal:25e6,iron:5e6},{rfc:40,meat:2,wood:29e6,coal:29e6,iron:5.8e6},{rfc:40,meat:2,wood:29e6,coal:29e6,iron:5.8e6},{rfc:40,meat:2,wood:29e6,coal:29e6,iron:5.8e6},{rfc:40,meat:2,wood:29e6,coal:29e6,iron:5.8e6}],
    FC6: [{rfc:20,meat:4,wood:29e6,coal:29e6,iron:5.8e6},{rfc:48,meat:3,wood:32e6,coal:32e6,iron:6.5e6},{rfc:48,meat:3,wood:32e6,coal:32e6,iron:6.5e6},{rfc:48,meat:3,wood:32e6,coal:32e6,iron:6.5e6},{rfc:48,meat:3,wood:32e6,coal:32e6,iron:6.5e6}],
    FC7: [{rfc:24,meat:6,wood:32e6,coal:32e6,iron:6.5e6},{rfc:48,meat:4,wood:39e6,coal:39e6,iron:7.9e6},{rfc:48,meat:4,wood:39e6,coal:39e6,iron:7.9e6},{rfc:48,meat:4,wood:39e6,coal:39e6,iron:7.9e6},{rfc:48,meat:4,wood:39e6,coal:39e6,iron:7.9e6}],
    FC8: [{rfc:24,meat:8,wood:39e6,coal:39e6,iron:7.9e6},{rfc:56,meat:6,wood:43e6,coal:43e6,iron:8.7e6},{rfc:56,meat:6,wood:43e6,coal:43e6,iron:8.7e6},{rfc:56,meat:6,wood:43e6,coal:43e6,iron:8.7e6},{rfc:56,meat:6,wood:43e6,coal:43e6,iron:8.7e6}],
    FC9: [{rfc:28,meat:12,wood:43e6,coal:43e6,iron:8.7e6},{rfc:70,meat:14,wood:50e6,coal:50e6,iron:10e6},{rfc:70,meat:14,wood:50e6,coal:50e6,iron:10e6},{rfc:70,meat:14,wood:50e6,coal:50e6,iron:10e6},{rfc:70,meat:14,wood:50e6,coal:50e6,iron:10e6}],
    FC10:[{rfc:35,meat:28,wood:50e6,coal:50e6,iron:10e6},{rfc:35,meat:28,wood:50e6,coal:50e6,iron:10e6},{rfc:35,meat:28,wood:50e6,coal:50e6,iron:10e6},{rfc:35,meat:28,wood:50e6,coal:50e6,iron:10e6},{rfc:35,meat:28,wood:50e6,coal:50e6,iron:10e6}],
  },
  Infirmary:{
    FC1: [{rfc:26,meat:0,wood:16e6,coal:16e6,iron:3.3e6},{rfc:31,meat:0,wood:18e6,coal:18e6,iron:3.6e6},{rfc:31,meat:0,wood:18e6,coal:18e6,iron:3.6e6},{rfc:31,meat:0,wood:18e6,coal:18e6,iron:3.6e6},{rfc:31,meat:0,wood:18e6,coal:18e6,iron:3.6e6}],
    FC2: [{rfc:31,meat:0,wood:18e6,coal:18e6,iron:3.6e6},{rfc:47,meat:0,wood:19e6,coal:19e6,iron:3.9e6},{rfc:47,meat:0,wood:19e6,coal:19e6,iron:3.9e6},{rfc:47,meat:0,wood:19e6,coal:19e6,iron:3.9e6},{rfc:47,meat:0,wood:19e6,coal:19e6,iron:3.9e6}],
    FC3: [{rfc:47,meat:0,wood:19e6,coal:19e6,iron:3.9e6},{rfc:56,meat:0,wood:20e6,coal:20e6,iron:4.1e6},{rfc:56,meat:0,wood:20e6,coal:20e6,iron:4.1e6},{rfc:56,meat:0,wood:20e6,coal:20e6,iron:4.1e6},{rfc:56,meat:0,wood:20e6,coal:20e6,iron:4.1e6}],
    FC4: [{rfc:56,meat:0,wood:20e6,coal:20e6,iron:4.1e6},{rfc:67,meat:0,wood:21e6,coal:21e6,iron:4.2e6},{rfc:67,meat:0,wood:21e6,coal:21e6,iron:4.2e6},{rfc:67,meat:0,wood:21e6,coal:21e6,iron:4.2e6},{rfc:67,meat:0,wood:21e6,coal:21e6,iron:4.2e6}],
    FC5: [{rfc:67,meat:0,wood:21e6,coal:21e6,iron:4.2e6},{rfc:40,meat:2,wood:24e6,coal:24e6,iron:4.8e6},{rfc:40,meat:2,wood:24e6,coal:24e6,iron:4.8e6},{rfc:40,meat:2,wood:24e6,coal:24e6,iron:4.8e6},{rfc:40,meat:2,wood:24e6,coal:24e6,iron:4.8e6}],
    FC6: [{rfc:20,meat:4,wood:24e6,coal:24e6,iron:4.8e6},{rfc:48,meat:3,wood:27e6,coal:27e6,iron:5.4e6},{rfc:48,meat:3,wood:27e6,coal:27e6,iron:5.4e6},{rfc:48,meat:3,wood:27e6,coal:27e6,iron:5.4e6},{rfc:48,meat:3,wood:27e6,coal:27e6,iron:5.4e6}],
    FC7: [{rfc:24,meat:6,wood:27e6,coal:27e6,iron:5.4e6},{rfc:48,meat:4,wood:33e6,coal:33e6,iron:6.6e6},{rfc:48,meat:4,wood:33e6,coal:33e6,iron:6.6e6},{rfc:48,meat:4,wood:33e6,coal:33e6,iron:6.6e6},{rfc:48,meat:4,wood:33e6,coal:33e6,iron:6.6e6}],
    FC8: [{rfc:24,meat:8,wood:33e6,coal:33e6,iron:6.6e6},{rfc:56,meat:6,wood:36e6,coal:36e6,iron:7.2e6},{rfc:56,meat:6,wood:36e6,coal:36e6,iron:7.2e6},{rfc:56,meat:6,wood:36e6,coal:36e6,iron:7.2e6},{rfc:56,meat:6,wood:36e6,coal:36e6,iron:7.2e6}],
    FC9: [{rfc:28,meat:12,wood:36e6,coal:36e6,iron:7.2e6},{rfc:70,meat:14,wood:42e6,coal:42e6,iron:8.4e6},{rfc:70,meat:14,wood:42e6,coal:42e6,iron:8.4e6},{rfc:70,meat:14,wood:42e6,coal:42e6,iron:8.4e6},{rfc:70,meat:14,wood:42e6,coal:42e6,iron:8.4e6}],
    FC10:[{rfc:35,meat:28,wood:42e6,coal:42e6,iron:8.4e6},{rfc:35,meat:28,wood:42e6,coal:42e6,iron:8.4e6},{rfc:35,meat:28,wood:42e6,coal:42e6,iron:8.4e6},{rfc:35,meat:28,wood:42e6,coal:42e6,iron:8.4e6},{rfc:35,meat:28,wood:42e6,coal:42e6,iron:8.4e6}],
  },
  "War Academy":{
    FC1: [{rfc:0,meat:0,wood:0,coal:0,iron:0},{rfc:71,meat:0,wood:36e6,coal:36e6,iron:7.2e6},{rfc:71,meat:0,wood:36e6,coal:36e6,iron:7.2e6},{rfc:71,meat:0,wood:36e6,coal:36e6,iron:7.2e6},{rfc:71,meat:0,wood:36e6,coal:36e6,iron:7.2e6}],
    FC2: [{rfc:71,meat:0,wood:36e6,coal:36e6,iron:7.2e6},{rfc:107,meat:0,wood:39e6,coal:39e6,iron:7.9e6},{rfc:107,meat:0,wood:39e6,coal:39e6,iron:7.9e6},{rfc:107,meat:0,wood:39e6,coal:39e6,iron:7.9e6},{rfc:107,meat:0,wood:39e6,coal:39e6,iron:7.9e6}],
    FC3: [{rfc:107,meat:0,wood:39e6,coal:39e6,iron:7.9e6},{rfc:126,meat:0,wood:41e6,coal:41e6,iron:8.2e6},{rfc:126,meat:0,wood:41e6,coal:41e6,iron:8.2e6},{rfc:126,meat:0,wood:41e6,coal:41e6,iron:8.2e6},{rfc:126,meat:0,wood:41e6,coal:41e6,iron:8.2e6}],
    FC4: [{rfc:126,meat:0,wood:41e6,coal:41e6,iron:8.2e6},{rfc:150,meat:0,wood:42e6,coal:42e6,iron:8.2e6},{rfc:150,meat:0,wood:42e6,coal:42e6,iron:8.2e6},{rfc:150,meat:0,wood:42e6,coal:42e6,iron:8.2e6},{rfc:150,meat:0,wood:42e6,coal:42e6,iron:8.2e6}],
    FC5: [{rfc:150,meat:0,wood:42e6,coal:42e6,iron:8.2e6},{rfc:90,meat:4,wood:48e6,coal:48e6,iron:9.6e6},{rfc:90,meat:4,wood:48e6,coal:48e6,iron:9.6e6},{rfc:90,meat:4,wood:48e6,coal:48e6,iron:9.6e6},{rfc:90,meat:4,wood:48e6,coal:48e6,iron:9.6e6}],
    FC6: [{rfc:45,meat:9,wood:48e6,coal:48e6,iron:9.6e6},{rfc:108,meat:6,wood:54e6,coal:54e6,iron:10e6},{rfc:108,meat:6,wood:54e6,coal:54e6,iron:10e6},{rfc:108,meat:6,wood:54e6,coal:54e6,iron:10e6},{rfc:108,meat:6,wood:54e6,coal:54e6,iron:10e6}],
    FC7: [{rfc:54,meat:13,wood:54e6,coal:54e6,iron:10e6},{rfc:108,meat:9,wood:66e6,coal:66e6,iron:13e6},{rfc:108,meat:9,wood:66e6,coal:66e6,iron:13e6},{rfc:108,meat:9,wood:66e6,coal:66e6,iron:13e6},{rfc:108,meat:9,wood:66e6,coal:66e6,iron:13e6}],
    FC8: [{rfc:108,meat:9,wood:66e6,coal:66e6,iron:13e6},{rfc:126,meat:13,wood:72e6,coal:72e6,iron:14e6},{rfc:126,meat:13,wood:72e6,coal:72e6,iron:14e6},{rfc:126,meat:13,wood:72e6,coal:72e6,iron:14e6},{rfc:126,meat:13,wood:72e6,coal:72e6,iron:14e6}],
    FC9: [{rfc:63,meat:27,wood:72e6,coal:72e6,iron:14e6},{rfc:157,meat:31,wood:84e6,coal:84e6,iron:16e6},{rfc:157,meat:31,wood:84e6,coal:84e6,iron:16e6},{rfc:157,meat:31,wood:84e6,coal:84e6,iron:16e6},{rfc:157,meat:31,wood:84e6,coal:84e6,iron:16e6}],
    FC10:[{rfc:78,meat:63,wood:84e6,coal:84e6,iron:16e6},{rfc:78,meat:63,wood:84e6,coal:84e6,iron:16e6},{rfc:78,meat:63,wood:84e6,coal:84e6,iron:16e6},{rfc:78,meat:63,wood:84e6,coal:84e6,iron:16e6},{rfc:78,meat:63,wood:84e6,coal:84e6,iron:16e6}],
  },
};
// Marksman and Lancer same as Infantry
MAT_COSTS.Marksman = MAT_COSTS.Infantry;
MAT_COSTS.Lancer   = MAT_COSTS.Infantry;

// Compute material totals from current to goal level
function computeMaterials(building, fromLevel, toLevel) {
  const costs = MAT_COSTS[building];
  const fcCosts = BUILDING_COSTS[building];
  if (!costs || !fcCosts) return {fc:0,rfc:0,meat:0,wood:0,coal:0,iron:0,subLevels:0};
  const fromIdx = FC_LEVELS.indexOf(fromLevel);
  const toIdx   = FC_LEVELS.indexOf(toLevel);
  if (fromIdx < 0 || toIdx < 0 || fromIdx >= toIdx) return {fc:0,rfc:0,meat:0,wood:0,coal:0,iron:0,subLevels:0};
  let fc=0,rfc=0,meat=0,wood=0,coal=0,iron=0,subLevels=0;
  for (let i = fromIdx; i < toIdx; i++) {
    const levelKey = FC_LEVELS[i+1];
    const fcSubs  = fcCosts[levelKey] || [];
    const matSubs = costs[levelKey]   || [];
    fcSubs.forEach((fcCost, si) => {
      fc   += fcCost;
      const mat = matSubs[si] || matSubs[matSubs.length-1] || {};
      rfc  += mat.rfc  || 0;
      meat += mat.meat || 0;
      wood += mat.wood || 0;
      coal += mat.coal || 0;
      iron += mat.iron || 0;
      subLevels++;
    });
  }
  return {fc,rfc,meat,wood,coal,iron,subLevels};
}


// ─── Complete FC cost database (FC per sub-level, from Misc. Data Tables) ────
// Each major FC level has 5 sub-levels (.0, .1, .2, .3, .4)
// Costs are FC required for EACH sub-level upgrade
const BUILDING_COSTS = {
  Furnace: {
    FC1:[132,158,158,158,158], FC2:[158,238,238,238,238], FC3:[238,280,280,280,280],
    FC4:[280,335,335,335,335], FC5:[335,200,200,200,200], FC6:[200,240,240,240,240],
    FC7:[240,240,240,240,240], FC8:[240,280,280,280,280], FC9:[280,350,350,350,350],
    FC10:[350,175,175,175,175],
    RFC_MULT: 0.212, // RFC ≈ 21.2% of FC cost at high levels
  },
  Embassy: {
    FC1:[33,33,33,33,33],   FC2:[33,39,39,39,39],   FC3:[39,59,59,59,59],
    FC4:[59,70,70,70,70],   FC5:[70,83,83,83,83],   FC6:[83,50,50,50,50],
    FC7:[50,60,60,60,60],   FC8:[60,60,60,60,60],   FC9:[60,70,70,70,70],
    FC10:[70,87,87,87,87],
    RFC_MULT: 0.207,
  },
  Infantry: {
    FC1:[53,63,63,63,63],   FC2:[63,95,95,95,95],   FC3:[95,112,112,112,112],
    FC4:[112,134,134,134,134], FC5:[134,80,80,80,80],  FC6:[80,96,96,96,96],
    FC7:[96,96,96,96,96],   FC8:[96,112,112,112,112], FC9:[112,140,140,140,140],
    FC10:[140,175,175,175,175],
    RFC_MULT: 0.209,
  },
  Marksman: {
    FC1:[53,63,63,63,63],   FC2:[63,95,95,95,95],   FC3:[95,112,112,112,112],
    FC4:[112,134,134,134,134], FC5:[134,80,80,80,80],  FC6:[80,96,96,96,96],
    FC7:[96,96,96,96,96],   FC8:[96,112,112,112,112], FC9:[112,140,140,140,140],
    FC10:[140,175,175,175,175],
    RFC_MULT: 0.209,
  },
  Lancer: {
    FC1:[53,63,63,63,63],   FC2:[63,95,95,95,95],   FC3:[95,112,112,112,112],
    FC4:[112,134,134,134,134], FC5:[134,80,80,80,80],  FC6:[80,96,96,96,96],
    FC7:[96,96,96,96,96],   FC8:[96,112,112,112,112], FC9:[112,140,140,140,140],
    FC10:[140,175,175,175,175],
    RFC_MULT: 0.209,
  },
  Command: {
    FC1:[26,26,26,26,26],   FC2:[26,31,31,31,31],   FC3:[31,47,47,47,47],
    FC4:[47,56,56,56,56],   FC5:[56,67,67,67,67],   FC6:[67,40,40,40,40],
    FC7:[40,48,48,48,48],   FC8:[48,48,48,48,48],   FC9:[48,56,56,56,56],
    FC10:[56,70,70,70,70],
    RFC_MULT: 0.105,
  },
  Infirmary: {
    FC1:[26,26,26,26,26],   FC2:[26,31,31,31,31],   FC3:[31,47,47,47,47],
    FC4:[47,56,56,56,56],   FC5:[56,67,67,67,67],   FC6:[67,40,40,40,40],
    FC7:[40,48,48,48,48],   FC8:[48,48,48,48,48],   FC9:[48,56,56,56,56],
    FC10:[56,70,70,70,70],
    RFC_MULT: 0.0,
  },
  "War Academy": {
    FC1:[26,26,26,26,26],   FC2:[26,31,31,31,31],   FC3:[31,47,47,47,47],
    FC4:[47,56,56,56,56],   FC5:[56,67,67,67,67],   FC6:[67,40,40,40,40],
    FC7:[40,48,48,48,48],   FC8:[48,48,48,48,48],   FC9:[48,56,56,56,56],
    FC10:[56,70,70,70,70],
    RFC_MULT: 0.0,
  },
};

// FC levels in order
const FC_LEVELS = ["FC1","FC2","FC3","FC4","FC5","FC6","FC7","FC8","FC9","FC10"];
const FC_LEVEL_OPTS = ["FC1","FC2","FC3","FC4","FC5","FC6","FC7","FC8","FC9","FC10"];

// RFC refinement tier table (from your spreadsheet Misc. Data Tables)
// refCount -> { tier, fcCost, fcRoll, rfcPerRoll }
const RFC_TIERS = [
  {min:1,  max:19,  tier:"T1", fcPer:20,  rfcPer:1},
  {min:20, max:39,  tier:"T2", fcPer:50,  rfcPer:2},
  {min:40, max:59,  tier:"T3", fcPer:100, rfcPer:3},
  {min:60, max:79,  tier:"T4", fcPer:130, rfcPer:3},
  {min:80, max:100, tier:"T5", fcPer:160, rfcPer:3},
];

function getRFCTier(refineCount) {
  const rc = Math.max(1, Math.min(100, refineCount || 1));
  return RFC_TIERS.find(t => rc >= t.min && rc <= t.max) || RFC_TIERS[RFC_TIERS.length - 1];
}

// SVS weekly refine schedule (day-of-week -> weekly refine count range)
const SVS_WEEK = [
  { day:"Mon", weekday:1, tier:"T1" },
  { day:"Tue", weekday:2, tier:"T2" },
  { day:"Wed", weekday:3, tier:"T2" },
  { day:"Thu", weekday:4, tier:"T2" },
  { day:"Fri", weekday:5, tier:"T2" },
];

// Compute total FC and RFC needed to go from currentLevel to goalLevel
function computeUpgradeCost(building, fromLevel, toLevel) {
  const costs = BUILDING_COSTS[building];
  if (!costs) return { fc: 0, rfc: 0, subLevels: 0 };
  
  const fromIdx = FC_LEVELS.indexOf(fromLevel);
  const toIdx   = FC_LEVELS.indexOf(toLevel);
  if (fromIdx < 0 || toIdx < 0 || fromIdx >= toIdx) return { fc: 0, rfc: 0, subLevels: 0 };
  
  let totalFC = 0, totalRFC = 0, subLevels = 0;
  for (let i = fromIdx; i < toIdx; i++) {
    const levelKey = FC_LEVELS[i + 1]; // upgrading TO this level
    const subs = costs[levelKey] || [];
    subs.forEach(fc => {
      totalFC  += fc;
      totalRFC += Math.ceil(fc * costs.RFC_MULT);
      subLevels++;
    });
  }
  return { fc: totalFC, rfc: totalRFC, subLevels };
}

// Compute how many FC you'll accumulate via daily refining over N days
function computeRFCAccumulation(startRFC, currentRefineCount, daysUntilSVS, dailyFC, dailyRFCFromIntel) {
  // Each day you do refines based on daily FC income
  // For simplicity: daily income refines at current tier rate
  let rfcAccum = 0;
  let refCount = currentRefineCount;
  for (let d = 0; d < daysUntilSVS; d++) {
    const tier = getRFCTier(refCount);
    const refinesPerDay = Math.floor(dailyFC / tier.fcPer);
    rfcAccum += refinesPerDay * tier.rfcPer;
    rfcAccum += dailyRFCFromIntel;
    refCount = Math.min(refCount + refinesPerDay, 100);
  }
  return rfcAccum;
}

// SVS point value for construction FC burns
// From your spreadsheet: Mon = 4.76M from FC burns
const SvS_FC_POINTS_PER_FC = 1784160 / 390; // ~4574 pts per FC burned on SVS Monday T1
const SVS_RFC_POINTS_PER_RFC = 2442600 / 29; // ~84,228 pts per RFC on SVS Monday

const C = new Proxy({}, { get(_, key) { return `var(--c-${key})`; } });

const fmt = n => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n/1e9).toFixed(2)+"B";
  if (abs >= 1e6) return (n/1e6).toFixed(2)+"M";
  if (abs >= 1000) return (n/1000).toFixed(1)+"K";
  return Math.round(n).toLocaleString();
};

const fmtFull = n => typeof n === "number" ? Math.round(n).toLocaleString() : "—";

// Number input that displays commas but parses raw number on change
function NumInput({ value, onChange, className, style, min = 0 }) {
  const [editing, setEditing] = React.useState(false);
  const [raw,     setRaw]     = React.useState("");
  const handleFocus = () => { setEditing(true); setRaw(value === 0 ? "" : String(value)); };
  const handleBlur  = () => { setEditing(false); const n = parseInt(raw.replace(/,/g,""),10); onChange(isNaN(n) ? 0 : Math.max(min, n)); };
  const handleChange = e => setRaw(e.target.value.replace(/[^0-9,]/g,""));
  const handleKey    = e => { if (e.key === "Enter") e.target.blur(); };
  return (
    <input
      className={className}
      style={style}
      type="text"
      inputMode="numeric"
      value={editing ? raw : (value === 0 ? "0" : value.toLocaleString())}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      onKeyDown={handleKey}
    />
  );
}

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
.cp-wrap{font-family:'Syne',sans-serif;color:${C.textPri};background:var(--c-bg);min-height:100vh;padding:0}
.cp-topbar{background:${C.surface};border-bottom:1px solid ${C.border};padding:20px 28px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.cp-title{font-size:20px;font-weight:800}
.cp-title span{color:${C.accent}}
.cp-subtitle{font-size:12px;color:${C.textSec};margin-top:3px}
.cp-body{padding:24px 28px;display:flex;flex-direction:column;gap:20px}
/* Summary bar */
.summary-bar{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.s-tile{background:${C.card};border:1px solid ${C.border};border-radius:10px;padding:12px 14px}
.s-tile:hover{border-color:${C.borderHi}}
.s-label{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${C.textSec};font-family:'Space Mono',monospace;margin-bottom:6px}
.s-val{font-size:22px;font-weight:800;font-family:'Space Mono',monospace;line-height:1}
.s-val.accent{color:${C.accent}}
.s-val.green{color:${C.green}}
.s-val.red{color:${C.red}}
.s-val.amber{color:${C.amber}}
.s-val.teal{color:var(--c-blue)}
.s-sub{font-size:10px;color:${C.textDim};margin-top:4px;font-family:'Space Mono',monospace}
/* Sections */
.sec-head{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.textSec};display:flex;align-items:center;gap:8px;margin-bottom:12px}
.sec-head::after{content:'';flex:1;height:1px;background:${C.border}}
/* Settings panel */
.settings-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
.inp-group{display:flex;flex-direction:column;gap:5px}
.inp-label{font-size:11px;font-weight:600;color:${C.textPri};letter-spacing:0.5px}
.inp-field{background:${C.surface};border:1px solid ${C.border};border-radius:7px;padding:8px 11px;font-family:'Space Mono',monospace;font-size:13px;color:${C.textPri};outline:none;width:100%;transition:border-color 0.15s}
.inp-field:focus{border-color:${C.accent}}
.inp-field option{background:${C.card};color:${C.textPri}}
/* Building table */
.bld-table{background:${C.card};border:1px solid ${C.border};border-radius:12px;overflow:hidden}
.bld-thead{display:grid;grid-template-columns:140px 100px 100px 80px 80px 80px minmax(140px,1fr) minmax(140px,1fr);gap:0;border-bottom:1px solid ${C.border};background:${C.surface}}
.bld-thead .th{padding:9px 12px;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${C.textSec};font-family:'Space Mono',monospace;white-space:nowrap}
.bld-row-wrap{border-bottom:1px solid ${C.border}}
.bld-row-wrap:last-child{border-bottom:none}
.bld-row{display:grid;grid-template-columns:140px 100px 100px 80px 80px 80px minmax(140px,1fr) minmax(140px,1fr);gap:0;align-items:center;transition:background 0.1s}
.bld-row:hover{background:var(--c-hover)}
.bld-cell{padding:11px 12px;font-size:13px;color:${C.textPri};vertical-align:middle}
.bld-cell.name{font-weight:700;color:${C.textPri};font-size:13px}
.bld-cell.mono{font-family:'Space Mono',monospace;font-size:12px}
.bld-cell select{background:${C.surface};border:1px solid ${C.border};border-radius:6px;padding:5px 8px;font-family:'Space Mono',monospace;font-size:12px;color:${C.textPri};outline:none;width:100%;cursor:pointer;transition:border-color 0.15s}
.bld-cell select:focus{border-color:${C.accent}}
.bld-cell select option{background:${C.card}}
.cost-fc{color:${C.accent};font-family:'Space Mono',monospace;font-size:12px}
.cost-rfc{color:${C.amber};font-family:'Space Mono',monospace;font-size:12px}
/* Status badge */
.badge{display:inline-flex;align-items:center;padding:3px 8px;border-radius:5px;font-size:10px;font-weight:700;font-family:'Space Mono',monospace;white-space:nowrap}
.badge-green{background:${C.greenBg};color:${C.green};border:1px solid ${C.greenDim}}
.badge-red{background:${C.redBg};color:${C.red};border:1px solid ${C.redDim}}
.badge-amber{background:${C.amberBg};color:${C.amber}}
.badge-blue{background:${C.blueBg};color:${C.blue};border:1px solid ${C.blueDim}}
.badge-accent{background:${C.accentBg};color:${C.accent};border:1px solid ${C.accentDim}}
.badge-teal{background:var(--c-blueBg);color:var(--c-blue)}
/* Progress bar */
.prog-wrap{background:${C.border};border-radius:3px;height:5px;overflow:hidden;flex:1;min-width:40px}
.prog-bar{height:100%;border-radius:3px;transition:width 0.4s ease}
/* SVS schedule */
.svs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.svs-day-card{background:${C.card};border:1px solid ${C.border};border-radius:10px;padding:12px 14px}
.svs-day-card.svs-active{border-color:${C.accentDim};background:${C.accentBg}}
.svs-day-name{font-size:11px;font-weight:700;color:${C.textPri};margin-bottom:6px}
.svs-pts-val{font-size:18px;font-weight:800;font-family:'Space Mono',monospace;color:${C.accent};line-height:1}
.svs-pts-sub{font-size:10px;color:${C.textDim};margin-top:3px;font-family:'Space Mono',monospace}
/* FC accumulation card */
.accum-card{background:${C.card};border:1px solid ${C.border};border-radius:12px;padding:18px 20px}
.accum-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid ${C.border};font-size:13px}
.accum-row:last-child{border-bottom:none}
.accum-label{color:${C.textPri}}
.accum-val{font-family:'Space Mono',monospace;font-size:12px;color:${C.textPri};font-weight:700}
.accum-val.pos{color:${C.green}}
.accum-val.neg{color:${C.red}}
.accum-val.accent{color:${C.accent}}
/* Timeline */
.timeline{display:flex;gap:2px;margin-top:8px}
.tl-seg{height:8px;border-radius:2px;transition:width 0.4s ease}
/* Time sub-row */
.time-row{background:rgba(56,139,253,0.04);border-top:1px solid ${C.border};padding:7px 12px;display:flex;gap:24px;flex-wrap:wrap;align-items:center}
.time-lbl{font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:${C.textSec};font-family:'Space Mono',monospace;min-width:160px}
.time-val{font-size:12px;font-weight:700;font-family:'Space Mono',monospace}
.time-orig{color:${C.textPri}}
.time-actual{color:${C.green}}
/* Tooltip-like note */
.note-box{background:${C.accentBg};border:1px solid ${C.accentDim};border-radius:8px;padding:10px 14px;font-size:12px;color:${C.textPri};line-height:1.6}
.note-box strong{color:${C.accent}}
/* Responsive */
@media(max-width:900px){
  .bld-thead,.bld-row{grid-template-columns:120px 80px 80px 70px 70px 70px minmax(120px,1fr) minmax(120px,1fr)}
  .bld-cell,.th{padding:8px 8px}
}
@media(max-width:640px){
  .bld-thead{display:none}
  .bld-row{grid-template-columns:1fr 1fr;gap:6px}
  .cp-body{padding:14px 14px}
  .cp-topbar{padding:14px 16px}
}
`;

// Format minutes as "Xd Xh Xm"
function fmtMins(totalMins) {
  if (!totalMins || totalMins <= 0) return "—";
  const d = Math.floor(totalMins / 1440);
  const h = Math.floor((totalMins % 1440) / 60);
  const m = Math.round(totalMins % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  return parts.join(" ");
}

// ─── Prerequisite map (from Misc. Data Tables AR:AS) ─────────────────────────
// PREREQS[building][FCn] = [ [reqBuilding, reqFCn], ... ]
// Only major FC levels listed — sub-levels inherit the same prereqs.
// "War Academy" prereqs use matching FC level (no dash notation in source).
const PREREQS = {
  Embassy: {
    FC1:"Furnace",FC2:"Furnace",FC3:"Furnace",FC4:"Furnace",FC5:"Furnace",
    FC6:"Furnace",FC7:"Furnace",FC8:"Furnace",FC9:"Furnace",FC10:"Furnace",
  },
  Furnace: {
    FC2:[["Embassy","FC1"],["Lancer","FC1"]],
    FC3:[["Embassy","FC2"],["Infantry","FC2"]],
    FC4:[["Embassy","FC3"],["Marksman","FC3"]],
    FC5:[["Embassy","FC4"],["Lancer","FC4"]],
    FC6:[["Embassy","FC5"],["Infantry","FC5"]],
    FC7:[["Embassy","FC6"],["Marksman","FC6"]],
    FC8:[["Embassy","FC7"],["Lancer","FC7"]],
    FC9:[["Embassy","FC8"],["Infantry","FC8"]],
    FC10:[["Embassy","FC9"],["Marksman","FC9"]],
  },
  Infantry: {
    FC1:"Furnace",FC2:"Furnace",FC3:"Furnace",FC4:"Furnace",FC5:"Furnace",
    FC6:"Furnace",FC7:"Furnace",FC8:"Furnace",FC9:"Furnace",FC10:"Furnace",
  },
  Marksman: {
    FC1:"Furnace",FC2:"Furnace",FC3:"Furnace",FC4:"Furnace",FC5:"Furnace",
    FC6:"Furnace",FC7:"Furnace",FC8:"Furnace",FC9:"Furnace",FC10:"Furnace",
  },
  Lancer: {
    FC1:"Furnace",FC2:"Furnace",FC3:"Furnace",FC4:"Furnace",FC5:"Furnace",
    FC6:"Furnace",FC7:"Furnace",FC8:"Furnace",FC9:"Furnace",FC10:"Furnace",
  },
  Command: {
    FC1:[["Furnace","FC1"],["Embassy","FC1"]],
    FC2:[["Furnace","FC2"],["Embassy","FC2"]],
    FC3:[["Furnace","FC3"],["Embassy","FC3"]],
    FC4:[["Furnace","FC3"],["Embassy","FC4"]],
    FC5:[["Furnace","FC5"],["Embassy","FC5"]],
    FC6:[["Furnace","FC6"],["Embassy","FC6"]],
    FC7:[["Furnace","FC7"],["Embassy","FC7"]],
    FC8:[["Furnace","FC8"],["Embassy","FC8"]],
    FC9:[["Furnace","FC9"],["Embassy","FC9"]],
    FC10:[["Furnace","FC10"],["Embassy","FC10"]],
  },
  Infirmary: {
    FC1:"Furnace",FC2:"Furnace",FC3:"Furnace",FC4:"Furnace",FC5:"Furnace",
    FC6:"Furnace",FC7:"Furnace",FC8:"Furnace",FC9:"Furnace",FC10:"Furnace",
  },
  "War Academy": {
    FC1:"Furnace",FC2:"Furnace",FC3:"Furnace",FC4:"Furnace",FC5:"Furnace",
    FC6:"Furnace",FC7:"Furnace",FC8:"Furnace",FC9:"Furnace",FC10:"Furnace",
  },
};

// Given an array of buildings, cascade prerequisite goal levels so that
// all buildings meet the minimum required for each other's goals.
// Returns a new buildings array with goals bumped up where needed.
function cascadePrereqs(buildings) {
  const byName = {};
  const result = buildings.map((b, i) => { byName[b.name] = i; return { ...b }; });

  let changed = true;
  let passes = 0;
  while (changed && passes < 10) {
    changed = false;
    passes++;
    result.forEach(b => {
      const goalIdx = FC_LEVELS.indexOf(b.goal);
      if (goalIdx < 0) return;

      for (let lvlIdx = 0; lvlIdx <= goalIdx; lvlIdx++) {
        const fcLevel = FC_LEVELS[lvlIdx];
        const prereqEntry = PREREQS[b.name]?.[fcLevel];
        if (!prereqEntry) continue;

        const reqs = Array.isArray(prereqEntry[0])
          ? prereqEntry
          : [[prereqEntry, fcLevel]];

        reqs.forEach(([reqName, reqLevel]) => {
          const reqIdx = byName[reqName];
          if (reqIdx === undefined) return;
          // Use keyIndex for sub-level-aware comparison (prereqs checked at base sub=0)
          const reqFCIdx    = keyIndex(reqLevel, 0);
          const currentGoal = keyIndex(result[reqIdx].goal, result[reqIdx].goalSub||0);
          if (reqFCIdx > currentGoal) {
            result[reqIdx].goal    = reqLevel;
            result[reqIdx].goalSub = 0;
            const currentCur = keyIndex(result[reqIdx].current, result[reqIdx].currentSub||0);
            if (reqFCIdx < currentCur) {
              result[reqIdx].goal    = result[reqIdx].current;
              result[reqIdx].goalSub = result[reqIdx].currentSub||0;
            }
            changed = true;
          }
        });
      }
    });
  }
  return result;
}

// ─── Building Power lookup table ─────────────────────────────────────────────
// Power is a direct lookup (not summed) — use the value at the chosen level/sub
const POWER_DB = {
"Command":{"30.1":221326,"30.2":229362,"30.3":237398,"30.4":245434,"FC1":253470,"FC1.1":261506,"FC1.2":269542,"FC1.3":277578,"FC1.4":285614,"FC2":293650,"FC2.1":301686,"FC2.2":309722,"FC2.3":317758,"FC2.4":325794,"FC3":333830,"FC3.1":342678,"FC3.2":351526,"FC3.3":360374,"FC3.4":369222,"FC4":378070,"FC4.1":386918,"FC4.2":395766,"FC4.3":404614,"FC4.4":413462,"FC5":422310,"FC5.1":431774,"FC5.2":441238,"FC5.3":450702,"FC5.4":460166,"FC6":469630,"FC6.1":479094,"FC6.2":488558,"FC6.3":498022,"FC6.4":507486,"FC7":516950,"FC7.1":526414,"FC7.2":535878,"FC7.3":545342,"FC7.4":554806,"FC8":564270,"FC8.1":574406,"FC8.2":574406,"FC8.3":574406,"FC8.4":574406,"FC9":574406,"FC9.1":614950,"FC9.2":614950,"FC9.3":614950,"FC9.4":614950,"FC10":614950},
"Embassy":{"30.1":347798,"30.2":360426,"30.3":373054,"30.4":385682,"FC1":398310,"FC1.1":410938,"FC1.2":423566,"FC1.3":436194,"FC1.4":448822,"FC2":461450,"FC2.1":474087,"FC2.2":486706,"FC2.3":499334,"FC2.4":511962,"FC3":524590,"FC3.1":538494,"FC3.2":552398,"FC3.3":566302,"FC3.4":580206,"FC4":594110,"FC4.1":608014,"FC4.2":621918,"FC4.3":635822,"FC4.4":649726,"FC5":663630,"FC5.1":678502,"FC5.2":693374,"FC5.3":708246,"FC5.4":723118,"FC6":737990,"FC6.1":752862,"FC6.2":767734,"FC6.3":782606,"FC6.4":797478,"FC7":812350,"FC7.1":827222,"FC7.2":842094,"FC7.3":856966,"FC7.4":871838,"FC8":886710,"FC8.1":902638,"FC8.2":918566,"FC8.3":934494,"FC8.4":950422,"FC9":966350,"FC9.1":982278,"FC9.2":998206,"FC9.3":1014134,"FC9.4":1030062,"FC10":1045990},
"Furnace":{"30.1":1580900,"30.2":1638300,"30.3":1695700,"30.4":1753100,"FC1":1810500,"FC1.1":1867900,"FC1.2":1925300,"FC1.3":1982700,"FC1.4":2040100,"FC2":2097500,"FC2.1":2154900,"FC2.2":2212300,"FC2.3":2269700,"FC2.4":2327100,"FC3":2384500,"FC3.1":2447700,"FC3.2":2510900,"FC3.3":2574100,"FC3.4":2637300,"FC4":2700500,"FC4.1":2763700,"FC4.2":2826900,"FC4.3":2890100,"FC4.4":2953300,"FC5":3016500,"FC5.1":3084100,"FC5.2":3151700,"FC5.3":3219300,"FC5.4":3286900,"FC6":3354500,"FC6.1":3422100,"FC6.2":3489700,"FC6.3":3557300,"FC6.4":3624900,"FC7":3692500,"FC7.1":3760100,"FC7.2":3827700,"FC7.3":3895300,"FC7.4":3962900,"FC8":4030500,"FC8.1":4102900,"FC8.2":4175300,"FC8.3":4247700,"FC8.4":4320100,"FC9":4392500,"FC9.1":4464900,"FC9.2":4537300,"FC9.3":4609700,"FC9.4":4682100,"FC10":4754500},
"Infantry":{"30.1":316180,"30.2":327660,"30.3":339140,"30.4":350620,"FC1":362100,"FC1.1":373580,"FC1.2":385060,"FC1.3":396540,"FC1.4":408020,"FC2":419500,"FC2.1":430980,"FC2.2":442460,"FC2.3":453940,"FC2.4":465420,"FC3":476900,"FC3.1":489540,"FC3.2":502180,"FC3.3":514820,"FC3.4":527460,"FC4":540100,"FC4.1":552740,"FC4.2":565380,"FC4.3":578020,"FC4.4":590660,"FC5":603300,"FC5.1":616820,"FC5.2":630340,"FC5.3":643860,"FC5.4":657380,"FC6":670990,"FC6.1":684420,"FC6.2":697940,"FC6.3":711460,"FC6.4":724980,"FC7":738500,"FC7.1":752020,"FC7.2":765540,"FC7.3":779060,"FC7.4":792580,"FC8":806100,"FC8.1":820580,"FC8.2":835060,"FC8.3":849540,"FC8.4":864020,"FC9":878500,"FC9.1":892980,"FC9.2":907460,"FC9.3":921940,"FC9.4":936420,"FC10":950900},
"Infirmary":{"30.1":237135,"30.2":245745,"30.3":254355,"30.4":262965,"FC1":271575,"FC1.1":280185,"FC1.2":288795,"FC1.3":297405,"FC1.4":306015,"FC2":314625,"FC2.1":323235,"FC2.2":331845,"FC2.3":340455,"FC2.4":349065,"FC3":357675,"FC3.1":367155,"FC3.2":376635,"FC3.3":386115,"FC3.4":395595,"FC4":405075,"FC4.1":405075,"FC4.2":414555,"FC4.3":424035,"FC4.4":442995,"FC5":452475,"FC5.1":462615,"FC5.2":472755,"FC5.3":482895,"FC5.4":493035,"FC6":503175,"FC6.1":513315,"FC6.2":523455,"FC6.3":533595,"FC6.4":543735,"FC7":553875,"FC7.1":564015,"FC7.2":574155,"FC7.3":584295,"FC7.4":594435,"FC8":604575,"FC8.1":615435,"FC8.2":626295,"FC8.3":637155,"FC8.4":648015,"FC9":658875,"FC9.1":669735,"FC9.2":680595,"FC9.3":691455,"FC9.4":702315,"FC10":713175},
"Lancer":{"30.1":316180,"30.2":327660,"30.3":339140,"30.4":350620,"FC1":362100,"FC1.1":373580,"FC1.2":385060,"FC1.3":396540,"FC1.4":408020,"FC2":419500,"FC2.1":430980,"FC2.2":442460,"FC2.3":453940,"FC2.4":465420,"FC3":476900,"FC3.1":489540,"FC3.2":502180,"FC3.3":514820,"FC3.4":527460,"FC4":540100,"FC4.1":552740,"FC4.2":565380,"FC4.3":578020,"FC4.4":590660,"FC5":603300,"FC5.1":616820,"FC5.2":630340,"FC5.3":643860,"FC5.4":657380,"FC6":670990,"FC6.1":684420,"FC6.2":697940,"FC6.3":711460,"FC6.4":724980,"FC7":738500,"FC7.1":752020,"FC7.2":765540,"FC7.3":779060,"FC7.4":792580,"FC8":806100,"FC8.1":820580,"FC8.2":835060,"FC8.3":849540,"FC8.4":864020,"FC9":878500,"FC9.1":892980,"FC9.2":907460,"FC9.3":921940,"FC9.4":936420,"FC10":950900},
"Marksman":{"30.1":316180,"30.2":327660,"30.3":339140,"30.4":350620,"FC1":362100,"FC1.1":373580,"FC1.2":385060,"FC1.3":396540,"FC1.4":408020,"FC2":419500,"FC2.1":430980,"FC2.2":442460,"FC2.3":453940,"FC2.4":465420,"FC3":476900,"FC3.1":489540,"FC3.2":502180,"FC3.3":514820,"FC3.4":527460,"FC4":540100,"FC4.1":552740,"FC4.2":565380,"FC4.3":578020,"FC4.4":590660,"FC5":603300,"FC5.1":616820,"FC5.2":630340,"FC5.3":643860,"FC5.4":657380,"FC6":670990,"FC6.1":684420,"FC6.2":697940,"FC6.3":711460,"FC6.4":724980,"FC7":738500,"FC7.1":752020,"FC7.2":765540,"FC7.3":779060,"FC7.4":792580,"FC8":806100,"FC8.1":820580,"FC8.2":835060,"FC8.3":849540,"FC8.4":864020,"FC9":878500,"FC9.1":892980,"FC9.2":907460,"FC9.3":921940,"FC9.4":936420,"FC10":950900},
"War Academy":{"FC1":217260,"FC1.1":224148,"FC1.2":231036,"FC1.3":237924,"FC1.4":244812,"FC2":251700,"FC2.1":258588,"FC2.2":265476,"FC2.3":272364,"FC2.4":279252,"FC3":286140,"FC3.1":293724,"FC3.2":301308,"FC3.3":308892,"FC3.4":316476,"FC4":324060,"FC4.1":331644,"FC4.2":339228,"FC4.3":346812,"FC4.4":354396,"FC5":361980,"FC5.1":370092,"FC5.2":378204,"FC5.3":386316,"FC5.4":394428,"FC6":402540,"FC6.1":410652,"FC6.2":418764,"FC6.3":426876,"FC6.4":434988,"FC7":443100,"FC7.1":451212,"FC7.2":459324,"FC7.3":467436,"FC7.4":475548,"FC8":483660,"FC8.1":492348,"FC8.2":501036,"FC8.3":509724,"FC8.4":518412,"FC9":527100,"FC9.1":535788,"FC9.2":544476,"FC9.3":553164,"FC9.4":561852,"FC10":570540},
};

// Power is a direct lookup — return the value at the given level/sub key
export function getBuildingPower(building, level, sub) {
  const db = POWER_DB[building] || POWER_DB[BUILDING_KEY(building)];
  if (!db) return 0;
  return db[levelKey(level, sub||0)] || 0;
}

export { BUILDINGS_LIST };

const BUILDINGS_LIST = [
  "Furnace","Embassy","Infantry","Marksman","Lancer","Command","Infirmary","War Academy"
];

const BUILDING_KEY = b => b === "Infantry" ? "Infantry" : b === "Marksman" ? "Marksman"
  : b === "Lancer" ? "Lancer" : b === "War Academy" ? "War Academy" : b;

const DEFAULT_BUILDINGS = [
  { name:"Furnace",     current:"FC1", currentSub:0, goal:"FC1", goalSub:0 },
  { name:"Embassy",     current:"FC1", currentSub:0, goal:"FC1", goalSub:0 },
  { name:"Infantry",    current:"FC1", currentSub:0, goal:"FC1", goalSub:0 },
  { name:"Marksman",    current:"FC1", currentSub:0, goal:"FC1", goalSub:0 },
  { name:"Lancer",      current:"FC1", currentSub:0, goal:"FC1", goalSub:0 },
  { name:"Command",     current:"FC1", currentSub:0, goal:"FC1", goalSub:0 },
  { name:"Infirmary",   current:"FC1", currentSub:0, goal:"FC1", goalSub:0 },
  { name:"War Academy", current:"FC1", currentSub:0, goal:"FC1", goalSub:0 },
];

// ─── Sync helpers ─────────────────────────────────────────────────────────────
const CP_KEYS = ["cp-buildings","cp-buffs","cp-speedbuff","cp-cycle","cp-dailyfc","cp-agnes"];
const _cpTimers = {};

async function cpSyncToCloud(key, val, charId) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId || !charId) return;
    await supabase.from("user_data").upsert(
      { user_id: userId, char_id: charId, key, value: JSON.stringify(val),
        updated_at: new Date().toISOString() },
      { onConflict: "user_id,char_id,key" }
    );
  } catch {}
}

function saveState(key, val, charId) {
  if (!_isGuest) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      localStorage.setItem(`${key}__ts`, new Date().toISOString());
    } catch {}
  }
  // Debounced cloud write — uses supabase.auth directly, no localStorage token parsing
  if (charId) {
    clearTimeout(_cpTimers[key]);
    _cpTimers[key] = setTimeout(() => cpSyncToCloud(key, val, charId), 800);
  }
}

function loadState(key, fallback) {
  // Guests should never see stale localStorage data from a previous logged-in session
  if (_isGuest) return fallback;
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
  catch { return fallback; }
}

async function syncCPFromCloud(userId, charId, setters) {
  try {
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
    }
    if (!userId) return;

    const { data } = await supabase.from("user_data")
      .select("key, value, updated_at")
      .eq("user_id", userId)
      .eq("char_id", charId || null)
      .in("key", CP_KEYS);

    const cloudKeys = new Set((data || []).map(r => r.key));

    // Pull cloud → local where cloud is newer
    (data || []).forEach(row => {
      try {
        const remote = JSON.parse(row.value);
        const localTs = localStorage.getItem(`${row.key}__ts`) || "0";
        if (row.updated_at > localTs) {
          localStorage.setItem(row.key, JSON.stringify(remote));
          localStorage.setItem(`${row.key}__ts`, row.updated_at);
          setters[row.key]?.(remote);
        }
      } catch {}
    });

    // Push local → cloud for any keys missing from Supabase or where local is newer
    CP_KEYS.forEach(key => {
      try {
        const localVal = localStorage.getItem(key);
        if (!localVal) return; // nothing local to push
        const localTs = localStorage.getItem(`${key}__ts`) || "0";
        const cloudRow = (data || []).find(r => r.key === key);
        // Push if key missing from cloud OR local timestamp is newer
        if (!cloudKeys.has(key) || (cloudRow && localTs > cloudRow.updated_at)) {
          cpSyncToCloud(key, JSON.parse(localVal), charId);
        }
      } catch {}
    });
  } catch {}
}

// ─── Guest Calculator ────────────────────────────────────────────────────────
// Building + from/to FC level → RFC cost, FC cost, time.
// No tracking, no save, no Agnes/buff/cycle planning.

const CALC_BUILDINGS  = ["Furnace","Embassy","Infantry","Marksman","Lancer","Command","Infirmary","War Academy"];
const CALC_FC_LEVELS  = ["FC1","FC2","FC3","FC4","FC5","FC6","FC7","FC8","FC9","FC10"];

function calcFmtMins(m) {
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mn = m % 60;
  return [d && `${d}d`, h && `${h}h`, mn && `${mn}m`].filter(Boolean).join(" ") || "0m";
}
function calcFmtM(n) {
  if (n >= 1e9) return (n/1e9).toFixed(1)+"B";
  if (n >= 1e6) return (n/1e6).toFixed(1)+"M";
  return n.toLocaleString();
}

function GuestConstructionCalc() {
  const { openAuth } = useTierContext();
  const [building,   setBuilding]   = useState("Furnace");
  const [fromLevel,  setFromLevel]  = useState("FC1");
  const [toLevel,    setToLevel]    = useState("FC10");

  const toOpts      = CALC_FC_LEVELS.slice(CALC_FC_LEVELS.indexOf(fromLevel) + 1);
  const effectiveTo = toOpts.includes(toLevel) ? toLevel : toOpts[toOpts.length - 1] || "FC10";
  const result      = useMemo(
    () => computeUpgradeFull(building, fromLevel, 0, effectiveTo, 0),
    [building, fromLevel, effectiveTo]
  );

  const inpS = { width:"100%", background:"var(--c-surface)", border:"1px solid var(--c-border)",
    borderRadius:7, padding:"7px 10px", fontSize:12, color:"var(--c-textPri)", outline:"none",
    fontFamily:"Syne,sans-serif", cursor:"pointer" };
  const lbl  = { fontSize:10, fontWeight:700, color:"var(--c-textSec)", textTransform:"uppercase",
    letterSpacing:"1px", fontFamily:"'Space Mono',monospace", marginBottom:5 };

  return (
    <div className="fade-in">
      <GuestBanner message="Sign up to track building progress, plan SvS cycles, and sync across devices." />
      <div style={{background:"var(--c-card)", border:"1px solid var(--c-border)", borderRadius:12,
        padding:"20px 24px", maxWidth:580}}>
        <div style={{fontSize:13, fontWeight:800, marginBottom:16, color:"var(--c-textPri)",
          fontFamily:"Syne,sans-serif"}}>Building Upgrade Cost Calculator</div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20}}>
          <div>
            <div style={lbl}>Building</div>
            <select value={building} onChange={e => setBuilding(e.target.value)} style={inpS}>
              {CALC_BUILDINGS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <div style={lbl}>From Level</div>
            <select value={fromLevel} onChange={e => {
              setFromLevel(e.target.value);
              const opts = CALC_FC_LEVELS.slice(CALC_FC_LEVELS.indexOf(e.target.value)+1);
              if (!opts.includes(toLevel)) setToLevel(opts[opts.length-1]||"FC10");
            }} style={inpS}>
              {CALC_FC_LEVELS.slice(0,-1).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <div style={lbl}>To Level</div>
            <select value={effectiveTo} onChange={e => setToLevel(e.target.value)}
              style={{...inpS, color:"var(--c-accent)", fontWeight:700}}>
              {toOpts.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:10}}>
          {[
            {label:"FC Cost",  value:result.fc.toLocaleString(),    color:"var(--c-accent)"},
            {label:"RFC Cost", value:result.rfc.toLocaleString(),   color:"var(--c-blue)"},
            {label:"Time",     value:calcFmtMins(result.mins),      color:"var(--c-textPri)"},
            {label:"Meat",     value:calcFmtM(result.meat),         color:"var(--c-textSec)"},
            {label:"Wood",     value:calcFmtM(result.wood),         color:"var(--c-textSec)"},
            {label:"Coal",     value:calcFmtM(result.coal),         color:"var(--c-textSec)"},
            {label:"Iron",     value:calcFmtM(result.iron),         color:"var(--c-textSec)"},
          ].map(row => (
            <div key={row.label} style={{background:"var(--c-surface)", border:"1px solid var(--c-border)",
              borderRadius:8, padding:"10px 14px"}}>
              <div style={{...lbl, marginBottom:4}}>{row.label}</div>
              <div style={{fontSize:16, fontWeight:800, color:row.color,
                fontFamily:"'Space Mono',monospace"}}>{row.value || "—"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ConstructionPlanner({ inv, setInv, planSnapshot, onSetSnapshot, onUpdatePlan, cpSpeedBuff: cpSpeedBuffProp, setCpSpeedBuff: setCpSpeedBuffProp, activeCharId, onCompleteSvs }) {
  const { isGuest } = useTierContext();
  if (isGuest) return <GuestConstructionCalc />;

  // Cycle selector linked to SvS Calendar
  const currentCycle = useMemo(() => getCurrentCycleNum(), []);
  const cycleOpts    = useMemo(() => buildCycles(Math.max(1, currentCycle - 1), 16), [currentCycle]);
  const [selectedCycle, setSelectedCycle] = useState(() => loadState("cp-cycle", currentCycle));

  // ── Live days-to-SvS calculation ─────────────────────────────────────────────
  // SvS Monday of selected cycle = FIRST_SVS_MONDAY + (cycleNum-1)*4 weeks
  const svsMonday = useMemo(() => {
    const weekOffset = (selectedCycle - 1) * 4; // SvS is week 4 of cycle N
    return addDaysToDate(FIRST_SVS_MONDAY, weekOffset * 7);
  }, [selectedCycle]);

  const { daysToSVS, todayDayIndex } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cycleStart = getCycleStartDate(selectedCycle); // Prep1 Monday
    cycleStart.setHours(0, 0, 0, 0);
    const msPerDay = 86400000;
    // Days from cycle start (day 0 = Prep1 Monday)
    const daysSinceCycleStart = Math.floor((today - cycleStart) / msPerDay);
    // Days remaining until SvS Monday (day 21 of cycle)
    const remaining = Math.max(0, Math.ceil((svsMonday - today) / msPerDay));
    // Today's 0-based index in the 21-day plan (0=day1 ... 20=day21)
    const todayIdx = Math.min(Math.max(daysSinceCycleStart, 0), 20);
    return { daysToSVS: remaining, todayDayIndex: todayIdx };
  }, [selectedCycle, svsMonday]);

  // Also compute today's 0-based index in the RFC planner's 28-day schedule
  const rfcTodayIndex = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const cycleStart = getCycleStartDate(selectedCycle); cycleStart.setHours(0, 0, 0, 0);
    const diff = Math.floor((today - cycleStart) / 86400000);
    return Math.min(Math.max(diff, 0), 27);
  }, [selectedCycle]);

  // Start date display (Prep1 Monday of selected cycle)
  const cycleStartDate = useMemo(() => {
    const d = getCycleStartDate(selectedCycle);
    return fmtDateCal(d);
  }, [selectedCycle]);

  // Per-building current/goal selections
  const [buildings, setBuildings] = useState(() =>
    loadState("cp-buildings", DEFAULT_BUILDINGS)
  );

  // Live inv values — always editable, always reflect Inventory tab
  const liveFC  = inv?.fireCrystals ?? 0;
  const liveRFC = inv?.refinedFC    ?? 0;
  const setFC   = (val) => setInv(p => ({ ...p, fireCrystals: val }));
  const setRFC  = (val) => setInv(p => ({ ...p, refinedFC:    val }));

  // Projection base — use snapshot if set, otherwise live values
  const fc  = planSnapshot ? (planSnapshot.fc  ?? liveFC)  : liveFC;
  const rfc = planSnapshot ? (planSnapshot.rfc ?? liveRFC) : liveRFC;
  const [dailyFCIncome, setDailyFCIncome] = useState(() => loadState("cp-dailyfc", 48));
  const [agnesLevel, setAgnesLevel] = useState(() => loadState("cp-agnes", 0));

  // ── Update Plan modal state ───────────────────────────────────────────────────
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateNote,      setUpdateNote]      = useState("");
  const [modalFC,         setModalFC]         = useState(0);
  const [modalRFC,        setModalRFC]        = useState(0);
  const [upgradeOverrides, setUpgradeOverrides] = useState({});

  const openUpdateModal = () => {
    setModalFC(liveFC);
    setModalRFC(liveRFC);
    setUpgradeOverrides({});
    setUpdateNote("");
    setShowUpdateModal(true);
  };

  const handleConfirmUpdate = () => {
    // Apply building upgrades from modal
    if (Object.keys(upgradeOverrides).length > 0) {
      const next = buildings.map(b => {
        const override = upgradeOverrides[b.name];
        if (!override || override === b.current) return b;
        const updated = { ...b, current: override };
        const ci = FC_LEVELS.indexOf(override);
        const gi = FC_LEVELS.indexOf(updated.goal);
        if (gi < ci) updated.goal = override;
        return updated;
      });
      const cascaded = cascadePrereqs(next);
      setBuildings(cascaded);
      saveState("cp-buildings", cascaded, activeCharId);
    }
    // Write confirmed FC/RFC back to live inventory and update plan
    setFC(modalFC);
    setRFC(modalRFC);
    onUpdatePlan?.(rfcTodayIndex, modalFC, modalRFC);
    setShowUpdateModal(false);
    setUpgradeOverrides({});
    setUpdateNote("");
  };

  // Construction speed — use prop from App.jsx (cloud-synced) if provided, else local state
  const [speedBuffLocal, setSpeedBuffLocal] = useState(() => loadState("cp-speedbuff", 0));
  const speedBuff    = cpSpeedBuffProp  !== undefined ? Number(cpSpeedBuffProp)  : speedBuffLocal;
  const setSpeedBuff = (v) => {
    setSpeedBuffLocal(v);
    setCpSpeedBuffProp?.(v);  // update cloud-synced prop in App.jsx
    saveState("cp-speedbuff", v, activeCharId);
  };

  // Keep pet, chiefOrder, presSkill, presPos as toggles (4 remaining)
  const [buffs, setBuffs] = useState(() => loadState("cp-buffs", {
    pet: false, chiefOrder: false, presSkill: false, presPos: false,
  }));

  function toggleBuff(k) {
    const next = { ...buffs, [k]: !buffs[k] };
    setBuffs(next); saveState("cp-buffs", next, activeCharId);
  }

  // ── On mount: pull latest cp-* keys from Supabase ───────────────────────────
  useEffect(() => {
    const setters = {
      "cp-buildings":  setBuildings,
      "cp-buffs":      setBuffs,
      "cp-speedbuff":  setSpeedBuff,
      "cp-cycle":      setSelectedCycle,
      "cp-dailyfc":    setDailyFCIncome,
      "cp-agnes":      setAgnesLevel,
    };
    // Sync from cloud whenever the active character changes.
    // Also listen for wos-user-ready in case auth hasn't resolved yet.
    syncCPFromCloud(null, activeCharId, setters);
    const handler = (e) => syncCPFromCloud(e.detail?.id || null, activeCharId, setters);
    window.addEventListener("wos-user-ready", handler, { once: true });
    window.addEventListener("wos-char-ready", handler);
    return () => {
      window.removeEventListener("wos-user-ready", handler);
      window.removeEventListener("wos-char-ready", handler);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCharId]);

  // buffTotal = speedBuff% + remaining toggles
  const buffTotal = useMemo(() => {
    let t = speedBuff / 100;
    if (buffs.pet)        t += 0.15;
    if (buffs.chiefOrder) t += 0.2;
    if (buffs.presSkill)  t += 0.1;
    if (buffs.presPos)    t += 0.1;
    return t;
  }, [speedBuff, buffs]);

  // Accumulation of RFC over remaining days based on daily FC income and refine tiers
  const rfcAccumulated = useMemo(() => {
    let total = 0, rc = 1;
    for (let d = 0; d < daysToSVS; d++) {
      const tier = getRFCTier(rc);
      const refinesPerDay = Math.floor(dailyFCIncome / tier.fcPer);
      total += refinesPerDay * tier.rfcPer;
      rc = Math.min(rc + refinesPerDay, 100);
    }
    return Math.round(total);
  }, [daysToSVS, dailyFCIncome]);

  // FC accumulated over remaining days from daily income
  const fcAccumulated = useMemo(() => Math.round(dailyFCIncome * daysToSVS), [dailyFCIncome, daysToSVS]);

  // Build per-day accumulation rows (full 21-day cycle for display)
  const accumRows = useMemo(() => {
    const rows = [];
    let runningFC  = fc;
    let runningRFC = rfc;
    let rc = 1;
    const cycleStart = getCycleStartDate(selectedCycle);
    for (let d = 0; d < 21; d++) {
      const dayDate = addDaysToDate(cycleStart, d);
      const dayFC   = dailyFCIncome;
      const tier    = getRFCTier(rc);
      const refines = Math.floor(dailyFCIncome / tier.fcPer);
      const dayRFC  = refines * tier.rfcPer;
      rc = Math.min(rc + refines, 100);
      runningFC  += dayFC;
      runningRFC += dayRFC;
      rows.push({
        day: d + 1,
        date: fmtDateCal(dayDate),
        dailyFC: dayFC,
        dailyRFC: dayRFC,
        runningFC,
        runningRFC,
        isPast: d < todayDayIndex,
        isToday: d === todayDayIndex,
      });
    }
    return rows;
  }, [fc, rfc, dailyFCIncome, selectedCycle, todayDayIndex]);

  // Per-building computed costs — all from BLDG_DB (accurate spreadsheet data)
  const buildingCalcs = useMemo(() => {
    return buildings.map(b => {
      const key = BUILDING_KEY(b.name);
      const full = computeUpgradeFull(key, b.current, b.currentSub||0, b.goal, b.goalSub||0);
      const currentPower = getBuildingPower(b.name, b.current, b.currentSub||0);
      const goalPower    = getBuildingPower(b.name, b.goal,    b.goalSub||0);
      return { ...b, fcCost: full.fc, rfcCost: full.rfc, subLevels: full.subLevels,
               meat: full.meat, wood: full.wood, coal: full.coal, iron: full.iron,
               baseMins: full.mins, currentPower, goalPower, powerGain: goalPower - currentPower };
    });
  }, [buildings]);

  // Material totals across all buildings (directly from buildingCalcs)
  const materialTotals = useMemo(() => buildingCalcs.reduce((acc, b) => ({
    fc:   acc.fc   + b.fcCost,
    rfc:  acc.rfc  + b.rfcCost,
    meat: acc.meat + b.meat,
    wood: acc.wood + b.wood,
    coal: acc.coal + b.coal,
    iron: acc.iron + b.iron,
  }), {fc:0,rfc:0,meat:0,wood:0,coal:0,iron:0}), [buildingCalcs]);

  // Totals
  const totalFCNeeded  = buildingCalcs.reduce((s, b) => s + b.fcCost,  0);
  const totalRFCNeeded = buildingCalcs.reduce((s, b) => s + b.rfcCost, 0);
  const projectedFC    = fc + fcAccumulated;
  const projectedRFC   = rfc + rfcAccumulated;
  const fcBalance      = projectedFC  - totalFCNeeded;
  const rfcBalance     = projectedRFC - totalRFCNeeded;

  // SVS point estimates (Monday FC burn is biggest)
  const svsMonPts  = Math.round((totalFCNeeded > 0 ? Math.min(projectedFC, totalFCNeeded) : 0) * SvS_FC_POINTS_PER_FC);
  const svsRfcPts  = Math.round(Math.min(projectedRFC, totalRFCNeeded) * SVS_RFC_POINTS_PER_RFC);
  const svsTotalPts = svsMonPts + svsRfcPts;

  function updateBuilding(idx, field, val) {
    const next = buildings.map((b, i) => {
      if (i !== idx) return b;
      const updated = { ...b, [field]: val };
      // When current level/sub changes, clamp goal so it's not below current
      if (field === "current" || field === "currentSub") {
        const ci = keyIndex(updated.current, updated.currentSub || 0);
        const gi = keyIndex(updated.goal,    updated.goalSub    || 0);
        if (gi < ci) {
          updated.goal    = updated.current;
          updated.goalSub = updated.currentSub || 0;
        }
      }
      // When goal level/sub changes, clamp goal so it's not below current
      if (field === "goal" || field === "goalSub") {
        const ci = keyIndex(updated.current, updated.currentSub || 0);
        const gi = keyIndex(updated.goal,    updated.goalSub    || 0);
        if (gi < ci) {
          updated.goal    = updated.current;
          updated.goalSub = updated.currentSub || 0;
        }
        // FC10 has no sub-levels
        if (updated.goal === "FC10") updated.goalSub = 0;
      }
      // FC10 has no sub-levels
      if (field === "current" && val === "FC10") updated.currentSub = 0;
      return updated;
    });
    const cascaded = cascadePrereqs(next);
    setBuildings(cascaded);
    saveState("cp-buildings", cascaded, activeCharId);
  }

  const persist = (setter, key) => (val) => { setter(val); saveState(key, val, activeCharId); };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="cp-wrap">

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
              <span className="info-tip" data-tip="Reviews all building goals for this tab. Lets you adjust what you actually achieved, then pushes those values to Current." style={{fontSize:14,color:"var(--c-textDim)",cursor:"default",userSelect:"none",lineHeight:1}}>ⓘ</span>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="cp-topbar">
          <div>
            <div className="cp-title">Construction <span>Planner</span></div>
            <div className="cp-subtitle">
              Select current &amp; goal levels · material requirements · linked to SvS Calendar
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              <span style={{fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:C.textSec,fontFamily:"Space Mono,monospace"}}>SvS Cycle</span>
              <select
                value={selectedCycle}
                onChange={e => { const v=Number(e.target.value); setSelectedCycle(v); saveState("cp-cycle",v, activeCharId); }}
                style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 10px",fontFamily:"Space Mono,monospace",fontSize:12,color:C.accent,outline:"none",cursor:"pointer"}}>
                {cycleOpts.map(c => (
                  <option key={c.cycleNum} value={c.cycleNum}>
                    {cycleLabelFull(c.cycleNum, cycleOpts)}{c.cycleNum === currentCycle ? " ★" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              <span style={{fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:C.textSec,fontFamily:"Space Mono,monospace"}}>Plan starts</span>
              <span style={{fontFamily:"Space Mono,monospace",fontSize:12,color:C.textPri,padding:"5px 0"}}>{cycleStartDate}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              <span style={{fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:C.textSec,fontFamily:"Space Mono,monospace"}}>Days to SvS</span>
              <span style={{fontFamily:"Space Mono,monospace",fontSize:12,fontWeight:700,color:daysToSVS <= 7 ? C.red : daysToSVS <= 14 ? C.amber : C.green,padding:"5px 0"}}>
                {daysToSVS} day{daysToSVS !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="cp-body">

          {/* Summary tiles */}
          <div className="summary-bar">
            {/* FC tile: now + projected + income */}
            <div className="s-tile">
              <div className="s-label">Fire Crystals</div>
              <div className="s-val accent">{fmt(projectedFC)}</div>
              <div className="s-sub">projected at SvS · have {fmt(fc)} now</div>
              <div className="s-sub" style={{marginTop:2}}>+{fmt(fcAccumulated)} over {daysToSVS}d</div>
            </div>
            {/* FC needed + balance */}
            <div className="s-tile">
              <div className="s-label">FC needed / balance</div>
              <div className="s-val" style={{color:C.textPri}}>{fmt(totalFCNeeded)}</div>
              <div className={`s-sub ${fcBalance >= 0 ? "green" : "red"}`} style={{fontWeight:700,color:fcBalance >= 0 ? C.green : C.red}}>
                {fcBalance >= 0 ? "+" : ""}{fmt(fcBalance)} {fcBalance >= 0 ? "surplus" : "shortfall"}
              </div>
            </div>
            {/* RFC projected + balance */}
            <div className="s-tile">
              <div className="s-label">Refined FC / balance</div>
              <div className="s-val amber">{fmt(projectedRFC)}</div>
              <div className={`s-sub`} style={{fontWeight:700,color:rfcBalance >= 0 ? C.green : C.red}}>
                {rfcBalance >= 0 ? "+" : ""}{fmt(rfcBalance)} {rfcBalance >= 0 ? "surplus" : "shortfall"}
              </div>
            </div>
            {/* SVS pts */}
            <div className="s-tile">
              <div className="s-label">Est. SVS pts</div>
              <div className="s-val teal">{fmt(svsTotalPts)}</div>
              <div className="s-sub">construction only</div>
            </div>
          </div>

          {/* Inventory & Accumulation Settings */}
          <div>
            <div className="sec-head">Inventory &amp; accumulation settings</div>
            <div className="settings-grid">
              <div className="inp-group">
                <label className="inp-label">Current FC</label>
                <NumInput className="inp-field" value={liveFC} min={0}
                  onChange={v => setFC(v)} />
              </div>
              <div className="inp-group">
                <label className="inp-label">Current Refined FC</label>
                <NumInput className="inp-field" value={liveRFC} min={0}
                  onChange={v => setRFC(v)} />
              </div>
              <div className="inp-group">
                <label className="inp-label">Daily FC income</label>
                <NumInput className="inp-field" value={dailyFCIncome} min={0}
                  onChange={v => persist(setDailyFCIncome,"cp-dailyfc")(v)} />
              </div>
              <div className="inp-group">
                <label className="inp-label">Agnes skill level (1–8)</label>
                <select className="inp-field" value={agnesLevel}
                  onChange={e => persist(setAgnesLevel,"cp-agnes")(Number(e.target.value))}>
                  {[1,2,3,4,5,6,7,8].map(l => <option key={l} value={l}>Level {l} ({l} hrs off/build)</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Construction buffs */}
          <div>
            <div className="sec-head">Construction buffs (time reduction)</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:16,alignItems:"flex-start"}}>
              {/* Primary: user-entered overview total */}
              <div style={{display:"flex",flexDirection:"column",gap:5,minWidth:260}}>
                <label className="inp-label">Bonus Overview Total — Construction Speed (%)</label>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <input
                    className="inp-field"
                    type="number" min={0} max={500} step={0.5}
                    value={speedBuff}
                    onChange={e => { const v=Number(e.target.value); setSpeedBuff(v); }}
                    style={{width:100,textAlign:"right"}}
                  />
                  <span style={{fontSize:12,color:C.textSec,fontFamily:"Space Mono,monospace"}}>%</span>
                </div>
                <div style={{fontSize:11,color:C.textSec,marginTop:4,lineHeight:1.5}}>
                  Non-buffed Construction speed — located in <span style={{color:C.accent,fontFamily:"Space Mono,monospace"}}>Bonus Overview &gt; Growth</span>
                </div>
              </div>
              {/* Toggle buttons in 2x2 grid */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,alignSelf:"flex-end"}}>
                {[
                  {k:"pet",        label:"Pet",                              val:"15%"},
                  {k:"chiefOrder", label:"Chief Order",                     val:"20%"},
                  {k:"presSkill",  label:"President Skill — Mercantilism",  val:"10%"},
                  {k:"presPos",    label:"Vice President",                  val:"10%"},
                ].map(b => (
                  <button key={b.k}
                    onClick={() => toggleBuff(b.k)}
                    style={{
                      padding:"7px 13px",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",
                      fontFamily:"Syne,sans-serif",transition:"all 0.15s",textAlign:"left",
                      background: buffs[b.k] ? C.greenBg : C.surface,
                      color:      buffs[b.k] ? C.green   : C.textDim,
                      border:     `1px solid ${buffs[b.k] ? C.greenDim : C.border}`,
                    }}>
                    {b.label} <span style={{opacity:0.7}}>+{b.val}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginTop:10,fontSize:12,color:C.textSec}}>
              Total construction speed bonus: <span style={{color:C.green,fontFamily:"Space Mono,monospace",fontWeight:700}}>{(buffTotal*100).toFixed(1)}%</span>
              {" · "}Actual time = base time ÷ (1 + {(buffTotal*100).toFixed(1)}%)
            </div>
          </div>

          {/* Building planner table */}
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:10}}>
              <div className="sec-head" style={{margin:0}}>Building upgrade planner</div>
              <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                {/* Set all current */}
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,color:C.textSec,fontFamily:"Space Mono,monospace",whiteSpace:"nowrap"}}>Set all current</span>
                  <select
                    defaultValue=""
                    onChange={e => {
                      const val = e.target.value;
                      if (!val) return;
                      e.target.value = "";
                      const next = buildings.map(b => {
                        const updated = { ...b, current: val, currentSub: 0 };
                        const ci = keyIndex(val, 0);
                        const gi = keyIndex(updated.goal, updated.goalSub||0);
                        if (gi < ci) { updated.goal = val; updated.goalSub = 0; }
                        return updated;
                      });
                      const cascaded = cascadePrereqs(next);
                      setBuildings(cascaded);
                      saveState("cp-buildings", cascaded, activeCharId);
                    }}
                    style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,
                      color:C.textPri,fontSize:11,padding:"5px 8px",cursor:"pointer",outline:"none",
                      fontFamily:"Space Mono,monospace"}}>
                    <option value="">— level —</option>
                    {FC_LEVEL_OPTS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                {/* Set all goal */}
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,color:C.textSec,fontFamily:"Space Mono,monospace",whiteSpace:"nowrap"}}>Set all goal</span>
                  <select
                    defaultValue=""
                    onChange={e => {
                      const val = e.target.value;
                      if (!val) return;
                      e.target.value = "";
                      const next = buildings.map(b => {
                        const ci = keyIndex(b.current, b.currentSub||0);
                        const gi = keyIndex(val, 0);
                        return { ...b, goal: gi >= ci ? val : b.current, goalSub: gi >= ci ? 0 : b.currentSub||0 };
                      });
                      const cascaded = cascadePrereqs(next);
                      setBuildings(cascaded);
                      saveState("cp-buildings", cascaded, activeCharId);
                    }}
                    style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,
                      color:C.textPri,fontSize:11,padding:"5px 8px",cursor:"pointer",outline:"none",
                      fontFamily:"Space Mono,monospace"}}>
                    <option value="">— level —</option>
                    {FC_LEVEL_OPTS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="bld-table">
              <div className="bld-thead" style={{gridTemplateColumns:"140px 140px 90px 140px 90px 80px 80px minmax(120px,1fr) minmax(120px,1fr)"}}>
                <div className="th">Building</div>
                <div className="th">Current Level</div>
                <div className="th">Cur. Power</div>
                <div className="th">Goal Level</div>
                <div className="th">Goal Power</div>
                <div className="th">FC Cost</div>
                <div className="th">RFC Cost</div>
                <div className="th">Original Build Time</div>
                <div className="th">Actual Build Time</div>
              </div>

              {buildingCalcs.map((b, idx) => {
                const isDone = b.current === b.goal && (b.currentSub||0) === (b.goalSub||0);
                const isFC10 = b.current === "FC10";
                const isGoalFC10 = b.goal === "FC10";
                const goalOptions = FC_LEVEL_OPTS.filter(l => FC_LEVELS.indexOf(l) >= FC_LEVELS.indexOf(b.current));
                const actualMins = b.baseMins > 0 ? Math.round(b.baseMins / (1 + buffTotal)) : 0;
                const SUB_OPTS = [0,1,2,3,4];
                // Goal sub-level options: if same FC level as current, only allow >= currentSub
                const goalSubOpts = b.goal === b.current
                  ? SUB_OPTS.filter(s => s >= (b.currentSub||0))
                  : (isGoalFC10 ? [0] : SUB_OPTS);

                return (
                  <div className="bld-row-wrap" key={b.name}>
                    <div className="bld-row" style={{gridTemplateColumns:"140px 140px 90px 140px 90px 80px 80px minmax(120px,1fr) minmax(120px,1fr)"}}>
                      <div className="bld-cell name">{b.name}</div>

                      {/* Current level + sub-level */}
                      <div className="bld-cell" style={{display:"flex",gap:4,alignItems:"center"}}>
                        <select value={b.current} onChange={e => updateBuilding(idx,"current",e.target.value)} style={{flex:1}}>
                          {FC_LEVEL_OPTS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        {!isFC10 && (
                          <select value={b.currentSub||0} onChange={e => updateBuilding(idx,"currentSub",Number(e.target.value))} style={{width:48}}>
                            {SUB_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                      </div>

                      {/* Current Power */}
                      <div className="bld-cell mono" style={{color:"var(--c-textSec)",fontSize:11}}>
                        {b.currentPower > 0 ? fmt(b.currentPower) : "—"}
                      </div>

                      {/* Goal level + sub-level */}
                      <div className="bld-cell" style={{display:"flex",gap:4,alignItems:"center"}}>
                        <select value={b.goal} onChange={e => updateBuilding(idx,"goal",e.target.value)} style={{flex:1}}>
                          {goalOptions.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        {!isGoalFC10 && (
                          <select value={b.goalSub||0} onChange={e => updateBuilding(idx,"goalSub",Number(e.target.value))} style={{width:48}}>
                            {goalSubOpts.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                      </div>

                      {/* Goal Power */}
                      <div className="bld-cell mono" style={{color:"var(--c-textSec)",fontSize:11}}>
                        {b.goalPower > 0 ? fmt(b.goalPower) : "—"}
                      </div>

                      {/* FC Cost */}
                      <div className="bld-cell">
                        <span className="cost-fc">{isDone ? "—" : fmtFull(b.fcCost)}</span>
                      </div>

                      {/* RFC Cost */}
                      <div className="bld-cell">
                        <span className="cost-rfc">{isDone ? "—" : fmtFull(b.rfcCost)}</span>
                      </div>

                      {/* Original build time */}
                      <div className="bld-cell mono" style={{color:"var(--c-textSec)"}}>
                        {isDone || !b.baseMins ? "—" : fmtMins(b.baseMins)}
                      </div>

                      {/* Actual build time */}
                      <div className="bld-cell mono" style={{color:"var(--c-green)",fontWeight:700}}>
                        {isDone || !b.baseMins ? "—" : fmtMins(actualMins)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Totals footer */}
              <div style={{background:C.surface,borderTop:`2px solid ${C.borderHi}`,padding:"11px 12px",display:"grid",gridTemplateColumns:"140px 140px 90px 140px 90px 80px 80px minmax(120px,1fr) minmax(120px,1fr)",gap:0,alignItems:"center"}}>
                <div style={{fontSize:12,fontWeight:800,color:C.textPri}}>TOTAL</div>
                <div /><div /><div /><div />
                <div style={{fontFamily:"Space Mono,monospace",fontSize:12,color:C.accent,fontWeight:700}}>{fmtFull(totalFCNeeded)}</div>
                <div style={{fontFamily:"Space Mono,monospace",fontSize:12,color:C.amber,fontWeight:700}}>{fmtFull(totalRFCNeeded)}</div>
                <div /><div />
              </div>
            </div>
          </div>

          {/* Material Requirements */}
          <div>
            <div className="sec-head">Material requirements (all buildings combined)</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
              {[
                {label:"Fire Crystals", needed:materialTotals.fc,   inv:inv.fireCrystals, color:C.accent},
                {label:"Refined FC",    needed:materialTotals.rfc,  inv:inv.refinedFC,    color:C.amber},
                {label:"Meat",          needed:materialTotals.meat, inv:(inv.meat||0)*(inv.meatUnit==="B"?1e9:1e6),  color:C.green,  raw:true},
                {label:"Wood",          needed:materialTotals.wood, inv:(inv.wood||0)*(inv.woodUnit==="B"?1e9:1e6),  color:C.blue,   raw:true},
                {label:"Coal",          needed:materialTotals.coal, inv:(inv.coal||0)*(inv.coalUnit==="B"?1e9:1e6),  color:C.textSec,raw:true},
                {label:"Iron",          needed:materialTotals.iron, inv:(inv.iron||0)*(inv.ironUnit==="B"?1e9:1e6),  color:C.blue,   raw:true},
              ].map(({label,needed,inv:invAmt,color,raw})=>{
                const balance = invAmt - needed;
                return (
                  <div key={label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px"}}>
                    <div style={{fontSize:9,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",color:C.textSec,fontFamily:"Space Mono,monospace",marginBottom:8}}>{label}</div>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                        <span style={{color:C.textDim}}>Total needed</span>
                        <span style={{fontFamily:"Space Mono,monospace",fontWeight:700,color}}>{needed===0?"—":raw?fmt(needed):fmtFull(needed)}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                        <span style={{color:C.textDim}}>In inventory</span>
                        <span style={{fontFamily:"Space Mono,monospace",fontWeight:700,color:C.textPri}}>{raw?fmt(invAmt):fmtFull(invAmt)}</span>
                      </div>
                      {needed > 0 && (
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginTop:2,paddingTop:4,borderTop:`1px solid ${C.border}`}}>
                          <span style={{color:C.textDim}}>Balance</span>
                          <span style={{fontFamily:"Space Mono,monospace",fontWeight:700,color:balance>=0?C.green:C.red}}>
                            {balance>=0?"+":""}{raw?fmt(balance):fmtFull(balance)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Accumulation breakdown */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <div className="sec-head">FC &amp; RFC accumulation — {daysToSVS} days remaining</div>
              <div className="accum-card">
                <div className="accum-row">
                  <span className="accum-label">{planSnapshot ? "Starting FC (snapshot)" : "Current FC"}</span>
                  <span className="accum-val accent">{fmtFull(fc)}</span>
                </div>
                <div className="accum-row">
                  <span className="accum-label">Daily FC income × {daysToSVS} days</span>
                  <span className="accum-val pos">+{fmtFull(fcAccumulated)}</span>
                </div>
                <div className="accum-row" style={{borderTop:`2px solid ${C.borderHi}`}}>
                  <span className="accum-label" style={{fontWeight:700,color:C.textPri}}>Projected FC at SVS</span>
                  <span className="accum-val accent">{fmtFull(projectedFC)}</span>
                </div>
                <div className="accum-row">
                  <span className="accum-label">Total FC needed</span>
                  <span className="accum-val">{fmtFull(totalFCNeeded)}</span>
                </div>
                <div className="accum-row">
                  <span className="accum-label">FC balance</span>
                  <span className={`accum-val ${fcBalance >= 0 ? "pos" : "neg"}`}>
                    {fcBalance >= 0 ? "+" : ""}{fmtFull(fcBalance)}
                  </span>
                </div>
                <div className="accum-row">
                  <span className="accum-label">{planSnapshot ? "Starting RFC (snapshot)" : "Current RFC"}</span>
                  <span className="accum-val accent">{fmtFull(rfc)}</span>
                </div>
                <div className="accum-row">
                  <span className="accum-label">RFC from refining + intel</span>
                  <span className="accum-val pos">+{fmtFull(rfcAccumulated)}</span>
                </div>
                <div className="accum-row" style={{borderTop:`2px solid ${C.borderHi}`}}>
                  <span className="accum-label" style={{fontWeight:700,color:C.textPri}}>Projected RFC at SVS</span>
                  <span className="accum-val accent">{fmtFull(projectedRFC)}</span>
                </div>
                <div className="accum-row">
                  <span className="accum-label">Total RFC needed</span>
                  <span className="accum-val">{fmtFull(totalRFCNeeded)}</span>
                </div>
                <div className="accum-row">
                  <span className="accum-label">RFC balance</span>
                  <span className={`accum-val ${rfcBalance >= 0 ? "pos" : "neg"}`}>
                    {rfcBalance >= 0 ? "+" : ""}{fmtFull(rfcBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Daily accumulation table */}
            <div>
              <div className="sec-head">Day-by-day accumulation</div>
              <div style={{overflowY:"auto",maxHeight:420,border:`1px solid ${C.border}`,borderRadius:8}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead>
                    <tr style={{background:C.surface,position:"sticky",top:0,zIndex:1}}>
                      <th style={{padding:"6px 8px",textAlign:"left",fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:C.textDim,borderBottom:`1px solid ${C.border}`,fontFamily:"Space Mono,monospace"}}>Day</th>
                      <th style={{padding:"6px 8px",textAlign:"left",fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:C.textDim,borderBottom:`1px solid ${C.border}`,fontFamily:"Space Mono,monospace"}}>Date</th>
                      <th style={{padding:"6px 8px",textAlign:"right",fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:C.textDim,borderBottom:`1px solid ${C.border}`,fontFamily:"Space Mono,monospace"}}>+FC</th>
                      <th style={{padding:"6px 8px",textAlign:"right",fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:C.textDim,borderBottom:`1px solid ${C.border}`,fontFamily:"Space Mono,monospace"}}>Total FC</th>
                      <th style={{padding:"6px 8px",textAlign:"right",fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:C.textDim,borderBottom:`1px solid ${C.border}`,fontFamily:"Space Mono,monospace"}}>+RFC</th>
                      <th style={{padding:"6px 8px",textAlign:"right",fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:C.textDim,borderBottom:`1px solid ${C.border}`,fontFamily:"Space Mono,monospace"}}>Total RFC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accumRows.map(row => (
                      <tr key={row.day}
                        style={{
                          background: row.isToday ? C.accentBg : "transparent",
                          opacity: row.isPast ? 0.45 : 1,
                          borderLeft: row.isToday ? `3px solid ${C.accent}` : "3px solid transparent",
                        }}>
                        <td style={{padding:"5px 8px",fontFamily:"Space Mono,monospace",color: row.isToday ? C.accent : C.textSec,fontWeight:row.isToday?700:400}}>
                          {row.isToday ? "▶ " : ""}{row.day}
                        </td>
                        <td style={{padding:"5px 8px",fontFamily:"Space Mono,monospace",color:C.textDim,fontSize:10}}>{row.date}</td>
                        <td style={{padding:"5px 8px",textAlign:"right",color:C.green,fontFamily:"Space Mono,monospace"}}>+{fmt(row.dailyFC)}</td>
                        <td style={{padding:"5px 8px",textAlign:"right",color:C.accent,fontFamily:"Space Mono,monospace",fontWeight:600}}>{fmt(row.runningFC)}</td>
                        <td style={{padding:"5px 8px",textAlign:"right",color:C.amber,fontFamily:"Space Mono,monospace"}}>+{row.dailyRFC}</td>
                        <td style={{padding:"5px 8px",textAlign:"right",color:C.amber,fontFamily:"Space Mono,monospace",fontWeight:600}}>{fmt(row.runningRFC)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Non-FC Buildings — fixed max-level power */}
          <div>
            <div className="sec-head">Non-FC buildings — fixed power</div>
            <div className="accum-card">
              <div style={{fontSize:10,color:C.textDim,marginBottom:10,
                fontFamily:"Space Mono,monospace",letterSpacing:1}}>
                BUILDINGS CAPPED AT FC 30 — ALWAYS AT MAX LEVEL
              </div>
              {[
                { name:"Hunter's Hut",      level:30, count:1, power:30470  },
                { name:"Sawmill",           level:30, count:1, power:30470  },
                { name:"Coal Mine",         level:30, count:1, power:30470  },
                { name:"Iron Mine",         level:30, count:1, power:30470  },
                { name:"Cookhouse",         level:10, count:1, power:3785   },
                { name:"Clinic",            level:10, count:1, power:3785   },
                { name:"Shelter",           level:10, count:8, power:18168  },
                { name:"Research Center",   level:30, count:1, power:335170 },
                { name:"Storehouse",        level:30, count:1, power:335170 },
              ].map(b => (
                <div key={b.name} style={{display:"flex",alignItems:"center",
                  justifyContent:"space-between",padding:"6px 0",
                  borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                  <div>
                    <span style={{color:C.textPri,fontWeight:600}}>{b.name}</span>
                    <span style={{color:C.textDim,fontSize:10,marginLeft:8,
                      fontFamily:"Space Mono,monospace"}}>
                      Lv.{b.level}{b.count > 1 ? ` ×${b.count}` : ""}
                    </span>
                  </div>
                  <span style={{color:C.accent,fontFamily:"Space Mono,monospace",
                    fontWeight:700}}>{b.power.toLocaleString()}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",marginTop:10,paddingTop:8,
                borderTop:`1px solid ${C.borderHi}`}}>
                <span style={{fontSize:11,fontWeight:700,color:C.textPri,
                  fontFamily:"Space Mono,monospace",letterSpacing:1}}>
                  TOTAL
                </span>
                <span style={{fontSize:14,fontWeight:800,color:C.accent,
                  fontFamily:"Space Mono,monospace"}}>
                  817,958
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
