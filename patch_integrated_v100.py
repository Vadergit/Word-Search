from pathlib import Path
import json
import re

root = Path('.')
index_path = root / 'index.html'
cube_js_path = root / 'cube' / 'cube.js'
cube_html_path = root / 'cube' / 'index.html'
cube_css_path = root / 'cube' / 'cube.css'
stats_path = root / 'stats.html'
themes_path = root / 'themes.js'

index = index_path.read_text(encoding='utf-8')
cube_js = cube_js_path.read_text(encoding='utf-8')
cube_html = cube_html_path.read_text(encoding='utf-8')
cube_css = cube_css_path.read_text(encoding='utf-8')
stats = stats_path.read_text(encoding='utf-8')


def rep(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing patch anchor: {label}')
    return text.replace(old, new, 1)

# ---------------------------------------------------------------------------
# Build one canonical theme library from the current 2D game.
# ---------------------------------------------------------------------------
pool_start = index.index('  const THEME_POOLS = [')
pool_end = index.index('\n  ];', pool_start) + len('\n  ];')
pool_block = index[pool_start:pool_end]

themes = []
for m in re.finditer(r'\{\s*name:"([^"]+)",\s*words:\[(.*?)\]\s*\}', pool_block, re.S):
    themes.append({'name': m.group(1), 'words': re.findall(r'"([A-Z]+)"', m.group(2))})
if len(themes) != 19:
    raise SystemExit(f'Expected 19 themes from 2D game, found {len(themes)}')

extra_start = index.index('  const EXTRA_THEME_WORDS = {', pool_end)
extra_end = index.index('\n  };', extra_start) + len('\n  };')
extra_block = index[extra_start:extra_end]
extras = {}
for m in re.finditer(r'^\s*([A-Za-z]+):\[(.*?)\],?\s*$', extra_block, re.M):
    extras[m.group(1)] = re.findall(r'"([A-Z]+)"', m.group(2))

for theme in themes:
    seen = set()
    merged = []
    for word in theme['words'] + extras.get(theme['name'], []):
        if word not in seen:
            seen.add(word)
            merged.append(word)
    theme['words'] = merged

theme_count = len(themes)
word_count = sum(len(t['words']) for t in themes)

# Every shared theme must still be able to fill all 54 cube tiles exactly.
def can_fill_cube(words):
    usable = list(dict.fromkeys(w for w in words if 3 <= len(w) <= 14))
    states = {(0, 0)}
    for word in usable:
        n = len(word)
        for total, count in list(states):
            if count >= 12 or total + n > 54:
                continue
            states.add((total + n, count + 1))
    return any((54, count) in states for count in (7,8,9,10,6,11,5,12,4))

bad = [t['name'] for t in themes if not can_fill_cube(t['words'])]
if bad:
    raise SystemExit(f'Shared themes cannot fill cube: {bad}')

shared = f'''/* Canonical word themes shared by Anitas Word Path and Anitas Word Cube.\n   Edit theme words here so both game types always stay in sync. */\n(() => {{\n  const themes = {json.dumps(themes, separators=(',', ':'))};\n  window.ANITAS_THEME_POOLS = Object.freeze(themes.map(theme => Object.freeze({{\n    name: theme.name,\n    words: Object.freeze([...theme.words])\n  }})));\n  window.ANITAS_THEME_META = Object.freeze({{themeCount:{theme_count},wordCount:{word_count}}});\n}})();\n'''
themes_path.write_text(shared, encoding='utf-8')

# ---------------------------------------------------------------------------
# 2D: consume the shared theme library and add a 2D / 3D selector after login.
# ---------------------------------------------------------------------------
theme_section_start = index.index('  /* Large offline theme pools.')
theme_section_end = index.index('\n  const BONUS_WORDS =', theme_section_start)
index = index[:theme_section_start] + '''  /* Canonical themes are shared with the 3D cube. */\n  const THEME_POOLS = (window.ANITAS_THEME_POOLS||[]).map(theme=>({name:theme.name,words:[...theme.words]}));\n  if(!THEME_POOLS.length)throw new Error("Shared theme library failed to load.");\n''' + index[theme_section_end:]
index = rep(index, '<script src="words.js"></script>\n<script>', '<script src="themes.js?v=1.0.0"></script>\n<script src="words.js"></script>\n<script>', '2D themes.js load')
index = index.replace('<title>Anitas Word Path</title>', '<title>Anitas Word Path · v1.0.0</title>', 1)
index = index.replace('<div class="start-kicker">Local profiles</div>', '<div class="start-kicker">Local profiles · v1.0.0</div>', 1)
index = index.replace('<div class="start-kicker">Offline word game</div>', '<div class="start-kicker">Word game suite · v1.0.0</div>', 1)
index = index.replace('19 themes', f'{theme_count} shared themes', 1)
index = index.replace('879+ theme words', f'{word_count}+ shared theme words', 1)

index = rep(index,
    '    .choice-grid.modes{grid-template-columns:repeat(5,1fr)}',
    '    .choice-grid.game-types{grid-template-columns:repeat(2,1fr)}\n    .choice-grid.game-types .choice{min-height:92px}\n    .choice-grid.modes{grid-template-columns:repeat(5,1fr)}',
    'game type CSS')

index = rep(index,
'''    <div class="setting-section">\n      <h2 class="setting-title">Grid size</h2>''',
'''    <div class="setting-section">\n      <h2 class="setting-title">Game type</h2>\n      <div class="choice-grid game-types" id="gameTypeChoices">\n        <button class="choice selected" type="button" data-game-type="2d"><strong>2D Word Path</strong><span>Classic flat grid with sizes, difficulties, Daily, Mystery and Challenge.</span></button>\n        <button class="choice" type="button" data-game-type="3d"><strong>3D Word Cube</strong><span>Rotate a 3×3 cube and trace words across faces and cube edges.</span></button>\n      </div>\n    </div>\n\n    <div class="setting-section" id="gridSetting">\n      <h2 class="setting-title">Grid size</h2>''',
    'game type selector')
index = rep(index,
'''    <div class="setting-section">\n      <h2 class="setting-title">Difficulty</h2>''',
'''    <div class="setting-section" id="difficultySetting">\n      <h2 class="setting-title">Difficulty</h2>''',
    'difficulty section id')
index = rep(index,
'''    <div class="setting-section">\n      <h2 class="setting-title">Game mode</h2>''',
'''    <div class="setting-section" id="modeSetting">\n      <h2 class="setting-title">Game mode</h2>''',
    'mode section id')
index = rep(index, '<button class="start-btn" id="startBtn" type="button">Start game</button>', '<button class="start-btn" id="startBtn" type="button">Start 2D game</button>', 'start button')

index = rep(index,
'  const gridChoices = document.getElementById("gridChoices");',
'  const gameTypeChoices = document.getElementById("gameTypeChoices");\n  const gridSetting = document.getElementById("gridSetting");\n  const difficultySetting = document.getElementById("difficultySetting");\n  const modeSetting = document.getElementById("modeSetting");\n  const gridChoices = document.getElementById("gridChoices");',
'game type DOM')
index = rep(index,
'  let pendingGrid = 6;',
'  let pendingGameType = localStorage.getItem("anitasWordPathPreferredGameType")==="3d"?"3d":"2d";\n  let pendingGrid = 6;',
'game type state')

index = rep(index,
'''  const DEFAULT_STATS = {\n    totalPuzzles:0,totalWords:0,totalBonus:0,bestCombo:0,bestScore:0,longestWord:"",\n    dailyStreak:0,lastDailyDate:"",recentWords:[],themeProgress:{},dailyBest:{},soundEnabled:true,\n    completedPuzzles:[],completedFingerprints:[]\n  };''',
'''  const DEFAULT_STATS = {\n    totalPuzzles:0,totalWords:0,totalBonus:0,bestCombo:0,bestScore:0,longestWord:"",\n    dailyStreak:0,lastDailyDate:"",recentWords:[],themeProgress:{},dailyBest:{},soundEnabled:true,\n    completedPuzzles:[],completedFingerprints:[],cubePuzzles:0,cubeWords:0,cubeBonus:0,cubeBestScore:0\n  };''',
'default cube stats')
index = rep(index,
'    profileSummary.textContent=`${activeProfileName||"Player"} · ${playerStats.totalPuzzles} puzzles completed · ${playerStats.totalWords} theme words · ${playerStats.totalBonus} bonus words · best combo ${playerStats.bestCombo} · daily streak ${playerStats.dailyStreak} · themes ${unlockedThemeCount()}/${THEME_POOLS.length} unlocked`;',
'    profileSummary.textContent=`${activeProfileName||"Player"} · ${playerStats.totalPuzzles} puzzles completed · ${(playerStats.cubePuzzles||0)} 3D cubes · ${playerStats.totalWords} theme words · ${playerStats.totalBonus} bonus words · best combo ${playerStats.bestCombo} · daily streak ${playerStats.dailyStreak} · themes ${unlockedThemeCount()}/${THEME_POOLS.length} unlocked`;',
'profile summary cube count')

index = rep(index,
'''  gridChoices.addEventListener("click",e=>{''',
'''  function updateGameTypeUI(){\n    const cube=pendingGameType==="3d";\n    gridSetting.classList.toggle("hidden",cube);\n    difficultySetting.classList.toggle("hidden",cube);\n    modeSetting.classList.toggle("hidden",cube);\n    startBtn.textContent=cube?"Start 3D cube":"Start 2D game";\n    setSelectedChoice(gameTypeChoices,"gameType",pendingGameType);\n    updatePausedResumeButton();\n  }\n\n  gameTypeChoices.addEventListener("click",e=>{\n    const btn=e.target.closest("[data-game-type]");\n    if(!btn)return;\n    pendingGameType=btn.dataset.gameType;\n    try{localStorage.setItem("anitasWordPathPreferredGameType",pendingGameType)}catch(_){}\n    updateGameTypeUI();\n  });\n\n  gridChoices.addEventListener("click",e=>{''',
'game type logic')

index = rep(index,
'    resumePausedBtn.classList.toggle("hidden",!snapshot);',
'    resumePausedBtn.classList.toggle("hidden",pendingGameType==="3d"||!snapshot);',
'paused button respects game type')

index = rep(index,
'''  async function startGame(){\n    clearPausedSnapshot();''',
'''  async function startGame(){\n    if(pendingGameType==="3d"){\n      window.location.href="cube/";\n      return;\n    }\n    clearPausedSnapshot();''',
'3D navigation')

index = rep(index,
'  updateSoundButton();\n})();',
'  updateGameTypeUI();\n  updateSoundButton();\n})();',
'initial game type state')

# ---------------------------------------------------------------------------
# 3D Cube v1.0.0: same themes, same local profile and same statistics.
# ---------------------------------------------------------------------------
cube_js = cube_js.replace("const APP_VERSION = '0.8.0';", "const APP_VERSION = '1.0.0';", 1)
wt_start = cube_js.index('  const WORD_THEMES = [')
wt_end = cube_js.index('  const LETTER_POOL =', wt_start)
cube_js = cube_js[:wt_start] + '''  const WORD_THEMES = (window.ANITAS_THEME_POOLS||[]).map(theme=>({name:theme.name,words:[...theme.words]}));\n  if(!WORD_THEMES.length)throw new Error('Shared theme library failed to load.');\n  const WORD_THEME_WORD_COUNT = WORD_THEMES.reduce((sum,theme)=>sum+new Set(theme.words).size,0);\n''' + cube_js[wt_end:]

cube_js = rep(cube_js,
"  const ENGLISH_WORDS = window.ANITAS_ENGLISH_WORDS instanceof Set ? window.ANITAS_ENGLISH_WORDS : new Set();\n",
"""  const ENGLISH_WORDS = window.ANITAS_ENGLISH_WORDS instanceof Set ? window.ANITAS_ENGLISH_WORDS : new Set();
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
""",
'cube user infrastructure')

cube_js = rep(cube_js,
"  const wordThemeNameEl = document.getElementById('wordThemeName');",
"  const wordThemeNameEl = document.getElementById('wordThemeName');\n  const cubePlayerNameEl = document.getElementById('cubePlayerName');\n  const switchProfileBtn = document.getElementById('switchProfileBtn');",
'cube user DOM')
cube_js = rep(cube_js,
"  let previousWordThemeName = '';",
"  let previousWordThemeName = '';\n  let cubePuzzleCode = '';\n  let cubePuzzleFingerprint = '';\n  let cubeRecorded = false;",
'cube persistence state')

# White/light is now the default Cube design unless the user explicitly saved another choice.
cube_js = cube_js.replace("    let saved='dark';\n    try{ saved=localStorage.getItem(THEME_KEY)||'dark';", "    let saved='light';\n    try{ saved=localStorage.getItem(THEME_KEY)||'light';", 1)

# Same word source, with Cube-compatible lengths and user-aware recent-word preference.
cube_js = rep(cube_js,
"    const words=shuffle([...new Set(pool)].filter(w=>w.length>=4 && w.length<=10));",
"    const recent=new Set(playerStats.recentWords||[]);\n    const words=shuffle([...new Set(pool)].filter(w=>w.length>=3 && w.length<=14)).sort((a,b)=>Number(recent.has(a))-Number(recent.has(b)));",
'cube word source')
cube_js = rep(cube_js,
"    for(const count of [8,9,10,7]){",
"    for(const count of [7,8,9,10,6,11,5,12,4]){",
'cube exact fill counts')

cube_js = rep(cube_js,
"    const alternatives=WORD_THEMES.filter(theme=>theme.name!==previousWordThemeName);\n    const themeOrder=shuffle(alternatives.length?alternatives:WORD_THEMES);",
"    const available=availableWordThemes();\n    const alternatives=available.filter(theme=>theme.name!==previousWordThemeName);\n    const themeOrder=shuffle(alternatives.length?alternatives:available);",
'cube shared unlocks')

cube_js = rep(cube_js,
"""  function newPuzzle(){
    stopSelectionTimer(); selected=[]; foundTargets=new Set(); foundBonus=new Set(); foundPathByWord=new Map(); solvedNodes=new Set(); cubeCleared=false;
    score=0; bonusScore=0; crossFaceFinds=0; evaluating=false; winEl.classList.remove('show'); generatePuzzle(); wordThemeNameEl.textContent=`${activeWordTheme.name} set`; renderTargets(); renderBonus(); updateSelectionUI(); updateStats(); resetView(false); draw(); toast(`New ${activeWordTheme.name} cube · v${APP_VERSION}`);
  }""",
"""  function makeCubeFingerprint(){
    const targetKey=[...targets].sort().join(',');
    return `CUBE-${activeWordTheme.name}-${hashText(`${board.join('')}|${targetKey}`).toString(36).toUpperCase()}`;
  }

  function newPuzzle(){
    stopSelectionTimer(); selected=[]; foundTargets=new Set(); foundBonus=new Set(); foundPathByWord=new Map(); solvedNodes=new Set(); cubeCleared=false;
    score=0; bonusScore=0; crossFaceFinds=0; evaluating=false; cubeRecorded=false; winEl.classList.remove('show');
    let guard=0;
    do{ generatePuzzle(); cubePuzzleFingerprint=makeCubeFingerprint(); guard++; }
    while(playerStats.completedFingerprints.includes(cubePuzzleFingerprint) && guard<24);
    cubePuzzleCode=`WC-${Date.now().toString(36).toUpperCase()}-${activeWordTheme.name.toUpperCase()}`;
    wordThemeNameEl.textContent=`${activeWordTheme.name} set`; renderTargets(); renderBonus(); updateSelectionUI(); updateStats(); resetView(false); draw(); toast(`New ${activeWordTheme.name} cube · ${activeProfileName} · v${APP_VERSION}`);
  }""",
'cube new puzzle persistence')

cube_js = rep(cube_js,
"  function showWin(){ cubeCleared=true; draw(); winText.textContent=`You cleared the ${activeWordTheme.name} cube: all ${TILE_COUNT} letters, ${targets.length} target words, ${crossFaceFinds} cross-face finds and ${score.toLocaleString()} points.`; setTimeout(()=>winEl.classList.add('show'),260); }",
"""  function recordCubeCompletion(){
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
    winText.textContent=`${activeProfileName}, you cleared the ${activeWordTheme.name} cube: all ${TILE_COUNT} letters, ${targets.length} target words, ${crossFaceFinds} cross-face finds and ${score.toLocaleString()} points.`;
    setTimeout(()=>winEl.classList.add('show'),260);
  }""",
'cube completion stats')

cube_js = rep(cube_js,
"    checkBtn.addEventListener('click',evaluateSelection); clearBtn.addEventListener('click',clearSelection); newBtn.addEventListener('click',newPuzzle); resetViewBtn.addEventListener('click',()=>resetView(true)); nextCubeBtn.addEventListener('click',newPuzzle); themeBtn.addEventListener('click',()=>applyTheme(currentTheme==='light'?'dark':'light'));",
"    checkBtn.addEventListener('click',evaluateSelection); clearBtn.addEventListener('click',clearSelection); newBtn.addEventListener('click',newPuzzle); resetViewBtn.addEventListener('click',()=>resetView(true)); nextCubeBtn.addEventListener('click',newPuzzle); themeBtn.addEventListener('click',()=>applyTheme(currentTheme==='light'?'dark':'light'));\n    switchProfileBtn.addEventListener('click',()=>{localStorage.removeItem('anitasWordPathActiveProfile');sessionStorage.removeItem('anitasWordPathActiveProfile');window.location.href='../';});",
'cube switch profile')
cube_js = rep(cube_js,
"  try{ buildGraph(); validateCrossFaceGeometry(); bindEvents(); initTheme(); resizeCanvas(); newPuzzle(); }",
"  try{ cubePlayerNameEl.textContent=activeProfileName; buildGraph(); validateCrossFaceGeometry(); bindEvents(); initTheme(); resizeCanvas(); newPuzzle(); }",
'cube profile display')

# Cube HTML: integrated navigation, shared themes and light-first markup.
cube_html = cube_html.replace('<html lang="en">', '<html lang="en" data-theme="light">', 1)
cube_html = cube_html.replace('content="#091311"', 'content="#f3f7f4"', 1)
cube_html = cube_html.replace('v0.8.0', 'v1.0.0')
cube_html = cube_html.replace('3D prototype', '3D game', 1)
cube_html = rep(cube_html,
'''      <div class="top-actions">\n        <a class="ghost-btn" href="../">2D game</a>\n        <button class="ghost-btn" id="themeBtn" type="button" aria-pressed="false">Light mode</button>''',
'''      <div class="top-actions">\n        <span class="profile-badge" id="cubePlayerName">Player</span>\n        <a class="ghost-btn" href="../">Game menu</a>\n        <a class="ghost-btn" href="../stats.html">Statistics</a>\n        <button class="ghost-btn" id="switchProfileBtn" type="button">Switch player</button>\n        <button class="ghost-btn" id="themeBtn" type="button" aria-pressed="true">Dark mode</button>''',
'cube integrated actions')
cube_html = cube_html.replace('Each new cube rotates through 14 curated themes with 600+ target words. Every tile still belongs to exactly one target route, all 54 letters are covered, and every target has exactly one valid path.', f'The 3D cube uses the same {theme_count} themes and {word_count}+ theme words as the 2D game. Every tile belongs to exactly one target route, all 54 letters are covered, and every target has exactly one valid path.', 1)
cube_html = rep(cube_html, '<script src="../words.js"></script>\n  <script src="cube.js?v=1.0.0"></script>', '<script src="../themes.js?v=1.0.0"></script>\n  <script src="../words.js"></script>\n  <script src="cube.js?v=1.0.0"></script>', 'cube shared theme script')

# Small header badge for the active profile.
if '.profile-badge{' not in cube_css:
    cube_css += '''\n.profile-badge{display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:999px;padding:9px 12px;background:var(--panel-soft);color:var(--text);font-size:12px;font-weight:900;white-space:nowrap}\n'''

# ---------------------------------------------------------------------------
# Statistics: Cube completions are part of the same day/week history and also
# get a compact 2D vs 3D breakdown.
# ---------------------------------------------------------------------------
stats = rep(stats,
'    .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:16px}',
'    .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:16px}\n    .mode-summary{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:16px}',
'stats mode CSS')
stats = rep(stats,
'''    </div>\n\n    <div class="section">\n      <div class="section-head"><h2>This week</h2>''',
'''    </div>\n\n    <div class="mode-summary">\n      <div class="summary-card"><span>2D Word Path</span><b id="pathPuzzles">0</b><small>completed puzzles</small></div>\n      <div class="summary-card"><span>3D Word Cube</span><b id="cubePuzzles">0</b><small>completed cubes</small></div>\n    </div>\n\n    <div class="section">\n      <div class="section-head"><h2>This week</h2>''',
'stats game type cards')
stats = rep(stats,
'  const switchBtn=document.getElementById("switchBtn");',
'  const switchBtn=document.getElementById("switchBtn");\n  const pathPuzzles=document.getElementById("pathPuzzles");\n  const cubePuzzles=document.getElementById("cubePuzzles");',
'stats refs')
stats = rep(stats,
'''    m=String(code).match(/^WP-(?:CLASSIC|MIXED|MYSTERY|CHALLENGE)-(?:6|9|12)-(?:BEGINNER|MIDDLE|HARD)-([0-9A-Z]+)-/i);\n    if(!m)return null;\n    const ms=parseInt(m[1],36);''',
'''    m=String(code).match(/^WP-(?:CLASSIC|MIXED|MYSTERY|CHALLENGE)-(?:6|9|12)-(?:BEGINNER|MIDDLE|HARD)-([0-9A-Z]+)-/i);\n    if(!m)m=String(code).match(/^WC-([0-9A-Z]+)-/i);\n    if(!m)return null;\n    const ms=parseInt(m[1],36);''',
'stats cube date parsing')
stats = rep(stats,
'    subtitle.textContent=`${stats.totalPuzzles||0} puzzles completed in this local profile`;',
'    const cubeTotal=stats.cubePuzzles||0;\n    const pathTotal=Math.max(0,(stats.totalPuzzles||0)-cubeTotal);\n    subtitle.textContent=`${stats.totalPuzzles||0} puzzles completed in this local profile · 2D and 3D combined`;\n    pathPuzzles.textContent=pathTotal;\n    cubePuzzles.textContent=cubeTotal;',
'stats cube breakdown')

# Write final files.
index_path.write_text(index, encoding='utf-8')
cube_js_path.write_text(cube_js, encoding='utf-8')
cube_html_path.write_text(cube_html, encoding='utf-8')
cube_css_path.write_text(cube_css, encoding='utf-8')
stats_path.write_text(stats, encoding='utf-8')

print(f'Integrated v1.0.0: {theme_count} shared themes / {word_count} shared theme words')
