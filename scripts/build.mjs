import {cp,mkdir,writeFile,stat,rm} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {districts,places,validateContent} from '../dist/content/catalog.js';
import {RASTER_PATHS} from '../dist/content/art.js';
import {MUSIC_PATH} from '../dist/audio/music.js';
validateContent();
const musicSource='src/audio/Reparto en marcha (Gameplay Loop).mp3';
for(const file of [...places.map(p=>`src/audio/orders/${p.id}.mp3`),musicSource]){
  const info=await stat(file).catch(()=>null);
  if(!info?.isFile()||info.size<100)throw new Error(`Missing supplied audio: ${file}`);
}
await mkdir('public/audio/orders',{recursive:true});
await mkdir('public/audio/music',{recursive:true});
for(const p of places)await cp(`src/audio/orders/${p.id}.mp3`,`public/${p.audio}`);
await cp(musicSource,`public/${MUSIC_PATH}`);
for(const file of [...places.flatMap(p=>[p.audio,p.facade]),...RASTER_PATHS,MUSIC_PATH]){
  const info=await stat(`public/${file}`).catch(()=>null);
  if(!info?.isFile()||info.size<100)throw new Error(`Missing or empty asset: ${file}`);
}
await mkdir('dist',{recursive:true});
// Remove only generated artwork so deleted source assets cannot remain in a release.
const output=resolve('dist'),artwork=resolve(output,'art');
if(!output.startsWith(resolve('.')+sep)||!artwork.startsWith(output+sep))throw new Error('Invalid output directory');
await rm(artwork,{recursive:true,force:true});
await cp('public','dist',{recursive:true});
await writeFile('dist/content/catalog.json',JSON.stringify({schemaVersion:4,places,districts},null,2));
console.log('Built dist/: 4 districts, 12 supplied voice recordings and gameplay music; content and asset references valid.');
