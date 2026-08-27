from pathlib import Path
import re

path = Path('index.html')
text = path.read_text(encoding='utf-8')

# Make all existing generator randomness route through the seeded RNG helper that
# is injected below. This is what makes Daily puzzles and shareable seed codes
# reproducible.
text = text.replace('Math.random()', 'rand()')


def sub_one(pattern, replacement, label, flags=re.S):
    global text
    new_text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'Could not patch {label}: matches={count}')
    text = new_text


def replace_once(old, new, label):
    global text
    if old not in text:
        raise SystemExit(f'Could not find {label}')
    text = text.replace(old, new, 1)

# ---------------------------------------------------------------------------
# CSS / visual polish
# ---------------------------------------------------------------------------
replace_once('touch-action:manipulation;', 'touch-action:none;', 'board touch action')

css_insert = r'''
    .choice-grid.modes{grid-template-columns:repeat(5,1fr)}
    .choice-grid.modes .choice{min-height:78px;padding:13px 10px}
    .choice-grid.modes .choice strong{font-size:15px}
    .seed-row{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:10px}
    .seed-input{width:100%;border:1px solid var(--line);border-radius:13px;padding:11px 12px;background:#fafcfa;color:var(--text);font:inherit;font-size:13px}
    .profile-summary{margin-top:18px;padding:13px 14px;border-radius:15px;background:#f5f8f4;border:1px solid var(--line);font-size:12px;color:var(--muted);line-height:1.55}
    .meta-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:-4px 0 16px}
    .meta-card{background:rgba(255,255,255,.84);border:1px solid rgba(255,255,255,.95);box-shadow:0 7px 22px rgba(25,45,30,.05);border-radius:14px;padding:9px 11px;min-width:0}
    .meta-card span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:900;margin-bottom:3px}
    .meta-card b{display:block;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .stat.combo b{color:#2a7355}
    .stat.streak b{color:#7a5c1f}
    .word-chip.rare::after{content:' ★';color:#9a6b13}
    .cell.just-found{animation:foundPulse .44s ease}
    .cell.wrong-fade{animation:wrongFade .36s ease}
    @keyframes foundPulse{0%{transform:scale(1.05)}45%{transform:scale(1.16)}100%{transform:scale(1)}}
    @keyframes wrongFade{0%{background:rgba(215,88,72,.20);border-color:rgba(215,88,72,.35)}100%{background:#fbfcfa;border-color:#e4ebe3}}
    .challenge-card{margin:0 0 14px;padding:11px 12px;border-radius:14px;background:rgba(89,201,196,.08);border:1px solid rgba(89,201,196,.24)}
    .challenge-card strong{display:block;font-size:12px;margin-bottom:4px}
    .challenge-card span{font-size:11px;color:var(--muted);line-height:1.4}
    .win-card{width:min(520px,100%)}
    .win-stars{font-size:30px;letter-spacing:.08em;color:#b58a2c;margin:4px 0 12px}
    .win-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}
    .win-stat{padding:10px 8px;border-radius:13px;background:#f5f8f4;border:1px solid var(--line)}
    .win-stat b{display:block;font-size:17px}
    .win-stat span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-top:2px}
    .win-code{font-size:11px;color:var(--muted);padding:9px;border-radius:12px;background:#f7f9f6;border:1px solid var(--line);overflow-wrap:anywhere}
    .win-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
    .unlock-note{margin-top:8px;font-size:12px;font-weight:800;color:#477044}
    @media(max-width:760px){.choice-grid.modes{grid-template-columns:1fr 1fr}.meta-row{grid-template-columns:1fr}.win-grid{grid-template-columns:1fr 1fr}}
'''
replace_once('    @media(max-width:900px){', css_insert + '\n    @media(max-width:900px){', 'CSS media anchor')

# ---------------------------------------------------------------------------
# Start-screen modes, seed replay and profile
# ---------------------------------------------------------------------------
start_extension = r'''

    <div class="setting-section">
      <h2 class="setting-title">Game mode</h2>
      <div class="choice-grid modes" id="gameModeChoices">
        <button class="choice selected" type="button" data-game-mode="classic"><strong>Classic</strong><span>Random theme and puzzle.</span></button>
        <button class="choice" type="button" data-game-mode="daily"><strong>Daily</strong><span>Same seeded puzzle for everyone today.</span></button>
        <button class="choice" type="button" data-game-mode="mixed"><strong>Mixed</strong><span>Words from many themes.</span></button>
        <button class="choice" type="button" data-game-mode="mystery"><strong>Mystery</strong><span>Theme stays hidden until the end.</span></button>
        <button class="choice" type="button" data-game-mode="challenge"><strong>Challenge</strong><span>Complete an extra mission.</span></button>
      </div>
      <div class="seed-row">
        <input class="seed-input" id="seedInput" type="text" autocomplete="off" spellcheck="false" placeholder="Puzzle code (optional)" />
        <button class="btn secondary" id="clearSeedBtn" type="button">Clear</button>
      </div>
    </div>

    <div class="profile-summary" id="profileSummary"></div>
'''
replace_once('\n    <button class="start-btn" id="startBtn" type="button">Start game</button>', start_extension + '\n    <button class="start-btn" id="startBtn" type="button">Start game</button>', 'start button')

# Top stats + sound toggle
replace_once(
'''        <div class="stat"><b id="bonusCount">0</b><span>Bonus</span></div>''',
'''        <div class="stat"><b id="bonusCount">0</b><span>Bonus</span></div>
        <div class="stat combo"><b id="comboCount">x1.00</b><span>Combo</span></div>
        <div class="stat streak"><b id="dailyStreak">0</b><span>Daily streak</span></div>''',
'extended stats'
)
replace_once(
'''        <span class="mode-pill" id="modePill">6×6 · Beginner</span>
        <button class="mode-button" id="changeModeBtn" type="button">Change mode</button>''',
'''        <span class="mode-pill" id="modePill">6×6 · Beginner</span>
        <button class="mode-button" id="soundBtn" type="button">Sound on</button>
        <button class="mode-button" id="changeModeBtn" type="button">Change mode</button>''',
'sound button'
)

meta_row = r'''

    <div class="meta-row">
      <div class="meta-card"><span>Puzzle code</span><b id="puzzleCode">—</b></div>
      <div class="meta-card"><span>Theme progress</span><b id="themeProgress">—</b></div>
      <div class="meta-card"><span>Path variety</span><b id="pathVariety">—</b></div>
    </div>
'''
replace_once('\n    <section class="layout">', meta_row + '\n    <section class="layout">', 'layout anchor')

replace_once(
'''        <div id="difficultyMessage" class="difficulty-message hidden"></div>

        <div class="bonus-box">''',
'''        <div id="difficultyMessage" class="difficulty-message hidden"></div>
        <div class="challenge-card hidden" id="challengeCard"><strong id="challengeTitle"></strong><span id="challengeProgress"></span></div>

        <div class="bonus-box">''',
'challenge box'
)

# Richer completion screen
sub_one(
    r'<div class="win" id="win">.*?</div>\n\n<script>',
    r'''<div class="win" id="win">
  <div class="win-card">
    <div class="emoji">🏆</div>
    <h3>Puzzle complete!</h3>
    <div class="win-stars" id="winStars">★★★</div>
    <p id="winText"></p>
    <div class="win-grid" id="winStats"></div>
    <div class="win-code" id="winCode"></div>
    <div class="unlock-note hidden" id="unlockNote"></div>
    <div class="win-actions">
      <button class="btn secondary" id="shareBtn" type="button">Share result</button>
      <button class="btn primary" id="playAgainBtn" type="button">Next puzzle</button>
    </div>
  </div>
</div>

<script>''',
    'win modal'
)

# ---------------------------------------------------------------------------
# Extra long-word pools before BONUS_WORDS is built
# ---------------------------------------------------------------------------
extra_words = r'''

  const EXTRA_THEME_WORDS = {
    Animals:["RHINOCEROS","ORANGUTAN","HIPPOPOTAMUS"],
    Ocean:["HAMMERHEAD","BIOLUMINESCENCE","UNDERWATER"],
    Food:["CAULIFLOWER","POMEGRANATE","PASSIONFRUIT"],
    Nature:["THUNDERCLOUD","BIODIVERSITY","WILDFLOWERS"],
    Space:["CONSTELLATION","INTERSTELLAR","GRAVITATION"],
    Fantasy:["NECROMANCER","SHAPESHIFTER","DRAGONRIDER"],
    Technology:["MICROPROCESSOR","CYBERSECURITY","SEMICONDUCTOR"],
    Sports:["WEIGHTLIFTING","GYMNASTICS","SKATEBOARDING"],
    Travel:["DESTINATION","SIGHTSEEING","EXPLORATION"],
    Music:["SYNTHESIZER","SONGWRITING","CONDUCTOR"],
    Home:["DISHWASHER","BOOKSHELF","WARDROBE"],
    Transport:["LOCOMOTIVE","SPEEDBOAT","AMBULANCE"],
    Weather:["THUNDERCLOUD","PRECIPITATION","ATMOSPHERE"],
    School:["MATHEMATICS","GEOGRAPHY","LABORATORY"],
    Jobs:["VETERINARIAN","PALEONTOLOGIST","ARCHITECTURE"],
    City:["NEIGHBORHOOD","INTERSECTION","UNDERGROUND"],
    Tricking:["DOUBLEBACKFLIP","CORKSCREW","COMBINATION"],
    Bouldering:["BODYTENSION","HEELTOEHOOK","ROUTEREADING"],
    Climbing:["COUNTERPRESSURE","MULTIPITCH","GEARPLACEMENT"]
  };
  THEME_POOLS.forEach(theme=>{
    const extras=EXTRA_THEME_WORDS[theme.name]||[];
    theme.words=[...new Set([...theme.words,...extras])];
  });
'''
replace_once('\n  const BONUS_WORDS = new Set(`', extra_words + '\n  const BONUS_WORDS = new Set(`', 'bonus words anchor')

# ---------------------------------------------------------------------------
# DOM refs + state
# ---------------------------------------------------------------------------
replace_once(
'''  const hintNote = document.getElementById("hintNote");''',
'''  const hintNote = document.getElementById("hintNote");
  const gameModeChoices = document.getElementById("gameModeChoices");
  const seedInput = document.getElementById("seedInput");
  const clearSeedBtn = document.getElementById("clearSeedBtn");
  const profileSummary = document.getElementById("profileSummary");
  const comboCountEl = document.getElementById("comboCount");
  const dailyStreakEl = document.getElementById("dailyStreak");
  const puzzleCodeEl = document.getElementById("puzzleCode");
  const themeProgressEl = document.getElementById("themeProgress");
  const pathVarietyEl = document.getElementById("pathVariety");
  const challengeCard = document.getElementById("challengeCard");
  const challengeTitle = document.getElementById("challengeTitle");
  const challengeProgressEl = document.getElementById("challengeProgress");
  const soundBtn = document.getElementById("soundBtn");
  const winStars = document.getElementById("winStars");
  const winStats = document.getElementById("winStats");
  const winCode = document.getElementById("winCode");
  const unlockNote = document.getElementById("unlockNote");
  const shareBtn = document.getElementById("shareBtn");''',
'DOM refs'
)

replace_once(
'''  let pendingGrid = 6;
  let pendingDifficulty = "beginner";''',
'''  let pendingGrid = 6;
  let pendingDifficulty = "beginner";
  let pendingGameMode = "classic";''',
'pending mode state'
)

state_extension = r'''

  const nativeRandom = Math.random;
  let randomSource = nativeRandom;
  let activeGameMode = "classic";
  let customSeed = "";
  let puzzleSeed = "";
  let comboCount = 0;
  let bestPuzzleCombo = 0;
  let bonusChain = 0;
  let puzzleMistakes = 0;
  let puzzleHints = 0;
  let rareFound = 0;
  let longestPuzzleWord = "";
  let challenge = null;
  let challengeAwarded = false;
  let puzzleRecorded = false;
  let currentPathVariety = 0;
  let newlyUnlocked = [];
  let audioContext = null;

  const UNLOCK_THRESHOLDS = {Tricking:1,Bouldering:2,Climbing:3};
  const DEFAULT_STATS = {
    totalPuzzles:0,totalWords:0,totalBonus:0,bestCombo:0,bestScore:0,longestWord:"",
    dailyStreak:0,lastDailyDate:"",recentWords:[],themeProgress:{},dailyBest:{},soundEnabled:true
  };

  function loadStats(){
    try{
      const raw=JSON.parse(localStorage.getItem("anitasWordPathStats")||"null");
      if(!raw)return structuredClone(DEFAULT_STATS);
      return {...structuredClone(DEFAULT_STATS),...raw,themeProgress:raw.themeProgress||{},dailyBest:raw.dailyBest||{},recentWords:raw.recentWords||[]};
    }catch(_){return structuredClone(DEFAULT_STATS)}
  }
  let playerStats=loadStats();

  function saveStats(){
    try{localStorage.setItem("anitasWordPathStats",JSON.stringify(playerStats))}catch(_){/* local storage unavailable */}
  }

  function dateKey(date=new Date()){
    const y=date.getFullYear();
    const m=String(date.getMonth()+1).padStart(2,"0");
    const d=String(date.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
  }

  function previousDateKey(){
    const d=new Date();
    d.setDate(d.getDate()-1);
    return dateKey(d);
  }

  function hashSeed(seed){
    let h=2166136261;
    for(let i=0;i<seed.length;i++){
      h^=seed.charCodeAt(i);
      h=Math.imul(h,16777619);
    }
    return h>>>0;
  }

  function seededRandom(seed){
    let a=hashSeed(seed)||1;
    return function(){
      a|=0;a=a+0x6D2B79F5|0;
      let t=Math.imul(a^a>>>15,1|a);
      t=t+Math.imul(t^t>>>7,61|t)^t;
      return ((t^t>>>14)>>>0)/4294967296;
    };
  }

  function rand(){return randomSource()}
  function setPuzzleRandom(seed){randomSource=seededRandom(seed)}
  function randomCodePart(){return Math.floor(nativeRandom()*0xffffffff).toString(36).toUpperCase()}

  function isThemeUnlocked(name){
    const need=UNLOCK_THRESHOLDS[name]||0;
    return playerStats.totalPuzzles>=need;
  }

  function unlockedThemeCount(){return THEME_POOLS.filter(t=>isThemeUnlocked(t.name)).length}

  function renderProfileSummary(){
    profileSummary.textContent=`${playerStats.totalPuzzles} puzzles completed · ${playerStats.totalWords} theme words · ${playerStats.totalBonus} bonus words · best combo ${playerStats.bestCombo} · daily streak ${playerStats.dailyStreak} · themes ${unlockedThemeCount()}/${THEME_POOLS.length} unlocked`;
  }

  function feedback(type){
    if(!playerStats.soundEnabled)return;
    try{
      if(!audioContext)audioContext=new (window.AudioContext||window.webkitAudioContext)();
      const osc=audioContext.createOscillator();
      const gain=audioContext.createGain();
      const map={tile:[360,.018,.035],success:[620,.045,.09],bonus:[780,.04,.10],error:[180,.025,.08],win:[880,.05,.14],hint:[470,.025,.07]};
      const [freq,volume,duration]=map[type]||map.tile;
      osc.frequency.value=freq;
      gain.gain.value=volume;
      osc.connect(gain);gain.connect(audioContext.destination);
      osc.start();osc.stop(audioContext.currentTime+duration);
    }catch(_){/* audio is optional */}
    if(navigator.vibrate){
      const vibration={tile:5,success:18,bonus:12,error:25,win:[25,30,45],hint:10}[type];
      if(vibration)navigator.vibrate(vibration);
    }
  }

  function updateSoundButton(){soundBtn.textContent=playerStats.soundEnabled?"Sound on":"Sound off"}

  function parseSeedCode(code){
    const cleaned=code.trim().toUpperCase();
    if(!cleaned)return;
    let m=cleaned.match(/^DAILY-(\d{4}-\d{2}-\d{2})-(6|9|12)-(BEGINNER|MIDDLE|HARD)/);
    if(m){pendingGrid=Number(m[2]);pendingDifficulty=m[3].toLowerCase();pendingGameMode="daily";}
    else{
      m=cleaned.match(/^WP-(CLASSIC|MIXED|MYSTERY|CHALLENGE)-(6|9|12)-(BEGINNER|MIDDLE|HARD)-/);
      if(m){pendingGameMode=m[1].toLowerCase();pendingGrid=Number(m[2]);pendingDifficulty=m[3].toLowerCase();}
    }
    setSelectedChoice(gridChoices,"grid",pendingGrid);
    setSelectedChoice(difficultyChoices,"difficulty",pendingDifficulty);
    setSelectedChoice(gameModeChoices,"gameMode",pendingGameMode);
  }

  function makePuzzleCode(){
    if(customSeed)return customSeed.toUpperCase();
    if(activeGameMode==="daily")return `DAILY-${dateKey()}-${SIZE}-${difficulty}`.toUpperCase();
    return `WP-${activeGameMode}-${SIZE}-${difficulty}-${Date.now().toString(36)}-${randomCodePart()}`.toUpperCase();
  }
'''
replace_once('\n  function shuffle(arr){', state_extension + '\n\n  function shuffle(arr){', 'shuffle anchor')

# Mode event handlers
replace_once(
'''  difficultyChoices.addEventListener("click",e=>{
    const btn=e.target.closest("[data-difficulty]");
    if(!btn) return;
    pendingDifficulty=btn.dataset.difficulty;
    setSelectedChoice(difficultyChoices,"difficulty",pendingDifficulty);
  });''',
'''  difficultyChoices.addEventListener("click",e=>{
    const btn=e.target.closest("[data-difficulty]");
    if(!btn) return;
    pendingDifficulty=btn.dataset.difficulty;
    setSelectedChoice(difficultyChoices,"difficulty",pendingDifficulty);
  });

  gameModeChoices.addEventListener("click",e=>{
    const btn=e.target.closest("[data-game-mode]");
    if(!btn)return;
    pendingGameMode=btn.dataset.gameMode;
    setSelectedChoice(gameModeChoices,"gameMode",pendingGameMode);
  });

  seedInput.addEventListener("change",()=>parseSeedCode(seedInput.value));
  clearSeedBtn.addEventListener("click",()=>{seedInput.value="";customSeed=""});''',
'mode event handlers'
)

# Difficulty copy: hints never reveal the word
text = text.replace('The Hint button briefly reveals one remaining word and its path.', 'The Hint button briefly highlights only the tiles needed for one remaining word.')
text = text.replace('Beginner mode: the full target-word list is visible and hints are available.', 'Beginner mode: the full target-word list is visible. Hints highlight tiles only.')

# ---------------------------------------------------------------------------
# Generator upgrades: unlocks/modes, recent-word avoidance, long words,
# route-shape variety and reduced endpoint clutter.
# ---------------------------------------------------------------------------
sub_one(
    r'  function chooseTheme\(\)\{.*?\n  \}\n\n  function countBounds\(\)\{',
    r'''  function chooseTheme(){
    if(activeGameMode==="mixed"){
      const source=THEME_POOLS.filter(t=>isThemeUnlocked(t.name));
      currentTheme={name:"Mixed",words:[...new Set(source.flatMap(t=>t.words))]};
      previousThemeName="Mixed";
      return;
    }

    const ignoreUnlocks=activeGameMode==="daily"||Boolean(customSeed);
    const valid=THEME_POOLS.filter(t=>
      t.words.reduce((s,w)=>s+w.length,0)>=CELL_COUNT && (ignoreUnlocks||isThemeUnlocked(t.name))
    );
    const candidates=valid.filter(t=>t.name!==previousThemeName);
    const pool=candidates.length?candidates:valid;
    currentTheme=pool[Math.floor(rand()*pool.length)];
    previousThemeName=currentTheme.name;
  }

  function countBounds(){''',
    'chooseTheme'
)

sub_one(
    r'  function selectWordsExact\(pool,target\)\{.*?\n  \}\n\n  function countUnvisitedNeighbors',
    r'''  function selectWordsExact(pool,target){
    const [minCount,maxCount]=countBounds();
    const words=[...new Set(pool)].filter(w=>w.length>=3&&w.length<=16);

    /* Exact-fill DP with deliberate length variety. Recent words receive a
       strong penalty in normal play, while Daily/share-code puzzles remain
       fully deterministic and independent of local history. */
    for(let attempt=0;attempt<24;attempt++){
      const requireShort=rand()<0.35;
      const requireLong=rand()<(SIZE===6?.45:.78);
      const shuffled=shuffle(words);
      const states=new Map();
      states.set("0|0|0|0",{score:0,words:[]});

      for(const word of shuffled){
        const len=word.length;
        const snapshot=[...states.entries()];
        for(const [key,state] of snapshot){
          const [sumS,countS,shortS,longS]=key.split("|");
          const sum=Number(sumS),count=Number(countS),hasShort=shortS==="1",hasLong=longS==="1";
          const nextSum=sum+len,nextCount=count+1;
          if(nextSum>target||nextCount>maxCount)continue;

          const nextShort=hasShort||len===3;
          const nextLong=hasLong||len>=10;
          const deterministicRun=activeGameMode==="daily"||Boolean(customSeed);
          const reusePenalty=(!deterministicRun&&playerStats.recentWords.includes(word))?-240:0;
          const longBias=len*len*1.45;
          const variationNoise=rand()*18;
          const shortBonus=(requireShort&&len===3)?30:0;
          const longBonus=(requireLong&&len>=10)?62:0;
          const score=state.score+longBias+variationNoise+shortBonus+longBonus+reusePenalty;
          const nextKey=`${nextSum}|${nextCount}|${nextShort?1:0}|${nextLong?1:0}`;
          const existing=states.get(nextKey);
          if(!existing||score>existing.score)states.set(nextKey,{score,words:[...state.words,word]});
        }
      }

      const candidates=[];
      for(let count=minCount;count<=maxCount;count++){
        for(const shortFlag of [0,1])for(const longFlag of [0,1]){
          if(requireShort&&shortFlag===0)continue;
          if(requireLong&&longFlag===0)continue;
          const state=states.get(`${target}|${count}|${shortFlag}|${longFlag}`);
          if(state)candidates.push(state);
        }
      }

      if(candidates.length){
        candidates.sort((a,b)=>b.score-a.score);
        const top=candidates.slice(0,Math.min(6,candidates.length));
        return top[Math.floor(rand()*top.length)].words;
      }
    }

    throw new Error(`Could not select words totalling ${target} letters.`);
  }

  function countUnvisitedNeighbors''',
    'selectWordsExact'
)

# Helpers for shape classification / endpoint clutter
replace_once(
'''  function makeBoardCandidate(selectedWords){''',
'''  function pathShape(path){
    if(!path||path.length<3)return "compact";
    const m=pathMetrics(path);
    const turnRatio=m.turns/Math.max(1,path.length-2);
    const diagRatio=m.diagonals/Math.max(1,path.length-1);
    if(m.turns===0)return "straight";
    if(turnRatio>=.62)return "zigzag";
    if(diagRatio>=.52)return "diagonal";
    return "snake";
  }

  function endpointClutterScore(grid,paths){
    let score=0;
    for(const path of paths.values()){
      if(!path.length)continue;
      const own=new Set(path);
      for(const idx of [path[0],path[path.length-1]]){
        const letter=grid[idx];
        for(const n of NEIGHBORS[idx])if(!own.has(n)&&grid[n]===letter)score++;
      }
    }
    return score;
  }

  function makeBoardCandidate(selectedWords){''',
'candidate helper anchor'
)

replace_once(
'''    return{
      grid,
      paths,
      duplicateScore:duplicatePathScore(grid,selectedWords)
    };''',
'''    return{
      grid,
      paths,
      duplicateScore:duplicatePathScore(grid,selectedWords),
      shapeDiversity:new Set([...paths.values()].map(pathShape)).size,
      endpointClutter:endpointClutterScore(grid,paths)
    };''',
'candidate return'
)

sub_one(
    r'  function generateBoard\(\)\{.*?\n  \}\n  function renderBoard\(\)\{',
    r'''  function generateBoard(){
    chooseTheme();

    /* Unique target paths remain a hard requirement. Among valid boards we
       prefer more varied path shapes and fewer visually confusing identical
       letters around word starts/ends. */
    const boardAttempts=SIZE===6?96:SIZE===9?58:28;
    const desiredVariety=SIZE===12?3:2;
    let best=null;

    for(let attempt=0;attempt<boardAttempts;attempt++){
      const selectedWords=selectWordsExact(currentTheme.words,CELL_COUNT);
      const candidate=makeBoardCandidate(selectedWords);
      if(candidate.duplicateScore!==0)continue;

      if(!best || candidate.endpointClutter<best.endpointClutter ||
        (candidate.endpointClutter===best.endpointClutter&&candidate.shapeDiversity>best.shapeDiversity)){
        best={...candidate,selectedWords};
      }

      if(candidate.endpointClutter===0&&candidate.shapeDiversity>=desiredVariety){
        best={...candidate,selectedWords};
        break;
      }
    }

    if(!best)throw new Error("Could not generate a puzzle with unique target paths.");
    board=best.grid;
    targets=shuffle(best.selectedWords);
    intendedPaths=best.paths;
    currentPathVariety=best.shapeDiversity;
  }
  function renderBoard(){''',
    'generateBoard enhanced'
)

# renderBoard: mystery mode, rare chips, metadata
replace_once('    themeNameEl.textContent=currentTheme.name;', '    themeNameEl.textContent=activeGameMode==="mystery"?"Mystery":currentTheme.name;', 'theme label')
replace_once(
'''      chip.textContent=word;
      wordListEl.appendChild(chip);''',
'''      chip.textContent=word;
      if(word.length>=10)chip.classList.add("rare");
      wordListEl.appendChild(chip);''',
'rare chips'
)
replace_once(
'''    renderBonusList();
    updateHUD();
    requestAnimationFrame(drawPaths);''',
'''    puzzleCodeEl.textContent=puzzleSeed;
    const tp=playerStats.themeProgress[currentTheme.name]||{puzzles:0,words:0};
    themeProgressEl.textContent=currentTheme.name==="Mixed"?`${playerStats.totalWords} total words`:`${tp.words} words · ${tp.puzzles} clears`;
    pathVarietyEl.textContent=`${currentPathVariety} path shapes`;
    renderBonusList();
    updateChallengeUI();
    updateHUD();
    requestAnimationFrame(drawPaths);''',
'render metadata'
)

# HUD now includes combo and daily streak
sub_one(
    r'  function updateHUD\(\)\{.*?\n  \}\n\n  function selectedWord',
    r'''  function comboMultiplier(){return 1+Math.min(Math.max(comboCount-1,0),4)*.25}

  function updateHUD(){
    foundCountEl.textContent=`${foundTargets.size}/${targets.length}`;
    bonusCountEl.textContent=foundBonus.size;
    bonusPointsEl.textContent=`+${bonusPoints} pts`;
    scoreEl.textContent=score;
    comboCountEl.textContent=`x${comboMultiplier().toFixed(2)}`;
    dailyStreakEl.textContent=playerStats.dailyStreak;
    progressBar.style.width=`${(foundTargets.size/targets.length)*100}%`;
    updateChallengeUI();
  }

  function selectedWord''',
    'updateHUD'
)

# Stronger stored trails
text = text.replace('n%2===0?"#8dcd56":"#59c9c4",.36', 'n%2===0?"#8dcd56":"#59c9c4",.48')

# ---------------------------------------------------------------------------
# Challenge system and scoring helpers before evaluateAtTimeout
# ---------------------------------------------------------------------------
challenge_helpers = r'''

  const CHALLENGES = [
    {id:"perfect",title:"Perfect route",description:"Finish the puzzle without an invalid word."},
    {id:"nohint",title:"No help needed",description:"Finish without using a hint."},
    {id:"bonus2",title:"Bonus hunter",description:"Find at least 2 bonus words."},
    {id:"combo3",title:"Combo builder",description:"Reach a 3-word target combo."},
    {id:"rare",title:"Rare word",description:"Find a target word with 10+ letters."}
  ];

  function makeChallenge(){
    challenge=activeGameMode==="challenge"?CHALLENGES[Math.floor(rand()*CHALLENGES.length)]:null;
  }

  function challengeDone(){
    if(!challenge)return false;
    if(challenge.id==="perfect")return puzzleMistakes===0&&foundTargets.size===targets.length;
    if(challenge.id==="nohint")return puzzleHints===0&&foundTargets.size===targets.length;
    if(challenge.id==="bonus2")return foundBonus.size>=2;
    if(challenge.id==="combo3")return bestPuzzleCombo>=3;
    if(challenge.id==="rare")return rareFound>=1;
    return false;
  }

  function challengeProgressText(){
    if(!challenge)return "";
    if(challenge.id==="perfect")return `${puzzleMistakes} mistakes`;
    if(challenge.id==="nohint")return `${puzzleHints} hints used`;
    if(challenge.id==="bonus2")return `${Math.min(foundBonus.size,2)}/2 bonus words`;
    if(challenge.id==="combo3")return `${Math.min(bestPuzzleCombo,3)}/3 combo`;
    if(challenge.id==="rare")return `${Math.min(rareFound,1)}/1 rare word`;
    return "";
  }

  function updateChallengeUI(){
    challengeCard.classList.toggle("hidden",!challenge);
    if(!challenge)return;
    challengeTitle.textContent=`Challenge · ${challenge.title}${challengeDone()?" ✓":""}`;
    challengeProgressEl.textContent=`${challenge.description} · ${challengeProgressText()}`;
  }

  function animateCells(indices,className){
    indices.forEach(i=>{
      const cell=boardEl.children[i];
      if(!cell)return;
      cell.classList.remove(className);
      void cell.offsetWidth;
      cell.classList.add(className);
      setTimeout(()=>cell.classList.remove(className),500);
    });
  }
'''
replace_once('\n  function evaluateAtTimeout(){', challenge_helpers + '\n\n  function evaluateAtTimeout(){', 'evaluation anchor')

# Full scoring / evaluation replacement
sub_one(
    r'  function evaluateAtTimeout\(\)\{.*?\n  \}\n\n  function clickCell',
    r'''  function evaluateAtTimeout(){
    if(evaluating||!selected.length)return;
    evaluating=true;

    const word=selectedWord();
    const targetWord=findTargetFromSelection();

    if(targetWord){
      foundTargets.add(targetWord);
      foundPaths.set(targetWord,[...selected]);
      comboCount++;
      bonusChain=0;
      bestPuzzleCombo=Math.max(bestPuzzleCombo,comboCount);
      const rare=targetWord.length>=10;
      if(rare)rareFound++;
      if(targetWord.length>longestPuzzleWord.length)longestPuzzleWord=targetWord;
      const base=targetWord.length*TARGET_POINTS_PER_LETTER;
      const rareBonus=rare?Math.round(base*.5):0;
      const pts=Math.round((base+rareBonus)*comboMultiplier());
      score+=pts;
      selected.forEach(i=>boardEl.children[i]?.classList.add("found"));
      animateCells(selected,"just-found");
      document.getElementById("word-"+targetWord)?.classList.add("found");
      currentWordEl.classList.add("target-result");
      const shape=pathShape(selected);
      currentWordEl.textContent=`${rare?"RARE · ":""}${targetWord} · ${shape} +${pts}`;
      toast(`${targetWord} · ${shape} · x${comboMultiplier().toFixed(2)} +${pts}`);
      feedback("success");
      updateHUD();

      const completed=foundTargets.size===targets.length;
      setTimeout(()=>{
        resetSelection();
        if(completed)showWin();
      },RESULT_DISPLAY_MS);
      return;
    }

    if(targets.includes(word)&&foundTargets.has(word)){
      currentWordEl.classList.add("target-result");
      currentWordEl.textContent=`${word} · already found`;
      toast(`${word} already found`);
      setTimeout(resetSelection,RESULT_DISPLAY_MS);
      return;
    }

    if(word.length>=MIN_BONUS_LENGTH&&BONUS_WORDS.has(word)&&!targets.includes(word)){
      if(!foundBonus.has(word)){
        foundBonus.add(word);
        bonusChain++;
        const chainBonus=(bonusChain-1)*50;
        const pts=word.length*BONUS_POINTS_PER_LETTER+chainBonus;
        bonusPoints+=pts;
        score+=pts;
        currentWordEl.classList.add("bonus-result");
        currentWordEl.textContent=`BONUS: ${word} +${pts}`;
        toast(`Bonus chain x${bonusChain}: ${word} +${pts}`,"bonus");
        feedback("bonus");
        renderBonusList();
        updateHUD();
      }else{
        currentWordEl.classList.add("bonus-result");
        currentWordEl.textContent=`BONUS: ${word}`;
        toast(`${word} already scored`);
      }
      setTimeout(resetSelection,RESULT_DISPLAY_MS);
      return;
    }

    puzzleMistakes++;
    comboCount=0;
    bonusChain=0;
    animateCells(selected,"wrong-fade");
    feedback("error");
    currentWordEl.classList.add("no-result");
    currentWordEl.textContent=word||"No word";
    updateHUD();
    setTimeout(resetSelection,RESULT_DISPLAY_MS);
  }

  function clickCell''',
    'evaluateAtTimeout'
)

# Tile feedback and drag / touch selection. Keyboard clicks still work.
replace_once(
'''    if(selected.length===0){
      selected=[idx];''',
'''    feedback("tile");

    if(selected.length===0){
      selected=[idx];''',
'click feedback'
)
sub_one(
    r'  boardEl\.addEventListener\("click",e=>\{.*?\n  \}\);',
    r'''  let pointerSelecting=false;
  let lastPointerCell=-1;

  function pointerCellAt(x,y){
    const el=document.elementFromPoint(x,y)?.closest?.(".cell");
    if(!el||!boardEl.contains(el))return null;
    return Number(el.dataset.index);
  }

  boardEl.addEventListener("pointerdown",e=>{
    if(e.pointerType==="mouse"&&e.button!==0)return;
    const cell=e.target.closest(".cell");
    if(!cell)return;
    pointerSelecting=true;
    lastPointerCell=Number(cell.dataset.index);
    try{boardEl.setPointerCapture(e.pointerId)}catch(_){/* optional */}
    clickCell(lastPointerCell);
    e.preventDefault();
  });

  boardEl.addEventListener("pointermove",e=>{
    if(!pointerSelecting)return;
    const idx=pointerCellAt(e.clientX,e.clientY);
    if(idx===null||idx===lastPointerCell)return;
    lastPointerCell=idx;
    clickCell(idx);
    e.preventDefault();
  });

  const endPointer=e=>{pointerSelecting=false;lastPointerCell=-1;try{boardEl.releasePointerCapture(e.pointerId)}catch(_){}};
  boardEl.addEventListener("pointerup",endPointer);
  boardEl.addEventListener("pointercancel",endPointer);

  boardEl.addEventListener("click",e=>{
    /* Pointer input is handled above. detail===0 keeps keyboard activation. */
    if(e.detail!==0)return;
    const cell=e.target.closest(".cell");
    if(!cell)return;
    clickCell(Number(cell.dataset.index));
  });''',
    'drag input'
)

# Hint: tiles only, no word anywhere; track hint usage.
sub_one(
    r'  function showHint\(\)\{.*?\n  \}\n\n  function showWin',
    r'''  function showHint(){
    if(difficulty==="hard")return;
    const remaining=targets.filter(w=>!foundTargets.has(w));
    if(!remaining.length)return;

    const word=remaining[Math.floor(rand()*remaining.length)];
    hintPath=intendedPaths.get(word)||[];
    const HINT_DISPLAY_MS=5000;

    hintPath.forEach(index=>boardEl.children[index]?.classList.add("hint-cell"));

    /* Intentionally never reveal the hinted word. Only the required tiles glow. */
    toast("Hint tiles highlighted","hint",HINT_DISPLAY_MS);
    puzzleHints++;
    score=Math.max(0,score-50);
    feedback("hint");
    updateHUD();

    setTimeout(()=>{
      hintPath?.forEach(index=>boardEl.children[index]?.classList.remove("hint-cell"));
      hintPath=null;
    },HINT_DISPLAY_MS);
  }

  function showWin''',
    'showHint'
)

# Completion, stars, local stats, unlocks and sharing.
sub_one(
    r'  function showWin\(\)\{.*?\n  \}\n\n  async function newPuzzle',
    r'''  function starRating(){
    if(puzzleMistakes===0&&puzzleHints===0)return 3;
    if(puzzleMistakes<=2&&puzzleHints<=1)return 2;
    return 1;
  }

  function recordCompletion(){
    if(puzzleRecorded)return;
    puzzleRecorded=true;
    const beforeUnlocked=new Set(THEME_POOLS.filter(t=>isThemeUnlocked(t.name)).map(t=>t.name));

    playerStats.totalPuzzles++;
    playerStats.totalWords+=targets.length;
    playerStats.totalBonus+=foundBonus.size;
    playerStats.bestCombo=Math.max(playerStats.bestCombo,bestPuzzleCombo);
    playerStats.bestScore=Math.max(playerStats.bestScore,score);
    if(longestPuzzleWord.length>(playerStats.longestWord||"").length)playerStats.longestWord=longestPuzzleWord;
    playerStats.recentWords=[...new Set([...targets,...playerStats.recentWords])].slice(0,45);

    if(currentTheme.name!=="Mixed"){
      const tp=playerStats.themeProgress[currentTheme.name]||{puzzles:0,words:0};
      tp.puzzles++;tp.words+=targets.length;
      playerStats.themeProgress[currentTheme.name]=tp;
    }

    if(activeGameMode==="daily"){
      const today=dateKey();
      if(playerStats.lastDailyDate!==today){
        playerStats.dailyStreak=playerStats.lastDailyDate===previousDateKey()?playerStats.dailyStreak+1:1;
        playerStats.lastDailyDate=today;
      }
      playerStats.dailyBest[today]=Math.max(playerStats.dailyBest[today]||0,score);
    }

    saveStats();
    const afterUnlocked=THEME_POOLS.filter(t=>isThemeUnlocked(t.name)).map(t=>t.name);
    newlyUnlocked=afterUnlocked.filter(name=>!beforeUnlocked.has(name));
    renderProfileSummary();
  }

  function showWin(){
    clearTimeout(resetTimer);

    if(challenge&&challengeDone()&&!challengeAwarded){
      challengeAwarded=true;
      score+=750;
    }

    recordCompletion();
    const stars=starRating();
    winStars.textContent="★".repeat(stars)+"☆".repeat(3-stars);
    const shownTheme=currentTheme.name;
    const challengeText=challenge?` Challenge: ${challengeDone()?"completed (+750)":"not completed"}.`:"";
    winTextEl.textContent=`${activeGameMode==="mystery"?`Mystery revealed: ${shownTheme}. `:""}Completed ${SIZE}×${SIZE} ${difficulty} ${activeGameMode} mode.${challengeText}`;
    winStats.innerHTML=`
      <div class="win-stat"><b>${score}</b><span>Score</span></div>
      <div class="win-stat"><b>${foundBonus.size}</b><span>Bonus words</span></div>
      <div class="win-stat"><b>${bestPuzzleCombo}</b><span>Best combo</span></div>
      <div class="win-stat"><b>${puzzleMistakes}</b><span>Mistakes</span></div>
      <div class="win-stat"><b>${puzzleHints}</b><span>Hints</span></div>
      <div class="win-stat"><b>${longestPuzzleWord||"—"}</b><span>Longest word</span></div>`;
    winCode.textContent=`Puzzle code: ${puzzleSeed}`;
    unlockNote.classList.toggle("hidden",newlyUnlocked.length===0);
    unlockNote.textContent=newlyUnlocked.length?`Unlocked theme: ${newlyUnlocked.join(", ")}`:"";
    feedback("win");
    winEl.classList.add("show");
  }

  async function shareResult(){
    const text=`Anitas Word Path · ${activeGameMode==="mystery"?currentTheme.name:currentTheme.name} · ${SIZE}×${SIZE} ${difficulty} · ${score} pts · ${foundBonus.size} bonus · ${bestPuzzleCombo} combo · ${starRating()}/3 stars · ${puzzleSeed}`;
    try{
      if(navigator.share)await navigator.share({title:"Anitas Word Path",text});
      else if(navigator.clipboard){await navigator.clipboard.writeText(text);toast("Result copied")}
      else toast(text);
    }catch(_){/* share cancelled */}
  }

  async function newPuzzle''',
    'showWin and share'
)

# Puzzle reset / seeded setup. RESET_DELAY remains untouched at 1500 ms.
sub_one(
    r'  async function newPuzzle\(\)\{.*?\n  \}\n\n  async function startGame',
    r'''  async function newPuzzle(){
    loadingText.textContent=`Building a ${SIZE}×${SIZE} ${difficulty} ${activeGameMode} puzzle…`;
    loadingEl.classList.add("show");
    await new Promise(resolve=>setTimeout(resolve,20));

    boardEl.querySelectorAll(".hint-cell").forEach(el=>el.classList.remove("hint-cell"));
    foundTargets=new Set();
    foundPaths=new Map();
    foundBonus=new Set();
    selected=[];
    score=0;
    bonusPoints=0;
    comboCount=0;
    bestPuzzleCombo=0;
    bonusChain=0;
    puzzleMistakes=0;
    puzzleHints=0;
    rareFound=0;
    longestPuzzleWord="";
    challenge=null;
    challengeAwarded=false;
    puzzleRecorded=false;
    newlyUnlocked=[];
    hintPath=null;
    evaluating=false;
    winEl.classList.remove("show");
    clearTimeout(resetTimer);

    puzzleSeed=makePuzzleCode();
    setPuzzleRandom(puzzleSeed);

    try{
      generateBoard();
      makeChallenge();
      renderBoard();
      resetSelection();
    }catch(err){
      console.error(err);
      loadingEl.classList.remove("show");
      toast("Generation failed, retrying…");
      if(!customSeed&&activeGameMode!=="daily")puzzleSeed="";
      setTimeout(newPuzzle,60);
      return;
    }

    loadingEl.classList.remove("show");
  }

  async function startGame''',
    'newPuzzle'
)

sub_one(
    r'  async function startGame\(\)\{.*?\n  \}\n\n  function changeMode',
    r'''  async function startGame(){
    parseSeedCode(seedInput.value);
    SIZE=pendingGrid;
    difficulty=pendingDifficulty;
    activeGameMode=pendingGameMode;
    customSeed=seedInput.value.trim().toUpperCase();
    modeLocked=true;
    configureGrid();
    updateDifficultyUI();
    updateSoundButton();
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    await newPuzzle();
  }

  function changeMode''',
    'startGame'
)

# Update mode pill to include special mode
replace_once(
'    modePill.textContent=`${SIZE}×${SIZE} · ${label}`;',
'    modePill.textContent=`${SIZE}×${SIZE} · ${label} · ${activeGameMode}`;',
'mode pill'
)

# changeMode refreshes persistent summary
replace_once(
'''    startScreen.classList.remove("hidden");
    modeLocked=false;''',
'''    startScreen.classList.remove("hidden");
    modeLocked=false;
    renderProfileSummary();''',
'changeMode summary'
)

# Bind share/sound and initialize profile. Next puzzle after a custom replay gets a
# fresh random puzzle instead of repeating forever.
replace_once(
'''  document.getElementById("newBtn").addEventListener("click",newPuzzle);
  document.getElementById("playAgainBtn").addEventListener("click",newPuzzle);''',
'''  document.getElementById("newBtn").addEventListener("click",()=>{if(customSeed){customSeed="";seedInput.value=""}newPuzzle()});
  document.getElementById("playAgainBtn").addEventListener("click",()=>{if(customSeed){customSeed="";seedInput.value=""}newPuzzle()});
  shareBtn.addEventListener("click",shareResult);
  soundBtn.addEventListener("click",()=>{playerStats.soundEnabled=!playerStats.soundEnabled;saveStats();updateSoundButton()});''',
'button bindings'
)
replace_once(
'''  window.addEventListener("resize",drawPaths);
})();''',
'''  window.addEventListener("resize",drawPaths);
  renderProfileSummary();
  updateSoundButton();
})();''',
'initialization'
)

# Sanity checks required by the requested behaviour.
assert 'const RESET_DELAY = 1500;' in text, 'Selection pause changed unexpectedly'
assert 'toast(`Hint: ${word}`' not in text, 'Hint still reveals the word'
assert 'Hint tiles highlighted' in text, 'Generic hint feedback missing'
assert 'pointermove' in text, 'Drag selection missing'
assert 'anitasWordPathStats' in text, 'Persistent stats missing'

path.write_text(text, encoding='utf-8')
