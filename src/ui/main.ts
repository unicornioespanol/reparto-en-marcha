import {districts,places,placeById,makeRoutes,type District,type Route} from '../content/catalog.js';
import {Simulation,TICK,type Direction,type Metrics,type Mode} from '../sim/engine.js';
import {load,save,type Saved} from '../storage/store.js';
import {OrderAudio} from '../audio/orders.js';
import {GameplayMusic} from '../audio/music.js';
import {Renderer,preloadFacades} from '../render/drawing.js';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const dialog=$<HTMLDialogElement>('dialog');
let storage:Storage;try{storage=window.localStorage;}catch{storage={getItem:()=>null,setItem:()=>{}} as unknown as Storage;}
const saved:Saved=load(storage),audio=new OrderAudio(),renderer=new Renderer($<HTMLCanvasElement>('map'));
const music=new GameplayMusic(()=>updateMusicButton());
preloadFacades(places);
let district=districts.find(d=>d.id===saved.lastDistrictId)||districts[0];
let routes:Route[]=makeRoutes(district),order=0,records:Metrics[]=[],campaign=false,campaignRecords:Metrics[]=[];
let sim=new Simulation(district,routes[0]);
let modal='',textVisible=false,last=0,accumulator=0,noticeTimer:ReturnType<typeof setTimeout>;
let heldSource:string|number|null=null;
let listeningInitial=false;
let tutorial=false,tutorialPhase=0,tutorialWait=0,returnFromTutorial:(()=>void)|null=null;
const buttons=[...document.querySelectorAll<HTMLButtonElement>('.dir')];
const persist=()=>save(storage,saved);
function updateMusicButton(){
  $('music').setAttribute('aria-pressed',String(saved.settings.musicEnabled));
  $('music').title=music.unavailable?'Música no disponible. Desactiva y vuelve a activar para reintentar.':
    saved.settings.musicEnabled?'Desactivar música':'Activar música';
}
function syncMusic(){
  music.update(saved.settings.musicEnabled,audio.active);
}
function clearInput(){sim.clearInput();heldSource=null;for(const b of buttons)b.classList.remove('is-held');}
function notice(text:string,persistent=false){clearTimeout(noticeTimer);$('notice').textContent=text;$('notice').hidden=!text;if(!persistent)noticeTimer=setTimeout(()=>$('notice').hidden=true,2400);}
function setText(show:boolean,record=true){
  textVisible=show;if(show&&record)sim.metrics.textRevealed=true;
  $('prompt').textContent=show?placeById[sim.route.targetId].orderText:'Escucha el destino';
  $('text').textContent=show?'Ocultar':'Ver texto';$('text').setAttribute('aria-expanded',String(show));
}
function updateHud(){
  $('district').textContent=tutorial?'Aprender a jugar':district.title;
  $('delivery').textContent=tutorial?'Sin prisa, paso a paso':`Pedido ${order+1} de 3`;
  const delivered=records.filter(r=>r.outcome==='delivered').length;
  $('progress').setAttribute('aria-label',`${delivered} de 3 entregas. ${records.length-delivered} sin entregar.`);
  [...$('progress').querySelectorAll('.dot')].forEach((dot,i)=>{dot.className='dot'+(records[i]?(records[i].outcome==='delivered'?' done':' missed'):i===order?' current':'');});
  $('lives').setAttribute('aria-label',sim.practice?'Práctica: intentos ilimitados':`${sim.remaining} intentos`);
  $('attempt-label').textContent=sim.practice?'Práctica ∞':'Intentos';
  $('attempt-marks').hidden=sim.practice;
  [...$('lives').querySelectorAll('.life')].forEach((l,i)=>l.classList.toggle('lost',i>=sim.remaining));
  const disabled=sim.mode==='ready'||tutorial||['recovering','retry'].includes(sim.mode);
  $<HTMLButtonElement>('listen').disabled=disabled;
  updateMusicButton();syncMusic();
}
type Action={label:string;run:()=>void;primary?:boolean;id?:string};
function showDialog(kind:string,title:string,detail:string,actions:Action[],extra?:HTMLElement){
  clearInput();audio.stop();modal=kind;
  $('dialog-title').textContent=title;$('dialog-detail').textContent=detail;
  $('dialog-extra').replaceChildren(...(extra?[extra]:[]));
  $('dialog-actions').replaceChildren();
  for(const a of actions){
    const b=document.createElement('button');b.type='button';b.className='ui'+(a.primary?' primary':'');b.textContent=a.label;
    if(a.id)b.id=a.id;
    b.addEventListener('click',event=>{
      if(b.disabled||event.detail>1)return;b.disabled=true;
      a.run();if(b.isConnected)b.disabled=false;
    });$('dialog-actions').append(b);
  }
  if(!dialog.open)dialog.showModal();
  syncMusic();
  ($('dialog-actions').querySelector('.primary')||$('dialog-actions').firstElementChild as HTMLElement)?.scrollIntoView({block:'nearest'});
  ($('dialog-actions').querySelector('.primary') as HTMLElement)?.focus();
}
function closeDialog(){audio.stop();modal='';dialog.close();clearInput();last=0;accumulator=0;}
function readOrder(initial=false,review=false){
  if(tutorial||(!review&&!['ready','playing','listening'].includes(sim.mode)))return;
  clearInput();if(!review){listeningInitial=initial;sim.listen();}notice('Escuchando…',true);
  const current=sim;let fallback=false;
  audio.play(placeById[sim.route.targetId].audio,saved.settings.audioEnabled,()=>{
    if(current!==sim)return;fallback=true;setText(true);notice('Lee el destino. Puedes continuar.');
  },()=>{
    if(current!==sim)return;
    if(!initial&&!fallback)sim.metrics.audioReplays++;
    if(!review)sim.listened(initial);if(!fallback)notice('');updateHud();
  });
  syncMusic();
}
function beginOrder(){
  audio.stop();clearInput();notice('');
  sim=new Simulation(district,routes[order],saved.settings.mode==='practice',saved.settings.slowTraffic);
  setText(saved.settings.showTextByDefault);updateHud();readOrder(true);
}
function beginDistrict(d:District,keepCampaign=false){
  district=d;routes=makeRoutes(d);records=[];order=0;
  if(!keepCampaign){campaign=false;campaignRecords=[];}
  saved.lastDistrictId=d.id;persist();audio.preload(d.placeIds.map(id=>placeById[id].audio));
  closeDialog();beginOrder();
}
function startScreen(){
  sim.mode='ready';updateHud();
  const completed=saved.completedDistrictIds.length;
  showDialog('start','Reparto en marcha',`Escucha el destino. Cruza las calles y entrega el pedido. ${district.title} · 3 pedidos.${completed?` Barrios completados: ${completed} de 4.`:''}`,[
    {label:'Jugar',primary:true,id:'play',run:()=>beginDistrict(district)},
    {label:'Aprender',run:()=>startTutorial(startScreen)},
    {label:'Ajustes',run:()=>settingsScreen(startScreen)}
  ]);
}
function pauseGame(){
  clearInput();if(dialog.open){audio.stop();syncMusic();return;}
  if(!['playing','listening','recovering'].includes(sim.mode))return;
  sim.pause();audio.stop();
  showDialog('pause','En pausa','Puedes esperar todo el tiempo que necesites.',[
    {label:'Continuar',primary:true,id:'resume',run:()=>{closeDialog();const mode=sim.resume();if(mode==='listening')readOrder(listeningInitial);syncMusic();}},
    ...(tutorial?[{label:'Saltar',run:endTutorial}]:[
      {label:'Ajustes',run:()=>settingsScreen(pauseScreen)},
      {label:'Aprender',run:()=>startTutorial(pauseScreen)}
    ])
  ]);
}
function pauseScreen(){if(dialog.open)closeDialog();if(sim.mode==='paused')sim.resume();pauseGame();}
function settingsScreen(back:()=>void){
  const form=document.createElement('div');form.className='settings';
  const select=(text:string,values:[string,string][],value:string,change:(v:string)=>void)=>{
    const label=document.createElement('label');label.className='select-label';label.append(text);
    const input=document.createElement('select');for(const [v,t] of values){const o=new Option(t,v);input.add(o);}input.value=value;
    input.addEventListener('change',()=>change(input.value));label.append(input);form.append(label);return input;
  };
  const districtSelect=select('Barrio o campaña',[...districts.map(d=>[d.id,d.title] as [string,string]),['campaign','Campaña · 12 pedidos']],district.id,()=>{});
  select('Modo',[['classic','Clásico · 3 intentos'],['practice','Práctica · sin límite']],saved.settings.mode,v=>{
    saved.settings.mode=v as 'classic'|'practice';sim.practice=v==='practice';persist();updateHud();
  });
  const checkbox=(labelText:string,key:'slowTraffic'|'audioEnabled'|'musicEnabled'|'showTextByDefault')=>{
    const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=saved.settings[key];
    input.addEventListener('change',()=>{saved.settings[key]=input.checked;if(key==='slowTraffic')sim.slow=input.checked;
      if(key==='showTextByDefault')setText(input.checked);
      if(key==='musicEnabled'){if(input.checked)music.retry();updateMusicButton();syncMusic();}
      persist();});label.append(input,labelText);form.append(label);
  };
  checkbox('Tráfico lento (75 %)', 'slowTraffic');checkbox('Voz del pedido', 'audioEnabled');checkbox('Música de fondo', 'musicEnabled');checkbox('Audio y texto', 'showTextByDefault');
  showDialog('settings','Ajustes','Para familias y docentes. Las ayudas no restan entregas.',[
    {label:'Volver',primary:true,run:back},
    {label:'Empezar selección',run:()=>{
      const isCampaign=districtSelect.value==='campaign';beginDistrict(districts.find(d=>d.id===districtSelect.value)||districts[0]);campaign=isCampaign;
    }}
  ],form);
}
function orderResult(){
  if(tutorial){endTutorial();return;}
  if(records.length!==order)return;
  records.push({...sim.metrics});updateHud();
  const delivered=sim.metrics.outcome==='delivered';
  showDialog('orderResult',delivered?'¡Entrega hecha!':'No es aquí, lo siento.',placeById[sim.route.targetId].orderText,[
    {label:order===2?'Ver resultado':'Siguiente pedido',primary:true,id:'next-order',run:()=>{
      if(order===2)districtResult();else{closeDialog();order++;beginOrder();}
    }},
    {label:'Escuchar',run:()=>readOrder(false,true)}
  ]);
}
function summary(rows:Metrics[],rs:Route[]):HTMLElement{
  const ul=document.createElement('ul');ul.className='summary';
  rows.forEach((r,i)=>{const li=document.createElement('li'),mark=document.createElement('span');
    mark.className='result-symbol'+(r.outcome==='missed'?' missed':'');mark.textContent=r.outcome==='delivered'?'✓':'×';mark.setAttribute('aria-hidden','true');
    li.append(mark,`${placeById[rs[i].targetId].label} · ${r.outcome==='delivered'?'entregado':'sin entregar'}`);ul.append(li);});return ul;
}
function districtResult(){
  if(!saved.completedDistrictIds.includes(district.id))saved.completedDistrictIds.push(district.id);persist();
  const count=records.filter(r=>r.outcome==='delivered').length,index=districts.indexOf(district);
  const next=()=>{if(campaign)campaignRecords.push(...records);beginDistrict(districts[index+1],true);};
  const finishCampaign=()=>{
    const all=[...campaignRecords,...records],total=all.filter(r=>r.outcome==='delivered').length;
    showDialog('campaignResult',`${total} de 12 entregas`,'¡Has recorrido los cuatro barrios! Puedes volver a escuchar y practicar.',[
      {label:'Volver a jugar',primary:true,run:()=>{beginDistrict(districts[0]);campaign=true;}},
      {label:'Elegir barrio',run:()=>settingsScreen(startScreen)}
    ]);
  };
  showDialog('districtResult',`${count} de 3 entregas`,`${district.title} completado. ¡Gracias por repartir!`,[
    ...(campaign&&index===3?[{label:'Ver campaña',primary:true,run:finishCampaign}]:index<3?[{label:'Siguiente barrio',primary:true,run:next}]:[]),
    {label:'Volver a jugar',primary:index===3&&!campaign,run:()=>beginDistrict(district)},
    {label:'Elegir barrio',run:()=>settingsScreen(startScreen)}
  ],summary(records,routes));
}
function startTutorial(back:()=>void){
  const previous=sim;returnFromTutorial=()=>{tutorial=false;sim=previous;notice('');updateHud();back();};
  tutorial=true;tutorialPhase=0;tutorialWait=0;
  const d:District={...districts[0],id:'tutorial',lanes:districts[0].lanes.filter(l=>l.row===11).map(l=>({...l,speed:.65}))};
  sim=new Simulation(d,makeRoutes(d)[0],true,true);sim.mode='playing';sim.waiting=false;
  closeDialog();notice('Pulsa una flecha.',true);updateHud();
}
function endTutorial(){const back=returnFromTutorial;returnFromTutorial=null;closeDialog();back?.();}
function input(direction:Direction,source:string|number){
  if(dialog.open||sim.mode!=='playing')return;
  clearInput();heldSource=source;sim.press(direction);
  buttons.find(b=>b.dataset.dir===direction)?.classList.add('is-held');
  if(tutorial&&tutorialPhase===0){tutorialPhase=1;notice('Espera a que pase el coche.',true);}
}
for(const b of buttons){
  b.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;e.preventDefault();b.setPointerCapture(e.pointerId);input(b.dataset.dir as Direction,e.pointerId);});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,e=>{if(heldSource===(e as PointerEvent).pointerId)clearInput();});
  b.addEventListener('click',e=>{if(e.detail===0){sim.move(b.dataset.dir as Direction,true);sim.release();}});
}
const keyDirections:Record<string,Direction>={arrowup:'up',w:'up',arrowdown:'down',s:'down',arrowleft:'left',a:'left',arrowright:'right',d:'right'};
document.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey)return;
  if(e.key==='Escape'){e.preventDefault();if(!dialog.open)pauseGame();else if(modal==='pause')$('resume').click();return;}
  if(dialog.open)return;
  const key=e.key.toLowerCase();
  if(keyDirections[key]){e.preventDefault();if(!e.repeat)input(keyDirections[key],key);}
  if(e.code==='Space'&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();if(!e.repeat)readOrder();}
});
document.addEventListener('keyup',e=>{if(heldSource===e.key.toLowerCase())clearInput();});
dialog.addEventListener('cancel',e=>{e.preventDefault();if(modal==='pause')$('resume').click();});
$('listen').addEventListener('click',()=>readOrder());
$('text').addEventListener('click',()=>setText(!textVisible));
$('pause').addEventListener('click',pauseGame);
$('music').addEventListener('click',()=>{
  saved.settings.musicEnabled=!saved.settings.musicEnabled;
  if(saved.settings.musicEnabled)music.retry();
  persist();updateMusicButton();syncMusic();
});
document.addEventListener('pointerdown',()=>music.unlock(),{capture:true});
document.addEventListener('keydown',()=>music.unlock(),{capture:true});
window.addEventListener('blur',pauseGame);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();});
window.addEventListener('orientationchange',pauseGame);
screen.orientation?.addEventListener('change',pauseGame);
let wasPortrait=innerHeight>=innerWidth;
window.addEventListener('resize',()=>{const portrait=innerHeight>=innerWidth;if(portrait!==wasPortrait)pauseGame();wasPortrait=portrait;});
function frame(timestamp:number){
  syncMusic();
  const delta=last?Math.min(.05,(timestamp-last)/1000):0;last=timestamp;
  if(!dialog.open&&!document.hidden){
    accumulator+=delta;
    while(accumulator>=TICK){
      accumulator-=TICK;sim.tick();
      if(tutorial&&tutorialPhase===1&&!sim.step&&!sim.hold){tutorialWait+=TICK;if(tutorialWait>=1.2){tutorialPhase=2;notice('Ve a la entrada.',true);}}
      for(const event of sim.events.splice(0)){
        if(event==='collision'){clearInput();notice('Otra vez.');updateHud();}
        if(event==='entrance')notice('Pulsa ↑ en una entrada.');
        if(event==='retry'){updateHud();showDialog('retry','Inténtalo otra vez','El destino sigue siendo el mismo.',[
          {label:'Reintentar',primary:true,run:()=>{closeDialog();sim.retry();setText(saved.settings.showTextByDefault||textVisible);readOrder(true);updateHud();}}
        ]);}
      }
      if(sim.mode==='orderResult'&&sim.handoff===0){orderResult();break;}
      if(dialog.open){accumulator=0;break;}
    }
  }else accumulator=0;
  renderer.draw(sim);requestAnimationFrame(frame);
}
setText(saved.settings.showTextByDefault,false);startScreen();requestAnimationFrame(frame);
