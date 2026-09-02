(() => {
  "use strict";

  const CFG = {
    easy:   {n:5, target:[7,9],  label:"Easy"},
    medium: {n:7, target:[11,14],label:"Medium"},
    hard:   {n:9, target:[16,20],label:"Hard"},
    expert: {n:10,target:[20,24],label:"Expert"}
  };
  const COLORS = [
    "#a9e8d1","#d9ccff","#e6a2df","#b8d9ff","#dfc9b7","#f4d58a",
    "#9ed9e8","#c6e6a6","#f4b8b8","#b9b4ee","#add9c8","#e7bfe8",
    "#c2d5ff","#ffd0ad","#b7e7d8","#e5c8ff","#f2c1d0","#d2e7a8",
    "#b8d8e6","#e9d6a5","#cfc3f3","#b5e0bf","#efc5ae","#bad7f0"
  ];

  const boardEl = document.getElementById("board");
  const timerEl = document.getElementById("timer");
  const statusEl = document.getElementById("status");
  const diffEl = document.getElementById("difficulty");
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalCancel = document.getElementById("modalCancel");
  const modalGo = document.getElementById("modalGo");

  let N = 7, clues = [], solution = [], placed = [], history = [];
  let cells = [], pointerStart = null, pointerNow = null;
  let startedAt = 0, ticker = null, gameDone = false, levelSeed = 0;
  let generationToken = 0;

  const randInt = (a,b) => a + Math.floor(Math.random()*(b-a+1));
  const shuffle = a => {
    a = a.slice();
    for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a;
  };
  const key = (r,c) => r*N+c;
  const contains = (rect,r,c) => r>=rect.r1 && r<=rect.r2 && c>=rect.c1 && c<=rect.c2;
  const area = r => (r.r2-r.r1+1)*(r.c2-r.c1+1);
  const rectEq = (a,b) => a && b && a.r1===b.r1 && a.r2===b.r2 && a.c1===b.c1 && a.c2===b.c2;

  function splitPartition(n, targetCount){
    let rects=[{r1:0,c1:0,r2:n-1,c2:n-1}];
    let guard=0;
    while(rects.length<targetCount && guard++<2000){
      const candidates = rects
        .map((r,i)=>({r,i,a:area(r)}))
        .filter(x => (x.r.r2-x.r.r1+1)>=2 || (x.r.c2-x.r.c1+1)>=2)
        .sort((a,b)=>b.a-a.a);
      if(!candidates.length) break;

      const pick = candidates[Math.floor(Math.random()*Math.min(candidates.length, Math.max(2, Math.ceil(candidates.length*.45))))];
      const r=pick.r;
      const h=r.r2-r.r.r1+1, w=r.c2-r.c1+1;
      const options=[];
      if(h>=2){
        for(let cut=1;cut<h;cut++){
          const a1=cut*w, a2=(h-cut)*w;
          if(a1>=2 && a2>=2) options.push({dir:"h",cut,score:Math.abs(a1-a2)+Math.random()*4});
        }
      }
      if(w>=2){
        for(let cut=1;cut<w;cut++){
          const a1=cut*h, a2=(w-cut)*h;
          if(a1>=2 && a2>=2) options.push({dir:"v",cut,score:Math.abs(a1-a2)+Math.random()*4});
        }
      }
      if(!options.length){ guard+=5; continue; }
      options.sort((a,b)=>a.score-b.score);
      const o=options[Math.floor(Math.random()*Math.min(3,options.length))];
      let a,b;
      if(o.dir==="h"){
        a={r1:r.r1,c1:r.c1,r2:r.r1+o.cut-1,c2:r.c2};
        b={r1:r.r1+o.cut,c1:r.c1,r2:r.r2,c2:r.c2};
      } else {
        a={r1:r.r1,c1:r.c1,r2:r.r2,c2:r.c1+o.cut-1};
        b={r1:r.r1,c1:r.c1+o.cut,r2:r.r2,c2:r.c2};
      }
      rects.splice(pick.i,1,a,b);
    }
    return rects;
  }

  function makeClues(rects){
    return rects.map((r,id)=>{
      const candidates=[];
      for(let rr=r.r1;rr<=r.r2;rr++) for(let cc=r.c1;cc<=r.c2;cc++) candidates.push([rr,cc]);
      const [row,col]=candidates[Math.floor(Math.random()*candidates.length)];
      return {row,col,value:area(r),id};
    });
  }

  function candidateRectsForClue(clue, allClues){
    const v=clue.value, out=[];
    for(let h=1;h<=N;h++){
      if(v%h) continue;
      const w=v/h;
      if(w>N) continue;
      const minR=Math.max(0, clue.row-h+1), maxR=Math.min(clue.row, N-h);
      const minC=Math.max(0, clue.col-w+1), maxC=Math.min(clue.col, N-w);
      for(let r1=minR;r1<=maxR;r1++){
        for(let c1=minC;c1<=maxC;c1++){
          const r={r1,c1,r2:r1+h-1,c2:c1+w-1};
          let count=0;
          for(const q of allClues){
            if(contains(r,q.row,q.col)) count++;
            if(count>1) break;
          }
          if(count===1) out.push(r);
        }
      }
    }
    return out;
  }

  function countSolutions(allClues, limit=2, wantOne=false){
    const candidates=allClues.map(cl=>candidateRectsForClue(cl,allClues));
    if(candidates.some(a=>!a.length)) return {count:0, solution:null};
    const used=new Uint8Array(N*N);
    const chosen=new Array(allClues.length);
    let count=0, first=null;

    function fits(r){
      for(let rr=r.r1;rr<=r.r2;rr++) for(let cc=r.c1;cc<=r.c2;cc++) if(used[key(rr,cc)]) return false;
      return true;
    }
    function paint(r,val){
      for(let rr=r.r1;rr<=r.r2;rr++) for(let cc=r.c1;cc<=r.c2;cc++) used[key(rr,cc)]=val;
    }
    function dfs(depth){
      if(count>=limit) return;
      if(depth===allClues.length){
        count++;
        if(!first) first=chosen.map(x=>({...x}));
        return;
      }
      let best=-1,bestList=null;
      for(let i=0;i<allClues.length;i++){
        if(chosen[i]) continue;
        const viable=[];
        for(const r of candidates[i]) if(fits(r)) viable.push(r);
        if(viable.length===0) return;
        if(bestList===null || viable.length<bestList.length){
          best=i; bestList=viable;
          if(viable.length===1) break;
        }
      }
      for(const r of bestList){
        chosen[best]=r; paint(r,1);
        dfs(depth+1);
        paint(r,0); chosen[best]=null;
        if(count>=limit) return;
      }
    }
    dfs(0);
    return {count,solution:first};
  }

  async function generateLevel(){
    const token=++generationToken;
    const cfg=CFG[diffEl.value];
    N=cfg.n; gameDone=false; placed=[]; history=[]; clues=[]; solution=[];
    stopTimer(); timerEl.textContent="00:00";
    statusEl.textContent="Erstelle und prüfe ein lösbares Level …";
    boardEl.innerHTML="";
    await new Promise(r=>setTimeout(r,20));

    let found=null;
    const maxAttempts = diffEl.value==="expert" ? 600 : 350;
    for(let attempt=0;attempt<maxAttempts;attempt++){
      if(token!==generationToken) return;
      const target=randInt(cfg.target[0],cfg.target[1]);
      const partition=splitPartition(N,target);
      if(partition.length<Math.floor(target*.9)) continue;
      const cs=makeClues(partition);
      const checked=countSolutions(cs,2,true);
      if(checked.count===1){
        found={clues:cs,solution:checked.solution};
        break;
      }
      if(attempt%20===0) await new Promise(r=>setTimeout(r,0));
    }
    if(!found){
      let rounds=0;
      while(!found && rounds++<20){
        for(let attempt=0;attempt<100;attempt++){
          const target=randInt(cfg.target[0],cfg.target[1]);
          const partition=splitPartition(N,target);
          const cs=makeClues(partition);
          const checked=countSolutions(cs,2,true);
          if(checked.count===1){ found={clues:cs,solution:checked.solution}; break; }
        }
        await new Promise(r=>setTimeout(r,0));
      }
    }
    if(!found){
      statusEl.textContent="Generator startet neu …";
      setTimeout(generateLevel,50);
      return;
    }
    clues=found.clues; solution=found.solution;
    levelSeed=Date.now();
    renderBoard();
    startTimer();
    statusEl.textContent=`${CFG[diffEl.value].label} · eindeutige Lösung geprüft ✓`;
  }

  function renderBoard(){
    boardEl.style.gridTemplateColumns=`repeat(${N},1fr)`;
    boardEl.style.gridTemplateRows=`repeat(${N},1fr)`;
    cells=[];
    const clueMap=new Map(clues.map(c=>[key(c.row,c.col),c]));
    for(let r=0;r<N;r++){
      for(let c=0;c<N;c++){
        const el=document.createElement("div");
        el.className="cell"+(((r+c)&1)?" alt":"");
        el.dataset.r=r; el.dataset.c=c;
        const clue=clueMap.get(key(r,c));
        if(clue){
          const s=document.createElement("span");
          s.className="num"; s.textContent=clue.value; el.appendChild(s);
        }
        boardEl.appendChild(el); cells.push(el);
      }
    }
    recolor();
  }

  function cellAt(r,c){ return cells[key(r,c)]; }

  function normalized(a,b){
    return {r1:Math.min(a.r,b.r),r2:Math.max(a.r,b.r),c1:Math.min(a.c,b.c),c2:Math.max(a.c,b.c)};
  }

  function getCellFromPoint(x,y){
    const el=document.elementFromPoint(x,y);
    const c=el && el.closest(".cell");
    if(!c || !boardEl.contains(c)) return null;
    return {r:+c.dataset.r,c:+c.dataset.c};
  }

  function clearPreview(){ cells.forEach(c=>c.classList.remove("preview")); }
  function showPreview(rect){
    clearPreview();
    for(let r=rect.r1;r<=rect.r2;r++) for(let c=rect.c1;c<=rect.c2;c++) cellAt(r,c).classList.add("preview");
  }

  function validateUserRect(rect){
    const insideClues=clues.filter(q=>contains(rect,q.row,q.col));
    if(insideClues.length!==1) return {ok:false,msg:"Ein Rechteck muss genau eine Zahl enthalten."};
    if(area(rect)!==insideClues[0].value) return {ok:false,msg:`Fläche ${area(rect)} passt nicht zur Zahl ${insideClues[0].value}.`};
    return {ok:true,clue:insideClues[0]};
  }

  function overlapsOther(rect, exceptIndex=-1){
    return placed.some((p,i)=>{
      if(i===exceptIndex) return false;
      return !(rect.r2<p.r1 || rect.r1>p.r2 || rect.c2<p.c1 || rect.c1>p.c2);
    });
  }

  function placeRect(rect){
    const v=validateUserRect(rect);
    if(!v.ok){ statusEl.textContent=v.msg; flashRect(rect); return; }
    const existing=placed.findIndex(p=>contains(p,v.clue.row,v.clue.col));
    if(overlapsOther(rect,existing)){ statusEl.textContent="Dieses Rechteck überlappt ein bestehendes."; flashRect(rect); return; }
    history.push(placed.map(x=>({...x})));
    const item={...rect,clueId:v.clue.id};
    if(existing>=0) placed[existing]=item; else placed.push(item);
    recolor();
    statusEl.textContent="Passt geometrisch. Weiter!";
    checkWin();
  }

  function flashRect(rect){
    for(let r=rect.r1;r<=rect.r2;r++) for(let c=rect.c1;c<=rect.c2;c++){
      const el=cellAt(r,c); el.classList.add("bad"); setTimeout(()=>el.classList.remove("bad"),280);
    }
  }

  function recolor(){
    cells.forEach(el=>{el.style.background="";el.style.borderRadius="8px";});
    placed.forEach((p,idx)=>{
      const col=COLORS[p.clueId % COLORS.length];
      for(let r=p.r1;r<=p.r2;r++) for(let c=p.c1;c<=p.c2;c++){
        const el=cellAt(r,c); el.style.background=col;
        const rad=8;
        const tl=(r===p.r1 && c===p.c1)?rad:3, tr=(r===p.r1 && c===p.c2)?rad:3;
        const br=(r===p.r2 && c===p.c2)?rad:3, bl=(r===p.r2 && c===p.c1)?rad:3;
        el.style.borderRadius=`${tl}px ${tr}px ${br}px ${bl}px`;
      }
    });
  }

  function checkWin(){
    if(placed.length!==clues.length) return false;
    let covered=0;
    for(const p of placed) covered+=area(p);
    if(covered!==N*N) return false;
    for(const c of clues){
      const p=placed.find(x=>x.clueId===c.id);
      if(!p || !rectEq(p,solution[c.id])) return false;
    }
    gameDone=true; stopTimer();
    statusEl.textContent="Gelöst! 🎉";
    showModal("Geschafft!", `<p>Du hast das ${CFG[diffEl.value].label}-Level in <strong>${timerEl.textContent}</strong> gelöst.</p><p>Jedes generierte Level wird vor dem Start automatisch auf eine eindeutige Lösung geprüft.</p>`, true);
    return true;
  }

  function manualCheck(){
    if(gameDone) return;
    let errors=0;
    for(const p of placed){
      const sol=solution[p.clueId];
      if(!rectEq(p,sol)){ errors++; flashRect(p); }
    }
    if(errors===0){
      statusEl.textContent=placed.length===clues.length ? "Alles korrekt." : "Bisher alles korrekt ✓";
      checkWin();
    } else {
      statusEl.textContent=`${errors} Rechteck${errors===1?"":"e"} stimmt${errors===1?"":"en"} noch nicht.`;
    }
  }

  function giveHint(){
    if(gameDone) return;
    const missing=clues.filter(c=>{
      const p=placed.find(x=>x.clueId===c.id);
      return !p || !rectEq(p,solution[c.id]);
    });
    if(!missing.length) return;
    const c=missing[Math.floor(Math.random()*missing.length)];
    const rect=solution[c.id];
    history.push(placed.map(x=>({...x})));
    const existing=placed.findIndex(p=>p.clueId===c.id);
    placed=placed.filter((p,i)=>i===existing || !overlapRects(p,rect));
    const after=placed.findIndex(p=>p.clueId===c.id);
    const item={...rect,clueId:c.id};
    if(after>=0) placed[after]=item; else placed.push(item);
    recolor();
    statusEl.textContent=`Hinweis: Rechteck mit ${c.value} wurde eingesetzt.`;
    checkWin();
  }

  function overlapRects(a,b){
    return !(a.r2<b.r1 || a.r1>b.r2 || a.c2<b.c1 || a.c1>b.c2);
  }

  function eraseAt(pos){
    const i=placed.findIndex(p=>contains(p,pos.r,pos.c));
    if(i<0) return;
    history.push(placed.map(x=>({...x})));
    placed.splice(i,1); recolor(); statusEl.textContent="Rechteck gelöscht.";
  }

  function undo(){
    if(!history.length) return;
    placed=history.pop(); recolor(); statusEl.textContent="Rückgängig.";
  }

  function showSolution(){
    if(gameDone) return;
    placed=solution.map((r,i)=>({...r,clueId:i}));
    recolor(); gameDone=true; stopTimer();
    statusEl.textContent="Lösung angezeigt.";
  }

  function startTimer(){
    startedAt=performance.now();
    ticker=setInterval(()=>{
      const s=Math.floor((performance.now()-startedAt)/1000);
      timerEl.textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
    },250);
  }
  function stopTimer(){ if(ticker){clearInterval(ticker);ticker=null;} }

  function showModal(title,body,showNew){
    modalTitle.textContent=title; modalBody.innerHTML=body;
    modalGo.style.display=showNew?"block":"none"; modal.classList.add("show");
  }
  function hideModal(){ modal.classList.remove("show"); }

  boardEl.addEventListener("pointerdown",e=>{
    if(gameDone) return;
    const p=getCellFromPoint(e.clientX,e.clientY); if(!p) return;
    pointerStart=p; pointerNow=p; boardEl.setPointerCapture?.(e.pointerId);
    showPreview(normalized(pointerStart,pointerNow)); e.preventDefault();
  });
  boardEl.addEventListener("pointermove",e=>{
    if(!pointerStart) return;
    const p=getCellFromPoint(e.clientX,e.clientY); if(!p) return;
    pointerNow=p; showPreview(normalized(pointerStart,pointerNow)); e.preventDefault();
  });
  boardEl.addEventListener("pointerup",e=>{
    if(!pointerStart) return;
    const p=getCellFromPoint(e.clientX,e.clientY) || pointerNow;
    const rect=normalized(pointerStart,p);
    pointerStart=null; pointerNow=null; clearPreview();
    placeRect(rect); e.preventDefault();
  });
  boardEl.addEventListener("pointercancel",()=>{pointerStart=null;pointerNow=null;clearPreview()});

  document.getElementById("eraseBtn").addEventListener("click",()=>{
    statusEl.textContent="Tippe auf ein farbiges Rechteck, das du löschen möchtest.";
    const once=e=>{
      const p=getCellFromPoint(e.clientX,e.clientY);
      if(p) eraseAt(p);
      boardEl.removeEventListener("pointerdown",once,true);
      e.stopPropagation(); e.preventDefault();
    };
    boardEl.addEventListener("pointerdown",once,true);
  });
  document.getElementById("undoBtn").addEventListener("click",undo);
  document.getElementById("hintBtn").addEventListener("click",giveHint);
  document.getElementById("checkBtn").addEventListener("click",manualCheck);
  document.getElementById("newBtn").addEventListener("click",generateLevel);
  diffEl.addEventListener("change",generateLevel);

  document.getElementById("rulesBtn").addEventListener("click",()=>{
    showModal("So funktioniert Shikaku",
      `<p>Teile das gesamte Feld in Rechtecke auf.</p>
       <p>Jedes Rechteck muss <strong>genau eine Zahl</strong> enthalten. Die Zahl gibt die <strong>Fläche</strong> des Rechtecks an. Eine 8 kann also z.B. 1×8, 2×4, 4×2 oder 8×1 gross sein, sofern das auf dem Spielfeld möglich ist.</p>
       <p>Ziehe vom ersten bis zum letzten Feld, um ein Rechteck zu setzen. Überlappungen sind nicht erlaubt.</p>`, false);
  });
  document.getElementById("solveBtn").addEventListener("click",()=>{
    showModal("Lösung anzeigen?",`<p>Damit wird das aktuelle Level beendet und die vollständige Lösung eingeblendet.</p>`,false);
    modalCancel.textContent="Abbrechen";
    modalCancel.onclick=()=>{hideModal(); modalCancel.textContent="Schliessen"; modalCancel.onclick=null;};
    modalGo.style.display="block"; modalGo.textContent="Lösung zeigen";
    modalGo.onclick=()=>{hideModal();showSolution();modalGo.textContent="Neues Level";modalGo.onclick=null;};
  });
  modalCancel.addEventListener("click",hideModal);
  modalGo.addEventListener("click",()=>{hideModal();generateLevel();});
  modal.addEventListener("click",e=>{if(e.target===modal)hideModal()});

  generateLevel();
})();