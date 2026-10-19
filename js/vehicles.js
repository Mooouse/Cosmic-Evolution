import {ART_SURFACES} from './vehicle-surfaces.js?v=0.2.2';
/**
 * Vehicle content and replaceable side-profile illustrations.
 * referenceModel is developer-only research metadata, never a display name.
 * SVG art is an approximate prototype placeholder, NOT exact production likeness.
 * Every record may later supply `image` with a verified, unbranded transparent PNG.
 */
const PALETTE = ['#b9c4cb','#5a8e85','#c86e46','#698ba9','#e7d9bd','#993f4e','#515b70','#a3a767','#775c9e','#4da4a8','#d3a84c','#d1d6db','#497b68','#a24a35'];
// reference | fictional display name | silhouette | length mm | height mm | wheelbase mm
const MODELS = [
[
'Volkswagen Beetle 1967|Pebble 67|beetle|4080|1500|2400',
'Fiat 500 1970|Piccolo 70|compact|2970|1325|1840',
'Mini Cooper 1965|Pip 65|compact|3050|1350|2036',
'Citroen 2CV|Meadow Deux|beetle|3830|1600|2400',
'Renault 4|Rove Four|wagon|3660|1550|2440',
'Volkswagen Golf GTI Mk1|Pocket GT|hatch|3705|1390|2400',
'Honda Civic EF|Sparrow EF|hatch|3965|1335|2500',
'Toyota Corolla E70|Comet 70|sedan|4050|1385|2400',
'Lada 2101|Foundry 01|sedan|4073|1382|2424',
'Peugeot 205 GTI|Lumen 205|hatch|3705|1375|2420',
'Ford Escort Mk2|Orchard RS|classic|3978|1384|2400',
'Opel Kadett C|Cinder C|classic|4127|1375|2395',
'Volvo 240|Nord 240|sedan|4785|1460|2640',
'Datsun 510|Kestrel 510|classic|4120|1400|2420'
],[
'Toyota AE86|Drift 86|fastback|4200|1340|2400',
'Mazda MX-5 NA|Mistral NA|roadster|3970|1235|2265',
'Honda CR-X|Swift X|fastback|3775|1270|2300',
'Volkswagen Corrado|Strata VR|fastback|4049|1318|2470',
'BMW M3 E30|Arden 30|classic|4345|1370|2562',
'Mercedes-Benz 190E|Regent 190|sedan|4420|1375|2665',
'Toyota Celica ST185|Solstice 185|fastback|4420|1305|2525',
'Nissan 180SX|Kaze 180|fastback|4540|1290|2475',
'Mitsubishi Starion|Starlance|wedge|4410|1320|2435',
'Ford Sierra RS Cosworth|Tempest RS|fastback|4460|1365|2608',
'Porsche 924|Arco 24|fastback|4200|1270|2400',
'Alfa Romeo GTV6|Rosso Sei|fastback|4260|1330|2400',
'Pontiac Fiero|Ember GT|wedge|4140|1190|2370',
'Triumph TR6|Briar Six|roadster|3950|1270|2240'
],[
'Nissan Skyline GT-R R34|Kaze R34|coupe|4600|1360|2665',
'Toyota Supra A80|Zenith 80|roundcoupe|4520|1275|2550',
'Mazda RX-7 FD|Mistral Seven|roundcoupe|4285|1230|2425',
'Honda S2000|Arashi 2000|roadster|4135|1285|2400',
'Honda NSX NA1|Shinsei One|super|4430|1170|2530',
'Nissan Silvia S15|Kaze S15|coupe|4445|1285|2525',
'Nissan 350Z|Kaze Z35|roundcoupe|4315|1320|2650',
'Mitsubishi Lancer Evolution IX|Vortex IX|sedan|4490|1450|2625',
'Subaru Impreza WRX STI 2004|Aster STI|sedan|4415|1440|2525',
'Toyota MR2 SW20|Zenith MR|super|4170|1235|2400',
'Mitsubishi 3000GT|Vortex 3000|roundcoupe|4600|1285|2470',
'Mazda RX-8|Mistral Eight|coupe|4435|1340|2700',
'Toyota Chaser JZX100|Comet Tourer|sedan|4715|1400|2730',
'Lexus IS F|Echelon F|sedan|4660|1415|2730'
],[
'Ford Mustang Fastback 1967|Stallion 67|muscle|4663|1288|2743',
'Chevrolet Camaro SS 1969|Coyote 69|muscle|4724|1295|2743',
'Dodge Charger 1969|Thunder 69|muscle|5283|1351|2972',
'Dodge Challenger 1970|Thunder R/T|muscle|4859|1295|2794',
'Pontiac Firebird Trans Am 1977|Firecrest 77|muscle|4999|1257|2743',
'Chevrolet Chevelle SS 1970|Ironclad SS|muscle|5000|1336|2845',
'Plymouth Barracuda 1970|Barracrest 70|muscle|4740|1293|2743',
'Ford GT40|Stallion GT40|super|4064|1029|2413',
'Chevrolet Corvette C3|Vesper C3|roundcoupe|4625|1214|2489',
'Buick Grand National|Obsidian GN|sedan|5095|1375|2746',
'AMC Javelin AMX|Javel 71|muscle|4872|1310|2794',
'Shelby Cobra 427|Venom 427|roadster|3962|1245|2286',
'Dodge Viper GTS|Adder GTS|roundcoupe|4488|1194|2444',
'Chevrolet Corvette C7|Vesper C7|roundcoupe|4493|1234|2710'
],[
'BMW M3 E46|Arden 46|coupe|4492|1372|2731',
'BMW M5 E60|Arden 60|sedan|4855|1469|2889',
'BMW M5 F90|Arden 90|sedan|4965|1473|2982',
'Mercedes-Benz AMG GT|Regent GT|roundcoupe|4546|1287|2630',
'Audi RS6 C8|Quasar RS|wagon|4995|1487|2929',
'Audi R8 V10|Quasar R10|super|4426|1240|2650',
'Porsche 911 GT3 RS 992|Arco GT3|porsche|4572|1322|2457',
'Porsche Cayman GT4|Arco GT4|porsche|4456|1269|2484',
'Jaguar F-Type|Lynx F|roundcoupe|4470|1311|2622',
'Aston Martin Vantage 2018|Aurel V8|roundcoupe|4465|1273|2704',
'Lotus Elise S2|Sylph S2|super|3785|1117|2300',
'Alpine A110 2017|Alto 110|porsche|4178|1252|2419',
'TVR Sagaris|Tempest S|roundcoupe|4057|1175|2361',
'Maserati GranTurismo 2007|Sereno GT|roundcoupe|4881|1353|2942'
],[
'Bentley Continental GT 2018|Bastion GT|coupe|4850|1405|2851',
'Rolls-Royce Wraith|Sovereign W|coupe|5269|1507|3112',
'Mercedes-Benz S63 W222|Regent S63|sedan|5287|1499|3165',
'Lexus LC500|Echelon LC|coupe|4770|1345|2870',
'BMW M8 Competition|Arden Eight|coupe|4867|1362|2827',
'Porsche Panamera Turbo|Arco Executive|fastback|5049|1423|2950',
'Range Rover Sport L461|Highland Sport|suv|4946|1820|2997',
'Mercedes-Benz G63 W463|Regent G|boxsuv|4817|1969|2890',
'Lamborghini Urus|Fulgur U|suv|5112|1638|3003',
'Aston Martin DBX707|Aurel X707|suv|5039|1680|3060',
'Ferrari Purosangue|Rosso Alto|suv|4973|1589|3018',
'Cadillac CT5-V Blackwing|Monarch V|sedan|4924|1445|2947',
'Bentley Bentayga|Bastion X|suv|5125|1728|2995',
'Rolls-Royce Cullinan|Sovereign Atlas|boxsuv|5341|1835|3295'
],[
'Ferrari F40|Rosso Forty|wedge|4430|1130|2450',
'Ferrari F50|Rosso Fifty|super|4480|1120|2580',
'Ferrari 458 Italia|Rosso 458|super|4527|1213|2650',
'Ferrari 812 Superfast|Rosso 812|roundcoupe|4657|1276|2720',
'Lamborghini Countach LP5000|Fulgur LP|wedge|4140|1070|2450',
'Lamborghini Diablo|Fulgur D|wedge|4470|1105|2650',
'Lamborghini Murcielago|Fulgur M|wedge|4580|1135|2665',
'Lamborghini Aventador|Fulgur A|wedge|4780|1136|2700',
'Lamborghini Huracan|Fulgur H|wedge|4459|1165|2620',
'McLaren 720S|Vector 720|super|4544|1196|2670',
'McLaren Artura|Vector A|super|4539|1193|2640',
'Porsche Carrera GT|Arco Carrera|super|4613|1166|2730',
'Ford GT 2017|Stallion GT|super|4762|1110|2710',
'Lexus LFA|Echelon LFA|roundcoupe|4505|1220|2605'
],[
'Bugatti Veyron|Aether V|hyper|4462|1204|2710',
'Bugatti Chiron|Aether C|hyper|4544|1212|2711',
'Koenigsegg Agera RS|Specter RS|hyper|4293|1120|2662',
'Koenigsegg Jesko|Specter J|hyper|4610|1210|2700',
'Pagani Zonda F|Orfeo F|hyper|4435|1151|2730',
'Pagani Huayra|Orfeo H|hyper|4605|1169|2795',
'McLaren F1|Vector One|super|4287|1140|2718',
'McLaren P1|Vector P|hyper|4588|1188|2670',
'Ferrari LaFerrari|Rosso Apex|hyper|4702|1116|2665',
'Porsche 918 Spyder|Arco 918|super|4643|1167|2730',
'Aston Martin Valkyrie|Aurel Valkyr|hyper|4580|1070|2780',
'Rimac Nevera|Volta N|hyper|4750|1208|2745',
'Gordon Murray T.50|Apex Fifty|super|4352|1164|2700',
'Lotus Evija|Sylph E|hyper|4459|1122|2800'
]];
export const CARS = MODELS.flatMap((models,tier)=>models.map((row,i)=>{
 const [referenceModel,name,body,length,height,wheelbase]=row.split('|');
 return {id:`car-${String(tier*14+i+1).padStart(3,'0')}`, name, referenceModel, kind:'car',tier,body,length:+length,height:+height,wheelbase:+wheelbase,color:PALETTE[(tier*3+i)%PALETTE.length],variant:i,artStatus:'approximate-vector'};
}));
// First five illustrations approved by the user on 2026-10-18.
const APPROVED_CARS = {'Pebble 67':'pebble-67','Kestrel 510':'kestrel-510','Firecrest 77':'firecrest-77','Tempest S':'tempest-s','Orfeo F':'orfeo-f'};
for(const v of CARS)if(APPROVED_CARS[v.name]){v.image=`assets/approved/${APPROVED_CARS[v.name]}.webp`;v.artStatus='approved-image';v.surfacePoints=ART_SURFACES[APPROVED_CARS[v.name]];}
const SHIP_NAMES=['Aster','Peregrine','Helix','Odyssey','Lumen','Cassini','Horizon','Vela','Meridian','Pioneer','Solstice','Aurora','Nomad','Equinox','Tethys','Halcyon','Umbra','Kepler','Zenith','Nacre'];
const SHIP_ROLES=['Scout','Courier','Surveyor','Transport','Explorer'];
export const SHIPS = Array.from({length:100},(_,i)=>({id:`ship-${String(i+1).padStart(3,'0')}`,name:`${SHIP_NAMES[i%20]} ${SHIP_ROLES[Math.floor(i/20)]}`,kind:'ship',tier:Math.min(8,Math.floor(i*9/100)),color:PALETTE[(i*3+4)%PALETTE.length],variant:i,body:['shuttle','courier','lander','interceptor','freighter'][Math.floor(i/20)],length:600+(i%7)*23,artStatus:'original-vector'}));
const escapeXML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
let serial=0;
function wheel(x,y,r,uid,variant){
 const spokes=Array.from({length:variant%3===0?5:7},(_,i)=>{const angle=i*360/(variant%3===0?5:7);return `<path d="M-5 -6 L-8 -${r*.67} L-2 -${r*.76} L5 -10 Z" fill="url(#${uid}-metal)" transform="rotate(${angle})"/>`;}).join('');
 return `<g transform="translate(${x} ${y})"><circle r="${r}" fill="#090c10" stroke="#333940" stroke-width="2"/><circle r="${r-5}" fill="none" stroke="#262b30" stroke-width="2"/><circle r="${r*.78}" fill="#0c1117" stroke="#9fa9b3" stroke-width="2"/><circle r="${r*.57}" fill="#56616a" stroke="#77818a" stroke-width="2"/><circle r="${r*.48}" fill="none" stroke="#3a434c" stroke-width="2" stroke-dasharray="2 5"/><path d="M${r*.43} -${r*.37} Q${r*.7} 0 ${r*.43} ${r*.37}" fill="none" stroke="#d6a755" stroke-width="8" stroke-linecap="round"/>${spokes}<circle r="9" fill="#b5bdc4" stroke="#414a53" stroke-width="3"/><circle r="3" fill="#1c252e"/></g>`;
}
function defs(uid,color){return `<defs><linearGradient id="${uid}-paint" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f4fbff" stop-opacity=".8"/><stop offset=".25" stop-color="${color}"/><stop offset=".55" stop-color="${color}"/><stop offset=".78" stop-color="#17222d"/><stop offset="1" stop-color="${color}"/></linearGradient><linearGradient id="${uid}-glass" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#839ca9"/><stop offset=".42" stop-color="#293e4c"/><stop offset="1" stop-color="#0c151e"/></linearGradient><linearGradient id="${uid}-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dbe5e9"/><stop offset=".4" stop-color="#77858e"/><stop offset=".55" stop-color="#dce6e9"/><stop offset="1" stop-color="#45515c"/></linearGradient><linearGradient id="${uid}-engine"><stop stop-color="#79e6ff" stop-opacity="0"/><stop offset="1" stop-color="#b9f5ff"/></linearGradient></defs>`;}
function carArt(v,uid){
 const b=v.body, sport=['super','hyper','wedge'].includes(b), suv=['suv','boxsuv'].includes(b), classic=['classic','sedan','muscle'].includes(b), compact=['compact','hatch'].includes(b);
 const width=Math.max(620,Math.min(780,590+v.length*.034)),l=(900-width)/2,r=900-l, y=273;
 const rear=l+width*(sport?.23:.2),front=l+width*(sport?.79:.8),radius=suv?49:sport?44:42;
 const h=Math.max(110,Math.min(192,width*v.height/v.length*.83)),roof=y-h, belt=y-(suv?90:sport?62:75);
 let rearRoof=l+width*(sport?.37:compact?.18:b==='porsche'?.3:.31),frontRoof=l+width*(sport?.59:compact?.57:.58), windshield=l+width*(sport?.73:.72),rearDeck=l+width*(compact?.08:b==='porsche'?.13:.18);
 let top;
 if(b==='boxsuv')top=`M${l} ${belt+13} L${l+14} ${roof+9} Q${l+15} ${roof} ${l+35} ${roof} L${frontRoof} ${roof} L${windshield-15} ${belt-16} L${r-35} ${belt-8} L${r} ${belt+8}`;
 else if(b==='beetle')top=`M${l} ${belt+25} Q${l+15} ${belt-10} ${rearRoof} ${roof+12} Q${l+width*.46} ${roof-22} ${frontRoof+40} ${roof+8} L${windshield} ${belt-10} Q${r-12} ${belt-15} ${r} ${belt+18}`;
 else if(b==='roadster')top=`M${l} ${belt+18} L${l+25} ${belt} L${l+width*.48} ${belt} L${frontRoof+10} ${roof+25} L${frontRoof+24} ${roof+25} L${windshield} ${belt-5} Q${r-28} ${belt-10} ${r} ${belt+21}`;
 else if(b==='wagon'||compact)top=`M${l} ${belt+14} L${rearDeck} ${roof+15} Q${rearDeck+8} ${roof} ${rearRoof} ${roof} L${frontRoof} ${roof} Q${frontRoof+15} ${roof+3} ${windshield} ${belt-6} L${r-24} ${belt+4} L${r} ${belt+22}`;
 else if(b==='wedge')top=`M${l} ${belt+7} L${rearDeck+20} ${belt-4} L${rearRoof} ${roof+5} L${frontRoof} ${roof} L${windshield} ${belt-6} L${r-13} ${belt+16} L${r} ${belt+30}`;
 else top=`M${l} ${belt+16} Q${l+10} ${belt-2} ${rearDeck} ${belt-3} L${rearRoof} ${roof+12} Q${rearRoof+25} ${roof-6} ${frontRoof} ${roof+3} Q${frontRoof+27} ${roof+8} ${windshield} ${belt-7} Q${r-28} ${belt-6} ${r} ${belt+18}`;
 const contour=`${top} L${r-4} ${y-10} Q${r-10} ${y+1} ${r-27} ${y+1} L${front+radius+9} ${y+1} Q${front+radius+8} ${y-radius-12} ${front} ${y-radius-12} Q${front-radius-9} ${y-radius-12} ${front-radius-9} ${y+1} L${rear+radius+9} ${y+1} Q${rear+radius+7} ${y-radius-12} ${rear} ${y-radius-12} Q${rear-radius-9} ${y-radius-12} ${rear-radius-9} ${y+1} L${l+15} ${y} L${l} ${y-15} Z`;
 const windows=b==='roadster'?`<path d="M${frontRoof+20} ${roof+33} L${windshield-13} ${belt-10} L${frontRoof+20} ${belt-10} Z"/>`:`<path d="M${rearDeck+30} ${belt-12} L${rearRoof+12} ${roof+18} Q${rearRoof+28} ${roof+8} ${frontRoof-8} ${roof+15} L${windshield-19} ${belt-13} Z"/><path d="M${l+width*.48} ${roof+13} L${l+width*.49} ${belt-11}" stroke="#1a222b" stroke-width="8"/>`;
 const doorX=l+width*(classic?.49:.43),doorEnd=windshield-12;
 return `<g>${wheel(rear,y,radius,uid,v.variant)}${wheel(front,y,radius,uid,v.variant)}<path d="${contour}" fill="url(#${uid}-paint)" stroke="#1a242b" stroke-width="2.5"/><path d="${top}" fill="none" stroke="#e4f1f5" stroke-opacity=".65" stroke-width="2"/><g fill="url(#${uid}-glass)" stroke="#99aab3" stroke-width="1.5">${windows}</g><path d="M${doorX} ${belt-5} L${doorX+6} ${y-24} Q${doorX+60} ${y-19} ${doorEnd-8} ${y-24} L${doorEnd} ${belt-4}" fill="none" stroke="#17242d" stroke-opacity=".7" stroke-width="1.7"/>${classic||suv?`<path d="M${l+width*.32} ${belt-3} L${l+width*.33} ${y-25}" fill="none" stroke="#17242d" stroke-opacity=".7" stroke-width="1.6"/>`:''}<path d="M${l+19} ${belt+17} Q450 ${belt+3} ${r-16} ${belt+19}" stroke="#e8f6ff" stroke-opacity=".36" stroke-width="2" fill="none"/><path d="M${rear+radius+12} ${y-11} L${front-radius-12} ${y-11} L${front-radius-9} ${y-2} L${rear+radius+8} ${y-2} Z" fill="#0b151e"/><path d="M${doorX+13} ${belt+11} h23" stroke="#d6e0e3" stroke-width="4" stroke-linecap="round"/><path d="M${windshield-28} ${belt-6} l-13 -13 q-21 -9 -26 3 l6 12z" fill="#15222b" stroke="#85959e" stroke-width="1.5"/><path d="M${r-54} ${belt+5} L${r-10} ${belt+16} L${r-13} ${belt+26} L${r-49} ${belt+19} Z" fill="#d0f2f7" stroke="#819aa8"/><path d="M${l+3} ${belt+14} h30 l-5 14 h-24z" fill="#c34549"/><path d="M${r-29} ${y-28} h24 v12 h-25z" fill="#101c24"/>${sport?`<path d="M${rear+radius+18} ${belt+12} L${doorX-5} ${belt+7} L${doorX+8} ${y-24} L${rear+radius+20} ${y-25} Z" fill="#15232b"/><path d="M${l+12} ${belt-3} L${l+8} ${belt-24} M${l+72} ${belt-8} L${l+73} ${belt-24}" stroke="#1a252c" stroke-width="5"/><path d="M${l-6} ${belt-25} H${l+99} L${l+90} ${belt-31} H${l-9}Z" fill="#19252e"/>`:''}<path d="M${l+11} ${y-5} H${rear-radius-15} M${front+radius+15} ${y-5} H${r+3}" stroke="#0e1a21" stroke-width="5"/></g>`;
}
function shipArt(v,uid){
 const i=v.variant,mod=i%20,type=Math.floor(i/20),l=85+mod%3*9,r=820-mod%4*8,top=115+mod%5*5, mid=197,bot=262-mod%4*5;
 const cockpit=470+(mod%5)*23;
 const hulls=[`M${l} ${mid-27} L${l+80} ${top+17} L${cockpit-50} ${top} Q${cockpit+80} ${top-2} ${r} ${mid+16} L${r-18} ${bot-5} L${l+65} ${bot} L${l} ${mid+34}Z`,`M${l} ${mid-28} L${l+140} ${mid-45} L${cockpit} ${top} L${r} ${mid+9} L${r-32} ${bot-10} L${l+40} ${bot-3}Z`,`M${l} ${mid-45} L${l+100} ${top} L${cockpit-60} ${top} L${cockpit+5} ${top+31} L${r-35} ${mid-6} L${r} ${mid+30} L${r-52} ${bot} L${l+29} ${bot}Z`,`M${l} ${mid-10} L${l+202} ${top+23} L${cockpit-20} ${top} L${r} ${mid+20} L${r-84} ${bot-15} L${l+24} ${bot}Z`,`M${l} ${top+14} L${cockpit-35} ${top+14} L${cockpit+12} ${top+45} L${r-62} ${top+45} L${r} ${mid+20} L${r-12} ${bot} L${l} ${bot}Z`];
 const engines=Array.from({length:2+mod%3},(_,e)=>{const ey=mid-32+e*23;return `<path d="M${l-32} ${ey-8} L${l+35} ${ey-12} L${l+42} ${ey+10} L${l-32} ${ey+7}Z" fill="url(#${uid}-metal)" stroke="#263b4b" stroke-width="2"/><path d="M${l-64} ${ey-3} L${l-30} ${ey-6} L${l-30} ${ey+5} L${l-64} ${ey+2}Z" fill="url(#${uid}-engine)"/><path d="M${l-30} ${ey-5} V${ey+5}" stroke="#92e6ef" stroke-width="4"/>`;}).join('');
 const panels=Array.from({length:4+mod%4},(_,p)=>`<path d="M${l+95+p*54} ${mid+15} l38 -4 l-7 26 h-29z" fill="#142633" fill-opacity=".35" stroke="#e1edf1" stroke-opacity=".2"/><path d="M${l+102+p*54} ${mid+20} h17" stroke="#a2d9e2" stroke-width="2"/>`).join('');
 const fins=type===2?`<path d="M${l+105} ${bot-2} l-30 35 h80 l-15 -35 M${r-160} ${bot-4} l12 39 h70 l-39 -39" fill="url(#${uid}-metal)" stroke="#2c3d49" stroke-width="2"/>`:`<path d="M${l+55} ${mid} L${l+115+mod*2} ${top-45} L${l+169} ${mid} M${l+280} ${mid+9} L${l+190} ${bot+30} L${r-170} ${bot-15}Z" fill="url(#${uid}-paint)" stroke="#253847" stroke-width="2"/>`;
 return `<g>${fins}${engines}<path d="${hulls[type]}" fill="url(#${uid}-paint)" stroke="#243849" stroke-width="2.5"/><path d="M${cockpit-45} ${top+13} Q${cockpit+55} ${top+10} ${r-99} ${mid-5} L${r-145} ${mid+3} L${cockpit-37} ${mid-24}Z" fill="url(#${uid}-glass)" stroke="#b5c9d1" stroke-width="2"/><path d="M${l+65} ${mid+1} Q450 ${mid+25} ${r-28} ${mid+21}" stroke="#cfeaf0" stroke-opacity=".55" stroke-width="2" fill="none"/>${panels}<path d="M${r-64} ${mid+31} l39 2" stroke="#8eeef0" stroke-width="4"/><path d="M${l+45} ${bot-8} H${r-60}" stroke="#172b39" stroke-width="8"/><circle cx="${l+76}" cy="${mid-6}" r="13" fill="#132733" stroke="#7797a9" stroke-width="3"/><circle cx="${l+76}" cy="${mid-6}" r="5" fill="#88e0ec"/></g>`;
}
export function vehicleSVG(vehicle,options={}){
 const v=vehicle||CARS[0],uid=String(options.uid||`vehicle-${++serial}`).replace(/[^a-zA-Z0-9_-]/g,'-'),color=/^#[0-9a-f]{6}$/i.test(options.color||'')?options.color:v.color;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 360" role="img" aria-label="${escapeXML(v.name)}" class="vehicle-svg">${defs(uid,color)}${v.kind==='ship'?shipArt(v,uid):carArt(v,uid)}</svg>`;
}
