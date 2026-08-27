(() => {
  'use strict';

  const APP_VERSION = '1.1.1';
  const GRID = 3;
  const FACE_NAMES = ['front','right','back','left','top','bottom'];
  const TILE_COUNT = FACE_NAMES.length * GRID * GRID;
  const SELECTION_MS = 8000;
  const TARGET_SCORE = 120;
  const BONUS_SCORE = 30;
  const MAX_SELECTION = 14;
  const PLANE = GRID / 2;
  const CORE_PLANE = PLANE - 0.12;
  const TILE_HALF = 0.43;
  const CAMERA_Z = 6.7;

  const WORD_THEMES = (window.ANITAS_THEME_POOLS||[]).map(theme=>({name:theme.name,words:[...theme.words]}));
  if(!WORD_THEMES.length)throw new Error('Shared theme library failed to load.');
  const WORD_THEME_WORD_COUNT = WORD_THEMES.reduce((sum,theme)=>sum+new Set(theme.words).size,0);
  const LETTER_POOL = 'EEEEEEEEEEEEAAAAAAAAAIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ';
  const ENGLISH_WORDS = window.ANITAS_ENGLISH_WORDS instanceof Set ? window.ANITAS_ENGLISH_WORDS : new Set();
  const CUBE_DIFFICULTY_KEY='anitasWordCubeDifficulty';
  const CUBE_DIFFICULTIES={
    beginner:{label:'Beginner',minLen:3,maxLen:8,counts:[10,11,12,9,8],minCross:2,maxCross:4},
    middle:{label:'Middle',minLen:4,maxLen:11,counts:[7,8,9,10,6,11],minCross:3,maxCross:6},
    hard:{label:'Hard',minLen:5,maxLen:14,counts:[5,6,7,8,9],minCross:4,maxCross:99}
  };
  const storedCubeDifficulty=localStorage.getItem(CUBE_DIFFICULTY_KEY)||localStorage.getItem('anitasWordPathPreferredDifficulty')||'beginner';
  let cubeDifficulty=CUBE_DIFFICULTIES[storedCubeDifficulty]?storedCubeDifficulty:'beginner';
  const LOCAL_PROFILE_NAMES = new Set(['Anita','Dario']);
  const activeProfileName = localStorage.getItem('anitasWordPathActiveProfile') || '';
  if(!LOCAL_PROFILE_NAMES.has(activeProfileName)){
    window.location.replace('../');
    return;
  }
  const UNLOCK_THRESHOLDS = {Tricking:1,Bouldering:2,Climbing:3};
  const DEFAULT_STATS = {
    totalPuzzles:0,totalWords:0,totalBonus:0,bestCombo:0,bestScore:0,longestWord:'',
    dailyStreak:0,lastDailyDate:'',recentWords:[],themeProgress:{},dailyBest:{},soundEnabled:true,
    completedPuzzles:[],completedFingerprints:[],cubePuzzles:0,cubeWords:0,cubeBonus:0,cubeBestScore:0
  };
  function profileStorageKey(){ return `anitasWordPathStats:${activeProfileName}`; }
  function loadPlayerStats(){
    try{
      const raw=JSON.parse(localStorage.getItem(profileStorageKey())||'null')||{};
      return {...DEFAULT_STATS,...raw,recentWords:raw.recentWords||[],themeProgress:raw.themeProgress||{},dailyBest:raw.dailyBest||{},completedPuzzles:raw.completedPuzzles||[],completedFingerprints:raw.completedFingerprints||[]};
    }catch(_){ return {...DEFAULT_STATS}; }
  }
  let playerStats=loadPlayerStats();
  function savePlayerStats(){ try{localStorage.setItem(profileStorageKey(),JSON.stringify(playerStats))}catch(_){} }
  function isThemeUnlocked(name){ return playerStats.totalPuzzles >= (UNLOCK_THRESHOLDS[name]||0); }
  function availableWordThemes(){ const unlocked=WORD_THEMES.filter(theme=>isThemeUnlocked(theme.name)); return unlocked.length?unlocked:WORD_THEMES; }
  function hashText(value){ let h=2166136261; for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)} return h>>>0; }

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
  const themeBtn = document.getElementById('themeBtn');
  const themeColorMeta = document.getElementById('themeColorMeta');
  const toastEl = document.getElementById('toast');
  const winEl = document.getElementById('win');
  const winText = document.getElementById('winText');
  const nextCubeBtn = document.getElementById('nextCubeBtn');
  const wordThemeNameEl = document.getElementById('wordThemeName');
  const cubePlayerNameEl = document.getElementById('cubePlayerName');
  const cubeDifficultyBadge = document.getElementById('cubeDifficultyBadge');
  const difficultyMessageEl = document.getElementById('difficultyMessage');
  const hintBtn = document.getElementById('hintBtn');
  const switchProfileBtn = document.getElementById('switchProfileBtn');

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
  let cubeCleared = false;

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
  const THEME_KEY = 'anitasWordCubeTheme';
  let currentTheme = 'light';
  let activeWordTheme = WORD_THEMES[0];
  let previousWordThemeName = '';
  let cubePuzzleCode = '';
  let cubePuzzleFingerprint = '';
  let cubeRecorded = false;
  let hintNodes = new Set();
  let hintTimer = null;
  let cubeHints = 0;

  const CANVAS_THEME = {
    dark:{
      face:'#2d3331',core:'#252a29',faceStroke:'rgba(101,223,195,.24)',tile:'#e9eee8',tileText:'#10201a',
      tileStroke:'rgba(9,27,21,.24)',selected:'#65dfc3',selectedStroke:'#d8fff4',
      solved:'#aee17f',solvedStroke:'#d8ffb9',hint:'#efca6b',hintStroke:'#fff0b3',invalid:'#ef9f96',pathUnder:'rgba(4,14,11,.88)'
    },
    light:{
      face:'#555d5a',core:'#414744',faceStroke:'rgba(33,111,90,.30)',tile:'#fbfdfa',tileText:'#173028',
      tileStroke:'rgba(23,48,40,.24)',selected:'#55d7b9',selectedStroke:'#147e67',
      solved:'#b9e58f',solvedStroke:'#5d9634',hint:'#f1cf70',hintStroke:'#9a7315',invalid:'#ef9f96',pathUnder:'rgba(255,255,255,.96)'
    }
  };

  function canvasTheme(){ return CANVAS_THEME[currentTheme] || CANVAS_THEME.dark; }

  function applyTheme(theme,persist=true){
    currentTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = currentTheme;
    themeBtn.textContent = currentTheme === 'light' ? 'Dark mode' : 'Light mode';
    themeBtn.setAttribute('aria-pressed',currentTheme === 'light' ? 'true' : 'false');
    if(themeColorMeta) themeColorMeta.setAttribute('content',currentTheme === 'light' ? '#f3f7f4' : '#091311');
    if(persist){
      try{ localStorage.setItem(THEME_KEY,currentTheme); }catch(_){ /* local storage unavailable */ }
    }
    draw();
  }

  function initTheme(){
    let saved='light';
    try{ saved=localStorage.getItem(THEME_KEY)||'light'; }catch(_){ /* local storage unavailable */ }
    applyTheme(saved,false);
  }

  function normalizeAngle(value){
    return ((value + 180) % 360 + 360) % 360 - 180;
  }

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


  const COVER_ROUTE_COORDS = [
    ['front',0,0],['front',0,1],['front',0,2],['front',1,2],['front',2,2],['front',1,1],['front',1,0],['front',2,0],['front',2,1],
    ['bottom',0,1],['bottom',0,0],['bottom',1,0],['bottom',2,0],['bottom',2,1],['bottom',2,2],['bottom',1,1],['bottom',0,2],['bottom',1,2],
    ['right',2,1],['right',2,0],['right',1,0],['right',0,0],['right',0,1],['right',0,2],['right',1,1],['right',1,2],['right',2,2],
    ['back',2,0],['back',1,0],['back',0,0],['back',0,1],['back',0,2],['back',1,1],['back',1,2],['back',2,1],['back',2,2],
    ['left',2,0],['left',1,0],['left',0,0],['left',0,1],['left',1,1],['left',2,1],['left',2,2],['left',1,2],['left',0,2],
    ['top',2,0],['top',1,0],['top',0,0],['top',0,1],['top',0,2],['top',1,1],['top',1,2],['top',2,1],['top',2,2]
  ];

  function coverRoute(){
    const lookup=new Map(nodes.map(n=>[`${n.face}:${n.row}:${n.col}`,n.id]));
    const route=COVER_ROUTE_COORDS.map(([face,row,col])=>lookup.get(`${face}:${row}:${col}`));
    if(route.length!==TILE_COUNT || route.some(id=>id===undefined) || new Set(route).size!==TILE_COUNT) return null;
    for(let i=1;i<route.length;i++) if(!adjacency.get(route[i-1]).has(route[i])) return null;
    return route;
  }

  function chooseCoverWords(pool,total=TILE_COUNT){
    const cfg=CUBE_DIFFICULTIES[cubeDifficulty];
    const recent=new Set(playerStats.recentWords||[]);

    function solve(minLen,maxLen,counts){
      const words=shuffle([...new Set(pool)].filter(w=>w.length>=minLen && w.length<=maxLen))
        .sort((a,b)=>Number(recent.has(a))-Number(recent.has(b)));
      const states=new Map([[`0:0`,[]]]);
      for(const word of words){
        const snapshot=[...states.entries()];
        for(const [key,list] of snapshot){
          const [sum,count]=key.split(':').map(Number);
          if(count>=12) continue;
          const next=sum+word.length;
          if(next>total) continue;
          const nextKey=`${next}:${count+1}`;
          if(!states.has(nextKey)) states.set(nextKey,[...list,word]);
        }
      }
      for(const count of counts){
        const hit=states.get(`${total}:${count}`);
        if(hit)return shuffle(hit);
      }
      return null;
    }

    return solve(cfg.minLen,cfg.maxLen,cfg.counts)
      || solve(3,14,cfg.counts)
      || solve(3,14,[7,8,9,10,6,11,5,12,4]);
  }

  function buildFullCoverCandidate(words,baseRoute){
    const route=Math.random()<0.5?[...baseRoute]:[...baseRoute].reverse();
    const working=Array(TILE_COUNT).fill(''),paths=new Map();
    let offset=0;
    for(const word of words){
      const path=route.slice(offset,offset+word.length);
      if(path.length!==word.length) return null;
      path.forEach((id,index)=>working[id]=word[index]);
      paths.set(word,path);
      offset+=word.length;
    }
    if(offset!==TILE_COUNT || working.some(letter=>!letter)) return null;
    const covered=new Set([...paths.values()].flat());
    if(covered.size!==TILE_COUNT) return null;
    return {working,paths};
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
    const route=coverRoute();
    if(!route) throw new Error('Full-cover cube route is invalid.');

    const available=availableWordThemes();
    const alternatives=available.filter(theme=>theme.name!==previousWordThemeName);
    const themeOrder=shuffle(alternatives.length?alternatives:available);
    const maxThemes=Math.min(6,themeOrder.length);

    for(let themeIndex=0;themeIndex<maxThemes;themeIndex++){
      const theme=themeOrder[themeIndex];
      for(let attempt=0;attempt<180;attempt++){
        const words=chooseCoverWords(theme.words);
        if(!words) break;
        const candidate=buildFullCoverCandidate(words,route);
        if(!candidate) continue;
        const {working,paths}=candidate;
        const cfg=CUBE_DIFFICULTIES[cubeDifficulty];
        const faceCounts=words.map(word=>new Set(paths.get(word).map(id=>nodeById.get(id).face)).size);
        const crossFaceCount=faceCounts.filter(count=>count>1).length;
        const crossBurden=faceCounts.reduce((sum,count)=>sum+Math.max(0,count-1),0);
        if(crossFaceCount<cfg.minCross || crossFaceCount>cfg.maxCross) continue;
        if(cubeDifficulty==='hard' && crossBurden<4) continue;
        if(!validateUniqueTargets(words,paths,working)) continue;
        board=working;
        targets=words;
        targetPaths=paths;
        activeWordTheme=theme;
        previousWordThemeName=theme.name;
        return;
      }
    }
    throw new Error('Could not generate a unique full-cover cube puzzle from the available themes.');
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

  function faceFacingCosine(face,plane=PLANE){
    const normal=rotatePoint(FACE[face].n);
    const center=rotatePoint(V.mul(FACE[face].n,plane));
    const toCamera=[-center[0],-center[1],CAMERA_Z-center[2]];
    const distance=Math.max(1e-6,V.len(toCamera));
    const dot=normal[0]*toCamera[0]+normal[1]*toCamera[1]+normal[2]*toCamera[2];
    return dot/distance;
  }

  function faceVisible(face,plane=PLANE,margin=0.025){
    return faceFacingCosine(face,plane)>margin;
  }

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


  function coreFaceCornerPoints(face){
    const d=FACE[face],p=CORE_PLANE;
    return [
      V.add(V.mul(d.n,p),V.add(V.mul(d.u,-p),V.mul(d.v,-p))),
      V.add(V.mul(d.n,p),V.add(V.mul(d.u, p),V.mul(d.v,-p))),
      V.add(V.mul(d.n,p),V.add(V.mul(d.u, p),V.mul(d.v, p))),
      V.add(V.mul(d.n,p),V.add(V.mul(d.u,-p),V.mul(d.v, p)))
    ];
  }

  function drawSolidCore(){
    const t=canvasTheme();
    const faces=FACE_NAMES.filter(face=>faceVisible(face,CORE_PLANE,0.018))
      .sort((a,b)=>averageDepth(coreFaceCornerPoints(a).map(projectPoint))-averageDepth(coreFaceCornerPoints(b).map(projectPoint)));
    for(const face of faces){
      const q=coreFaceCornerPoints(face).map(projectPoint);
      beginPoly(q); ctx.fillStyle=t.core; ctx.fill();
      ctx.lineWidth=2; ctx.strokeStyle='rgba(0,0,0,.22)'; ctx.stroke();
    }
  }

  function drawFaceBase(face){
    const p=canvasTheme(),q=faceCornerPoints(face).map(projectPoint); beginPoly(q); ctx.fillStyle=p.face; ctx.fill();
    ctx.lineWidth=1.5; ctx.strokeStyle=p.faceStroke; ctx.stroke();
  }

  function tileFill(id){
    const p=canvasTheme();
    if(selected.includes(id)) return p.selected;
    if(hintNodes.has(id)) return p.hint;
    if(solvedNodes.has(id)) return p.solved;
    if(flashUntil.get(id)>performance.now()) return p.invalid;
    return p.tile;
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
    const p=canvasTheme(),ordered=[...renderedTiles].sort((a,b)=>a.depth-b.depth);
    for(const tile of ordered){
      beginPoly(tile.quad); ctx.fillStyle=tileFill(tile.id); ctx.fill();
      const hinted=hintNodes.has(tile.id);
      ctx.lineWidth=selected.includes(tile.id)?3.5:hinted?3:1.3;
      ctx.strokeStyle=selected.includes(tile.id)?p.selectedStroke:hinted?p.hintStroke:solvedNodes.has(tile.id)?p.solvedStroke:p.tileStroke; ctx.stroke();
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

  function facePathWidth(face,baseWidth){
    const q=faceCornerPoints(face).map(projectPoint);
    const top=Math.hypot(q[1].x-q[0].x,q[1].y-q[0].y);
    const bottom=Math.hypot(q[2].x-q[3].x,q[2].y-q[3].y);
    const left=Math.hypot(q[3].x-q[0].x,q[3].y-q[0].y);
    const right=Math.hypot(q[2].x-q[1].x,q[2].y-q[1].y);
    const tileMinor=Math.min((top+bottom)/2,(left+right)/2)/GRID;
    return Math.min(baseWidth,Math.max(3,tileMinor*.34));
  }

  function drawSegmentOnFace(face,a,b,color,baseWidth){
    if(!faceVisible(face,PLANE,0.025)) return;
    const q=faceCornerPoints(face).map(projectPoint);
    const p1=projectPoint(a),p2=projectPoint(b),width=facePathWidth(face,baseWidth);
    ctx.save();
    beginPoly(q);
    ctx.clip();
    ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.strokeStyle=canvasTheme().pathUnder; ctx.lineWidth=width+Math.max(4,width*.58); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.strokeStyle=color; ctx.lineWidth=width; ctx.shadowColor=color; ctx.shadowBlur=Math.min(8,width*.6); ctx.stroke();
    ctx.restore();
  }

  function drawPath(path,color,width){
    for(let i=1;i<path.length;i++){
      for(const part of pathParts(path[i-1],path[i])){
        if(faceVisible(part.face,PLANE,0.025)) drawSegmentOnFace(part.face,part.a,part.b,color,width);
      }
    }
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

      if(cubeCleared) continue;

      const minorAxis=Math.min(Math.hypot(ux,uy),Math.hypot(vx,vy));
      if(faceFacingCosine(tile.face,PLANE)<0.075 || minorAxis<12) continue;

      ctx.save();
      beginPoly(q);
      ctx.clip();
      ctx.setTransform(dpr*ux,dpr*uy,dpr*vx,dpr*vy,dpr*center.x,dpr*center.y);
      ctx.font='800 0.58px Georgia, "Times New Roman", serif';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillStyle=canvasTheme().tileText;
      ctx.fillText(board[tile.id],0,0.03);
      ctx.restore();
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
  }

  function draw(){
    ctx.clearRect(0,0,canvasWidth,canvasHeight);
    drawSolidCore();
    const visible=FACE_NAMES.filter(face=>faceVisible(face,PLANE,0.025)).sort((a,b)=>averageDepth(faceCornerPoints(a).map(projectPoint))-averageDepth(faceCornerPoints(b).map(projectPoint)));
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

  function makeCubeFingerprint(){
    const targetKey=[...targets].sort().join(',');
    return `CUBE-${cubeDifficulty}-${activeWordTheme.name}-${hashText(`${board.join('')}|${targetKey}`).toString(36).toUpperCase()}`;
  }

  function newPuzzle(){
    stopSelectionTimer(); clearTimeout(hintTimer); hintNodes=new Set(); selected=[]; foundTargets=new Set(); foundBonus=new Set(); foundPathByWord=new Map(); solvedNodes=new Set(); cubeCleared=false;
    score=0; bonusScore=0; crossFaceFinds=0; cubeHints=0; evaluating=false; cubeRecorded=false; winEl.classList.remove('show');
    let guard=0;
    do{ generatePuzzle(); cubePuzzleFingerprint=makeCubeFingerprint(); guard++; }
    while(playerStats.completedFingerprints.includes(cubePuzzleFingerprint) && guard<24);
    cubePuzzleCode=`WC-${Date.now().toString(36).toUpperCase()}-${cubeDifficulty.toUpperCase()}-${activeWordTheme.name.toUpperCase()}`;
    wordThemeNameEl.textContent=`${activeWordTheme.name} set`; updateDifficultyUI(); renderTargets(); renderBonus(); updateSelectionUI(); updateStats(); resetView(false); draw(); toast(`New ${CUBE_DIFFICULTIES[cubeDifficulty].label} ${activeWordTheme.name} cube · ${activeProfileName} · v${APP_VERSION}`);
  }

  function resetView(animate=true){ rotX=-22; rotY=-32; draw(); if(animate){ stage.classList.add('settling'); setTimeout(()=>stage.classList.remove('settling'),180); } }

  function selectTile(id){
    if(rotating || evaluating) return;
    const last=selected[selected.length-1];
    const selectedIndex=selected.indexOf(id);
    if(selectedIndex>=0){
      selected=selected.slice(0,selectedIndex);
      updateSelectionUI();
      if(selected.length) startSelectionTimer(SELECTION_MS); else stopSelectionTimer();
      draw();
      return;
    }
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
    const word=selectedWord(),faces=selectedFaceCount();
    currentWordEl.textContent=word||'Tap a tile to start';
    if(selected.length && rotating && timerPausedForRotation){
      selectionMetaEl.textContent=`Timer paused while rotating · ${(timerRemaining/1000).toFixed(1)}s remaining`;
    }else{
      selectionMetaEl.textContent=selected.length?`${selected.length} tile${selected.length===1?'':'s'} · ${faces} face${faces===1?'':'s'} · 8s timer`:'8 seconds after every tile · or press Check word';
    }
    checkBtn.disabled=selected.length<3; clearBtn.disabled=selected.length===0;
  }

  function setTimerBarImmediate(percent){
    timerBar.style.transition='none';
    timerBar.style.width=`${Math.max(0,Math.min(100,percent))}%`;
    /* Force the browser to commit the frozen width before another transition can start. */
    void timerBar.offsetWidth;
  }

  function startSelectionTimer(duration){
    clearTimeout(timerId);
    timerRemaining=Math.max(1,duration);
    timerStartedAt=performance.now();
    timerId=setTimeout(evaluateSelection,timerRemaining);
    setTimerBarImmediate(timerRemaining/SELECTION_MS*100);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(!timerId || rotating) return;
      timerBar.style.transition=`width ${timerRemaining}ms linear`;
      timerBar.style.width='0%';
    }));
  }

  function pauseSelectionTimer(){
    if(!timerId) return false;
    timerRemaining=Math.max(1,timerRemaining-(performance.now()-timerStartedAt));
    clearTimeout(timerId);
    timerId=null;
    setTimerBarImmediate(timerRemaining/SELECTION_MS*100);
    return true;
  }

  function resumeSelectionTimer(){
    if(selected.length && timerRemaining>0) startSelectionTimer(timerRemaining);
  }

  function stopSelectionTimer(){
    clearTimeout(timerId);
    timerId=null;
    timerRemaining=SELECTION_MS;
    setTimerBarImmediate(0);
  }
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

  function updateDifficultyUI(){
    const cfg=CUBE_DIFFICULTIES[cubeDifficulty];
    cubeDifficultyBadge.textContent=cfg.label;
    hintBtn.classList.toggle('hidden',cubeDifficulty==='hard');
    if(cubeDifficulty==='beginner')difficultyMessageEl.textContent='All target words are visible. Hints highlight the required cube tiles for 5 seconds.';
    else if(cubeDifficulty==='middle')difficultyMessageEl.textContent='Target words are hidden. Hints are available and highlight tiles only.';
    else difficultyMessageEl.textContent='Target words are hidden and no hints are available. Routes are longer and more cross-face heavy.';
  }

  function showHint(){
    if(cubeDifficulty==='hard' || evaluating)return;
    const remaining=targets.filter(word=>!foundTargets.has(word));
    if(!remaining.length)return;
    const word=remaining[randInt(remaining.length)];
    hintNodes=new Set(targetPaths.get(word)||[]);
    clearTimeout(hintTimer);
    cubeHints++;
    score=Math.max(0,score-50);
    updateStats();
    draw();
    toast('Hint tiles highlighted · -50','bonus');
    hintTimer=setTimeout(()=>{hintNodes=new Set();draw();},5000);
  }

  function renderTargets(){
    targetList.innerHTML='';
    if(cubeDifficulty!=='beginner'){
      const hidden=document.createElement('div');
      hidden.className='difficulty-target-message';
      hidden.textContent=`${foundTargets.size}/${targets.length} target words found · word list hidden in ${CUBE_DIFFICULTIES[cubeDifficulty].label}`;
      targetList.appendChild(hidden);
      return;
    }
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
  function recordCubeCompletion(){
    if(cubeRecorded)return;
    cubeRecorded=true;
    playerStats.totalPuzzles=(playerStats.totalPuzzles||0)+1;
    playerStats.totalWords=(playerStats.totalWords||0)+targets.length;
    playerStats.totalBonus=(playerStats.totalBonus||0)+foundBonus.size;
    playerStats.bestScore=Math.max(playerStats.bestScore||0,score);
    const longest=targets.reduce((best,word)=>word.length>best.length?word:best,'');
    if(longest.length>(playerStats.longestWord||'').length)playerStats.longestWord=longest;
    playerStats.recentWords=[...new Set([...targets,...(playerStats.recentWords||[])])].slice(0,45);
    const tp=playerStats.themeProgress[activeWordTheme.name]||{puzzles:0,words:0};
    tp.puzzles++; tp.words+=targets.length; playerStats.themeProgress[activeWordTheme.name]=tp;
    playerStats.completedPuzzles=[...new Set([cubePuzzleCode,...(playerStats.completedPuzzles||[])])].slice(0,3000);
    playerStats.completedFingerprints=[...new Set([cubePuzzleFingerprint,...(playerStats.completedFingerprints||[])])].slice(0,3000);
    playerStats.cubePuzzles=(playerStats.cubePuzzles||0)+1;
    playerStats.cubeWords=(playerStats.cubeWords||0)+targets.length;
    playerStats.cubeBonus=(playerStats.cubeBonus||0)+foundBonus.size;
    playerStats.cubeBestScore=Math.max(playerStats.cubeBestScore||0,score);
    savePlayerStats();
  }

  function showWin(){
    cubeCleared=true;
    recordCubeCompletion();
    draw();
    winText.textContent=`${activeProfileName}, you cleared the ${CUBE_DIFFICULTIES[cubeDifficulty].label} ${activeWordTheme.name} cube: all ${TILE_COUNT} letters, ${targets.length} target words, ${crossFaceFinds} cross-face finds, ${cubeHints} hints and ${score.toLocaleString()} points.`;
    setTimeout(()=>winEl.classList.add('show'),260);
  }
  function toast(message,type=''){ clearTimeout(toastTimer); toastEl.textContent=message; toastEl.className=`toast show ${type}`; toastTimer=setTimeout(()=>toastEl.className='toast',1900); }

  function onPointerDown(event){
    if(event.button!==undefined && event.button!==0) return;
    const hit=hitTile(event.clientX,event.clientY);
    if(hit!==null){ event.preventDefault(); selectTile(hit); return; }

    rotating=true;
    dragPointerId=event.pointerId;
    lastPointerX=event.clientX;
    lastPointerY=event.clientY;
    timerPausedForRotation=pauseSelectionTimer();
    updateSelectionUI();
    try{canvas.setPointerCapture(event.pointerId)}catch(_){/* optional */}
    stage.classList.add('rotating');
  }

  function onPointerMove(event){
    if(rotating && event.pointerId===dragPointerId){
      const dx=event.clientX-lastPointerX,dy=event.clientY-lastPointerY; lastPointerX=event.clientX; lastPointerY=event.clientY;
      rotY=normalizeAngle(rotY+dx*0.34); rotX=normalizeAngle(rotX-dy*0.34); draw(); return;
    }
    const hit=hitTile(event.clientX,event.clientY); if(hit!==hoverTileId){ hoverTileId=hit; canvas.style.cursor=hit!==null?'pointer':'grab'; }
  }

  function finishRotation(event=null){
    if(!rotating) return;
    if(event && event.pointerId!==undefined && dragPointerId!==null && event.pointerId!==dragPointerId) return;
    rotating=false;
    dragPointerId=null;
    stage.classList.remove('rotating');
    canvas.style.cursor='grab';
    const shouldResume=timerPausedForRotation;
    timerPausedForRotation=false;
    updateSelectionUI();
    if(shouldResume) resumeSelectionTimer();
  }

  function onPointerEnd(event){ finishRotation(event); }

  function bindEvents(){
    canvas.addEventListener('pointerdown',onPointerDown);
    canvas.addEventListener('pointermove',onPointerMove);
    canvas.addEventListener('pointerup',onPointerEnd);
    canvas.addEventListener('pointercancel',onPointerEnd);
    canvas.addEventListener('lostpointercapture',()=>finishRotation());
    window.addEventListener('blur',()=>finishRotation());
    checkBtn.addEventListener('click',evaluateSelection); clearBtn.addEventListener('click',clearSelection); hintBtn.addEventListener('click',showHint); newBtn.addEventListener('click',newPuzzle); resetViewBtn.addEventListener('click',()=>resetView(true)); nextCubeBtn.addEventListener('click',newPuzzle); themeBtn.addEventListener('click',()=>applyTheme(currentTheme==='light'?'dark':'light'));
    switchProfileBtn.addEventListener('click',()=>{localStorage.removeItem('anitasWordPathActiveProfile');sessionStorage.removeItem('anitasWordPathActiveProfile');window.location.href='../';});
    document.addEventListener('keydown',event=>{ if(event.key==='Escape') clearSelection(); if(event.key==='Enter' && selected.length>=3) evaluateSelection(); });
    if('ResizeObserver' in window) new ResizeObserver(resizeCanvas).observe(stage); else window.addEventListener('resize',resizeCanvas);
  }

  try{ cubePlayerNameEl.textContent=activeProfileName; buildGraph(); validateCrossFaceGeometry(); bindEvents(); initTheme(); resizeCanvas(); newPuzzle(); }
  catch(error){ console.error(error); currentWordEl.textContent='Could not generate cube'; selectionMetaEl.textContent='Reload the page to try again.'; }
})();
