from pathlib import Path
import re

js_path=Path('cube/cube.js')
html_path=Path('cube/index.html')
js=js_path.read_text(encoding='utf-8')
html=html_path.read_text(encoding='utf-8')

def rep(text,old,new,label):
    if old not in text:
        raise SystemExit(f'Missing {label}')
    return text.replace(old,new,1)

# Version / geometry state
js=rep(js,"const APP_VERSION = '0.6.0';","const APP_VERSION = '0.7.0';",'js version')
js=rep(js,"  const PLANE = GRID / 2;\n  const TILE_HALF = 0.43;","  const PLANE = GRID / 2;\n  const CORE_PLANE = PLANE - 0.12;\n  const TILE_HALF = 0.43;",'core plane')
js=rep(js,"  let crossFaceFinds = 0;\n\n  let rotX", "  let crossFaceFinds = 0;\n  let cubeCleared = false;\n\n  let rotX",'cube cleared state')

# Canvas theme gains a real dark-grey body/core.
js=rep(js,
"      face:'#0d1b17',faceStroke:'rgba(101,223,195,.24)',tile:'#e9eee8',tileText:'#10201a',",
"      face:'#2d3331',core:'#252a29',faceStroke:'rgba(101,223,195,.24)',tile:'#e9eee8',tileText:'#10201a',",
'dark core')
js=rep(js,
"      face:'#dfe9e4',faceStroke:'rgba(33,111,90,.30)',tile:'#fbfdfa',tileText:'#173028',",
"      face:'#555d5a',core:'#414744',faceStroke:'rgba(33,111,90,.30)',tile:'#fbfdfa',tileText:'#173028',",
'light core')

# Full-cover route. It traverses all 54 tiles exactly once and every transition is a valid cube neighbour.
cover_helpers=r'''
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

  function chooseCoverWords(total=TILE_COUNT){
    const pool=shuffle([...new Set(SPACE_WORDS)].filter(w=>w.length>=4 && w.length<=8));
    const states=new Map([[`0:0`,[]]]);
    for(const word of pool){
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
    for(const count of [8,9,10,7]){
      const hit=states.get(`${total}:${count}`);
      if(hit) return shuffle(hit);
    }
    return null;
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
'''
anchor="  function samePath(a,b){"
if anchor not in js: raise SystemExit('Missing samePath anchor')
js=js.replace(anchor,cover_helpers+'\n'+anchor,1)

# Replace puzzle generation: no random filler letters; all 54 tiles are target-word tiles.
pattern=r"  function generatePuzzle\(\)\{.*?\n  \}\n\n  function rotatePoint"
replacement=r'''  function generatePuzzle(){
    const route=coverRoute();
    if(!route) throw new Error('Full-cover cube route is invalid.');
    for(let attempt=0;attempt<520;attempt++){
      const words=chooseCoverWords();
      if(!words) break;
      const candidate=buildFullCoverCandidate(words,route);
      if(!candidate) continue;
      const {working,paths}=candidate;
      const crossFaceCount=words.filter(word=>new Set(paths.get(word).map(id=>nodeById.get(id).face)).size>1).length;
      if(crossFaceCount<3) continue;
      if(!validateUniqueTargets(words,paths,working)) continue;
      board=working;
      targets=words;
      targetPaths=paths;
      return;
    }
    throw new Error('Could not generate a unique full-cover cube puzzle.');
  }

  function rotatePoint'''
js,count=re.subn(pattern,replacement,js,count=1,flags=re.S)
if count!=1: raise SystemExit(f'generatePuzzle patch count={count}')

# Solid inner cube + outer dark-grey body.
core_helpers=r'''
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
    const faces=FACE_NAMES.filter(face=>faceVisibility(face)>0.001)
      .sort((a,b)=>averageDepth(coreFaceCornerPoints(a).map(projectPoint))-averageDepth(coreFaceCornerPoints(b).map(projectPoint)));
    for(const face of faces){
      const q=coreFaceCornerPoints(face).map(projectPoint);
      beginPoly(q); ctx.fillStyle=t.core; ctx.fill();
      ctx.lineWidth=2; ctx.strokeStyle='rgba(0,0,0,.22)'; ctx.stroke();
    }
  }
'''
anchor="  function drawFaceBase(face){"
if anchor not in js: raise SystemExit('Missing drawFaceBase anchor')
js=js.replace(anchor,core_helpers+'\n'+anchor,1)
js=rep(js,
"  function drawFaceBase(face){\n    const t=canvasTheme(); const q=faceCornerPoints(face).map(projectPoint); beginPoly(q); ctx.fillStyle=t.face; ctx.fill();",
"  function drawFaceBase(face){\n    const t=canvasTheme(); const q=faceCornerPoints(face).map(projectPoint); beginPoly(q); ctx.fillStyle=t.face; ctx.fill();",
'draw face body')
# Draw core first.
js=rep(js,
"  function draw(){\n    ctx.clearRect(0,0,canvasWidth,canvasHeight);\n    const visible=",
"  function draw(){\n    ctx.clearRect(0,0,canvasWidth,canvasHeight);\n    drawSolidCore();\n    const visible=",
'draw solid core')

# Toggle/de-select any selected tile. Clicking an earlier tile truncates dependent tail to preserve a continuous path.
old=r'''    const last=selected[selected.length-1];
    if(selected.length>1 && selected[selected.length-2]===id){ selected.pop(); updateSelectionUI(); if(selected.length) startSelectionTimer(SELECTION_MS); else stopSelectionTimer(); draw(); return; }
    if(last===id) return;
    if(selected.includes(id)){ flashTile(id); toast('That tile is already in the path'); return; }'''
new=r'''    const last=selected[selected.length-1];
    const selectedIndex=selected.indexOf(id);
    if(selectedIndex>=0){
      selected=selected.slice(0,selectedIndex);
      updateSelectionUI();
      if(selected.length) startSelectionTimer(SELECTION_MS); else stopSelectionTimer();
      draw();
      return;
    }'''
if old not in js: raise SystemExit('Missing select toggle block')
js=js.replace(old,new,1)

# New puzzle resets clear state; final completion clears every letter.
js=rep(js,
"    stopSelectionTimer(); selected=[]; foundTargets=new Set(); foundBonus=new Set(); foundPathByWord=new Map(); solvedNodes=new Set();",
"    stopSelectionTimer(); selected=[]; foundTargets=new Set(); foundBonus=new Set(); foundPathByWord=new Map(); solvedNodes=new Set(); cubeCleared=false;",
'new puzzle clear reset')

# Skip all letters and badges after complete cube clear.
needle="      ctx.save();\n      beginPoly(q);"
if needle not in js: raise SystemExit('Missing label draw anchor')
js=js.replace(needle,"      if(cubeCleared) continue;\n\n      ctx.save();\n      beginPoly(q);",1)

old_show="  function showWin(){ winText.textContent=`You found all ${targets.length} words with ${crossFaceFinds} cross-face finds and scored ${score.toLocaleString()} points.`; winEl.classList.add('show'); }"
new_show="  function showWin(){ cubeCleared=true; draw(); winText.textContent=`You cleared all ${TILE_COUNT} letters by finding all ${targets.length} words, with ${crossFaceFinds} cross-face finds and ${score.toLocaleString()} points.`; setTimeout(()=>winEl.classList.add('show'),260); }"
js=rep(js,old_show,new_show,'show win clear')

# HTML version and explanation.
html=html.replace('v0.6.0','v0.7.0').replace('cube.css?v=0.6.0','cube.css?v=0.7.0').replace('cube.js?v=0.6.0','cube.js?v=0.7.0')
html=rep(html,
"Every target has exactly one valid path across the complete cube. Cross-face paths follow the real cube edge and only visible tile surfaces can be selected.",
"Every tile belongs to exactly one target route, so all 54 letters are covered. Every target has exactly one valid path across the complete cube; after the last target is found, the cube is fully cleared.",
'coverage copy')
html=rep(html,
"<p><b>Select:</b> tap touching visible tiles. Tap the previous tile to undo one step.</p>",
"<p><b>Select:</b> tap touching visible tiles. Tap any selected tile again to deselect it and safely shorten the path.</p>",
'select copy')

# Sanity checks
assert "const APP_VERSION = '0.7.0';" in js
assert 'COVER_ROUTE_COORDS' in js
assert 'chooseCoverWords' in js
assert 'covered.size!==TILE_COUNT' in js
assert 'cubeCleared=true' in js
assert 'drawSolidCore();' in js
assert 'selected=selected.slice(0,selectedIndex);' in js
assert 'Math.max(-89' not in js
assert 'v0.7.0' in html

js_path.write_text(js,encoding='utf-8')
html_path.write_text(html,encoding='utf-8')
