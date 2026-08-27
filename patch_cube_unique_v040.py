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

# Visible app version. This is the first explicit version baseline; increment on every future cube update.
js=rep(js,"  const FACE_NAMES = ['front','right','back','left','top','bottom'];","  const APP_VERSION = '0.4.0';\n  const FACE_NAMES = ['front','right','back','left','top','bottom'];","app version")

# Keep permanent step markers for solved target paths.
js=rep(js,"  let solvedNodes = new Set();\n  let selected = [];","  let solvedNodes = new Set();\n  let solvedStepByNode = new Map();\n  let selected = [];","solved step state")

# Replace the old structural-only validation with exact unique-path validation over the entire 3D graph.
old='''  function validatePuzzle(words,paths,workingBoard){
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
'''
new='''  function samePath(a,b){
    return Boolean(a&&b) && a.length===b.length && a.every((id,index)=>id===b[index]);
  }

  /* Return at most `limit` simple paths that spell the word on the COMPLETE
     cube graph. This is the same adjacency graph the player is allowed to use,
     including same-face diagonals and legal cross-edge/corner transitions. */
  function findWordPaths(word,candidateBoard,limit=2){
    const found=[];
    const starts=nodes.filter(node=>candidateBoard[node.id]===word[0]);

    function walk(id,index,path,used){
      if(found.length>=limit) return;
      if(index===word.length-1){
        found.push([...path]);
        return;
      }
      for(const next of adjacency.get(id)){
        if(found.length>=limit) return;
        if(used.has(next) || candidateBoard[next]!==word[index+1]) continue;
        used.add(next);
        path.push(next);
        walk(next,index+1,path,used);
        path.pop();
        used.delete(next);
      }
    }

    for(const start of starts){
      if(found.length>=limit) break;
      walk(start.id,0,[start.id],new Set([start.id]));
    }
    return found;
  }

  function targetHasExactlyIntendedPath(word,intendedPath,candidateBoard){
    const matches=findWordPaths(word,candidateBoard,2);
    return matches.length===1 && samePath(matches[0],intendedPath);
  }

  function validateUniqueTargets(words,paths,candidateBoard){
    for(const word of words){
      const intended=paths.get(word);
      if(!intended || intended.length!==word.length) return false;
      for(let i=0;i<intended.length;i++){
        if(candidateBoard[intended[i]]!==word[i]) return false;
        if(i>0 && !adjacency.get(intended[i-1]).has(intended[i])) return false;
      }
      if(!targetHasExactlyIntendedPath(word,intended,candidateBoard)) return false;
    }
    return true;
  }

  function weightedLetterCandidates(){
    const out=[];
    for(let i=0;i<24;i++){
      const letter=LETTER_POOL[randInt(LETTER_POOL.length)];
      if(!out.includes(letter)) out.push(letter);
    }
    for(const letter of shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''))){
      if(!out.includes(letter)) out.push(letter);
    }
    return out;
  }

  /* Fill empty tiles one at a time. A candidate letter is accepted only when
     every target word affected by that letter still has exactly one path: the
     intended path. Because adding letters can create but never remove paths,
     this preserves uniqueness all the way to the final filled cube. */
  function fillBoardWithoutDuplicateTargets(words,paths,baseBoard){
    const filled=[...baseBoard];
    if(!validateUniqueTargets(words,paths,filled)) return null;

    const blanks=shuffle(nodes.map(node=>node.id).filter(id=>!filled[id]));
    for(const id of blanks){
      let placed=false;
      for(const letter of weightedLetterCandidates()){
        filled[id]=letter;
        const affected=words.filter(word=>word.includes(letter));
        const safe=affected.every(word=>targetHasExactlyIntendedPath(word,paths.get(word),filled));
        if(safe){
          placed=true;
          break;
        }
      }
      if(!placed) return null;
    }
    return validateUniqueTargets(words,paths,filled) ? filled : null;
  }

  function generatePuzzle(){
    for(let puzzleAttempt = 0; puzzleAttempt < 80; puzzleAttempt++){
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

      if(failed || !validateUniqueTargets(words,paths,workingBoard)) continue;
      const filledBoard=fillBoardWithoutDuplicateTargets(words,paths,workingBoard);
      if(!filledBoard) continue;

      board = filledBoard;
      targets = words;
      targetPaths = paths;
      return;
    }
    throw new Error('Could not generate a unique-path cube puzzle.');
  }
'''
js=rep(js,old,new,"unique target generation")

# Reset solved path markers and include version in the ready toast.
js=rep(js,"    solvedNodes = new Set();\n    score = 0;","    solvedNodes = new Set();\n    solvedStepByNode = new Map();\n    score = 0;","reset solved steps")
js=rep(js,"    toast('New cube ready');","    toast(`New cube ready · v${APP_VERSION}`);","version toast")

# Persist the exact found route with visible per-tile sequence markers.
old='''        foundTargets.add(word);
        pathSnapshot.forEach(id => solvedNodes.add(id));
        const earned = word.length * TARGET_SCORE + Math.max(0,facesUsed-1)*180;'''
new='''        foundTargets.add(word);
        pathSnapshot.forEach((id,index) => {
          solvedNodes.add(id);
          if(!solvedStepByNode.has(id)) solvedStepByNode.set(id,index+1);
        });
        updateTileStates();
        const earned = word.length * TARGET_SCORE + Math.max(0,facesUsed-1)*180;'''
js=rep(js,old,new,"persist found path")

# Solved step marker dataset.
old='''      el.classList.toggle('solved',solvedNodes.has(id));
      const step = selected.indexOf(id);
      if(step >= 0) el.dataset.step = String(step+1);
      else delete el.dataset.step;'''
new='''      el.classList.toggle('solved',solvedNodes.has(id));
      const solvedStep=solvedStepByNode.get(id);
      if(solvedStep!==undefined) el.dataset.solvedStep=String(solvedStep);
      else delete el.dataset.solvedStep;
      const step = selected.indexOf(id);
      if(step >= 0) el.dataset.step = String(step+1);
      else delete el.dataset.step;'''
js=rep(js,old,new,"solved dataset")

# Strong permanent solved styling, plus a visible route step marker.
old_css='.tile.solved{box-shadow:inset 0 0 0 2px rgba(155,216,102,.55),0 7px 12px rgba(0,0,0,.25)}'
new_css='''.tile.solved{
  background:linear-gradient(145deg,#dff5ca,#aee17f);
  color:#102018;
  border-color:#c9f2a6;
  box-shadow:inset 0 0 0 3px rgba(104,166,63,.52),0 0 22px rgba(155,216,102,.28),0 7px 12px rgba(0,0,0,.25)
}
.tile.solved:not(.selected)::after{
  content:attr(data-solved-step);position:absolute;right:5px;top:5px;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;
  background:#24411a;color:#eaffd8;font:900 8px/1 Inter,system-ui,sans-serif;box-shadow:0 2px 7px rgba(0,0,0,.28)
}
.tile.solved:hover{filter:brightness(1.025)}'''
css=rep(css,old_css,new_css,"strong solved path")

# Make the found word chip clearly confirmed rather than barely faded.
css=rep(css,".target-chip.found{background:rgba(155,216,102,.09);border-color:rgba(155,216,102,.28);opacity:.58}",".target-chip.found{background:rgba(155,216,102,.14);border-color:rgba(155,216,102,.42);opacity:1}","found target chip")
css=rep(css,".eyebrow{font-size:10px;font-weight:900;letter-spacing:.17em;text-transform:uppercase;color:var(--mint);margin-bottom:7px}",".eyebrow{font-size:10px;font-weight:900;letter-spacing:.17em;text-transform:uppercase;color:var(--mint);margin-bottom:7px}\n.version-badge{display:inline-block;margin-left:7px;padding:3px 6px;border:1px solid rgba(101,223,195,.3);border-radius:999px;color:#c8fff1;letter-spacing:.08em;background:rgba(101,223,195,.07);vertical-align:1px}","version badge css")

# Visible version + cache busting so a live refresh really loads this release.
html=rep(html,"  <title>Anitas Word Cube</title>","  <title>Anitas Word Cube · v0.4.0</title>","version title")
html=rep(html,'  <link rel="stylesheet" href="cube.css" />','  <link rel="stylesheet" href="cube.css?v=0.4.0" />',"css cache bust")
html=rep(html,'        <div class="eyebrow">3D prototype</div>','        <div class="eyebrow">3D prototype <span class="version-badge">v0.4.0</span></div>',"visible version")
html=rep(html,'  <script src="cube.js"></script>','  <script src="cube.js?v=0.4.0"></script>',"js cache bust")

# Explain the uniqueness rule in the UI.
html=rep(html,'This test cube uses fewer, larger tiles. Target words deliberately cross one or more faces. Tiles must touch; diagonal moves are allowed on the same face.','This test cube uses fewer, larger tiles. Every target has exactly one valid path across the full 3D cube. Tiles must touch; diagonal moves are allowed on the same face.',"unique path copy")

# Sanity checks.
assert "const APP_VERSION = '0.4.0';" in js
assert 'function findWordPaths(' in js
assert 'validateUniqueTargets(words,paths,filled)' in js
assert 'fillBoardWithoutDuplicateTargets' in js
assert 'solvedStepByNode' in js
assert 'data-solved-step' in css
assert 'v0.4.0' in html
assert 'cube.js?v=0.4.0' in html
assert 'cube.css?v=0.4.0' in html

js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
html_path.write_text(html,encoding='utf-8')
