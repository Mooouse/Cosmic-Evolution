'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const game=fs.readFileSync('game.js','utf8');
const helper=game.indexOf('function rewardControlAction(');
const start=helper<0?game.indexOf('let rewardsClickRescueInstalled=false;'):helper;
const end=game.indexOf('function rewardsShell(',start);
assert.ok(start>0&&end>start);
const calls=[],buttons=new Map();
let listener;
const modal={
 dataset:{screen:'daily',dailyOrigin:'play'},
 classList:{contains(){return false;}},
 contains(b){return [...buttons.values()].includes(b);},
 querySelector(selector){return buttons.get(selector)||null;}
};
function button(selector,id,rect={left:10,top:10,right:110,bottom:50,width:100,height:40}){
 const b={id,dataset:{},disabled:false,hidden:false,
  getBoundingClientRect(){return rect;},
  closest(){return this;}
 };
 buttons.set(selector,b);return b;
}
const context={
 document:{addEventListener(type,fn){assert.equal(type,'click');listener=fn;}},
 $:()=>modal,getComputedStyle:()=>({visibility:'visible',display:'block',pointerEvents:'auto'}),
 showCosmicRoulette:from=>calls.push(['roulette',from]),
 showDailyRewards:from=>calls.push(['daily',from]),
 dailyReturn:()=>calls.push(['back',modal.dataset.dailyOrigin]),
 console
};
vm.createContext(context);
vm.runInContext(game.slice(start,end),context);
function click(target,extra={}){
 let stopped=0,prevented=0;
 listener({target,button:0,isTrusted:true,detail:1,clientX:20,clientY:20,
  preventDefault(){prevented++;},stopImmediatePropagation(){stopped++;},...extra});
 return {stopped,prevented};
}
// Buttons reconstructed from markup have no onclick properties. Navigation
// must survive their replacement, after a spin or a daily-page refresh.
const roulette=button('#rewards-tab-roulette','rewards-tab-roulette');
assert.deepEqual(click(roulette),{stopped:1,prevented:1});
assert.deepEqual(calls.pop(),['roulette','play']);
const daily=button('#rewards-tab-daily','rewards-tab-daily');
// Even if rectangles overlap during a CSS transition, the actual clicked
// roulette button wins; the active Daily tab must not consume its click.
assert.deepEqual(click(roulette),{stopped:1,prevented:1});
assert.deepEqual(calls.pop(),['roulette','play']);
// Keyboard / synthetic activation has no useful screen coordinates.
click(roulette,{isTrusted:false,detail:0,clientX:0,clientY:0});
assert.deepEqual(calls.pop(),['roulette','play']);
modal.dataset.screen='roulette';click(daily);
assert.deepEqual(calls.pop(),['daily','play']);
const back=button('#daily-back','daily-back');
click(back);assert.deepEqual(calls.pop(),['back','play']);
// A screen left under the cursor must not determine the next screen's origin.
modal.dataset.screen='menu';
buttons.clear();
const entry=button('#screen-menu [data-reward-page="roulette"]','');
entry.dataset.rewardPage='roulette';
click(entry);assert.deepEqual(calls.pop(),['roulette','menu']);
const other=button('#other','other');
assert.deepEqual(click(other),{stopped:0,prevented:0});
assert.equal(calls.length,0,'Unrelated buttons must not be rerouted by coordinates');
// Retain recovery for a non-button decorative layer stealing physical hits.
click({closest(){return null;}});
assert.deepEqual(calls.pop(),['roulette','menu']);
entry.disabled=true;
assert.deepEqual(click(entry),{stopped:0,prevented:0});
assert.equal(calls.length,0);
entry.disabled=false;
// Economic buttons dispatch once and keep their own availability checks.
modal.dataset.screen='roulette';buttons.clear();
const spin=button('#daily-spin','daily-spin');
spin.onclick=()=>calls.push(['spin']);
assert.deepEqual(click(spin),{stopped:1,prevented:1});
assert.deepEqual(calls.pop(),['spin']);
assert.equal(calls.length,0);
console.log('PASS: persistent reward navigation, native click targets, keyboard, origin and single economic dispatch');
