// Drawing primitives adapted from the supplied mockup. Font license: public/FONT-LICENSE.txt.
import type { Place } from '../content/catalog.js';
import type { Simulation } from '../sim/engine.js';
import { position } from '../sim/engine.js';
import {CAR_VARIANTS,CAR_SIZE,CAR_ANCHOR,CAR_BODY_LENGTH,RASTER_PATHS,type TileId} from '../content/art.js';
type SpriteLane={dir:number;length:number};
const CELL=48, WIDTH=432, HEIGHT=624, FACADE_WIDTH=144;
const INK='#292640', center=(n:number)=>n*CELL+CELL/2;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let brush:CanvasRenderingContext2D, animationTime=0;
function rect(x:number,y:number,w:number,h:number,color:string,r=0) {
  brush.beginPath();
  brush.roundRect(x,y,w,h,r);
  brush.fillStyle = color;
  brush.fill();
}
function poly(points:[number,number][],color:string) {
  brush.beginPath();
  brush.moveTo(...points[0]);
  for (const point of points.slice(1)) brush.lineTo(...point);
  brush.closePath();
  brush.fillStyle = color;
  brush.fill();
}
function line(points:[number,number][],color:string,width=2) {
  brush.beginPath();
  brush.moveTo(...points[0]);
  for (const point of points.slice(1)) brush.lineTo(...point);
  brush.strokeStyle = color;
  brush.lineWidth = width;
  brush.lineCap = "round";
  brush.lineJoin = "round";
  brush.stroke();
}
function oval(x:number,y:number,rx:number,ry:number,color:string) {
  brush.beginPath();
  brush.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  brush.fillStyle = color;
  brush.fill();
}
const C = {
  ink:"#252b43", cream:"#faf0d4", stone:"#e6d6b8", shade:"#b7aa94",
  road:"#403b57", cycle:"#476f69", green:"#466c57", leaf:"#72996e",
  gold:"#f2c474", red:"#bb4f40", coral:"#de7657", violet:"#6154a0",
  blue:"#51759a", water:"#4e9d9d"
};

function shape(d:string,fill:string|null,stroke:string|null=null,w=1.4) {
  const p=new Path2D(d);
  if(fill){brush.fillStyle=fill;brush.fill(p);}
  if(stroke){brush.strokeStyle=stroke;brush.lineWidth=w;brush.lineJoin="round";brush.lineCap="round";brush.stroke(p);}
}

function road(row:number,color:string) {
  const y=row*CELL;
  rect(0,y,WIDTH,CELL,color);
  for(let i=0;i<38;i++){
    const x=(i*47+row*17)%WIDTH;
    rect(x,y+5+(i*13)%39,i%3===0?2:1,1,"#f2e1c51e");
  }
}
function sidewalk(row:number,shade:string) {
  const y=row*CELL;
  rect(0,y,WIDTH,CELL,shade);
  for(let x=-10;x<WIDTH;x+=26){
    line([[x,y+6],[x+10,y+6]],"#98765535",.85);
    line([[x+9,y+37],[x+14,y+37]],"#98765535",.85);
  }
}
function planter(x:number,y:number,flip:number) {
  brush.save();
  brush.translate(x,y);
  brush.scale(flip,1);
  oval(1,4,11,5,"#7156612a");
  shape("M -10 0 Q -10 -6 -5 -7 Q -1 -10 2 -6 Q 8 -7 10 -2 Q 9 4 4 5 Q -4 5 -10 0 Z","#498573");
  shape("M -7 -2 Q -2 -8 3 -3 Q 0 2 -6 0 Z","#a4aa51");
  line([[-5,1],[2,-2],[6,-2]],"#2e5b52",.9);
  brush.restore();
}
function island(row:number,shade:string) {
  const y=row*CELL;
  sidewalk(row,shade);
  rect(0,y,WIDTH,2,"#f8eccd");
  rect(0,y+CELL-2,WIDTH,2,"#99775c77");
  for(const [x,dir] of [[13,1],[107,-1],[318,1],[417,-1]]) planter(x,y+12,dir);
}
function gate(column:number) {
  const x=center(column),y=center(2);
  shape(`M ${x-15} ${y+4} l 3 -12 h 23 l 4 12 l -5 4 h -22 Z`,"#c3a27b");
  shape(`M ${x-15} ${y+2} l 3 -12 h 23 l 4 12 l -5 4 h -22 Z`,"#e7c36e",C.ink,1.1);
  line([[x-4,y],[x,y-4],[x+4,y]],C.ink,1.5);
}
function car(x:number,y:number,lane:SpriteLane,index:number) {
  const image=rasterImages.get(`art/sprites/${CAR_VARIANTS[index%CAR_VARIANTS.length]}.png`);
  if(!image?.complete||!image.naturalWidth)return;
  brush.save();
  brush.translate(x,y);
  brush.scale(lane.dir*lane.length/CAR_BODY_LENGTH,1);
  brush.drawImage(image,-CAR_ANCHOR[0],-CAR_ANCHOR[1],CAR_SIZE[0],CAR_SIZE[1]);
  brush.restore();
}
function bike(x:number,y:number,lane:SpriteLane,color:string) {
  brush.save();
  brush.translate(x,y);
  brush.scale(lane.dir,1);
  oval(1,6,23,8,"#22223764");
  for(const cx of [-17,17]) {
    oval(cx,2,8.5,5,INK);
    oval(cx,2,5.8,2.6,"#a4b3bc");
  }
  line([[-17,2],[-3,-6],[6,2],[-17,2],[17,2],[13,-6]],"#e4dfc4",2);
  rect(-9,-9,17,13,INK,5);
  rect(-8,-8,16,11,color,5);
  oval(9,-6,5.5,5,"#f0c3a1");
  brush.restore();
}
function pedestrian(x:number,y:number,lane:SpriteLane,color:string) {
  brush.save();
  brush.translate(x,y);
  brush.scale(lane.dir,1);
  oval(3,5,14,8,"#715d6550");
  const swing=Math.sin(animationTime*12+x*.15)*3;
  rect(-13+swing,-9,8,4,INK,1.5);
  rect(-13-swing,5,8,4,INK,1.5);
  oval(-4,0,9,9,INK);
  oval(-4,0,8,7,color);
  oval(6,0,6,5.5,"#bb7965");
  oval(8,-1,4,4,"#eec09b");
  brush.restore();
}
function courier(x:number,y:number,lift:number) {
  oval(x+2,y+9,17,9,"#302a4d65");
  brush.save();
  brush.translate(x,y-lift);
  rect(-12,7,7,8,INK,2);
  rect(5,7,7,8,INK,2);
  rect(-15,-8,30,20,INK,6);
  rect(-14,-7,28,17,"#6260b1",5);
  oval(0,-11,10,8,INK);
  oval(0,-12,8.5,6,"#f2d775");
  line([[-5,-13],[1,-15],[5,-13]],"#fff7c7",1.7);
  rect(-10,-4,20,15,"#542e52",3);
  rect(-9,-3,18,12,"#e38368",2.7);
  line([[-5,3],[3,3],[0,6],[5,6]],"#ffedc4",1.5);
  brush.restore();
}

// Every image uses a 3 × 2-cell footprint; the simulation always uses cell units.
const facadeImages=new Map<string,HTMLImageElement>();
const rasterImages=new Map<string,HTMLImageElement>();
export function preloadFacades(places:Place[]){
  for(const p of places){const image=new Image();image.src=p.facade;facadeImages.set(p.id,image);}
  for(const path of RASTER_PATHS){const image=new Image();image.src=path;rasterImages.set(path,image);}
}
function drawTile(id:TileId,x:number,y:number,width=WIDTH,height=CELL):boolean {
  const image=rasterImages.get(`art/tiles/${id}.png`);
  if(!image?.complete||!image.naturalWidth)return false;
  brush.drawImage(image,x,y,width,height);return true;
}
function drawGround(sim:Simulation){
  const rows:Partial<Record<number,TileId>>={2:'sidewalk_gate',3:'sidewalk_people',4:'island_4',7:'island_7',10:'island_10',12:'sidewalk_start'};
  if(sim.district.id==='barrio')rows[9]='island_10';
  for(const lane of sim.district.lanes){
    rows[lane.row]=lane.kind==='car'?
      (lane.row===8&&sim.district.lanes.some(l=>l.row===9)?'avenue_first':lane.row===9?'avenue_second':'street'):
      lane.kind==='bicycle'?'cycleway':lane.kind==='scooter'?'scooterway':'sidewalk_people';
  }
  for(let row=2;row<=12;row++){
    sidewalk(row,row===3?'#e3c8b5':'#ede0c2');
    drawTile(rows[row]||'sidewalk_plain',0,row*CELL);
  }
}
function scooter(x:number,y:number,lane:SpriteLane,color:string){
  brush.save();brush.translate(x,y);brush.scale(lane.dir,1);
  oval(1,7,20,6,'#22223755');
  line([[-15,7],[15,7],[12,-9]],'#e8d5ac',3);
  line([[8,-9],[17,-9]],INK,2);
  oval(-14,8,4,3,INK);oval(15,8,4,3,INK);
  rect(-9,-7,16,11,color,4);oval(7,-7,5,5,'#edc09b');
  brush.restore();
}
function recipient(x:number,y:number,active=false){
  oval(x,y+8,7,3,'#65536333');rect(x-4,y-2,8,10,active?'#72996e':'#988b9b',3);
  oval(x,y-5,4,4,'#edc09b');
}
export class Renderer {
  canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;
  constructor(canvas:HTMLCanvasElement){this.canvas=canvas;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D no disponible');this.ctx=ctx;}
  draw(sim:Simulation){
    const canvas=this.canvas,ctx=this.ctx;
    const scale=Math.min(3,(devicePixelRatio||1)*Math.max(1,canvas.clientWidth/WIDTH));
    const w=Math.round(WIDTH*scale),h=Math.round(HEIGHT*scale);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    ctx.setTransform(w/WIDTH,0,0,h/HEIGHT,0,0);brush=ctx;animationTime=sim.time;
    drawGround(sim);
    rect(0,0,WIDTH,96,'#f8e6c8');
    sim.route.gateOrder.forEach((id,index)=>{
      const image=facadeImages.get(id);
      if(image?.complete&&image.naturalWidth)ctx.drawImage(image,index*FACADE_WIDTH,0,FACADE_WIDTH,96);
      const active=sim.metrics.outcome==='delivered'&&id===sim.route.targetId;
      recipient(center([1,4,7][index])+22,92,active);
    });
    for(const column of [1,4,7])if(!drawTile('gate',center(column)-24,center(2)-24,48,48))gate(column);
    drawTile('start',center(4)-30,center(12)-24,60,48);
    for(const v of sim.traffic){
      const x=center(position(v,sim.time,sim.slow)),y=center(v.lane.row);
      if(x<-100||x>WIDTH+100)continue;
      const lane={dir:v.lane.direction,length:v.lane.length*CELL};
      if(v.lane.kind==='car'){car(x,y,lane,v.index+v.lane.row*2);continue;}
      const sprite={bicycle:bike,pedestrian,scooter}[v.lane.kind];
      const palette={bicycle:['#deb96d','#a5cabb'],scooter:['#bca5cb','#deb96d'],pedestrian:['#9a7eb4','#c78473','#70957d']}[v.lane.kind];
      ctx.save();ctx.translate(x,y);
      // Primitives are scaled to each obstacle's logical footprint.
      if(v.lane.kind==='bicycle')ctx.scale(v.lane.length*CELL/52,1);
      if(v.lane.kind==='scooter')ctx.scale(v.lane.length*CELL/40,1);
      if(v.lane.kind==='pedestrian')ctx.scale(v.lane.length*CELL/28,1);
      sprite(0,0,lane,palette[v.index%palette.length]);ctx.restore();
    }
    const p=sim.avatar,x=center(p.x),y=center(p.y);
    if(sim.mode==='recovering'){
      ctx.save();ctx.translate(x,y);ctx.rotate(-.25);rect(-11,-5,22,10,'#e38368',3);line([[-8,-3],[0,2],[7,-2]],INK,1.5);ctx.restore();
    }else{
      const lift=sim.step&&!reduced.matches?5*Math.sin(Math.PI*sim.step.ticks/10):0;
      courier(x,y,lift);
      if(sim.handoff>0){const progress=1-sim.handoff/36;rect(x+progress*22-7,y-8-progress*30,14,12,'#e38368',3);}
    }
  }
}
