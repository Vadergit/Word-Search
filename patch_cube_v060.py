from pathlib import Path

js_path=Path('cube/cube.js')
css_path=Path('cube/cube.css')
html_path=Path('cube/index.html')
js=js_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')
html=html_path.read_text(encoding='utf-8')

def rep(text,old,new,label):
    if old not in text:
        raise SystemExit(f'Missing {label}')
    return text.replace(old,new,1)

# Version bump
js=rep(js,"  const APP_VERSION = '0.5.1';","  const APP_VERSION = '0.6.0';",'JS version')
html=html.replace('v0.5.1','v0.6.0')
html=html.replace('cube.css?v=0.5.1','cube.css?v=0.6.0')
html=html.replace('cube.js?v=0.5.1','cube.js?v=0.6.0')
html=rep(html,'<meta name="theme-color" content="#091311" />','<meta name="theme-color" id="themeColorMeta" content="#091311" />','theme meta')
html=rep(html,
'''        <a class="ghost-btn" href="../">2D game</a>
        <button class="ghost-btn" id="resetViewBtn" type="button">Reset view</button>''',
'''        <a class="ghost-btn" href="../">2D game</a>
        <button class="ghost-btn" id="themeBtn" type="button" aria-pressed="false">Light mode</button>
        <button class="ghost-btn" id="resetViewBtn" type="button">Reset view</button>''',
'theme button')
html=rep(html,
'<p><b>Rotate:</b> drag empty space beside the cube with mouse or touch. The word timer pauses while rotating.</p>',
'<p><b>Rotate:</b> drag empty space beside the cube with mouse or touch. Rotation is unlimited in every direction; the word timer pauses while rotating.</p>',
'rotate help')

# Theme-aware CSS overrides.
light_css='''

/* Light theme ------------------------------------------------------------ */
:root[data-theme="light"]{
  --bg:#f3f7f4;--panel:#ffffff;--panel-2:#f5f9f6;
  --line:rgba(31,72,58,.13);--line-strong:rgba(31,72,58,.22);
  --text:#14251f;--muted:#64766f;--mint:#45cdb0;--green:#86c557;
  --amber:#b9862f;--danger:#d86f64;--shadow:0 22px 70px rgba(30,70,55,.12)
}
html[data-theme="light"] body{
  background:
    radial-gradient(circle at 25% 5%,rgba(69,205,176,.14),transparent 30rem),
    radial-gradient(circle at 90% 80%,rgba(87,120,255,.07),transparent 35rem),
    var(--bg)
}
html[data-theme="light"] .version-badge{color:#176854;background:rgba(69,205,176,.11);border-color:rgba(35,145,117,.3)}
html[data-theme="light"] .ghost-btn{color:#29453b;background:rgba(255,255,255,.52)}
html[data-theme="light"] .ghost-btn:hover{background:rgba(69,205,176,.11);border-color:rgba(35,145,117,.38)}
html[data-theme="light"] .secondary-btn{background:#edf4ef;color:#29453b;border-color:var(--line)}
html[data-theme="light"] .stat-card{background:rgba(255,255,255,.82);box-shadow:0 12px 34px rgba(30,70,55,.07)}
html[data-theme="light"] .cube-panel,
html[data-theme="light"] .side-panel{background:rgba(255,255,255,.82)}
html[data-theme="light"] .interaction-note{color:#5f736b}
html[data-theme="light"] .stage{
  background:
    linear-gradient(rgba(31,72,58,.045) 1px,transparent 1px),
    linear-gradient(90deg,rgba(31,72,58,.045) 1px,transparent 1px),
    radial-gradient(circle at center,rgba(69,205,176,.10),transparent 47%);
  background-size:28px 28px,28px 28px,auto;
  border-color:rgba(31,72,58,.08)
}
html[data-theme="light"] .rotate-hint{color:rgba(48,91,77,.30)}
html[data-theme="light"] .selection-card{background:#f8fbf9}
html[data-theme="light"] .timer-track{background:#e5eee8}
html[data-theme="light"] .target-chip{background:#f5f9f6}
html[data-theme="light"] .target-chip.found{background:rgba(134,197,87,.16)}
html[data-theme="light"] .target-chip.found strong{color:#4e762e}
html[data-theme="light"] .bonus-chip{color:#8b621e;background:rgba(185,134,47,.08)}
html[data-theme="light"] .howto strong{color:#29453b}
html[data-theme="light"] .howto b{color:#385a4e}
html[data-theme="light"] .howto em{color:#29453b}
html[data-theme="light"] .toast{background:#ffffff;color:#233a32;box-shadow:0 14px 40px rgba(30,70,55,.18)}
html[data-theme="light"] .win{background:rgba(228,239,233,.82)}
html[data-theme="light"] .win-card{background:#ffffff;box-shadow:0 30px 90px rgba(30,70,55,.20)}
'''
css += light_css

# Theme DOM reference and state.
js=rep(js,
"  const resetViewBtn = document.getElementById('resetViewBtn');",
"  const resetViewBtn = document.getElementById('resetViewBtn');\n  const themeBtn = document.getElementById('themeBtn');\n  const themeColorMeta = document.getElementById('themeColorMeta');",
'theme DOM refs')

js=rep(js,
"  const flashUntil = new Map();",
'''  const flashUntil = new Map();
  const THEME_KEY = 'anitasWordCubeTheme';
  let currentTheme = 'dark';

  const CANVAS_THEME = {
    dark:{
      face:'#0d1b17',faceStroke:'rgba(101,223,195,.24)',tile:'#e9eee8',tileText:'#10201a',
      tileStroke:'rgba(9,27,21,.24)',selected:'#65dfc3',selectedStroke:'#d8fff4',
      solved:'#aee17f',solvedStroke:'#d8ffb9',invalid:'#ef9f96',pathUnder:'rgba(4,14,11,.88)'
    },
    light:{
      face:'#dfe9e4',faceStroke:'rgba(33,111,90,.30)',tile:'#fbfdfa',tileText:'#173028',
      tileStroke:'rgba(23,48,40,.24)',selected:'#55d7b9',selectedStroke:'#147e67',
      solved:'#b9e58f',solvedStroke:'#5d9634',invalid:'#ef9f96',pathUnder:'rgba(255,255,255,.96)'
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
    let saved='dark';
    try{ saved=localStorage.getItem(THEME_KEY)||'dark'; }catch(_){ /* local storage unavailable */ }
    applyTheme(saved,false);
  }

  function normalizeAngle(value){
    return ((value + 180) % 360 + 360) % 360 - 180;
  }''',
'theme state')

# Canvas colors follow active theme.
js=rep(js,
'''  function drawFaceBase(face){
    const q=faceCornerPoints(face).map(projectPoint); beginPoly(q); ctx.fillStyle='#0d1b17'; ctx.fill();
    ctx.lineWidth=1.5; ctx.strokeStyle='rgba(101,223,195,.24)'; ctx.stroke();
  }''',
'''  function drawFaceBase(face){
    const p=canvasTheme(),q=faceCornerPoints(face).map(projectPoint); beginPoly(q); ctx.fillStyle=p.face; ctx.fill();
    ctx.lineWidth=1.5; ctx.strokeStyle=p.faceStroke; ctx.stroke();
  }''',
'face colors')

js=rep(js,
'''  function tileFill(id){
    if(selected.includes(id)) return '#65dfc3';
    if(solvedNodes.has(id)) return '#aee17f';
    if(flashUntil.get(id)>performance.now()) return '#ef9f96';
    return '#e9eee8';
  }''',
'''  function tileFill(id){
    const p=canvasTheme();
    if(selected.includes(id)) return p.selected;
    if(solvedNodes.has(id)) return p.solved;
    if(flashUntil.get(id)>performance.now()) return p.invalid;
    return p.tile;
  }''',
'tile fill')

js=rep(js,
'''  function drawTileShapes(){
    const ordered=[...renderedTiles].sort((a,b)=>a.depth-b.depth);
    for(const tile of ordered){
      beginPoly(tile.quad); ctx.fillStyle=tileFill(tile.id); ctx.fill();
      ctx.lineWidth=selected.includes(tile.id)?3.5:1.3;
      ctx.strokeStyle=selected.includes(tile.id)?'#d8fff4':solvedNodes.has(tile.id)?'#d8ffb9':'rgba(9,27,21,.24)'; ctx.stroke();
    }
  }''',
'''  function drawTileShapes(){
    const p=canvasTheme(),ordered=[...renderedTiles].sort((a,b)=>a.depth-b.depth);
    for(const tile of ordered){
      beginPoly(tile.quad); ctx.fillStyle=tileFill(tile.id); ctx.fill();
      ctx.lineWidth=selected.includes(tile.id)?3.5:1.3;
      ctx.strokeStyle=selected.includes(tile.id)?p.selectedStroke:solvedNodes.has(tile.id)?p.solvedStroke:p.tileStroke; ctx.stroke();
    }
  }''',
'tile strokes')

js=rep(js,
"    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.strokeStyle='rgba(4,14,11,.88)'; ctx.lineWidth=width+10; ctx.stroke();",
"    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.strokeStyle=canvasTheme().pathUnder; ctx.lineWidth=width+10; ctx.stroke();",
'path under')

js=rep(js,
"      ctx.fillStyle='#10201a';",
"      ctx.fillStyle=canvasTheme().tileText;",
'tile text color')

# Remove X-axis clamp and wrap both angles only for numeric stability.
js=rep(js,
"      rotY+=dx*0.34; rotX-=dy*0.34; rotX=Math.max(-89,Math.min(89,rotX)); draw(); return;",
"      rotY=normalizeAngle(rotY+dx*0.34); rotX=normalizeAngle(rotX-dy*0.34); draw(); return;",
'endless rotation')

# Theme button and initialisation.
js=rep(js,
"    checkBtn.addEventListener('click',evaluateSelection); clearBtn.addEventListener('click',clearSelection); newBtn.addEventListener('click',newPuzzle); resetViewBtn.addEventListener('click',()=>resetView(true)); nextCubeBtn.addEventListener('click',newPuzzle);",
"    checkBtn.addEventListener('click',evaluateSelection); clearBtn.addEventListener('click',clearSelection); newBtn.addEventListener('click',newPuzzle); resetViewBtn.addEventListener('click',()=>resetView(true)); nextCubeBtn.addEventListener('click',newPuzzle); themeBtn.addEventListener('click',()=>applyTheme(currentTheme==='light'?'dark':'light'));",
'theme binding')
js=rep(js,
"  try{ buildGraph(); validateCrossFaceGeometry(); bindEvents(); resizeCanvas(); newPuzzle(); }",
"  try{ buildGraph(); validateCrossFaceGeometry(); bindEvents(); initTheme(); resizeCanvas(); newPuzzle(); }",
'theme init')

assert "const APP_VERSION = '0.6.0';" in js
assert 'rotX=Math.max' not in js
assert 'normalizeAngle(rotY+dx*0.34)' in js
assert "anitasWordCubeTheme" in js
assert 'id="themeBtn"' in html
assert 'v0.6.0' in html
assert 'cube.css?v=0.6.0' in html
assert 'cube.js?v=0.6.0' in html
assert ':root[data-theme="light"]' in css

js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
html_path.write_text(html,encoding='utf-8')
