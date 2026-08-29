(()=>{
'use strict';

const $=id=>document.getElementById(id);
const ui={
  stage:$('wheelStage'),wheel:$('letterWheel'),path:$('pathLine'),current:$('currentWord'),targets:$('targetList'),theme:$('wordThemeName'),
  found:$('foundStat'),score:$('scoreStat'),bonus:$('bonusStat'),letters:$('letterStat'),time:$('timeStat'),rackBadge:$('rackBadge'),
  bonusList:$('bonusList'),toast:$('toast'),newBtn:$('newBtn'),shuffleBtn:$('shuffleBtn'),clearBtn:$('clearBtn'),themeBtn:$('themeBtn'),meta:$('themeColorMeta')
};
const THEMES=Array.isArray(window.ANITAS_THEME_POOLS)?window.ANITAS_THEME_POOLS:[];
const DICT=window.ANITAS_ENGLISH_WORDS instanceof Set?window.ANITAS_ENGLISH_WORDS:new Set();
const BONUS_SCORE=30;
const VERSION='0.1.0';

let puzzle=null,order=[],selected=[],drawing=false,pointerId=null,found=new Set(),bonusFound=new Set(),score=0,startMs=0,ticker=null,toastTimer=null,dark=false;

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
    const score=possible.length*20-size+(possible.some(w=>w.length>=6)?4:0);
    if(!best||score>best.score)best={rack,possible,score};
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
  const picked=(strong.length?strong:candidates)[rnd((strong.length?strong:candidates).length)];
  const rack=rackArray(picked.hit.rack);
  const possible=shuffle(picked.hit.possible);
  const targetCount=Math.min(7,Math.max(3,possible.length));
  let targets=possible.slice(0,targetCount);
  targets.sort((a,b)=>a.length-b.length||a.localeCompare(b));
  return{theme:picked.theme.name,rack,targets};
}

function fmt(ms){const m=Math.floor(ms/60000),s=Math.floor(ms%60000/1000),t=Math.floor(ms%1000/100);return`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${t}`}
function updateClock(){ui.time.textContent=fmt(startMs?Date.now()-startMs:0)}
function startClock(){clearInterval(ticker);startMs=Date.now();updateClock();ticker=setInterval(updateClock,100)}
function toast(text){ui.toast.textContent=text;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1450)}

function renderTargets(){
  ui.targets.innerHTML='';
  for(const word of puzzle.targets){
    const row=document.createElement('div');row.className='target-row'+(found.has(word)?' found':'');
    [...word].forEach((ch,i)=>{const slot=document.createElement('div');slot.className='target-slot'+(i===0?' first':'');slot.textContent=found.has(word)||i===0?ch:'•';row.appendChild(slot)});
    const label=document.createElement('span');label.className='target-word-label';label.textContent=`${word.length} letters`;row.appendChild(label);ui.targets.appendChild(row);
  }
}
function renderBonus(){ui.bonusList.innerHTML='';for(const word of [...bonusFound].sort()){const e=document.createElement('span');e.className='bonus-chip';e.textContent=word;ui.bonusList.appendChild(e)}}
function updateStats(){ui.found.textContent=`${found.size}/${puzzle.targets.length}`;ui.score.textContent=score;ui.bonus.textContent=bonusFound.size;ui.letters.textContent=puzzle.rack.length;ui.rackBadge.textContent=`${puzzle.rack.length} wheel letters`}

function pointsForOrder(){
  const n=order.length,r=170,c=220;
  return order.map((_,i)=>{const a=-Math.PI/2+i*Math.PI*2/n;return{x:c+Math.cos(a)*r,y:c+Math.sin(a)*r}})
}
function renderWheel(){
  ui.wheel.querySelectorAll('.wheel-letter').forEach(e=>e.remove());
  const pts=pointsForOrder();
  order.forEach((rackIndex,i)=>{
    const p=pts[i],b=document.createElement('button');b.type='button';b.className='wheel-letter';b.dataset.rackIndex=String(rackIndex);b.textContent=puzzle.rack[rackIndex];b.style.left=`${p.x/440*100}%`;b.style.top=`${p.y/440*100}%`;b.addEventListener('pointerdown',startDraw);ui.wheel.appendChild(b);
  });
  updateSelectionVisuals();
}
function pointForRackIndex(rackIndex){const pos=order.indexOf(rackIndex),pts=pointsForOrder();return pos>=0?pts[pos]:null}
function currentWord(){return selected.map(i=>puzzle.rack[i]).join('')}
function updateSelectionVisuals(){
  ui.wheel.querySelectorAll('.wheel-letter').forEach(el=>{const id=Number(el.dataset.rackIndex);el.classList.toggle('active',selected.includes(id));el.classList.toggle('used',selected.includes(id))});
  const pts=selected.map(pointForRackIndex).filter(Boolean);ui.path.setAttribute('points',pts.map(p=>`${p.x},${p.y}`).join(' '));ui.current.textContent=currentWord()||'—';
}
function clearSelection(){selected=[];updateSelectionVisuals()}
function addRackIndex(id){
  if(selected.length&&selected[selected.length-1]===id)return;
  if(selected.length>1&&selected[selected.length-2]===id){selected.pop();updateSelectionVisuals();return}
  if(selected.includes(id))return;
  selected.push(id);updateSelectionVisuals();
}
function letterAtPoint(x,y){const el=document.elementFromPoint(x,y)?.closest?.('.wheel-letter');return el?Number(el.dataset.rackIndex):null}
function startDraw(e){if(e.button!==undefined&&e.button!==0)return;e.preventDefault();drawing=true;pointerId=e.pointerId;selected=[];addRackIndex(Number(e.currentTarget.dataset.rackIndex));try{ui.stage.setPointerCapture(e.pointerId)}catch(_){}}
function moveDraw(e){if(!drawing||e.pointerId!==pointerId)return;e.preventDefault();const id=letterAtPoint(e.clientX,e.clientY);if(id!==null)addRackIndex(id)}
function endDraw(e){if(!drawing||(e.pointerId!==undefined&&e.pointerId!==pointerId))return;drawing=false;pointerId=null;try{ui.stage.releasePointerCapture(e.pointerId)}catch(_){}if(selected.length>=3)evaluate();else clearSelection()}

function evaluate(){
  const w=currentWord();
  if(puzzle.targets.includes(w)&&!found.has(w)){
    found.add(w);score+=w.length*120;toast(`${w} found`);renderTargets();
  }else if(puzzle.targets.includes(w)&&found.has(w)){
    toast(`${w} already found`);
  }else if(w.length>=3&&DICT.has(w)&&!bonusFound.has(w)){
    bonusFound.add(w);score+=BONUS_SCORE;toast(`${w} bonus +${BONUS_SCORE}`);renderBonus();
  }else if(bonusFound.has(w)){
    toast(`${w} bonus already found`);
  }else{
    toast('Not a target word');
  }
  clearSelection();updateStats();
  if(found.size===puzzle.targets.length)setTimeout(()=>toast(`Puzzle complete · ${bonusFound.size} bonus word${bonusFound.size===1?'':'s'}`),220);
}

function shuffleLetters(){order=shuffle(order);renderWheel();toast('Letters shuffled')}
function fresh(){
  puzzle=buildPuzzle();order=shuffle(puzzle.rack.map((_,i)=>i));selected=[];found=new Set();bonusFound=new Set();score=0;ui.theme.textContent=puzzle.theme;renderTargets();renderBonus();renderWheel();updateStats();startClock();toast(`${puzzle.theme} · ${puzzle.targets.length} target words`);
}
function applyTheme(value){dark=value==='dark';document.documentElement.dataset.theme=dark?'dark':'light';ui.themeBtn.textContent=dark?'Light mode':'Dark mode';ui.meta?.setAttribute('content',dark?'#091311':'#f3f7f4');try{localStorage.setItem('anitasPrototypeTheme',dark?'dark':'light')}catch(_){}}

ui.stage.addEventListener('pointermove',moveDraw,{passive:false});ui.stage.addEventListener('pointerup',endDraw);ui.stage.addEventListener('pointercancel',endDraw);ui.stage.addEventListener('lostpointercapture',()=>{drawing=false;pointerId=null});
ui.clearBtn.addEventListener('click',clearSelection);ui.shuffleBtn.addEventListener('click',shuffleLetters);ui.newBtn.addEventListener('click',fresh);ui.themeBtn.addEventListener('click',()=>applyTheme(dark?'light':'dark'));
window.addEventListener('blur',()=>{drawing=false;pointerId=null;clearSelection()});
let saved='light';try{saved=localStorage.getItem('anitasPrototypeTheme')||'light'}catch(_){}applyTheme(saved);fresh();
})();
