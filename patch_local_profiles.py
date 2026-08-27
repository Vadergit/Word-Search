from pathlib import Path
import re

path=Path('index.html')
text=path.read_text(encoding='utf-8')

def replace_once(old,new,label):
    global text
    if old not in text:
        raise SystemExit(f'Could not find {label}')
    text=text.replace(old,new,1)

def sub_one(pattern,replacement,label,flags=re.S):
    global text
    text2,count=re.subn(pattern,replacement,text,count=1,flags=flags)
    if count!=1:
        raise SystemExit(f'Could not patch {label}: matches={count}')
    text=text2

# CSS for local profile login
css='''
    .login-screen{
      width:min(560px,100%);margin:54px auto;background:rgba(255,255,255,.95);
      border:1px solid rgba(255,255,255,.98);box-shadow:var(--shadow);border-radius:30px;
      padding:clamp(24px,5vw,42px);text-align:center;
    }
    .login-screen h1{margin:0;font-size:clamp(36px,7vw,58px);letter-spacing:-.05em;line-height:.98}
    .login-screen p{color:var(--muted);font-size:13px;line-height:1.55;margin:12px auto 24px;max-width:430px}
    .profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}
    .profile-card{border:1px solid var(--line);background:#fafcfa;border-radius:18px;padding:18px 14px;cursor:pointer;text-align:center;transition:.14s ease}
    .profile-card:hover{border-color:#bfd5c4;transform:translateY(-1px)}
    .profile-card.selected{border-color:var(--accent);box-shadow:inset 0 0 0 2px rgba(89,201,196,.18);background:rgba(89,201,196,.07)}
    .profile-avatar{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;margin:0 auto 9px;background:#18251c;color:white;font-weight:900;font-size:18px}
    .profile-card strong{display:block;font-size:18px}.profile-card span{display:block;color:var(--muted);font-size:11px;margin-top:4px}
    .pin-wrap{display:grid;grid-template-columns:1fr auto;gap:9px;margin-top:16px}
    .pin-input{width:100%;border:1px solid var(--line);border-radius:14px;padding:13px 14px;background:#fafcfa;text-align:center;font-size:20px;letter-spacing:.28em;font-weight:800}
    .login-error{min-height:18px;color:#a3473c;font-size:12px;margin-top:8px}
    .local-note{margin-top:18px!important;font-size:11px!important;color:#879087!important}
    .player-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 18px;padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:#f7faf7}
    .player-bar strong{font-size:13px}.player-bar span{font-size:11px;color:var(--muted)}
    .player-pill{border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:7px 10px;background:rgba(255,255,255,.08);color:white;font-size:11px;font-weight:850}
    @media(max-width:620px){.profile-grid{grid-template-columns:1fr}.pin-wrap{grid-template-columns:1fr}}
'''
replace_once('    @media(max-width:900px){',css+'\n    @media(max-width:900px){','css anchor')

# Login screen before start screen; start screen hidden until successful PIN
replace_once('<main class="app">\n  <section class="start-screen" id="startScreen">','''<main class="app">
  <section class="login-screen" id="loginScreen">
    <div class="start-kicker">Local profiles</div>
    <h1>Anitas Word Path</h1>
    <p>Choose your profile and enter the local PIN. Progress stays only in this browser and is never uploaded.</p>
    <div class="profile-grid" id="profileGrid">
      <button class="profile-card" type="button" data-profile="Anita"><div class="profile-avatar">A</div><strong>Anita</strong><span>Local progress</span></button>
      <button class="profile-card" type="button" data-profile="Dario"><div class="profile-avatar">D</div><strong>Dario</strong><span>Local progress</span></button>
    </div>
    <div class="pin-wrap">
      <input class="pin-input" id="pinInput" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="PIN" disabled />
      <button class="btn primary" id="loginBtn" type="button" disabled>Log in</button>
    </div>
    <div class="login-error" id="loginError"></div>
    <p class="local-note">This PIN is only a local profile lock, not an online account.</p>
  </section>

  <section class="start-screen hidden" id="startScreen">''','login screen')

# Player bar inside start screen
replace_once('''    <div class="start-kicker">Offline word game</div>
    <h1>Anitas Word Path</h1>''','''    <div class="player-bar"><div><strong id="startPlayerName">Player</strong><span>Local profile</span></div><button class="btn secondary" id="switchProfileStartBtn" type="button">Switch player</button></div>
    <div class="start-kicker">Offline word game</div>
    <h1>Anitas Word Path</h1>''','start player bar')

# Player info in game banner
replace_once('''        <span class="mode-pill" id="modePill">6×6 · Beginner</span>
        <button class="mode-button" id="soundBtn" type="button">Sound on</button>''','''        <span class="player-pill" id="gamePlayerName">Player</span>
        <span class="mode-pill" id="modePill">6×6 · Beginner</span>
        <button class="mode-button" id="switchProfileGameBtn" type="button">Switch player</button>
        <button class="mode-button" id="soundBtn" type="button">Sound on</button>''','game player controls')

# DOM refs
replace_once('''  const startScreen = document.getElementById("startScreen");
  const gameScreen = document.getElementById("gameScreen");''','''  const loginScreen = document.getElementById("loginScreen");
  const startScreen = document.getElementById("startScreen");
  const gameScreen = document.getElementById("gameScreen");
  const profileGrid = document.getElementById("profileGrid");
  const pinInput = document.getElementById("pinInput");
  const loginBtn = document.getElementById("loginBtn");
  const loginError = document.getElementById("loginError");
  const startPlayerName = document.getElementById("startPlayerName");
  const gamePlayerName = document.getElementById("gamePlayerName");
  const switchProfileStartBtn = document.getElementById("switchProfileStartBtn");
  const switchProfileGameBtn = document.getElementById("switchProfileGameBtn");''','profile DOM refs')

# State / profile definitions
replace_once('''  const DEFAULT_STATS = {
    totalPuzzles:0,totalWords:0,totalBonus:0,bestCombo:0,bestScore:0,longestWord:"",
    dailyStreak:0,lastDailyDate:"",recentWords:[],themeProgress:{},dailyBest:{},soundEnabled:true
  };''','''  const LOCAL_PROFILES = {
    Anita:{pinHash:"9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0"},
    Dario:{pinHash:"9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0"}
  };
  let activeProfileName="";
  let pendingProfileName="";
  let currentPuzzleFingerprint="";

  const DEFAULT_STATS = {
    totalPuzzles:0,totalWords:0,totalBonus:0,bestCombo:0,bestScore:0,longestWord:"",
    dailyStreak:0,lastDailyDate:"",recentWords:[],themeProgress:{},dailyBest:{},soundEnabled:true,
    completedPuzzles:[],completedFingerprints:[]
  };''','profile state')

# Per-profile storage
sub_one(r'''  function loadStats\(\)\{.*?\n  \}\n  let playerStats=loadStats\(\);\n\n  function saveStats\(\)\{.*?\n  \}''','''  function profileStorageKey(name=activeProfileName){
    return `anitasWordPathStats:${name}`;
  }

  function loadStats(name=activeProfileName){
    try{
      if(!name)return structuredClone(DEFAULT_STATS);
      const raw=JSON.parse(localStorage.getItem(profileStorageKey(name))||"null");
      if(!raw)return structuredClone(DEFAULT_STATS);
      return {...structuredClone(DEFAULT_STATS),...raw,
        themeProgress:raw.themeProgress||{},dailyBest:raw.dailyBest||{},recentWords:raw.recentWords||[],
        completedPuzzles:raw.completedPuzzles||[],completedFingerprints:raw.completedFingerprints||[]};
    }catch(_){return structuredClone(DEFAULT_STATS)}
  }
  let playerStats=loadStats();

  function saveStats(){
    if(!activeProfileName)return;
    try{localStorage.setItem(profileStorageKey(),JSON.stringify(playerStats))}catch(_){/* local storage unavailable */}
  }''','profile storage')

# Login helpers before dateKey
replace_once('''  function dateKey(date=new Date()){''','''  async function sha256(value){
    const data=new TextEncoder().encode(value);
    const digest=await crypto.subtle.digest("SHA-256",data);
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }

  function selectProfile(name){
    pendingProfileName=name;
    profileGrid.querySelectorAll(".profile-card").forEach(card=>card.classList.toggle("selected",card.dataset.profile===name));
    pinInput.disabled=false;
    loginBtn.disabled=false;
    loginError.textContent="";
    pinInput.value="";
    pinInput.focus();
  }

  async function loginProfile(){
    const profile=LOCAL_PROFILES[pendingProfileName];
    if(!profile)return;
    const pin=pinInput.value.trim();
    if(pin.length!==4){loginError.textContent="Enter the 4-digit PIN.";return;}
    try{
      const hash=await sha256(pin);
      if(hash!==profile.pinHash){loginError.textContent="Wrong PIN.";pinInput.select();return;}
    }catch(_){
      loginError.textContent="PIN check is not supported in this browser.";
      return;
    }
    activeProfileName=pendingProfileName;
    playerStats=loadStats(activeProfileName);
    startPlayerName.textContent=activeProfileName;
    gamePlayerName.textContent=activeProfileName;
    renderProfileSummary();
    updateSoundButton();
    loginScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
    pinInput.value="";
  }

  function switchProfile(){
    clearTimeout(resetTimer);
    winEl.classList.remove("show");
    startScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    activeProfileName="";
    pendingProfileName="";
    playerStats=loadStats();
    profileGrid.querySelectorAll(".profile-card").forEach(card=>card.classList.remove("selected"));
    pinInput.value="";
    pinInput.disabled=true;
    loginBtn.disabled=true;
    loginError.textContent="";
  }

  function puzzleFingerprint(){
    const targetKey=[...targets].sort().join(",");
    return `${SIZE}-${difficulty}-${currentTheme?.name||""}-${hashSeed(`${board.join("")}|${targetKey}`).toString(36).toUpperCase()}`;
  }

  function isCompletedFingerprint(fp){return Boolean(fp)&&playerStats.completedFingerprints.includes(fp)}

  function dateKey(date=new Date()){''','login helpers')

# Profile summary includes completed count and profile name
replace_once('''    profileSummary.textContent=`${playerStats.totalPuzzles} puzzles completed · ${playerStats.totalWords} theme words · ${playerStats.totalBonus} bonus words · best combo ${playerStats.bestCombo} · daily streak ${playerStats.dailyStreak} · themes ${unlockedThemeCount()}/${THEME_POOLS.length} unlocked`;''','''    profileSummary.textContent=`${activeProfileName||"Player"} · ${playerStats.totalPuzzles} puzzles completed · ${playerStats.totalWords} theme words · ${playerStats.totalBonus} bonus words · best combo ${playerStats.bestCombo} · daily streak ${playerStats.dailyStreak} · themes ${unlockedThemeCount()}/${THEME_POOLS.length} unlocked`;''','profile summary text')

# Save solved puzzle/fingerprint on completion
replace_once('''    playerStats.totalPuzzles++;
    playerStats.totalWords+=targets.length;''','''    playerStats.totalPuzzles++;
    playerStats.totalWords+=targets.length;
    playerStats.completedPuzzles=[...new Set([puzzleSeed,...playerStats.completedPuzzles])].slice(0,3000);
    if(currentPuzzleFingerprint){
      playerStats.completedFingerprints=[...new Set([currentPuzzleFingerprint,...playerStats.completedFingerprints])].slice(0,3000);
    }''','completion tracking')

# Regenerate normal puzzles if this profile already completed same generated board
sub_one(r'''    puzzleSeed=makePuzzleCode\(\);\n    setPuzzleRandom\(puzzleSeed\);\n\n    try\{\n      generateBoard\(\);\n      makeChallenge\(\);''','''    try{
      let repeatGuard=0;
      do{
        puzzleSeed=makePuzzleCode();
        setPuzzleRandom(puzzleSeed);
        generateBoard();
        currentPuzzleFingerprint=puzzleFingerprint();
        repeatGuard++;
      }while(
        activeGameMode!=="daily" && !customSeed &&
        isCompletedFingerprint(currentPuzzleFingerprint) && repeatGuard<24
      );
      makeChallenge();''','repeat prevention')

# Ensure puzzle fingerprint reset per new puzzle
replace_once('''    newlyUnlocked=[];
    hintPath=null;''','''    newlyUnlocked=[];
    currentPuzzleFingerprint="";
    hintPath=null;''','fingerprint reset')

# Bind login / switch buttons before existing start button binding
replace_once('''  startBtn.addEventListener("click",startGame);''','''  profileGrid.addEventListener("click",e=>{
    const card=e.target.closest("[data-profile]");
    if(card)selectProfile(card.dataset.profile);
  });
  loginBtn.addEventListener("click",loginProfile);
  pinInput.addEventListener("keydown",e=>{if(e.key==="Enter")loginProfile()});
  switchProfileStartBtn.addEventListener("click",switchProfile);
  switchProfileGameBtn.addEventListener("click",switchProfile);

  startBtn.addEventListener("click",startGame);''','login bindings')

# Do not render profile summary before login. Keep sound button harmless.
replace_once('''  renderProfileSummary();
  updateSoundButton();
})();''','''  updateSoundButton();
})();''','startup profile render')

# Sanity checks
assert 'Anita:{pinHash:' in text
assert 'Dario:{pinHash:' in text
assert 'anitasWordPathStats:${name}' in text
assert 'completedFingerprints' in text
assert 'isCompletedFingerprint(currentPuzzleFingerprint)' in text
assert 'const RESET_DELAY = 1500;' in text
assert 'Hint tiles highlighted' in text

path.write_text(text,encoding='utf-8')
