from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8')

def rep(old,new,label):
    global text
    if old not in text:
        raise SystemExit(f'Missing {label}')
    text=text.replace(old,new,1)

# CSS
css='''
    .pause-overlay{position:fixed;inset:0;background:rgba(10,20,12,.56);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;padding:20px;z-index:170}
    .pause-overlay.show{display:flex}
    .pause-card{width:min(440px,100%);background:#fff;border-radius:26px;padding:30px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.25)}
    .pause-icon{width:58px;height:58px;border-radius:50%;margin:0 auto 12px;display:grid;place-items:center;background:#edf3ed;font-size:25px;font-weight:900}
    .pause-card h3{font-size:29px;margin:6px 0 8px;letter-spacing:-.035em}
    .pause-card p{margin:0 0 16px;color:var(--muted);font-size:13px;line-height:1.55}
    .pause-progress{padding:11px 12px;border-radius:13px;background:#f6f9f6;border:1px solid var(--line);font-size:12px;font-weight:800;margin-bottom:14px}
    .pause-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .btn.danger{background:#f6e9e7;color:#8d3f36}
    .resume-start{margin-top:10px;background:#edf3ed!important;color:#203026!important;border:1px solid #dce6dc!important}
'''
rep('    @media(max-width:900px){',css+'\n    @media(max-width:900px){','CSS anchor')

# Start resume button
rep('''    <button class="start-btn" id="startBtn" type="button">Start game</button>''','''    <button class="start-btn resume-start hidden" id="resumePausedBtn" type="button">Resume paused puzzle</button>
    <button class="start-btn" id="startBtn" type="button">Start game</button>''','start button')

# Game pause/end buttons
rep('''        <button class="mode-button" id="soundBtn" type="button">Sound on</button>
        <button class="mode-button" id="changeModeBtn" type="button">Change mode</button>''','''        <button class="mode-button" id="soundBtn" type="button">Sound on</button>
        <button class="mode-button" id="pauseBtn" type="button">Pause</button>
        <button class="mode-button" id="endGameBtn" type="button">End game</button>
        <button class="mode-button" id="changeModeBtn" type="button">Change mode</button>''','game action buttons')

# Pause/end overlay before script
pause_html='''
<div class="pause-overlay" id="pauseOverlay" role="dialog" aria-modal="true" aria-labelledby="pauseTitle">
  <div class="pause-card">
    <div class="pause-icon" id="pauseIcon">Ⅱ</div>
    <h3 id="pauseTitle">Game paused</h3>
    <p id="pauseMessage">Your current puzzle is saved locally and can be continued later.</p>
    <div class="pause-progress" id="pauseProgress"></div>
    <div class="pause-actions">
      <button class="btn secondary" id="resumeGameBtn" type="button">Resume</button>
      <button class="btn danger" id="endGameConfirmBtn" type="button">End game</button>
    </div>
  </div>
</div>
'''
rep('\n<script>\n(() => {',pause_html+'\n<script>\n(() => {','script anchor')

# DOM refs
rep('''  const shareBtn = document.getElementById("shareBtn");''','''  const shareBtn = document.getElementById("shareBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const endGameBtn = document.getElementById("endGameBtn");
  const pauseOverlay = document.getElementById("pauseOverlay");
  const pauseTitle = document.getElementById("pauseTitle");
  const pauseMessage = document.getElementById("pauseMessage");
  const pauseProgress = document.getElementById("pauseProgress");
  const pauseIcon = document.getElementById("pauseIcon");
  const resumeGameBtn = document.getElementById("resumeGameBtn");
  const endGameConfirmBtn = document.getElementById("endGameConfirmBtn");
  const resumePausedBtn = document.getElementById("resumePausedBtn");''','DOM refs')

# State
rep('''  let evaluating = false;''','''  let evaluating = false;
  let isPaused = false;
  let resetDeadline = 0;
  let pausedResetRemaining = 0;
  let pauseOverlayMode = "pause";''','pause state')

# Storage helpers before puzzleFingerprint
rep('''  function puzzleFingerprint(){''','''  function pausedStorageKey(name=activeProfileName){
    return `anitasWordPathPausedGame:${name}`;
  }

  function getPausedSnapshot(){
    if(!activeProfileName)return null;
    try{return JSON.parse(localStorage.getItem(pausedStorageKey())||"null")}catch(_){return null}
  }

  function clearPausedSnapshot(){
    if(!activeProfileName)return;
    try{localStorage.removeItem(pausedStorageKey())}catch(_){/* optional storage */}
    updatePausedResumeButton();
  }

  function updatePausedResumeButton(){
    if(!resumePausedBtn)return;
    const snapshot=getPausedSnapshot();
    resumePausedBtn.classList.toggle("hidden",!snapshot);
    if(snapshot){
      const progress=(snapshot.foundTargets||[]).length;
      const total=(snapshot.targets||[]).length;
      resumePausedBtn.textContent=`Resume paused puzzle · ${progress}/${total}`;
    }
  }

  function puzzleFingerprint(){''','paused storage helpers')

# Login updates resume button
rep('''    renderProfileSummary();
    updateSoundButton();
    loginScreen.classList.add("hidden");''','''    renderProfileSummary();
    updateSoundButton();
    updatePausedResumeButton();
    loginScreen.classList.add("hidden");''','login resume button')

# Reset selection tracks deadline
rep('''    resetTimer=null;
    evaluating=false;''','''    resetTimer=null;
    resetDeadline=0;
    pausedResetRemaining=0;
    evaluating=false;''','reset deadline')

# startAutoReset supports remaining pause duration
old='''  function startAutoReset(){
    clearTimeout(resetTimer);
    timeoutBar.style.transition="none";
    timeoutBar.style.width="100%";
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      timeoutBar.style.transition=`width ${RESET_DELAY}ms linear`;
      timeoutBar.style.width="0%";
    }));
    resetTimer=setTimeout(evaluateAtTimeout,RESET_DELAY);
  }'''
new='''  function startAutoReset(delay=RESET_DELAY){
    clearTimeout(resetTimer);
    if(isPaused)return;
    const duration=Math.max(1,Math.min(RESET_DELAY,Number(delay)||RESET_DELAY));
    resetDeadline=Date.now()+duration;
    timeoutBar.style.transition="none";
    timeoutBar.style.width=`${Math.max(0,Math.min(100,duration/RESET_DELAY*100))}%`;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      timeoutBar.style.transition=`width ${duration}ms linear`;
      timeoutBar.style.width="0%";
    }));
    resetTimer=setTimeout(evaluateAtTimeout,duration);
  }'''
rep(old,new,'startAutoReset')

# Evaluation and click guards
rep('''  function evaluateAtTimeout(){
    if(evaluating||!selected.length)return;''','''  function evaluateAtTimeout(){
    if(isPaused||evaluating||!selected.length)return;''','evaluation pause guard')
rep('''  function clickCell(idx){
    if(evaluating)return;''','''  function clickCell(idx){
    if(isPaused||evaluating)return;''','click pause guard')
rep('''  function showHint(){
    if(difficulty==="hard")return;''','''  function showHint(){
    if(isPaused||difficulty==="hard")return;''','hint pause guard')

# Pause/resume/end functions before starRating
rep('''  function starRating(){''','''  function savePausedGame(){
    if(!activeProfileName||!board.length)return;
    const snapshot={
      savedAt:Date.now(),SIZE,difficulty,activeGameMode,customSeed,puzzleSeed,
      board:[...board],targets:[...targets],intendedPaths:[...intendedPaths.entries()],foundPaths:[...foundPaths.entries()],
      foundTargets:[...foundTargets],foundBonus:[...foundBonus],selected:[...selected],score,bonusPoints,
      comboCount,bestPuzzleCombo,bonusChain,puzzleMistakes,puzzleHints,rareFound,longestPuzzleWord,
      challenge,challengeAwarded,puzzleRecorded,currentPathVariety,currentPuzzleFingerprint,
      currentThemeName:currentTheme?.name||"",previousThemeName,pausedResetRemaining
    };
    try{localStorage.setItem(pausedStorageKey(),JSON.stringify(snapshot))}catch(_){/* optional storage */}
    updatePausedResumeButton();
  }

  function showPauseOverlay(mode="pause"){
    pauseOverlayMode=mode;
    pauseIcon.textContent=mode==="end"?"×":"Ⅱ";
    pauseTitle.textContent=mode==="end"?"End current puzzle?":"Game paused";
    pauseMessage.textContent=mode==="end"
      ?"This unfinished puzzle will be discarded and will not count in your statistics. Completed puzzles stay saved."
      :"Your current puzzle is saved locally. You can resume now or come back later.";
    resumeGameBtn.textContent=mode==="end"?"Keep playing":"Resume";
    pauseProgress.textContent=`${foundTargets.size}/${targets.length} theme words · ${score} points`;
    pauseOverlay.classList.add("show");
  }

  function pauseGame(mode="pause"){
    if(isPaused){showPauseOverlay(mode);return;}
    if(evaluating){setTimeout(()=>pauseGame(mode),RESULT_DISPLAY_MS+30);return;}
    isPaused=true;
    pointerSelecting=false;
    if(selected.length&&resetTimer){
      pausedResetRemaining=Math.max(1,resetDeadline-Date.now());
      clearTimeout(resetTimer);
      resetTimer=null;
      resetDeadline=0;
      timeoutBar.style.transition="none";
      timeoutBar.style.width=`${Math.max(0,Math.min(100,pausedResetRemaining/RESET_DELAY*100))}%`;
    }else if(selected.length){
      pausedResetRemaining=RESET_DELAY;
    }else{
      pausedResetRemaining=0;
    }
    savePausedGame();
    showPauseOverlay(mode);
  }

  function resumeGame(){
    pauseOverlay.classList.remove("show");
    isPaused=false;
    const remaining=pausedResetRemaining;
    clearPausedSnapshot();
    if(selected.length)startAutoReset(remaining||RESET_DELAY);
    else{pausedResetRemaining=0;resetDeadline=0;}
  }

  function endCurrentGame(){
    clearTimeout(resetTimer);
    resetTimer=null;
    resetDeadline=0;
    pausedResetRemaining=0;
    isPaused=false;
    pointerSelecting=false;
    pauseOverlay.classList.remove("show");
    winEl.classList.remove("show");
    clearPausedSnapshot();
    selected=[];
    evaluating=false;
    gameScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
    modeLocked=false;
    renderProfileSummary();
    updatePausedResumeButton();
  }

  function restoreTheme(name){
    if(name==="Mixed"){
      const source=THEME_POOLS.filter(t=>isThemeUnlocked(t.name));
      return{name:"Mixed",words:[...new Set(source.flatMap(t=>t.words))]};
    }
    return THEME_POOLS.find(t=>t.name===name)||THEME_POOLS[0];
  }

  function restorePausedGame(){
    const s=getPausedSnapshot();
    if(!s)return;
    SIZE=s.SIZE||6;
    difficulty=s.difficulty||"beginner";
    activeGameMode=s.activeGameMode||"classic";
    customSeed=s.customSeed||"";
    puzzleSeed=s.puzzleSeed||"";
    modeLocked=true;
    configureGrid();
    updateDifficultyUI();
    board=[...(s.board||[])];
    targets=[...(s.targets||[])];
    intendedPaths=new Map(s.intendedPaths||[]);
    foundPaths=new Map(s.foundPaths||[]);
    foundTargets=new Set(s.foundTargets||[]);
    foundBonus=new Set(s.foundBonus||[]);
    selected=[...(s.selected||[])];
    score=s.score||0;bonusPoints=s.bonusPoints||0;comboCount=s.comboCount||0;
    bestPuzzleCombo=s.bestPuzzleCombo||0;bonusChain=s.bonusChain||0;puzzleMistakes=s.puzzleMistakes||0;
    puzzleHints=s.puzzleHints||0;rareFound=s.rareFound||0;longestPuzzleWord=s.longestPuzzleWord||"";
    challenge=s.challenge||null;challengeAwarded=Boolean(s.challengeAwarded);puzzleRecorded=Boolean(s.puzzleRecorded);
    currentPathVariety=s.currentPathVariety||0;currentPuzzleFingerprint=s.currentPuzzleFingerprint||"";
    currentTheme=restoreTheme(s.currentThemeName);previousThemeName=s.previousThemeName||currentTheme.name;
    pausedResetRemaining=s.pausedResetRemaining||0;
    isPaused=false;
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    pauseOverlay.classList.remove("show");
    renderBoard();
    foundTargets.forEach(word=>{
      document.getElementById("word-"+word)?.classList.add("found");
      const path=foundPaths.get(word)||intendedPaths.get(word)||[];
      path.forEach(i=>boardEl.children[i]?.classList.add("found"));
    });
    updateSelectionUI();
    updateHUD();
    clearPausedSnapshot();
    if(selected.length)startAutoReset(pausedResetRemaining||RESET_DELAY);
  }

  function starRating(){''','pause functions')

# New puzzle resets pause overlay/state
rep('''    evaluating=false;
    winEl.classList.remove("show");
    clearTimeout(resetTimer);''','''    evaluating=false;
    isPaused=false;
    pausedResetRemaining=0;
    resetDeadline=0;
    pauseOverlay.classList.remove("show");
    winEl.classList.remove("show");
    clearTimeout(resetTimer);''','new puzzle pause reset')

# Starting a new game intentionally abandons an old paused snapshot
rep('''  async function startGame(){
    parseSeedCode(seedInput.value);''','''  async function startGame(){
    clearPausedSnapshot();
    parseSeedCode(seedInput.value);''','start game clears paused')

# changeMode behaves as an intentional end of current unfinished puzzle
rep('''  function changeMode(){
    clearTimeout(resetTimer);
    winEl.classList.remove("show");''','''  function changeMode(){
    clearTimeout(resetTimer);
    isPaused=false;
    pauseOverlay.classList.remove("show");
    clearPausedSnapshot();
    winEl.classList.remove("show");''','change mode pause cleanup')

# bindings
rep('''  shareBtn.addEventListener("click",shareResult);
  soundBtn.addEventListener("click",()=>{playerStats.soundEnabled=!playerStats.soundEnabled;saveStats();updateSoundButton()});''','''  shareBtn.addEventListener("click",shareResult);
  pauseBtn.addEventListener("click",()=>pauseGame("pause"));
  endGameBtn.addEventListener("click",()=>pauseGame("end"));
  resumeGameBtn.addEventListener("click",resumeGame);
  endGameConfirmBtn.addEventListener("click",endCurrentGame);
  resumePausedBtn.addEventListener("click",restorePausedGame);
  soundBtn.addEventListener("click",()=>{playerStats.soundEnabled=!playerStats.soundEnabled;saveStats();updateSoundButton()});''','pause bindings')

# resumed session shows paused game availability
rep('''    renderProfileSummary();
    loginScreen.classList.add("hidden");''','''    renderProfileSummary();
    updatePausedResumeButton();
    loginScreen.classList.add("hidden");''','session resume paused button')

# Sanity
assert 'id="pauseBtn"' in text
assert 'id="endGameBtn"' in text
assert 'id="resumePausedBtn"' in text
assert 'function restorePausedGame()' in text
assert 'function endCurrentGame()' in text
assert 'const RESET_DELAY = 1500;' in text

p.write_text(text,encoding='utf-8')
