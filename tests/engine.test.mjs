import test from 'node:test';
import assert from 'node:assert/strict';
import {districts,places,makeRoutes,validateContent} from '../dist/content/catalog.js';
import {Simulation,vehicles,position,swept,STEP_TICKS,TICK,randomSeed} from '../dist/sim/engine.js';
import {load,save,KEY} from '../dist/storage/store.js';
const route=d=>({...d.routes[0],gateOrder:[...d.placeIds]});
const simFor=(d=districts[0],practice=false)=>{const s=new Simulation(d,route(d),practice);s.mode='playing';return s;};
const ticks=(s,n=10)=>{for(let i=0;i<n;i++)s.tick();};
test('catalog: 12 unique destinations and independent target/facade permutations',()=>{
  validateContent();assert.equal(places.length,12);
  for(const d of districts){const routes=makeRoutes(d,randomSeed(131));assert.equal(new Set(routes.map(r=>r.targetId)).size,3);
    for(const r of routes)assert.deepEqual([...r.gateOrder].sort(),[...d.placeIds].sort());}
  const generated=Array.from({length:20},(_,i)=>makeRoutes(districts[0],randomSeed(i)));
  assert(generated.some(rs=>rs[0].gateOrder.indexOf(rs[0].targetId)===rs[1].gateOrder.indexOf(rs[1].targetId)));
  const bad=structuredClone(districts);bad[0].lanes[0].speed=NaN;assert.throws(()=>validateContent(bad));
});
test('fixed steps, one-command buffer, borders, one direction and release',()=>{
  const s=simFor();s.press('left');ticks(s,5);assert.equal(s.avatar.x,3.5);assert.equal(s.avatar.y,12);
  s.move('right');s.move('left');ticks(s,5);assert.deepEqual(s.player,{x:3,y:12});assert.equal(s.step.to.x,2);
  s.release();assert.equal(s.queued,null);assert.equal(s.hold,null);ticks(s);assert.equal(s.player.x,2);
  s.player={x:0,y:12};assert.equal(s.move('left'),false);assert.equal(s.move('down'),false);
});
test('held or queued up cannot deliver; a fresh press completes exactly once',()=>{
  const s=simFor();s.traffic=[];s.player={x:1,y:3};s.press('up');s.move('up');ticks(s,30);
  assert.equal(s.player.y,2);assert.equal(s.metrics.outcome,undefined);
  s.release();s.press('up');assert.equal(s.metrics.outcome,'delivered');
  const snapshot=JSON.stringify(s.metrics);s.press('up');s.finish('missed');assert.equal(JSON.stringify(s.metrics),snapshot);
});
test('walk past gates; wrong entrance closes order without consuming attempts, in both modes',()=>{
  for(const practice of [false,true]){const s=simFor(districts[0],practice);s.player={x:1,y:2};
    for(let i=0;i<3;i++){s.move('right');ticks(s);}
    assert.equal(s.metrics.outcome,undefined);assert.equal(s.player.x,4);s.move('up');
    assert.equal(s.metrics.outcome,'missed');assert.equal(s.metrics.wrongEntrances,1);assert.equal(s.remaining,3);
    s.player.x=1;s.move('up');assert.equal(s.metrics.outcome,'missed');}
});
test('swept AABB catches crossing between endpoints and avoids unrelated lanes',()=>{
  assert(swept({x:3,y:5},{x:4,y:5},{x:4,y:5},{x:3,y:5},.52));
  assert(!swept({x:3,y:5},{x:4,y:5},{x:4,y:7},{x:3,y:7},1.5));
});
test('every obstacle class triggers exactly one collision and recovery freezes until valid input',()=>{
  for(const kind of ['car','bicycle','scooter','pedestrian']){
    const s=simFor(districts[2]);const v=s.traffic.find(v=>v.lane.kind===kind);s.traffic=[v];
    s.player={x:position(v,0),y:v.lane.row};s.waiting=false;ticks(s,1);
    assert.equal(s.mode,'recovering',kind);assert.equal(s.metrics.collisions,1);assert.equal(s.remaining,2);
    const time=s.time;ticks(s,27);assert.equal(s.mode,'playing');assert.deepEqual(s.player,s.checkpoint);
    ticks(s,60);assert.equal(s.time,time);assert.equal(s.metrics.collisions,1);
    assert(!s.move('down'));assert(s.waiting);assert(s.move('left'));ticks(s,1);assert(s.time>time);
  }
});
test('checkpoint saves landing column; barrio row 9 is safe, top row is not a checkpoint',()=>{
  const s=simFor();s.traffic=[];s.player={x:6,y:10};s.move('up');ticks(s);assert.deepEqual(s.checkpoint,{x:6,y:9});
  s.player={x:1,y:3};s.move('up');ticks(s);assert.deepEqual(s.checkpoint,{x:6,y:9});
  const c=simFor(districts[1]);c.traffic=[];c.player={x:6,y:10};c.move('up');ticks(c);assert.equal(c.checkpoint.y,12);
});
test('retry restores seed, traffic, target and gate order; practice has unlimited collisions',()=>{
  const s=simFor(),original=JSON.stringify(s.traffic),r=JSON.stringify(s.route);
  for(let i=0;i<3;i++){s.collide();ticks(s,27);}assert.equal(s.mode,'retry');s.retry();
  assert.equal(s.mode,'ready');assert.equal(s.time,0);assert.equal(s.remaining,3);assert.equal(s.metrics.attempts,2);
  assert.equal(JSON.stringify(s.traffic),original);assert.equal(JSON.stringify(s.route),r);
  const p=simFor(districts[0],true);for(let i=0;i<8;i++){p.collide();ticks(p,27);}assert.equal(p.mode,'playing');assert.equal(p.remaining,3);
});
test('pause preserves partial step and simulation time, including initial listening and recovery',()=>{
  for(const mode of ['playing','listening','recovering']){
    const s=simFor();s.move('left');ticks(s,3);s.mode=mode;s.pause();const state=JSON.stringify([s.avatar,s.time,s.recovery]);
    ticks(s,200);assert.equal(JSON.stringify([s.avatar,s.time,s.recovery]),state);assert.equal(s.resume(),mode);
  }
});
test('audio replay interrupted mid-step resumes on the next accepted command',()=>{
  const s=simFor();s.move('left');ticks(s,4);const x=s.avatar.x;s.listen();ticks(s,20);assert.equal(s.avatar.x,x);
  s.listened();assert(s.waiting);s.move('up');ticks(s,6);assert.equal(s.player.x,3);assert.equal(s.step.to.y,11);
});
test('traffic wraps beyond visible world and never sweeps across screen',()=>{
  const vs=vehicles(districts[2],1001);
  for(const v of vs)for(let i=0;i<2000;i++){
    const a=position(v,i*TICK),b=position(v,(i+1)*TICK);
    if(Math.abs(a-b)>v.period/2)assert((a<-.8||a>8.8)&&(b<-.8||b>8.8));
  }
});
test('storage validates corrupt input and works when access is denied',()=>{
  assert.equal(load({getItem:()=>'{'}).lastDistrictId,'barrio');assert.equal(load({getItem:()=>{throw Error();}}).settings.mode,'classic');
  const value=load({getItem:()=>JSON.stringify({settings:{mode:'practice',audioEnabled:false,slowTraffic:'yes'},completedDistrictIds:['barrio','bogus','barrio'],lastDistrictId:'avenida'})});
  assert.deepEqual(value.completedDistrictIds,['barrio']);assert.equal(value.settings.slowTraffic,false);assert.equal(value.lastDistrictId,'avenida');
  save({setItem:()=>{throw Error();}},value);let saved;save({setItem:(key,v)=>{assert.equal(key,KEY);saved=v;}},value);
  assert.equal(JSON.parse(saved).settings.mode,'practice');
});
test('district result totals cover 0/3, 2/3 and 3/3 with one outcome per order',()=>{
  for(const desired of [0,2,3]){const d=districts[0],rs=makeRoutes(d),outcomes=[];
    for(let i=0;i<3;i++){const s=new Simulation(d,rs[i]);s.mode='playing';s.player={x:1,y:2};
      const target=s.route.gateOrder.indexOf(s.route.targetId);s.player.x=[1,4,7][i<desired?target:(target+1)%3];s.move('up');s.move('up');outcomes.push(s.metrics.outcome);}
    assert.equal(outcomes.filter(o=>o==='delivered').length,desired);assert.equal(outcomes.length,3);}
});
