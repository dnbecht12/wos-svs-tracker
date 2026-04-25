import React, { useState, useCallback, useMemo, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// DATA — embedded directly from wos-simulator assets (concepts ported to JS)
// ─────────────────────────────────────────────────────────────────────────────

const TROOP_STATS = {"infantry_t1":{"type":"infantry","tier":1,"fc":0,"atk":63,"def":10,"leth":10,"hp":189},"infantry_t1_fc1":{"type":"infantry","tier":1,"fc":1,"atk":66,"def":10,"leth":10,"hp":197},"infantry_t1_fc2":{"type":"infantry","tier":1,"fc":2,"atk":69,"def":10,"leth":10,"hp":206},"infantry_t1_fc3":{"type":"infantry","tier":1,"fc":3,"atk":72,"def":10,"leth":10,"hp":217},"infantry_t1_fc4":{"type":"infantry","tier":1,"fc":4,"atk":76,"def":10,"leth":10,"hp":228},"infantry_t1_fc5":{"type":"infantry","tier":1,"fc":5,"atk":80,"def":10,"leth":10,"hp":239},"infantry_t2":{"type":"infantry","tier":2,"fc":0,"atk":94,"def":10,"leth":10,"hp":283},"infantry_t2_fc1":{"type":"infantry","tier":2,"fc":1,"atk":98,"def":10,"leth":10,"hp":294},"infantry_t2_fc2":{"type":"infantry","tier":2,"fc":2,"atk":103,"def":10,"leth":10,"hp":309},"infantry_t2_fc3":{"type":"infantry","tier":2,"fc":3,"atk":108,"def":10,"leth":10,"hp":324},"infantry_t2_fc4":{"type":"infantry","tier":2,"fc":4,"atk":113,"def":10,"leth":10,"hp":341},"infantry_t2_fc5":{"type":"infantry","tier":2,"fc":5,"atk":119,"def":10,"leth":10,"hp":358},"infantry_t3":{"type":"infantry","tier":3,"fc":0,"atk":132,"def":10,"leth":10,"hp":397},"infantry_t3_fc1":{"type":"infantry","tier":3,"fc":1,"atk":137,"def":10,"leth":10,"hp":413},"infantry_t3_fc2":{"type":"infantry","tier":3,"fc":2,"atk":144,"def":10,"leth":10,"hp":434},"infantry_t3_fc3":{"type":"infantry","tier":3,"fc":3,"atk":151,"def":10,"leth":10,"hp":455},"infantry_t3_fc4":{"type":"infantry","tier":3,"fc":4,"atk":159,"def":10,"leth":10,"hp":478},"infantry_t3_fc5":{"type":"infantry","tier":3,"fc":5,"atk":167,"def":10,"leth":10,"hp":502},"infantry_t4":{"type":"infantry","tier":4,"fc":0,"atk":172,"def":10,"leth":10,"hp":516},"infantry_t4_fc1":{"type":"infantry","tier":4,"fc":1,"atk":179,"def":10,"leth":10,"hp":537},"infantry_t4_fc2":{"type":"infantry","tier":4,"fc":2,"atk":188,"def":10,"leth":10,"hp":563},"infantry_t4_fc3":{"type":"infantry","tier":4,"fc":3,"atk":197,"def":10,"leth":10,"hp":592},"infantry_t4_fc4":{"type":"infantry","tier":4,"fc":4,"atk":207,"def":10,"leth":10,"hp":621},"infantry_t4_fc5":{"type":"infantry","tier":4,"fc":5,"atk":217,"def":10,"leth":10,"hp":652},"infantry_t5":{"type":"infantry","tier":5,"fc":0,"atk":206,"def":10,"leth":10,"hp":619},"infantry_t5_fc1":{"type":"infantry","tier":5,"fc":1,"atk":214,"def":10,"leth":10,"hp":644},"infantry_t5_fc2":{"type":"infantry","tier":5,"fc":2,"atk":225,"def":10,"leth":10,"hp":676},"infantry_t5_fc3":{"type":"infantry","tier":5,"fc":3,"atk":236,"def":10,"leth":10,"hp":710},"infantry_t5_fc4":{"type":"infantry","tier":5,"fc":4,"atk":248,"def":10,"leth":10,"hp":745},"infantry_t5_fc5":{"type":"infantry","tier":5,"fc":5,"atk":260,"def":10,"leth":10,"hp":782},"infantry_t6":{"type":"infantry","tier":6,"fc":0,"atk":243,"def":10,"leth":10,"hp":730},"infantry_t6_fc1":{"type":"infantry","tier":6,"fc":1,"atk":253,"def":10,"leth":10,"hp":759},"infantry_t6_fc2":{"type":"infantry","tier":6,"fc":2,"atk":265,"def":10,"leth":10,"hp":797},"infantry_t6_fc3":{"type":"infantry","tier":6,"fc":3,"atk":279,"def":10,"leth":10,"hp":837},"infantry_t6_fc4":{"type":"infantry","tier":6,"fc":4,"atk":293,"def":10,"leth":10,"hp":879},"infantry_t6_fc5":{"type":"infantry","tier":6,"fc":5,"atk":307,"def":10,"leth":10,"hp":923},"infantry_t7":{"type":"infantry","tier":7,"fc":0,"atk":287,"def":10,"leth":10,"hp":862},"infantry_t7_fc1":{"type":"infantry","tier":7,"fc":1,"atk":298,"def":10,"leth":10,"hp":896},"infantry_t7_fc2":{"type":"infantry","tier":7,"fc":2,"atk":313,"def":10,"leth":10,"hp":941},"infantry_t7_fc3":{"type":"infantry","tier":7,"fc":3,"atk":329,"def":10,"leth":10,"hp":988},"infantry_t7_fc4":{"type":"infantry","tier":7,"fc":4,"atk":346,"def":10,"leth":10,"hp":1038},"infantry_t7_fc5":{"type":"infantry","tier":7,"fc":5,"atk":363,"def":10,"leth":10,"hp":1090},"infantry_t8":{"type":"infantry","tier":8,"fc":0,"atk":339,"def":10,"leth":10,"hp":1017},"infantry_t8_fc1":{"type":"infantry","tier":8,"fc":1,"atk":353,"def":10,"leth":10,"hp":1058},"infantry_t8_fc2":{"type":"infantry","tier":8,"fc":2,"atk":370,"def":10,"leth":10,"hp":1111},"infantry_t8_fc3":{"type":"infantry","tier":8,"fc":3,"atk":389,"def":10,"leth":10,"hp":1166},"infantry_t8_fc4":{"type":"infantry","tier":8,"fc":4,"atk":408,"def":10,"leth":10,"hp":1224},"infantry_t8_fc5":{"type":"infantry","tier":8,"fc":5,"atk":429,"def":10,"leth":10,"hp":1286},"infantry_t9":{"type":"infantry","tier":9,"fc":0,"atk":400,"def":10,"leth":10,"hp":1200},"infantry_t9_fc1":{"type":"infantry","tier":9,"fc":1,"atk":416,"def":10,"leth":10,"hp":1248},"infantry_t9_fc2":{"type":"infantry","tier":9,"fc":2,"atk":437,"def":10,"leth":10,"hp":1310},"infantry_t9_fc3":{"type":"infantry","tier":9,"fc":3,"atk":459,"def":10,"leth":10,"hp":1376},"infantry_t9_fc4":{"type":"infantry","tier":9,"fc":4,"atk":482,"def":10,"leth":10,"hp":1445},"infantry_t9_fc5":{"type":"infantry","tier":9,"fc":5,"atk":506,"def":10,"leth":10,"hp":1517},"infantry_t10":{"type":"infantry","tier":10,"fc":0,"atk":472,"def":10,"leth":10,"hp":1416},"infantry_t10_fc1":{"type":"infantry","tier":10,"fc":1,"atk":491,"def":10,"leth":10,"hp":1473},"infantry_t10_fc2":{"type":"infantry","tier":10,"fc":2,"atk":515,"def":10,"leth":10,"hp":1546},"infantry_t10_fc3":{"type":"infantry","tier":10,"fc":3,"atk":541,"def":10,"leth":10,"hp":1624},"infantry_t10_fc4":{"type":"infantry","tier":10,"fc":4,"atk":568,"def":10,"leth":10,"hp":1705},"infantry_t10_fc5":{"type":"infantry","tier":10,"fc":5,"atk":597,"def":10,"leth":10,"hp":1790},"infantry_t10_fc6":{"type":"infantry","tier":10,"fc":6,"atk":627,"def":10,"leth":10,"hp":1880},"infantry_t10_fc7":{"type":"infantry","tier":10,"fc":7,"atk":658,"def":10,"leth":10,"hp":1974},"infantry_t10_fc8":{"type":"infantry","tier":10,"fc":8,"atk":691,"def":10,"leth":10,"hp":2073},"infantry_t11":{"type":"infantry","tier":11,"fc":0,"atk":520,"def":10,"leth":10,"hp":1561},"infantry_t11_fc1":{"type":"infantry","tier":11,"fc":1,"atk":541,"def":10,"leth":10,"hp":1624},"infantry_t11_fc2":{"type":"infantry","tier":11,"fc":2,"atk":568,"def":10,"leth":10,"hp":1704},"infantry_t11_fc3":{"type":"infantry","tier":11,"fc":3,"atk":596,"def":10,"leth":10,"hp":1790},"infantry_t11_fc4":{"type":"infantry","tier":11,"fc":4,"atk":626,"def":10,"leth":10,"hp":1880},"infantry_t11_fc5":{"type":"infantry","tier":11,"fc":5,"atk":658,"def":10,"leth":10,"hp":1973},"infantry_t11_fc6":{"type":"infantry","tier":11,"fc":6,"atk":691,"def":10,"leth":10,"hp":2072},"infantry_t11_fc7":{"type":"infantry","tier":11,"fc":7,"atk":726,"def":10,"leth":10,"hp":2176},"infantry_t11_fc8":{"type":"infantry","tier":11,"fc":8,"atk":762,"def":10,"leth":10,"hp":2285},"lancer_t10_fc6":{"type":"lancer","tier":10,"fc":6,"atk":1880,"def":10,"leth":10,"hp":627},"lancer_t10_fc7":{"type":"lancer","tier":10,"fc":7,"atk":1974,"def":10,"leth":10,"hp":658},"lancer_t10_fc8":{"type":"lancer","tier":10,"fc":8,"atk":2073,"def":10,"leth":10,"hp":691},"lancer_t11_fc6":{"type":"lancer","tier":11,"fc":6,"atk":2072,"def":10,"leth":10,"hp":691},"lancer_t11_fc7":{"type":"lancer","tier":11,"fc":7,"atk":2176,"def":10,"leth":10,"hp":726},"lancer_t11_fc8":{"type":"lancer","tier":11,"fc":8,"atk":2285,"def":10,"leth":10,"hp":762},"marksman_t10_fc6":{"type":"marksman","tier":10,"fc":6,"atk":2506,"def":10,"leth":10,"hp":470},"marksman_t10_fc7":{"type":"marksman","tier":10,"fc":7,"atk":2631,"def":10,"leth":10,"hp":494},"marksman_t10_fc8":{"type":"marksman","tier":10,"fc":8,"atk":2763,"def":10,"leth":10,"hp":519},"marksman_t11_fc6":{"type":"marksman","tier":11,"fc":6,"atk":2764,"def":10,"leth":10,"hp":519},"marksman_t11_fc7":{"type":"marksman","tier":11,"fc":7,"atk":2902,"def":10,"leth":10,"hp":545},"marksman_t11_fc8":{"type":"marksman","tier":11,"fc":8,"atk":3047,"def":10,"leth":10,"hp":572},"lancer_t1":{"type":"lancer","tier":1,"fc":0,"atk":189,"def":10,"leth":10,"hp":63},"marksman_t1":{"type":"marksman","tier":1,"fc":0,"atk":252,"def":10,"leth":10,"hp":47},"lancer_t1_fc1":{"type":"lancer","tier":1,"fc":1,"atk":197,"def":10,"leth":10,"hp":66},"marksman_t1_fc1":{"type":"marksman","tier":1,"fc":1,"atk":262,"def":10,"leth":10,"hp":49},"lancer_t1_fc2":{"type":"lancer","tier":1,"fc":2,"atk":206,"def":10,"leth":10,"hp":69},"marksman_t1_fc2":{"type":"marksman","tier":1,"fc":2,"atk":275,"def":10,"leth":10,"hp":51},"lancer_t1_fc3":{"type":"lancer","tier":1,"fc":3,"atk":217,"def":10,"leth":10,"hp":72},"marksman_t1_fc3":{"type":"marksman","tier":1,"fc":3,"atk":289,"def":10,"leth":10,"hp":54},"lancer_t1_fc4":{"type":"lancer","tier":1,"fc":4,"atk":228,"def":10,"leth":10,"hp":76},"marksman_t1_fc4":{"type":"marksman","tier":1,"fc":4,"atk":303,"def":10,"leth":10,"hp":57},"lancer_t1_fc5":{"type":"lancer","tier":1,"fc":5,"atk":239,"def":10,"leth":10,"hp":80},"marksman_t1_fc5":{"type":"marksman","tier":1,"fc":5,"atk":319,"def":10,"leth":10,"hp":59},"lancer_t2":{"type":"lancer","tier":2,"fc":0,"atk":283,"def":10,"leth":10,"hp":94},"marksman_t2":{"type":"marksman","tier":2,"fc":0,"atk":378,"def":10,"leth":10,"hp":71},"lancer_t2_fc1":{"type":"lancer","tier":2,"fc":1,"atk":294,"def":10,"leth":10,"hp":98},"marksman_t2_fc1":{"type":"marksman","tier":2,"fc":1,"atk":393,"def":10,"leth":10,"hp":74},"lancer_t2_fc2":{"type":"lancer","tier":2,"fc":2,"atk":309,"def":10,"leth":10,"hp":103},"marksman_t2_fc2":{"type":"marksman","tier":2,"fc":2,"atk":413,"def":10,"leth":10,"hp":78},"lancer_t2_fc3":{"type":"lancer","tier":2,"fc":3,"atk":324,"def":10,"leth":10,"hp":108},"marksman_t2_fc3":{"type":"marksman","tier":2,"fc":3,"atk":433,"def":10,"leth":10,"hp":81},"lancer_t2_fc4":{"type":"lancer","tier":2,"fc":4,"atk":341,"def":10,"leth":10,"hp":113},"marksman_t2_fc4":{"type":"marksman","tier":2,"fc":4,"atk":455,"def":10,"leth":10,"hp":85},"lancer_t2_fc5":{"type":"lancer","tier":2,"fc":5,"atk":358,"def":10,"leth":10,"hp":119},"marksman_t2_fc5":{"type":"marksman","tier":2,"fc":5,"atk":478,"def":10,"leth":10,"hp":90},"lancer_t3":{"type":"lancer","tier":3,"fc":0,"atk":397,"def":10,"leth":10,"hp":132},"marksman_t3":{"type":"marksman","tier":3,"fc":0,"atk":529,"def":10,"leth":10,"hp":99},"lancer_t3_fc1":{"type":"lancer","tier":3,"fc":1,"atk":413,"def":10,"leth":10,"hp":137},"marksman_t3_fc1":{"type":"marksman","tier":3,"fc":1,"atk":550,"def":10,"leth":10,"hp":103},"lancer_t3_fc2":{"type":"lancer","tier":3,"fc":2,"atk":434,"def":10,"leth":10,"hp":144},"marksman_t3_fc2":{"type":"marksman","tier":3,"fc":2,"atk":578,"def":10,"leth":10,"hp":108},"lancer_t3_fc3":{"type":"lancer","tier":3,"fc":3,"atk":455,"def":10,"leth":10,"hp":151},"marksman_t3_fc3":{"type":"marksman","tier":3,"fc":3,"atk":607,"def":10,"leth":10,"hp":114},"lancer_t3_fc4":{"type":"lancer","tier":3,"fc":4,"atk":478,"def":10,"leth":10,"hp":159},"marksman_t3_fc4":{"type":"marksman","tier":3,"fc":4,"atk":637,"def":10,"leth":10,"hp":119},"lancer_t3_fc5":{"type":"lancer","tier":3,"fc":5,"atk":502,"def":10,"leth":10,"hp":167},"marksman_t3_fc5":{"type":"marksman","tier":3,"fc":5,"atk":669,"def":10,"leth":10,"hp":125},"lancer_t4":{"type":"lancer","tier":4,"fc":0,"atk":516,"def":10,"leth":10,"hp":172},"marksman_t4":{"type":"marksman","tier":4,"fc":0,"atk":688,"def":10,"leth":10,"hp":129},"lancer_t4_fc1":{"type":"lancer","tier":4,"fc":1,"atk":537,"def":10,"leth":10,"hp":179},"marksman_t4_fc1":{"type":"marksman","tier":4,"fc":1,"atk":716,"def":10,"leth":10,"hp":134},"lancer_t4_fc2":{"type":"lancer","tier":4,"fc":2,"atk":563,"def":10,"leth":10,"hp":188},"marksman_t4_fc2":{"type":"marksman","tier":4,"fc":2,"atk":751,"def":10,"leth":10,"hp":141},"lancer_t4_fc3":{"type":"lancer","tier":4,"fc":3,"atk":592,"def":10,"leth":10,"hp":197},"marksman_t4_fc3":{"type":"marksman","tier":4,"fc":3,"atk":789,"def":10,"leth":10,"hp":148},"lancer_t4_fc4":{"type":"lancer","tier":4,"fc":4,"atk":621,"def":10,"leth":10,"hp":207},"marksman_t4_fc4":{"type":"marksman","tier":4,"fc":4,"atk":828,"def":10,"leth":10,"hp":155},"lancer_t4_fc5":{"type":"lancer","tier":4,"fc":5,"atk":652,"def":10,"leth":10,"hp":217},"marksman_t4_fc5":{"type":"marksman","tier":4,"fc":5,"atk":870,"def":10,"leth":10,"hp":163},"lancer_t5":{"type":"lancer","tier":5,"fc":0,"atk":619,"def":10,"leth":10,"hp":206},"marksman_t5":{"type":"marksman","tier":5,"fc":0,"atk":825,"def":10,"leth":10,"hp":155},"lancer_t5_fc1":{"type":"lancer","tier":5,"fc":1,"atk":644,"def":10,"leth":10,"hp":214},"marksman_t5_fc1":{"type":"marksman","tier":5,"fc":1,"atk":858,"def":10,"leth":10,"hp":161},"lancer_t5_fc2":{"type":"lancer","tier":5,"fc":2,"atk":676,"def":10,"leth":10,"hp":225},"marksman_t5_fc2":{"type":"marksman","tier":5,"fc":2,"atk":901,"def":10,"leth":10,"hp":169},"lancer_t5_fc3":{"type":"lancer","tier":5,"fc":3,"atk":710,"def":10,"leth":10,"hp":236},"marksman_t5_fc3":{"type":"marksman","tier":5,"fc":3,"atk":946,"def":10,"leth":10,"hp":178},"lancer_t5_fc4":{"type":"lancer","tier":5,"fc":4,"atk":745,"def":10,"leth":10,"hp":248},"marksman_t5_fc4":{"type":"marksman","tier":5,"fc":4,"atk":993,"def":10,"leth":10,"hp":187},"lancer_t5_fc5":{"type":"lancer","tier":5,"fc":5,"atk":782,"def":10,"leth":10,"hp":260},"marksman_t5_fc5":{"type":"marksman","tier":5,"fc":5,"atk":1043,"def":10,"leth":10,"hp":196},"lancer_t6":{"type":"lancer","tier":6,"fc":0,"atk":730,"def":10,"leth":10,"hp":243},"marksman_t6":{"type":"marksman","tier":6,"fc":0,"atk":974,"def":10,"leth":10,"hp":183},"lancer_t6_fc1":{"type":"lancer","tier":6,"fc":1,"atk":759,"def":10,"leth":10,"hp":253},"marksman_t6_fc1":{"type":"marksman","tier":6,"fc":1,"atk":1013,"def":10,"leth":10,"hp":190},"lancer_t6_fc2":{"type":"lancer","tier":6,"fc":2,"atk":797,"def":10,"leth":10,"hp":265},"marksman_t6_fc2":{"type":"marksman","tier":6,"fc":2,"atk":1064,"def":10,"leth":10,"hp":200},"lancer_t6_fc3":{"type":"lancer","tier":6,"fc":3,"atk":837,"def":10,"leth":10,"hp":279},"marksman_t6_fc3":{"type":"marksman","tier":6,"fc":3,"atk":1117,"def":10,"leth":10,"hp":210},"lancer_t6_fc4":{"type":"lancer","tier":6,"fc":4,"atk":879,"def":10,"leth":10,"hp":293},"marksman_t6_fc4":{"type":"marksman","tier":6,"fc":4,"atk":1173,"def":10,"leth":10,"hp":220},"lancer_t6_fc5":{"type":"lancer","tier":6,"fc":5,"atk":923,"def":10,"leth":10,"hp":307},"marksman_t6_fc5":{"type":"marksman","tier":6,"fc":5,"atk":1231,"def":10,"leth":10,"hp":231},"lancer_t7":{"type":"lancer","tier":7,"fc":0,"atk":862,"def":10,"leth":10,"hp":287},"marksman_t7":{"type":"marksman","tier":7,"fc":0,"atk":1149,"def":10,"leth":10,"hp":215},"lancer_t7_fc1":{"type":"lancer","tier":7,"fc":1,"atk":896,"def":10,"leth":10,"hp":298},"marksman_t7_fc1":{"type":"marksman","tier":7,"fc":1,"atk":1195,"def":10,"leth":10,"hp":224},"lancer_t7_fc2":{"type":"lancer","tier":7,"fc":2,"atk":941,"def":10,"leth":10,"hp":313},"marksman_t7_fc2":{"type":"marksman","tier":7,"fc":2,"atk":1255,"def":10,"leth":10,"hp":235},"lancer_t7_fc3":{"type":"lancer","tier":7,"fc":3,"atk":988,"def":10,"leth":10,"hp":329},"marksman_t7_fc3":{"type":"marksman","tier":7,"fc":3,"atk":1317,"def":10,"leth":10,"hp":247},"lancer_t7_fc4":{"type":"lancer","tier":7,"fc":4,"atk":1038,"def":10,"leth":10,"hp":346},"marksman_t7_fc4":{"type":"marksman","tier":7,"fc":4,"atk":1383,"def":10,"leth":10,"hp":259},"lancer_t7_fc5":{"type":"lancer","tier":7,"fc":5,"atk":1090,"def":10,"leth":10,"hp":363},"marksman_t7_fc5":{"type":"marksman","tier":7,"fc":5,"atk":1452,"def":10,"leth":10,"hp":272},"lancer_t8":{"type":"lancer","tier":8,"fc":0,"atk":1017,"def":10,"leth":10,"hp":339},"marksman_t8":{"type":"marksman","tier":8,"fc":0,"atk":1356,"def":10,"leth":10,"hp":254},"lancer_t8_fc1":{"type":"lancer","tier":8,"fc":1,"atk":1058,"def":10,"leth":10,"hp":353},"marksman_t8_fc1":{"type":"marksman","tier":8,"fc":1,"atk":1410,"def":10,"leth":10,"hp":264},"lancer_t8_fc2":{"type":"lancer","tier":8,"fc":2,"atk":1111,"def":10,"leth":10,"hp":370},"marksman_t8_fc2":{"type":"marksman","tier":8,"fc":2,"atk":1481,"def":10,"leth":10,"hp":277},"lancer_t8_fc3":{"type":"lancer","tier":8,"fc":3,"atk":1166,"def":10,"leth":10,"hp":389},"marksman_t8_fc3":{"type":"marksman","tier":8,"fc":3,"atk":1555,"def":10,"leth":10,"hp":291},"lancer_t8_fc4":{"type":"lancer","tier":8,"fc":4,"atk":1224,"def":10,"leth":10,"hp":408},"marksman_t8_fc4":{"type":"marksman","tier":8,"fc":4,"atk":1633,"def":10,"leth":10,"hp":306},"lancer_t8_fc5":{"type":"lancer","tier":8,"fc":5,"atk":1286,"def":10,"leth":10,"hp":429},"marksman_t8_fc5":{"type":"marksman","tier":8,"fc":5,"atk":1714,"def":10,"leth":10,"hp":321},"lancer_t9":{"type":"lancer","tier":9,"fc":0,"atk":1200,"def":10,"leth":10,"hp":400},"marksman_t9":{"type":"marksman","tier":9,"fc":0,"atk":1600,"def":10,"leth":10,"hp":300},"lancer_t9_fc1":{"type":"lancer","tier":9,"fc":1,"atk":1248,"def":10,"leth":10,"hp":416},"marksman_t9_fc1":{"type":"marksman","tier":9,"fc":1,"atk":1664,"def":10,"leth":10,"hp":312},"lancer_t9_fc2":{"type":"lancer","tier":9,"fc":2,"atk":1310,"def":10,"leth":10,"hp":437},"marksman_t9_fc2":{"type":"marksman","tier":9,"fc":2,"atk":1747,"def":10,"leth":10,"hp":328},"lancer_t9_fc3":{"type":"lancer","tier":9,"fc":3,"atk":1376,"def":10,"leth":10,"hp":459},"marksman_t9_fc3":{"type":"marksman","tier":9,"fc":3,"atk":1835,"def":10,"leth":10,"hp":344},"lancer_t9_fc4":{"type":"lancer","tier":9,"fc":4,"atk":1445,"def":10,"leth":10,"hp":482},"marksman_t9_fc4":{"type":"marksman","tier":9,"fc":4,"atk":1926,"def":10,"leth":10,"hp":361},"lancer_t9_fc5":{"type":"lancer","tier":9,"fc":5,"atk":1517,"def":10,"leth":10,"hp":506},"marksman_t9_fc5":{"type":"marksman","tier":9,"fc":5,"atk":2023,"def":10,"leth":10,"hp":379},"lancer_t10":{"type":"lancer","tier":10,"fc":0,"atk":1416,"def":10,"leth":10,"hp":472},"marksman_t10":{"type":"marksman","tier":10,"fc":0,"atk":1888,"def":10,"leth":10,"hp":354},"lancer_t10_fc1":{"type":"lancer","tier":10,"fc":1,"atk":1473,"def":10,"leth":10,"hp":491},"marksman_t10_fc1":{"type":"marksman","tier":10,"fc":1,"atk":1964,"def":10,"leth":10,"hp":368},"lancer_t10_fc2":{"type":"lancer","tier":10,"fc":2,"atk":1546,"def":10,"leth":10,"hp":515},"marksman_t10_fc2":{"type":"marksman","tier":10,"fc":2,"atk":2062,"def":10,"leth":10,"hp":387},"lancer_t10_fc3":{"type":"lancer","tier":10,"fc":3,"atk":1624,"def":10,"leth":10,"hp":541},"marksman_t10_fc3":{"type":"marksman","tier":10,"fc":3,"atk":2165,"def":10,"leth":10,"hp":406},"lancer_t10_fc4":{"type":"lancer","tier":10,"fc":4,"atk":1705,"def":10,"leth":10,"hp":568},"marksman_t10_fc4":{"type":"marksman","tier":10,"fc":4,"atk":2273,"def":10,"leth":10,"hp":426},"lancer_t10_fc5":{"type":"lancer","tier":10,"fc":5,"atk":1790,"def":10,"leth":10,"hp":597},"marksman_t10_fc5":{"type":"marksman","tier":10,"fc":5,"atk":2387,"def":10,"leth":10,"hp":448},"lancer_t11":{"type":"lancer","tier":11,"fc":0,"atk":1561,"def":10,"leth":10,"hp":520},"marksman_t11":{"type":"marksman","tier":11,"fc":0,"atk":2082,"def":10,"leth":10,"hp":390},"lancer_t11_fc1":{"type":"lancer","tier":11,"fc":1,"atk":1624,"def":10,"leth":10,"hp":541},"marksman_t11_fc1":{"type":"marksman","tier":11,"fc":1,"atk":2165,"def":10,"leth":10,"hp":406},"lancer_t11_fc2":{"type":"lancer","tier":11,"fc":2,"atk":1704,"def":10,"leth":10,"hp":568},"marksman_t11_fc2":{"type":"marksman","tier":11,"fc":2,"atk":2273,"def":10,"leth":10,"hp":427},"lancer_t11_fc3":{"type":"lancer","tier":11,"fc":3,"atk":1790,"def":10,"leth":10,"hp":596},"marksman_t11_fc3":{"type":"marksman","tier":11,"fc":3,"atk":2387,"def":10,"leth":10,"hp":448},"lancer_t11_fc4":{"type":"lancer","tier":11,"fc":4,"atk":1880,"def":10,"leth":10,"hp":626},"marksman_t11_fc4":{"type":"marksman","tier":11,"fc":4,"atk":2506,"def":10,"leth":10,"hp":470},"lancer_t11_fc5":{"type":"lancer","tier":11,"fc":5,"atk":1973,"def":10,"leth":10,"hp":658},"marksman_t11_fc5":{"type":"marksman","tier":11,"fc":5,"atk":2632,"def":10,"leth":10,"hp":494}}
;
const TROOP_SKILLS = [{"skill_name":"Master Brawler","skill_decription":"Increase Attack Damage to Lancers by 10%","skill_type":"troop_skill","skill_troop_type":"infantry","skill_permanent":true,"skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_is_chance":false,"skill_probability":0.0,"skill_round_stackable":false,"skill_type_relation":0,"skill_conditions":[{"level":"1","condition_type":"tier","condition_value":0}],"skill_order":1,"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":901,"extra_attack":false,"effect_is_chance":false,"effect_probabilities":{},"special":{},"effect_num":"Master Brawler/1","trigger_types":{"trigger_for":"infantry","trigger_vs":"lancer"},"benefit_types":{"benefit_for":"infantry","benefit_vs":"lancer"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_values":{"1":10}}]},{"skill_name":"Bands of Steel","skill_decription":"Increase Defense against lancers by 10%","skill_type":"troop_skill","skill_troop_type":"infantry","skill_permanent":true,"skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_is_chance":false,"skill_probability":0.0,"skill_round_stackable":false,"skill_type_relation":0,"skill_conditions":[{"level":"1","condition_type":"tier","condition_value":7}],"skill_order":1,"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":111,"extra_attack":false,"effect_is_chance":false,"effect_probabilities":{},"special":{},"effect_num":"Bands of Steel/1","trigger_types":{"trigger_for":"infantry","trigger_vs":"all"},"benefit_types":{"benefit_for":"infantry","benefit_vs":"lancer"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_values":{"1":10}}]},{"skill_name":"Crystal Shield","skill_decription":"The Fire Crystal energy...grants it an X% chance of offsetting 36 damage","skill_type":"troop_skill","skill_troop_type":"infantry","skill_permanent":false,"skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_is_chance":false,"skill_probability":0.0,"skill_round_stackable":false,"skill_type_relation":true,"skill_conditions":[{"level":"1","condition_type":"fc","condition_value":3},{"level":"2","condition_type":"fc","condition_value":5}],"skill_order":1,"skill_effects":[{"affects_opponent":false,"effect_type":"OppDamageDown","effect_op":209,"extra_attack":false,"effect_is_chance":true,"effect_num":"Crystal Shield/1","special":{"onDefense":true},"trigger_types":{"trigger_for":"infantry","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_probabilities":{"1":25,"2":37.5},"effect_values":{"1":36,"2":36}}]},{"skill_name":"Body of Light","skill_decription":"Increasing Infantry Defense by 4%, reducing an extra 10% damage when [Crystal Shield] is active","skill_type":"troop_skill","skill_troop_type":"infantry","skill_permanent":true,"skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_is_chance":false,"skill_probability":0.0,"skill_round_stackable":false,"skill_type_relation":true,"skill_conditions":[{"level":"1","condition_type":"fc","condition_value":8}],"skill_order":1,"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":119,"extra_attack":false,"effect_is_chance":false,"effect_num":"Body of Light/1","special":{},"trigger_types":{"trigger_for":"infantry","trigger_vs":"all"},"benefit_types":{"benefit_for":"infantry","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":4}},{"affects_opponent":true,"effect_type":"OppDamageDown","effect_op":209,"extra_attack":false,"effect_is_chance":false,"effect_num":"Body of Light/2","trigger_types":{"trigger_for":"infantry","trigger_vs":"all"},"benefit_types":{"benefit_for":"infantry","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":10},"special":{"effect_entanglment":"Crystal Shield/1"}}]},{"skill_name":"Charge","skill_decription":"Increase Attack Damage to Marksmen by 10%","skill_type":"troop_skill","skill_troop_type":"lancers","skill_permanent":true,"skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_is_chance":false,"skill_probability":0.0,"skill_round_stackable":false,"skill_type_relation":0,"skill_conditions":[{"level":"1","condition_type":"tier","condition_value":0}],"skill_order":1,"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":902,"extra_attack":false,"effect_is_chance":false,"effect_probabilities":{},"special":{},"effect_num":"Charge/1","trigger_types":{"trigger_for":"lancer","trigger_vs":"marksmen"},"benefit_types":{"benefit_for":"lancer","benefit_vs":"marksmen"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_values":{"1":10}}]},{"skill_name":"Ambusher","skill_decription":"Attacks have a 20% chance to strike Marksmen behind Infantry","skill_type":"troop_skill","skill_troop_type":"lancers","skill_permanent":false,"skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":true,"skill_conditions":[{"level":"1","condition_type":"tier","condition_value":7}],"skill_order":1,"skill_effects":[{"affects_opponent":false,"effect_type":"attack_order","effect_op":"","extra_attack":false,"effect_is_chance":true,"effect_probabilities":{"1":20},"special":{},"effect_num":"Ambusher/1","trigger_types":{"trigger_for":"lancer","trigger_vs":"infantry"},"benefit_types":{"benefit_for":"lancer","benefit_vs":"marksmen"},"effect_duration":{"duration_type":"turn","duration_value":1,"effect_lag":0},"effect_values":{"1":"mark/inf/lanc"}}]},{"skill_name":"Crystal Lance","skill_decription":"Grants it a X% chance of dealing double damage","skill_type":"troop_skill","skill_troop_type":"lancers","skill_permanent":false,"skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":true,"skill_conditions":[{"level":"1","condition_type":"fc","condition_value":3},{"level":"2","condition_type":"fc","condition_value":5}],"skill_order":1,"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":true,"effect_is_chance":true,"effect_probabilities":{"1":10,"2":15},"special":{},"effect_num":"Crystal Lance/1","trigger_types":{"trigger_for":"lancer","trigger_vs":"all"},"benefit_types":{"benefit_for":"lancer","benefit_vs":"all"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_values":{"1":100,"2":100}}]},{"skill_name":"Incandescent Field","skill_decription":"Grants the lancers a 10% chance of taking half the damage when under attack.","skill_type":"troop_skill","skill_troop_type":"lancers","skill_permanent":false,"skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":true,"skill_conditions":[{"level":"1","condition_type":"fc","condition_value":8}],"skill_order":1,"skill_effects":[{"affects_opponent":true,"effect_type":"OppDamageDown","effect_op":209,"extra_attack":false,"effect_is_chance":true,"effect_probabilities":{"1":10},"special":{"onDefense":true},"effect_num":"Crystal Lance/1","trigger_types":{"trigger_for":"lancer","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_values":{"1":50}}]},{"skill_name":"Ranged Strike","skill_decription":"Increase Attack Damage to Infantry by 10%","skill_type":"troop_skill","skill_troop_type":"marksmen","skill_permanent":true,"skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_is_chance":false,"skill_probability":0.0,"skill_round_stackable":false,"skill_type_relation":0,"skill_conditions":[{"level":"1","condition_type":"tier","condition_value":0}],"skill_order":1,"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":903,"extra_attack":false,"effect_is_chance":false,"effect_probabilities":{},"special":{},"effect_num":"Ranged Strike/1","trigger_types":{"trigger_for":"marksmen","trigger_vs":"infantry"},"benefit_types":{"benefit_for":"marksmen","benefit_vs":"infantry"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_values":{"1":10}}]},{"skill_name":"Volley","skill_decription":"Attacks have a 10% chance to strike twice","skill_type":"troop_skill","skill_troop_type":"marksmen","skill_permanent":false,"skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":0,"skill_conditions":[{"level":"1","condition_type":"tier","condition_value":7}],"skill_order":1,"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":904,"extra_attack":true,"effect_is_chance":true,"effect_probabilities":{"1":10},"special":{},"effect_num":"Volley/1","trigger_types":{"trigger_for":"marksmen","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_values":{"1":100}}]},{"skill_name":"Crystal Gunpowder","skill_decription":"Grants it a X% chance of dealing 50% more damage","skill_type":"troop_skill","skill_troop_type":"marksmen","skill_permanent":false,"skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":0,"skill_conditions":[{"level":"1","condition_type":"fc","condition_value":3},{"level":"2","condition_type":"fc","condition_value":5}],"skill_order":1,"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":true,"effect_is_chance":true,"effect_probabilities":{"1":20,"2":30},"special":{},"effect_num":"Crystal Gunpowder/1","trigger_types":{"trigger_for":"marksmen","trigger_vs":"all"},"benefit_types":{"benefit_for":"marksmen","benefit_vs":"all"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_values":{"1":50,"2":50}}]},{"skill_name":"Flame Charge","skill_decription":"Increasing marksmen's basic Attack by 4%. Marksmen can deal an extra 25% damage when [Crystal Gunpowder] is active","skill_type":"troop_skill","skill_troop_type":"marksmen","skill_permanent":true,"skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":0,"skill_conditions":[{"level":"1","condition_type":"fc","condition_value":8}],"skill_order":1,"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":102,"extra_attack":false,"effect_is_chance":false,"effect_probabilities":{},"special":{},"effect_num":"Flame Charge/1","trigger_types":{"trigger_for":"marksmen","trigger_vs":"all"},"benefit_types":{"benefit_for":"marksmen","benefit_vs":"any"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_values":{"1":4}},{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":true,"effect_is_chance":false,"effect_probabilities":{},"effect_num":"Crystal Gunpowder/2","trigger_types":{"trigger_for":"marksmen","trigger_vs":"all"},"benefit_types":{"benefit_for":"marksmen","benefit_vs":"all"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_values":{"1":25},"special":{"effect_entanglment":"Crystal Gunpowder/1"}}]}]
;
const HERO_SKILLS = {"Ahmose":[{"skill_hero":"Ahmose","skill_num":1,"skill_name":"Viper formation","skill_description":"His infantry pauses the attack once every 4 times reducing damage taken by Lancers and Marksmen by X% and Infantry by X% for 2 turns","skill_troop_type":"infantry","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":true,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"attack","frequency_value":4},"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":111,"extra_attack":false,"effect_is_chance":false,"effect_num":"Viper formation/1","trigger_types":{"trigger_for":"infantry","trigger_vs":"all"},"benefit_types":{"benefit_for":"friendly","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":2,"effect_lag":1},"effect_probabilities":{},"effect_values":{"1":10,"2":"15.0","3":20,"4":"25.0","5":30},"special":{"pause_attack":true}},{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":111,"extra_attack":false,"effect_is_chance":false,"effect_num":"Viper formation/2","trigger_types":{"trigger_for":"infantry","trigger_vs":"all"},"benefit_types":{"benefit_for":"infantry","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":2,"effect_lag":1},"effect_probabilities":{},"effect_values":{"1":10,"2":"25.0","3":40,"4":"55.0","5":70},"special":{}}]},{"skill_hero":"Ahmose","skill_num":2,"skill_name":"Prayer of flame","skill_description":"Ahmose amplifies the combat spirit of friendly infantry with the power of Fire Crystal, increasing their damage dealt by X%","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":true,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Prayer of flame/1","trigger_types":{"trigger_for":"infantry","trigger_vs":"all"},"benefit_types":{"benefit_for":"infantry","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":20,"2":"40.0","3":60,"4":"80.0","5":100},"special":{}}]},{"skill_hero":"Ahmose","skill_num":3,"skill_name":"Blade of light","skill_description":"Increasing his infantries' damage dealt per attack by X% and the target's damage taken by X% for 1 turn","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":true,"skill_type_relation":true,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Blade of light/1","trigger_types":{"trigger_for":"infantry","trigger_vs":"all"},"benefit_types":{"benefit_for":"infantry","benefit_vs":"target"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":12,"2":"24.0","3":36,"4":"48.0","5":60},"special":{}},{"affects_opponent":true,"effect_type":"OppDefenseDown","effect_op":213,"extra_attack":false,"effect_is_chance":false,"effect_num":"Blade of light/2","trigger_types":{"trigger_for":"infantry","trigger_vs":"all"},"benefit_types":{"benefit_for":"all","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":1,"effect_lag":1},"effect_probabilities":{},"effect_values":{"1":5,"2":"10.0","3":15,"4":"20.0","5":25},"special":{}}]},{"skill_hero":"Ahmose","skill_num":4,"skill_name":"Widget: Guardian's Vitality","skill_description":"Widget bonus: Increase Health by X% for all troops when defending","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":403,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Guardian's Vitality/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"defense","stat":"health"}}]}],"Alonso":[{"skill_hero":"Alonso","skill_num":1,"skill_name":"Onslaught","skill_description":"granting a 40% chance of increasing all troop's Lethality by X%","skill_troop_type":"marksmen","skill_permanent":false,"skill_is_chance":true,"skill_probability":40,"skill_round_stackable":true,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Onslaught/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":10,"2":"20.0","3":30,"4":"40.0","5":50},"special":{}}]},{"skill_hero":"Alonso","skill_num":2,"skill_name":"Iron strength","skill_description":"Grants all troops' attack a 20% chance of reducing damage dealt by X% for all enemy troops for 2 turns","skill_troop_type":"marksmen","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":true,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":true,"effect_type":"OppDamageDown","effect_op":201,"extra_attack":false,"effect_is_chance":true,"effect_num":"Iron strength/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"all","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":2,"effect_lag":1},"effect_probabilities":{"1":20,"2":20,"3":20,"4":20,"5":20},"effect_values":{"1":10,"2":20,"3":30,"4":40,"5":50},"special":{}}]},{"skill_hero":"Alonso","skill_num":3,"skill_name":"Poison harpoon","skill_description":"Grants all troops attack a 50% chance of dealing X% more damage","skill_troop_type":"marksmen","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":true,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":true,"effect_is_chance":true,"effect_num":"Poison harpoon/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_probabilities":{"1":50,"2":50,"3":50,"4":50,"5":50},"effect_values":{"1":10,"2":20,"3":30,"4":40,"5":50},"special":{}}]},{"skill_hero":"Alonso","skill_num":4,"skill_name":"Widget: Razor Volley","skill_description":"Widget bonus: Increase Lethality by X% for all troops when attacking","skill_troop_type":"marksman","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":401,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Razor Volley/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"attack","stat":"lethality"}}]}],"Bahiti":[{"skill_hero":"Bahiti","skill_num":1,"skill_name":"Sixth Sense","skill_description":"Reducing damage taken by X% for all troops","skill_troop_type":"marksmen","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":111,"extra_attack":false,"effect_is_chance":false,"effect_num":"Sixth Sense/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":4,"2":"8.0","3":12,"4":"16.0","5":20},"special":{}}]},{"skill_hero":"Bahiti","skill_num":2,"skill_name":"Fluorescence","skill_description":"Grants all troops' attack a 50% chance of increasing damage dealt by X%","skill_troop_type":"marksmen","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":true,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":true,"effect_is_chance":true,"effect_num":"Fluorescence/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_probabilities":{"1":50,"2":50,"3":50,"4":50,"5":50},"effect_values":{"1":10,"2":"20.0","3":30,"4":"40.0","5":50},"special":{}}]}],"Bradley":[{"skill_hero":"Bradley","skill_num":1,"skill_name":"Veteran's Might","skill_description":"Bradley's years of combat experience enables him to destroy enemies efficiently, increasing Attack by X% for all troops.","skill_troop_type":"marksmen","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":102,"extra_attack":false,"effect_is_chance":false,"effect_num":"Veteran's Might/1","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"all","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":10,"3":15,"4":20,"5":25},"special":{}}]},{"skill_hero":"Bradley","skill_num":2,"skill_name":"Power Shot","skill_description":"Bradley uses his expertise in suppressive artillery against the enemy vanguard, increasing Damage Dealt to Lancers by X% and to Infantry by Y% for all troops.","skill_troop_type":"marksmen","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Power Shot/1","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"all","benefit_vs":"lancer"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":6,"2":12,"3":18,"4":24,"5":30},"special":{}},{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Power Shot/2","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"all","benefit_vs":"infantry"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":10,"3":15,"4":20,"5":25},"special":{}}]},{"skill_hero":"Bradley","skill_num":3,"skill_name":"Tactical Assistance","skill_description":"Bradley will press every advantage against a beleaguered enemy, increasing Damage Dealt by X% for all troops for 2 turns every 4 turns.","skill_troop_type":"marksmen","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":4},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Tactical Assistance/1","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"all","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":2,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":6,"2":12,"3":18,"4":24,"5":30},"special":{}}]},{"skill_hero":"Bradley","skill_num":4,"skill_name":"Widget: Siege Insight","skill_description":"Widget bonus: Increase Attack by X% for all troops when defending","skill_troop_type":"marksmen","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":402,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Siege Insight/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"defense","stat":"attack"}}]}],"Edith":[{"skill_hero":"Edith","skill_num":1,"skill_name":"Strategic Balance","skill_description":"Mr. Tin's colossal presence automatically shields friendly ranged units, reducing damage taken by X% for Marksmen, and suppresses the enemy, increasing damage dealt by Y% for Lancers.","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":111,"extra_attack":false,"effect_is_chance":false,"effect_num":"Strategic Balance/1","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"marksmen","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":4,"2":8,"3":12,"4":16,"5":20},"special":{}},{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Strategic Balance/2","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"lancer","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":4,"2":8,"3":12,"4":16,"5":20},"special":{}}]},{"skill_hero":"Edith","skill_num":2,"skill_name":"Ironclad","skill_description":"Mr. Tin's metallic body functions as a fortified wall on the field, reducing damage taken by X% for Infantry.","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":true,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":111,"extra_attack":false,"effect_is_chance":false,"effect_num":"Ironclad/1","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"infantry","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":4,"2":8,"3":12,"4":16,"5":20},"special":{}}]},{"skill_hero":"Edith","skill_num":3,"skill_name":"Steel Sentinel","skill_description":"Edith's mobile defense system is reliable, increasing Health by X% for all troops.","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":113,"extra_attack":false,"effect_is_chance":false,"effect_num":"Steel Sentinel/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":10,"3":15,"4":20,"5":25},"special":{}}]},{"skill_hero":"Edith","skill_num":4,"skill_name":"Widget: Fortworks","skill_description":"Widget bonus: Increase Health by X% for all troops when defending","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":403,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Fortworks/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"defense","stat":"health"}}]}],"Flint":[{"skill_hero":"Flint","skill_num":1,"skill_name":"Pyromaniac","skill_description":"increases his Infantry's Damage Dealt by X%","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":true,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Pyromaniac/1","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"infantry","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":20,"2":"40.0","3":60,"4":"80.0","5":100},"special":{}}]},{"skill_hero":"Flint","skill_num":2,"skill_name":"Burning resolve","skill_description":"Increasing Attack by X% for all troops","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":102,"extra_attack":false,"effect_is_chance":false,"effect_num":"Burning resolve/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":"10.0","3":15,"4":"20.0","5":25},"special":{}}]},{"skill_hero":"Flint","skill_num":3,"skill_name":"Immolation","skill_description":"Increasing all troops' Lethality by X%","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Immolation/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":"10.0","3":15,"4":"20.0","5":25},"special":{}}]},{"skill_hero":"Flint","skill_num":4,"skill_name":"Widget: Fortress Spear","skill_description":"Widget bonus: Increase Attack by X% for all troops when defending","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":402,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Fortress Spear/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"defense","stat":"attack"}}]}],"Gordon":[{"skill_hero":"Gordon","skill_num":1,"skill_name":"Venom Infusion","skill_description":"Every 2 attacks, Lancers deal X% extra damage and apply poison to the target for 1 turn. Poisoned enemies deal Y% less damage.","skill_troop_type":"lancer","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":true,"skill_type_relation":true,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"attack","frequency_value":2},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":true,"effect_is_chance":false,"effect_num":"Venom Infusion/1","trigger_types":{"trigger_for":"lancer","trigger_vs":"all"},"benefit_types":{"benefit_for":"lancer","benefit_vs":"target"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":20,"2":40,"3":60,"4":80,"5":100},"special":{}},{"affects_opponent":true,"effect_type":"OppDamageDown","effect_op":201,"extra_attack":false,"effect_is_chance":false,"effect_num":"Venom Infusion/2","trigger_types":{"trigger_for":"lancer","trigger_vs":"all"},"benefit_types":{"benefit_for":"all","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":4,"2":8,"3":12,"4":16,"5":20},"special":{}}]},{"skill_hero":"Gordon","skill_num":2,"skill_name":"Chemical Terror","skill_description":"Gordon's envenomed weapons terrorizes the field, increasing Lancers' Damage Dealt by X% and reducing Damage Dealt by enemy troops by Y% for 1 turn every 3 turns.","skill_troop_type":"lancer","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":true,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":3},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Chemical Terror/1","trigger_types":{"trigger_for":"lancer","trigger_vs":"all"},"benefit_types":{"benefit_for":"lancer","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":30,"2":60,"3":90,"4":120,"5":150},"special":{}},{"affects_opponent":true,"effect_type":"OppDamageDown","effect_op":201,"extra_attack":false,"effect_is_chance":false,"effect_num":"Chemical Terror/2","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":6,"2":12,"3":18,"4":24,"5":30},"special":{}}]},{"skill_hero":"Gordon","skill_num":3,"skill_name":"Toxic Release","skill_description":"Gordon generates a defensive bio-toxic fog, increasing Damage Taken by enemy Infantry by X% while reducing Damage Dealt by enemy Marksmen by Y% for 2 turns every 4 turns.","skill_troop_type":"lancer","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":4},"skill_effects":[{"affects_opponent":true,"effect_type":"OppDefenseDown","effect_op":214,"extra_attack":false,"effect_is_chance":false,"effect_num":"Toxic Release/1","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"infantry","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":2,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":6,"2":12,"3":18,"4":24,"5":30},"special":{}},{"affects_opponent":true,"effect_type":"OppDamageDown","effect_op":201,"extra_attack":false,"effect_is_chance":false,"effect_num":"Toxic Release/2","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"marksmen","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":2,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":6,"2":12,"3":18,"4":24,"5":30},"special":{}}]},{"skill_hero":"Gordon","skill_num":4,"skill_name":"Widget: Bio Assault","skill_description":"Widget bonus: Increase Lethality by X% for all troops when defending","skill_troop_type":"lancer","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":401,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Bio Assault/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"defense","stat":"lethality"}}]}],"Greg":[{"skill_hero":"Greg","skill_num":1,"skill_name":"Sword of justice","skill_description":"Granting a 20% chance of increasing damage dealt by X% for all troops for 3 turns","skill_troop_type":"marksmen","skill_permanent":false,"skill_is_chance":true,"skill_probability":20,"skill_round_stackable":true,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Sword of justice/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"turns","duration_value":3,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":8,"2":"16.0","3":24,"4":"32.0","5":40},"special":{}}]},{"skill_hero":"Greg","skill_num":2,"skill_name":"Deterrence of law","skill_description":"Granting all troops' attack a 20% chance of reducing enemy damage dealt by X% for 2 turns","skill_troop_type":"marksmen","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":true,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":true,"effect_type":"OppDamageDown","effect_op":201,"extra_attack":false,"effect_is_chance":true,"effect_num":"Deterrence of law/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"all","benefit_vs":"target"},"effect_duration":{"duration_type":"turns","duration_value":2,"effect_lag":1},"effect_probabilities":{"1":20,"2":20,"3":20,"4":20,"5":20},"effect_values":{"1":10,"2":"20.0","3":30,"4":"40.0","5":50},"special":{}}]},{"skill_hero":"Greg","skill_num":3,"skill_name":"Law and order","skill_description":"Increasing Health by X% for all troops","skill_troop_type":"marksmen","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":113,"extra_attack":false,"effect_is_chance":false,"effect_num":"Law and order/2","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":"10.0","3":15,"4":"20.0","5":25},"special":{}}]},{"skill_hero":"Greg","skill_num":4,"skill_name":"Widget: Vital Surge","skill_description":"Widget bonus: Increase Health by X% for all troops when attacking","skill_troop_type":"marksman","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":403,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Vital Surge/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"attack","stat":"health"}}]}],"Gwen":[{"skill_hero":"Gwen","skill_num":1,"skill_name":"Eagle vision","skill_description":"Increasing target's damage taken by X%","skill_troop_type":"marksmen","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":true,"effect_type":"OppDefenseDown","effect_op":214,"extra_attack":false,"effect_is_chance":false,"effect_num":"Eagle vision/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":10,"3":15,"4":20,"5":25},"special":{}}]},{"skill_hero":"Gwen","skill_num":2,"skill_name":"Air dominance","skill_description":"Grants all troops' attack X% extra damage after every 5 attacks and causes the target to receive X% extra damage for its next attack received","skill_troop_type":"marksmen","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":true,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"attack","frequency_value":5},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":true,"effect_is_chance":false,"effect_num":"Air dominance/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":20,"2":40,"3":60,"4":80,"5":100},"special":{}},{"affects_opponent":true,"effect_type":"OppDefenseDown","effect_op":215,"extra_attack":true,"effect_is_chance":false,"effect_num":"Air dominance/2","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"all","benefit_vs":"target"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":1},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{}}]},{"skill_hero":"Gwen","skill_num":3,"skill_name":"Blastmaster","skill_description":"Gwen equips her Marksmen with grenades, dealing X% extra damage to all enemies on the next attack of every 4 attacks","skill_troop_type":"marksmen","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":true,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"attack","frequency_value":4},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":true,"effect_is_chance":false,"effect_num":"Blastmaster/1","trigger_types":{"trigger_for":"marksmen","trigger_vs":"all"},"benefit_types":{"benefit_for":"marksmen","benefit_vs":"all"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":1},"effect_probabilities":{},"effect_values":{"1":10,"2":20,"3":30,"4":40,"5":50},"special":{}}]},{"skill_hero":"Gwen","skill_num":4,"skill_name":"Widget: Lethal Precision","skill_description":"Widget bonus: Increase Lethality by X% for all troops when attacking","skill_troop_type":"marksmen","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":401,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Lethal Precision/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"attack","stat":"lethality"}}]}],"Hector":[{"skill_hero":"Hector","skill_num":1,"skill_name":"Survival instincts","skill_description":"Hector's presence grants a 40% chance of reducing damage taken by X% for all troops","skill_troop_type":"infantry","skill_permanent":false,"skill_is_chance":true,"skill_probability":40,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":111,"extra_attack":false,"effect_is_chance":false,"effect_num":"Survival instincts/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":10,"2":"20.0","3":30,"4":"40.0","5":50},"special":{}}]},{"skill_hero":"Hector","skill_num":2,"skill_name":"Rampant","skill_description":"Increases infantry's damage dealt by X% and marksmen's damage dealt by X%, it is effective for 10 attacks, with each attack's damage boost being 85% of the previous one.","skill_troop_type":"infantry","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1,"skill_last_round":10},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Rampant/1","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"infantry","benefit_vs":"target"},"effect_duration":{"duration_type":"attack","duration_value":10,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":100,"2":"125.0","3":150,"4":"175.0","5":200},"special":{"effect_evolution":{"category":"effect_decrease","data":{"type":"pct_value_pct_decrease","step":"attack","decrease_value":15}}}},{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Rampant/2","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"marksmen","benefit_vs":"target"},"effect_duration":{"duration_type":"attack","duration_value":10,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":20,"2":"40.0","3":60,"4":"80.0","5":100},"special":{"effect_evolution":{"category":"effect_decrease","data":{"type":"pct_value_pct_decrease","step":"attack","decrease_value":15}}}}]},{"skill_hero":"Hector","skill_num":3,"skill_name":"Blitz","skill_description":"Grants all troops' attack a 25% chance of dealing X% damage","skill_troop_type":"infantry","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":true,"effect_is_chance":true,"effect_num":"Blitz/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_probabilities":{"1":25,"2":25,"3":25,"4":25,"5":25},"effect_values":{"1":120,"2":"140.0","3":160,"4":"180.0","5":200},"special":{"effect_evolution":{"category":"effect_is_total_damage","data":{}}}}]},{"skill_hero":"Hector","skill_num":4,"skill_name":"Widget: Bulwark Commander","skill_description":"Widget bonus: Increase Attack by X% for all troops when defending","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":402,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Bulwark Commander/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"defense","stat":"attack"}}]}],"Jasser":[{"skill_hero":"Jasser","skill_num":1,"skill_name":"Tactical genius","skill_description":"Increasing damage dealt by X% for all troops","skill_troop_type":"marksmen","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Tactical genius/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":"10.0","3":15,"4":"20.0","5":25},"special":{}}]},{"skill_hero":"Jasser","skill_num":2,"skill_name":"Non-combat placeholder","skill_description":"Placeholder skill to satisfy simulator config for non-combat hero data","skill_troop_type":"marksmen","skill_permanent":false,"skill_is_chance":true,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":999,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[]}],"Jeronimo":[{"skill_hero":"Jeronimo","skill_num":1,"skill_name":"Battle manifesto","skill_description":"Increasing damage dealt by X% for all troops","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Battle manifesto/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":"10.0","3":15,"4":"20.0","5":25},"special":{}}]},{"skill_hero":"Jeronimo","skill_num":2,"skill_name":"Swordmentor","skill_description":"Increasing Attack by X% for all troops","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":102,"extra_attack":false,"effect_is_chance":false,"effect_num":"Swordmentor/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":"10.0","3":15,"4":"20.0","5":25},"special":{}}]},{"skill_hero":"Jeronimo","skill_num":3,"skill_name":"E Xpert swordsmanship","skill_description":"Increasing Damage Dealt by X% for all troops for 2 turns every 4 turns","skill_troop_type":"infantry","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":true,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":4},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"E Xpert swordsmanship/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":2,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":6,"2":"12.0","3":18,"4":"24.0","5":30},"special":{}}]},{"skill_hero":"Jeronimo","skill_num":4,"skill_name":"Widget: Battle Stance","skill_description":"Widget bonus: Increase Attack by X% for all troops when attacking","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":402,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Battle Stance/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"attack","stat":"attack"}}]}],"Jessie":[{"skill_hero":"Jessie","skill_num":1,"skill_name":"Stand of Arms","skill_description":"Increasing damage dealt by X% for all troops","skill_troop_type":"lancer","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Stand of Arms/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":"10.0","3":15,"4":"20.0","5":25},"special":{}}]},{"skill_hero":"Jessie","skill_num":2,"skill_name":"Bulwarks","skill_description":"Reducing damage taken by X% for all troops","skill_troop_type":"lancer","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":111,"extra_attack":false,"effect_is_chance":false,"effect_num":"Bulwarks/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":4,"2":"8.0","3":12,"4":"16.0","5":20},"special":{}}]}],"Ling":[{"skill_hero":"Ling","aliases":["Ling Xue"],"skill_num":1,"skill_name":"Fearsome aura","skill_description":"Reducing all enemy Troops' Attack by X%","skill_troop_type":"lancer","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":true,"effect_type":"OppDamageDown","effect_op":202,"extra_attack":false,"effect_is_chance":false,"effect_num":"Fearsome aura/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":4,"2":"8.0","3":12,"4":"16.0","5":20},"special":{}}]},{"skill_hero":"Ling","aliases":["Ling Xue"],"skill_num":2,"skill_name":"Non-combat placeholder","skill_description":"Placeholder skill to satisfy simulator config for non-combat hero data","skill_troop_type":"lancer","skill_permanent":false,"skill_is_chance":true,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":999,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[]}],"Logan":[{"skill_hero":"Logan","skill_num":1,"skill_name":"Lion strike","skill_description":"Reducing all enemy Troops' Attack by X%","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":true,"effect_type":"OppDamageDown","effect_op":202,"extra_attack":false,"effect_is_chance":false,"effect_num":"Lion strike/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":4,"2":"8.0","3":12,"4":"16.0","5":20},"special":{}}]},{"skill_hero":"Logan","skill_num":2,"skill_name":"Lion intimidation","skill_description":"Reducing damage taken by X% for all troops","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":111,"extra_attack":false,"effect_is_chance":false,"effect_num":"Lion intimidation/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":4,"2":"8.0","3":12,"4":"16.0","5":20},"special":{}}]},{"skill_hero":"Logan","skill_num":3,"skill_name":"Leader inspiration","skill_description":"Increasing Health by X% for all troops","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":113,"extra_attack":false,"effect_is_chance":false,"effect_num":"Leader inspiration/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":"10.0","3":15,"4":"20.0","5":25},"special":{}}]},{"skill_hero":"Logan","skill_num":4,"skill_name":"Widget: Iron Den","skill_description":"Widget bonus: Increase Defense by X% for all troops when defending","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":404,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Iron Den/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"defense","stat":"defense"}}]}],"Lumak":[{"skill_hero":"Lumak","aliases":["Lumak Bokan"],"skill_num":1,"skill_name":"Tactical Deception","skill_description":"All enemy troops' damage dealt is reduced by X%","skill_troop_type":"lancer","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":true,"effect_type":"OppDamageDown","effect_op":201,"extra_attack":false,"effect_is_chance":false,"effect_num":"Tactical Deception/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":4,"2":"8.0","3":12,"4":"16.0","5":20},"special":{}}]},{"skill_hero":"Lumak","aliases":["Lumak Bokan"],"skill_num":2,"skill_name":"Non-combat placeholder","skill_description":"Placeholder skill to satisfy simulator config for non-combat hero data","skill_troop_type":"lancer","skill_permanent":false,"skill_is_chance":true,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":999,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[]}],"Lynn":[{"skill_hero":"Lynn","skill_num":1,"skill_name":"Song of lion","skill_description":"Granting a 40% chance of increasing damage dealt by X% for all troops","skill_troop_type":"marksmen","skill_permanent":false,"skill_is_chance":true,"skill_probability":40,"skill_round_stackable":true,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Song of lion/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":10,"2":"20.0","3":30,"4":"40.0","5":50},"special":{}}]},{"skill_hero":"Lynn","skill_num":2,"skill_name":"Melancholic ballad","skill_description":"Reducing damage dealt by X% for all enemy troops","skill_troop_type":"marksmen","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":true,"effect_type":"OppDamageDown","effect_op":201,"extra_attack":false,"effect_is_chance":false,"effect_num":"Melancholic ballad/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":4,"2":"8.0","3":12,"4":"16.0","5":20},"special":{}}]},{"skill_hero":"Lynn","skill_num":3,"skill_name":"Oonai Cadenza","skill_description":"Increases her marksmen attack by X% for every 3 attacks. stackable, and last until the end of battle","skill_troop_type":"marksmen","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":true,"skill_type_relation":true,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"attack","frequency_value":3},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":102,"extra_attack":false,"effect_is_chance":false,"effect_num":"Oonai Cadenza/1","trigger_types":{"trigger_for":"marksmen","trigger_vs":"all"},"benefit_types":{"benefit_for":"marksmen","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":1,"2":"2.0","3":3,"4":"4.0","5":5},"special":{}}]},{"skill_hero":"Lynn","skill_num":4,"skill_name":"Widget: Silent Threat","skill_description":"Widget bonus: Increase Lethality by X% for all troops when defending","skill_troop_type":"marksman","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":401,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Silent Threat/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"defense","stat":"lethality"}}]}],"Mia":[{"skill_hero":"Mia","skill_num":1,"skill_name":"Bad luck streak","skill_description":"Grants all troops attack a 50% chance of cursing the target, increasing their damage taken by X%","skill_troop_type":"lancer","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":true,"effect_type":"OppDefenseDown","effect_op":212,"extra_attack":false,"effect_is_chance":true,"effect_num":"Bad luck streak/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"all","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":1,"effect_lag":0},"effect_probabilities":{"1":50,"2":50,"3":50,"4":50,"5":50},"effect_values":{"1":10,"2":"20.0","3":30,"4":"40.0","5":50},"special":{}}]},{"skill_hero":"Mia","skill_num":2,"skill_name":"Lucky charm","skill_description":"Grants a 50% chance of boosting troops' Attack by X%","skill_troop_type":"lancer","skill_permanent":false,"skill_is_chance":true,"skill_probability":50,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":102,"extra_attack":true,"effect_is_chance":false,"effect_num":"Lucky charm/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":10,"2":"20.0","3":30,"4":"40.0","5":50},"special":{}}]},{"skill_hero":"Mia","skill_num":3,"skill_name":"Ritual deciphering","skill_description":"Grants a 40% chance of reducing damage taken by X% for all troops","skill_troop_type":"lancer","skill_permanent":false,"skill_is_chance":true,"skill_probability":40,"skill_round_stackable":true,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":111,"extra_attack":false,"effect_is_chance":false,"effect_num":"Ritual deciphering/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":10,"2":"20.0","3":30,"4":"40.0","5":50},"special":{}}]},{"skill_hero":"Mia","skill_num":4,"skill_name":"Widget: Precision Drive","skill_description":"Widget bonus: Increase Attack by X% for all troops when attacking","skill_troop_type":"lancer","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":402,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Precision Drive/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"attack","stat":"attack"}}]}],"Molly":[{"skill_hero":"Molly","skill_num":1,"skill_name":"Calling of the storm","skill_description":"granting a 40% chance of reducing all troops' Damage taken by X%","skill_troop_type":"lancer","skill_permanent":false,"skill_is_chance":true,"skill_probability":40,"skill_round_stackable":true,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":111,"extra_attack":false,"effect_is_chance":false,"effect_num":"Calling of the storm/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":10,"2":"20.0","3":30,"4":"40.0","5":50},"special":{}}]},{"skill_hero":"Molly","skill_num":2,"skill_name":"Ice Dominion","skill_description":"Granting all troops' attack a 50% chance of increasing damage dealt by X%","skill_troop_type":"lancer","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":true,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":true,"effect_is_chance":true,"effect_num":"Ice Dominion/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_probabilities":{"1":50,"2":50,"3":50,"4":50,"5":50},"effect_values":{"1":10,"2":"20.0","3":30,"4":"40.0","5":50},"special":{}}]},{"skill_hero":"Molly","skill_num":3,"skill_name":"Youthful rage","skill_description":"Increasing damage dealt by X% for all troops","skill_troop_type":"lancer","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Youthful rage/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":"10.0","3":15,"4":"20.0","5":25},"special":{}}]},{"skill_hero":"Molly","skill_num":4,"skill_name":"Widget: Winter Fang","skill_description":"Widget bonus: Increase Lethality by X% for all troops when defending","skill_troop_type":"marksmen","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":401,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Winter Fang/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"defense","stat":"lethality"}}]}],"Natalia":[{"skill_hero":"Natalia","skill_num":1,"skill_name":"Wildling roar","skill_description":"granting a 40% chance of reducing all troops' Damage taken by X%","skill_troop_type":"infantry","skill_permanent":false,"skill_is_chance":true,"skill_probability":40,"skill_round_stackable":true,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":111,"extra_attack":false,"effect_is_chance":false,"effect_num":"Wildling roar/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":10,"2":"20.0","3":30,"4":"40.0","5":50},"special":{}}]},{"skill_hero":"Natalia","skill_num":2,"skill_name":"Queen of the wild","skill_description":"Increasing Attack by X% for all troops","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":102,"extra_attack":false,"effect_is_chance":false,"effect_num":"Queen of the wild/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":"10.0","3":15,"4":"20.0","5":25},"special":{}}]},{"skill_hero":"Natalia","skill_num":3,"skill_name":"Call of the wild","skill_description":"Increasing damage dealt by X% for all troops","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Call of the wild/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":"10.0","3":15,"4":"20.0","5":25},"special":{}}]},{"skill_hero":"Natalia","skill_num":4,"skill_name":"Widget: Gale Force","skill_description":"Widget bonus: Increase Lethality by X% for all troops when defending","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":401,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Gale Force/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"attack","stat":"lethality"}}]}],"Norah":[{"skill_hero":"Norah","skill_num":1,"skill_name":"Combined arms","skill_description":"Decreasing damage taken by X% and boosting damage dealt by X% for infantry and marksmen","skill_troop_type":"lancer","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"OppDamageDown","effect_op":201,"extra_attack":false,"effect_is_chance":false,"effect_num":"Combined arms/1","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"friendly","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":3,"2":"6.0","3":9,"4":"12.0","5":15},"special":{}},{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Combined arms/2","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"friendly","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":3,"2":"6.0","3":9,"4":"12.0","5":15},"special":{}}]},{"skill_hero":"Norah","skill_num":2,"skill_name":"Sneak strike","skill_description":"Granting her lancers a 20% chance of dealing X% extra damage to all enemies on attack","skill_troop_type":"lancer","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":true,"skill_type_relation":true,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":true,"effect_is_chance":true,"effect_num":"Sneak strike/1","trigger_types":{"trigger_for":"lancer","trigger_vs":"all"},"benefit_types":{"benefit_for":"lancer","benefit_vs":"all"},"effect_duration":{"duration_type":"turn","duration_value":1,"effect_lag":0},"effect_probabilities":{"1":20,"2":20,"3":20,"4":20,"5":20},"effect_values":{"1":20,"2":"40.0","3":60,"4":"80.0","5":100},"special":{}}]},{"skill_hero":"Norah","skill_num":3,"skill_name":"Momentum","skill_description":"Increasing all troops damage dealt by X% and reducing their damage taken by X%, every five attacks made by lancers for 2 turns","skill_troop_type":"lancer","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"attack","frequency_value":5},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Momentum/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"turns","duration_value":2,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":"10.0","3":15,"4":"20.0","5":25},"special":{}},{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":111,"extra_attack":false,"effect_is_chance":false,"effect_num":"Momentum/2","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turns","duration_value":2,"effect_lag":1},"effect_probabilities":{},"effect_values":{"1":5,"2":"10.0","3":15,"4":"20.0","5":25},"special":{}}]},{"skill_hero":"Norah","skill_num":4,"skill_name":"Widget: Steadfast Guard","skill_description":"Widget bonus: Increase Defense by X% for all troops when defending","skill_troop_type":"lancer","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":404,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Steadfast Guard/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"defense","stat":"defense"}}]}],"Patrick":[{"skill_hero":"Patrick","skill_num":1,"skill_name":"Super nutrients","skill_description":"Increasing Health by X% for all troop","skill_troop_type":"lancer","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":113,"extra_attack":false,"effect_is_chance":false,"effect_num":"Super nutrients/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":"10.0","3":15,"4":"20.0","5":25},"special":{}}]},{"skill_hero":"Patrick","skill_num":2,"skill_name":"Caloric booster","skill_description":"Increasing Attack by X% for all troops","skill_troop_type":"lancer","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":102,"extra_attack":false,"effect_is_chance":false,"effect_num":"Caloric booster/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":"10.0","3":15,"4":"20.0","5":25},"special":{}}]}],"Philly":[{"skill_hero":"Philly","skill_num":1,"skill_name":"Vigor tactics","skill_description":"Increasing Attack by X% and Defense by X% for all troops","skill_troop_type":"lancer","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":102,"extra_attack":false,"effect_is_chance":false,"effect_num":"Vigor tactics/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":3,"2":"6.0","3":9,"4":"12.0","5":15},"special":{}},{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":112,"extra_attack":false,"effect_is_chance":false,"effect_num":"Vigor tactics/2","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":2,"2":"4.0","3":6,"4":"8.0","5":10},"special":{}}]},{"skill_hero":"Philly","skill_num":2,"skill_name":"Dosage boost","skill_description":"Granting all troops' attack a 25% chance of dealing X% damage","skill_troop_type":"lancer","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":true,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":true,"effect_is_chance":true,"effect_num":"Dosage boost/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_probabilities":{"1":25,"2":25,"3":25,"4":25,"5":25},"effect_values":{"1":120,"2":"140.0","3":160,"4":"180.0","5":200},"special":{"effect_evolution":{"category":"effect_is_total_damage","data":{}}}}]},{"skill_hero":"Philly","skill_num":3,"skill_name":"Numbing spores","skill_description":"granting a 40% chance of reducing all troops' Damage taken by X%","skill_troop_type":"infantry","skill_permanent":false,"skill_is_chance":true,"skill_probability":40,"skill_round_stackable":true,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":111,"extra_attack":false,"effect_is_chance":false,"effect_num":"Numbing spores/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":10,"2":"20.0","3":30,"4":"40.0","5":50},"special":{}}]},{"skill_hero":"Philly","skill_num":4,"skill_name":"Widget: Guardian Bloom","skill_description":"Widget bonus: Increase Health by X% for all troops when defending","skill_troop_type":"lancer","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":403,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Guardian Bloom/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"defense","stat":"health"}}]}],"Reina":[{"skill_hero":"Reina","skill_num":1,"skill_name":"Assassin's instinct","skill_description":"Increasing normal attack damage by X% for all troops","skill_troop_type":"lancer","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Assassin's instinct/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target","benefit_on":"normal"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":10,"2":"15.0","3":20,"4":"25.0","5":30},"special":{}}]},{"skill_hero":"Reina","skill_num":2,"skill_name":"Swift jive","skill_description":"Grants all troops a X% chance of dodging normal attacks","skill_troop_type":"lancer","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"Dodge","effect_op":0,"extra_attack":false,"effect_is_chance":true,"effect_num":"Swift jive/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any","benefit_on":"normal"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_probabilities":{"1":4,"2":8,"3":12,"4":16,"5":20},"effect_values":{},"special":{}}]},{"skill_hero":"Reina","skill_num":3,"skill_name":"Shadow blade","skill_description":"With Reina's clever tactics, her Lancers have a 25% chance of performing an extra attack, dealing X% damage","skill_troop_type":"lancer","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":true,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":true,"effect_is_chance":true,"effect_num":"Shadow blade/1","trigger_types":{"trigger_for":"lancer","trigger_vs":"all"},"benefit_types":{"benefit_for":"lancer","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":1,"effect_lag":0},"effect_probabilities":{"1":25,"2":25,"3":25,"4":25,"5":25},"effect_values":{"1":120,"2":"140.0","3":160,"4":"180.0","5":200},"special":{"effect_evolution":{"category":"effect_is_total_damage","data":{}}}}]},{"skill_hero":"Reina","skill_num":4,"skill_name":"Widget: Lancer's Edge","skill_description":"Widget bonus: Increase Lethality by X% for all troops when attacking","skill_troop_type":"lancer","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":401,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Lancer's Edge/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"attack","stat":"lethality"}}]}],"Renee":[{"skill_hero":"Renee","skill_num":1,"skill_name":"Nightmare Trace","skill_description":"Troops place Dream Marks on targets every two turns, dealing extra Lancer damage once next turn","skill_troop_type":"lancer","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":2},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Nightmare Trace/1","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"lancer","benefit_vs":"any"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":1},"effect_probabilities":{},"effect_values":{"1":40,"2":"80.0","3":120,"4":"160.0","5":200},"special":{}}]},{"skill_hero":"Renee","skill_num":2,"skill_name":"Dreamcatcher","skill_description":"Dream Marks highlight enemy vulnerabilities, increasing damage dealt by Lancers to marked targets","skill_troop_type":"lancer","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":2,"skill_first_round":2},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Dreamcatcher/1","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"lancer","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":1,"effect_lag":1},"effect_probabilities":{},"effect_values":{"1":30,"2":"60.0","3":90,"4":"120.0","5":150},"special":{}}]},{"skill_hero":"Renee","skill_num":3,"skill_name":"Dreamslice","skill_description":"Dream Marks expose enemy weaknesses, increasing damage taken by marked targets for all troops","skill_troop_type":"lancer","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":2},"skill_effects":[{"affects_opponent":true,"effect_type":"OppDefenseDown","effect_op":214,"extra_attack":false,"effect_is_chance":false,"effect_num":"Dreamslice/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":1,"effect_lag":1},"effect_probabilities":{},"effect_values":{"1":15,"2":"30.0","3":45,"4":"60.0","5":75},"special":{}}]},{"skill_hero":"Renee","skill_num":4,"skill_name":"Widget: Dreamfang Rally","skill_description":"Widget bonus: Increase Lethality by X% for all troops when rallying","skill_troop_type":"lancer","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":401,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Dreamfang Rally/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"rally","stat":"lethality"}}]}],"Seo-yoon":[{"skill_hero":"Seo-yoon","skill_num":1,"skill_name":"Rallying Beat","skill_description":"Increasing all Troops Attack by X%","skill_troop_type":"marksmen","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":102,"extra_attack":false,"effect_is_chance":false,"effect_num":"Rallying Beat/1","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"all","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":"10.0","3":15,"4":"20.0","5":25},"special":{}}]},{"skill_hero":"Seo-yoon","skill_num":2,"skill_name":"Non-combat placeholder","skill_description":"Placeholder skill to satisfy simulator config for non-combat hero data","skill_troop_type":"marksmen","skill_permanent":false,"skill_is_chance":true,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":999,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[]}],"Sergey":[{"skill_hero":"Sergey","skill_num":1,"skill_name":"Defender's edge","skill_description":"Reduces damage taken by X% for all troops","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":111,"extra_attack":false,"effect_is_chance":false,"effect_num":"Defender's edge/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":4,"2":"8.0","3":12,"4":"16.0","5":20},"special":{}}]},{"skill_hero":"Sergey","skill_num":2,"skill_name":"Weaken","skill_description":"Reduces Attack by X% for all enemy troops","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"OppDamageDown","effect_op":202,"extra_attack":false,"effect_is_chance":false,"effect_num":"Weaken/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":4,"2":"8.0","3":12,"4":"16.0","5":20},"special":{}}]}],"Wayne":[{"skill_hero":"Wayne","skill_num":1,"skill_name":"Thunder Strike","skill_description":"Wayne's brilliant battle planning allows all troops to launch an extra attack every 4 turns, dealing X% damage.","skill_troop_type":"marksmen","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":4},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":1010,"extra_attack":true,"effect_is_chance":false,"effect_num":"Thunder Strike/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":20,"2":40,"3":60,"4":80,"5":100},"special":{}}]},{"skill_hero":"Wayne","skill_num":2,"skill_name":"Roundabout Hit","skill_description":"Wayne's stratagems can pierce the thickest of defenses. On every other attack, his Marksmen deal X% extra damage to enemy Lancers and Y% extra damage to enemy Marksmen.","skill_troop_type":"marksmen","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":true,"skill_type_relation":true,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"attack","frequency_value":2},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":1011,"extra_attack":true,"effect_is_chance":false,"effect_num":"Roundabout Hit/1","trigger_types":{"trigger_for":"marksmen","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"lancer"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":8,"2":16,"3":24,"4":32,"5":40},"special":{}},{"affects_opponent":false,"effect_type":"DamageUp","effect_op":1012,"extra_attack":true,"effect_is_chance":false,"effect_num":"Roundabout Hit/2","trigger_types":{"trigger_for":"marksmen","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"marksmen"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":4,"2":8,"3":12,"4":16,"5":20},"special":{}}]},{"skill_hero":"Wayne","skill_num":3,"skill_name":"Fleet","skill_description":"Wayne ensures no misstep goes unpunished with an eagle's eye for weakness, granting all troops' attacks a X% Crit Rate.","skill_troop_type":"marksmen","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":"turn","frequency_value":1},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":1013,"extra_attack":false,"effect_is_chance":true,"effect_num":"Fleet/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"attack","duration_value":1,"effect_lag":0},"effect_probabilities":{"1":5,"2":10,"3":15,"4":20,"5":25},"effect_values":{"1":100,"2":100,"3":100,"4":100,"5":100},"special":{}}]},{"skill_hero":"Wayne","skill_num":4,"skill_name":"Widget: Tactical Edge","skill_description":"Widget bonus: Increase Lethality by X% for all troops when defending","skill_troop_type":"marksmen","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":401,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Tactical Edge/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"defense","stat":"lethality"}}]}],"WuMing":[{"skill_hero":"Wu Ming","skill_num":1,"skill_name":"Shadow's Evasion","skill_description":"Reducing troops' damage taken from normal attacks by X% and from skill attacks by Y%","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":111,"extra_attack":false,"effect_is_chance":false,"effect_num":"Shadow's Evasion/1","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"infantry","benefit_vs":"any","benefit_on":"normal"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":10,"3":15,"4":20,"5":25},"special":{}},{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":111,"extra_attack":false,"effect_is_chance":false,"effect_num":"Shadow's Evasion/2","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"infantry","benefit_vs":"any","benefit_on":"extra"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":6,"2":12,"3":18,"4":24,"5":30},"special":{}}]},{"skill_hero":"Wu Ming","skill_num":2,"skill_name":"Crescent Uplift","skill_description":"Increasing all troops' damage dealt by X%","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Crescent Uplift/1","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"all","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":4,"2":8,"3":12,"4":16,"5":20},"special":{}}]},{"skill_hero":"Wu Ming","skill_num":3,"skill_name":"Elemental Resonance","skill_description":"Increasing skill damage dealt by X% for all troops","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Elemental Resonance/1","trigger_types":{"trigger_for":"once","trigger_vs":"all"},"benefit_types":{"benefit_for":"all","benefit_vs":"any","benefit_on":"extra"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":10,"3":15,"4":20,"5":25},"special":{}}]},{"skill_hero":"Wu Ming","skill_num":4,"skill_name":"Widget: Iron Bastion","skill_description":"Widget bonus: Increase Defense by X% for all troops when defending","skill_troop_type":"infantry","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":404,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Iron Bastion/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"defense","stat":"defense"}}]}],"Zinman":[{"skill_hero":"Zinman","skill_num":1,"skill_name":"Implacable","skill_description":"Increasing all troops' Defense by X% and Health by X%","skill_troop_type":"marksmen","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":112,"extra_attack":false,"effect_is_chance":false,"effect_num":"Implacable/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":2,"2":"4.0","3":6,"4":"8.0","5":10},"special":{}},{"affects_opponent":false,"effect_type":"DefenseUp","effect_op":113,"extra_attack":false,"effect_is_chance":false,"effect_num":"Implacable/2","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":2,"2":"4.0","3":6,"4":"8.0","5":10},"special":{}}]},{"skill_hero":"Zinman","skill_num":2,"skill_name":"Bastionist","skill_description":"Increase building speed (non combat placeholder skill)","skill_troop_type":"marksmen","skill_permanent":false,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":999,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[]},{"skill_hero":"Zinman","skill_num":3,"skill_name":"Positional Battler","skill_description":"Increasing damage dealt by X% for all troops","skill_troop_type":"marksmen","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"DamageUp","effect_op":101,"extra_attack":false,"effect_is_chance":false,"effect_num":"Positional Battler/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"target"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":"10.0","3":15,"4":"20.0","5":25},"special":{}}]},{"skill_hero":"Zinman","skill_num":4,"skill_name":"Widget: Woodpecker","skill_description":"Widget bonus: Increase Attack by X% for all troops when defending","skill_troop_type":"marksmen","skill_permanent":true,"skill_is_chance":false,"skill_probability":0,"skill_round_stackable":false,"skill_type_relation":false,"skill_order":1,"skill_type":"hero_skill","skill_frequency":{"frequency_type":null,"frequency_value":0},"skill_effects":[{"affects_opponent":false,"effect_type":"StatBonus","effect_op":402,"extra_attack":false,"effect_is_chance":false,"effect_num":"Widget: Woodpecker/1","trigger_types":{"trigger_for":"all","trigger_vs":"all"},"benefit_types":{"benefit_for":"trigger","benefit_vs":"any"},"effect_duration":{"duration_type":"turn","duration_value":-1,"effect_lag":0},"effect_probabilities":{},"effect_values":{"1":5,"2":7.5,"3":10,"4":12.5,"5":15},"special":{"role":"defense","stat":"attack"}}]}]}
;


// ─────────────────────────────────────────────────────────────────────────────
// COMBAT ENGINE — ported from Ryo's wos-simulator concepts (not copied code)
// ─────────────────────────────────────────────────────────────────────────────

const UNIT_TYPES = ["infantry", "lancer", "marksman"];

// Rock-paper-scissors matchup: Infantry→Lancer, Lancer→Marksman, Marksman→Infantry
const PRIMARY_TARGET = { infantry: "lancer", lancer: "marksman", marksman: "infantry" };
const ATTACK_ORDER   = ["infantry", "lancer", "marksman"]; // priority when primary is gone

function toUnitType(str) {
  if (!str) return null;
  const s = str.toLowerCase();
  if (s.includes("inf"))  return "infantry";
  if (s.includes("lanc")) return "lancer";
  if (s.includes("mark")) return "marksman";
  return null;
}

// Build effective attack/defense values per unit type for a fighter.
// Formula from Fighter.py: calc_by_troop
//   attack  = base_atk  * (1 + bonus_atk/100)  * base_leth * (1 + bonus_leth/100) / 100
//   defense = base_hp   * (1 + bonus_hp/100)   * base_def  * (1 + bonus_def/100)  / 100
function buildFighterStats(troops, bonuses) {
  // troops: { "infantry_t10_fc8": 50000, ... }
  // bonuses: { infantry: {atk,def,leth,hp}, lancer: {...}, marksman: {...} }
  const byType = { infantry: { count:0, totalAtk:0, totalDef:0 },
                   lancer:   { count:0, totalAtk:0, totalDef:0 },
                   marksman: { count:0, totalAtk:0, totalDef:0 } };

  for (const [troopKey, count] of Object.entries(troops)) {
    if (!count || count <= 0) continue;
    const td = TROOP_STATS[troopKey];
    if (!td) continue;
    const ut = td.type;
    const b  = bonuses[ut] || { atk:0, def:0, leth:0, hp:0 };
    const atkVal  = td.atk  * (1 + b.atk/100)  * td.leth * (1 + b.leth/100) / 100;
    const defVal  = td.hp   * (1 + b.hp/100)   * td.def  * (1 + b.def/100)  / 100;
    byType[ut].count    += count;
    byType[ut].totalAtk += count * atkVal;
    byType[ut].totalDef += count * defVal;
  }

  const result = {};
  for (const ut of UNIT_TYPES) {
    const d = byType[ut];
    result[ut] = {
      count:  d.count,
      atk:    d.count > 0 ? d.totalAtk / d.count : 0,
      def:    d.count > 0 ? d.totalDef / d.count : 0,
    };
  }
  return result;
}

// Resolve active troop skills for a fighter given their troops
function resolveActiveTroopSkills(troops) {
  const active = [];
  for (const skill of TROOP_SKILLS) {
    let level = 0;
    for (const [troopKey, count] of Object.entries(troops)) {
      if (!count || count <= 0) continue;
      const td = TROOP_STATS[troopKey];
      if (!td) continue;
      if (toUnitType(skill.skill_troop_type) !== td.type) continue;
      for (const cond of skill.skill_conditions) {
        if (td[cond.condition_type] >= cond.condition_value) {
          level = Math.max(level, parseInt(cond.level));
        }
      }
    }
    if (level > 0) active.push({ ...skill, activeLevel: String(level) });
  }
  return active;
}

// Resolve active hero skills given { HeroName: { skill_1: level, skill_2: level } }
function resolveActiveHeroSkills(heroes) {
  const active = [];
  for (const [heroName, skillLevels] of Object.entries(heroes)) {
    const heroData = HERO_SKILLS[heroName];
    if (!heroData) continue;
    for (const skillDef of heroData) {
      const key = `skill_${skillDef.skill_num}`;
      const level = skillLevels[key];
      if (!level || level <= 0) continue;
      active.push({ ...skillDef, activeLevel: String(level) });
    }
  }
  return active;
}

// Determine which enemy unit type a unit attacks this round
function getTarget(ut, roundTroops, lancerOrderOverride = null) {
  const order = (ut === "lancer" && lancerOrderOverride)
    ? lancerOrderOverride
    : [PRIMARY_TARGET[ut], ...UNIT_TYPES.filter(x => x !== PRIMARY_TARGET[ut])];
  for (const t of order) {
    if ((roundTroops[t] || 0) > 0) return t;
  }
  return null;
}

// Army size formula from BattleRound.calc_round_army:
// army = ceil(sqrt(remaining) * sqrt(armyMin))
function calcArmy(remaining, armyMin) {
  return Math.ceil(Math.sqrt(remaining) * Math.sqrt(armyMin));
}

// Damage coefficient: (DamageUp * OppDefenseDown) / (DefenseUp * OppDamageDown)
// Each bucket is an object { opCode: totalValue }
// Values from different op codes multiply together, same op code adds
function calcCoef(attackerBuckets, defenderBuckets) {
  const prod = (bucket) => {
    let r = 1.0;
    for (const v of Object.values(bucket)) r *= (1 + v / 100);
    return r;
  };
  const dmgUp      = prod(attackerBuckets.DamageUp      || {});
  const oppDefDown = prod(attackerBuckets.OppDefenseDown || {});
  const defUp      = prod(defenderBuckets.DefenseUp      || {});
  const oppDmgDown = prod(defenderBuckets.OppDamageDown  || {});
  const denom = defUp * oppDmgDown;
  return denom < 1e-10 ? dmgUp * oppDefDown * 1e10 : (dmgUp * oppDefDown) / denom;
}

// ── Skill effect resolution ───────────────────────────────────────────────────
// For each active skill, determine if it fires this round, then build
// a flat list of "benefits" (modifiers) that apply to damage calculation.
//
// For chance-based skills we use the Monte Carlo toggle:
//   deterministic: use expected value (probability * value)
//   monteCarlo:    roll Math.random()

function buildBenefits(activeSkills, roundIdx, roundTroops, isMonteCarlo) {
  const benefits = [];

  for (const skill of activeSkills) {
    // ── Skill-level condition check ──────────────────────────────────────────
    if (!skill.skill_permanent) {
      const freq = skill.skill_frequency;
      if (freq && freq.frequency_type === "turn") {
        const fv = freq.frequency_value || 1;
        const start = (skill.skill_frequency.skill_first_round != null)
          ? skill.skill_frequency.skill_first_round - 1
          : fv - 1;
        if ((roundIdx - start) % fv !== 0) continue;
      }
      if (freq && freq.skill_last_round != null && roundIdx + 1 > freq.skill_last_round) continue;

      // Skill-level chance
      if (skill.skill_is_chance) {
        if (isMonteCarlo) {
          if (Math.random() * 100 > skill.skill_probability) continue;
        }
        // deterministic: will apply expected-value scaling below
      }
    }

    // type_relation: skill only active if its troop type still present
    if (skill.skill_type_relation) {
      const ut = toUnitType(skill.skill_troop_type);
      if (ut && (roundTroops[ut] || 0) <= 0) continue;
    }

    for (const eff of skill.skill_effects) {
      const val = eff.effect_values[skill.activeLevel];
      if (val == null) continue;
      let effectiveVal = parseFloat(val);

      // Effect-level chance
      let effectProb = 1.0;
      if (eff.effect_is_chance) {
        const probVal = eff.effect_probabilities?.[skill.activeLevel];
        if (probVal != null) {
          const prob = parseFloat(probVal) / 100;
          if (isMonteCarlo) {
            if (Math.random() > prob) continue;
          } else {
            effectProb = prob; // scale by probability for deterministic
          }
        }
      }

      // Skill-level chance scaling (deterministic mode)
      if (!isMonteCarlo && skill.skill_is_chance) {
        effectProb *= skill.skill_probability / 100;
      }

      // Handle evolving effects (e.g. Hector Rampant — value decays 15% per attack)
      // For now treat as full value (simplification, good enough for avg estimate)
      effectiveVal = effectiveVal * effectProb;

      benefits.push({
        skillName:      skill.skill_name,
        effectNum:      eff.effect_num,
        effectType:     eff.effect_type,    // DamageUp, DefenseUp, OppDamageDown, OppDefenseDown, etc.
        op:             eff.effect_op,
        extraAttack:    eff.extra_attack,
        affectsOpponent: eff.affects_opponent,
        trigFor:        toUnitType(eff.trigger_types?.trigger_for) || eff.trigger_types?.trigger_for,
        trigVs:         toUnitType(eff.trigger_types?.trigger_vs)  || eff.trigger_types?.trigger_vs,
        benFor:         toUnitType(eff.benefit_types?.benefit_for) || eff.benefit_types?.benefit_for,
        benVs:          toUnitType(eff.benefit_types?.benefit_vs)  || eff.benefit_types?.benefit_vs,
        durationType:   eff.effect_duration?.duration_type,
        durationValue:  eff.effect_duration?.duration_value,
        onDefense:      eff.special?.onDefense || false,
        entanglement:   eff.special?.effect_entanglment || null,
        value:          effectiveVal,
      });
    }
  }
  return benefits;
}

// Filter benefits for a specific attacker unit type vs a specific target unit type
function getBenefitsForMatchup(benefits, ut, vs, role) {
  return benefits.filter(b => {
    // Check trigger_for
    const tf = b.trigFor;
    if (tf !== "all" && tf !== "once" && tf !== ut) return false;
    // Check trigger_vs
    const tv = b.trigVs;
    if (tv !== "all" && tv !== vs) return false;
    // Check ben_vs
    const bv = b.benVs;
    if (bv !== "all" && bv !== "any" && bv !== "target" && bv !== vs) return false;
    // Entanglement check (simplified — just check if the referenced skill is also active)
    // For now we include entangled effects (conservative/slightly generous estimate)
    return true;
  });
}

// Build attacker/defender modifier buckets for calc_coef
function buildModifierBuckets(attackerBenefits, defenderBenefits, ut, vs) {
  const atkBuckets = { DamageUp: {}, OppDefenseDown: {} };
  const defBuckets = { DefenseUp: {}, OppDamageDown: {} };

  for (const b of attackerBenefits) {
    if (b.extraAttack) continue; // handled separately
    if (b.affectsOpponent) continue;
    if (b.effectType === "DamageUp" || b.effectType === "OppDefenseDown") {
      const bucket = atkBuckets[b.effectType];
      bucket[b.op] = (bucket[b.op] || 0) + b.value;
    }
  }
  // Opponent's damage-down effects on the attacker
  for (const b of defenderBenefits) {
    if (b.extraAttack) continue;
    if (b.effectType === "OppDamageDown") {
      defBuckets.OppDamageDown[b.op] = (defBuckets.OppDamageDown[b.op] || 0) + b.value;
    }
    if (b.effectType === "DefenseUp") {
      defBuckets.DefenseUp[b.op] = (defBuckets.DefenseUp[b.op] || 0) + b.value;
    }
  }
  return { atkBuckets, defBuckets };
}

// ── Main battle simulation ────────────────────────────────────────────────────
function simulateBattle(attacker, defender, isMonteCarlo) {
  // attacker/defender: { stats: {infantry:{atk,def,count}, lancer:..., marksman:...},
  //                      skills: [...activeSkills],
  //                      troops: rawTroopObj }

  // Initial troop counts
  const attTroops = { ...Object.fromEntries(UNIT_TYPES.map(ut => [ut, attacker.stats[ut].count])) };
  const defTroops = { ...Object.fromEntries(UNIT_TYPES.map(ut => [ut, defender.stats[ut].count])) };

  const totalAtt = UNIT_TYPES.reduce((s, ut) => s + attTroops[ut], 0);
  const totalDef = UNIT_TYPES.reduce((s, ut) => s + defTroops[ut], 0);
  if (totalAtt === 0 || totalDef === 0) return null;

  const armyMin = Math.min(totalAtt, totalDef);

  // Track casualties per round for charting (sample every 10 rounds)
  const roundLog = [];
  const MAX_ROUNDS = 2000;

  let attCurrent = { ...attTroops };
  let defCurrent = { ...defTroops };

  let rounds = 0;

  while (rounds < MAX_ROUNDS) {
    const attTotal = UNIT_TYPES.reduce((s, ut) => s + attCurrent[ut], 0);
    const defTotal = UNIT_TYPES.reduce((s, ut) => s + defCurrent[ut], 0);
    if (attTotal <= 0 || defTotal <= 0) break;

    // Log every 25 rounds
    if (rounds % 25 === 0) {
      roundLog.push({ round: rounds, att: attTotal, def: defTotal });
    }

    // Build benefits for this round
    const attBenefits = buildBenefits(attacker.skills, rounds, attCurrent, isMonteCarlo);
    const defBenefits = buildBenefits(defender.skills, rounds, defCurrent, isMonteCarlo);

    // Calculate kills for each attacker unit type
    const attKills = { infantry: 0, lancer: 0, marksman: 0 };
    const defKills = { infantry: 0, lancer: 0, marksman: 0 };

    for (const ut of UNIT_TYPES) {
      if (attCurrent[ut] <= 0) continue;
      const target = getTarget(ut, defCurrent);
      if (!target) continue;

      const army = calcArmy(attCurrent[ut], armyMin);
      // Lethality multiplier scales attacker effective ATK; HP multiplier scales defender effective DEF
      const attLeth = attacker.stats[ut].lethMultiplier ?? 1;
      const defHp   = defender.stats[target].hpMultiplier ?? 1;
      const baseDmg = army * attacker.stats[ut].atk * attLeth / (defender.stats[target].def * defHp) / 100;

      const attFilt = getBenefitsForMatchup(attBenefits, ut, target, "attack");
      const defFilt = getBenefitsForMatchup(defBenefits, target, ut, "defense");
      const { atkBuckets, defBuckets } = buildModifierBuckets(attFilt, defFilt, ut, target);
      const coef = calcCoef(atkBuckets, defBuckets);

      attKills[ut] = Math.max(0, baseDmg * coef);

      // Extra attack benefits (e.g. Crystal Lance double damage, Volley)
      for (const b of attFilt) {
        if (!b.extraAttack) continue;
        const extraDmg = baseDmg * (b.value / 100);
        attKills[ut] += Math.max(0, extraDmg);
      }
    }

    for (const ut of UNIT_TYPES) {
      if (defCurrent[ut] <= 0) continue;
      const target = getTarget(ut, attCurrent);
      if (!target) continue;

      const army = calcArmy(defCurrent[ut], armyMin);
      const defLeth = defender.stats[ut].lethMultiplier ?? 1;
      const attHp   = attacker.stats[target].hpMultiplier ?? 1;
      const baseDmg = army * defender.stats[ut].atk * defLeth / (attacker.stats[target].def * attHp) / 100;

      const defFilt = getBenefitsForMatchup(defBenefits, ut, target, "attack");
      const attFilt = getBenefitsForMatchup(attBenefits, target, ut, "defense");
      const { atkBuckets, defBuckets } = buildModifierBuckets(defFilt, attFilt, ut, target);
      const coef = calcCoef(atkBuckets, defBuckets);

      defKills[ut] = Math.max(0, baseDmg * coef);

      for (const b of defFilt) {
        if (!b.extraAttack) continue;
        const extraDmg = baseDmg * (b.value / 100);
        defKills[ut] += Math.max(0, extraDmg);
      }
    }

    // Apply casualties simultaneously
    const newAtt = {};
    const newDef = {};
    for (const ut of UNIT_TYPES) {
      newAtt[ut] = Math.max(0, attCurrent[ut] - defKills[ut]);
      newDef[ut] = Math.max(0, defCurrent[ut] - attKills[ut]);
    }
    attCurrent = newAtt;
    defCurrent = newDef;
    rounds++;
  }

  const attRemaining = UNIT_TYPES.reduce((s, ut) => s + Math.ceil(attCurrent[ut]), 0);
  const defRemaining = UNIT_TYPES.reduce((s, ut) => s + Math.ceil(defCurrent[ut]), 0);
  const attLost = totalAtt - attRemaining;
  const defLost = totalDef - defRemaining;

  roundLog.push({ round: rounds, att: attRemaining, def: defRemaining });

  return {
    winner:         attRemaining > defRemaining ? "attacker" : defRemaining > attRemaining ? "defender" : "tie",
    rounds,
    attRemaining,   defRemaining,
    attLost,        defLost,
    attPctLost:     totalAtt > 0 ? (attLost / totalAtt * 100) : 0,
    defPctLost:     totalDef > 0 ? (defLost / totalDef * 100) : 0,
    attByType:      { infantry: Math.ceil(attCurrent.infantry), lancer: Math.ceil(attCurrent.lancer), marksman: Math.ceil(attCurrent.marksman) },
    defByType:      { infantry: Math.ceil(defCurrent.infantry), lancer: Math.ceil(defCurrent.lancer), marksman: Math.ceil(defCurrent.marksman) },
    roundLog,
  };
}

// Monte Carlo: run N times, average results
function runMonteCarlo(attacker, defender, runs = 500) {
  const results = [];
  for (let i = 0; i < runs; i++) {
    const r = simulateBattle(attacker, defender, true);
    if (r) results.push(r);
  }
  if (!results.length) return null;

  const wins = results.filter(r => r.winner === "attacker").length;
  const avg = (fn) => results.reduce((s, r) => s + fn(r), 0) / results.length;

  return {
    winRate:        wins / results.length * 100,
    winner:         wins > results.length * 0.5 ? "attacker" : wins < results.length * 0.5 ? "defender" : "tie",
    rounds:         Math.round(avg(r => r.rounds)),
    attRemaining:   Math.round(avg(r => r.attRemaining)),
    defRemaining:   Math.round(avg(r => r.defRemaining)),
    attLost:        Math.round(avg(r => r.attLost)),
    defLost:        Math.round(avg(r => r.defLost)),
    attPctLost:     avg(r => r.attPctLost),
    defPctLost:     avg(r => r.defPctLost),
    attByType: {
      infantry: Math.round(avg(r => r.attByType.infantry)),
      lancer:   Math.round(avg(r => r.attByType.lancer)),
      marksman: Math.round(avg(r => r.attByType.marksman)),
    },
    defByType: {
      infantry: Math.round(avg(r => r.defByType.infantry)),
      lancer:   Math.round(avg(r => r.defByType.lancer)),
      marksman: Math.round(avg(r => r.defByType.marksman)),
    },
    roundLog: results[Math.floor(results.length / 2)].roundLog, // median run for chart
    isMonteCarlo: true,
    runs: results.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS / CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  bg:      "var(--c-bg)",      card:    "var(--c-card)",
  surface: "var(--c-surface)", border:  "var(--c-border)",
  textPri: "var(--c-textPri)", textSec: "var(--c-textSec)", textDim: "var(--c-textDim)",
  accent:  "var(--c-accent)",  blue:    "var(--c-blue)",
  green:   "var(--c-green)",   red:     "var(--c-red)",    amber:   "var(--c-amber)",
};

const HERO_NAMES = Object.keys(HERO_SKILLS).sort();
const TIERS = [5,6,7,8,9,10,11];
const FC_LEVELS = [0,1,2,3,4,5,6,7,8];
const UNIT_LABELS = { infantry: "Infantry", lancer: "Lancer", marksman: "Marksman" };
const UNIT_COLORS = { infantry: COLORS.green, lancer: COLORS.blue, marksman: COLORS.amber };

function fmt(n) { return Math.round(n).toLocaleString(); }
function fmtPct(n) { return n.toFixed(1) + "%"; }

function getTroopKey(ut, tier, fc) {
  const base = ut === "infantry" ? "infantry" : ut === "lancer" ? "lancer" : "marksman";
  return fc > 0 ? `${base}_t${tier}_fc${fc}` : `${base}_t${tier}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const C = COLORS;

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase", color: C.textDim, fontFamily: "'Space Mono',monospace" }}>
        {title}
      </div>
      {subtitle && <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

function StatInput({ label, value, onChange, unit = "%" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ fontSize: 10, color: C.textDim, fontFamily: "'Space Mono',monospace",
        textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          type="number" value={value} min={0} step={0.01}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          style={{ width: 80, padding: "4px 6px", fontSize: 12,
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 4, color: C.textPri, fontFamily: "'Space Mono',monospace" }}
        />
        <span style={{ fontSize: 11, color: C.textDim }}>{unit}</span>
      </div>
    </div>
  );
}

function TroopRow({ ut, tier, fc, count, onTier, onFc, onCount }) {
  const color = UNIT_COLORS[ut];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "80px 70px 70px 1fr",
      gap: 6, alignItems: "center", marginBottom: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color }}>{UNIT_LABELS[ut]}</div>
      <select value={tier} onChange={e => onTier(Number(e.target.value))}
        style={{ padding: "3px 4px", fontSize: 11, background: C.surface,
          border: `1px solid ${C.border}`, borderRadius: 4, color: C.textPri }}>
        {TIERS.map(t => <option key={t} value={t}>T{t}</option>)}
      </select>
      <select value={fc} onChange={e => onFc(Number(e.target.value))}
        style={{ padding: "3px 4px", fontSize: 11, background: C.surface,
          border: `1px solid ${C.border}`, borderRadius: 4, color: C.textPri }}>
        {FC_LEVELS.map(f => <option key={f} value={f}>FC{f}</option>)}
      </select>
      <input type="number" value={count} min={0} step={1000}
        onChange={e => onCount(Math.max(0, parseInt(e.target.value) || 0))}
        placeholder="0"
        style={{ padding: "3px 6px", fontSize: 11, background: C.surface,
          border: `1px solid ${C.border}`, borderRadius: 4, color: C.textPri,
          fontFamily: "'Space Mono',monospace" }}
      />
    </div>
  );
}

// Mini bar chart rendered as SVG
function TroopBar({ attVal, defVal, label, color }) {
  const max = Math.max(attVal, defVal, 1);
  const attW = (attVal / max) * 100;
  const defW = (defVal / max) * 100;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ fontSize: 10, color, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <span style={{ fontSize: 10, color: C.blue, width: 60, textAlign: "right",
          fontFamily: "'Space Mono',monospace" }}>{fmt(attVal)}</span>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${attW}%`, height: "100%", background: C.blue,
              borderRadius: 4, transition: "width 0.3s" }} />
          </div>
          <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${defW}%`, height: "100%", background: C.red,
              borderRadius: 4, transition: "width 0.3s" }} />
          </div>
        </div>
        <span style={{ fontSize: 10, color: C.red, width: 60,
          fontFamily: "'Space Mono',monospace" }}>{fmt(defVal)}</span>
      </div>
    </div>
  );
}

// Simple SVG line chart for troop decay over rounds
function DecayChart({ roundLog }) {
  if (!roundLog || roundLog.length < 2) return null;
  const W = 360, H = 90, PAD = 30;
  const maxTroops = Math.max(...roundLog.flatMap(r => [r.att, r.def]), 1);
  const maxRound  = roundLog[roundLog.length - 1].round || 1;

  const toX = r => PAD + (r / maxRound) * (W - PAD * 2);
  const toY = v => PAD + (1 - v / maxTroops) * (H - PAD);

  const attPath = roundLog.map((r, i) =>
    `${i === 0 ? "M" : "L"}${toX(r.round).toFixed(1)},${toY(r.att).toFixed(1)}`).join(" ");
  const defPath = roundLog.map((r, i) =>
    `${i === 0 ? "M" : "L"}${toX(r.round).toFixed(1)},${toY(r.def).toFixed(1)}`).join(" ");

  return (
    <svg width={W} height={H} style={{ display: "block", margin: "0 auto" }}>
      {/* Axes */}
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD + 4} stroke={C.border} strokeWidth={1} />
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={C.border} strokeWidth={1} />
      {/* Lines */}
      <path d={attPath} fill="none" stroke={C.blue} strokeWidth={2} strokeLinejoin="round" />
      <path d={defPath} fill="none" stroke={C.red}  strokeWidth={2} strokeLinejoin="round" />
      {/* Labels */}
      <text x={PAD + 4} y={PAD + 10} fill={C.blue} fontSize={9}>Attacker</text>
      <text x={PAD + 4} y={PAD + 20} fill={C.red}  fontSize={9}>Defender</text>
      <text x={W / 2} y={H - 2}  fill={C.textDim} fontSize={8} textAnchor="middle">Rounds</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-LOAD SYSTEM
// Reads all per-character localStorage data and computes combined bonus stats
// Sources: War Academy, Research Center, Experts, Pets, Daybreak Island,
//          Chief Profile (deployment capacity), Troop Inventory
// ─────────────────────────────────────────────────────────────────────────────

// WA research stat lookup — index 2 of each level row is the stat value
// from WarAcademy.jsx WA_RESEARCH
const WA_RESEARCH_STAT = {
  lethality: [0,1.5,3,6,9,12,15,20,25],   // % per level, max lv 8
  health:    [0,1.5,3,6,9,12,15,20,25],
  attack:    [0,2,4,6,8.5,11,14,17,20,25,30,35,40],   // max lv 12
  defense:   [0,2,4,6,8.5,11,14,17,20,25,30,35,40],
};

// Expert stat lookup tables (from Experts.jsx)
const EXP_CYRILLE  = [0,1.58,1.65,1.73,1.80,1.88,1.95,2.03,2.10,2.18,2.25,2.93,3.00,3.08,3.15,3.23,3.30,3.38,3.45,3.53,3.60,4.28,4.35,4.43,4.50,4.58,4.65,4.73,4.80,4.88,4.95,5.63,5.70,5.78,5.85,5.93,6.00,6.08,6.15,6.23,6.30,6.98,7.05,7.13,7.20,7.28,7.35,7.43,7.50,7.58,7.65,8.33,8.40,8.48,8.55,8.63,8.70,8.78,8.85,8.93,9.00,9.68,9.75,9.83,9.90,9.98,10.05,10.13,10.20,10.28,10.35,11.03,11.10,11.18,11.25,11.33,11.40,11.48,11.55,11.63,11.70,12.38,12.45,12.53,12.60,12.68,12.75,12.83,12.90,12.98,13.05,13.73,13.80,13.88,13.95,14.03,14.10,14.18,14.25,14.33,15.00];
const EXP_AGNES    = EXP_CYRILLE.slice();
const EXP_ROMULUS  = [0,2.1,2.2,2.3,2.4,2.5,2.6,2.7,2.8,2.9,3.0,3.9,4.0,4.1,4.2,4.3,4.4,4.5,4.6,4.7,4.8,5.7,5.8,5.9,6.0,6.1,6.2,6.3,6.4,6.5,6.6,7.5,7.6,7.7,7.8,7.9,8.0,8.1,8.2,8.3,8.4,9.3,9.4,9.5,9.6,9.7,9.8,9.9,10.0,10.1,10.2,11.1,11.2,11.3,11.4,11.5,11.6,11.7,11.8,11.9,12.0,12.9,13.0,13.1,13.2,13.3,13.4,13.5,13.6,13.7,13.8,14.7,14.8,14.9,15.0,15.1,15.2,15.3,15.4,15.5,15.6,16.5,16.6,16.7,16.8,16.9,17.0,17.1,17.2,17.3,17.4,18.3,18.4,18.5,18.6,18.7,18.8,18.9,19.0,19.1,19.2];
const EXP_ROMULUS_SK2 = [0,0.5,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9,9.5,10];
const EXP_ROMULUS_SK3 = EXP_ROMULUS_SK2.slice();
const EXP_HOLGER   = EXP_CYRILLE.slice();
const EXP_FABIAN   = EXP_CYRILLE.slice();
const EXP_VALERIA  = [0,2.1,2.2,2.3,2.4,2.5,2.6,2.7,2.8,2.9,3.8,3.9,4.0,4.1,4.2,4.3,4.4,4.5,4.6,4.7,5.6,5.7,5.8,5.9,6.0,6.1,6.2,6.3,6.4,6.5,7.4,7.5,7.6,7.7,7.8,7.9,8.0,8.1,8.2,8.3,9.2,9.3,9.4,9.5,9.6,9.7,9.8,9.9,10.0,10.1,11.0,11.1,11.2,11.3,11.4,11.5,11.6,11.7,11.8,11.9,12.8,12.9,13.0,13.1,13.2,13.3,13.4,13.5,13.6,13.7,14.6,14.7,14.8,14.9,15.0,15.1,15.2,15.3,15.4,15.5,16.4,16.5,16.6,16.7,16.8,16.9,17.0,17.1,17.2,17.3,18.2,18.3,18.4,18.5,18.6,18.7,18.8,18.9,19.0,19.1,20.0];
const EXP_BALDUR   = [0,1.05,1.1,1.15,1.2,1.25,1.3,1.35,1.4,1.45,1.9,1.95,2.0,2.05,2.1,2.15,2.2,2.25,2.3,2.35,2.8,2.85,2.9,2.95,3.0,3.05,3.1,3.15,3.2,3.25,3.7,3.75,3.8,3.85,3.9,3.95,4.0,4.05,4.1,4.15,4.6,4.65,4.7,4.75,4.8,4.85,4.9,4.95,5.0,5.05,5.5,5.55,5.6,5.65,5.7,5.75,5.8,5.85,5.9,5.95,6.4,6.45,6.5,6.55,6.6,6.65,6.7,6.75,6.8,6.85,7.3,7.35,7.4,7.45,7.5,7.55,7.6,7.65,7.7,7.75,8.2,8.25,8.3,8.35,8.4,8.45,8.5,8.55,8.6,8.65,9.1,9.15,9.2,9.25,9.3,9.35,9.4,9.45,9.5,9.55,10.0];
const EXP_KATHY    = EXP_CYRILLE.slice();
const EXP_RONNE    = EXP_CYRILLE.slice();

// Hero TROOP_CAP at level 80 (13,470 per hero) — from CharacterProfile.jsx HERO_STATS
const HERO_TROOP_CAP = 13470;

// Deployment capacity base
const BASE_DEPLOY = 500;

// Command Center deploy by FC level — from CharacterProfile.jsx CMD_CENTER_CAPS
const CMD_CENTER_DEPLOY = {
  F30:67000, FC1:70500, FC2:74000, FC3:77500, FC4:81000,
  FC5:84500, FC6:88000, FC7:91500, FC8:95000, FC9:98500, FC10:102000,
};

// Pet quality map from Pets.jsx
const PET_LIST = [
  { name:"Cave Hyena",          quality:"C"   },
  { name:"Arctic Wolf",         quality:"N"   },
  { name:"Musk Ox",             quality:"N"   },
  { name:"Giant Tapir",         quality:"R"   },
  { name:"Titan Roc",           quality:"R"   },
  { name:"Giant Elk",           quality:"SR"  },
  { name:"Snow Leopard",        quality:"SR"  },
  { name:"Cave Lion",           quality:"SSR" },
  { name:"Snow Ape",            quality:"SSR" },
  { name:"Iron Rhino",          quality:"SSR" },
  { name:"Sabertooth Tiger",    quality:"SSR" },
  { name:"Mammoth",             quality:"SSR" },
  { name:"Frost Gorilla",       quality:"SSR" },
  { name:"Frostscale Chameleon",quality:"SSR" },
];

// PET_STATS from Pets.jsx — Troops' Attack/Defense % per quality per level
const PET_STAT_TABLE = {
  "C":   {10:0.50,"10a":0.92,20:1.42,"20a":1.85,30:2.35,"30a":2.87,40:3.37,"40a":3.90,50:4.40,"50a":5.02},
  "N":   {10:0.84,"10a":1.51,20:2.35,"20a":3.02,30:3.85,"30a":4.69,40:5.53,"40a":6.37,60:9.05,"60a":10.06},
  "R":   {10:1.08,"10a":1.92,20:2.99,"20a":3.83,30:4.91,"30a":5.95,40:7.03,"40a":8.08,70:13.82,"70a":15.08},
  "SR":  {10:1.34,"10a":2.37,20:3.60,"20a":4.63,30:6.04,"30a":7.07,40:8.71,"40a":9.74,80:17.28,"80a":18.75}, // NOTE: actual values from handoff doc show SSR 80=24%
  "SSR": {10:1.60,"10a":2.94,20:4.40,"20a":5.74,30:7.25,"30a":8.59,40:10.38,"40a":11.72,80:24.00,"80a":26.05,90:27.72,"90a":29.38,100:31.46,"100a":33.52},
};

function getPetStatVal(quality, level, advanced) {
  const table = PET_STAT_TABLE[quality];
  if (!table || !level) return 0;
  const key = advanced ? `${level}a` : level;
  return table[key] ?? table[level] ?? 0;
}

// ── Pet skill effects — scale linearly with pet level / maxLevel ──────────────
// Each entry defines what the skill does at max level and how it maps to sim stats.
// Scaling: skillValue = (petLevel / maxLevel) * maxValue
const PET_COMBAT_SKILLS = [
  // name, maxLevel, what the skill affects at max, sim stat mapping
  { name:"Titan Roc",            max:70,  label:"Enemy Troops' Health ↓",  stat:"enemyHp",    maxVal:5,      unit:"%" },
  { name:"Snow Leopard",         max:80,  label:"Enemy Troop Lethality ↓", stat:"enemyLeth",  maxVal:5,      unit:"%" },
  { name:"Cave Lion",            max:100, label:"Troops' Attack",           stat:"atk",        maxVal:10,     unit:"%" },
  { name:"Snow Ape",             max:100, label:"Squad Capacity (deploy)",  stat:"deployCap",  maxVal:15000,  unit:""  },
  { name:"Iron Rhino",           max:100, label:"Rally Capacity",           stat:"rallyCap",   maxVal:150000, unit:""  },
  { name:"Sabertooth Tiger",     max:100, label:"Troops' Lethality",        stat:"leth",       maxVal:10,     unit:"%" },
  { name:"Mammoth",              max:100, label:"Troops' Defense",          stat:"def",        maxVal:10,     unit:"%" },
  { name:"Frost Gorilla",        max:100, label:"Troops' Health",           stat:"hp",         maxVal:10,     unit:"%" },
  { name:"Frostscale Chameleon", max:100, label:"Enemy Troops' Defense ↓", stat:"enemyDef",   maxVal:10,     unit:"%" },
];

// Read pets-data from localStorage and compute active pet skill effects.
// Returns array of { name, label, value, unit, stat } for each tamed combat pet.
// Also returns aggregate stat bonuses for the sim.
function calcPetSkillEffects() {
  const active = [];
  const bonuses = { atk:0, def:0, leth:0, hp:0, enemyAtk:0, enemyDef:0,
                    enemyHp:0, enemyLeth:0, deployCap:0, rallyCap:0 };
  try {
    const raw = localStorage.getItem("pets-data");
    if (!raw) return { active, bonuses };
    const petsData = JSON.parse(raw);

    for (const skill of PET_COMBAT_SKILLS) {
      const d = petsData[skill.name];
      if (!d || !d.level || d.level <= 0) continue;
      const scaledVal = Math.round((d.level / skill.max) * skill.maxVal * 100) / 100;
      active.push({ name: skill.name, label: skill.label,
                    value: scaledVal, unit: skill.unit, stat: skill.stat });
      if (bonuses[skill.stat] !== undefined) bonuses[skill.stat] += scaledVal;
    }
  } catch {}
  return { active, bonuses };
}

// Parse RC buff string for troop stats: "+1.25% Infantry Attack" → { type: "infantry", stat: "atk", val: 1.25 }
function parseRCTroopBuff(buff) {
  if (!buff) return null;
  const pctMatch = buff.match(/\+([\d.]+)%\s+(All Troops|Infantry|Lancer|Marksman)\s+(Attack|Defense|Lethality|Health)/i);
  if (!pctMatch) return null;
  const typeStr = pctMatch[2].toLowerCase();
  const statStr = pctMatch[3].toLowerCase();
  const val = parseFloat(pctMatch[1]);
  const type = typeStr === "all troops" ? "all" : typeStr === "lancer" ? "lancer" : typeStr;
  const stat = statStr === "attack" ? "atk" : statStr === "defense" ? "def" : statStr === "lethality" ? "leth" : "hp";
  return { type, stat, val };
}

// ── Main auto-load function ───────────────────────────────────────────────────
// Reads all localStorage keys and computes per-unit-type bonus stats + deploy cap
function autoLoadStats(selectedHeroes) {
  // { infantry: heroName|null, lancer: heroName|null, marksman: heroName|null }
  const stats = {
    infantry: { atk: 0, def: 0, leth: 0, hp: 0 },
    lancer:   { atk: 0, def: 0, leth: 0, hp: 0 },
    marksman: { atk: 0, def: 0, leth: 0, hp: 0 },
  };
  const addStat = (ut, field, val) => {
    if (!val) return;
    if (ut === "all") { UNIT_TYPES.forEach(u => stats[u][field] += val); }
    else if (stats[ut]) stats[ut][field] += val;
  };

  // ── 1. War Academy ──────────────────────────────────────────────────────────
  try {
    const waRaw = localStorage.getItem("wa-levels");
    if (waRaw) {
      const waLevels = JSON.parse(waRaw);
      for (const ut of ["Infantry","Lancer","Marksman"]) {
        const utKey = ut.toLowerCase() === "lancer" ? "lancer" : ut.toLowerCase() === "marksman" ? "marksman" : "infantry";
        const lvs = waLevels[ut] || {};
        const lethLv = lvs.lethality?.cur ?? 0;
        const hpLv   = lvs.health?.cur    ?? 0;
        const atkLv  = lvs.attack?.cur    ?? 0;
        const defLv  = lvs.defense?.cur   ?? 0;
        addStat(utKey, "leth", WA_RESEARCH_STAT.lethality[lethLv] ?? 0);
        addStat(utKey, "hp",   WA_RESEARCH_STAT.health[hpLv]      ?? 0);
        addStat(utKey, "atk",  WA_RESEARCH_STAT.attack[atkLv]     ?? 0);
        addStat(utKey, "def",  WA_RESEARCH_STAT.defense[defLv]    ?? 0);
      }
    }
  } catch {}

  // ── 2. Research Center ─────────────────────────────────────────────────────
  try {
    const rcRaw = localStorage.getItem("rc-levels");
    if (rcRaw) {
      const rcLevels = JSON.parse(rcRaw);
      // We need to iterate RC nodes — import the RC data structure
      // Since we can't import it directly, parse buff strings from saved rc-levels
      // by reading through the RC data embedded in the app
      // Instead we call a helper that the app already exports — but since BattleSim
      // is standalone, we parse directly from rc-levels + the known buff patterns
      // RC nodes with troop stat buffs have IDs we can look up
      // The buff strings are in the ResearchCenter RC object — we'll read rc-levels
      // and apply known RC troop stat nodes by ID
      // Known troop stat RC node IDs and their per-level buff values:
      const RC_TROOP_NODES = {
        // All Troops nodes (Battle tree)
        "bat_all_atk":  { type:"all", stat:"atk",  perLv:[0,0.5,0.5,0.5] },
        "bat_all_def":  { type:"all", stat:"def",  perLv:[0,0.5,0.5,0.5] },
        "bat_all_hp":   { type:"all", stat:"hp",   perLv:[0,0.5,0.5,0.5] },
        "bat_all_leth": { type:"all", stat:"leth", perLv:[0,0.5,0.5,0.5] },
        // Infantry specific
        "bat_inf_atk":  { type:"infantry", stat:"atk", perLv:[0,1.25,1.25,1.5] },
        "bat_inf_def":  { type:"infantry", stat:"def", perLv:[0,1.25,1.25,1.5] },
        // Lancer specific
        "bat_lanc_atk": { type:"lancer", stat:"atk", perLv:[0,1.25,1.25,1.5] },
        "bat_lanc_def": { type:"lancer", stat:"def", perLv:[0,1.25,1.25,1.5] },
        // Marksman specific
        "bat_mark_atk": { type:"marksman", stat:"atk", perLv:[0,1.25,1.25,1.5] },
        "bat_mark_def": { type:"marksman", stat:"def", perLv:[0,1.25,1.25,1.5] },
      };
      // Apply what we know from rc-levels — find matching node IDs
      for (const [nodeId, node] of Object.entries(RC_TROOP_NODES)) {
        const lv = rcLevels[nodeId]?.cur ?? 0;
        if (lv <= 0) continue;
        let total = 0;
        for (let i = 1; i <= lv; i++) total += node.perLv[i] ?? 0;
        addStat(node.type, node.stat, total);
      }
    }
  } catch {}

  // ── 3. Experts ─────────────────────────────────────────────────────────────
  try {
    const expRaw = localStorage.getItem("experts-data");
    if (expRaw) {
      const ed = JSON.parse(expRaw);
      const lv = (name) => Number(ed[name]?.level ?? 0);

      addStat("all", "atk",  EXP_CYRILLE[lv("Cyrille")] ?? 0);
      addStat("all", "def",  EXP_AGNES[lv("Agnes")]     ?? 0);
      addStat("all", "leth", EXP_ROMULUS[lv("Romulus")] ?? 0);
      addStat("all", "hp",   EXP_ROMULUS[lv("Romulus")] ?? 0);
      addStat("all", "atk",  EXP_ROMULUS_SK2[Number(ed["Romulus"]?.sk2Level ?? 0)] ?? 0);
      addStat("all", "def",  EXP_ROMULUS_SK2[Number(ed["Romulus"]?.sk2Level ?? 0)] ?? 0);
      addStat("all", "leth", EXP_ROMULUS_SK3[Number(ed["Romulus"]?.sk3Level ?? 0)] ?? 0);
      addStat("all", "hp",   EXP_ROMULUS_SK3[Number(ed["Romulus"]?.sk3Level ?? 0)] ?? 0);
      addStat("all", "atk",  EXP_HOLGER[lv("Holger")]   ?? 0);
      addStat("all", "def",  EXP_HOLGER[lv("Holger")]   ?? 0);
      addStat("all", "leth", EXP_FABIAN[lv("Fabian")]   ?? 0);
      addStat("all", "hp",   EXP_FABIAN[lv("Fabian")]   ?? 0);
      addStat("all", "leth", EXP_VALERIA[lv("Valeria")] ?? 0);
      addStat("all", "hp",   EXP_VALERIA[lv("Valeria")] ?? 0);
      addStat("all", "atk",  EXP_BALDUR[lv("Baldur")]   ?? 0);
      addStat("all", "def",  EXP_BALDUR[lv("Baldur")]   ?? 0);
      addStat("all", "leth", EXP_KATHY[lv("Kathy")]     ?? 0);
      addStat("all", "hp",   EXP_KATHY[lv("Kathy")]     ?? 0);
      // Note: Ronne applies during raids — include but user can remove if not raiding
      addStat("all", "atk",  EXP_RONNE[lv("Ronne")]     ?? 0);
      addStat("all", "def",  EXP_RONNE[lv("Ronne")]     ?? 0);
    }
  } catch {}

  // ── 4. Pets ────────────────────────────────────────────────────────────────
  try {
    const petsRaw = localStorage.getItem("pets-data");
    if (petsRaw) {
      const petsData = JSON.parse(petsRaw);
      let troopAtk = 0, troopDef = 0;
      let infLeth = 0, infHp = 0;
      let lancLeth = 0, lancHp = 0;
      let markLeth = 0, markHp = 0;

      for (const pet of PET_LIST) {
        const d = petsData[pet.name];
        if (!d || !d.level) continue;
        const stat = getPetStatVal(pet.quality, d.level, d.advanced);
        troopAtk += stat;
        troopDef += stat;
        infLeth  += parseFloat(d.infLeth)  || 0;
        infHp    += parseFloat(d.infHp)    || 0;
        lancLeth += parseFloat(d.lancLeth) || 0;
        lancHp   += parseFloat(d.lancHp)   || 0;
        markLeth += parseFloat(d.markLeth) || 0;
        markHp   += parseFloat(d.markHp)   || 0;
      }
      addStat("all", "atk",  troopAtk);
      addStat("all", "def",  troopDef);
      addStat("infantry",  "leth", infLeth);
      addStat("infantry",  "hp",   infHp);
      addStat("lancer",    "leth", lancLeth);
      addStat("lancer",    "hp",   lancHp);
      addStat("marksman",  "leth", markLeth);
      addStat("marksman",  "hp",   markHp);
    }
  } catch {}

  // ── 5. Daybreak Island ─────────────────────────────────────────────────────
  try {
    const dbRaw = localStorage.getItem("daybreak-buffs");
    if (dbRaw) {
      const db = JSON.parse(dbRaw);
      addStat("all", "atk",  parseFloat(db.troopsAtk)       || 0);
      addStat("all", "def",  parseFloat(db.troopsDef)       || 0);
      addStat("all", "leth", parseFloat(db.troopsLethality) || 0);
      addStat("all", "hp",   parseFloat(db.troopsHealth)    || 0);
    }
  } catch {}

  // ── 6. Deployment capacity ─────────────────────────────────────────────────
  // Mirrors CharacterProfile.jsx deployCapacity useMemo exactly:
  // BASE + WA(FlameSquad×3 + HeliosTraining×3) + ChiefGear + CommandCenter + RC + Romulus + Daybreak
  let deployCapacity = BASE_DEPLOY;
  try {
    // ── WA: Flame Squad + Helios Training — read level[cur][2] directly ──────
    // Matches CharacterProfile.jsx: fsRes?.levels[cur]?.[2] + htRes?.levels[cur]?.[2]
    const waRaw = localStorage.getItem("wa-levels");
    if (waRaw) {
      const waLevels = JSON.parse(waRaw);
      // Flame Squad index[2]: [0,200,400,600,800,1000] for levels 0-5
      const FS = [0, 200, 400, 600, 800, 1000];
      // Helios Training index[2]: [0,100,200,300,400,500,600,700,800,900,1000] for levels 0-10
      const HT = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      for (const ut of ["Infantry","Lancer","Marksman"]) {
        const fsLv = waLevels[ut]?.flameSquad?.cur     ?? 0;
        const htLv = waLevels[ut]?.heliosTraining?.cur ?? 0;
        deployCapacity += FS[Math.min(fsLv, 5)]  ?? 0;
        deployCapacity += HT[Math.min(htLv, 10)] ?? 0;
      }
    }

    // ── Chief Gear — index [9] of CHIEF_GEAR_LEVELS = deploy bonus per slot ──
    // Extracted directly from ChiefEquipment.jsx CHIEF_GEAR_LEVELS[i][9]
    const CGL_DEPLOY = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      40,50,60,70,80,90,100,110,120,130,140,150,160,170,180,190,
      290,300,310,320,330,340,350,360,370,380,390,400,
      410,420,430,440,
      540,550,560,570,580,590,600,610,620,630,640,650,660,670,680,690,
      790,800,810,820,830,840,850,860,870,880,890,900,910,920,930,940,
      1050,1060,1070,1080,1090,1100,1110,1120,1130,1140,1150,1160,1170,1180,1190,1200];
    const cgRaw = localStorage.getItem("cg-slots");
    if (cgRaw) {
      JSON.parse(cgRaw).forEach(s => {
        deployCapacity += CGL_DEPLOY[s.current ?? 0] ?? 0;
      });
    }

    // ── Command Center ──
    const cpRaw = localStorage.getItem("cp-buildings");
    if (cpRaw) {
      const bldgs = JSON.parse(cpRaw);
      const cmd = bldgs.find(b => b.name === "Command");
      if (cmd?.current) deployCapacity += CMD_CENTER_DEPLOY[cmd.current] ?? 0;
    }

    // ── Research Center — regExpansion nodes ──
    // Per-level cumulative deploy values (each level adds the listed amount)
    const RC_DEPLOY_NODES = {
      regExpansion1: [320, 320, 360],
      regExpansion2: [320, 320, 760],
      regExpansion3: [620, 580, 600, 1000],
      regExpansion4: [990, 910, 1000, 1000, 1700],
      regExpansion5: [1200, 1200, 1200, 1200, 1200, 2000],
      regExpansion6: [2000, 2000, 2000, 2000, 2000, 3400],
    };
    const rcRaw = localStorage.getItem("rc-levels");
    if (rcRaw) {
      const rcLevels = JSON.parse(rcRaw);
      for (const [nodeId, perLvValues] of Object.entries(RC_DEPLOY_NODES)) {
        const cur = rcLevels[nodeId]?.cur ?? 0;
        for (let i = 0; i < Math.min(cur, perLvValues.length); i++) {
          deployCapacity += perLvValues[i];
        }
      }
    }

    // ── Romulus expert (Commander's Crest affinity) ──
    const expRaw = localStorage.getItem("experts-data");
    if (expRaw) {
      const ed = JSON.parse(expRaw);
      const ROMULUS_DEPLOY = [0,300,600,1000,1500,2000,3000,4000,5500,7000,8500,10000];
      deployCapacity += ROMULUS_DEPLOY[Number(ed["Romulus"]?.affinity ?? 0)] ?? 0;
    }

    // ── Daybreak Island ──
    const dbRaw = localStorage.getItem("daybreak-buffs");
    if (dbRaw) {
      const db = JSON.parse(dbRaw);
      deployCapacity += Number(String(db.deployCap ?? "").replace(/,/g,"")) || 0;
    }

    // ── Hero deploy bonus: 13,470 per selected hero ──
    const heroCount = Object.values(selectedHeroes).filter(Boolean).length;
    deployCapacity += heroCount * HERO_TROOP_CAP;

  } catch (e) { console.warn("Deploy cap calc error:", e); }

  // ── 7. Troop inventory ─────────────────────────────────────────────────────
  let troopInventory = { infantry: [], lancer: [], marksman: [] };
  try {
    const troopsRaw = localStorage.getItem("troops-inventory-v2");
    if (troopsRaw) {
      const parsed = JSON.parse(troopsRaw);
      for (const ut of UNIT_TYPES) {
        troopInventory[ut] = (parsed[ut] || [])
          .filter(r => r.count > 0)
          .sort((a,b) => parseInt(b.tier.replace("T","")) - parseInt(a.tier.replace("T","")));
      }
    }
  } catch {}

  return { stats, deployCapacity, troopInventory };
}

// Filter HERO_NAMES by their troop type from the skill data
function getHeroesByType(ut) {
  return HERO_NAMES.filter(h => {
    const data = HERO_SKILLS[h];
    if (!data || !data.length) return false;
    return toUnitType(data[0].skill_troop_type) === ut;
  }).sort();
}

const HEROES_BY_TYPE = {
  infantry: getHeroesByType("infantry"),
  lancer:   getHeroesByType("lancer"),
  marksman: getHeroesByType("marksman"),
};

const DEFAULT_STATS = { atk: 0, def: 0, leth: 0, hp: 0 };

// ── FighterPanel ─────────────────────────────────────────────────────────────
// Flat layout matching the in-game march setup:
//   Row 1: Deployment Cap  |  Power
//   Row 2: Infantry Hero   |  Lancer Hero  |  Marksman Hero  (dropdowns)
//   Row 3-5: Troops rows (label | Tier dropdown | Count)
//   Row 6: Troop Ratio display
//   Bottom: Stat Bonuses (left) | Special Bonuses / buffs (right)
// ─────────────────────────────────────────────────────────────────────────────

const SEL_STYLE = {
  padding: "5px 7px", fontSize: 11, background: "var(--c-surface)",
  border: "1px solid var(--c-border)", borderRadius: 4, color: "var(--c-textPri)",
  width: "100%",
};
const INPUT_STYLE = {
  padding: "5px 7px", fontSize: 11, background: "var(--c-surface)",
  border: "1px solid var(--c-border)", borderRadius: 4, color: "var(--c-textPri)",
  width: "100%", boxSizing: "border-box", fontFamily: "'Space Mono',monospace",
};
const LABEL_STYLE = {
  fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
  fontFamily: "'Space Mono',monospace", color: "var(--c-textDim)", marginBottom: 3,
};
const CELL = { padding: "0 6px" };

function FighterPanel({ title, color, fighter, onChange, isUserPanel }) {
  const { stats, troops, heroes } = fighter;
  const [isAuto, setIsAuto]           = React.useState(false);

  // buffs and petSkillsActive live in fighter state so prepareFighter can read them
  const buffs          = fighter.buffs          || {};
  const petSkillsActive = fighter.petSkillsActive || false;
  const petSkillData = React.useMemo(() => {
    if (!petSkillsActive) return { active: [], bonuses: {} };
    return calcPetSkillEffects();
  }, [petSkillsActive]);
  const setBuffs = (updater) => {
    const next = typeof updater === "function" ? updater(buffs) : updater;
    onChange({ ...fighter, buffs: next });
  };
  const setPSA = (val) => onChange({ ...fighter, petSkillsActive: val });

  // ── Hero name helpers ─────────────────────────────────────────────────────
  const heroName = (ut) => heroes[ut]?.name || null;
  const heroLvls = (ut) => heroes[ut]?.levels || {};

  const setHeroName = (ut, name) => {
    const nh = { ...heroes };
    if (!name) { delete nh[ut]; }
    else {
      const levels = {};
      (HERO_SKILLS[name] || []).forEach(s => { levels[`skill_${s.skill_num}`] = 5; });
      nh[ut] = { name, levels };
    }
    const upd = { ...fighter, heroes: nh };
    if (isAuto) applyAutoStats(upd, nh);
    else onChange(upd);
  };

  const setHeroLevel = (ut, key, val) => {
    if (!heroes[ut]) return;
    onChange({ ...fighter, heroes: { ...heroes, [ut]: { ...heroes[ut],
      levels: { ...heroes[ut].levels, [key]: val } } } });
  };

  // ── Troop helpers ─────────────────────────────────────────────────────────
  const setTroop = (ut, field, val) => onChange({ ...fighter,
    troops: { ...troops, [ut]: { ...troops[ut], [field]: val } } });

  // ── Stat helpers ──────────────────────────────────────────────────────────
  const setStat = (ut, field, val) => onChange({ ...fighter,
    stats: { ...stats, [ut]: { ...stats[ut], [field]: val } } });

  // ── Auto-load helpers ─────────────────────────────────────────────────────
  const getSelected = (heroesObj) => ({
    infantry: heroesObj.infantry?.name || null,
    lancer:   heroesObj.lancer?.name   || null,
    marksman: heroesObj.marksman?.name  || null,
  });

  const applyAutoStats = (baseFighter, heroesObj) => {
    const data = autoLoadStats(getSelected(heroesObj || baseFighter.heroes));
    const newStats  = {};
    const newTroops = {};
    for (const ut of UNIT_TYPES) {
      newStats[ut] = { ...data.stats[ut] };
      const inv = data.troopInventory[ut];
      const topTier = inv[0] ? parseInt(inv[0].tier.replace("T","")) : baseFighter.troops[ut].tier;
      newTroops[ut] = { ...baseFighter.troops[ut], tier: topTier };
    }
    onChange({ ...baseFighter, stats: newStats, troops: newTroops });
    return data;
  };

  const handleAutoToggle = (goAuto) => {
    setIsAuto(goAuto);
    if (goAuto) applyAutoStats(fighter, null);
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const autoData = React.useMemo(() => {
    if (!isAuto) return null;
    return autoLoadStats(getSelected(heroes));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuto, heroes.infantry?.name, heroes.lancer?.name, heroes.marksman?.name]);

  const deployCapacity = autoData?.deployCapacity ?? 0;
  const invRows = (ut) => autoData?.troopInventory?.[ut] || [];

  // Stat table rows
  const STAT_FIELDS = [
    ["Atk",  "atk"],
    ["Def",  "def"],
    ["Leth", "leth"],
    ["HP",   "hp"  ],
  ];

  // "All Troops" row = the minimum across all 3 unit types (the shared global portion)
  // Type-specific row = that type's value minus the all-troops minimum (the extra on top)
  const allTroopsStats = {};
  STAT_FIELDS.forEach(([, field]) => {
    allTroopsStats[field] = Math.min(
      stats.infantry[field] || 0,
      stats.lancer[field]   || 0,
      stats.marksman[field] || 0,
    );
  });

  const STAT_ROWS = [
    ["All Troops", "all"     ],
    ["Infantry",   "infantry"],
    ["Lancer",     "lancer"  ],
    ["Marksman",   "marksman"],
  ];

  // Special bonus rows
  const BONUS_ROWS = [
    { label: "Troops' Attack Bonus",    field: "atk",      color: C.green  },
    { label: "Troops' Lethality Bonus", field: "leth",     color: C.green  },
    { label: "Enemy Troops' Defense ↓", field: "enemyDef", color: C.red    },
    { label: "Enemy Lethality Penalty", field: "enemyAtk", color: C.red,
      note:"(Pet Skill)"                                                    },
    { label: "Enemy Health Penalty",    field: "enemyHp",  color: C.red,
      note:"(Pet Skill)"                                                    },
    { label: "Attack Bonus",            field: "petAtk",   color: C.amber,
      note:"(Pet Skill)"                                                    },
    { label: "Defense Bonus",           field: "petDef",   color: C.amber,
      note:"(Pet Skill)"                                                    },
    { label: "Lethality Bonus",         field: "petLeth",  color: C.amber,
      note:"(Pet Skill)"                                                    },
    { label: "Health Bonus",            field: "petHp",    color: C.amber,
      note:"(Pet Skill)"                                                    },
    { label: "Appt-based Troop Atk",    field: "apptAtk",  color: C.blue   },
    { label: "Appt-based Troop Def",    field: "apptDef",  color: C.blue   },
    { label: "Appt-based Troop Leth",   field: "apptLeth", color: C.blue   },
    { label: "Appt-based Troop HP",     field: "apptHp",   color: C.blue   },
  ];

  const thStyle = { fontSize: 9, fontWeight: 700, color: C.textDim, textAlign: "center",
    padding: "3px 6px", fontFamily: "'Space Mono',monospace",
    borderBottom: `1px solid ${C.border}` };
  const tdStyle = { fontSize: 10, padding: "3px 6px", textAlign: "center",
    fontFamily: "'Space Mono',monospace", borderBottom: `1px solid ${C.border}22` };

  return (
    <div style={{ flex: 1, background: C.card, borderRadius: 8,
      border: `1px solid ${C.border}`, padding: 16, minWidth: 320 }}>

      {/* ── Panel header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14,
          fontWeight: 700, color }}>{title}</div>
        {isUserPanel && (
          <div style={{ display: "flex", background: C.surface, borderRadius: 6,
            border: `1px solid ${C.border}`, overflow: "hidden" }}>
            {[["Manual", false], ["Auto", true]].map(([lbl, val]) => (
              <button key={lbl} onClick={() => handleAutoToggle(val)}
                style={{ padding: "5px 12px", fontSize: 11, fontWeight: 600,
                  border: "none", cursor: "pointer",
                  fontFamily: "'Space Mono',monospace",
                  background: isAuto === val ? C.green : "transparent",
                  color: isAuto === val ? "#fff" : C.textDim }}>
                {lbl}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Auto banner */}
      {isAuto && (
        <div style={{ background: `${C.green}11`, border: `1px solid ${C.green}33`,
          borderRadius: 6, padding: "7px 10px", marginBottom: 12,
          fontSize: 10, color: C.green }}>
          Stats auto-filled from: War Academy · RC · Experts · Pets · Daybreak Island
        </div>
      )}

      {/* ── Row 1: Deployment Cap + Power ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={LABEL_STYLE}>Deployment Cap</div>
          {isAuto ? (() => {
            const deployBuff  = buffs.deployBuff ?? 0;
            const petDeploy   = petSkillsActive ? (petSkillData.bonuses.deployCap || 0) : 0;
            const effCap = Math.round((deployCapacity + petDeploy) * (1 + deployBuff / 100));
            return (
              <div style={{ ...INPUT_STYLE, background: C.surface,
                color: C.green, fontWeight: 700 }}>
                {fmt(effCap)}
                {(deployBuff > 0 || petDeploy > 0) && (
                  <span style={{ fontSize: 9, color: C.textDim, fontWeight: 400,
                    marginLeft: 4 }}>
                    ({fmt(deployCapacity)}
                    {petDeploy > 0 ? ` +${fmt(petDeploy)} pet` : ""}
                    {deployBuff > 0 ? ` +${deployBuff}%` : ""})
                  </span>
                )}
              </div>
            );
          })() : (
            <input type="number" min={0} step={100}
              value={fighter.deployCapManual ?? ""}
              placeholder="Enter cap…"
              onChange={e => onChange({ ...fighter,
                deployCapManual: Math.max(0, parseInt(e.target.value) || 0) })}
              style={INPUT_STYLE}
            />
          )}
        </div>
        <div>
          <div style={LABEL_STYLE}>Power (reference)</div>
          <div style={{ ...INPUT_STYLE, background: C.surface, color: C.textDim }}>
            Enter manually
          </div>
        </div>
      </div>

      {/* ── Row 2: Hero dropdowns (3 side by side) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        {UNIT_TYPES.map(ut => {
          const heroList = HEROES_BY_TYPE[ut] || [];
          const hName    = heroName(ut);
          const hData    = hName ? (HERO_SKILLS[hName] || []) : [];
          return (
            <div key={ut}>
              <div style={{ ...LABEL_STYLE, color: UNIT_COLORS[ut] }}>
                {UNIT_LABELS[ut]} Hero
              </div>
              <select value={hName || ""}
                onChange={e => setHeroName(ut, e.target.value || null)}
                style={{ ...SEL_STYLE, color: hName ? C.textPri : C.textDim }}>
                <option value="">— None —</option>
                {heroList.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              {/* Skill levels inline under hero name */}
              {hName && hData.length > 0 && (
                <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                  {hData.map(s => {
                    const key = `skill_${s.skill_num}`;
                    const lv  = heroLvls(ut)[key] ?? 5;
                    return (
                      <div key={key} style={{ display: "flex", flexDirection: "column",
                        alignItems: "center" }}>
                        <div style={{ fontSize: 8, color: C.textDim,
                          fontFamily: "'Space Mono',monospace" }}>S{s.skill_num}</div>
                        <select value={lv}
                          onChange={e => setHeroLevel(ut, key, parseInt(e.target.value))}
                          style={{ fontSize: 9, padding: "1px 2px", width: 38,
                            background: C.card, border: `1px solid ${C.border}`,
                            borderRadius: 3, color: C.textPri }}>
                          {[0,1,2,3,4,5].map(l =>
                            <option key={l} value={l}>{l===0?"Off":`L${l}`}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Rows 3-5: Troop rows ── */}
      {(() => {
        // Effective deploy cap — Auto uses calculated value boosted by deploy buff %;
        // Manual uses the user-entered field.
        const deployBuff = buffs.deployBuff ?? 0;
        const petDeploy  = petSkillsActive ? (petSkillData.bonuses.deployCap || 0) : 0;
        const baseCap = isAuto ? (deployCapacity + petDeploy) : (fighter.deployCapManual || 0);
        const effectiveCap = baseCap > 0
          ? Math.round(baseCap * (1 + deployBuff / 100))
          : 0;

        const currentTotal = UNIT_TYPES.reduce((s, ut) => s + (troops[ut].count || 0), 0);
        const overCap = effectiveCap > 0 && currentTotal > effectiveCap;

        // Ratio mode: distribute effectiveCap by user-set ratios
        const ratioMode = fighter.ratioMode || false;
        const ratios = fighter.ratios || { infantry: 50, lancer: 20, marksman: 30 };
        const ratioSum = UNIT_TYPES.reduce((s, ut) => s + (ratios[ut] || 0), 0);

        const setRatioMode = (val) => {
          const newFighter = { ...fighter, ratioMode: val };
          if (val && effectiveCap > 0) {
            // Immediately distribute counts by current ratios
            const newTroops = { ...troops };
            UNIT_TYPES.forEach(ut => {
              newTroops[ut] = { ...troops[ut],
                count: Math.floor(effectiveCap * (ratios[ut] || 0) / 100) };
            });
            onChange({ ...newFighter, troops: newTroops });
          } else {
            onChange(newFighter);
          }
        };

        const setRatio = (ut, val) => {
          const clamped = Math.max(0, Math.min(100, parseInt(val) || 0));
          const newRatios = { ...ratios, [ut]: clamped };
          // Recompute counts from ratios if ratio mode is active
          if (ratioMode && effectiveCap > 0) {
            const newSum = UNIT_TYPES.reduce((s, u) => s + (newRatios[u] || 0), 0);
            const newTroops = { ...troops };
            UNIT_TYPES.forEach(u => {
              newTroops[u] = { ...troops[u],
                count: newSum > 0 ? Math.floor(effectiveCap * (newRatios[u] || 0) / newSum) : 0 };
            });
            onChange({ ...fighter, ratios: newRatios, troops: newTroops });
          } else {
            onChange({ ...fighter, ratios: newRatios });
          }
        };

        // When a count changes manually, clamp total to effectiveCap
        const handleCountChange = (ut, raw) => {
          const newVal = Math.max(0, parseInt(raw) || 0);
          const otherTotal = UNIT_TYPES.filter(u => u !== ut)
            .reduce((s, u) => s + (troops[u].count || 0), 0);
          const clamped = effectiveCap > 0
            ? Math.min(newVal, Math.max(0, effectiveCap - otherTotal))
            : newVal;
          setTroop(ut, "count", clamped);
        };

        return (
          <div style={{ marginBottom: 10 }}>
            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr",
              gap: 6, marginBottom: 4 }}>
              <div style={LABEL_STYLE} />
              <div style={LABEL_STYLE}>Tier</div>
              <div style={LABEL_STYLE}>Count</div>
            </div>

            {/* Troop rows */}
            {UNIT_TYPES.map(ut => {
              const inv        = invRows(ut);
              const manyTiers  = inv.length > 1;
              const topTierNum = inv[0] ? parseInt(inv[0].tier.replace("T","")) : troops[ut].tier;
              return (
                <div key={ut} style={{ display: "grid",
                  gridTemplateColumns: "90px 1fr 1fr", gap: 6, marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: UNIT_COLORS[ut],
                    display: "flex", alignItems: "center" }}>
                    {UNIT_LABELS[ut]}
                  </div>
                  {/* Tier */}
                  {isAuto && !manyTiers ? (
                    <div style={{ ...INPUT_STYLE, color: UNIT_COLORS[ut], fontWeight: 600 }}>
                      T{topTierNum}
                      {inv[0] && <span style={{ color: C.textDim, fontWeight: 400,
                        fontSize: 10 }}> ({fmt(inv[0].count)})</span>}
                    </div>
                  ) : isAuto && manyTiers ? (
                    <select value={troops[ut].tier}
                      onChange={e => setTroop(ut, "tier", parseInt(e.target.value))}
                      style={SEL_STYLE}>
                      {inv.map(r => {
                        const t = parseInt(r.tier.replace("T",""));
                        return <option key={t} value={t}>T{t} ({fmt(r.count)})</option>;
                      })}
                    </select>
                  ) : (
                    <select value={troops[ut].tier}
                      onChange={e => setTroop(ut, "tier", Number(e.target.value))}
                      style={SEL_STYLE}>
                      {TIERS.map(t => <option key={t} value={t}>T{t}</option>)}
                    </select>
                  )}
                  {/* Count — read-only in ratio mode, editable otherwise */}
                  {ratioMode ? (
                    <div style={{ ...INPUT_STYLE, background: C.surface,
                      color: C.textPri, fontWeight: 600 }}>
                      {fmt(troops[ut].count || 0)}
                    </div>
                  ) : (
                    <input type="number" value={troops[ut].count || ""}
                      min={0} step={1000}
                      placeholder={effectiveCap > 0 ? fmt(Math.round(effectiveCap / 3)) : "0"}
                      onChange={e => handleCountChange(ut, e.target.value)}
                      style={{ ...INPUT_STYLE,
                        border: overCap
                          ? `1px solid ${C.red}` : `1px solid ${C.border}` }}
                    />
                  )}
                </div>
              );
            })}

            {/* Cap status bar */}
            {effectiveCap > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  fontSize: 9, fontFamily: "'Space Mono',monospace",
                  color: overCap ? C.red : C.textDim, marginBottom: 3 }}>
                  <span>{fmt(currentTotal)} / {fmt(effectiveCap)}</span>
                  <span>{overCap ? "⚠ Exceeds cap" : `${fmt(effectiveCap - currentTotal)} remaining`}</span>
                </div>
                <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 2,
                    background: overCap ? C.red : C.green,
                    width: `${Math.min(100, effectiveCap > 0 ? currentTotal / effectiveCap * 100 : 0)}%`,
                    transition: "width 0.2s" }} />
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Troop Ratio ── */}
      {(() => {
        const ratioMode = fighter.ratioMode || false;
        const ratios    = fighter.ratios    || { infantry: 50, lancer: 20, marksman: 30 };
        const ratioSum  = UNIT_TYPES.reduce((s, ut) => s + (ratios[ut] || 0), 0);

        const deployBuff = buffs.deployBuff ?? 0;
        const petDeploy2  = petSkillsActive ? (petSkillData.bonuses.deployCap || 0) : 0;
        const baseCap    = isAuto ? (deployCapacity + petDeploy2) : (fighter.deployCapManual || 0);
        const effectiveCap = baseCap > 0 ? Math.round(baseCap * (1 + deployBuff / 100)) : 0;

        const toggleRatioMode = (val) => {
          const newFighter = { ...fighter, ratioMode: val };
          if (val && effectiveCap > 0) {
            const newTroops = { ...troops };
            UNIT_TYPES.forEach(ut => {
              newTroops[ut] = { ...troops[ut],
                count: Math.floor(effectiveCap * (ratios[ut] || 0) / 100) };
            });
            onChange({ ...newFighter, troops: newTroops });
          } else {
            onChange(newFighter);
          }
        };

        const totalCount = UNIT_TYPES.reduce((s, ut) => s + (troops[ut].count || 0), 0);
        const pctOf = (ut) => totalCount > 0
          ? Math.round((troops[ut].count || 0) / totalCount * 100) + "%"
          : "—";

        const setRatioField = (ut, raw) => {
          const val = Math.max(0, Math.min(100, parseInt(raw) || 0));
          const newRatios = { ...ratios, [ut]: val };
          if (ratioMode && effectiveCap > 0) {
            const newSum = UNIT_TYPES.reduce((s, u) => s + (newRatios[u] || 0), 0);
            const newTroops = { ...troops };
            UNIT_TYPES.forEach(u => {
              newTroops[u] = { ...troops[u],
                count: newSum > 0 ? Math.floor(effectiveCap * (newRatios[u] || 0) / newSum) : 0 };
            });
            onChange({ ...fighter, ratios: newRatios, troops: newTroops });
          } else {
            onChange({ ...fighter, ratios: newRatios });
          }
        };

        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10,
            marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600,
              whiteSpace: "nowrap" }}>Troop Ratio:</div>

            {ratioMode ? (
              /* Ratio mode — editable % inputs that drive counts */
              <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1 }}>
                {UNIT_TYPES.map(ut => (
                  <div key={ut} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 9, color: UNIT_COLORS[ut],
                      fontWeight: 700, whiteSpace: "nowrap" }}>
                      {UNIT_LABELS[ut].slice(0,4)}
                    </span>
                    <div style={{ position: "relative", display: "flex",
                      alignItems: "center" }}>
                      <input type="number" value={ratios[ut] ?? 0}
                        min={0} max={100} step={1}
                        onChange={e => setRatioField(ut, e.target.value)}
                        style={{ width: 46, padding: "3px 16px 3px 5px", fontSize: 11,
                          background: C.surface, border: `1px solid ${UNIT_COLORS[ut]}66`,
                          borderRadius: 4, color: C.textPri,
                          fontFamily: "'Space Mono',monospace" }}
                      />
                      <span style={{ position: "absolute", right: 4, fontSize: 9,
                        color: C.textDim, pointerEvents: "none" }}>%</span>
                    </div>
                  </div>
                ))}
                {/* Ratio sum warning */}
                {ratioSum !== 100 && (
                  <span style={{ fontSize: 9, color: C.amber,
                    fontFamily: "'Space Mono',monospace" }}>
                    {ratioSum}% ≠ 100
                  </span>
                )}
              </div>
            ) : (
              /* Display mode — show live % from actual counts */
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {UNIT_TYPES.map(ut => (
                  <div key={ut} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 9, color: UNIT_COLORS[ut], fontWeight: 700 }}>
                      {UNIT_LABELS[ut].slice(0,4)}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: "'Space Mono',monospace",
                      color: C.textPri }}>{pctOf(ut)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Toggle switch */}
            <div style={{ display: "flex", alignItems: "center", gap: 5,
              marginLeft: "auto", flexShrink: 0 }}>
              <span style={{ fontSize: 9, color: C.textDim }}>
                {ratioMode ? "Ratio mode" : "Set ratio"}
              </span>
              <div onClick={() => toggleRatioMode(!ratioMode)}
                style={{ width: 32, height: 16, borderRadius: 8, cursor: "pointer",
                  background: ratioMode ? C.accent : C.border, position: "relative",
                  transition: "background 0.2s" }}>
                <div style={{ position: "absolute", top: 2,
                  left: ratioMode ? 14 : 2, width: 12, height: 12,
                  borderRadius: "50%", background: "#fff",
                  transition: "left 0.2s" }} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* FC row — one per troop type */}
      <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 1fr",
        gap: 6, marginBottom: 16 }}>
        <div style={{ ...LABEL_STYLE, display:"flex", alignItems:"center" }}>FC Level</div>
        {UNIT_TYPES.map(ut => (
          <select key={ut} value={troops[ut].fc}
            onChange={e => setTroop(ut, "fc", Number(e.target.value))}
            style={SEL_STYLE}>
            {FC_LEVELS.map(f => <option key={f} value={f}>FC{f}</option>)}
          </select>
        ))}
      </div>

      {/* ── Bottom: Stat Bonuses + Special Bonuses side by side ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* Left — Stat Bonuses table */}
        <div>
          <div style={{ background: C.accent, borderRadius: "6px 6px 0 0",
            padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#fff",
            fontFamily: "'Space Mono',monospace", letterSpacing: "0.05em" }}>
            Stat Bonuses
          </div>
          <div style={{ border: `1px solid ${C.border}`, borderTop:"none",
            borderRadius: "0 0 6px 6px", overflow:"hidden" }}>
            <table style={{ borderCollapse:"collapse", width:"100%", fontSize:10 }}>
              <thead>
                <tr style={{ background: C.surface }}>
                  <th style={{ ...thStyle, textAlign:"left", paddingLeft:8 }}>Troop</th>
                  {STAT_FIELDS.map(([lbl]) => (
                    <th key={lbl} style={thStyle}>{lbl}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STAT_ROWS.map(([troopLabel, ut], ri) => {
                  const isAll = ut === "all";
                  const color = isAll ? C.textPri
                    : ut === "infantry" ? C.green
                    : ut === "lancer"   ? C.blue
                    : C.amber;
                  return (
                    <tr key={ut} style={{ background: ri%2===0 ? "transparent" : C.surface }}>
                      <td style={{ ...tdStyle, color, fontWeight: 700,
                        textAlign:"left", paddingLeft:8,
                        borderBottom: isAll ? `1px solid ${C.border}` : undefined }}>
                        {troopLabel}
                      </td>
                      {STAT_FIELDS.map(([, field]) => {
                        // All Troops row: show the minimum (shared global portion)
                        // Per-type rows: show the type-specific EXTRA on top of All Troops
                        const val = isAll
                          ? (allTroopsStats[field] || 0)
                          : Math.max(0, (stats[ut][field] || 0) - (allTroopsStats[field] || 0));
                        return (
                          <td key={field} style={{ ...tdStyle,
                            color: val > 0 ? (isAll ? C.green : UNIT_COLORS[ut]) : C.textDim,
                            borderBottom: isAll ? `1px solid ${C.border}` : undefined }}>
                            {val > 0 ? `+${val.toFixed(1)}%` : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pet Skills Active section */}
            {petSkillsActive && petSkillData.active.length > 0 && (
              <div style={{ borderTop: `1px solid ${C.border}` }}>
                <div style={{ padding: "5px 8px", background: `${C.accent}22`,
                  fontSize: 9, fontWeight: 700, color: C.accent,
                  fontFamily: "'Space Mono',monospace", letterSpacing: "0.06em",
                  textTransform: "uppercase" }}>
                  Pet Skills Active
                </div>
                {petSkillData.active.map(skill => {
                  const isBuff   = !skill.stat.startsWith("enemy") && skill.stat !== "deployCap" && skill.stat !== "rallyCap";
                  const isDeploy = skill.stat === "deployCap";
                  const isRally  = skill.stat === "rallyCap";
                  const isEnemy  = skill.stat.startsWith("enemy");
                  const valStr   = skill.unit === "%" ? `+${skill.value.toFixed(1)}%` : `+${Math.round(skill.value).toLocaleString()}`;
                  const color    = isEnemy ? C.red : isDeploy || isRally ? C.blue : C.green;
                  return (
                    <div key={skill.name} style={{ display: "flex",
                      justifyContent: "space-between", alignItems: "center",
                      padding: "4px 8px", borderBottom: `1px solid ${C.border}22`,
                      fontSize: 9, fontFamily: "'Space Mono',monospace" }}>
                      <span style={{ color: C.textSec }}>
                        <span style={{ color: C.accent, fontWeight: 600 }}>{skill.name}</span>
                        {" — "}{skill.label}
                      </span>
                      <span style={{ color, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                        {valStr}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right — Special Bonuses (situational buff toggles) */}
        <div>
          <div style={{ background: C.blue, borderRadius: "6px 6px 0 0",
            padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#fff",
            fontFamily: "'Space Mono',monospace", letterSpacing: "0.05em" }}>
            Special Bonuses
          </div>
          <div style={{ border: `1px solid ${C.border}`, borderTop:"none",
            borderRadius: "0 0 6px 6px", padding:"8px 10px" }}>
            {[
              { label:"Troops' Attack Bonus",    field:"atk",      color:C.green  },
              { label:"Troops' Lethality Bonus",  field:"leth",     color:C.green  },
              { label:"Enemy Troops' Defense ↓",  field:"enemyDef", color:C.red    },
              { label:"Enemy Lethality Penalty",  field:"enemyAtk", color:C.red,   note:"Pet Skill" },
              { label:"Enemy Health Penalty",     field:"enemyHp",  color:C.red,   note:"Pet Skill" },
              { label:"Attack Bonus",             field:"petAtk",   color:C.amber, note:"Pet Skill" },
              { label:"Defense Bonus",            field:"petDef",   color:C.amber, note:"Pet Skill" },
              { label:"Lethality Bonus",          field:"petLeth",  color:C.amber, note:"Pet Skill" },
              { label:"Health Bonus",             field:"petHp",    color:C.amber, note:"Pet Skill" },
              { label:"Appt-based Troop Atk",     field:"apptAtk",  color:C.blue   },
              { label:"Appt-based Troop Def",     field:"apptDef",  color:C.blue   },
              { label:"Appt-based Troop Leth",    field:"apptLeth", color:C.blue   },
              { label:"Appt-based Troop HP",      field:"apptHp",   color:C.blue   },
            ].map(({ label: lbl, field, color: fc, note }) => {
              const cur = buffs[field] ?? 0;
              return (
                <div key={field} style={{ display:"flex", alignItems:"center",
                  justifyContent:"space-between", marginBottom:5 }}>
                  <div>
                    <span style={{ fontSize:9, color:fc, fontWeight:600 }}>
                      {cur > 0 ? `+${cur}%` : "—"}
                    </span>
                    {" "}
                    <span style={{ fontSize:9, color:C.textSec }}>{lbl}</span>
                    {note && <span style={{ fontSize:8, color:C.textDim }}> ({note})</span>}
                  </div>
                  <div style={{ display:"flex", background:C.surface, borderRadius:4,
                    border:`1px solid ${C.border}`, overflow:"hidden", flexShrink:0 }}>
                    {[0,10,20].map(v => (
                      <button key={v} onClick={() => setBuffs(b => ({ ...b, [field]:v }))}
                        style={{ padding:"2px 7px", fontSize:9, border:"none",
                          cursor:"pointer", fontFamily:"'Space Mono',monospace",
                          background: cur===v ? C.accent : "transparent",
                          color: cur===v ? "#fff" : C.textDim }}>
                        {v===0 ? "0" : `+${v}%`}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Deployment Cap buff — separate since it affects troop counts */}
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", marginBottom:5,
              paddingTop:6, borderTop:`1px solid ${C.border}` }}>
              <div>
                <span style={{ fontSize:9, color:C.green, fontWeight:600 }}>
                  {(buffs.deployBuff||0) > 0 ? `+${buffs.deployBuff}%` : "—"}
                </span>
                {" "}
                <span style={{ fontSize:9, color:C.textSec }}>Deployment Cap Buff</span>
              </div>
              <div style={{ display:"flex", background:C.surface, borderRadius:4,
                border:`1px solid ${C.border}`, overflow:"hidden", flexShrink:0 }}>
                {[0,10,20].map(v => (
                  <button key={v} onClick={() => setBuffs(b => ({ ...b, deployBuff:v }))}
                    style={{ padding:"2px 7px", fontSize:9, border:"none",
                      cursor:"pointer", fontFamily:"'Space Mono',monospace",
                      background: (buffs.deployBuff??0)===v ? C.green : "transparent",
                      color: (buffs.deployBuff??0)===v ? "#fff" : C.textDim }}>
                    {v===0 ? "0" : `+${v}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Pet Skills toggle */}
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", marginTop:8,
              paddingTop:8, borderTop:`1px solid ${C.border}` }}>
              <span style={{ fontSize:9, color:C.textSec }}>Pet Skills Active</span>
              <div onClick={() => setPSA(p => !p)}
                style={{ width:32, height:16, borderRadius:8, cursor:"pointer",
                  background: petSkillsActive ? C.accent : C.border,
                  position:"relative", flexShrink:0, transition:"background 0.2s" }}>
                <div style={{ position:"absolute", top:2, left: petSkillsActive ? 14:2,
                  width:12, height:12, borderRadius:"50%", background:"#fff",
                  transition:"left 0.2s" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// RESULTS PANEL
// ─────────────────────────────────────────────────────────────────────────────

function ResultsPanel({ result, scenario }) {
  if (!result) return null;
  const isAtt   = result.winner === "attacker";
  const isTie   = result.winner === "tie";
  const winColor = isAtt ? C.blue : isTie ? C.amber : C.red;
  const winLabel = isAtt ? "ATTACKER WINS" : isTie ? "TIE" : "DEFENDER WINS";

  return (
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`,
      padding: 20, marginTop: 16 }}>

      {/* Winner banner */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800,
          color: winColor, letterSpacing: "0.05em" }}>{winLabel}</div>
        <div style={{ fontSize: 11, color: C.textDim, marginTop: 4,
          fontFamily: "'Space Mono',monospace" }}>
          {result.rounds} rounds
          {result.isMonteCarlo && ` · ${result.runs} simulations`}
        </div>
        {result.isMonteCarlo && (
          <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: winColor }}>
            Attacker win rate: {fmtPct(result.winRate)}
          </div>
        )}
      </div>

      {/* Side-by-side summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12,
        alignItems: "start", marginBottom: 20 }}>
        {/* Attacker */}
        <div style={{ background: `${C.blue}11`, border: `1px solid ${C.blue}33`,
          borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, marginBottom: 8,
            textTransform: "uppercase", letterSpacing: "0.06em" }}>Attacker</div>
          <div style={{ fontFamily: "'Space Mono',monospace" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.textPri }}>
              {fmt(result.attRemaining)} left
            </div>
            <div style={{ fontSize: 11, color: C.red, marginTop: 2 }}>
              −{fmt(result.attLost)} ({fmtPct(result.attPctLost)})
            </div>
            <div style={{ marginTop: 8 }}>
              {UNIT_TYPES.map(ut => (
                <div key={ut} style={{ fontSize: 10, color: UNIT_COLORS[ut],
                  display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span>{UNIT_LABELS[ut]}</span>
                  <span>{fmt(result.attByType[ut])}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* VS */}
        <div style={{ fontSize: 12, fontWeight: 800, color: C.textDim,
          alignSelf: "center", padding: "0 4px" }}>VS</div>

        {/* Defender */}
        <div style={{ background: `${C.red}11`, border: `1px solid ${C.red}33`,
          borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.red, marginBottom: 8,
            textTransform: "uppercase", letterSpacing: "0.06em" }}>Defender</div>
          <div style={{ fontFamily: "'Space Mono',monospace" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.textPri }}>
              {fmt(result.defRemaining)} left
            </div>
            <div style={{ fontSize: 11, color: C.red, marginTop: 2 }}>
              −{fmt(result.defLost)} ({fmtPct(result.defPctLost)})
            </div>
            <div style={{ marginTop: 8 }}>
              {UNIT_TYPES.map(ut => (
                <div key={ut} style={{ fontSize: 10, color: UNIT_COLORS[ut],
                  display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span>{UNIT_LABELS[ut]}</span>
                  <span>{fmt(result.defByType[ut])}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Troop decay bars */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: C.textDim, marginBottom: 8,
          textTransform: "uppercase", letterSpacing: "0.06em",
          fontFamily: "'Space Mono',monospace" }}>
          Remaining Troops — <span style={{ color: C.blue }}>▬ Attacker</span>
          {" "}<span style={{ color: C.red }}>▬ Defender</span>
        </div>
        {UNIT_TYPES.map(ut => (
          <TroopBar key={ut}
            label={UNIT_LABELS[ut]}
            color={UNIT_COLORS[ut]}
            attVal={result.attByType[ut]}
            defVal={result.defByType[ut]}
          />
        ))}
      </div>

      {/* Troop decay chart */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 10, color: C.textDim, marginBottom: 6,
          textTransform: "uppercase", letterSpacing: "0.06em",
          fontFamily: "'Space Mono',monospace" }}>Troop Decay Over Battle</div>
        <div style={{ background: C.surface, borderRadius: 6,
          border: `1px solid ${C.border}`, padding: "10px 6px" }}>
          <DecayChart roundLog={result.roundLog} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const initFighter = (overrides = {}) => ({
  stats: {
    infantry: { ...DEFAULT_STATS },
    lancer:   { ...DEFAULT_STATS },
    marksman: { ...DEFAULT_STATS },
  },
  troops: {
    infantry: { tier: 10, fc: 8, count: 0 },
    lancer:   { tier: 10, fc: 8, count: 0 },
    marksman: { tier: 10, fc: 8, count: 0 },
  },
  // heroes: { infantry: { name, levels }, lancer: {...}, marksman: {...} }
  heroes: {},
  // situational buffs (global, not per-troop-type)
  buffs: { atk:0, leth:0, def:0, hp:0, enemyAtk:0, enemyDef:0,
           enemyHp:0, petAtk:0, petDef:0, petLeth:0, petHp:0,
           apptAtk:0, apptDef:0, apptLeth:0, apptHp:0, deployBuff:0 },
  petSkillsActive: false,
  deployCapManual: 0,
  ratioMode: false,
  ratios: { infantry: 50, lancer: 20, marksman: 30 },
  ...overrides,
});

// Scenario types
const SCENARIOS = [
  { id: "1v1",   label: "1v1 Rally" },
  { id: "reinf", label: "Reinforcement" },
];

export default function BattleSimPage({ inv }) {
  const C = COLORS;

  // ── Persist sim state across navigation via localStorage ──────────────────
  const loadSaved = (key, fallback) => {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
    catch { return fallback; }
  };
  const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

  const [scenario, setScenarioRaw]           = useState(() => loadSaved("bsim-scenario", "1v1"));
  const [monteCarlo, setMonteCarloRaw]       = useState(() => loadSaved("bsim-mc", false));
  const [mcRuns]                             = useState(500);
  const [attacker, setAttackerRaw]           = useState(() => ({ ...initFighter(), ...loadSaved("bsim-attacker", {}) }));
  const [defender, setDefenderRaw]           = useState(() => ({ ...initFighter(), ...loadSaved("bsim-defender", {}) }));
  const [reinforcements, setReinforcementsRaw] = useState(() =>
    loadSaved("bsim-reinf", null) ?? [initFighter(), initFighter(), initFighter()]);
  const [activeReinf, setActiveReinfRaw]     = useState(() => loadSaved("bsim-activereinf", [false, false, false]));

  const setScenario       = v => { setScenarioRaw(v);       save("bsim-scenario", v); };
  const setMonteCarlo     = v => { setMonteCarloRaw(v);     save("bsim-mc", v); };
  const setAttacker       = v => { setAttackerRaw(v);       save("bsim-attacker", v); };
  const setDefender       = v => { setDefenderRaw(v);       save("bsim-defender", v); };
  const setReinforcements = v => { setReinforcementsRaw(v); save("bsim-reinf", v); };
  const setActiveReinf    = v => { setActiveReinfRaw(v);    save("bsim-activereinf", v); };

  const [result, setResult]           = useState(null);
  const [running, setRunning]         = useState(false);
  const [error, setError]             = useState(null);

  // Build a prepared fighter object for the engine
  const prepareFighter = useCallback((f) => {
    const troopObj = {};
    for (const ut of UNIT_TYPES) {
      const { tier, fc, count } = f.troops[ut];
      if (count > 0) troopObj[getTroopKey(ut, tier, fc)] = count;
    }

    const baseStats = buildFighterStats(troopObj, f.stats);
    const fb  = f.buffs || {};

    // Compute actual pet skill bonuses from saved pets-data (scales with pet level)
    const petSkills = f.petSkillsActive ? calcPetSkillEffects() : { bonuses: {} };
    const pb = petSkills.bonuses;

    // Apply global situational buffs + pet skill bonuses to all unit types
    const boostedStats = {};
    for (const ut of UNIT_TYPES) {
      const atkBuff  = (fb.atk||0) + (fb.petAtk||0) + (fb.apptAtk||0) + (pb.atk||0);
      const defBuff  = (fb.def||0) + (fb.petDef||0) + (fb.apptDef||0) + (pb.def||0);
      const lethBuff = (fb.leth||0) + (fb.petLeth||0) + (fb.apptLeth||0) + (pb.leth||0);
      const hpBuff   = (fb.hp||0)   + (fb.petHp||0)  + (fb.apptHp||0)  + (pb.hp||0);

      boostedStats[ut] = {
        count: baseStats[ut].count,
        // ATK and DEF are used directly by the combat formula
        atk: baseStats[ut].atk * (1 + atkBuff / 100),
        def: baseStats[ut].def * (1 + defBuff / 100),
        // Lethality and health bonuses increase effective ATK/DEF respectively
        // (lethality multiplies attacker damage; health multiplies defender HP)
        lethMultiplier: 1 + lethBuff / 100,
        hpMultiplier:   1 + hpBuff   / 100,
      };
    }

    const heroesForEngine = {};
    for (const ut of UNIT_TYPES) {
      const slot = f.heroes[ut];
      if (slot?.name && slot.levels) {
        const hasActive = Object.values(slot.levels).some(l => l > 0);
        if (hasActive) heroesForEngine[slot.name] = slot.levels;
      }
    }
    const heroSkills  = resolveActiveHeroSkills(heroesForEngine);
    const troopSkills = resolveActiveTroopSkills(troopObj);
    return { stats: boostedStats, skills: [...heroSkills, ...troopSkills], troops: troopObj };
  }, []);

  // Merge reinforcements into defender for the sim
  const buildDefenderWithReinf = useCallback(() => {
    if (scenario === "1v1") return prepareFighter(defender);
    // Merge all active reinforcement troops into defender
    const merged = { ...defender };
    const mergedTroops = { ...merged.stats };
    // We re-build by summing troop counts across all defenders
    const allFighters = [defender, ...reinforcements.filter((_, i) => activeReinf[i])];

    // Build a combined troop object
    const combinedTroopObj = {};
    for (const f of allFighters) {
      for (const ut of UNIT_TYPES) {
        const { tier, fc, count } = f.troops[ut];
        if (count > 0) {
          const key = getTroopKey(ut, tier, fc);
          combinedTroopObj[key] = (combinedTroopObj[key] || 0) + count;
        }
      }
    }

    // Combined stats = use first defender's bonuses as base (simplified)
    const stats = buildFighterStats(combinedTroopObj, defender.stats);
    const heroSkills = allFighters.flatMap(f => {
      const heroesForEngine = {};
      for (const ut of UNIT_TYPES) {
        const slot = f.heroes[ut];
        if (slot?.name && slot.levels && Object.values(slot.levels).some(l => l > 0)) {
          heroesForEngine[slot.name] = slot.levels;
        }
      }
      return resolveActiveHeroSkills(heroesForEngine);
    });
    const troopSkills = resolveActiveTroopSkills(combinedTroopObj);
    return { stats, skills: [...heroSkills, ...troopSkills], troops: combinedTroopObj };
  }, [scenario, defender, reinforcements, activeReinf, prepareFighter]);

  const handleRun = useCallback(async () => {
    setError(null);
    setRunning(true);
    setResult(null);

    // Small delay to let the spinner render
    await new Promise(r => setTimeout(r, 50));

    try {
      const att = prepareFighter(attacker);
      const def = buildDefenderWithReinf();

      const totalAtt = UNIT_TYPES.reduce((s, ut) => s + att.stats[ut].count, 0);
      const totalDef = UNIT_TYPES.reduce((s, ut) => s + def.stats[ut].count, 0);
      if (totalAtt === 0) { setError("Attacker has no troops."); setRunning(false); return; }
      if (totalDef === 0) { setError("Defender has no troops."); setRunning(false); return; }

      let res;
      if (monteCarlo) {
        res = runMonteCarlo(att, def, mcRuns);
      } else {
        res = simulateBattle(att, def, false);
      }
      setResult(res);
    } catch (e) {
      setError("Simulation error: " + e.message);
    }
    setRunning(false);
  }, [attacker, buildDefenderWithReinf, monteCarlo, mcRuns, prepareFighter]);

  // Page header styles
  const pageStyle = { padding: "0 0 40px 0" };
  const headerStyle = { display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 };
  const cardStyle = { background: C.card, borderRadius: 8,
    border: `1px solid ${C.border}`, padding: 16, marginBottom: 12 };

  return (
    <div style={pageStyle}>
      {/* Page header */}
      <div style={headerStyle}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800,
            color: C.textPri, letterSpacing: "0.03em" }}>BATTLE SIMULATOR</div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 3 }}>
            Combat engine based on community-verified formulas
          </div>
        </div>

        {/* Scenario + mode controls */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Scenario toggle */}
          <div style={{ display: "flex", background: C.surface, borderRadius: 6,
            border: `1px solid ${C.border}`, overflow: "hidden" }}>
            {SCENARIOS.map(s => (
              <button key={s.id} onClick={() => setScenario(s.id)}
                style={{ padding: "6px 14px", fontSize: 11, fontWeight: 600, border: "none",
                  cursor: "pointer", fontFamily: "'Space Mono',monospace",
                  background: scenario === s.id ? C.accent : "transparent",
                  color: scenario === s.id ? "#fff" : C.textSec }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Monte Carlo toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8,
            background: C.surface, borderRadius: 6, border: `1px solid ${C.border}`,
            padding: "6px 12px" }}>
            <span style={{ fontSize: 11, color: C.textSec }}>
              {monteCarlo ? `Monte Carlo (${mcRuns} runs)` : "Deterministic"}
            </span>
            <div onClick={() => setMonteCarlo(m => !m)}
              style={{ width: 34, height: 18, borderRadius: 9, cursor: "pointer",
                background: monteCarlo ? C.accent : C.border, position: "relative",
                transition: "background 0.2s" }}>
              <div style={{ position: "absolute", top: 2, left: monteCarlo ? 16 : 2,
                width: 14, height: 14, borderRadius: "50%", background: "#fff",
                transition: "left 0.2s" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Deterministic / Monte Carlo description */}
      <div style={{ ...cardStyle, background: monteCarlo ? `${C.amber}11` : `${C.blue}11`,
        border: `1px solid ${monteCarlo ? C.amber : C.blue}33`, padding: "10px 14px",
        marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: monteCarlo ? C.amber : C.blue }}>
          {monteCarlo
            ? `Monte Carlo mode: runs ${mcRuns} simulations with random chance rolls. Slower but accounts for skill proc variance. Win rate % shown.`
            : "Deterministic mode: chance-based skills use expected values (e.g. a 40% proc at +50% damage contributes +20% effective). Instant result."}
        </div>
      </div>

      {/* Fighter panels */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <FighterPanel title="⚔️  ATTACKER" color={C.blue}
          fighter={attacker} onChange={setAttacker} isUserPanel={true} />
        <FighterPanel title="🛡️  DEFENDER" color={C.red}
          fighter={defender} onChange={setDefender} isUserPanel={false} />
      </div>

      {/* Reinforcements (only in reinf scenario) */}
      {scenario === "reinf" && (
        <div style={cardStyle}>
          <SectionHeader title="Reinforcements" subtitle="Up to 3 additional defenders" />
          {reinforcements.map((reinf, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <input type="checkbox" checked={activeReinf[i]}
                  onChange={e => {
                    const next = [...activeReinf];
                    next[i] = e.target.checked;
                    setActiveReinf(next);
                  }}
                  style={{ width: 14, height: 14, accentColor: C.accent, cursor: "pointer" }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.textSec }}>
                  Reinforcement {i + 1}
                </span>
              </div>
              {activeReinf[i] && (
                <FighterPanel title={`Reinforcement ${i + 1}`} color={C.amber}
                  fighter={reinf}
                  onChange={v => {
                    const next = [...reinforcements]; next[i] = v;
                    setReinforcements(next);
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Run button */}
      <button onClick={handleRun} disabled={running}
        style={{ width: "100%", padding: "14px 0", fontSize: 14, fontWeight: 800,
          fontFamily: "'Syne',sans-serif", letterSpacing: "0.08em", textTransform: "uppercase",
          background: running ? C.border : C.accent, color: running ? C.textDim : "#fff",
          border: "none", borderRadius: 8, cursor: running ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          transition: "background 0.2s", marginBottom: 8 }}>
        {running && (
          <div style={{ width: 16, height: 16, borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.3)",
            borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
        )}
        {running ? (monteCarlo ? `Running ${mcRuns} simulations…` : "Simulating…") : "▶  Run Simulation"}
      </button>

      {error && (
        <div style={{ background: `${C.red}22`, border: `1px solid ${C.red}44`,
          borderRadius: 6, padding: "10px 14px", marginBottom: 12,
          fontSize: 12, color: C.red }}>{error}</div>
      )}

      {/* Results */}
      <ResultsPanel result={result} scenario={scenario} />

      {/* Disclaimer */}
      <div style={{ marginTop: 24, padding: "10px 14px", background: C.surface,
        borderRadius: 6, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 10, color: C.textDim, lineHeight: 1.6 }}>
          <strong style={{ color: C.textSec }}>Accuracy note:</strong> Results are estimates
          based on community-verified combat formulas. Hero skill values sourced from the WoS
          Nerds / Fitz spreadsheet. Some edge-case skills and evolving effects are approximated.
          Use as a planning tool, not a guarantee. Verify important SvS decisions with actual
          battle reports.
        </div>
      </div>
    </div>
  );
}
