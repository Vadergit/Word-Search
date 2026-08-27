from pathlib import Path

index_path=Path('index.html')
cube_js_path=Path('cube/cube.js')
cube_html_path=Path('cube/index.html')
cube_css_path=Path('cube/cube.css')

index=index_path.read_text(encoding='utf-8')
cube_js=cube_js_path.read_text(encoding='utf-8')
cube_html=cube_html_path.read_text(encoding='utf-8')
cube_css=cube_css_path.read_text(encoding='utf-8')

def rep(text, old, new, label, count=1):
    if old not in text:
        raise SystemExit(f'Missing patch anchor: {label}')
    return text.replace(old,new,count)

# ---------------------------------------------------------------------------
# Version bump and 2D menu integration: Cube keeps the same 3 difficulty
# choices instead of hiding them.
# ---------------------------------------------------------------------------
index=index.replace('v1.0.0','v1.1.0')
index=index.replace('themes.js?v=1.0.0','themes.js?v=1.1.0')

index=rep(index,
'''  let pendingGameType = localStorage.getItem("anitasWordPathPreferredGameType")==="3d"?"3d":"2d";\n  let pendingGrid = 6;\n  let pendingDifficulty = "beginner";''',
'''  let pendingGameType = localStorage.getItem("anitasWordPathPreferredGameType")==="3d"?"3d":"2d";\n  let pendingGrid = 6;\n  const savedDifficulty=localStorage.getItem("anitasWordPathPreferredDifficulty");\n  let pendingDifficulty = ["beginner","middle","hard"].includes(savedDifficulty)?savedDifficulty:"beginner";''',
'preferred difficulty state')

index=rep(index,
'''  function updateGameTypeUI(){\n    const cube=pendingGameType==="3d";\n    gridSetting.classList.toggle("hidden",cube);\n    difficultySetting.classList.toggle("hidden",cube);\n    modeSetting.classList.toggle("hidden",cube);\n    startBtn.textContent=cube?"Start 3D cube":"Start 2D game";\n    setSelectedChoice(gameTypeChoices,"gameType",pendingGameType);\n    updatePausedResumeButton();\n  }''',
'''  function updateGameTypeUI(){\n    const cube=pendingGameType==="3d";\n    gridSetting.classList.toggle("hidden",cube);\n    difficultySetting.classList.remove("hidden");\n    modeSetting.classList.toggle("hidden",cube);\n    startBtn.textContent=cube?`Start 3D cube · ${pendingDifficulty}`:"Start 2D game";\n    setSelectedChoice(gameTypeChoices,"gameType",pendingGameType);\n    setSelectedChoice(difficultyChoices,"difficulty",pendingDifficulty);\n\n    const beginnerCopy=difficultyChoices.querySelector('[data-difficulty="beginner"] span');\n    const middleCopy=difficultyChoices.querySelector('[data-difficulty="middle"] span');\n    const hardCopy=difficultyChoices.querySelector('[data-difficulty="hard"] span');\n    if(cube){\n      if(beginnerCopy)beginnerCopy.textContent="Target list + hints · shorter, easier cross-face routes.";\n      if(middleCopy)middleCopy.textContent="Hidden target list + hints · more cross-face routes.";\n      if(hardCopy)hardCopy.textContent="No target list or hints · longer, more complex routes.";\n    }else{\n      if(beginnerCopy)beginnerCopy.textContent="Full word list + hints.";\n      if(middleCopy)middleCopy.textContent="No word list, but hints are available.";\n      if(hardCopy)hardCopy.textContent="No word list and no hints.";\n    }\n    updatePausedResumeButton();\n  }''',
'game type difficulty UI')

index=rep(index,
'''  difficultyChoices.addEventListener("click",e=>{\n    const btn=e.target.closest("[data-difficulty]");\n    if(!btn) return;\n    pendingDifficulty=btn.dataset.difficulty;\n    setSelectedChoice(difficultyChoices,"difficulty",pendingDifficulty);\n  });''',
'''  difficultyChoices.addEventListener("click",e=>{\n    const btn=e.target.closest("[data-difficulty]");\n    if(!btn) return;\n    pendingDifficulty=btn.dataset.difficulty;\n    try{localStorage.setItem("anitasWordPathPreferredDifficulty",pendingDifficulty)}catch(_){}\n    setSelectedChoice(difficultyChoices,"difficulty",pendingDifficulty);\n    updateGameTypeUI();\n  });''',
'difficulty persistence')

index=rep(index,
'''  async function startGame(){\n    if(pendingGameType==="3d"){\n      window.location.href="cube/";\n      return;\n    }''',
'''  async function startGame(){\n    if(pendingGameType==="3d"){\n      try{\n        localStorage.setItem("anitasWordCubeDifficulty",pendingDifficulty);\n        localStorage.setItem("anitasWordPathPreferredDifficulty",pendingDifficulty);\n      }catch(_){}\n      window.location.href="cube/";\n      return;\n    }''',
'cube difficulty handoff')

# ---------------------------------------------------------------------------
# Cube v1.1.0: shared three difficulty levels, proper hint behaviour and
# difficulty-aware word/path generation.
# ---------------------------------------------------------------------------
cube_js=cube_js.replace("const APP_VERSION = '1.0.0';","const APP_VERSION = '1.1.0';",1)

cube_js=rep(cube_js,
"  const ENGLISH_WORDS = window.ANITAS_ENGLISH_WORDS instanceof Set ? window.ANITAS_ENGLISH_WORDS : new Set();\n",
"""  const ENGLISH_WORDS = window.ANITAS_ENGLISH_WORDS instanceof Set ? window.ANITAS_ENGLISH_WORDS : new Set();
  const CUBE_DIFFICULTY_KEY='anitasWordCubeDifficulty';
  const CUBE_DIFFICULTIES={
    beginner:{label:'Beginner',minLen:3,maxLen:8,counts:[10,11,12,9,8],minCross:2,maxCross:4},
    middle:{label:'Middle',minLen:4,maxLen:11,counts:[7,8,9,10,6,11],minCross:3,maxCross:6},
    hard:{label:'Hard',minLen:5,maxLen:14,counts:[5,6,7,8,9],minCross:4,maxCross:99}
  };
  const storedCubeDifficulty=localStorage.getItem(CUBE_DIFFICULTY_KEY)||localStorage.getItem('anitasWordPathPreferredDifficulty')||'beginner';
  let cubeDifficulty=CUBE_DIFFICULTIES[storedCubeDifficulty]?storedCubeDifficulty:'beginner';
""",
'cube difficulty config')

cube_js=rep(cube_js,
"  const wordThemeNameEl = document.getElementById('wordThemeName');\n  const cubePlayerNameEl = document.getElementById('cubePlayerName');\n  const switchProfileBtn = document.getElementById('switchProfileBtn');",
"""  const wordThemeNameEl = document.getElementById('wordThemeName');
  const cubePlayerNameEl = document.getElementById('cubePlayerName');
  const cubeDifficultyBadge = document.getElementById('cubeDifficultyBadge');
  const difficultyMessageEl = document.getElementById('difficultyMessage');
  const hintBtn = document.getElementById('hintBtn');
  const switchProfileBtn = document.getElementById('switchProfileBtn');""",
'cube difficulty DOM')

cube_js=rep(cube_js,
"  let cubeRecorded = false;",
"""  let cubeRecorded = false;
  let hintNodes = new Set();
  let hintTimer = null;
  let cubeHints = 0;""",
'cube hint state')

cube_js=cube_js.replace("  let currentTheme = 'dark';","  let currentTheme = 'light';",1)

cube_js=rep(cube_js,
"""    dark:{
      face:'#2d3331',core:'#252a29',faceStroke:'rgba(101,223,195,.24)',tile:'#e9eee8',tileText:'#10201a',
      tileStroke:'rgba(9,27,21,.24)',selected:'#65dfc3',selectedStroke:'#d8fff4',
      solved:'#aee17f',solvedStroke:'#d8ffb9',invalid:'#ef9f96',pathUnder:'rgba(4,14,11,.88)'
    },
    light:{
      face:'#555d5a',core:'#414744',faceStroke:'rgba(33,111,90,.30)',tile:'#fbfdfa',tileText:'#173028',
      tileStroke:'rgba(23,48,40,.24)',selected:'#55d7b9',selectedStroke:'#147e67',
      solved:'#b9e58f',solvedStroke:'#5d9634',invalid:'#ef9f96',pathUnder:'rgba(255,255,255,.96)'
    }""",
"""    dark:{
      face:'#2d3331',core:'#252a29',faceStroke:'rgba(101,223,195,.24)',tile:'#e9eee8',tileText:'#10201a',
      tileStroke:'rgba(9,27,21,.24)',selected:'#65dfc3',selectedStroke:'#d8fff4',
      solved:'#aee17f',solvedStroke:'#d8ffb9',hint:'#efca6b',hintStroke:'#fff0b3',invalid:'#ef9f96',pathUnder:'rgba(4,14,11,.88)'
    },
    light:{
      face:'#555d5a',core:'#414744',faceStroke:'rgba(33,111,90,.30)',tile:'#fbfdfa',tileText:'#173028',
      tileStroke:'rgba(23,48,40,.24)',selected:'#55d7b9',selectedStroke:'#147e67',
      solved:'#b9e58f',solvedStroke:'#5d9634',hint:'#f1cf70',hintStroke:'#9a7315',invalid:'#ef9f96',pathUnder:'rgba(255,255,255,.96)'
    }""",
'canvas hint colours')

cube_js=rep(cube_js,
"""  function chooseCoverWords(pool,total=TILE_COUNT){
    const recent=new Set(playerStats.recentWords||[]);
    const words=shuffle([...new Set(pool)].filter(w=>w.length>=3 && w.length<=14)).sort((a,b)=>Number(recent.has(a))-Number(recent.has(b)));
    const states=new Map([[`0:0`,[]]]);
    for(const word of words){
      const snapshot=[...states.entries()];
      for(const [key,list] of snapshot){
        const [sum,count]=key.split(':').map(Number);
        if(count>=10) continue;
        const next=sum+word.length;
        if(next>total) continue;
        const nextKey=`${next}:${count+1}`;
        if(!states.has(nextKey)) states.set(nextKey,[...list,word]);
      }
    }
    for(const count of [7,8,9,10,6,11,5,12,4]){
      const hit=states.get(`${total}:${count}`);
      if(hit) return shuffle(hit);
    }
    return null;
  }""",
"""  function chooseCoverWords(pool,total=TILE_COUNT){
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
  }""",
'difficulty cover words')

cube_js=rep(cube_js,
"""        const crossFaceCount=words.filter(word=>new Set(paths.get(word).map(id=>nodeById.get(id).face)).size>1).length;
        if(crossFaceCount<3) continue;
        if(!validateUniqueTargets(words,paths,working)) continue;""",
"""        const cfg=CUBE_DIFFICULTIES[cubeDifficulty];
        const faceCounts=words.map(word=>new Set(paths.get(word).map(id=>nodeById.get(id).face)).size);
        const crossFaceCount=faceCounts.filter(count=>count>1).length;
        const crossBurden=faceCounts.reduce((sum,count)=>sum+Math.max(0,count-1),0);
        if(crossFaceCount<cfg.minCross || crossFaceCount>cfg.maxCross) continue;
        if(cubeDifficulty==='hard' && crossBurden<4) continue;
        if(!validateUniqueTargets(words,paths,working)) continue;""",
'difficulty path complexity')

cube_js=rep(cube_js,
"    const maxThemes=Math.min(4,themeOrder.length);",
"    const maxThemes=Math.min(6,themeOrder.length);",
'cube generation theme fallback')

cube_js=rep(cube_js,
"""  function tileFill(id){
    const p=canvasTheme();
    if(selected.includes(id)) return p.selected;
    if(solvedNodes.has(id)) return p.solved;
    if(flashUntil.get(id)>performance.now()) return p.invalid;
    return p.tile;
  }""",
"""  function tileFill(id){
    const p=canvasTheme();
    if(selected.includes(id)) return p.selected;
    if(hintNodes.has(id)) return p.hint;
    if(solvedNodes.has(id)) return p.solved;
    if(flashUntil.get(id)>performance.now()) return p.invalid;
    return p.tile;
  }""",
'tile hint fill')

cube_js=rep(cube_js,
"""      beginPoly(tile.quad); ctx.fillStyle=tileFill(tile.id); ctx.fill();
      ctx.lineWidth=selected.includes(tile.id)?3.5:1.3;
      ctx.strokeStyle=selected.includes(tile.id)?p.selectedStroke:solvedNodes.has(tile.id)?p.solvedStroke:p.tileStroke; ctx.stroke();""",
"""      beginPoly(tile.quad); ctx.fillStyle=tileFill(tile.id); ctx.fill();
      const hinted=hintNodes.has(tile.id);
      ctx.lineWidth=selected.includes(tile.id)?3.5:hinted?3:1.3;
      ctx.strokeStyle=selected.includes(tile.id)?p.selectedStroke:hinted?p.hintStroke:solvedNodes.has(tile.id)?p.solvedStroke:p.tileStroke; ctx.stroke();""",
'tile hint stroke')

cube_js=rep(cube_js,
"""  function makeCubeFingerprint(){
    const targetKey=[...targets].sort().join(',');
    return `CUBE-${activeWordTheme.name}-${hashText(`${board.join('')}|${targetKey}`).toString(36).toUpperCase()}`;
  }""",
"""  function makeCubeFingerprint(){
    const targetKey=[...targets].sort().join(',');
    return `CUBE-${cubeDifficulty}-${activeWordTheme.name}-${hashText(`${board.join('')}|${targetKey}`).toString(36).toUpperCase()}`;
  }""",
'fingerprint difficulty')

cube_js=rep(cube_js,
"""  function newPuzzle(){
    stopSelectionTimer(); selected=[]; foundTargets=new Set(); foundBonus=new Set(); foundPathByWord=new Map(); solvedNodes=new Set(); cubeCleared=false;
    score=0; bonusScore=0; crossFaceFinds=0; evaluating=false; cubeRecorded=false; winEl.classList.remove('show');
    let guard=0;
    do{ generatePuzzle(); cubePuzzleFingerprint=makeCubeFingerprint(); guard++; }
    while(playerStats.completedFingerprints.includes(cubePuzzleFingerprint) && guard<24);
    cubePuzzleCode=`WC-${Date.now().toString(36).toUpperCase()}-${activeWordTheme.name.toUpperCase()}`;
    wordThemeNameEl.textContent=`${activeWordTheme.name} set`; renderTargets(); renderBonus(); updateSelectionUI(); updateStats(); resetView(false); draw(); toast(`New ${activeWordTheme.name} cube · ${activeProfileName} · v${APP_VERSION}`);
  }""",
"""  function newPuzzle(){
    stopSelectionTimer(); clearTimeout(hintTimer); hintNodes=new Set(); selected=[]; foundTargets=new Set(); foundBonus=new Set(); foundPathByWord=new Map(); solvedNodes=new Set(); cubeCleared=false;
    score=0; bonusScore=0; crossFaceFinds=0; cubeHints=0; evaluating=false; cubeRecorded=false; winEl.classList.remove('show');
    let guard=0;
    do{ generatePuzzle(); cubePuzzleFingerprint=makeCubeFingerprint(); guard++; }
    while(playerStats.completedFingerprints.includes(cubePuzzleFingerprint) && guard<24);
    cubePuzzleCode=`WC-${Date.now().toString(36).toUpperCase()}-${cubeDifficulty.toUpperCase()}-${activeWordTheme.name.toUpperCase()}`;
    wordThemeNameEl.textContent=`${activeWordTheme.name} set`; updateDifficultyUI(); renderTargets(); renderBonus(); updateSelectionUI(); updateStats(); resetView(false); draw(); toast(`New ${CUBE_DIFFICULTIES[cubeDifficulty].label} ${activeWordTheme.name} cube · ${activeProfileName} · v${APP_VERSION}`);
  }""",
'new puzzle difficulty')

cube_js=rep(cube_js,
"""  function renderTargets(){
    targetList.innerHTML='';
    for(const word of targets){
      const path=targetPaths.get(word)||[],faces=new Set(path.map(id=>nodeById.get(id).face)).size,item=document.createElement('div');
      item.className=`target-chip${foundTargets.has(word)?' found':''}`; item.innerHTML=`<strong>${word}</strong><span>${faces} face${faces===1?'':'s'}</span>`; targetList.appendChild(item);
    }
  }""",
"""  function updateDifficultyUI(){
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
  }""",
'cube difficulty rendering and hints')

cube_js=rep(cube_js,
"""    winText.textContent=`${activeProfileName}, you cleared the ${activeWordTheme.name} cube: all ${TILE_COUNT} letters, ${targets.length} target words, ${crossFaceFinds} cross-face finds and ${score.toLocaleString()} points.`;""",
"""    winText.textContent=`${activeProfileName}, you cleared the ${CUBE_DIFFICULTIES[cubeDifficulty].label} ${activeWordTheme.name} cube: all ${TILE_COUNT} letters, ${targets.length} target words, ${crossFaceFinds} cross-face finds, ${cubeHints} hints and ${score.toLocaleString()} points.`;""",
'win difficulty')

cube_js=rep(cube_js,
"""    checkBtn.addEventListener('click',evaluateSelection); clearBtn.addEventListener('click',clearSelection); newBtn.addEventListener('click',newPuzzle); resetViewBtn.addEventListener('click',()=>resetView(true)); nextCubeBtn.addEventListener('click',newPuzzle); themeBtn.addEventListener('click',()=>applyTheme(currentTheme==='light'?'dark':'light'));
    switchProfileBtn.addEventListener('click',()=>{localStorage.removeItem('anitasWordPathActiveProfile');sessionStorage.removeItem('anitasWordPathActiveProfile');window.location.href='../';});""",
"""    checkBtn.addEventListener('click',evaluateSelection); clearBtn.addEventListener('click',clearSelection); hintBtn.addEventListener('click',showHint); newBtn.addEventListener('click',newPuzzle); resetViewBtn.addEventListener('click',()=>resetView(true)); nextCubeBtn.addEventListener('click',newPuzzle); themeBtn.addEventListener('click',()=>applyTheme(currentTheme==='light'?'dark':'light'));
    switchProfileBtn.addEventListener('click',()=>{localStorage.removeItem('anitasWordPathActiveProfile');sessionStorage.removeItem('anitasWordPathActiveProfile');window.location.href='../';});""",
'hint event')

# ---------------------------------------------------------------------------
# Cube markup/CSS.
# ---------------------------------------------------------------------------
cube_html=cube_html.replace('v1.0.0','v1.1.0')
cube_html=cube_html.replace('cube.css?v=0.8.0','cube.css?v=1.1.0')
cube_html=cube_html.replace('cube.js?v=0.8.0','cube.js?v=1.1.0')
cube_html=cube_html.replace('themes.js?v=1.0.0','themes.js?v=1.1.0')

cube_html=rep(cube_html,
'''        <span class="profile-badge" id="cubePlayerName">Player</span>\n        <a class="ghost-btn" href="../">Game menu</a>''',
'''        <span class="profile-badge" id="cubePlayerName">Player</span>\n        <span class="difficulty-badge" id="cubeDifficultyBadge">Beginner</span>\n        <a class="ghost-btn" href="../">Game menu</a>''',
'cube difficulty badge')

cube_html=rep(cube_html,
'''          <div class="selection-actions">\n            <button class="secondary-btn" id="clearBtn" type="button" disabled>Clear</button>\n            <button class="primary-btn" id="checkBtn" type="button" disabled>Check word</button>\n          </div>''',
'''          <div class="selection-actions">\n            <button class="secondary-btn" id="hintBtn" type="button">Hint</button>\n            <button class="secondary-btn" id="clearBtn" type="button" disabled>Clear</button>\n            <button class="primary-btn" id="checkBtn" type="button" disabled>Check word</button>\n          </div>''',
'cube hint button')

cube_html=rep(cube_html,
'''          <p class="section-copy">The 3D cube uses the same 19 themes and 936+ theme words as the 2D game. Every tile belongs to exactly one target route, all 54 letters are covered, and every target has exactly one valid path.</p>\n          <div class="target-list" id="targetList"></div>''',
'''          <p class="section-copy">The 3D cube uses the same 19 themes and 936+ theme words as the 2D game. Every tile belongs to exactly one target route, all 54 letters are covered, and every target has exactly one valid path.</p>\n          <div class="difficulty-message" id="difficultyMessage"></div>\n          <div class="target-list" id="targetList"></div>''',
'cube difficulty message')

cube_html=cube_html.replace('<p><b>Finish:</b> target words are recognised automatically. For bonus words, wait 8 seconds or use <em>Check word</em>.</p>',
'<p><b>Difficulty:</b> Beginner shows targets + hints, Middle hides targets but keeps hints, Hard hides both and uses more complex routes.</p>\n          <p><b>Finish:</b> target words are recognised automatically. For bonus words, wait 8 seconds or use <em>Check word</em>.</p>',1)

if '.difficulty-badge{' not in cube_css:
    cube_css += '''\n.difficulty-badge{display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(69,205,176,.35);border-radius:999px;padding:9px 12px;background:rgba(69,205,176,.10);color:var(--text);font-size:12px;font-weight:900;white-space:nowrap}\n.difficulty-message{margin:0 0 12px;padding:9px 10px;border:1px solid var(--line);border-radius:12px;background:var(--panel-2);color:var(--muted);font-size:10px;line-height:1.45}\n.difficulty-target-message{grid-column:1/-1;padding:18px 12px;border:1px dashed var(--line-strong);border-radius:13px;text-align:center;color:var(--muted);font-size:11px;line-height:1.5;background:var(--panel-2)}\n.hidden{display:none!important}\n'''

index_path.write_text(index,encoding='utf-8')
cube_js_path.write_text(cube_js,encoding='utf-8')
cube_html_path.write_text(cube_html,encoding='utf-8')
cube_css_path.write_text(cube_css,encoding='utf-8')
print('Applied 3D difficulty integration v1.1.0')
