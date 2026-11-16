export interface Settings { mode:'classic'|'practice';slowTraffic:boolean;audioEnabled:boolean;musicEnabled:boolean;showTextByDefault:boolean }
export interface Saved { settings:Settings;completedDistrictIds:string[];lastDistrictId:string }
export const KEY='reparto-en-marcha:v1';
const ids=['barrio','centro','tiendas','avenida'];
export function defaults():Saved {return {settings:{mode:'classic',slowTraffic:false,audioEnabled:true,musicEnabled:true,showTextByDefault:false},completedDistrictIds:[],lastDistrictId:'barrio'};}
export function load(storage:Pick<Storage,'getItem'>):Saved {
  const state=defaults();try{
    const raw=JSON.parse(storage.getItem(KEY)||'null');if(!raw||typeof raw!=='object')return state;
    if(raw.settings?.mode==='practice')state.settings.mode='practice';
    for(const k of ['slowTraffic','audioEnabled','musicEnabled','showTextByDefault'] as const)if(typeof raw.settings?.[k]==='boolean')state.settings[k]=raw.settings[k];
    if(Array.isArray(raw.completedDistrictIds))state.completedDistrictIds=[...new Set<string>(raw.completedDistrictIds.filter((id:unknown)=>typeof id==='string'&&ids.includes(id)))];
    if(ids.includes(raw.lastDistrictId))state.lastDistrictId=raw.lastDistrictId;
  }catch{/* Restricted or corrupt storage uses memory defaults. */}return state;
}
export function save(storage:Pick<Storage,'setItem'>,data:Saved):void {try{storage.setItem(KEY,JSON.stringify(data));}catch{/* Play remains available. */}}
