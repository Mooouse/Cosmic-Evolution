'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const catalog={window:{}};vm.runInNewContext(fs.readFileSync('music-tracks.js','utf8'),catalog);const tracks=catalog.window.SpaceMusicTracks;
assert.equal(tracks.length,12);assert.equal(new Set(tracks.map(t=>t.title)).size,12);assert.ok(tracks.every(t=>t.id!==0&&t.title!=='First Light'));
for(const [i,t] of tracks.entries()){assert.ok(fs.statSync(t.src).size>1000000);assert.ok(fs.statSync(t.cover).size>1000);assert.ok(t.duration>100);assert.ok(t.price>(tracks[i-1]?.price||0));}
const source=fs.readFileSync('game.js','utf8');const audio=[];let timer;
class Audio {constructor(src){this.src=src;this.paused=true;audio.push(this)}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true}}
const ctx={Audio,window:{SpacePlatform:{muted:false}},g:{music:true,musicVolume:.3,activeTrack:null,credits:1e8,ownedTracks:[]},setTimeout(fn){timer=fn;return 1},clearTimeout(){timer=null},initAudio(){},save(){},toast(){},MUSIC_TRACKS:tracks};vm.createContext(ctx);
vm.runInContext('let externalMusic=null,musicPreview=null,musicPreviewTimer=null,soundCtx=null,musicMaster=null;'+source.slice(source.indexOf('function setMusicVolume(){'),source.indexOf('\nfunction ',source.indexOf('function previewMusicTrack(')+20))+source.slice(source.indexOf('function startMusic(){'),source.indexOf("addEventListener('space-platform-audio'"))+source.slice(source.indexOf('function chooseTrack(track){'),source.indexOf('\nfunction showMusicShop(){')),ctx);
vm.runInContext('startMusic();previewMusicTrack(MUSIC_TRACKS[0])',ctx);assert.equal(audio.length,0,'empty collection must be silent');
vm.runInContext('chooseTrack(MUSIC_TRACKS[0])',ctx);assert.equal(ctx.g.credits,99e6);assert.ok(ctx.g.ownedTracks.includes(1));assert.equal(audio[0].paused,false);
vm.runInContext('g.music=false;setMusicVolume()',ctx);assert.equal(audio[0].paused,true);
vm.runInContext('g.music=true;setMusicVolume();previewMusicTrack(MUSIC_TRACKS[1])',ctx);assert.equal(audio.length,1,'locked preview must not create audio');assert.equal(audio[0].paused,false);assert.equal(ctx.g.credits,99e6);
vm.runInContext('previewMusicTrack(MUSIC_TRACKS[0])',ctx);assert.equal(audio[0].paused,true);assert.equal(audio[1].paused,false);
vm.runInContext('stopMusicPreview()',ctx);assert.equal(audio[1].paused,true);assert.equal(audio[0].paused,false);assert.equal(timer,null);
vm.runInContext('window.SpacePlatform.muted=true;setMusicVolume()',ctx);assert.equal(audio[0].paused,true);
assert.equal(vm.runInContext('chooseTrack(MUSIC_TRACKS[11])',ctx),false);assert.equal(ctx.g.credits,99e6);
vm.runInContext('g.activeTrack=2;startMusic()',ctx);assert.equal(ctx.g.activeTrack,null,'unowned saved selection must not play');assert.equal(audio.length,2);
const migration=source.slice(source.indexOf('// Keep stable purchased IDs'),source.indexOf('\n\nfunction chooseTrack'));
ctx.g.ownedTracks=[0,2,5,2,999];ctx.g.activeTrack=0;vm.runInContext(migration,ctx);assert.deepEqual(Array.from(ctx.g.ownedTracks),[2,5]);assert.equal(ctx.g.activeTrack,2);
assert.ok(source.includes("${owned&&available?'':'disabled'}"));
console.log('PASS: 12 paid tracks, stable save migration, silent empty collection, locked audio blocked, purchases and platform mute');
