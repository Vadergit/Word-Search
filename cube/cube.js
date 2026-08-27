(() => {
  'use strict';

  const FACE_NAMES = ['front','right','back','left','top','bottom'];
  const GRID = 3;
  const TILE_COUNT = FACE_NAMES.length * GRID * GRID;
  const SELECTION_MS = 8000;
  const TARGET_SCORE = 120;
  const BONUS_SCORE = 30;
  const MAX_SELECTION = 14;

  const SPACE_WORDS = [
    'ASTEROID','ECLIPSE','STELLAR','GRAVITY','CAPSULE','SHUTTLE','VOYAGER','NEBULA',
    'GALAXY','METEOR','ROCKET','PLANET','COSMOS','SATURN','URANUS','MERCURY','JUPITER',
    'ORBIT','COMET','LUNAR','SOLAR','VENUS','MARS','EARTH','MOON','SPACE','NOVA','QUASAR',
    'PULSAR','PHOTON','AURORA','CRATER','MODULE','ALIEN','SIGNAL','PROBE','ROVER','TITAN',
    'ORION','APOLLO','ZENITH','VACUUM','PLASMA','HELIUM','FUSION','COSMIC','STAR','ASTRO'
  ];

  const LETTER_POOL = 'EEEEEEEEEEEEAAAAAAAAAIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ';
  const ENGLISH_WORDS = window.ANITAS_ENGLISH_WORDS instanceof Set ? window.ANITAS_ENGLISH_WORDS : new Set();

  const stage = document.getElementById('stage');
  const cube = document.getElementById('cube');
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
  const tileEls = new Map();

  let board = Array(TILE_COUNT).fill('');
  let targets = [];
  let targetPaths = new Map();
  let foundTargets = new Set();
  let foundBonus = new Set();
  let solvedNodes = new Set();
  let selected = [];
  let score = 0;
  let bonusScore = 0;
  let crossFaceFinds = 0;

  let rotX = -18;
  let rotY = 32;
  let rotating = false;
  let dragPointerId = null;
  let lastPointerX = 0;
  let lastPointerY = 0;

  let timerId = null;
  let timerStartedAt = 0;
  let timerRemaining = SELECTION_MS;
  let timerPausedForRotation = false;
  let toastTimer = null;
  let evaluating = false;

  function randInt(max){ return Math.floor(Math.random() * max); }
  function shuffle(list){
    const out = [...list];
    for(let i = out.length - 1; i > 0; i--){
      const j = randInt(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function facePosition(face, row, col){
    /* Logical 3D tile centres. Keeping the face plane half a tile beyond the
       outer tile centres makes touching tiles on neighbouring faces exactly
       sqrt(.5^2 + .5^2) apart, independent of GRID. */
    const mid=(GRID-1)/2;
    const plane=GRID/2;
    const v=Array.from({length:GRID},(_,i)=>i-mid);
    switch(face){
      case 'front': return [v[col], v[GRID-1-row], plane];
      case 'back': return [v[GRID-1-col], v[GRID-1-row], -plane];
      case 'right': return [plane, v[GRID-1-row], v[GRID-1-col]];
      case 'left': return [-plane, v[GRID-1-row], v[col]];
      case 'top': return [v[col], plane, v[row]];
      case 'bottom': return [v[col], -plane, v[GRID-1-row]];
      default: return [0,0,0];
    }
  }

  function buildGraph(){
    let id = 0;
    FACE_NAMES.forEach(face => {
      for(let row = 0; row < GRID; row++){
        for(let col = 0; col < GRID; col++){
          const node = { id, face, row, col, pos: facePosition(face,row,col) };
          nodes.push(node);
          nodeById.set(id,node);
          adjacency.set(id,new Set());
          id++;
        }
      }
    });

    for(const a of nodes){
      for(const b of nodes){
        if(a.id === b.id || a.face !== b.face) continue;
        if(Math.abs(a.row-b.row) <= 1 && Math.abs(a.col-b.col) <= 1){
          adjacency.get(a.id).add(b.id);
        }
      }
    }

    for(let i = 0; i < nodes.length; i++){
      for(let j = i + 1; j < nodes.length; j++){
        const a = nodes[i], b = nodes[j];
        if(a.face === b.face) continue;
        const dx = a.pos[0]-b.pos[0], dy = a.pos[1]-b.pos[1], dz = a.pos[2]-b.pos[2];
        const d = Math.hypot(dx,dy,dz);
        if(d < 0.76){
          adjacency.get(a.id).add(b.id);
          adjacency.get(b.id).add(a.id);
        }
      }
    }
  }

  function renderCube(){
    FACE_NAMES.forEach(face => {
      const faceEl = document.querySelector(`.face[data-face="${face}"] .face-grid`);
      faceEl.innerHTML = '';
      nodes.filter(node => node.face === face).forEach(node => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tile';
        btn.dataset.id = String(node.id);
        btn.dataset.face = face;
        btn.setAttribute('aria-label', `${face} tile ${node.row+1}, ${node.col+1}: ${board[node.id]}`);
        btn.textContent = board[node.id];
        /* Pointer-down gives instant visual feedback on mouse and touch. It also
           keeps tile selection completely separate from the surrounding drag area. */
        btn.addEventListener('pointerdown', event => {
          event.preventDefault();
          event.stopPropagation();
          selectTile(node.id);
        });
        /* Preserve keyboard activation (Enter/Space produces click with detail 0). */
        btn.addEventListener('click', event => {
          if(event.detail === 0){
            event.preventDefault();
            event.stopPropagation();
            selectTile(node.id);
          }
        });
        faceEl.appendChild(btn);
        tileEls.set(node.id,btn);
      });
    });
    updateTileStates();
  }

  function compatible(nodeId, letter, workingBoard){
    return !workingBoard[nodeId] || workingBoard[nodeId] === letter;
  }

  function isEdgeNode(node){
    return node.row === 0 || node.row === GRID-1 || node.col === 0 || node.col === GRID-1;
  }

  function findPlacement(word, minFaces, workingBoard){
    const starts = nodes.filter(node => compatible(node.id,word[0],workingBoard));
    if(!starts.length) return null;

    for(let attempt = 0; attempt < 1200; attempt++){
      let pool = starts;
      if(minFaces > 1 && Math.random() < 0.84){
        const edges = starts.filter(isEdgeNode);
        if(edges.length) pool = edges;
      }
      const start = pool[randInt(pool.length)];
      const path = [start.id];
      const used = new Set(path);
      const faces = new Set([start.face]);
      let ok = true;

      for(let index = 1; index < word.length; index++){
        const current = nodeById.get(path[path.length-1]);
        const options = [...adjacency.get(current.id)]
          .filter(id => !used.has(id) && compatible(id,word[index],workingBoard))
          .map(id => {
            const node = nodeById.get(id);
            let weight = Math.random() * 2;
            if(node.face !== current.face && faces.size < minFaces) weight += 12;
            if(node.face === current.face && isEdgeNode(node) && faces.size < minFaces) weight += 2.5;
            if(!workingBoard[id]) weight += 0.4;
            return {id,node,weight};
          })
          .sort((a,b) => b.weight-a.weight);

        if(!options.length){ ok = false; break; }
        const shortlist = options.slice(0,Math.min(4,options.length));
        const choice = shortlist[randInt(shortlist.length)];
        path.push(choice.id);
        used.add(choice.id);
        faces.add(choice.node.face);
      }

      if(ok && faces.size >= minFaces) return path;
    }
    return null;
  }

  function chooseTargetWords(){
    const long = shuffle(SPACE_WORDS.filter(word => word.length >= 7));
    const rest = shuffle(SPACE_WORDS.filter(word => word.length >= 4 && word.length <= 8));
    const chosen = [];
    for(const word of [...long.slice(0,2),...rest]){
      if(!chosen.includes(word)) chosen.push(word);
      if(chosen.length === 5) break;
    }
    return chosen;
  }

  function validatePuzzle(words,paths,workingBoard){
    for(const word of words){
      const path=paths.get(word);
      if(!path || path.length!==word.length) return false;
      for(let i=0;i<path.length;i++){
        if(workingBoard[path[i]]!==word[i]) return false;
        if(i>0 && !adjacency.get(path[i-1]).has(path[i])) return false;
      }
    }
    return true;
  }

  function generatePuzzle(){
    for(let puzzleAttempt = 0; puzzleAttempt < 30; puzzleAttempt++){
      const workingBoard = Array(TILE_COUNT).fill('');
      const words = chooseTargetWords().sort((a,b) => b.length-a.length);
      const paths = new Map();
      let failed = false;

      for(let i = 0; i < words.length; i++){
        const word = words[i];
        const minFaces = i === 0 ? 3 : i < 4 ? 2 : 1;
        const path = findPlacement(word,minFaces,workingBoard);
        if(!path){ failed = true; break; }
        path.forEach((id,index) => { workingBoard[id] = word[index]; });
        paths.set(word,path);
      }

      if(failed || !validatePuzzle(words,paths,workingBoard)) continue;
      for(let i = 0; i < workingBoard.length; i++){
        if(!workingBoard[i]) workingBoard[i] = LETTER_POOL[randInt(LETTER_POOL.length)];
      }
      board = workingBoard;
      targets = words;
      targetPaths = paths;
      return;
    }
    throw new Error('Could not generate a playable cube puzzle.');
  }

  function newPuzzle(){
    stopSelectionTimer();
    selected = [];
    foundTargets = new Set();
    foundBonus = new Set();
    solvedNodes = new Set();
    score = 0;
    bonusScore = 0;
    crossFaceFinds = 0;
    winEl.classList.remove('show');
    generatePuzzle();
    renderCube();
    renderTargets();
    renderBonus();
    updateSelectionUI();
    updateStats();
    resetView();
    toast('New cube ready');
  }

  const FACE_NORMALS={
    front:[0,0,1],back:[0,0,-1],right:[1,0,0],left:[-1,0,0],top:[0,1,0],bottom:[0,-1,0]
  };

  function rotatedNormalZ(face){
    const [x,y,z]=FACE_NORMALS[face];
    const rx=rotX*Math.PI/180;
    const ry=rotY*Math.PI/180;
    /* CSS transform: rotateX(...) rotateY(...) => local point is rotated by Y,
       then X. Positive resulting Z faces the viewer. */
    const x1=x*Math.cos(ry)+z*Math.sin(ry);
    const y1=y;
    const z1=-x*Math.sin(ry)+z*Math.cos(ry);
    const y2=y1*Math.cos(rx)-z1*Math.sin(rx);
    const z2=y1*Math.sin(rx)+z1*Math.cos(rx);
    return z2;
  }

  function updateFaceHitTesting(){
    document.querySelectorAll('.face').forEach(faceEl=>{
      const face=faceEl.dataset.face;
      const visible=rotatedNormalZ(face)>0.035;
      faceEl.classList.toggle('hit-visible',visible);
      faceEl.setAttribute('aria-hidden',visible?'false':'true');
    });
  }

  function applyRotation(){
    cube.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    updateFaceHitTesting();
  }

  function resetView(){
    rotX = -18;
    rotY = 32;
    cube.classList.add('settling');
    applyRotation();
    setTimeout(() => cube.classList.remove('settling'),220);
  }

  function selectTile(id){
    if(rotating || evaluating) return;
    const last = selected[selected.length-1];

    if(selected.length > 1 && selected[selected.length-2] === id){
      selected.pop();
      updateSelectionUI();
      if(selected.length) startSelectionTimer(SELECTION_MS);
      else stopSelectionTimer();
      return;
    }
    if(last === id) return;
    if(selected.includes(id)){
      flashTile(id,'invalid');
      toast('That tile is already in the path');
      return;
    }
    if(last !== undefined && !adjacency.get(last).has(id)){
      flashTile(id,'invalid');
      toast('Choose a touching tile');
      return;
    }
    if(selected.length >= MAX_SELECTION){
      toast(`Maximum path length is ${MAX_SELECTION}`);
      return;
    }

    selected.push(id);
    updateSelectionUI();

    /* Target words should feel immediate: as soon as the complete valid path
       spells one of the listed targets, score it automatically. Bonus words
       still use Check word / the longer timer so players can keep extending. */
    const candidate=selectedWord();
    if(targets.includes(candidate) && !foundTargets.has(candidate)){
      stopSelectionTimer();
      setTimeout(() => {
        if(!evaluating && selectedWord() === candidate) evaluateSelection();
      },120);
    }else{
      startSelectionTimer(SELECTION_MS);
    }
  }

  function selectedWord(){
    return selected.map(id => board[id]).join('');
  }

  function selectedFaceCount(){
    return new Set(selected.map(id => nodeById.get(id).face)).size;
  }

  function updateSelectionUI(){
    const word = selectedWord();
    currentWordEl.textContent = word || 'Tap a tile to start';
    const faces = selectedFaceCount();
    selectionMetaEl.textContent = selected.length
      ? `${selected.length} tile${selected.length===1?'':'s'} · ${faces} face${faces===1?'':'s'} · timer pauses while rotating`
      : '8 seconds after every tile · or press Check word';
    checkBtn.disabled = selected.length < 3;
    clearBtn.disabled = selected.length === 0;
    updateTileStates();
  }

  function updateTileStates(){
    tileEls.forEach((el,id) => {
      el.classList.toggle('selected',selected.includes(id));
      el.classList.toggle('solved',solvedNodes.has(id));
      const step = selected.indexOf(id);
      if(step >= 0) el.dataset.step = String(step+1);
      else delete el.dataset.step;
    });
  }

  function startSelectionTimer(duration){
    clearTimeout(timerId);
    timerRemaining = Math.max(1,duration);
    timerStartedAt = performance.now();
    timerId = setTimeout(evaluateSelection,timerRemaining);
    timerBar.style.transition = 'none';
    timerBar.style.width = `${Math.max(0,Math.min(100,timerRemaining/SELECTION_MS*100))}%`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      timerBar.style.transition = `width ${timerRemaining}ms linear`;
      timerBar.style.width = '0%';
    }));
  }

  function pauseSelectionTimer(){
    if(!timerId) return false;
    timerRemaining = Math.max(0,timerRemaining - (performance.now()-timerStartedAt));
    clearTimeout(timerId);
    timerId = null;
    timerBar.style.transition = 'none';
    timerBar.style.width = `${Math.max(0,Math.min(100,timerRemaining/SELECTION_MS*100))}%`;
    return true;
  }

  function resumeSelectionTimer(){
    if(!selected.length || timerRemaining <= 0) return;
    startSelectionTimer(timerRemaining);
  }

  function stopSelectionTimer(){
    clearTimeout(timerId);
    timerId = null;
    timerRemaining = SELECTION_MS;
    timerBar.style.transition = 'none';
    timerBar.style.width = '0%';
  }

  function clearSelection(){
    evaluating = false;
    stopSelectionTimer();
    selected = [];
    updateSelectionUI();
  }

  function evaluateSelection(){
    if(!selected.length || evaluating) return;
    evaluating = true;
    stopSelectionTimer();
    const word = selectedWord();
    const pathSnapshot = [...selected];
    const facesUsed = new Set(pathSnapshot.map(id => nodeById.get(id).face)).size;

    if(targets.includes(word)){
      if(foundTargets.has(word)){
        toast(`${word} already found`);
        flashPath(pathSnapshot,'neutral');
      }else{
        foundTargets.add(word);
        pathSnapshot.forEach(id => solvedNodes.add(id));
        const earned = word.length * TARGET_SCORE + Math.max(0,facesUsed-1)*180;
        score += earned;
        if(facesUsed > 1) crossFaceFinds++;
        toast(`${word} · +${earned} · ${facesUsed} faces`,'success');
        flashPath(pathSnapshot,'success');
        renderTargets();
        if(foundTargets.size === targets.length){
          setTimeout(showWin,520);
        }
      }
    }else if(word.length >= 3 && ENGLISH_WORDS.has(word)){
      if(foundBonus.has(word)){
        toast(`${word} already scored`);
        flashPath(pathSnapshot,'neutral');
      }else{
        foundBonus.add(word);
        const earned = word.length * BONUS_SCORE;
        bonusScore += earned;
        score += earned;
        toast(`Bonus ${word} · +${earned}`,'bonus');
        flashPath(pathSnapshot,'bonus');
        renderBonus();
      }
    }else{
      toast(word.length < 3 ? 'Keep going or clear the path' : `${word} is not in the dictionary`,'error');
      flashPath(pathSnapshot,'invalid');
    }

    updateStats();
    setTimeout(clearSelection,460);
  }

  function flashTile(id,type){
    const el = tileEls.get(id);
    if(!el) return;
    el.classList.add(type);
    setTimeout(() => el.classList.remove(type),360);
  }

  function flashPath(path,type){
    path.forEach(id => tileEls.get(id)?.classList.add(type));
    setTimeout(() => path.forEach(id => tileEls.get(id)?.classList.remove(type)),430);
  }

  function renderTargets(){
    targetList.innerHTML = '';
    targets.forEach(word => {
      const path = targetPaths.get(word) || [];
      const faces = new Set(path.map(id => nodeById.get(id).face)).size;
      const item = document.createElement('div');
      item.className = `target-chip${foundTargets.has(word)?' found':''}`;
      item.innerHTML = `<strong>${word}</strong><span>${faces} face${faces===1?'':'s'}</span>`;
      targetList.appendChild(item);
    });
  }

  function renderBonus(){
    bonusList.innerHTML = '';
    if(!foundBonus.size){
      const empty = document.createElement('span');
      empty.className = 'empty-bonus';
      empty.textContent = ENGLISH_WORDS.size
        ? `${ENGLISH_WORDS.size.toLocaleString()} offline English words available`
        : 'Target words only in this browser';
      bonusList.appendChild(empty);
      return;
    }
    [...foundBonus].slice(-10).reverse().forEach(word => {
      const chip = document.createElement('span');
      chip.className = 'bonus-chip';
      chip.textContent = word;
      bonusList.appendChild(chip);
    });
  }

  function updateStats(){
    foundStat.textContent = `${foundTargets.size}/${targets.length}`;
    scoreStat.textContent = score.toLocaleString();
    bonusStat.textContent = String(foundBonus.size);
    crossStat.textContent = String(crossFaceFinds);
  }

  function showWin(){
    winText.textContent = `You found all ${targets.length} words with ${crossFaceFinds} cross-face finds and scored ${score.toLocaleString()} points.`;
    winEl.classList.add('show');
  }

  function toast(message,type=''){
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.className = `toast show ${type}`;
    toastTimer = setTimeout(() => { toastEl.className = 'toast'; },1900);
  }

  function onRotateStart(event){
    if(event.target.closest('.cube-shell')) return;
    rotating = true;
    dragPointerId = event.pointerId;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    stage.setPointerCapture(event.pointerId);
    cube.classList.remove('settling');
    timerPausedForRotation = pauseSelectionTimer();
    stage.classList.add('rotating');
  }

  function onRotateMove(event){
    if(!rotating || event.pointerId !== dragPointerId) return;
    const dx = event.clientX-lastPointerX;
    const dy = event.clientY-lastPointerY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    rotY += dx * 0.34;
    rotX -= dy * 0.34;
    applyRotation();
  }

  function onRotateEnd(event){
    if(!rotating || event.pointerId !== dragPointerId) return;
    rotating = false;
    dragPointerId = null;
    stage.classList.remove('rotating');
    if(timerPausedForRotation){
      timerPausedForRotation = false;
      resumeSelectionTimer();
    }
  }

  function bindEvents(){
    stage.addEventListener('pointerdown',onRotateStart);
    stage.addEventListener('pointermove',onRotateMove);
    stage.addEventListener('pointerup',onRotateEnd);
    stage.addEventListener('pointercancel',onRotateEnd);
    checkBtn.addEventListener('click',evaluateSelection);
    clearBtn.addEventListener('click',clearSelection);
    newBtn.addEventListener('click',newPuzzle);
    resetViewBtn.addEventListener('click',resetView);
    nextCubeBtn.addEventListener('click',newPuzzle);
    document.addEventListener('keydown',event => {
      if(event.key === 'Escape') clearSelection();
      if(event.key === 'Enter' && selected.length >= 3) evaluateSelection();
    });
  }

  try{
    buildGraph();
    bindEvents();
    newPuzzle();
    applyRotation();
  }catch(error){
    console.error(error);
    currentWordEl.textContent = 'Could not generate cube';
    selectionMetaEl.textContent = 'Reload the page to try again.';
  }
})();
