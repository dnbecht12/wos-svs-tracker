import { useState, useMemo } from "react";
import { buildCycles, getCurrentCycleNum, getCycleStartDate, fmtDate as fmtDateCal, cycleLabelFull } from "./svsCalendar.js";

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
function computeUpgradeFull(building, fromLevel, toLevel) {
  const db = BLDG_DB[building] || BLDG_DB["Infantry"];
  const fromIdx = FC_LEVELS.indexOf(fromLevel);
  const toIdx   = FC_LEVELS.indexOf(toLevel);
  if (fromIdx < 0 || toIdx < 0 || fromIdx >= toIdx)
    return {fc:0,rfc:0,meat:0,wood:0,coal:0,iron:0,mins:0,subLevels:0};

  let fc=0,rfc=0,meat=0,wood=0,coal=0,iron=0,mins=0,subLevels=0;

  for (let i = fromIdx; i < toIdx; i++) {
    const level = FC_LEVELS[i];     // the level we are currently upgrading FROM
    const next  = FC_LEVELS[i + 1]; // the level we are stepping TOWARDS
    const allKeys = SUB_KEYS[level] || [];

    let keys;
    if (i === fromIdx) {
      // At the starting level: skip the base row (index 0), include only .1–.4
      keys = allKeys.slice(1);
    } else {
      // Intermediate level: include all 5 rows (base + .1–.4)
      keys = allKeys;
    }

    // Also include the base row of the NEXT level when it is the final destination
    // (this represents "arriving at" toLevel)
    if (i + 1 === toIdx) {
      const nextBase = (SUB_KEYS[next] || [])[0];
      if (nextBase) keys = [...keys, nextBase];
    }

    keys.forEach(k => {
      const row = db[k];
      if (!row) return;
      fc   += row.fc;
      rfc  += row.rfc;
      meat += row.meat;
      wood += row.wood;
      coal += row.coal;
      iron += row.iron;
      mins += row.mins;
      subLevels++;
    });
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
  return RFC_TIERS.find(t => refineCount >= t.min && refineCount <= t.max) || RFC_TIERS[4];
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

// Colors matching the existing app theme
const C = {
  bg: "#0a0c10", surface: "#111418", card: "#161b22", border: "#21262d",
  borderHi: "#30363d", accent: "#e36b1a", accentDim: "#7d3a0d", accentBg: "#1a1008",
  blue: "#388bfd", blueBg: "#0c1929", blueDim: "#1f4b8c",
  green: "#3fb950", greenBg: "#0a1f0e", greenDim: "#1a5c26",
  red: "#f85149", redBg: "#1f0c0b", redDim: "#7d1f1a",
  amber: "#d29922", amberBg: "#1a1408",
  teal: "#2ea8b0", tealBg: "#0a1e20",
  textPri: "#e6edf3", textSec: "#8b949e", textDim: "#484f58",
};

const fmt = n => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1000000) return (n/1000000).toFixed(2)+"M";
  if (abs >= 1000) return (n/1000).toFixed(1)+"K";
  return Math.round(n).toLocaleString();
};

const fmtFull = n => typeof n === "number" ? Math.round(n).toLocaleString() : "—";

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
.cp-wrap{font-family:'Syne',sans-serif;color:${C.textPri};background:${C.bg};min-height:100vh;padding:0}
.cp-topbar{background:${C.surface};border-bottom:1px solid ${C.border};padding:20px 28px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.cp-title{font-size:20px;font-weight:800}
.cp-title span{color:${C.accent}}
.cp-subtitle{font-size:12px;color:${C.textSec};margin-top:3px}
.cp-body{padding:24px 28px;display:flex;flex-direction:column;gap:20px}
/* Summary bar */
.summary-bar{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.s-tile{background:${C.card};border:1px solid ${C.border};border-radius:10px;padding:12px 14px}
.s-tile:hover{border-color:${C.borderHi}}
.s-label{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${C.textDim};font-family:'Space Mono',monospace;margin-bottom:6px}
.s-val{font-size:22px;font-weight:800;font-family:'Space Mono',monospace;line-height:1}
.s-val.accent{color:${C.accent}}
.s-val.green{color:${C.green}}
.s-val.red{color:${C.red}}
.s-val.amber{color:${C.amber}}
.s-val.teal{color:${C.teal}}
.s-sub{font-size:10px;color:${C.textDim};margin-top:4px;font-family:'Space Mono',monospace}
/* Sections */
.sec-head{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.textDim};display:flex;align-items:center;gap:8px;margin-bottom:12px}
.sec-head::after{content:'';flex:1;height:1px;background:${C.border}}
/* Settings panel */
.settings-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
.inp-group{display:flex;flex-direction:column;gap:5px}
.inp-label{font-size:11px;font-weight:600;color:${C.textSec};letter-spacing:0.5px}
.inp-field{background:${C.surface};border:1px solid ${C.border};border-radius:7px;padding:8px 11px;font-family:'Space Mono',monospace;font-size:13px;color:${C.textPri};outline:none;width:100%;transition:border-color 0.15s}
.inp-field:focus{border-color:${C.accent}}
.inp-field option{background:${C.card};color:${C.textPri}}
/* Building table */
.bld-table{background:${C.card};border:1px solid ${C.border};border-radius:12px;overflow:hidden}
.bld-thead{display:grid;grid-template-columns:140px 100px 100px 80px 80px 70px 1fr 1fr;gap:0;border-bottom:1px solid ${C.border};background:${C.surface}}
.bld-thead .th{padding:9px 12px;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${C.textDim};font-family:'Space Mono',monospace;white-space:nowrap}
.bld-row-wrap{border-bottom:1px solid ${C.border}}
.bld-row-wrap:last-child{border-bottom:none}
.bld-row{display:grid;grid-template-columns:140px 100px 100px 80px 80px 70px 1fr 1fr;gap:0;align-items:center;transition:background 0.1s}
.bld-row:hover{background:rgba(255,255,255,0.02)}
.bld-cell{padding:11px 12px;font-size:13px;color:${C.textSec};vertical-align:middle}
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
.badge-teal{background:${C.tealBg};color:${C.teal}}
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
.accum-label{color:${C.textSec}}
.accum-val{font-family:'Space Mono',monospace;font-size:12px;color:${C.textPri};font-weight:700}
.accum-val.pos{color:${C.green}}
.accum-val.neg{color:${C.red}}
.accum-val.accent{color:${C.accent}}
/* Timeline */
.timeline{display:flex;gap:2px;margin-top:8px}
.tl-seg{height:8px;border-radius:2px;transition:width 0.4s ease}
/* Time sub-row */
.time-row{background:rgba(56,139,253,0.04);border-top:1px solid ${C.border};padding:7px 12px;display:flex;gap:24px;flex-wrap:wrap;align-items:center}
.time-lbl{font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:${C.textDim};font-family:'Space Mono',monospace;min-width:160px}
.time-val{font-size:12px;font-weight:700;font-family:'Space Mono',monospace}
.time-orig{color:${C.textSec}}
.time-actual{color:${C.green}}
/* Tooltip-like note */
.note-box{background:${C.accentBg};border:1px solid ${C.accentDim};border-radius:8px;padding:10px 14px;font-size:12px;color:${C.textSec};line-height:1.6}
.note-box strong{color:${C.accent}}
/* Responsive */
@media(max-width:900px){
  .bld-thead,.bld-row{grid-template-columns:120px 80px 80px 70px 70px 60px 1fr 1fr}
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

const BUILDINGS_LIST = [
  "Furnace","Embassy","Infantry","Marksman","Lancer","Command","Infirmary","War Academy"
];

const BUILDING_KEY = b => b === "Infantry" ? "Infantry" : b === "Marksman" ? "Marksman"
  : b === "Lancer" ? "Lancer" : b === "War Academy" ? "War Academy" : b;

const DEFAULT_BUILDINGS = [
  { name:"Furnace",     current:"FC1", goal:"FC1" },
  { name:"Embassy",     current:"FC1", goal:"FC1" },
  { name:"Infantry",    current:"FC1", goal:"FC1" },
  { name:"Marksman",    current:"FC1", goal:"FC1" },
  { name:"Lancer",      current:"FC1", goal:"FC1" },
  { name:"Command",     current:"FC1", goal:"FC1" },
  { name:"Infirmary",   current:"FC1", goal:"FC1" },
  { name:"War Academy", current:"FC1", goal:"FC1" },
];

// Load from localStorage or use defaults
function loadState(key, fallback) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
  catch { return fallback; }
}
function saveState(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export default function ConstructionPlanner({ inv, setInv }) {
  // Cycle selector linked to SvS Calendar
  const currentCycle = useMemo(() => getCurrentCycleNum(), []);
  const cycleOpts    = useMemo(() => buildCycles(Math.max(1, currentCycle - 1), 16), [currentCycle]);
  const [selectedCycle, setSelectedCycle] = useState(() => loadState("cp-cycle", currentCycle));

  // Derive daysToSVS from cycle: SvS week starts day 22 (Mon of wk4), plan starts day 1 (Mon of wk1)
  // So daysToSVS = 21 (days from start of Prep1 to start of SvS week Monday)
  const daysToSVS = 21;

  // Start date display (Prep1 Monday of selected cycle)
  const cycleStartDate = useMemo(() => {
    const d = getCycleStartDate(selectedCycle);
    return fmtDateCal(d);
  }, [selectedCycle]);

  // Per-building current/goal selections
  const [buildings, setBuildings] = useState(() =>
    loadState("cp-buildings", DEFAULT_BUILDINGS)
  );

  // FC and RFC come from shared inv prop — changes sync back via setInv
  const fc  = inv?.fireCrystals ?? 0;
  const rfc = inv?.refinedFC    ?? 0;
  const setFC  = (val) => setInv(p => ({ ...p, fireCrystals: val }));
  const setRFC = (val) => setInv(p => ({ ...p, refinedFC:    val }));
  const [dailyFCIncome, setDailyFCIncome] = useState(() => loadState("cp-dailyfc", 48));
  const [agnesLevel, setAgnesLevel] = useState(() => loadState("cp-agnes", 8));
  const [valeriaMult, setValeriaMult] = useState(() => loadState("cp-valeria", 0.18));

  // Single construction speed bonus — user enters e.g. "91.5" meaning 91.5%
  const [speedBuff, setSpeedBuff] = useState(() => loadState("cp-speedbuff", 91.5));

  // Keep pet, chiefOrder, presSkill, presPos as toggles (4 remaining)
  const [buffs, setBuffs] = useState(() => loadState("cp-buffs", {
    pet: true, chiefOrder: true, presSkill: true, presPos: true,
  }));

  function toggleBuff(k) {
    const next = { ...buffs, [k]: !buffs[k] };
    setBuffs(next); saveState("cp-buffs", next);
  }

  // buffTotal = speedBuff% + remaining toggles
  const buffTotal = useMemo(() => {
    let t = speedBuff / 100;
    if (buffs.pet)        t += 0.15;
    if (buffs.chiefOrder) t += 0.2;
    if (buffs.presSkill)  t += 0.1;
    if (buffs.presPos)    t += 0.1;
    return t;
  }, [speedBuff, buffs]);

  // Accumulation of RFC over daysToSVS based on daily FC income and refine tiers
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

  // FC accumulated over daysToSVS from daily income
  const fcAccumulated = useMemo(() => Math.round(dailyFCIncome * daysToSVS), [dailyFCIncome, daysToSVS]);

  // Per-building computed costs — all from BLDG_DB (accurate spreadsheet data)
  const buildingCalcs = useMemo(() => {
    return buildings.map(b => {
      const key = BUILDING_KEY(b.name);
      const full = computeUpgradeFull(key, b.current, b.goal);
      return { ...b, fcCost: full.fc, rfcCost: full.rfc, subLevels: full.subLevels,
               meat: full.meat, wood: full.wood, coal: full.coal, iron: full.iron,
               baseMins: full.mins };
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
  const svsMonPts  = Math.round((totalFCNeeded > 0 ? Math.min(projectedFC, totalFCNeeded) : 0) * SvS_FC_POINTS_PER_FC * (1 + valeriaMult));
  const svsRfcPts  = Math.round(Math.min(projectedRFC, totalRFCNeeded) * SVS_RFC_POINTS_PER_RFC * (1 + valeriaMult));
  const svsTotalPts = svsMonPts + svsRfcPts;

  function updateBuilding(idx, field, val) {
    const next = buildings.map((b, i) => {
      if (i !== idx) return b;
      const updated = { ...b, [field]: val };
      // Clamp: goal can't be lower than current
      if (field === "current") {
        const ci = FC_LEVELS.indexOf(val);
        const gi = FC_LEVELS.indexOf(updated.goal);
        if (gi < ci) updated.goal = val;
      }
      return updated;
    });
    setBuildings(next);
    saveState("cp-buildings", next);
  }

  const persist = (setter, key) => (val) => { setter(val); saveState(key, val); };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="cp-wrap">

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
              <span style={{fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:C.textDim,fontFamily:"Space Mono,monospace"}}>SvS Cycle</span>
              <select
                value={selectedCycle}
                onChange={e => { const v=Number(e.target.value); setSelectedCycle(v); saveState("cp-cycle",v); }}
                style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 10px",fontFamily:"Space Mono,monospace",fontSize:12,color:C.accent,outline:"none",cursor:"pointer"}}>
                {cycleOpts.map(c => (
                  <option key={c.cycleNum} value={c.cycleNum}>
                    {cycleLabelFull(c.cycleNum, cycleOpts)}{c.cycleNum === currentCycle ? " ★" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              <span style={{fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:C.textDim,fontFamily:"Space Mono,monospace"}}>Plan starts</span>
              <span style={{fontFamily:"Space Mono,monospace",fontSize:12,color:C.textSec,padding:"5px 0"}}>{cycleStartDate}</span>
            </div>
          </div>
        </div>

        <div className="cp-body">

          {/* Summary tiles */}
          <div className="summary-bar">
            <div className="s-tile">
              <div className="s-label">FC now</div>
              <div className="s-val accent">{fmt(fc)}</div>
              <div className="s-sub">+{fmt(fcAccumulated)} in {daysToSVS}d</div>
            </div>
            <div className="s-tile">
              <div className="s-label">FC projected</div>
              <div className="s-val accent">{fmt(projectedFC)}</div>
              <div className="s-sub">at SVS day</div>
            </div>
            <div className="s-tile">
              <div className="s-label">FC needed</div>
              <div className="s-val" style={{color:C.textPri}}>{fmt(totalFCNeeded)}</div>
              <div className="s-sub">all planned upgrades</div>
            </div>
            <div className="s-tile">
              <div className="s-label">FC balance</div>
              <div className={`s-val ${fcBalance >= 0 ? "green" : "red"}`}>{fcBalance >= 0 ? "+":""}{fmt(fcBalance)}</div>
              <div className="s-sub">{fcBalance >= 0 ? "sufficient" : "shortfall"}</div>
            </div>
            <div className="s-tile">
              <div className="s-label">RFC projected</div>
              <div className="s-val amber">{fmt(projectedRFC)}</div>
              <div className="s-sub">+{fmt(rfcAccumulated)} refining</div>
            </div>
            <div className="s-tile">
              <div className="s-label">RFC balance</div>
              <div className={`s-val ${rfcBalance >= 0 ? "green" : "red"}`}>{rfcBalance >= 0 ? "+":""}{fmt(rfcBalance)}</div>
              <div className="s-sub">{rfcBalance >= 0 ? "on track" : "need more"}</div>
            </div>
            <div className="s-tile">
              <div className="s-label">Est. SVS pts</div>
              <div className="s-val teal">{fmt(svsTotalPts)}</div>
              <div className="s-sub">construction only</div>
            </div>
            <div className="s-tile">
              <div className="s-label">Build buff</div>
              <div className="s-val" style={{color:C.textPri,fontSize:18}}>{(buffTotal*100).toFixed(0)}%</div>
              <div className="s-sub">time reduction</div>
            </div>
          </div>

          {/* Inventory & Accumulation Settings */}
          <div>
            <div className="sec-head">Inventory &amp; accumulation settings</div>
            <div className="settings-grid">
              <div className="inp-group">
                <label className="inp-label">Current FC</label>
                <input className="inp-field" type="number" value={fc} min={0}
                  onChange={e => setFC(Number(e.target.value))} />
              </div>
              <div className="inp-group">
                <label className="inp-label">Current Refined FC</label>
                <input className="inp-field" type="number" value={rfc} min={0}
                  onChange={e => setRFC(Number(e.target.value))} />
              </div>
              <div className="inp-group">
                <label className="inp-label">Daily FC income</label>
                <input className="inp-field" type="number" value={dailyFCIncome} min={0}
                  onChange={e => persist(setDailyFCIncome,"cp-dailyfc")(Number(e.target.value))} />
              </div>
              <div className="inp-group">
                <label className="inp-label">Agnes skill level (1–8)</label>
                <select className="inp-field" value={agnesLevel}
                  onChange={e => persist(setAgnesLevel,"cp-agnes")(Number(e.target.value))}>
                  {[1,2,3,4,5,6,7,8].map(l => <option key={l} value={l}>Level {l} ({l} hrs off/build)</option>)}
                </select>
              </div>
              <div className="inp-group">
                <label className="inp-label">Valeria point skill</label>
                <select className="inp-field" value={valeriaMult}
                  onChange={e => persist(setValeriaMult,"cp-valeria")(Number(e.target.value))}>
                  {[0,0.06,0.12,0.18,0.24,0.30].map(v => <option key={v} value={v}>{v===0?"Off":"+"+Math.round(v*100)+"%"}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Construction buffs */}
          <div>
            <div className="sec-head">Construction buffs (time reduction)</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:10,alignItems:"flex-end"}}>
              {/* Primary: user-entered overview total */}
              <div style={{display:"flex",flexDirection:"column",gap:5,minWidth:260}}>
                <label className="inp-label">Bonus Overview Total — Construction Speed (%)</label>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <input
                    className="inp-field"
                    type="number" min={0} max={500} step={0.5}
                    value={speedBuff}
                    onChange={e => { const v=Number(e.target.value); setSpeedBuff(v); saveState("cp-speedbuff",v); }}
                    style={{width:100,textAlign:"right"}}
                  />
                  <span style={{fontSize:12,color:C.textDim,fontFamily:"Space Mono,monospace"}}>%</span>
                  <span style={{fontSize:11,color:C.textSec}}>e.g. enter 91.5 for 91.5% speed</span>
                </div>
              </div>
              {/* Remaining toggles */}
              {[
                {k:"pet",        label:"Pet",          val:"15%"},
                {k:"chiefOrder", label:"Chief Order",  val:"20%"},
                {k:"presSkill",  label:"Pres Skill",   val:"10%"},
                {k:"presPos",    label:"Pres Position",val:"10%"},
              ].map(b => (
                <button key={b.k}
                  onClick={() => toggleBuff(b.k)}
                  style={{
                    padding:"7px 13px",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",
                    fontFamily:"Syne,sans-serif",transition:"all 0.15s",
                    background: buffs[b.k] ? C.greenBg : C.surface,
                    color:      buffs[b.k] ? C.green   : C.textDim,
                    border:     `1px solid ${buffs[b.k] ? C.greenDim : C.border}`,
                  }}>
                  {b.label} +{b.val}
                </button>
              ))}
            </div>
            <div style={{marginTop:10,fontSize:12,color:C.textSec}}>
              Total construction speed bonus: <span style={{color:C.green,fontFamily:"Space Mono,monospace",fontWeight:700}}>{(buffTotal*100).toFixed(1)}%</span>
              {" · "}Actual time = base time ÷ (1 + {(buffTotal*100).toFixed(1)}%)
            </div>
          </div>

          {/* Building planner table */}
          <div>
            <div className="sec-head">Building upgrade planner</div>
            <div className="bld-table">
              <div className="bld-thead" style={{gridTemplateColumns:"140px 100px 100px 80px 80px 70px 1fr 1fr"}}>
                <div className="th">Building</div>
                <div className="th">Current level</div>
                <div className="th">Goal level</div>
                <div className="th">FC cost</div>
                <div className="th">RFC cost</div>
                <div className="th">Sub-levels</div>
                <div className="th">Original build time</div>
                <div className="th">Actual build time</div>
              </div>

              {buildingCalcs.map((b, idx) => {
                const isDone = b.current === b.goal;
                const goalOptions = FC_LEVEL_OPTS.filter(l => FC_LEVELS.indexOf(l) >= FC_LEVELS.indexOf(b.current));
                const actualMins = b.baseMins > 0 ? Math.round(b.baseMins / (1 + buffTotal)) : 0;

                return (
                  <div className="bld-row-wrap" key={b.name}>
                    <div className="bld-row" style={{gridTemplateColumns:"140px 100px 100px 80px 80px 70px 1fr 1fr"}}>
                      <div className="bld-cell name">{b.name}</div>

                      {/* Current dropdown */}
                      <div className="bld-cell">
                        <select value={b.current} onChange={e => updateBuilding(idx,"current",e.target.value)}>
                          {FC_LEVEL_OPTS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>

                      {/* Goal dropdown */}
                      <div className="bld-cell">
                        <select value={b.goal} onChange={e => updateBuilding(idx,"goal",e.target.value)}>
                          {goalOptions.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>

                      <div className="bld-cell">
                        <span className="cost-fc">{isDone ? "—" : fmtFull(b.fcCost)}</span>
                      </div>
                      <div className="bld-cell">
                        <span className="cost-rfc">{isDone ? "—" : fmtFull(b.rfcCost)}</span>
                      </div>
                      <div className="bld-cell mono" style={{color:C.textSec}}>{isDone ? "—" : b.subLevels}</div>

                      {/* Original build time */}
                      <div className="bld-cell mono" style={{color:C.textSec}}>
                        {isDone || !b.baseMins ? "—" : fmtMins(b.baseMins)}
                      </div>

                      {/* Actual build time */}
                      <div className="bld-cell mono" style={{color:C.green,fontWeight:700}}>
                        {isDone || !b.baseMins ? "—" : fmtMins(actualMins)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Totals footer */}
              <div style={{background:C.surface,borderTop:`2px solid ${C.borderHi}`,padding:"11px 12px",display:"grid",gridTemplateColumns:"140px 100px 100px 80px 80px 70px 1fr 1fr",gap:0,alignItems:"center"}}>
                <div style={{fontSize:12,fontWeight:800,color:C.textPri}}>TOTAL</div>
                <div /><div />
                <div style={{fontFamily:"Space Mono,monospace",fontSize:12,color:C.accent,fontWeight:700}}>{fmtFull(totalFCNeeded)}</div>
                <div style={{fontFamily:"Space Mono,monospace",fontSize:12,color:C.amber,fontWeight:700}}>{fmtFull(totalRFCNeeded)}</div>
                <div /><div /><div />
              </div>
            </div>
          </div>

          {/* Material Requirements */}
          <div>
            <div className="sec-head">Material requirements (all buildings combined)</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
              {[
                {label:"Fire Crystals", value:materialTotals.fc,   color:C.accent,  unit:"FC"},
                {label:"Refined FC",    value:materialTotals.rfc,  color:C.amber,   unit:"RFC"},
                {label:"Meat",          value:materialTotals.meat, color:C.green,   unit:"M"},
                {label:"Wood",          value:materialTotals.wood, color:C.teal,    unit:"M"},
                {label:"Coal",          value:materialTotals.coal, color:C.textSec, unit:"M"},
                {label:"Iron",          value:materialTotals.iron, color:C.blue,    unit:"M"},
              ].map(({label,value,color,unit})=>(
                <div key={label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px"}}>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",color:C.textDim,fontFamily:"Space Mono,monospace",marginBottom:5}}>{label}</div>
                  <div style={{fontSize:unit==="FC"||unit==="RFC"?20:18,fontWeight:800,fontFamily:"Space Mono,monospace",lineHeight:1,color}}>
                    {value===0?"—":unit==="M"?fmt(value):fmtFull(value)}
                  </div>
                  <div style={{fontSize:9,color:C.textDim,marginTop:4,fontFamily:"Space Mono,monospace"}}>{unit==="M"?"total materials":unit==="FC"?"fire crystals":"refined FC"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Accumulation breakdown */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <div className="sec-head">FC &amp; RFC accumulation over {daysToSVS} days</div>
              <div className="accum-card">
                <div className="accum-row">
                  <span className="accum-label">Current FC</span>
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
                  <span className="accum-label">Current RFC</span>
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

            {/* RFC tier info */}
            <div>
              <div className="sec-head">Refine tier status</div>
              <div className="accum-card">
                <div className="accum-row" style={{paddingBottom:12,borderBottom:`1px solid ${C.border}`}}>
                  <span className="accum-label">RFC/day from refining</span>
                  <span className="accum-val">{Math.round((dailyFCIncome / getRFCTier(1).fcPer) * getRFCTier(1).rfcPer)}</span>
                </div>
                <div style={{marginTop:14}}>
                  <div style={{fontSize:10,color:C.textDim,marginBottom:8,fontFamily:"Space Mono,monospace",letterSpacing:1}}>REFINE TIER TABLE</div>
                  {RFC_TIERS.map(t => (
                    <div key={t.tier} style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                      <span style={{width:24,fontFamily:"Space Mono,monospace",fontWeight:700,color:C.textDim}}>{t.tier}</span>
                      <span style={{color:C.textDim,fontSize:10,fontFamily:"Space Mono,monospace",width:60}}>#{t.min}–{t.max}</span>
                      <span style={{color:C.accent,fontFamily:"Space Mono,monospace"}}>{t.fcPer} FC</span>
                      <span style={{color:C.textDim,fontSize:10}}>→</span>
                      <span style={{color:C.amber,fontFamily:"Space Mono,monospace"}}>{t.rfcPer} RFC</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SVS point projections */}
          <div>
            <div className="sec-head">Projected SVS points — construction only</div>
            <div className="svs-grid">
              <div className="svs-day-card svs-active">
                <div className="svs-day-name">Monday (FC burns)</div>
                <div className="svs-pts-val">{fmt(svsMonPts)}</div>
                <div className="svs-pts-sub">main construction day</div>
              </div>
              <div className="svs-day-card svs-active">
                <div className="svs-day-name">Monday (RFC burns)</div>
                <div className="svs-pts-val">{fmt(svsRfcPts)}</div>
                <div className="svs-pts-sub">refinement pts</div>
              </div>
              <div className="svs-day-card">
                <div className="svs-day-name">Total construction</div>
                <div className="svs-pts-val">{fmt(svsTotalPts)}</div>
                <div className="svs-pts-sub">Valeria +{Math.round(valeriaMult*100)}% applied</div>
              </div>
              <div className="svs-day-card">
                <div className="svs-day-name">FC burn rate</div>
                <div className="svs-pts-val" style={{color:C.blue}}>{fmt(Math.round(SvS_FC_POINTS_PER_FC*(1+valeriaMult)))}</div>
                <div className="svs-pts-sub">pts per FC burned</div>
              </div>
              <div className="svs-day-card">
                <div className="svs-day-name">FC available SVS day</div>
                <div className="svs-pts-val" style={{color:C.textPri}}>{fmt(projectedFC)}</div>
                <div className="svs-pts-sub">{fcBalance >= 0 ? `${fmt(fcBalance)} surplus` : `${fmt(Math.abs(fcBalance))} short`}</div>
              </div>
            </div>
            <div className="note-box" style={{marginTop:12}}>
              <strong>Note:</strong> Points shown are for construction FC burns only. Add Expert Sigils (~25,700 pts Tue/Wed),
              Hero Gear upgrades, and WA upgrades to get your full SvS total.
              Valeria's point skill ({Math.round(valeriaMult*100)}%) is applied to all construction points above.
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
