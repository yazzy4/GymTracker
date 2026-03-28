/* ═══ RESPONSIVE SWITCH ═══ */
const MQ = window.matchMedia('(min-width: 900px)');
function applyLayout(isDesktop){
	const ds = document.getElementById('desktopShell');
	const ms = document.getElementById('mobileShell');
	ds.style.display   = isDesktop ? 'flex' : 'none';
	ds.setAttribute('aria-hidden', isDesktop ? 'false' : 'true');
	ms.style.display   = isDesktop ? 'none' : 'block';
	ms.setAttribute('aria-hidden', isDesktop ? 'true' : 'false');
	// On switch, re-render both sets of UI from shared state
	renderAll();
}
MQ.addEventListener('change', e => applyLayout(e.matches));
applyLayout(MQ.matches);

/* ═══ STATE ═══ */
const SK = 'gymtracker_v4';
const DEF = {gymId:null,gymName:'',gymAddr:'',busyLevel:0,
						 busyVotes:{busy:0,ok:0},equipment:[],sets:0,reps:0,goal:'strength'};
let state = (()=>{
	try{
		const p = JSON.parse(localStorage.getItem(SK)||'{}');
		p.equipment = (p.equipment||[]).filter(e=>e.expires>Date.now());
		return {...DEF,...p};
	}catch{return{...DEF}}
})();
const save = ()=>{ try{localStorage.setItem(SK,JSON.stringify(state))}catch{} };

/* ═══ HELPERS ═══ */
// p = prefix 'd' (desktop) or 'm' (mobile)
const el = (id, p) => document.getElementById(p+'-'+id);

let toastT;
function toast(msg){
	const t = document.getElementById('toast');
	t.textContent = msg; t.classList.add('show');
	clearTimeout(toastT);
	toastT = setTimeout(()=>t.classList.remove('show'), 2800);
}

function showErr(id, inputId, p){
	el(id,p).classList.add('show');
	if(inputId){ const e=el(inputId,p); e.setAttribute('aria-invalid','true'); e.focus(); }
}
function clearErr(id, inputId, p){
	el(id,p).classList.remove('show');
	if(inputId) el(inputId,p)?.removeAttribute('aria-invalid');
}

/* ═══ GYMS ═══ */
const GYMS = [
	{id:'pf_bk',  name:'Planet Fitness',  addr:'123 Main St, Brooklyn NY',     zip:'11201'},
	{id:'eq_ny',  name:'Equinox',          addr:'456 Park Ave, New York NY',     zip:'10016'},
	{id:'bl_qn',  name:'Blink Fitness',    addr:'789 Atlantic Ave, Queens NY',   zip:'11207'},
	{id:'la_mn',  name:'LA Fitness',       addr:'101 Fulton St, Manhattan NY',   zip:'10038'},
	{id:'ymca',   name:'YMCA',             addr:'55 W 63rd St, New York NY',     zip:'10023'},
	{id:'crunch', name:'Crunch Fitness',   addr:'404 Lafayette St, New York NY', zip:'10003'},
	{id:'barrys', name:"Barry's",          addr:'240 Kent Ave, Brooklyn NY',     zip:'11249'},
	{id:'soul',   name:'SoulCycle',        addr:'609 Greenwich St, New York NY', zip:'10014'},
];

/* ═══ AUTOCOMPLETE — works for both prefixes ═══ */
function setupAC(p){
	const inp = el('gymSearch', p);
	const list = el('autocompleteList', p);
	let acIdx = -1, debT;

	inp.addEventListener('input', ()=>{ clearTimeout(debT); debT=setTimeout(()=>renderAC(inp,list,acIdx=0-1,p),180); });
	inp.addEventListener('keydown', e=>{
		const items = list.querySelectorAll('.ac-item');
		if(e.key==='ArrowDown'){e.preventDefault();acIdx=Math.min(acIdx+1,items.length-1);hilite(items,acIdx)}
		else if(e.key==='ArrowUp'){e.preventDefault();acIdx=Math.max(acIdx-1,-1);hilite(items,acIdx)}
		else if(e.key==='Enter'){if(acIdx>=0&&items[acIdx])items[acIdx].dispatchEvent(new Event('select'));else searchGym(p)}
		else if(e.key==='Escape')closeAC(inp,list);
	});
	document.addEventListener('pointerdown', e=>{ if(!e.target.closest('.autocomplete-wrap'))closeAC(inp,list); });
}

function renderAC(inp, list, _, p){
	const q = inp.value.trim().toLowerCase();
	list.innerHTML='';
	if(!q){closeAC(inp,list);return;}
	const hits = GYMS.filter(g=>g.name.toLowerCase().includes(q)||g.zip.includes(q)||g.addr.toLowerCase().includes(q)).slice(0,5);
	if(!hits.length){closeAC(inp,list);return;}
	hits.forEach(g=>{
		const d=document.createElement('div');
		d.className='ac-item';d.setAttribute('role','option');d.setAttribute('aria-selected','false');
		d.innerHTML=`<div>${g.name}</div><div class="ac-addr">${g.addr}</div>`;
		d.addEventListener('pointerdown',e=>{e.preventDefault();inp.value=g.name;closeAC(inp,list);applyGym(g,p);});
		d.addEventListener('select',()=>{inp.value=g.name;closeAC(inp,list);applyGym(g,p);});
		list.appendChild(d);
	});
	list.style.display='block';
	inp.setAttribute('aria-expanded','true');
}

function hilite(items, idx){
	items.forEach((el,i)=>{el.classList.toggle('focused',i===idx);el.setAttribute('aria-selected',i===idx?'true':'false');});
}
function closeAC(inp, list){list.style.display='none';list.innerHTML='';inp.setAttribute('aria-expanded','false');}

function searchGym(p){
	clearErr('searchErr','gymSearch',p);
	const q = el('gymSearch',p).value.trim();
	if(!q){showErr('searchErr','gymSearch',p);return;}
	const ql = q.toLowerCase();
	const match = GYMS.find(g=>g.name.toLowerCase().includes(ql)||g.zip.includes(ql)||g.addr.toLowerCase().includes(ql))
		||{id:'custom_'+ql, name:q.charAt(0).toUpperCase()+q.slice(1), addr:'Location confirmed'};
	applyGym(match, p);
	closeAC(el('gymSearch',p), el('autocompleteList',p));
}

function applyGym(g, p){
	state.gymId=g.id; state.gymName=g.name; state.gymAddr=g.addr;
	if(!state.busyLevel) state.busyLevel=Math.floor(Math.random()*55)+10;
	save();
	renderAll();
	toast('Gym set to '+g.name);
}

/* ═══ HEATMAP ═══ */
const HMAP_H=['6am','7am','8am','9am','10am','11am','12pm','1pm','2pm','3pm','4pm','5pm','6pm','7pm','8pm','9pm','10pm','11pm'];
const HMAP_S=['6a','7a','8a','9a','10','11','12p','1p','2p','3p','4p','5p','6p','7p','8p','9p','10','11p'];

function gymHeatData(id){
	const seed=(id||'x').split('').reduce((a,c)=>a+c.charCodeAt(0),0);
	const rng=i=>{let x=Math.sin(seed*9301+i*49297+233)*2;return x-Math.floor(x)};
	const base=[5,4,3,10,35,65,75,60,50,55,70,85,80,65,45,30,18,8];
	return base.map((b,i)=>Math.min(100,Math.max(5,Math.round(b+(rng(i)-.5)*28))));
}
function levelColor(v){if(v<30)return'#4ade80';if(v<55)return'#fbbf24';if(v<75)return'#fb923c';return'#f87171'}
function levelLabel(v){if(v<30)return'Quiet';if(v<55)return'Moderate';if(v<75)return'Busy';return'Very busy'}

function renderHeatmap(gridId, axisId){
	const grid=document.getElementById(gridId), axis=document.getElementById(axisId);
	if(!grid) return;
	grid.innerHTML=''; axis.innerHTML='';
	gymHeatData(state.gymId||'default').forEach((v,i)=>{
		const cell=document.createElement('div');
		cell.className='hmap-cell';
		cell.style.background=levelColor(v);
		cell.style.opacity=0.2+(v/100)*0.8;
		cell.setAttribute('tabindex','0');
		cell.setAttribute('role','img');
		cell.setAttribute('aria-label',`${HMAP_H[i]}: ${v}% busy — ${levelLabel(v)}`);
		cell.innerHTML=`<span class="hmap-tooltip" aria-hidden="true">${HMAP_S[i]} · ${v}%</span>`;
		grid.appendChild(cell);
		const lbl=document.createElement('div');
		lbl.className='hmap-lbl'; lbl.textContent=i%3===0?HMAP_S[i]:'';
		axis.appendChild(lbl);
	});
}

/* ═══ METER ═══ */
function updateMeter(p){
	const v = state.busyLevel;
	const fill   = el('meterFill',p);
	const status = el('meterStatus',p);
	const pct    = el('meterPct',p);
	const track  = el('meterTrack',p);
	if(!fill) return;
	fill.style.width = v+'%';
	track.setAttribute('aria-valuenow', v);
	pct.textContent = v ? v+'%' : '';
	let color, label;
	if(v<30){color='#4ade80';label='Not Busy';}
	else if(v<60){color='#fbbf24';label='Moderate';}
	else if(v<80){color='#fb923c';label='Busy';}
	else{color='#f87171';label='Very Busy';}
	fill.style.background=color;
	status.style.color=color;
	status.textContent=v?label:'–';
	if(v>=60||state.equipment.length>=2) triggerAlternatives(false, p);
}

function reportBusy(isBusy, p){
	if(!state.gymId){toast('Search for your gym first.');return;}
	if(isBusy){
		state.busyVotes.busy++;state.busyLevel=Math.min(100,state.busyLevel+15);
		el('btnBusy',p).classList.add('active');el('btnBusy',p).setAttribute('aria-pressed','true');
		el('btnOk',p).classList.remove('active');el('btnOk',p).setAttribute('aria-pressed','false');
		toast('Reported busy — thanks!');
	} else {
		state.busyVotes.ok++;state.busyLevel=Math.max(0,state.busyLevel-15);
		el('btnOk',p).classList.add('active');el('btnOk',p).setAttribute('aria-pressed','true');
		el('btnBusy',p).classList.remove('active');el('btnBusy',p).setAttribute('aria-pressed','false');
		toast('Reported not busy — thanks!');
	}
	save(); renderAll();
}

function suggestTime(p){
	if(!state.gymId){toast('Find your gym first.');return;}
	const v=state.busyLevel;
	const msg=v<30?"Now is a great time — it's quiet!":v<60?'Moderate now. Peak hours end around 7pm.':'Busy now. Try before 8am or after 8pm.';
	const box=el('planBox',p);
	box.textContent=msg; box.classList.add('show');
	toast('Arrival time updated');
}

/* ═══ EQUIPMENT ═══ */
const EXPIRY = 30*60*1000;
let equipTimers = {};

function reportEquip(p){
	clearErr('equipErr','equipInput',p);
	const inp=el('equipInput',p), val=inp.value.trim();
	if(!val){showErr('equipErr','equipInput',p);return;}
	state.equipment.push({name:val,expires:Date.now()+EXPIRY});
	inp.value=''; save(); renderAll();
	toast(`"${val}" marked in use`);
	if(state.equipment.length>=2) triggerAlternatives(false, p);
}

// Enter key on equipment input
['m','d'].forEach(p=>{
	const inp = document.getElementById(p+'-equipInput');
	if(inp) inp.addEventListener('keydown',e=>{ if(e.key==='Enter') reportEquip(p); });
});

function removeEquip(i){
	const name=state.equipment[i]?.name;
	clearInterval(equipTimers[i]); delete equipTimers[i];
	state.equipment.splice(i,1); save(); renderAll();
	if(name) toast(`"${name}" cleared`);
}

function renderEquipList(listId){
	const list=document.getElementById(listId);
	if(!list) return;
	state.equipment=state.equipment.filter(e=>e.expires>Date.now());
	list.innerHTML='';
	if(!state.equipment.length){
		list.innerHTML='<div style="font-size:13px;color:var(--muted);padding:4px 0" role="listitem">No equipment reported yet</div>';
		return;
	}
	state.equipment.forEach((item,i)=>{
		const rem=Math.max(0,Math.round((item.expires-Date.now())/60000));
		const tag=document.createElement('div');
		tag.className='equip-tag'; tag.setAttribute('role','listitem');
		tag.innerHTML=`<span>${item.name}</span><span class="etimer" id="et${listId}${i}" aria-label="${rem} minutes remaining">${rem}m</span><button class="eremove" onclick="removeEquip(${i})" aria-label="Remove ${item.name}">✕</button>`;
		list.appendChild(tag);
		clearInterval(equipTimers[i]);
		equipTimers[i]=setInterval(()=>{
			const r=Math.max(0,Math.round((item.expires-Date.now())/60000));
			document.querySelectorAll(`[id^="et"][id$="${i}"]`).forEach(e=>e.textContent=r+'m');
			if(r===0) removeEquip(i);
		},30000);
	});
}

/* ═══ REPS ═══ */
function updateReps(p){
	clearErr('repsErr',null,p);
	const sets=parseInt(el('setsInput',p).value);
	const reps=parseInt(el('repsInput',p).value);
	if(isNaN(sets)||isNaN(reps)||sets<0||reps<0||sets>99||reps>99){showErr('repsErr',null,p);return;}
	state.sets=sets; state.reps=reps; save(); renderAll();
	toast('Progress shared with members');
}

function renderReps(p){
	const d=el('repsDisplay',p);
	if(!d) return;
	if(state.sets||state.reps){
		el('setsVal',p).textContent=state.sets;
		el('repsVal',p).textContent=state.reps;
		el('totalVal',p).textContent=state.sets*state.reps;
		d.style.display='grid';
	}
}

/* ═══ GOAL CHIPS ═══ */
function setGoal(btn, p){
	// Update both sets of chips
	['m','d'].forEach(px=>{
		document.querySelectorAll(`#${px}-altEmpty,.goal-chip`).forEach(()=>{});
		document.getElementById(px+'-altEmpty') && document.querySelectorAll(`[id^="${px}-"] .goal-chip`);
	});
	// Actually just update all goal chips on page
	document.querySelectorAll('.goal-chip').forEach(c=>{
		const on = c.dataset.goal===btn.dataset.goal;
		c.classList.toggle('active',on);
		c.setAttribute('aria-pressed',on?'true':'false');
	});
	state.goal=btn.dataset.goal; save();
	if(document.getElementById('d-altCard').style.display!=='none'||
		 document.getElementById('m-altCard').style.display!=='none'){
		triggerAlternatives(true, p);
	}
}

/* ═══ AI ALTERNATIVES ═══ */
let altInFlight=false;

async function triggerAlternatives(force=false, p='m'){
	if(altInFlight&&!force) return;
	altInFlight=true;
	['m','d'].forEach(px=>{
		const empty=document.getElementById(px+'-altEmpty');
		const card=document.getElementById(px+'-altCard');
		if(empty) empty.style.display='none';
		if(card) card.style.display='block';
		const lst=document.getElementById(px+'-altList');
		if(lst) lst.innerHTML=`<div class="loading-row"><div class="loading-dots"><span></span><span></span><span></span></div> Finding ${state.goal} workouts…</div>`;
	});
	const blocked=state.equipment.map(e=>e.name).join(', ')||'common machines';
	const ctx=state.busyLevel>=60?`Gym is ${state.busyLevel}% busy. Equipment in use: ${blocked}.`:`Some equipment unavailable: ${blocked}.`;
	['m','d'].forEach(px=>{const ap=document.getElementById(px+'-altPrompt');if(ap)ap.textContent=ctx;});

	try{
		const res=await fetch('https://api.anthropic.com/v1/messages',{
			method:'POST',headers:{'Content-Type':'application/json'},
			body:JSON.stringify({
				model:'claude-sonnet-4-20250514',max_tokens:1000,
				messages:[{role:'user',content:`Gym ${state.busyLevel}% busy. Equipment in use: ${blocked}. User goal: ${state.goal}. Suggest 3 alternative workouts. Return ONLY valid JSON array, no markdown. Schema: [{"title":string,"badge":string,"desc":string}]`}]
			})
		});
		const data=await res.json();
		let raw=data.content.map(b=>b.text||'').join('').replace(/```json|```/g,'').trim();
		renderAlts(JSON.parse(raw));
	}catch{
		renderAlts(getFallbacks(state.goal));
	}
	altInFlight=false;
}

function renderAlts(sugs){
	['m','d'].forEach(p=>{
		const list=document.getElementById(p+'-altList');
		if(!list) return;
		list.innerHTML='';
		sugs.forEach(s=>{
			const d=document.createElement('div');
			d.className='alt-item'; d.setAttribute('role','article');
			d.setAttribute('aria-label',s.title+': '+s.desc);
			d.innerHTML=`<div class="alt-badge" aria-hidden="true">${s.badge}</div><div class="alt-title">${s.title}</div><div class="alt-desc">${s.desc}</div>`;
			list.appendChild(d);
		});
	});
}

function getFallbacks(goal){
	const F={
		strength:[
			{badge:'Bodyweight',title:'Push & Dip Circuit',desc:'3×12 push-ups, pike presses, and tricep dips. Add Bulgarian split squats for lower-body strength.'},
			{badge:'Core',title:'Resistance Core Series',desc:'Load a backpack with books for weighted sit-ups and Russian twists. Planks with shoulder taps tax stabilisers hard.'},
			{badge:'Outdoor',title:'Park Pull-up Session',desc:'Any park bar works for pull-ups, rows, and bar dips. These compound moves rival machines for raw strength.'},
		],
		cardio:[
			{badge:'HIIT',title:'Tabata Sprint Protocol',desc:'20s max effort, 10s rest, 8 rounds per exercise. Combine burpees, high knees, and jump squats for cardio gains.'},
			{badge:'Outdoor',title:'Hill Sprint Intervals',desc:'Sprint 8×30m up any incline with 90s recovery. Spikes heart rate fast and is gentler on joints than flat sprinting.'},
			{badge:'Bodyweight',title:'Jump Rope Flow',desc:'Skip for 20 minutes mixing single-unders, doubles, and boxer steps. Rivals most gym machines for cardio output.'},
		],
		mobility:[
			{badge:'Yoga',title:'Hip & Thoracic Opening',desc:'90/90 hip stretches, thoracic rotations, and pigeon pose held 2 minutes each. Zero equipment, major relief.'},
			{badge:'Stretch',title:'Loaded Progressive Stretching',desc:'Use a towel or band for assisted hamstring and shoulder stretches at end range. Builds lasting flexibility.'},
			{badge:'Recovery',title:'Foam Roll & Activate',desc:'10 minutes rolling lats, IT band, calves — then clamshells and dead bugs to activate before lifting.'},
		],
		'fat loss':[
			{badge:'AMRAP',title:'20-Minute Fat Burner',desc:'As many rounds as possible: 10 burpees, 15 jump squats, 20 mountain climbers. Elevates metabolism for hours.'},
			{badge:'Outdoor',title:'Fasted Morning Walk',desc:'45-minute brisk walk on an empty stomach is one of the most effective fat-oxidation tools available.'},
			{badge:'HIIT',title:'Bodyweight Metabolic Blast',desc:'Hip-hinge jumps, push-up holds, and lateral skaters in 40/20 intervals. 5 rounds, 60s rest between each.'},
		],
	};
	return F[goal]||F.strength;
}

/* ═══ MOBILE NAV ═══ */
function switchPage(btn){
	document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
	document.querySelectorAll('.nav-btn').forEach(b=>{b.classList.remove('active');b.removeAttribute('aria-current');});
	document.getElementById(btn.dataset.page).classList.add('active');
	btn.classList.add('active'); btn.setAttribute('aria-current','page');
	window.scrollTo({top:0,behavior:'smooth'});
}

/* ═══ SIDEBAR NAV (desktop) ═══ */
function scrollToSection(btn){
	document.querySelectorAll('.snav-btn').forEach(b=>{b.classList.remove('active');b.removeAttribute('aria-current');});
	btn.classList.add('active'); btn.setAttribute('aria-current','true');
	const target=document.getElementById(btn.dataset.section);
	if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
}

/* ═══ RENDER ALL — sync both UIs from shared state ═══ */
function renderAll(){
	['m','d'].forEach(p=>{
		// Gym
		const gr=document.getElementById(p+'-gymResult');
		if(!gr) return;
		if(state.gymId){
			document.getElementById(p+'-gymSearch').value=state.gymName;
			document.getElementById(p+'-gymName').textContent=state.gymName;
			document.getElementById(p+'-gymAddr').textContent=state.gymAddr;
			gr.classList.add('show');
		}
		// Meter
		updateMeter(p);
		// Heatmap
		if(state.gymId){
			const hw = document.getElementById(p+'-heatmapWrap')||document.getElementById(p+'-heatmapCard');
			if(hw) hw.style.display='block';
			if(p==='m') renderHeatmap('m-heatmapGrid','m-heatmapAxis');
			if(p==='d') renderHeatmap('d-heatmapGrid','d-heatmapAxis');
		}
		// Plan box
		const pb=document.getElementById(p+'-planBox');
		if(pb&&pb.textContent) pb.classList.add('show');
		// Busy buttons
		['btnBusy','btnOk'].forEach(id=>{
			const btn=document.getElementById(p+'-'+id);
			if(btn) btn.setAttribute('aria-pressed',btn.classList.contains('active')?'true':'false');
		});
		// Equipment
		renderEquipList(p+'-equipList');
		// Inputs
		if(state.sets||state.reps){
			const si=document.getElementById(p+'-setsInput');
			const ri=document.getElementById(p+'-repsInput');
			if(si) si.value=state.sets;
			if(ri) ri.value=state.reps;
		}
		renderReps(p);
		// Goal chips
		document.querySelectorAll(`[id^="${p}"] .goal-chip`).forEach(c=>{
			const on=c.dataset.goal===state.goal;
			c.classList.toggle('active',on);
			c.setAttribute('aria-pressed',on?'true':'false');
		});
	});
}

/* ═══ BOOT ═══ */
setupAC('m');
setupAC('d');
renderAll();