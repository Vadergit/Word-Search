(()=>{
'use strict';
const s=window.WordShapeProto;
if(!s?.canvas||typeof s.hit!=='function')return;
const canvas=s.canvas,check=document.getElementById('checkBtn');
if(!check)return;

const MAX_TAP_MOVE=12;
const DOUBLE_TAP_MS=360;
const DOUBLE_TAP_DISTANCE=42;
let press=null,lastTap=null;

function pointIsEmpty(x,y){
  try{return s.hit(x,y)===null}catch(_){return false}
}

canvas.addEventListener('pointerdown',e=>{
  if(e.button!==undefined&&e.button!==0)return;
  press={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,empty:pointIsEmpty(e.clientX,e.clientY)};
},{passive:true});

canvas.addEventListener('pointermove',e=>{
  if(!press||e.pointerId!==press.id)return;
  if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>MAX_TAP_MOVE)press.moved=true;
},{passive:true});

canvas.addEventListener('pointerup',e=>{
  if(!press||e.pointerId!==press.id)return;
  const p=press;press=null;
  if(p.moved||!p.empty||!pointIsEmpty(e.clientX,e.clientY)){lastTap=null;return}

  const now=performance.now();
  if(lastTap&&now-lastTap.time<=DOUBLE_TAP_MS&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<=DOUBLE_TAP_DISTANCE){
    lastTap=null;
    if(!check.disabled)check.click();
    return;
  }
  lastTap={time:now,x:e.clientX,y:e.clientY};
},{passive:true});

canvas.addEventListener('pointercancel',()=>{press=null;lastTap=null},{passive:true});
})();
