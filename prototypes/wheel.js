(()=>{
'use strict';

const $=id=>document.getElementById(id);
const ui={
  stage:$('wheelStage'),wheel:$('letterWheel'),path:$('pathLine'),current:$('currentWord'),targets:$('targetList'),theme:$('wordThemeName'),
  found:$('foundStat'),score:$('scoreStat'),bonus:$('bonusStat'),letters:$('letterStat'),time:$('timeStat'),rackBadge:$('rackBadge'),
  bonusList:$('bonusList'),toast:$('toast'),newBtn:$('newBtn'),shuffleBtn:$('shuffleBtn'),clearBtn:$('clearBtn'),themeBtn:$('themeBtn'),meta:$('themeColorMeta'),
  hintBtn:$('hintBtn'),checkBtn:$('checkWheelBtn'),difficulty:$('difficultySelect'),win:$('wheelWin'),winText:$('wheelWinText'),nextBtn:$('wheelNextBtn'),timeoutBar:$('wheelTimeoutBar')
};
const THEMES=Array.isArray(window.ANITAS_THEME_POOLS)?window.ANITAS_THEME_POOLS:[];
const DICT=window.ANITAS_ENGLISH_WORDS instanceof Set?window.ANITAS_ENGLISH_WORDS:new Set();
const BONUS_SCORE=30;
const VERSION='0.1.2';
const HINT_MS=5000;
const AUTO_CHECK_MS=1500;

let puzzle=null,order=[],selected=[],drawing=false,pointerId=null,found=new Set(),bonusFound=new Set(),score=0,startMs=0,finalMs=0,ticker=null,toastTimer=null,dark=false;
let pointerStart=null,dragged=false,hintTimer=null,autoCheckTimer=null;

const rnd=n=>Math.floor(Math.random()*n);
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function cleanWords(words){return [...new Set((words||[]).map(w=>String(w).toUpperCase().replace(/[^A-Z]/g,'')).filter(w=>w.length>=3&&w.length<=8))]}
function counts(word){const m=new Map();for(const ch of word)m.set(ch,(m.get(ch)||0)+1);return m}
function mergedRack(a,b){const m=new Map(a);for(const [ch,n] of b)m.set(ch,Math.max(m.get(ch)||0,n));return m}
function rackSize(m){let n=0;for(const v of m.values())n+=v;return n}
function canForm(word,rack){const need=counts(word);for(const [ch,n] of need)if((rack.get(ch)||0)<n)return false;return true}
function rackArray(rack){const out=[];for(const [ch,n] of rack)for(let i=0;i<n;i++)out.push(ch);return out}

function bestRackForTheme(theme){
  const words=cleanWords(theme.words);
  if(words.length<3)return null;
  let best=null;
  const samples=Math.min(900,Math.max(240,words.length*14));
  for(let k=0;k<samples;k++){
    const a=words[rnd(words.length)],b=words[rnd(words.length)];
    let rack=mergedRack(counts(a),counts(b));
    let size=rackSize(rack);
    if(size<5||size>8)continue;
    if(Math.random()<.55){
      const c=words[rnd(words.length)],expanded=mergedRack(rack,counts(c)),expandedSize=rackSize(expanded);
      if(expandedSize<=8){rack=expanded;size=expandedSize}
    }
    const possible=words.filter(w=>canForm(w,rack));
    if(possible.length<3)continue;
    const rank=possible.length*20-size+(possible.some(w=>w.length>=6)?4:0);
    if(!best||rank>best.rank)best={rack,possible,rank};
    if(possible.length>=7&&size>=6)return best;
  }
  return best;
}

function buildPuzzle(){
  if(!THEMES.length)throw new Error('Theme library failed to load');
  const candidates=[];
  for(const theme of shuffle(THEMES)){
    const hit=bestRackForTheme(theme);
    if(hit)candidates.push({theme,hit});
    if(candidates.length>=8)break;
  }
  if(!candidates.length)throw new Error('Could not generate wheel puzzle');
  const strong=candidates.filter(x=>x.hit.possible.length>=4);
  const pool=strong.length?strong:candidates,picked=pool[rnd(pool.length)];
  const rack=rackArray(picked.hit.rack),possible=shuffle(picked.hit.possible),targetCount=Math.min(7,Math.max(3,possible.length));
  let targets=possible.slice(0,targetCount);targets.sort((a,b)=>a.length-b.length||a.localeCompare(b));
  return{theme:picked.theme.name,rack,targets};
}

function fmt(ms){const m=Math.floor(ms/60000),s=Math.floor(ms%60000/1000),t=Math.floor(ms%1000/100);return`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${t}`}
function updateClock(){ui.time.textContent=fmt(startMs?Date.now()-startMs:finalMs)}
function startClock(){clearInterval(ticker);finalMs=0;startMs=Date.now();updateClock();ticker=setInterval(updateClock,100)}
function stopClock(){if(startMs)finalMs=Date.now()-startMs;startMs=0;clearInterval(ticker);updateClock();return finalMs}
function toast(text){ui.toast.textContent=text;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1450)}
function difficulty(){return ui.difficulty?.value||'beginner'}

function stopAutoCheck(reset=true){
  clearTimeout(autoCheckTimer);autoCheckTimer=null;
  if(ui.timeoutBar){ui.timeoutBar.style.transition='none';if(reset)ui.timeoutBar.style.width='0%'}
}
function startAutoCheck(){
  stopAutoCheck(false);
  if(!selected.length)return;
  if(ui.timeoutBar){
    ui.timeoutBar.style.transition='none';ui.timeoutBar.style.width='100%';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ui.timeoutBar.style.transition=`width ${AUTO_CHECK_MS}ms linear`;ui.timeoutBar.style.width='0%'}));
  }
  autoCheckTimer=setTimeout(()=>evaluate(true),AUTO_CHECK_MS);
}

function renderTargets(){
  ui.targets.innerHTML='';const mode=difficulty();
  for(const word of puzzle.targets){
    const row=document.createElement('div');row.className='target-row'+(found.has(word)?' found':'');row.dataset.word=word;
    [...word].forEach((ch,i)=>{const slot=document.createElement('div');slot.className='target-slot'+(mode==='beginner'&&i===0?' first':'');slot.textContent=found.has(word)||(mode==='beginner'&&i===0)?ch:'•';row.appendChild(slot)});
    const label=document.createElement('span');label.className='target-word-label';label.textContent=`${word.length} letters`;row.appendChild(label);ui.targets.appendChild(row);
  }
  if(ui.hintBtn)ui.hintBtn.hidden=mode==='hard';
}
function renderBonus(){ui.bonusList.innerHTML='';for(const word of [...bonusFound].sort()){const e=document.createElement('span');e.className='bonus-chip';e.textContent=word;ui.bonusList.appendChild(e)}}
function updateStats(){ui.found.textContent=`${found.size}/${puzzle.targets.length}`;ui.score.textContent=score;ui.bonus.textContent=bonusFound.size;ui.letters.textContent=puzzle.rack.length;ui.rackBadge.textContent=`${puzzle.rack.length} wheel letters`;if(ui.checkBtn)ui.checkBtn.disabled=selected.length<3}

function pointsForOrder(){const n=order.length,r=170,c=220;return order.map((_,i)=>{const a=-Math.PI/2+i*Math.PI*2/n;return{x:c+Math.cos(a)*r,y:c+Math.sin(a)*r}})}
function renderWheel(){
  ui.wheel.querySelectorAll('.wheel-letter').forEach(e=>e.remove());const pts=pointsForOrder();
  order.forEach((rackIndex,i)=>{const p=pts[i],b=document.createElement('button');b.type='button';b.className='wheel-letter';b.dataset.rackIndex=String(rackIndex);b.textContent=puzzle.rack[rackIndex];b.style.left=`${p.x/440*100}%`;b.style.top=`${p.y/440*100}%`;b.addEventListener('pointerdown',startPointer);ui.wheel.appendChild(b)});
  updateSelectionVisuals();
}
function pointForRackIndex(rackIndex){const pos=order.indexOf(rackIndex),pts=pointsForOrder();return pos>=0?pts[pos]:null}
function currentWord(){return selected.map(i=>puzzle.rack[i]).join('')}
function updateSelectionVisuals(){
  ui.wheel.querySelectorAll('.wheel-letter').forEach(el=>{const id=Number(el.dataset.rackIndex);el.classList.toggle('active',selected.includes(id));el.classList.toggle('used',selected.includes(id))});
  const pts=selected.map(pointForRackIndex).filter(Boolean);ui.path.setAttribute('points',pts.map(p=>`${p.x},${p.y}`).join(' '));ui.current.textContent=currentWord()||'—';updateStats();
}
function clearSelection(){stopAutoCheck();selected=[];updateSelectionVisuals()}
function addRackIndex(id){
  if(selected.length&&selected[selected.length-1]===id)return;
  if(selected.length>1&&selected[selected.length-2]===id){selected.pop();updateSelectionVisuals();selected.length?startAutoCheck():stopAutoCheck();return}
  if(selected.includes(id))return;
  selected.push(id);updateSelectionVisuals();startAutoCheck();
}
function letterAtPoint(x,y){const el=document.elementFromPoint(x,y)?.closest?.('.wheel-letter');return el?Number(el.dataset.rackIndex):null}

function startPointer(e){
  if(e.button!==undefined&&e.button!==0)return;e.preventDefault();drawing=true;dragged=false;pointerId=e.pointerId;
  pointerStart={x:e.clientX,y:e.clientY,id:Number(e.currentTarget.dataset.rackIndex)};
  try{ui.stage.setPointerCapture(e.pointerId)}catch(_){}
}
function movePointer(e){
  if(!drawing||e.pointerId!==pointerId)return;e.preventDefault();
  if(pointerStart&&!dragged&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>8){dragged=true;stopAutoCheck();selected=[];addRackIndex(pointerStart.id)}
  if(dragged){const id=letterAtPoint(e.clientX,e.clientY);if(id!==null)addRackIndex(id)}
}
function endPointer(e){
  if(!drawing||(e.pointerId!==undefined&&e.pointerId!==pointerId))return;
  drawing=false;pointerId=null;try{ui.stage.releasePointerCapture(e.pointerId)}catch(_){}
  if(dragged){if(selected.length>=3)evaluate(false);else clearSelection()}
  else if(pointerStart){addRackIndex(pointerStart.id)}
  pointerStart=null;dragged=false;
}

function showHint(){
  if(difficulty()==='hard'){toast('Hints disabled in Hard');return}
  const remaining=puzzle.targets.filter(w=>!found.has(w));if(!remaining.length)return;
  const word=remaining[rnd(remaining.length)],needed=counts(word),chosen=[];
  for(const [ch,n] of needed){let left=n;for(let i=0;i<puzzle.rack.length&&left;i++)if(puzzle.rack[i]===ch){chosen.push(i);left--}}
  clearTimeout(hintTimer);ui.wheel.querySelectorAll('.wheel-letter').forEach(el=>el.classList.toggle('hint',chosen.includes(Number(el.dataset.rackIndex))));
  const row=ui.targets.querySelector(`[data-word="${word}"]`);row?.classList.add('hint-target');toast(`Hint · ${word.length} letters`);
  hintTimer=setTimeout(()=>{ui.wheel.querySelectorAll('.wheel-letter').forEach(el=>el.classList.remove('hint'));row?.classList.remove('hint-target')},HINT_MS);
}

function completePuzzle(){
  const elapsed=stopClock();stopAutoCheck();
  if(ui.winText)ui.winText.textContent=`All ${puzzle.targets.length} target words found in ${fmt(elapsed)} · ${score} points · ${bonusFound.size} bonus word${bonusFound.size===1?'':'s'}.`;
  if(ui.win)ui.win.classList.add('show');
  else toast(`Puzzle complete · ${bonusFound.size} bonus word${bonusFound.size===1?'':'s'}`);
}
function evaluate(fromAuto=false){
  stopAutoCheck();
  const w=currentWord();
  if(w.length<3){if(fromAuto){toast('Too short');clearSelection()}else toast('Select at least 3 letters');return}
  if(puzzle.targets.includes(w)&&!found.has(w)){found.add(w);score+=w.length*120;toast(`${w} found`);renderTargets()}
  else if(puzzle.targets.includes(w)&&found.has(w))toast(`${w} already found`);
  else if(DICT.has(w)&&!bonusFound.has(w)){bonusFound.add(w);score+=BONUS_SCORE;toast(`${w} bonus +${BONUS_SCORE}`);renderBonus()}
  else if(bonusFound.has(w))toast(`${w} bonus already found`);
  else toast('Not a target word');
  clearSelection();updateStats();if(found.size===puzzle.targets.length)setTimeout(completePuzzle,260);
}

function shuffleLetters(){stopAutoCheck();order=shuffle(order);renderWheel();selected.length?startAutoCheck():stopAutoCheck();toast('Letters shuffled')}
function fresh(){
  clearTimeout(hintTimer);stopAutoCheck();ui.win?.classList.remove('show');puzzle=buildPuzzle();order=shuffle(puzzle.rack.map((_,i)=>i));selected=[];found=new Set();bonusFound=new Set();score=0;ui.theme.textContent=puzzle.theme;renderTargets();renderBonus();renderWheel();updateStats();startClock();toast(`${puzzle.theme} · ${puzzle.targets.length} target words`)
}
function applyTheme(value){dark=value==='dark';document.documentElement.dataset.theme=dark?'dark':'light';ui.themeBtn.textContent=dark?'Light mode':'Dark mode';ui.meta?.setAttribute('content',dark?'#091311':'#f3f7f4');try{localStorage.setItem('anitasPrototypeTheme',dark?'dark':'light')}catch(_){}}

ui.stage.addEventListener('pointermove',movePointer,{passive:false});ui.stage.addEventListener('pointerup',endPointer);ui.stage.addEventListener('pointercancel',endPointer);ui.stage.addEventListener('lostpointercapture',()=>{drawing=false;pointerId=null;pointerStart=null;dragged=false});
ui.clearBtn.addEventListener('click',clearSelection);ui.shuffleBtn.addEventListener('click',shuffleLetters);ui.newBtn.addEventListener('click',fresh);ui.themeBtn.addEventListener('click',()=>applyTheme(dark?'light':'dark'));ui.hintBtn?.addEventListener('click',showHint);ui.checkBtn?.addEventListener('click',()=>evaluate(false));ui.difficulty?.addEventListener('change',()=>{renderTargets();clearSelection()});ui.nextBtn?.addEventListener('click',fresh);
window.addEventListener('blur',()=>{drawing=false;pointerId=null;pointerStart=null;dragged=false;stopAutoCheck()});
let saved='light';try{saved=localStorage.getItem('anitasPrototypeTheme')||'light'}catch(_){}applyTheme(saved);fresh();
})();
