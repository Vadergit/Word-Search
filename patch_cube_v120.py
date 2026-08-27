from pathlib import Path
import re

root=Path('index.html')
cube_html_path=Path('cube/index.html')
cube_js_path=Path('cube/cube.js')
cube_css_path=Path('cube/cube.css')

index=root.read_text(encoding='utf-8')
cube_html=cube_html_path.read_text(encoding='utf-8')
js=cube_js_path.read_text(encoding='utf-8')
css=cube_css_path.read_text(encoding='utf-8')

# Version bump everywhere it is visible/cache-relevant.
index=index.replace('v1.1.1','v1.2.0')
cube_html=cube_html.replace('v1.1.1','v1.2.0')
js=js.replace("const APP_VERSION = '1.1.1';","const APP_VERSION = '1.2.0';",1)

# Explicit theme badge in top bar.
old='<span class="difficulty-badge" id="cubeDifficultyBadge">Beginner</span>'
new=old+'\n        <span class="theme-badge" id="cubeThemeBadge">Theme: loading…</span>'
if old not in cube_html:
    raise SystemExit('theme badge anchor missing')
cube_html=cube_html.replace(old,new,1)

# Explain cross-face diagonal movement.
cube_html=cube_html.replace(
    '<p><b>Select:</b> tap touching visible tiles. Tap any selected tile again to deselect it and safely shorten the path.</p>',
    '<p><b>Select:</b> tap touching visible tiles. Diagonal steps are allowed on a face and across a cube edge. Tap any selected tile again to deselect it and safely shorten the path.</p>',
    1
)

# CSS for theme badge.
anchor='.difficulty-badge{display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(69,205,176,.35);border-radius:999px;padding:9px 12px;background:rgba(69,205,176,.10);color:var(--text);font-size:12px;font-weight:900;white-space:nowrap}'
if anchor not in css:
    raise SystemExit('difficulty badge CSS anchor missing')
css=css.replace(anchor,anchor+'\n.theme-badge{display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:999px;padding:9px 12px;background:var(--panel-2);color:var(--text);font-size:12px;font-weight:900;white-space:nowrap}',1)

# DOM reference for explicit theme badge.
old="  const cubeDifficultyBadge = document.getElementById('cubeDifficultyBadge');\n  const difficultyMessageEl = document.getElementById('difficultyMessage');"
new="  const cubeDifficultyBadge = document.getElementById('cubeDifficultyBadge');\n  const cubeThemeBadge = document.getElementById('cubeThemeBadge');\n  const difficultyMessageEl = document.getElementById('difficultyMessage');"
if old not in js:
    raise SystemExit('theme DOM anchor missing')
js=js.replace(old,new,1)

# Cache key for last proven-valid puzzle per profile/difficulty.
old="  let cubeHints = 0;\n"
new="  let cubeHints = 0;\n  const PUZZLE_CACHE_KEY=`anitasWordCubeLastGood:${activeProfileName}:${cubeDifficulty}:v120`;\n"
if old not in js:
    raise SystemExit('cache key anchor missing')
js=js.replace(old,new,1)

# Natural diagonal adjacency across cube edges. Distance 0.707 is straight across;
# 1.225 is the adjacent diagonal position along the same shared edge.
old="        if(V.len(V.sub(a.pos,b.pos))<0.76){ adjacency.get(a.id).add(b.id); adjacency.get(b.id).add(a.id); }"
new="        if(V.len(V.sub(a.pos,b.pos))<1.23){ adjacency.get(a.id).add(b.id); adjacency.get(b.id).add(a.id); }"
if old not in js:
    raise SystemExit('cross-face adjacency anchor missing')
js=js.replace(old,new,1)

old="    const expected=12*GRID;\n    if(links!==expected) throw new Error(`Cube graph mismatch: ${links}, expected ${expected}`);"
new="    const expected=12*(3*GRID-2); // per edge: GRID straight + 2*(GRID-1) diagonals\n    if(links!==expected) throw new Error(`Cube graph mismatch: ${links}, expected ${expected}`);"
if old not in js:
    raise SystemExit('geometry count anchor missing')
js=js.replace(old,new,1)

# Replace the fragile single-pass generator with strict -> relaxed -> alternate-route
# fallbacks. Uniqueness is NEVER relaxed; every accepted board still passes
# validateUniqueTargets over the complete graph including cross-edge diagonals.
pattern=r"  function generatePuzzle\(\)\{.*?\n  \}\n\n  function rotatePoint\(p\)\{"
replacement=r'''  function complexityMatches(words,paths,strict=true){
    if(!strict) return true;
    const cfg=CUBE_DIFFICULTIES[cubeDifficulty];
    const faceCounts=words.map(word=>new Set(paths.get(word).map(id=>nodeById.get(id).face)).size);
    const crossFaceCount=faceCounts.filter(count=>count>1).length;
    const crossBurden=faceCounts.reduce((sum,count)=>sum+Math.max(0,count-1),0);
    if(crossFaceCount<cfg.minCross || crossFaceCount>cfg.maxCross) return false;
    if(cubeDifficulty==='hard' && crossBurden<4) return false;
    return true;
  }

  function randomCoverRoute(){
    for(let attempt=0;attempt<12;attempt++){
      const start=nodes[randInt(nodes.length)]?.id;
      if(start===undefined) break;
      const path=[start],used=new Set([start]);
      let budget=18000;

      function walk(currentId){
        if(path.length===TILE_COUNT) return true;
        if(--budget<=0) return false;
        const current=nodeById.get(currentId);
        const options=[...adjacency.get(currentId)]
          .filter(id=>!used.has(id))
          .map(id=>{
            const node=nodeById.get(id);
            const onward=[...adjacency.get(id)].filter(next=>!used.has(next)).length;
            let facePenalty=0;
            if(node.face!==current.face) facePenalty=cubeDifficulty==='beginner'?1.8:cubeDifficulty==='middle'?.65:-.15;
            return {id,score:onward+facePenalty+Math.random()*.35};
          })
          .sort((a,b)=>a.score-b.score);

        for(const option of options){
          used.add(option.id); path.push(option.id);
          if(walk(option.id)) return true;
          path.pop(); used.delete(option.id);
        }
        return false;
      }

      if(walk(start)) return path;
    }
    return null;
  }

  function tryGenerateFromRoute(route,strict=true,attemptsPerTheme=160){
    if(!route || route.length!==TILE_COUNT) return false;
    const available=availableWordThemes();
    const alternatives=available.filter(theme=>theme.name!==previousWordThemeName);
    const themeOrder=shuffle(alternatives.length?alternatives:available);

    for(const theme of themeOrder){
      for(let attempt=0;attempt<attemptsPerTheme;attempt++){
        const words=chooseCoverWords(theme.words);
        if(!words) break;
        const candidate=buildFullCoverCandidate(words,route);
        if(!candidate) continue;
        const {working,paths}=candidate;
        if(!complexityMatches(words,paths,strict)) continue;
        if(!validateUniqueTargets(words,paths,working)) continue;
        board=working;
        targets=words;
        targetPaths=paths;
        activeWordTheme=theme;
        previousWordThemeName=theme.name;
        return true;
      }
    }
    return false;
  }

  function savePuzzleCache(){
    try{
      const payload={
        version:120,difficulty:cubeDifficulty,theme:activeWordTheme.name,
        board:[...board],targets:[...targets],
        paths:Object.fromEntries([...targetPaths].map(([word,path])=>[word,[...path]]))
      };
      localStorage.setItem(PUZZLE_CACHE_KEY,JSON.stringify(payload));
    }catch(_){/* cache is optional */}
  }

  function restorePuzzleCache(){
    try{
      const data=JSON.parse(localStorage.getItem(PUZZLE_CACHE_KEY)||'null');
      if(!data || data.version!==120 || data.difficulty!==cubeDifficulty) return false;
      const theme=WORD_THEMES.find(item=>item.name===data.theme);
      if(!theme || !Array.isArray(data.board) || data.board.length!==TILE_COUNT || !Array.isArray(data.targets)) return false;
      const paths=new Map(data.targets.map(word=>[word,Array.isArray(data.paths?.[word])?[...data.paths[word]]:[]]));
      if(data.board.some(letter=>typeof letter!=='string' || letter.length!==1)) return false;
      if(new Set([...paths.values()].flat()).size!==TILE_COUNT) return false;
      if(!validateUniqueTargets(data.targets,paths,data.board)) return false;
      board=[...data.board]; targets=[...data.targets]; targetPaths=paths; activeWordTheme=theme; previousWordThemeName=theme.name;
      return true;
    }catch(_){ return false; }
  }

  function generatePuzzle(){
    const baseRoute=coverRoute();
    if(!baseRoute) throw new Error('Full-cover cube route is invalid.');

    // 1) Requested difficulty profile on the stable full-cover route.
    if(tryGenerateFromRoute(baseRoute,true,180)){ savePuzzleCache(); return; }

    // 2) Keep exact word uniqueness/full coverage, but relax only the optional
    // cross-face count target so generation cannot fail because of a cosmetic
    // difficulty distribution constraint.
    if(tryGenerateFromRoute(baseRoute,false,260)){ savePuzzleCache(); return; }

    // 3) Different Hamiltonian routes change where word boundaries fall and are
    // especially useful now that natural diagonal cross-edge moves are allowed.
    for(let routeAttempt=0;routeAttempt<3;routeAttempt++){
      const alternate=randomCoverRoute();
      if(alternate && tryGenerateFromRoute(alternate,false,90)){ savePuzzleCache(); return; }
    }

    // 4) Never show a blank cube when a previously proven-valid puzzle exists.
    if(restorePuzzleCache()) return;
    throw new Error('Could not generate a unique full-cover cube puzzle from the available themes.');
  }

  function rotatePoint(p){'''
js2,count=re.subn(pattern,replacement,js,flags=re.S)
if count!=1:
    raise SystemExit(f'generator replacement count {count}')
js=js2

# Explicit theme display whenever a puzzle starts.
old="    wordThemeNameEl.textContent=`${activeWordTheme.name} set`; updateDifficultyUI(); renderTargets(); renderBonus(); updateSelectionUI(); updateStats(); resetView(false); draw(); toast(`New ${CUBE_DIFFICULTIES[cubeDifficulty].label} ${activeWordTheme.name} cube · ${activeProfileName} · v${APP_VERSION}`);"
new="    wordThemeNameEl.textContent=`${activeWordTheme.name} set`; cubeThemeBadge.textContent=`Theme: ${activeWordTheme.name}`; updateDifficultyUI(); renderTargets(); renderBonus(); updateSelectionUI(); updateStats(); resetView(false); draw(); toast(`New ${CUBE_DIFFICULTIES[cubeDifficulty].label} ${activeWordTheme.name} cube · ${activeProfileName} · v${APP_VERSION}`);"
if old not in js:
    raise SystemExit('newPuzzle theme display anchor missing')
js=js.replace(old,new,1)

# Make startup failures explicit instead of leaving a misleading default theme.
old="  catch(error){ console.error(error); currentWordEl.textContent='Could not generate cube'; selectionMetaEl.textContent='Reload the page to try again.'; }"
new="  catch(error){ console.error(error); if(cubeThemeBadge)cubeThemeBadge.textContent='Theme: unavailable'; if(wordThemeNameEl)wordThemeNameEl.textContent='Generation failed'; currentWordEl.textContent='Could not generate cube'; selectionMetaEl.textContent='Press New cube to retry.'; }"
if old not in js:
    raise SystemExit('startup catch anchor missing')
js=js.replace(old,new,1)

root.write_text(index,encoding='utf-8')
cube_html_path.write_text(cube_html,encoding='utf-8')
cube_js_path.write_text(js,encoding='utf-8')
cube_css_path.write_text(css,encoding='utf-8')
print('Applied Cube v1.2.0 diagonal/theme/generator fixes')
