export type Kind = 'car' | 'bicycle' | 'scooter' | 'pedestrian';
export interface Lane { row: number; kind: Kind; direction: 1 | -1; speed: number; length: number; spacing: number }
export interface Place { id: string; label: string; orderText: string; audio: string; facade: string }
export interface Route { targetId: string; seed: number; gateOrder: string[] }
export interface District { id: string; title: string; placeIds: string[]; routes: { targetId: string; seed: number }[]; lanes: Lane[] }
const labels: Record<string,string> = {
  edificio:'el edificio', supermercado:'el supermercado', parque:'el parque',
  restaurante:'el restaurante', cine:'el cine', plaza:'la plaza',
  juguetes:'la tienda de juguetes', dulces:'la tienda de dulces', hamburgueseria:'la hamburguesería',
  hospital:'el hospital', centro_comercial:'el centro comercial', pizzeria:'la pizzería'
};
export const places: Place[] = Object.entries(labels).map(([id,label])=>({id,label,
  orderText:`La entrega es en ${label}.`,audio:`audio/orders/${id}.mp3`,facade:`art/facades/${id}.webp`}));
export const placeById = Object.fromEntries(places.map(p=>[p.id,p]));
const lane = (row:number,kind:Kind,direction:1|-1,speed:number,length:number,spacing:number):Lane =>
  ({row,kind,direction,speed,length,spacing});
const base = [lane(3,'pedestrian',1,.88,.52,3.1),lane(5,'scooter',-1,1.55,.82,4),
  lane(6,'bicycle',1,1.3,1.08,4.5),lane(8,'car',1,1.82,1.42,4.3),
  lane(9,'car',-1,1.7,1.55,4.65),lane(11,'car',-1,1.1,1.28,4.25)];
export const districts: District[] = [
  ['barrio','Mi barrio',['edificio','supermercado','parque'],[3,8,11]],
  ['centro','El centro',['restaurante','cine','plaza'],[3,6,8,9,11]],
  ['tiendas','Las tiendas',['juguetes','dulces','hamburgueseria'],[3,5,6,8,9,11]],
  ['avenida','La avenida',['hospital','centro_comercial','pizzeria'],[3,5,6,8,9,11]]
].map((data,index)=> {
  const [id,title,ids,rows] = data as [string,string,string[],number[]];
  return {id,title,placeIds:ids,routes:ids.map((targetId,i)=>({targetId,seed:(index+1)*1000+i+1})),
    lanes:base.filter(l=>rows.includes(l.row)).map(l=>({...l,
      ...(id==='barrio' && l.row===8?{speed:1.1,spacing:4.9}:{}),
      ...(id==='barrio' && l.row===11?{spacing:4.9}:{}),
      ...(id==='avenida' && l.row===8?{speed:2,spacing:3.9}:{})}))};
});
export function shuffled<T>(items:readonly T[], random= Math.random): T[] {
  const result=[...items];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1)); [result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export function makeRoutes(district:District,random=Math.random):Route[] {
  return shuffled(district.routes,random).map(r=>({...r,gateOrder:shuffled(district.placeIds,random)}));
}
export function validateContent(ds=districts, ps=places): void {
  const fail=(message:string):never=>{throw new Error(message);};
  if(new Set(ps.map(p=>p.id)).size!==ps.length || new Set(ds.map(d=>d.id)).size!==ds.length) fail('Duplicate ID');
  const ids=new Set(ps.map(p=>p.id));
  for(const p of ps) if(!p.id || !p.label || !p.orderText || !p.audio || !p.facade) fail('Incomplete place');
  for(const d of ds){
    if(d.placeIds.length!==3 || new Set(d.placeIds).size!==3 || d.placeIds.some(id=>!ids.has(id))) fail('Invalid places');
    if(d.routes.length!==3 || new Set(d.routes.map(r=>r.targetId)).size!==3 || d.routes.some(r=>!d.placeIds.includes(r.targetId)||!Number.isFinite(r.seed))) fail('Invalid routes');
    if(new Set(d.lanes.map(l=>l.row)).size!==d.lanes.length) fail('Duplicate row');
    for(const l of d.lanes) if(![3,5,6,8,9,11].includes(l.row)||![1,-1].includes(l.direction)||
      !['car','bicycle','scooter','pedestrian'].includes(l.kind)||
      [l.speed,l.length,l.spacing].some(n=>!Number.isFinite(n)||n<=0)||l.spacing<=l.length||
      (d.id==='barrio'&&l.row===9)) fail('Invalid lane');
  }
}
validateContent();
