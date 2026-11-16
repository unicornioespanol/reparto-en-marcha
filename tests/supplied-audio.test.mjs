import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {places} from '../dist/content/catalog.js';
import {MUSIC_PATH} from '../dist/audio/music.js';
import {load} from '../dist/storage/store.js';
test('build packages all supplied voice and music files unchanged',async()=>{
  const files=[...places.map(p=>[`src/audio/orders/${p.id}.mp3`,p.audio]),
    ['src/audio/Reparto en marcha (Gameplay Loop).mp3',MUSIC_PATH]];
  const hash=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
  for(const [source,target] of files){
    assert.equal(await hash(source),await hash(`public/${target}`),target);
    assert.equal(await hash(source),await hash(`dist/${target}`),target);
  }
});
test('existing saves gain music preference without changing voice or progress',()=>{
  const old=load({getItem:()=>JSON.stringify({settings:{audioEnabled:false},completedDistrictIds:['centro'],lastDistrictId:'centro'})});
  assert.equal(old.settings.musicEnabled,true);assert.equal(old.settings.audioEnabled,false);assert.deepEqual(old.completedDistrictIds,['centro']);
  const current=load({getItem:()=>JSON.stringify({...old,settings:{...old.settings,musicEnabled:false}})});
  assert.equal(current.settings.musicEnabled,false);assert.equal(current.settings.audioEnabled,false);
});
