(function(){
const $=(r,q)=>r.querySelector(q),$$=(r,q)=>[...r.querySelectorAll(q)],wait=(f,ms)=>setTimeout(f,ms),K=window.KK,stage=document.getElementById('stage'),jump=document.getElementById('jump'),I='#1F2A1D';
const mk=(id,label)=>{const d=document.createElement('section');d.className='scr';d.id=id;d.dataset.screenLabel=label;d.style.background='var(--parch)';stage.appendChild(d);K.S[id]=d;return d;};
const plan={role:'pilot',from:'CSE Block (New Block)',to:'KIIT Campus 6 (Kosi)',time:false,day:0,hh:8,mm:10,rep:false,days:[0,2,4],weeks:4,dirty:false};
const DN=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],DL=['M','T','W','T','F','S','S'],WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const PL=['Current location','Hostel Gate','Library','Canteen','CSE Block (New Block)','KIIT Campus 6 (Kosi)','KIIT Campus 1 (Koel)','KIIT University Gate','Infocity Square'];
const p2=n=>String(n).padStart(2,'0'),now=new Date(),dates=Array.from({length:7},(_,i)=>{const d=new Date(now);d.setDate(d.getDate()+i);return d;});
const addM=(m)=>{const t=plan.hh*60+plan.mm+m;return p2(Math.floor(t/60)%24)+':'+p2(t%60);};
const whenText=()=>plan.time?((plan.day===0?'Today':plan.day===1?'Tomorrow':WD[dates[plan.day].getDay()]+' '+dates[plan.day].getDate())+', '+p2(plan.hh)+':'+p2(plan.mm)):'Leave now';
const repText=()=>plan.rep&&plan.days.length?'Every '+plan.days.slice().sort().map(i=>DN[i]).join(' ')+' for '+plan.weeks+' wk':'';
const arrow=(t)=>t==='in'?'<svg width="18" height="18" viewBox="0 0 18 18"><path d="M6 2h6v6h4l-7 8-7-8h4z" fill="'+I+'"/></svg>':'<svg width="18" height="18" viewBox="0 0 18 18"><path d="M6 16h6v-6h4L9 2 2 10h4z" fill="'+I+'"/></svg>';
const stb=(a,t)=>'<div class="stb" data-a="'+a+'">'+t+'</div>';
// ---------- screen 8: plan
const s8=mk('s8','08 Plan ride');
s8.innerHTML=`<div style="position:absolute;inset:0;padding:52px 18px 0;overflow:hidden">
<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px"><div class="blk" data-tap="1" id="p-back" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;flex:none"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M15 4 L7 12 L15 20" fill="none" stroke="${I}" stroke-width="4" stroke-linecap="square"/></svg></div><div class="px" style="font-weight:700;font-size:28px">Plan a ride</div></div>
<div class="tgl" id="p-role" style="margin-bottom:14px"><div class="on">Pilot</div><div>Co-Pilot</div></div>
<div class="blk" id="p-card" style="padding:4px 12px;position:relative;margin-bottom:14px">
<div class="loc" data-w="from"><i class="sq" style="background:#3A7BE0"></i><div style="min-width:0;padding-right:48px"><small>START</small><b id="p-fv"></b></div></div><i style="display:block;height:3px;background:${I};opacity:.15;margin-left:34px"></i>
<div class="loc" data-w="to"><svg width="22" height="22" viewBox="0 0 24 24" style="flex:none"><rect x="4" y="2" width="3" height="21" fill="${I}"/><path d="M7 3h13v9H7z" fill="#D0452F" stroke="${I}" stroke-width="2.5" stroke-linejoin="round"/></svg><div style="min-width:0;padding-right:48px"><small>DESTINATION</small><b id="p-tv"></b></div></div>
<div class="blk" id="p-swap" data-tap="1" style="position:absolute;right:10px;top:50%;margin-top:-22px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:#fff"><svg width="22" height="22" viewBox="0 0 22 22"><path d="M7 3v16M3 15l4 4 4-4M15 19V3M11 7l4-4 4 4" fill="none" stroke="${I}" stroke-width="3" stroke-linecap="square"/></svg></div></div>
<div class="blk" style="padding:10px 14px;margin-bottom:14px"><div class="srow"><div><b>Set a time</b><small id="p-wh">Leave now</small></div><div class="sw" id="sw-t"></div></div>
<div class="pn" id="pn-t"><div class="dts" id="p-dts" style="margin-top:10px">${dates.map((d,i)=>'<div class="dt" data-i="'+i+'"><small>'+(i===0?'Today':WD[d.getDay()])+'</small><b>'+d.getDate()+'</b></div>').join('')}</div>
<div class="trow"><small id="p-tl">LEAVING AT</small><div class="tstep">${stb('t-','-')}<div class="tdisp"><b class="px" id="p-hh">08</b>:<b class="px" id="p-mm">10</b></div>${stb('t+','+')}</div></div>
<div class="qk" id="p-qk"><div data-q="now">In 15 min</div><div data-q="8:00">08:00</div><div data-q="12:00">12:00</div><div data-q="17:00">17:00</div></div></div></div>
<div class="blk" style="padding:10px 14px"><div class="srow"><div><b>Repeat</b><small id="p-rh">One time</small></div><div class="sw" id="sw-r"></div></div>
<div class="pn" id="pn-r"><div style="display:flex;gap:4px;margin-top:10px" id="p-days">${DL.map((l,i)=>'<div class="dc" data-i="'+i+'">'+l+'</div>').join('')}</div>
<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:10px"><small style="font:700 12px 'DM Sans';letter-spacing:1px;margin-right:6px">FOR</small>${stb('w-','-')}<div class="tdisp" id="p-wk" style="min-width:110px;font:700 16px 'DM Sans'">4 weeks</div>${stb('w+','+')}</div></div></div>
<div style="position:absolute;left:18px;right:18px;bottom:30px"><button class="btn" id="p-go" style="min-height:60px;font-size:24px">Offer a ride</button></div></div>
<div id="p-pk"><div class="blk" id="p-pks"><div style="display:flex;justify-content:space-between;align-items:center"><div class="px" id="p-pkt" style="font-weight:700;font-size:22px">Choose start</div><div class="blk" data-tap="1" id="p-x" style="width:40px;height:40px;display:flex;align-items:center;justify-content:center"><svg width="18" height="18" viewBox="0 0 18 18"><path d="M3 3l12 12M15 3L3 15" stroke="${I}" stroke-width="3.5"/></svg></div></div><input class="fld" id="p-q" placeholder="Search campus"><div id="p-list"></div></div></div>`;
const g=q=>$(s8,q);let which='from';
function refresh(){const co=plan.role==='co';$$(g('#p-role'),'div').forEach((d,i)=>d.classList.toggle('on',(i===0)!==co));
 g('#p-fv').textContent=plan.from||'Choose start';g('#p-tv').textContent=plan.to||'Choose destination';g('#p-fv').style.opacity=plan.from?1:.5;g('#p-tv').style.opacity=plan.to?1:.5;
 g('#sw-t').classList.toggle('on',plan.time);g('#pn-t').classList.toggle('open',plan.time);g('#p-wh').textContent=plan.time?whenText():'Optional, default is now';
 g('#p-tl').textContent=co?'LEAVE BY':'LEAVING AT';g('#p-hh').textContent=p2(plan.hh);g('#p-mm').textContent=p2(plan.mm);
 $$(g('#p-dts'),'.dt').forEach(d=>d.classList.toggle('on',+d.dataset.i===plan.day));$$(g('#p-qk'),'div').forEach(q=>q.classList.toggle('on',q.dataset.q!=='now'&&q.dataset.q===plan.hh+':'+p2(plan.mm)));
 g('#sw-r').classList.toggle('on',plan.rep);g('#pn-r').classList.toggle('open',plan.rep);g('#p-rh').textContent=plan.rep?(repText()||'Pick at least one day'):'One time';
 $$(g('#p-days'),'.dc').forEach(d=>d.classList.toggle('on',plan.days.includes(+d.dataset.i)));g('#p-wk').textContent=plan.weeks+(plan.weeks===1?' week':' weeks');
 g('#p-go').textContent=co?'Find a Pilot':'Offer a ride';g('#p-go').style.opacity=plan.from&&plan.to&&plan.from!==plan.to?1:.55;}
function setRole(r){plan.role=r;if(!plan.dirty){if(r==='pilot'){plan.from='CSE Block (New Block)';plan.to='KIIT Campus 6 (Kosi)';}else{plan.from='Hostel Gate';plan.to='Library';}}refresh();}
K.setRole=setRole;
$$(g('#p-role'),'div').forEach((d,i)=>d.onclick=()=>setRole(i?'co':'pilot'));
g('#p-back').onclick=()=>K.go('s3');
g('#p-swap').onclick=()=>{[plan.from,plan.to]=[plan.to,plan.from];plan.dirty=true;refresh();};
g('#sw-t').onclick=()=>{plan.time=!plan.time;refresh();};g('#sw-r').onclick=()=>{plan.rep=!plan.rep;if(plan.rep&&!plan.time){plan.time=true;}refresh();};
$$(g('#p-qk'),'div').forEach(q=>q.onclick=()=>{if(q.dataset.q==='now'){const n=new Date(Date.now()+15*60000),m=Math.ceil(n.getMinutes()/5)*5;plan.day=0;plan.hh=(n.getHours()+(m===60?1:0))%24;plan.mm=m%60;}else{const [h,m]=q.dataset.q.split(':');plan.hh=+h;plan.mm=+m;}refresh();});
$$(g('#p-dts'),'.dt').forEach(d=>d.onclick=()=>{plan.day=+d.dataset.i;refresh();});
$$(g('#p-days'),'.dc').forEach(d=>d.onclick=()=>{const i=+d.dataset.i,k=plan.days.indexOf(i);k<0?plan.days.push(i):plan.days.splice(k,1);refresh();});
$$(s8,'.stb').forEach(b=>b.onclick=()=>{const a=b.dataset.a;if(a==='t-'||a==='t+'){const t=(plan.hh*60+plan.mm+(a==='t+'?5:-5)+1440)%1440;plan.hh=Math.floor(t/60);plan.mm=t%60;}if(a==='w-')plan.weeks=Math.max(1,plan.weeks-1);if(a==='w+')plan.weeks=Math.min(8,plan.weeks+1);refresh();});
const pk=g('#p-pk'),list=g('#p-list');
function fill(q){list.innerHTML=PL.filter(n=>n.toLowerCase().includes(q.toLowerCase())).map(n=>'<div class="pr" data-n="'+n+'"><i class="sq" style="background:'+(n==='Current location'?'#3A7BE0':'var(--parch)')+'"></i>'+n+'</div>').join('');$$(list,'.pr').forEach(r=>r.onclick=()=>{plan[which]=r.dataset.n;plan.dirty=true;pk.classList.remove('show');refresh();});}
$$(s8,'.loc').forEach(l=>l.onclick=()=>{which=l.dataset.w;g('#p-pkt').textContent=which==='from'?'Choose start':'Choose destination';g('#p-q').value='';fill('');pk.classList.add('show');});
g('#p-q').oninput=e=>fill(e.target.value);g('#p-x').onclick=()=>pk.classList.remove('show');pk.onclick=e=>{if(e.target===pk)pk.classList.remove('show');};
g('#p-go').onclick=()=>{if(!plan.from||!plan.to||plan.from===plan.to){K.shake(g('#p-card'));return;}K.go(plan.role==='pilot'?'s9':'s10');};
// ---------- matching screens
const IN=[119,300],OUT=[240,520],SEG=[[119,300],[112,412],[135,429],[135,484],[146,495],[240,495],[240,520]];
const pts=a=>a.map(q=>q.join(',')).join(' ');
const kmark=(p,t,d)=>{const c=t==='in'?'#7DBB4A':'#E8B23A',left=t==='out',px=left?-94:20;return '<g class="drop" style="animation-delay:'+d+'s"><g transform="translate('+p[0]+','+p[1]+')"><ellipse cx="0" cy="3" rx="10" ry="3" fill="#0003"/><path d="M-5,-8 L0,0 L5,-8Z" fill="'+I+'"/><rect x="-15" y="-46" width="30" height="30" rx="5" fill="'+c+'" stroke="'+I+'" stroke-width="3"/><path d="'+(t==='in'?'M-3,-41 h6 v9 h5 L0,-22 L-8,-32 h5Z':'M-3,-22 h6 v-9 h5 L0,-41 L-8,-31 h5Z')+'" fill="'+I+'"/><rect x="'+px+'" y="-42" width="74" height="22" rx="4" fill="#F5EEDC" stroke="'+I+'" stroke-width="2.5"/><text x="'+(px+37)+'" y="-26" text-anchor="middle" font-family="Pixelify Sans" font-weight="700" font-size="13" fill="'+I+'">KURU '+t.toUpperCase()+'</text></g></g>';};
const radar=(x,y)=>'<g transform="translate('+x+','+y+')">'+[0,.6,1.2].map(d=>'<rect class="rad" x="-40" y="-40" width="80" height="80" style="animation-delay:'+d+'s"/>').join('')+'<rect x="-9" y="-9" width="18" height="18" fill="#3A7BE0" stroke="#fff" stroke-width="3"/></g>';
function mapHTML(role,state){let ov='';
 if(role==='pilot'){ov+='<polyline points="'+pts(ROUTE)+'" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><polyline points="'+pts(ROUTE)+'" fill="none" stroke="#3A7BE0" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><rect x="138" y="178" width="24" height="24" rx="3" fill="#3A7BE0" stroke="#fff" stroke-width="3"/>'+pin(ROUTE[ROUTE.length-1][0],ROUTE[ROUTE.length-1][1],'#D0452F');}
 if(state==='match'){if(role==='pilot')ov+='<polyline points="'+pts(SEG)+'" fill="none" stroke="'+I+'" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><polyline points="'+pts(SEG)+'" fill="none" stroke="#E8B23A" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>';ov+=kmark(IN,'in',.1)+kmark(OUT,'out',.35);}
 else ov+=role==='pilot'?radar(150,380):radar(195,400);
 return '<svg width="390" height="870" viewBox="0 0 390 870"><g transform="translate(0 -80)">'+streetSVG(false)+ov+'</g></svg>';}
const krow=(t,place,time)=>'<div style="display:flex;align-items:center;gap:12px;height:48px"><div style="width:34px;height:34px;flex:none;background:'+(t==='in'?'var(--g1)':'var(--gold)')+';border:3px solid '+I+';border-radius:6px;box-shadow:inset 0 -4px 0 '+(t==='in'?'var(--g2)':'#B98A1E')+';display:flex;align-items:center;justify-content:center">'+arrow(t)+'</div><div style="flex:1;min-width:0"><div style="font:700 11px \'DM Sans\';letter-spacing:1px">KURU '+t.toUpperCase()+'</div><div style="font:700 15px \'DM Sans\';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+place+'</div></div><div class="px" style="font-weight:700;font-size:20px">'+time+'</div></div>';
const chip=(t,c)=>'<div style="display:inline-flex;font:700 16px \'Pixelify Sans\';background:'+c+';border:3px solid '+I+';border-radius:6px;padding:2px 10px;box-shadow:inset 0 -3px 0 rgba(31,42,29,.2)">'+t+'</div>';
function build(id,role,label){const s=mk(id,label),pilot=role==='pilot';let token=0;
 s.innerHTML='<div class="map" id="'+id+'-m"></div><div class="blk" style="position:absolute;top:50px;left:14px;right:14px;padding:8px 12px;display:flex;align-items:center;gap:10px;min-height:52px"><div style="flex:1;min-width:0"><div id="'+id+'-t" style="font:700 14px \'DM Sans\';white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div><div id="'+id+'-w" style="font:500 12px \'DM Sans\';white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div></div><div class="px" style="font-weight:700;font-size:14px;background:'+(pilot?'var(--g1)':'var(--gold)')+';border:3px solid '+I+';border-radius:6px;padding:2px 8px">'+(pilot?'PILOT':'CO-PILOT')+'</div></div><div class="blk sheet" id="'+id+'-s" style="padding-top:18px"></div>';
 const q=x=>$(s,'#'+id+'-'+x);
 function search(){q('m').innerHTML=mapHTML(role,'search');q('t').textContent=plan.from+' to '+plan.to;q('w').textContent=whenText()+(repText()?' · '+repText():'');
  q('s').innerHTML='<div class="px" style="font-weight:700;font-size:22px">'+(pilot?'Looking for riders':'Looking for a Pilot')+'</div><div style="font:500 14px \'DM Sans\';margin:4px 0 16px">'+(pilot?'Checking Co-Pilots along your route':'Checking Pilots heading your way')+'</div>'+xpbar(0)+'<div style="margin-top:20px"><button class="btn stone" id="'+id+'-c">Cancel</button></div>';
  q('c').onclick=()=>{token++;K.go('s8');};const bars=$$(q('s'),'.xp i');bars.forEach((b,i)=>wait(()=>{if(token===my)b.className='on';},i*230));const my=++token;wait(()=>{if(token===my&&K.cur===id)matched();},2500);}
 function matched(){q('m').innerHTML=mapHTML(role,'match');const tin=plan.time?addM(0):'3 min',tout=plan.time?addM(4):'7 min',fare=coin(24)+'<span class="px" style="font-weight:700;font-size:26px">12</span>';
  q('s').style.animation='none';void q('s').offsetWidth;q('s').style.animation='slideUp .45s cubic-bezier(.2,.9,.3,1) both';
  if(pilot)q('s').innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'+chip('Match found','var(--gold)')+'<span style="font:700 12px \'DM Sans\'">Detour +2 min</span></div><div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">'+avatar(...AV[0],34)+'<div style="flex:1"><div class="px" style="font-weight:700;font-size:20px;line-height:1.1">Meera</div><div style="font:500 13px \'DM Sans\'">Co-Pilot, LV 4</div></div><div style="display:flex;align-items:center;gap:6px">+'+fare+'</div></div>'+krow('in','ION Digital Zone',tin)+krow('out','Prasanti Vihar Rd',tout)+(repText()?'<div style="font:700 12px \'DM Sans\';margin:2px 0 8px">Repeats: '+repText()+'</div>':'')+'<div style="display:grid;grid-template-columns:1fr 1.4fr;gap:12px;margin-top:8px"><button class="btn stone" id="'+id+'-d" style="font-size:20px;min-height:52px">Decline</button><button class="btn" id="'+id+'-a" style="font-size:20px;min-height:52px">Accept ride</button></div>';
  else q('s').innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'+chip('Pilot found','var(--gold)')+'<span style="font:700 12px \'DM Sans\'">Walk 2 min to Kuru in</span></div><div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">'+avatar(...AV[1],34)+'<div style="flex:1"><div class="px" style="font-weight:700;font-size:20px;line-height:1.1">Aarav</div><div style="font:500 13px \'DM Sans\'">Pilot, Scooter, LV 5</div></div><div style="display:flex;align-items:center;gap:6px">'+fare+'</div></div>'+krow('in','ION Digital Zone',tin)+krow('out','Prasanti Vihar Rd',tout)+(repText()?'<div style="font:700 12px \'DM Sans\';margin:2px 0 8px">Repeats: '+repText()+'</div>':'')+'<div style="display:grid;grid-template-columns:1fr 1.4fr;gap:12px;margin-top:8px"><button class="btn stone" id="'+id+'-d" style="font-size:20px;min-height:52px">Cancel</button><button class="btn" id="'+id+'-a" style="font-size:20px;min-height:52px">Confirm</button></div>';
  q('d').onclick=()=>K.go('s8');
  q('a').onclick=()=>{const b=q('a');b.textContent=pilot?'Accepted!':'Booked!';wait(()=>{if(pilot)K.go('s7');else{K.go('s3');wait(()=>K.toast('s3','Ride booked','Aarav arrives at Kuru in',''),350);}},550);};}
 K.onEnter[id]=search;}
build('s9','pilot','09 Pilot matching');build('s10','co','10 Co-Pilot matching');
// ---------- entry points + nav
const FLAG='<svg width="22" height="22" viewBox="0 0 24 24" style="flex:none"><rect x="4" y="2" width="3" height="21" fill="'+I+'"/><path d="M7 3h13v9H7z" fill="#D0452F" stroke="'+I+'" stroke-width="2.5" stroke-linejoin="round"/></svg>';
function addPlant(id,fabTop){const s=K.S[id],ov=document.createElement('div');ov.className='pov';
 ov.innerHTML='<div class="blk pps"><div class="px" style="font-weight:700;font-size:24px">Plant a flag</div><div><label class="fl">Leave a note at this spot</label><input class="fld" placeholder="Best chai behind the library"></div><div style="display:grid;grid-template-columns:1fr 1.4fr;gap:12px"><button class="btn stone" style="font-size:20px">Cancel</button><button class="btn" style="font-size:20px">'+FLAG+'Confirm plant</button></div></div>';
 s.appendChild(ov);const inp=$(ov,'.fld'),[no,yes]=$$(ov,'.btn'),home=id==='s3'||id==='s6';let orig=null;
 if(home)orig=$(s,'.sheet .btn');
 const open=()=>{inp.value='';ov.classList.add('show');wait(()=>inp.focus(),350);};
 const close=()=>ov.classList.remove('show');
 no.onclick=close;ov.onclick=e=>{if(e.target===ov)close();};
 yes.onclick=()=>{const note=inp.value.trim();close();wait(()=>{if(home){K.plantFlag(note);}else{K.reward(5,10);const t=document.createElement('div');t.className='blk ptoast tin';t.style.top=(fabTop+54)+'px';t.innerHTML=FLAG+'<div><div class="px" style="font-weight:700;font-size:16px;line-height:1.1">Flag planted</div><div style="font:500 12px \'DM Sans\'">'+(note?'“'+note+'”':'Saved to your map')+'</div></div><b class="px" style="font-size:16px">+10 XP</b>';s.appendChild(t);wait(()=>t.remove(),2600);}},200);};
 if(!home){const b=document.createElement('div');b.className='blk';b.dataset.tap=1;b.style.cssText='position:absolute;right:14px;top:'+fabTop+'px;height:44px;padding:0 12px;display:flex;align-items:center;gap:8px;z-index:5;font:700 15px \'Pixelify Sans\'';b.innerHTML=FLAG+'Flag';b.onclick=open;s.appendChild(b);}
 return open;}
['s3','s6'].forEach(id=>{const sh=$(K.S[id],'.sheet'),open=addPlant(id),hid=document.createElement('div'),grid=document.createElement('div'),pl=document.createElement('button'),pf=document.createElement('button');
 hid.style.display='none';while(sh.children.length>1)hid.appendChild(sh.children[1]);sh.appendChild(hid);
 grid.style.cssText='display:grid;grid-template-columns:1fr 1.5fr;gap:10px';
 pl.className='btn alt';pl.style.cssText="font:700 18px 'Pixelify Sans';min-height:60px";pl.innerHTML='<svg width="20" height="20" viewBox="0 0 18 18" style="flex:none"><rect x="1" y="1" width="6" height="6" fill="#3A7BE0" stroke="'+I+'" stroke-width="2"/><rect x="11" y="11" width="6" height="6" fill="#D0452F" stroke="'+I+'" stroke-width="2"/><path d="M4 7v6h7" fill="none" stroke="'+I+'" stroke-width="2.5"/></svg>Plan ride';
 pf.className='btn';pf.style.cssText='font-size:20px;min-height:60px';pf.innerHTML=FLAG+'Plant flag here';
 grid.append(pl,pf);sh.appendChild(grid);pl.onclick=()=>K.go('s8');pf.onclick=open;
 $$(K.S[id],'*').forEach(el=>{if(el.style.bottom==='316px')el.style.bottom='150px';else if(el.style.bottom==='372px')el.style.bottom='206px';});});
addPlant('s4',126);addPlant('s7',184);addPlant('s9',118);addPlant('s10',118);
[['s8','Plan ride'],['s9','Pilot matching'],['s10','Co-Pilot matching']].forEach(([id,n],i)=>{const b=document.createElement('div');b.className='jb';b.dataset.id=id;b.innerHTML='<span class="px" style="font-size:16px">'+(8+i)+'</span>'+n;b.onclick=()=>K.go(id);jump.appendChild(b);});
refresh();fill('');
})();
