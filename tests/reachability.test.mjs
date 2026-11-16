import test from 'node:test';
import assert from 'node:assert/strict';
import {districts} from '../dist/content/catalog.js';
import {vehicles,position,swept} from '../dist/sim/engine.js';
// Time-expanded search: each edge is a real 10-tick linear step (or wait).
// Obstacles are continuous, exactly as in the engine; all three doors are searched together.
test('all 12 route seeds reach all 3 doors at normal and slow speed',()=>{
  let verified=0;
  for(const d of districts)for(const route of d.routes)for(const slow of [false,true]){
    const traffic=vehicles(d,route.seed),found=new Set();let states=new Set([12*9+4]);
    for(let t=0;t<360&&found.size<3;t++){
      const next=new Set();
      const obstacles=traffic.map(v=>({v,a:position(v,t/6,slow),b:position(v,(t+1)/6,slow)}));
      for(const cell of states){
        const from={x:cell%9,y:Math.floor(cell/9)};
        for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){
          const to={x:from.x+dx,y:from.y+dy};if(to.x<0||to.x>8||to.y<2||to.y>12)continue;
          const collision=obstacles.some(({v,a,b})=>{
            if(v.lane.row<Math.min(from.y,to.y)-.6||v.lane.row>Math.max(from.y,to.y)+.6)return false;
            if(Math.abs(a-b)>v.period/2)return false;
            return swept(from,to,{x:a,y:v.lane.row},{x:b,y:v.lane.row},v.lane.length);
          });
          if(!collision){next.add(to.y*9+to.x);if(to.y===2&&[1,4,7].includes(to.x))found.add(to.x);}
        }
      }
      states=next;
    }
    assert.equal(found.size,3,`${d.id}/${route.seed}, slow=${slow}`);verified+=found.size;
  }
  assert.equal(verified,72);
});
test('barrio roads have a free window of at least 0.8 seconds per column',()=>{
  for(const lane of districts[0].lanes.filter(l=>l.kind==='car')){
    const window=(lane.spacing-lane.length-.58)/lane.speed;
    assert(window>=.8,`row ${lane.row}: ${window}`);
  }
});
