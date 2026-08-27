(() => {
  'use strict';

  const APP_VERSION = '0.5.1';
  const GRID = 3;
  const FACE_NAMES = ['front','right','back','left','top','bottom'];
  const TILE_COUNT = FACE_NAMES.length * GRID * GRID;
  const SELECTION_MS = 8000;
  const TARGET_SCORE = 120;
  const BONUS_SCORE = 30;
  const MAX_SELECTION = 14;
  const PLANE = GRID / 2;
  const TILE_HALF = 0.43;
  const CAMERA_Z = 6.7;

  const SPACE_WORDS = [
    'ASTEROID','ECLIPSE','STELLAR','GRAVITY','CAPSULE','SHUTTLE','VOYAGER','NEBULA',
    'GALAXY','METEOR','ROCKET','PLANET','COSMOS','SATURN','URANUS','MERCURY','JUPITER',
    'ORBIT','COMET','LUNAR','SOLAR','VENUS','MARS','EARTH','MOON','SPACE','NOVA','QUASAR',
    'PULSAR','PHOTON','AURORA','CRATER','MODULE','ALIEN','SIGNAL','PROBE','ROVER','TITAN',
    'ORION','APOLLO','ZENITH','VACUUM','PLASMA','HELIUM','FUSION','COSMIC','STAR','ASTRO'
  ];
  const LETTER_POOL = 'EEEEEEEEEEEEAAAAAAAAAIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ';
  const ENGLISH_WORDS = window.ANITAS_ENGLISH_WORDS instanceof Set ? window.ANITAS_ENGLISH_WORDS : new Set();

  const V = {
    add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
    sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
    mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
    len:a=>Math.hypot(a[0],a[1],a[2])
  };

  const FACE = {
    front:{n:[0,0,1], u:[1,0,0],  v:[0,1,0]},
    back: {n:[0,0,-1],u:[-1,0,0], v:[0,1,0]},
    right:{n:[1,0,0], u:[0,0,-1], v:[0,1,0]},
    left: {n:[-1,0,0],u:[0,0,1],  v:[0,1,0]},
    top:  {n:[0,-1,0],u:[1,0,0],  v:[0,0,1]},
    bottom:{n:[0,1,0],u:[1,0,0],  v:[0,0,-1]}
  };

  const stage = document.getElementById('stage');
  const canvas = document.getElementById('cubeCanvas');
  const ctx = canvas.getContext('2d', {alpha:true});
  const currentWordEl = document.getElementById('currentWord');
  const selectionMetaEl = document.getElementById('selectionMeta');
  const timerBar = document.getElementById('timerBar');
  const targetList = document.getElementById('targetList');
  const bonusList = document.getElementById('bonusList');
  const foundStat = document.getElementById('foundStat');
  const scoreStat = document.getElementById('scoreStat');
  const bonusStat = document.getElementById('bonusStat');
  const crossStat = document.getElementById('crossStat');
  const checkBtn = document.getElementById('checkBtn');
  const clearBtn = document.getElementById('clearBtn');
  const newBtn = document.getElementById('newBtn');
  const resetViewBtn = document.getElementById('resetViewBtn');
  const toastEl = document.getElementById('toast');
  const winEl = document.getElementById('win');
  const winText = document.getElementById('winText');
  const nextCubeBtn = document.getElementById('nextCubeBtn');

  const nodes = [];
  const nodeById = new Map();
  const adjacency = new Map();

  let board = Array(TILE_COUNT).fill('');
  let targets = [];
  let targetPaths = new Map();
  let foundTargets = new Set();
  let foundBonus = new Set();
  let foundPathByWord = new Map();
  let solvedNodes = new Set();
  let selected = [];
  let score = 0;
  let bonusScore = 0;
  let crossFaceFinds = 0;

  let rotX = -22;
  let rotY = -32;
  let renderedTiles = [];
  let canvasWidth = 1;
  let canvasHeight = 1;
  let dpr = 1;

  let rotating = false;
  let dragPointerId = null;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let hoverTileId = null;

  let timerId = null;
  let timerStartedAt = 0;
  let timerRemaining = SELECTION_MS;
  let timerPausedForRotation = false;
  let toastTimer = null;
  let evaluating = false;
  const flashUntil = new Map();

  function randInt(max){ return Math.floor(Math.random() * max); }
  function shuffle(list){
    const out=[...list];
    for(let i=out.length-1;i>0;i--){
      const j=randInt(i+1);
      [out[i],out[j]]=[out[j],out[i]];
    }
    return out;
  }

  function nodePosition(face,row,col){
    const def=FACE[face];
    const mid=(GRID-1)/2;
    return V.add(V.mul(def.n,PLANE),V.add(V.mul(def.u,col-mid),V.mul(def.v,row-mid)));
  }

  function buildGraph(){
    let id=0;
    for(const face of FACE_NAMES){
      for(let row=0;row<GRID;row++){
        for(let col=0;col<GRID;col++){
          const node={id,face,row,col,pos:nodePosition(face,row,col)};
          nodes.push(node); nodeById.set(id,node); adjacency.set(id,new Set()); id++;
        }
      }
    }
    for(const a of nodes){
      for(const b of nodes){
        if(a.id===b.id || a.face!==b.face) continue;
        if(Math.abs(a.row-b.row)<=1 && Math.abs(a.col-b.col)<=1) adjacency.get(a.id).add(b.id);
      }
    }
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i],b=nodes[j];
        if(a.face===b.face) continue;
        if(V.len(V.sub(a.pos,b.pos))<0.76){ adjacency.get(a.id).add(b.id); adjacency.get(b.id).add(a.id); }
      }
    }
  }

  function validateCrossFaceGeometry(){
    let links=0;
    for(const a of nodes){
      for(const otherId of adjacency.get(a.id)){
        const b=nodeById.get(otherId);
        if(b && b.face!==a.face && a.id<otherId) links++;
      }
    }
    const expected=12*GRID;
    if(links!==expected) throw new Error(`Cube graph mismatch: ${links}, expected ${expected}`);
  }

  function compatible(id,letter,working){ return !working[id] || working[id]===letter; }
  function isEdgeNode(node){ return node.row===0 || node.row===GRID-1 || node.col===0 || node.col===GRID-1; }

  function findPlacement(word,minFaces,working){
    const starts=nodes.filter(n=>compatible(n.id,word[0],working));
    for(let attempt=0;attempt<1200;attempt++){
      let pool=starts;
      if(minFaces>1 && Math.random()<0.84){ const edges=starts.filter(isEdgeNode); if(edges.length) pool=edges; }
      const start=pool[randInt(pool.length)]; if(!start) return null;
      const path=[start.id],used=new Set(path),faces=new Set([start.face]);
      let ok=true;
      for(let i=1;i<word.length;i++){
        const current=nodeById.get(path[path.length-1]);
        const options=[...adjacency.get(current.id)]
          .filter(id=>!used.has(id) && compatible(id,word[i],working))
          .map(id=>{
            const node=nodeById.get(id); let weight=Math.random()*2;
            if(node.face!==current.face && faces.size<minFaces) weight+=12;
            if(node.face===current.face && isEdgeNode(node) && faces.size<minFaces) weight+=2.5;
            if(!working[id]) weight+=0.4;
            return {id,node,weight};
          }).sort((a,b)=>b.weight-a.weight);
        if(!options.length){ ok=false; break; }
        const shortlist=options.slice(0,Math.min(4,options.length));
        const choice=shortlist[randInt(shortlist.length)];
        path.push(choice.id); used.add(choice.id); faces.add(choice.node.face);
      }
      if(ok && faces.size>=minFaces) return path;
    }
    return null;
  }

  function chooseTargetWords(){
    const long=shuffle(SPACE_WORDS.filter(w=>w.length>=7));
    const rest=shuffle(SPACE_WORDS.filter(w=>w.length>=4 && w.length<=8));
    const chosen=[];
    for(const word of [...long.slice(0,2),...rest]){ if(!chosen.includes(word)) chosen.push(word); if(chosen.length===5) break; }
    return chosen;
  }

  function samePath(a,b){ return !!(a&&b) && a.length===b.length && a.every((id,i)=>id===b[i]); }

  function findWordPaths(word,candidateBoard,limit=2){
    const found=[],starts=nodes.filter(node=>candidateBoard[node.id]===word[0]);
    function walk(id,index,path,used){
      if(found.length>=limit) return;
      if(index===word.length-1){ found.push([...path]); return; }
      for(const next of adjacency.get(id)){
        if(found.length>=limit) return;
        if(used.has(next) || candidateBoard[next]!==word[index+1]) continue;
        used.add(next); path.push(next); walk(next,index+1,path,used); path.pop(); used.delete(next);
      }
    }
    for(const start of starts){ if(found.length>=limit) break; walk(start.id,0,[start.id],new Set([start.id])); }
    return found;
  }

  function targetHasExactlyIntendedPath(word,path,candidateBoard){
    const matches=findWordPaths(word,candidateBoard,2);
    return matches.length===1 && samePath(matches[0],path);
  }

  function validateUniqueTargets(words,paths,candidateBoard){
    for(const word of words){
      const intended=paths.get(word); if(!intended || intended.length!==word.length) return false;
      for(let i=0;i<intended.length;i++){
        if(candidateBoard[intended[i]]!==word[i]) return false;
        if(i && !adjacency.get(intended[i-1]).has(intended[i])) return false;
      }
      if(!targetHasExactlyIntendedPath(word,intended,candidateBoard)) return false;
    }
    return true;
  }

  function weightedLetterCandidates(){
    const out=[];
    for(let i=0;i<24;i++){ const letter=LETTER_POOL[randInt(LETTER_POOL.length)]; if(!out.includes(letter)) out.push(letter); }
    for(const letter of shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''))){ if(!out.includes(letter)) out.push(letter); }
    return out;
  }

  function fillBoardWithoutDuplicateTargets(words,paths,baseBoard){
    const filled=[...baseBoard]; if(!validateUniqueTargets(words,paths,filled)) return null;
    const blanks=shuffle(nodes.map(n=>n.id).filter(id=>!filled[id]));
    for(const id of blanks){
      let placed=false;
      for(const letter of weightedLetterCandidates()){
        filled[id]=letter;
        const affected=words.filter(word=>word.includes(letter));
        if(affected.every(word=>targetHasExactlyIntendedPath(word,paths.get(word),filled))){ placed=true; break; }
      }
      if(!placed) return null;
    }
    return validateUniqueTargets(words,paths,filled)?filled:null;
  }

  function generatePuzzle(){
    for(let attempt=0;attempt<90;attempt++){
      const working=Array(TILE_COUNT).fill('');
      const words=chooseTargetWords().sort((a,b)=>b.length-a.length),paths=new Map();
      let failed=false;
      for(let i=0;i<words.length;i++){
        const minFaces=i===0?3:i<4?2:1,path=findPlacement(words[i],minFaces,working);
        if(!path){ failed=true; break; }
        path.forEach((id,index)=>working[id]=words[i][index]); paths.set(words[i],path);
      }
      if(failed || !validateUniqueTargets(words,paths,working)) continue;
      const filled=fillBoardWithoutDuplicateTargets(words,paths,working); if(!filled) continue;
      board=filled; targets=words; targetPaths=paths; return;
    }
    throw new Error('Could not generate a unique-path cube puzzle.');
  }

  function rotatePoint(p){
    const ry=rotY*Math.PI/180,rx=rotX*Math.PI/180;
    const x1=p[0]*Math.cos(ry)+p[2]*Math.sin(ry),z1=-p[0]*Math.sin(ry)+p[2]*Math.cos(ry),y1=p[1];
    return [x1,y1*Math.cos(rx)-z1*Math.sin(rx),y1*Math.sin(rx)+z1*Math.cos(rx)];
  }

  function projectPoint(p){
    const r=rotatePoint(p),focal=Math.min(canvasWidth,canvasHeight)*0.92;
    const scale=focal/Math.max(1.5,CAMERA_Z-r[2]);
    return {x:canvasWidth/2+r[0]*scale,y:canvasHeight/2+r[1]*scale,z:r[2],scale};
  }

  function faceVisibility(face){ return rotatePoint(FACE[face].n)[2]; }

  function faceCornerPoints(face){
    const d=FACE[face];
    return [
      V.add(V.mul(d.n,PLANE),V.add(V.mul(d.u,-PLANE),V.mul(d.v,-PLANE))),
      V.add(V.mul(d.n,PLANE),V.add(V.mul(d.u, PLANE),V.mul(d.v,-PLANE))),
      V.add(V.mul(d.n,PLANE),V.add(V.mul(d.u, PLANE),V.mul(d.v, PLANE))),
      V.add(V.mul(d.n,PLANE),V.add(V.mul(d.u,-PLANE),V.mul(d.v, PLANE)))
    ];
  }

  function tileCornerPoints(node){
    const d=FACE[node.face],mid=(GRID-1)/2,cu=node.col-mid,cv=node.row-mid;
    const center=V.add(V.mul(d.n,PLANE),V.add(V.mul(d.u,cu),V.mul(d.v,cv)));
    return [
      V.add(center,V.add(V.mul(d.u,-TILE_HALF),V.mul(d.v,-TILE_HALF))),
      V.add(center,V.add(V.mul(d.u, TILE_HALF),V.mul(d.v,-TILE_HALF))),
      V.add(center,V.add(V.mul(d.u, TILE_HALF),V.mul(d.v, TILE_HALF))),
      V.add(center,V.add(V.mul(d.u,-TILE_HALF),V.mul(d.v, TILE_HALF)))
    ];
  }

  function beginPoly(points){ ctx.beginPath(); ctx.moveTo(points[0].x,points[0].y); for(let i=1;i<points.length;i++) ctx.lineTo(points[i].x,points[i].y); ctx.closePath(); }
  function averageDepth(points){ return points.reduce((s,p)=>s+p.z,0)/points.length; }
  function edgeLength(points){ let total=0; for(let i=0;i<4;i++) total+=Math.hypot(points[i].x-points[(i+1)%4].x,points[i].y-points[(i+1)%4].y); return total/4; }

  function drawFaceBase(face){
    const q=faceCornerPoints(face).map(projectPoint); beginPoly(q); ctx.fillStyle='#0d1b17'; ctx.fill();
    ctx.lineWidth=1.5; ctx.strokeStyle='rgba(101,223,195,.24)'; ctx.stroke();
  }

  function tileFill(id){
    if(selected.includes(id)) return '#65dfc3';
    if(solvedNodes.has(id)) return '#aee17f';
    if(flashUntil.get(id)>performance.now()) return '#ef9f96';
    return '#e9eee8';
  }

  function buildRenderedTiles(visibleFaces){
    renderedTiles=[];
    for(const face of visibleFaces){
      for(const node of nodes.filter(n=>n.face===face)){
        const quad=tileCornerPoints(node).map(projectPoint);
        renderedTiles.push({id:node.id,face,quad,depth:averageDepth(quad),size:edgeLength(quad)});
      }
    }
  }

  function drawTileShapes(){
    const ordered=[...renderedTiles].sort((a,b)=>a.depth-b.depth);
    for(const tile of ordered){
      beginPoly(tile.quad); ctx.fillStyle=tileFill(tile.id); ctx.fill();
      ctx.lineWidth=selected.includes(tile.id)?3.5:1.3;
      ctx.strokeStyle=selected.includes(tile.id)?'#d8fff4':solvedNodes.has(tile.id)?'#d8ffb9':'rgba(9,27,21,.24)'; ctx.stroke();
    }
  }

  function crossEdgePoint(a,b){
    const pa=V.add(a.pos,V.mul(FACE[b.face].n,0.5)),pb=V.add(b.pos,V.mul(FACE[a.face].n,0.5));
    return V.mul(V.add(pa,pb),0.5);
  }

  function pathParts(aId,bId){
    const a=nodeById.get(aId),b=nodeById.get(bId);
    if(a.face===b.face) return [{face:a.face,a:a.pos,b:b.pos}];
    const edge=crossEdgePoint(a,b);
    return [{face:a.face,a:a.pos,b:edge},{face:b.face,a:edge,b:b.pos}];
  }

  function drawSegment(a,b,color,width){
    const p1=projectPoint(a),p2=projectPoint(b); ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.strokeStyle='rgba(4,14,11,.88)'; ctx.lineWidth=width+10; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.strokeStyle=color; ctx.lineWidth=width; ctx.shadowColor=color; ctx.shadowBlur=8; ctx.stroke(); ctx.shadowBlur=0;
  }

  function drawPath(path,color,width){
    for(let i=1;i<path.length;i++) for(const part of pathParts(path[i-1],path[i])) if(faceVisibility(part.face)>0.025) drawSegment(part.a,part.b,color,width);
  }

  function drawAllPaths(){ foundPathByWord.forEach(path=>drawPath(path,'#9bd866',15)); if(selected.length>1) drawPath(selected,'#65dfc3',17); }

  function drawTileLabels(){
    const ordered=[...renderedTiles].sort((a,b)=>a.depth-b.depth);
    for(const tile of ordered){
      const q=tile.quad;
      const center={
        x:(q[0].x+q[1].x+q[2].x+q[3].x)/4,
        y:(q[0].y+q[1].y+q[2].y+q[3].y)/4
      };

      /* Build the exact same 2D face basis from the projected tile quad that is
         used to draw the tile itself. Text is then transformed by this basis,
         so it lies visually ON the face instead of remaining screen-flat. */
      const left={x:(q[0].x+q[3].x)/2,y:(q[0].y+q[3].y)/2};
      const right={x:(q[1].x+q[2].x)/2,y:(q[1].y+q[2].y)/2};
      const top={x:(q[0].x+q[1].x)/2,y:(q[0].y+q[1].y)/2};
      const bottom={x:(q[3].x+q[2].x)/2,y:(q[3].y+q[2].y)/2};
      const ux=right.x-left.x, uy=right.y-left.y;
      const vx=bottom.x-top.x, vy=bottom.y-top.y;

      ctx.save();
      beginPoly(q);
      ctx.clip();
      ctx.setTransform(dpr*ux,dpr*uy,dpr*vx,dpr*vy,dpr*center.x,dpr*center.y);
      ctx.font='800 0.58px Georgia, "Times New Roman", serif';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillStyle='#10201a';
      ctx.fillText(board[tile.id],0,0.03);
      ctx.restore();
      ctx.setTransform(dpr,0,0,dpr,0,0);

      const step=selected.indexOf(tile.id);
      if(step>=0) drawBadge(tile,step+1,'#0b1a15','#b9ffe9'); else if(solvedNodes.has(tile.id)) drawBadge(tile,'✓','#24411a','#eaffd8');
    }
  }

  function drawBadge(tile,label,bg,fg){
    const c=tile.quad[1],r=Math.max(8,Math.min(12,tile.size*0.11));
    ctx.beginPath(); ctx.arc(c.x-r*0.9,c.y+r*0.9,r,0,Math.PI*2); ctx.fillStyle=bg; ctx.fill();
    ctx.font=`900 ${Math.max(8,r*.9)}px Inter,system-ui,sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle=fg; ctx.fillText(String(label),c.x-r*0.9,c.y+r*0.9+.5);
  }

  function draw(){
    ctx.clearRect(0,0,canvasWidth,canvasHeight);
    const visible=FACE_NAMES.filter(face=>faceVisibility(face)>0.015).sort((a,b)=>averageDepth(faceCornerPoints(a).map(projectPoint))-averageDepth(faceCornerPoints(b).map(projectPoint)));
    for(const face of visible) drawFaceBase(face);
    buildRenderedTiles(visible); drawTileShapes(); drawAllPaths(); drawTileLabels();
  }

  function resizeCanvas(){
    const rect=stage.getBoundingClientRect(); dpr=Math.min(window.devicePixelRatio||1,2); canvasWidth=Math.max(1,rect.width); canvasHeight=Math.max(1,rect.height);
    canvas.width=Math.round(canvasWidth*dpr); canvas.height=Math.round(canvasHeight*dpr); canvas.style.width=`${canvasWidth}px`; canvas.style.height=`${canvasHeight}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0); draw();
  }

  function pointInPoly(x,y,pts){
    let inside=false;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++){
      const xi=pts[i].x,yi=pts[i].y,xj=pts[j].x,yj=pts[j].y;
      const intersect=((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi+1e-9)+xi); if(intersect) inside=!inside;
    }
    return inside;
  }

  function hitTile(clientX,clientY){
    const rect=canvas.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top;
    const hits=renderedTiles.filter(t=>pointInPoly(x,y,t.quad)).sort((a,b)=>b.depth-a.depth);
    return hits[0]?.id ?? null;
  }

  function newPuzzle(){
    stopSelectionTimer(); selected=[]; foundTargets=new Set(); foundBonus=new Set(); foundPathByWord=new Map(); solvedNodes=new Set();
    score=0; bonusScore=0; crossFaceFinds=0; evaluating=false; winEl.classList.remove('show'); generatePuzzle(); renderTargets(); renderBonus(); updateSelectionUI(); updateStats(); resetView(false); draw(); toast(`New cube ready · v${APP_VERSION}`);
  }

  function resetView(animate=true){ rotX=-22; rotY=-32; draw(); if(animate){ stage.classList.add('settling'); setTimeout(()=>stage.classList.remove('settling'),180); } }

  function selectTile(id){
    if(rotating || evaluating) return;
    const last=selected[selected.length-1];
    if(selected.length>1 && selected[selected.length-2]===id){ selected.pop(); updateSelectionUI(); if(selected.length) startSelectionTimer(SELECTION_MS); else stopSelectionTimer(); draw(); return; }
    if(last===id) return;
    if(selected.includes(id)){ flashTile(id); toast('That tile is already in the path'); return; }
    if(last!==undefined && !adjacency.get(last).has(id)){ flashTile(id); toast('Choose a touching tile'); return; }
    if(selected.length>=MAX_SELECTION){ toast(`Maximum path length is ${MAX_SELECTION}`); return; }
    selected.push(id); updateSelectionUI(); draw();
    const candidate=selectedWord();
    if(targets.includes(candidate) && !foundTargets.has(candidate)){ stopSelectionTimer(); setTimeout(()=>{ if(!evaluating && selectedWord()===candidate) evaluateSelection(); },120); }
    else startSelectionTimer(SELECTION_MS);
  }

  function selectedWord(){ return selected.map(id=>board[id]).join(''); }
  function selectedFaceCount(){ return new Set(selected.map(id=>nodeById.get(id).face)).size; }

  function updateSelectionUI(){
    const word=selectedWord(),faces=selectedFaceCount(); currentWordEl.textContent=word||'Tap a tile to start';
    selectionMetaEl.textContent=selected.length?`${selected.length} tile${selected.length===1?'':'s'} · ${faces} face${faces===1?'':'s'} · timer pauses while rotating`:'8 seconds after every tile · or press Check word';
    checkBtn.disabled=selected.length<3; clearBtn.disabled=selected.length===0;
  }

  function startSelectionTimer(duration){
    clearTimeout(timerId); timerRemaining=Math.max(1,duration); timerStartedAt=performance.now(); timerId=setTimeout(evaluateSelection,timerRemaining);
    timerBar.style.transition='none'; timerBar.style.width=`${Math.max(0,Math.min(100,timerRemaining/SELECTION_MS*100))}%`;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ timerBar.style.transition=`width ${timerRemaining}ms linear`; timerBar.style.width='0%'; }));
  }

  function pauseSelectionTimer(){
    if(!timerId) return false; timerRemaining=Math.max(0,timerRemaining-(performance.now()-timerStartedAt)); clearTimeout(timerId); timerId=null;
    timerBar.style.transition='none'; timerBar.style.width=`${Math.max(0,Math.min(100,timerRemaining/SELECTION_MS*100))}%`; return true;
  }
  function resumeSelectionTimer(){ if(selected.length && timerRemaining>0) startSelectionTimer(timerRemaining); }
  function stopSelectionTimer(){ clearTimeout(timerId); timerId=null; timerRemaining=SELECTION_MS; timerBar.style.transition='none'; timerBar.style.width='0%'; }
  function clearSelection(){ evaluating=false; stopSelectionTimer(); selected=[]; updateSelectionUI(); draw(); }

  function evaluateSelection(){
    if(!selected.length || evaluating) return; evaluating=true; stopSelectionTimer();
    const word=selectedWord(),path=[...selected],facesUsed=new Set(path.map(id=>nodeById.get(id).face)).size;
    if(targets.includes(word)){
      if(foundTargets.has(word)) toast(`${word} already found`);
      else{
        foundTargets.add(word); foundPathByWord.set(word,path); path.forEach(id=>solvedNodes.add(id));
        const earned=word.length*TARGET_SCORE+Math.max(0,facesUsed-1)*180; score+=earned; if(facesUsed>1) crossFaceFinds++;
        toast(`${word} · +${earned} · ${facesUsed} faces`,'success'); renderTargets(); if(foundTargets.size===targets.length) setTimeout(showWin,520);
      }
    }else if(word.length>=3 && ENGLISH_WORDS.has(word)){
      if(foundBonus.has(word)) toast(`${word} already scored`);
      else{ foundBonus.add(word); const earned=word.length*BONUS_SCORE; score+=earned; bonusScore+=earned; toast(`Bonus ${word} · +${earned}`,'bonus'); renderBonus(); }
    }else toast(word.length<3?'Keep going or clear the path':`${word} is not in the dictionary`,'error');
    updateStats(); draw(); setTimeout(clearSelection,460);
  }

  function flashTile(id){ flashUntil.set(id,performance.now()+360); draw(); setTimeout(()=>{ flashUntil.delete(id); draw(); },380); }

  function renderTargets(){
    targetList.innerHTML='';
    for(const word of targets){
      const path=targetPaths.get(word)||[],faces=new Set(path.map(id=>nodeById.get(id).face)).size,item=document.createElement('div');
      item.className=`target-chip${foundTargets.has(word)?' found':''}`; item.innerHTML=`<strong>${word}</strong><span>${faces} face${faces===1?'':'s'}</span>`; targetList.appendChild(item);
    }
  }

  function renderBonus(){
    bonusList.innerHTML='';
    if(!foundBonus.size){ const empty=document.createElement('span'); empty.className='empty-bonus'; empty.textContent=ENGLISH_WORDS.size?`${ENGLISH_WORDS.size.toLocaleString()} offline English words available`:'Target words only in this browser'; bonusList.appendChild(empty); return; }
    [...foundBonus].slice(-10).reverse().forEach(word=>{ const chip=document.createElement('span'); chip.className='bonus-chip'; chip.textContent=word; bonusList.appendChild(chip); });
  }

  function updateStats(){ foundStat.textContent=`${foundTargets.size}/${targets.length}`; scoreStat.textContent=score.toLocaleString(); bonusStat.textContent=String(foundBonus.size); crossStat.textContent=String(crossFaceFinds); }
  function showWin(){ winText.textContent=`You found all ${targets.length} words with ${crossFaceFinds} cross-face finds and scored ${score.toLocaleString()} points.`; winEl.classList.add('show'); }
  function toast(message,type=''){ clearTimeout(toastTimer); toastEl.textContent=message; toastEl.className=`toast show ${type}`; toastTimer=setTimeout(()=>toastEl.className='toast',1900); }

  function onPointerDown(event){
    if(event.button!==undefined && event.button!==0) return;
    const hit=hitTile(event.clientX,event.clientY);
    if(hit!==null){ event.preventDefault(); selectTile(hit); return; }
    rotating=true; dragPointerId=event.pointerId; lastPointerX=event.clientX; lastPointerY=event.clientY; canvas.setPointerCapture(event.pointerId); timerPausedForRotation=pauseSelectionTimer(); stage.classList.add('rotating');
  }

  function onPointerMove(event){
    if(rotating && event.pointerId===dragPointerId){
      const dx=event.clientX-lastPointerX,dy=event.clientY-lastPointerY; lastPointerX=event.clientX; lastPointerY=event.clientY;
      rotY+=dx*0.34; rotX-=dy*0.34; rotX=Math.max(-89,Math.min(89,rotX)); draw(); return;
    }
    const hit=hitTile(event.clientX,event.clientY); if(hit!==hoverTileId){ hoverTileId=hit; canvas.style.cursor=hit!==null?'pointer':'grab'; }
  }

  function onPointerEnd(event){
    if(!rotating || event.pointerId!==dragPointerId) return; rotating=false; dragPointerId=null; stage.classList.remove('rotating'); canvas.style.cursor='grab';
    if(timerPausedForRotation){ timerPausedForRotation=false; resumeSelectionTimer(); }
  }

  function bindEvents(){
    canvas.addEventListener('pointerdown',onPointerDown); canvas.addEventListener('pointermove',onPointerMove); canvas.addEventListener('pointerup',onPointerEnd); canvas.addEventListener('pointercancel',onPointerEnd);
    checkBtn.addEventListener('click',evaluateSelection); clearBtn.addEventListener('click',clearSelection); newBtn.addEventListener('click',newPuzzle); resetViewBtn.addEventListener('click',()=>resetView(true)); nextCubeBtn.addEventListener('click',newPuzzle);
    document.addEventListener('keydown',event=>{ if(event.key==='Escape') clearSelection(); if(event.key==='Enter' && selected.length>=3) evaluateSelection(); });
    if('ResizeObserver' in window) new ResizeObserver(resizeCanvas).observe(stage); else window.addEventListener('resize',resizeCanvas);
  }

  try{ buildGraph(); validateCrossFaceGeometry(); bindEvents(); resizeCanvas(); newPuzzle(); }
  catch(error){ console.error(error); currentWordEl.textContent='Could not generate cube'; selectionMetaEl.textContent='Reload the page to try again.'; }
})();
