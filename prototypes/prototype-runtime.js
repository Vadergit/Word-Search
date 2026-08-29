(()=>{
'use strict';const s=window.WordShapeProto,ui=s.ui;
/* Stable Hamiltonian path for the 42-node geodesic Orb graph. Every
   consecutive pair is a real edge and every node occurs exactly once. */
const ORB_COVER=[3,36,38,40,32,34,4,33,9,41,8,39,6,37,2,35,27,26,29,28,31,30,23,1,17,7,19,10,21,20,18,16,0,12,11,24,13,14,15,5,25,22];
const ORB_FALLBACK=['ORBIT','ROUND','GLOBE','SPHERE','WORLD','CURVE','ORB','AXIS','RING'];
const BONUS_SCORE=30;
const ENGLISH_WORDS=window.ANITAS_ENGLISH_WORDS instanceof Set?window.ANITAS_ENGLISH_WORDS:new Set();
let activeOrbTheme='Orb Classics';
let foundBonus=new Set();
function samePath(a,b){if(!a||!b||a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true}
function route(len,blocked=new Set()){for(const start of s.shuffle(s.nodes.map(n=>n.id).filter(id=>!blocked.has(id))).slice(0,40)){const p=[start],seen=new Set([start]);const dfs=()=>{if(p.length===len)return true;for(const id of s.shuffle([...s.adj.get(p.at(-1))].filter(id=>!seen.has(id)&&!blocked.has(id)))){seen.add(id);p.push(id);if(dfs())return true;p.pop();seen.delete(id)}return false};if(dfs())return p}return null}
function buildDisjointPaths(){for(let attempt=0;attempt<160;attempt++){const paths=new Map(),blocked=new Set();let ok=true;const words=[...s.cfg.words].sort((a,b)=>b.length-a.length);for(const word of words){const p=route(word.length,blocked);if(!p){ok=false;break}paths.set(word,p);p.forEach(id=>blocked.add(id))}if(ok)return paths}throw new Error('Could not build disjoint prototype routes')}
function cleanWords(pool){return [...new Set((pool||[]).map(w=>String(w).toUpperCase().replace(/[^A-Z]/g,'')).filter(w=>w.length>=3&&w.length<=10))]}
function exact42Set(pool){
  const words=s.shuffle(cleanWords(pool));
  const states=new Map([['0|0',[]]]);
  for(const w of words){
    const snapshot=[...states.entries()];
    for(const [key,list] of snapshot){
      const [sum,count]=key.split('|').map(Number),nextSum=sum+w.length,nextCount=count+1;
      if(nextSum>42||nextCount>10)continue;
      const nextKey=`${nextSum}|${nextCount}`;
      if(!states.has(nextKey)||Math.random()<.16)states.set(nextKey,[...list,w]);
    }
  }
  const candidates=[];
  for(let count=6;count<=10;count++){const hit=states.get(`42|${count}`);if(hit)candidates.push(hit)}
  return candidates.length?s.shuffle(candidates)[0]:null;
}
function pathsForWords(words,cover){
  const paths=new Map();let offset=0;
  for(const word of words){const p=cover.slice(offset,offset+word.length);if(p.length!==word.length)return null;paths.set(word,p);offset+=word.length}
  return offset===42?paths:null;
}
function boardForPaths(paths){const board=new Array(42).fill('');for(const [w,p] of paths)p.forEach((id,i)=>board[id]=w[i]);return board}
function orbLayoutIsUnique(paths,board){
  for(const [w,p] of paths){
    for(let i=0;i<w.length-1;i++){
      const expectedLetter=w[i+1],expectedTile=p[i+1];
      const sameLetterNeighbours=[...s.adj.get(p[i])].filter(id=>board[id]===expectedLetter);
      if(sameLetterNeighbours.length!==1||sameLetterNeighbours[0]!==expectedTile)return false;
    }
  }
  return true;
}
function buildOrbPuzzle(){
  if(s.nodes.length!==42||ORB_COVER.length!==42||new Set(ORB_COVER).size!==42)throw new Error('Orb cover size mismatch');
  for(let i=1;i<ORB_COVER.length;i++)if(!s.adj.get(ORB_COVER[i-1])?.has(ORB_COVER[i]))throw new Error(`Orb cover adjacency mismatch at ${i}`);

  const pools=Array.isArray(window.ANITAS_THEME_POOLS)?s.shuffle(window.ANITAS_THEME_POOLS):[];
  for(const theme of pools){
    for(let setAttempt=0;setAttempt<12;setAttempt++){
      const set=exact42Set(theme.words);if(!set)continue;
      for(let orderAttempt=0;orderAttempt<48;orderAttempt++){
        const ordered=s.shuffle(set);
        for(const cover of [ORB_COVER,[...ORB_COVER].reverse()]){
          const paths=pathsForWords(ordered,cover);if(!paths)continue;
          const board=boardForPaths(paths);
          if(board.every(Boolean)&&orbLayoutIsUnique(paths,board))return{paths,words:ordered,board,theme:theme.name};
        }
      }
    }
  }

  const paths=pathsForWords(ORB_FALLBACK,ORB_COVER),board=boardForPaths(paths);
  if(!orbLayoutIsUnique(paths,board))throw new Error('Orb fallback layout is ambiguous');
  return{paths,words:[...ORB_FALLBACK],board,theme:'Orb Classics'};
}
function generate(){
  let paths,orderedTargets;
  if(s.mode==='orb'){
    const built=buildOrbPuzzle();paths=built.paths;orderedTargets=built.words;s.board=built.board;activeOrbTheme=built.theme;
  }else{
    paths=buildDisjointPaths();orderedTargets=[...s.cfg.words];s.board=s.nodes.map(()=>s.POOL[s.rnd(s.POOL.length)]);
    paths.forEach((p,w)=>p.forEach((id,i)=>s.board[id]=w[i]));
  }
  for(const [w,p] of paths){const spelled=p.map(id=>s.board[id]).join('');if(spelled!==w)throw new Error(`Prototype route validation failed for ${w}`);for(let i=1;i<p.length;i++)if(!s.adj.get(p[i-1]).has(p[i]))throw new Error(`Prototype adjacency validation failed for ${w}`)}
  if(s.mode==='orb'){if(s.board.some(ch=>!ch))throw new Error('Orb contains an unused tile');const used=[...paths.values()].flat();if(used.length!==42||new Set(used).size!==42)throw new Error('Orb routes do not cover every tile exactly once');if(!orbLayoutIsUnique(paths,s.board))throw new Error('Orb ambiguity validation failed')}
  s.targets=orderedTargets;s.targetPaths=paths;
  const themeEl=document.getElementById('wordThemeName');if(themeEl)themeEl.textContent=activeOrbTheme;
}
function renderTargets(){ui.targets.innerHTML='';for(const w of s.targets){const e=document.createElement('div');e.className='target-chip'+(s.found.has(w)?' found':'');e.innerHTML=`<strong>${w}</strong><span>${s.found.has(w)?'Found ✓':w.length+' letters'}</span>`;ui.targets.appendChild(e)}}
const word=()=>s.selected.map(id=>s.board[id]).join('');
function updateUI(){ui.word.textContent=word()||'Tap a tile to start';ui.meta.textContent=s.selected.length?(s.rotating&&s.timerPaused?`Timer paused while rotating · ${(s.timerRemain/1000).toFixed(1)}s remaining`:`${s.selected.length} tile${s.selected.length===1?'':'s'} · touching path · 8s timer`):'8 seconds after every tile · or press Check word';ui.clear.disabled=!s.selected.length;ui.check.disabled=s.selected.length<3;ui.found.textContent=`${s.found.size}/${s.targets.length}`;ui.score.textContent=s.score}
function toast(text){ui.toast.textContent=text;ui.toast.classList.add('show');clearTimeout(s.toastTimer);s.toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1500)}function bad(id){s.flash.set(id,performance.now()+380);s.draw();setTimeout(()=>{s.flash.delete(id);s.draw()},400)}
function stopTimer(reset=true){clearInterval(s.timer);s.timer=null;s.timerStart=0;s.timerPaused=false;s.timerRemain=s.SEL;if(reset)ui.bar.style.width='0%'}function startTimer(ms=s.SEL){clearInterval(s.timer);s.timerRemain=ms;s.timerStart=performance.now();s.timerPaused=false;ui.bar.style.width=ms/s.SEL*100+'%';s.timer=setInterval(()=>{const left=Math.max(0,s.timerRemain-(performance.now()-s.timerStart));ui.bar.style.width=left/s.SEL*100+'%';if(left<=0){stopTimer(false);evaluate()}},50)}function pauseTimer(){if(!s.timer)return false;s.timerRemain=Math.max(1,s.timerRemain-(performance.now()-s.timerStart));clearInterval(s.timer);s.timer=null;s.timerStart=0;s.timerPaused=true;ui.bar.style.width=s.timerRemain/s.SEL*100+'%';return true}function resumeTimer(){if(s.selected.length)startTimer(s.timerRemain)}
function evaluate(){
  if(!s.selected.length)return;
  stopTimer();
  const w=word(),p=[...s.selected],intended=s.targetPaths.get(w),exact=Boolean(intended&&samePath(p,intended));
  if(s.targets.includes(w)&&!s.found.has(w)&&exact){
    s.found.add(w);s.foundPaths.set(w,p);p.forEach(id=>s.solved.add(id));s.score+=w.length*120;toast(w+' found');
  }else if(s.targets.includes(w)&&s.found.has(w)){
    bad(s.selected.at(-1));toast(w+' already found');
  }else if(s.targets.includes(w)&&!exact){
    bad(s.selected.at(-1));toast('Correct letters, wrong route');
  }else if(w.length>=3&&ENGLISH_WORDS.has(w)&&!foundBonus.has(w)){
    foundBonus.add(w);s.score+=BONUS_SCORE;toast(`${w} bonus +${BONUS_SCORE}`);
  }else if(foundBonus.has(w)){
    bad(s.selected.at(-1));toast(w+' bonus already found');
  }else{
    bad(s.selected.at(-1));toast('Not a target word');
  }
  s.selected=[];renderTargets();updateUI();s.draw();
  if(s.found.size===s.targets.length){const e=stopClock();ui.winText.textContent=`All ${s.targets.length} target words found in ${fmt(e)} · ${foundBonus.size} bonus word${foundBonus.size===1?'':'s'}.`;setTimeout(()=>ui.win.classList.add('show'),300)}
}
function select(id){
  if(s.rotating)return;
  const i=s.selected.indexOf(id);
  if(i>=0){s.selected=s.selected.slice(0,i);updateUI();s.selected.length?startTimer():stopTimer();s.draw();return}
  const last=s.selected.at(-1);
  if(last!==undefined&&!s.adj.get(last).has(id)){bad(id);toast('Choose a touching tile');return}
  s.selected.push(id);updateUI();s.draw();
  const candidate=word(),intended=s.targetPaths.get(candidate);
  s.targets.includes(candidate)&&!s.found.has(candidate)&&samePath(s.selected,intended)?setTimeout(()=>word()===candidate&&samePath(s.selected,intended)&&evaluate(),120):startTimer()
}
function fmt(ms){const m=Math.floor(ms/60000),sec=Math.floor(ms%60000/1000),t=Math.floor(ms%1000/100);return`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${t}`}function clockUI(){ui.time.textContent=fmt(s.startMs?Date.now()-s.startMs:s.finalMs)}function startClock(){clearInterval(s.ticker);s.finalMs=0;s.startMs=Date.now();clockUI();s.ticker=setInterval(clockUI,100)}function stopClock(){if(s.startMs)s.finalMs=Date.now()-s.startMs;s.startMs=0;clearInterval(s.ticker);clockUI();return s.finalMs}
function reset(){s.rx=s.clamp(s.cfg.rx,-78,78);s.ry=s.cfg.ry;s.draw()}function fresh(){stopTimer();stopClock();s.selected=[];s.found=new Set();s.foundPaths=new Map();s.solved=new Set();foundBonus=new Set();s.score=0;s.flash=new Map();ui.win.classList.remove('show');generate();renderTargets();updateUI();reset();startClock();toast(s.mode==='orb'?`${activeOrbTheme} · ${s.targets.length} words`:`New ${s.cfg.name} prototype · v${s.ver}`)}
function applyTheme(value){s.dark=value==='dark';document.documentElement.dataset.theme=s.dark?'dark':'light';ui.theme.textContent=s.dark?'Light mode':'Dark mode';ui.metaColor?.setAttribute('content',s.dark?'#091311':'#f3f7f4');try{localStorage.setItem('anitasPrototypeTheme',s.dark?'dark':'light')}catch(_){}s.draw()}
s.canvas.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;const id=s.hit(e.clientX,e.clientY);if(id!==null){select(id);return}s.rotating=true;s.pid=e.pointerId;s.lx=e.clientX;s.ly=e.clientY;s.timerPaused=pauseTimer();updateUI();try{s.canvas.setPointerCapture(e.pointerId)}catch(_){}s.stage.classList.add('rotating')});
s.canvas.addEventListener('pointermove',e=>{if(!s.rotating||e.pointerId!==s.pid)return;const dx=e.clientX-s.lx,dy=e.clientY-s.ly;s.lx=e.clientX;s.ly=e.clientY;s.ry=s.normAng(s.ry+dx*.34);s.rx=s.clamp(s.rx-dy*.34,-78,78);s.draw()});
function end(e){if(!s.rotating)return;if(e&&e.pointerId!==undefined&&s.pid!==null&&e.pointerId!==s.pid)return;s.rotating=false;s.pid=null;s.stage.classList.remove('rotating');const resume=s.timerPaused;s.timerPaused=false;updateUI();if(resume)resumeTimer()}s.canvas.addEventListener('pointerup',end);s.canvas.addEventListener('pointercancel',end);s.canvas.addEventListener('lostpointercapture',()=>end());window.addEventListener('blur',()=>end());
ui.clear.addEventListener('click',()=>{s.selected=[];stopTimer();updateUI();s.draw()});ui.check.addEventListener('click',evaluate);ui.newBtn.addEventListener('click',fresh);ui.next.addEventListener('click',fresh);ui.reset.addEventListener('click',reset);ui.theme.addEventListener('click',()=>applyTheme(s.dark?'light':'dark'));document.addEventListener('keydown',e=>{if(e.key==='Escape'){s.selected=[];stopTimer();updateUI();s.draw()}if(e.key==='Enter'&&s.selected.length>=3)evaluate()});
function resize(){const r=s.stage.getBoundingClientRect();s.dpr=Math.min(window.devicePixelRatio||1,2);s.w=Math.max(1,r.width);s.h=Math.max(1,r.height);s.canvas.width=Math.round(s.w*s.dpr);s.canvas.height=Math.round(s.h*s.dpr);s.canvas.style.width=s.w+'px';s.canvas.style.height=s.h+'px';s.ctx.setTransform(s.dpr,0,0,s.dpr,0,0);s.draw()}if('ResizeObserver'in window)new ResizeObserver(resize).observe(s.stage);else window.addEventListener('resize',resize);
s.build();let saved='light';try{saved=localStorage.getItem('anitasPrototypeTheme')||'light'}catch(_){}applyTheme(saved);fresh();resize();
})();
