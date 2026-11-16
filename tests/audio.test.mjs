import test from 'node:test';
import assert from 'node:assert/strict';
import {OrderAudio} from '../dist/audio/orders.js';
import {GameplayMusic} from '../dist/audio/music.js';
class FakeAudio extends EventTarget {
  static instances=[];currentTime=0;paused=true;src;preload='';
  constructor(src){super();this.src=src;FakeAudio.instances.push(this);}
  play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}load(){}
}
globalThis.Audio=FakeAudio;
test('audio cancel ignores callbacks from old order and does not overlap playback',()=>{
  FakeAudio.instances=[];const audio=new OrderAudio();let first=0,second=0;
  audio.play('first.mp3',true,()=>first++,()=>first++);const a=FakeAudio.instances.at(-1);
  audio.play('second.mp3',true,()=>second++,()=>second++);const b=FakeAudio.instances.at(-1);
  assert(a.paused);assert(!b.paused);a.dispatchEvent(new Event('ended'));assert.equal(first,0);
  b.dispatchEvent(new Event('ended'));assert.equal(second,1);audio.stop();
});
test('audio failure and mute provide fallback exactly once; preload retains only current district',()=>{
  FakeAudio.instances=[];const audio=new OrderAudio();let fallback=0,end=0;
  audio.preload(['one','two','three']);assert.equal(FakeAudio.instances.length,3);
  audio.play('one',true,()=>fallback++,()=>end++);const a=FakeAudio.instances[0];
  a.dispatchEvent(new Event('error'));a.dispatchEvent(new Event('ended'));assert.equal(fallback,1);assert.equal(end,1);
  audio.play('two',false,()=>fallback++,()=>end++);assert.equal(fallback,2);assert.equal(end,2);
  audio.preload(['three','four','five']);assert.equal(FakeAudio.instances.length,5);assert.equal(a.src,'');audio.stop();
});
test('soundtrack waits for gesture, ducks fivefold under speech and preserves position on manual mute',async()=>{
  const music=new GameplayMusic(),track=music.element;
  music.update(true,true);assert(track.paused);music.unlock();await Promise.resolve();
  assert.equal(track.loop,true);assert.equal(track.volume,.04);assert.equal(track.muted,false);assert(!track.paused);
  track.currentTime=12;music.update(true,false);assert.equal(track.volume,.2);assert.equal(track.currentTime,12);assert(!track.paused);
  track.currentTime=18;music.update(false,false);assert(track.paused);assert.equal(track.currentTime,18);
  music.retry();music.update(true,false);await Promise.resolve();assert(!track.paused);assert.equal(track.currentTime,18);
  music.update(false,false);assert(track.paused);
});
test('music failure does not retry every frame and can recover on explicit retry',async()=>{
  let changes=0,plays=0;const music=new GameplayMusic(()=>changes++),track=music.element;
  track.play=()=>{plays++;return Promise.reject(new Error('blocked'));};music.unlock();music.update(true,false);
  await new Promise(resolve=>setImmediate(resolve));assert(music.unavailable);assert(track.paused);assert.equal(changes,1);
  for(let i=0;i<60;i++)music.update(true,false);assert.equal(plays,1);
  track.play=()=>{plays++;track.paused=false;return Promise.resolve();};music.retry();
  await new Promise(resolve=>setImmediate(resolve));assert(!music.unavailable);assert(!track.paused);assert.equal(plays,2);
  track.dispatchEvent(new Event('error'));assert(music.unavailable);assert(track.paused);
});
test('a rejected old music play request cannot stop playback after a rapid manual mute and unmute',async()=>{
  const music=new GameplayMusic(),pending=[];const track=music.element;
  track.play=()=>{track.paused=false;return new Promise((resolve,reject)=>pending.push({resolve,reject}));};
  music.unlock();music.update(true,false);music.update(false,false);music.update(true,false);
  assert.equal(pending.length,2);pending[0].reject(Error('interrupted'));pending[1].resolve();
  await new Promise(resolve=>setImmediate(resolve));assert(!track.paused);assert(!music.unavailable);
});
