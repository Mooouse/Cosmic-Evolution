'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const catalog={window:{}};vm.runInNewContext(fs.readFileSync('music-tracks.js','utf8'),catalog);const tracks=catalog.window.SpaceMusicTracks;
assert.equal(tracks.length,13);assert.equal(new Set(tracks.map(t=>t.title)).size,13);assert.equal(tracks[0].price,0);
for(const t of tracks.slice(1)){assert.ok(fs.statSync(t.src).size>1000000);assert.ok(fs.statSync(t.cover).size>1000);assert.ok(t.duration>100);assert.ok(t.price>tracks[t.id-1].price);}
const source=fs.readFileSync('game.js','utf8');const audio=[];let timer;
class Audio {constructor(src){this.src=src;this.paused=true;audio.push(this)}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true}}
const ctx={Audio,window:{SpacePlatform:{muted:false}},g:{music:true,musicVolume:.3,activeTrack:0,credits:1e8,ownedTracks:[0]},setTimeout(fn){timer=fn;return 1},clearTimeout(){timer=null},initAudio(){},save(){},toast(){},MUSIC_TRACKS:tracks};vm.createContext(ctx);
vm.runInContext('let externalMusic=null,musicPreview=null,musicPreviewTimer=null,soundCtx=null,musicMaster=null;'+source.slice(source.indexOf('function setMusicVolume(){'),source.indexOf('\nfunction ',source.indexOf('function previewMusicTrack(')+20))+source.slice(source.indexOf('function startMusic(){'),source.indexOf("addEventListener('space-platform-audio'"))+source.slice(source.indexOf('function chooseTrack(track){'),source.indexOf('\nfunction showMusicShop(){')),ctx);
vm.runInContext('chooseTrack(MUSIC_TRACKS[1])',ctx);assert.equal(ctx.g.credits,99e6);assert.ok(ctx.g.ownedTracks.includes(1));assert.equal(audio[0].paused,false);
vm.runInContext('g.music=false;setMusicVolume()',ctx);assert.equal(audio[0].paused,true);
vm.runInContext('g.music=true;setMusicVolume();previewMusicTrack(MUSIC_TRACKS[2])',ctx);assert.equal(audio[0].paused,true);assert.equal(audio[1].paused,false);assert.equal(ctx.g.credits,99e6);
vm.runInContext('stopMusicPreview()',ctx);assert.equal(audio[1].paused,true);assert.equal(audio[0].paused,false);assert.equal(timer,null);
vm.runInContext('window.SpacePlatform.muted=true;setMusicVolume()',ctx);assert.equal(audio[0].paused,true);
assert.equal(vm.runInContext('chooseTrack(MUSIC_TRACKS[12])',ctx),false);assert.equal(ctx.g.credits,99e6);
console.log('PASS: 12 supplied tracks and covers, unique titles, prices, purchases, pause/resume, isolated previews and platform mute');
