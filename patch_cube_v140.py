from pathlib import Path

root_path=Path('index.html')
html_path=Path('cube/index.html')
css_path=Path('cube/cube.css')
js_path=Path('cube/cube.js')

root=root_path.read_text(encoding='utf-8')
html=html_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')
js=js_path.read_text(encoding='utf-8')

# Version bump and cache busting.
root=root.replace('v1.3.0','v1.4.0').replace('themes.js?v=1.3.0','themes.js?v=1.4.0')
html=html.replace('v1.3.0','v1.4.0')
html=html.replace('cube.css?v=1.3.0','cube.css?v=1.4.0')
html=html.replace('../themes.js?v=1.3.0','../themes.js?v=1.4.0')
html=html.replace('cube.js?v=1.3.0','cube.js?v=1.4.0')
js=js.replace("const APP_VERSION = '1.3.0';","const APP_VERSION = '1.4.0';",1)

# Stronger theme badge in top bar.
old='<span class="theme-badge" id="cubeThemeBadge">Theme: loading…</span>'
new='''<span class="theme-badge" id="cubeThemeBadge">
          <span class="theme-badge-label">Theme</span>
          <strong id="cubeThemeValue">Loading…</strong>
        </span>'''
if old not in html: raise SystemExit('top theme badge anchor missing')
html=html.replace(old,new,1)

# Prominent theme block in the right panel.
old='''          <div class="section-heading">
            <div><span id="wordThemeName">Cosmic set</span><h2>Target words</h2></div>
            <div class="face-badge">3×3 × 6</div>
          </div>'''
new='''          <div class="theme-showcase">
            <span>Current theme</span>
            <strong id="wordThemeName">Cosmic</strong>
          </div>
          <div class="section-heading target-heading">
            <div><h2>Target words</h2></div>
            <div class="face-badge">3×3 × 6</div>
          </div>'''
if old not in html: raise SystemExit('side theme heading anchor missing')
html=html.replace(old,new,1)

# Loading overlay with a rotating empty 3x3 cube.
anchor='''  <div class="toast" id="toast" role="status" aria-live="polite"></div>'''
loader='''  <div class="cube-loading show" id="cubeLoading" role="status" aria-live="polite" aria-busy="true">
    <div class="cube-loading-card">
      <div class="loader-cube-scene" aria-hidden="true">
        <div class="loader-cube">
          <span class="loader-face loader-front"></span>
          <span class="loader-face loader-back"></span>
          <span class="loader-face loader-right"></span>
          <span class="loader-face loader-left"></span>
          <span class="loader-face loader-top"></span>
          <span class="loader-face loader-bottom"></span>
        </div>
      </div>
      <strong id="cubeLoadingTitle">Building a new word cube…</strong>
      <span id="cubeLoadingDetail">Choosing a theme and preparing unique routes</span>
    </div>
  </div>

'''+anchor
if anchor not in html: raise SystemExit('loader insertion anchor missing')
html=html.replace(anchor,loader,1)

# DOM references for loader and nested theme value.
old="""  const cubeThemeBadge = document.getElementById('cubeThemeBadge');
  const difficultyMessageEl = document.getElementById('difficultyMessage');"""
new="""  const cubeThemeBadge = document.getElementById('cubeThemeBadge');
  const cubeThemeValue = document.getElementById('cubeThemeValue');
  const cubeLoading = document.getElementById('cubeLoading');
  const cubeLoadingTitle = document.getElementById('cubeLoadingTitle');
  const cubeLoadingDetail = document.getElementById('cubeLoadingDetail');
  const difficultyMessageEl = document.getElementById('difficultyMessage');"""
if old not in js: raise SystemExit('JS DOM anchor missing')
js=js.replace(old,new,1)

# Loading helpers. A short yield guarantees the loader is actually painted before
# any synchronous generation/fallback work starts.
anchor="""  function makeCubeFingerprint(){
    const targetKey=[...targets].sort().join(',');
    return `CUBE-${cubeDifficulty}-${activeWordTheme.name}-${hashText(`${board.join('')}|${targetKey}`).toString(36).toUpperCase()}`;
  }

"""
addition=anchor+"""  function setCubeLoading(active){
    if(!cubeLoading) return;
    cubeLoading.classList.toggle('show',active);
    cubeLoading.setAttribute('aria-busy',active?'true':'false');
    if(cubeLoadingTitle) cubeLoadingTitle.textContent='Building a new word cube…';
    if(cubeLoadingDetail) cubeLoadingDetail.textContent='Choosing a theme and preparing unique routes';
    newBtn.disabled=active;
    nextCubeBtn.disabled=active;
    resetViewBtn.disabled=active;
  }

  function letLoaderPaint(){
    return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  }

"""
if anchor not in js: raise SystemExit('loader helper anchor missing')
js=js.replace(anchor,addition,1)

# Make newPuzzle async, show loader before generation, and handle generation errors locally.
start='''  function newPuzzle(){
    stopSolveClock();
    stopSelectionTimer(); clearTimeout(hintTimer); hintNodes=new Set(); selected=[]; foundTargets=new Set(); foundBonus=new Set(); foundPathByWord=new Map(); solvedNodes=new Set(); cubeCleared=false;
    score=0; bonusScore=0; crossFaceFinds=0; cubeHints=0; evaluating=false; cubeRecorded=false; winEl.classList.remove('show');
    let guard=0;
    do{ generatePuzzle(); cubePuzzleFingerprint=makeCubeFingerprint(); guard++; }
    while(playerStats.completedFingerprints.includes(cubePuzzleFingerprint) && guard<24);
    cubePuzzleCode=`WC-${Date.now().toString(36).toUpperCase()}-${cubeDifficulty.toUpperCase()}-${activeWordTheme.name.toUpperCase()}`;
    wordThemeNameEl.textContent=`${activeWordTheme.name} set`; cubeThemeBadge.textContent=`Theme: ${activeWordTheme.name}`; updateDifficultyUI(); renderTargets(); renderBonus(); updateSelectionUI(); updateStats(); resetView(false); draw(); startSolveClock(); toast(`New ${CUBE_DIFFICULTIES[cubeDifficulty].label} ${activeWordTheme.name} cube · ${activeProfileName} · v${APP_VERSION}`);
  }
'''
replacement='''  async function newPuzzle(){
    stopSolveClock();
    stopSelectionTimer();
    clearTimeout(hintTimer);
    winEl.classList.remove('show');
    setCubeLoading(true);
    await letLoaderPaint();
    try{
      hintNodes=new Set(); selected=[]; foundTargets=new Set(); foundBonus=new Set(); foundPathByWord=new Map(); solvedNodes=new Set(); cubeCleared=false;
      score=0; bonusScore=0; crossFaceFinds=0; cubeHints=0; evaluating=false; cubeRecorded=false;
      let guard=0;
      do{ generatePuzzle(); cubePuzzleFingerprint=makeCubeFingerprint(); guard++; }
      while(playerStats.completedFingerprints.includes(cubePuzzleFingerprint) && guard<24);
      cubePuzzleCode=`WC-${Date.now().toString(36).toUpperCase()}-${cubeDifficulty.toUpperCase()}-${activeWordTheme.name.toUpperCase()}`;
      wordThemeNameEl.textContent=activeWordTheme.name;
      if(cubeThemeValue) cubeThemeValue.textContent=activeWordTheme.name;
      updateDifficultyUI(); renderTargets(); renderBonus(); updateSelectionUI(); updateStats(); resetView(false); draw(); startSolveClock();
      toast(`New ${CUBE_DIFFICULTIES[cubeDifficulty].label} ${activeWordTheme.name} cube · ${activeProfileName} · v${APP_VERSION}`);
    }catch(error){
      console.error(error);
      if(cubeThemeValue) cubeThemeValue.textContent='Unavailable';
      if(wordThemeNameEl) wordThemeNameEl.textContent='Unavailable';
      currentWordEl.textContent='Could not generate cube';
      selectionMetaEl.textContent='Press New cube to retry.';
      toast('Cube generation failed · please retry','error');
    }finally{
      setCubeLoading(false);
    }
  }
'''
if start not in js: raise SystemExit('newPuzzle function anchor missing')
js=js.replace(start,replacement,1)

# Startup catch must not destroy the nested theme badge structure.
old="catch(error){ console.error(error); if(cubeThemeBadge)cubeThemeBadge.textContent='Theme: unavailable'; if(wordThemeNameEl)wordThemeNameEl.textContent='Generation failed'; currentWordEl.textContent='Could not generate cube'; selectionMetaEl.textContent='Press New cube to retry.'; }"
new="catch(error){ console.error(error); if(cubeThemeValue)cubeThemeValue.textContent='Unavailable'; if(wordThemeNameEl)wordThemeNameEl.textContent='Unavailable'; if(cubeLoading)cubeLoading.classList.remove('show'); currentWordEl.textContent='Could not generate cube'; selectionMetaEl.textContent='Press New cube to retry.'; }"
if old not in js: raise SystemExit('startup catch anchor missing')
js=js.replace(old,new,1)

# Append v1.4.0 presentation styles as overrides, avoiding fragile edits to the
# existing responsive/light-theme rules.
css += r'''

/* v1.4.0 — stronger theme identity + cube loading state ------------------ */
.theme-badge{
  display:grid;grid-template-columns:auto;gap:1px;align-items:center;justify-items:start;
  min-width:112px;padding:7px 14px;border-radius:16px;
  border:1px solid rgba(171,126,14,.28);
  background:linear-gradient(135deg,#fff1aa 0%,#f3ce58 100%);
  color:#29240f;box-shadow:0 8px 22px rgba(190,145,22,.16);
  white-space:nowrap
}
.theme-badge-label{
  font-size:8px;line-height:1;text-transform:uppercase;letter-spacing:.15em;
  font-weight:950;opacity:.65
}
.theme-badge strong{font-size:13px;line-height:1.15;font-weight:950;letter-spacing:-.01em}
.theme-showcase{
  margin:-3px 0 14px;padding:13px 14px;border-radius:16px;
  border:1px solid rgba(185,134,47,.26);
  background:linear-gradient(135deg,rgba(255,235,150,.22),rgba(228,185,106,.10));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06)
}
.theme-showcase span{display:block;margin-bottom:3px;color:var(--amber);font-size:8px;font-weight:950;letter-spacing:.15em;text-transform:uppercase}
.theme-showcase strong{display:block;font-size:25px;line-height:1.05;letter-spacing:-.035em;color:var(--text)}
.target-heading{margin-top:0}
.ghost-btn:disabled{opacity:.42;cursor:wait;transform:none}

.cube-loading{
  position:fixed;inset:0;z-index:140;display:grid;place-items:center;padding:24px;
  background:rgba(5,14,11,.62);backdrop-filter:blur(9px);
  opacity:0;visibility:hidden;pointer-events:none;transition:opacity .16s ease,visibility .16s ease
}
.cube-loading.show{opacity:1;visibility:visible;pointer-events:auto}
.cube-loading-card{
  width:min(340px,calc(100vw - 32px));padding:28px 24px 24px;text-align:center;
  border:1px solid var(--line-strong);border-radius:24px;background:rgba(12,23,20,.96);
  box-shadow:0 28px 90px rgba(0,0,0,.38)
}
.cube-loading-card>strong{display:block;margin-top:18px;font-size:18px;letter-spacing:-.02em}
.cube-loading-card>span{display:block;margin-top:6px;color:var(--muted);font-size:11px;line-height:1.45}
.loader-cube-scene{width:88px;height:88px;margin:4px auto 0;perspective:320px;display:grid;place-items:center}
.loader-cube{position:relative;width:64px;height:64px;transform-style:preserve-3d;animation:wordCubeSpin 1.55s linear infinite}
.loader-face{
  position:absolute;inset:0;border:2px solid rgba(54,92,79,.72);border-radius:3px;
  background-color:#f8fbf8;
  background-image:
    linear-gradient(90deg,transparent 32%,rgba(54,92,79,.68) 32%,rgba(54,92,79,.68) 35%,transparent 35%,transparent 65%,rgba(54,92,79,.68) 65%,rgba(54,92,79,.68) 68%,transparent 68%),
    linear-gradient(transparent 32%,rgba(54,92,79,.68) 32%,rgba(54,92,79,.68) 35%,transparent 35%,transparent 65%,rgba(54,92,79,.68) 65%,rgba(54,92,79,.68) 68%,transparent 68%);
  box-shadow:inset 0 0 18px rgba(69,205,176,.06)
}
.loader-front{transform:translateZ(32px)}
.loader-back{transform:rotateY(180deg) translateZ(32px)}
.loader-right{transform:rotateY(90deg) translateZ(32px)}
.loader-left{transform:rotateY(-90deg) translateZ(32px)}
.loader-top{transform:rotateX(90deg) translateZ(32px)}
.loader-bottom{transform:rotateX(-90deg) translateZ(32px)}
@keyframes wordCubeSpin{from{transform:rotateX(-24deg) rotateY(0deg)}to{transform:rotateX(336deg) rotateY(360deg)}}

html[data-theme="light"] .cube-loading{background:rgba(237,245,240,.72)}
html[data-theme="light"] .cube-loading-card{background:rgba(255,255,255,.97);box-shadow:0 28px 90px rgba(30,70,55,.18)}
html[data-theme="light"] .theme-showcase{background:linear-gradient(135deg,rgba(255,240,172,.60),rgba(255,250,225,.78));border-color:rgba(185,134,47,.30)}

@media(max-width:700px){
  .theme-badge{min-width:104px}
  .theme-showcase strong{font-size:22px}
}
@media(prefers-reduced-motion:reduce){.loader-cube{animation-duration:5s}}
'''

root_path.write_text(root,encoding='utf-8')
html_path.write_text(html,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
js_path.write_text(js,encoding='utf-8')
print('Applied Cube v1.4.0 loading and theme UI update')
