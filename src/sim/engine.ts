import type { District, Lane, Route } from '../content/catalog.js';
export const TICK=1/60, STEP_TICKS=10, GATES=[1,4,7];
export type Direction='up'|'down'|'left'|'right';
export type Point={x:number;y:number};
export type Outcome='delivered'|'missed';
export type Mode='ready'|'listening'|'playing'|'paused'|'recovering'|'retry'|'orderResult';
export interface Metrics { collisions:number; wrongEntrances:number; audioReplays:number; textRevealed:boolean; attempts:number; outcome?:Outcome }
export interface Vehicle { lane:Lane; offset:number; period:number; index:number }
export const directions:Record<Direction,Point>={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
const mod=(n:number,d:number)=>((n%d)+d)%d;
export function randomSeed(seed:number):()=>number {return ()=>{ seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
export function vehicles(district:District,seed:number):Vehicle[]{
  return district.lanes.flatMap(lane=>{
    const count=Math.ceil((9+4*lane.length)/lane.spacing),period=count*lane.spacing;
    const phase=randomSeed(seed+lane.row*7919)()*lane.spacing;
    return Array.from({length:count},(_,index)=>({lane,period,index,offset:index*lane.spacing+phase}));
  });
}
export function position(v:Vehicle,time:number,slow=false):number {
  const distance=mod(v.offset+v.lane.speed*time*(slow?.75:1),v.period)-2*v.lane.length;
  return v.lane.direction===1?distance:8-distance;
}
function axis(from:number,to:number,radius:number):[number,number]{
  if(Math.abs(to-from)<1e-10) return Math.abs(from)<=radius?[-Infinity,Infinity]:[Infinity,-Infinity];
  const a=(-radius-from)/(to-from),b=(radius-from)/(to-from);return [Math.min(a,b),Math.max(a,b)];
}
export function swept(a:Point,b:Point,obstacleA:Point,obstacleB:Point,length:number):boolean {
  const [ax,bx]=axis(a.x-obstacleA.x,b.x-obstacleB.x,.29+length/2);
  const [ay,by]=axis(a.y-obstacleA.y,b.y-obstacleB.y,.6);
  return Math.max(0,ax,ay)<=Math.min(1,bx,by);
}
export class Simulation {
  mode:Mode='ready'; time=0; player:Point={x:4,y:12}; checkpoint:Point={x:4,y:12};
  step:({ticks:number;to:Point})|null=null; queued:Direction|null=null;
  hold:({direction:Direction;next:number})|null=null;
  waiting=true; remaining=3; recovery=0; handoff=0; entranceHint=false;
  metrics:Metrics={collisions:0,wrongEntrances:0,audioReplays:0,textRevealed:false,attempts:1};
  traffic:Vehicle[]; events:string[]=[]; private pausedFrom:Mode='playing';
  constructor(public district:District,public route:Route,public practice=false,public slow=false){this.traffic=vehicles(district,route.seed);}
  get avatar():Point {const p=this.step?this.step.ticks/STEP_TICKS:0;return {x:this.player.x+(this.step?this.step.to.x-this.player.x:0)*p,y:this.player.y+(this.step?this.step.to.y-this.player.y:0)*p};}
  clearInput(){this.hold=null;this.queued=null;}
  move(direction:Direction,fresh=true):boolean {
    if(this.mode!=='playing')return false;
    if(this.step){this.queued=direction;this.waiting=false;return false;}
    const d=directions[direction],x=this.player.x+d.x,y=this.player.y+d.y;
    if(this.player.y===2 && direction==='up'){
      const gate=GATES.indexOf(this.player.x);
      if(gate>=0 && fresh)this.finish(this.route.gateOrder[gate]===this.route.targetId?'delivered':'missed');
      return false;
    }
    if(x<0||x>8||y<2||y>12)return false;
    this.step={ticks:0,to:{x,y}};this.waiting=false;return true;
  }
  press(direction:Direction){
    this.move(direction,true);
    if(this.mode==='playing')this.hold={direction,next:this.time+.28};
  }
  release(){this.clearInput();}
  listen(){if(this.mode==='playing'||this.mode==='ready'||this.mode==='listening'){this.clearInput();this.mode='listening';}}
  listened(initial=false){if(this.mode==='listening'){this.mode='playing';this.waiting=!initial;}}
  pause(){if(['playing','listening','recovering'].includes(this.mode)){this.pausedFrom=this.mode;this.mode='paused';this.clearInput();}}
  resume():Mode {if(this.mode==='paused')this.mode=this.pausedFrom;return this.mode;}
  retry(){
    if(this.mode!=='retry')return;
    this.metrics.attempts++;this.remaining=3;this.time=0;this.player={x:4,y:12};this.checkpoint={...this.player};
    this.step=null;this.waiting=true;this.clearInput();this.mode='ready';this.entranceHint=false;
  }
  finish(outcome:Outcome){
    if(this.metrics.outcome || this.mode!=='playing')return;
    this.metrics.outcome=outcome;this.metrics.wrongEntrances+=outcome==='missed'?1:0;
    this.mode='orderResult';this.handoff=outcome==='delivered'?36:0;this.clearInput();this.step=null;this.events.push('result');
  }
  collide(){
    if(this.mode!=='playing')return;
    this.metrics.collisions++; if(!this.practice)this.remaining--;
    this.clearInput();this.step=null;this.mode='recovering';this.recovery=27;this.events.push('collision');
  }
  tick(){
    if(this.mode==='orderResult'){if(this.handoff>0)this.handoff--;return;}
    if(this.mode==='recovering'){
      if(--this.recovery<=0){
        this.player={...this.checkpoint};this.waiting=true;
        this.mode=this.remaining===0&&!this.practice?'retry':'playing';
        if(this.mode==='retry')this.events.push('retry');
      }return;
    }
    if(this.mode!=='playing'||this.waiting)return;
    const before=this.avatar,previous=this.time;this.time+=TICK;
    if(this.step)this.step.ticks++;
    const after=this.avatar;
    for(const v of this.traffic){
      const a=position(v,previous,this.slow),b=position(v,this.time,this.slow);
      if(Math.abs(a-b)>v.period/2)continue;
      if(swept(before,after,{x:a,y:v.lane.row},{x:b,y:v.lane.row},v.lane.length)){this.collide();return;}
    }
    if(this.step?.ticks===STEP_TICKS){
      this.player={...this.step.to};this.step=null;
      if([4,7,10,12,...(this.district.id==='barrio'?[9]:[])].includes(this.player.y))this.checkpoint={...this.player};
      if(this.player.y===2&&!this.entranceHint){this.entranceHint=true;this.events.push('entrance');}
      const queued=this.queued;this.queued=null;if(queued)this.move(queued,false);
    }
    if(this.hold&&this.time>=this.hold.next){this.move(this.hold.direction,false);if(this.hold)this.hold.next=this.time+.175;}
  }
}
