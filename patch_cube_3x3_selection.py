from pathlib import Path

js_path=Path('cube/cube.js')
css_path=Path('cube/cube.css')
html_path=Path('cube/index.html')
js=js_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')
html=html_path.read_text(encoding='utf-8')

def rep(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing {label}')
    return text.replace(old,new,1)

js=rep(js,"  const GRID = 4;","  const GRID = 3;","GRID")
js=rep(js,"  const MAX_SELECTION = 16;","  const MAX_SELECTION = 14;","MAX_SELECTION")

old='''  function facePosition(face, row, col){
    const v = [-1.5,-0.5,0.5,1.5];
    switch(face){
      case 'front': return [v[col], v[3-row], 2];
      case 'back': return [v[3-col], v[3-row], -2];
      case 'right': return [2, v[3-row], v[3-col]];
      case 'left': return [-2, v[3-row], v[col]];
      case 'top': return [v[col], 2, v[row]];
      case 'bottom': return [v[col], -2, v[3-row]];
      default: return [0,0,0];
    }
  }
'''
new='''  function facePosition(face, row, col){
    /* Logical 3D tile centres. Keeping the face plane half a tile beyond the
       outer tile centres makes touching tiles on neighbouring faces exactly
       sqrt(.5^2 + .5^2) apart, independent of GRID. */
    const mid=(GRID-1)/2;
    const plane=GRID/2;
    const v=Array.from({length:GRID},(_,i)=>i-mid);
    switch(face){
      case 'front': return [v[col], v[GRID-1-row], plane];
      case 'back': return [v[GRID-1-col], v[GRID-1-row], -plane];
      case 'right': return [plane, v[GRID-1-row], v[GRID-1-col]];
      case 'left': return [-plane, v[GRID-1-row], v[col]];
      case 'top': return [v[col], plane, v[row]];
      case 'bottom': return [v[col], -plane, v[GRID-1-row]];
      default: return [0,0,0];
    }
  }
'''
js=rep(js,old,new,"facePosition")

old="""        btn.addEventListener('click', () => selectTile(node.id));
"""
new="""        /* Pointer-down gives instant visual feedback on mouse and touch. It also
           keeps tile selection completely separate from the surrounding drag area. */
        btn.addEventListener('pointerdown', event => {
          event.preventDefault();
          event.stopPropagation();
          selectTile(node.id);
        });
        /* Preserve keyboard activation (Enter/Space produces click with detail 0). */
        btn.addEventListener('click', event => {
          if(event.detail === 0){
            event.preventDefault();
            event.stopPropagation();
            selectTile(node.id);
          }
        });
"""
js=rep(js,old,new,"tile pointer handling")

js=rep(js,"      if(chosen.length === 7) break;","      if(chosen.length === 5) break;","target count")
js=rep(js,"        const minFaces = i < 2 ? 3 : i < 6 ? 2 : 1;","        const minFaces = i === 0 ? 3 : i < 4 ? 2 : 1;","face spread")

old='''    selected.push(id);
    updateSelectionUI();
    startSelectionTimer(SELECTION_MS);
  }
'''
new='''    selected.push(id);
    updateSelectionUI();

    /* Target words should feel immediate: as soon as the complete valid path
       spells one of the listed targets, score it automatically. Bonus words
       still use Check word / the longer timer so players can keep extending. */
    const candidate=selectedWord();
    if(targets.includes(candidate) && !foundTargets.has(candidate)){
      stopSelectionTimer();
      setTimeout(() => {
        if(!evaluating && selectedWord() === candidate) evaluateSelection();
      },120);
    }else{
      startSelectionTimer(SELECTION_MS);
    }
  }
'''
js=rep(js,old,new,"instant target recognition")

# Add an internal generator sanity check so broken cross-face paths cannot ship silently.
anchor='''  function generatePuzzle(){
'''
validator='''  function validatePuzzle(words,paths,workingBoard){
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

'''
js=rep(js,anchor,validator+anchor,"puzzle validator insertion")
js=rep(js,"      if(failed) continue;\n      for(let i = 0; i < workingBoard.length; i++){","      if(failed || !validatePuzzle(words,paths,workingBoard)) continue;\n      for(let i = 0; i < workingBoard.length; i++){","puzzle validation call")

# CSS: 3x3 + stronger, immediate selection feedback.
css=rep(css,".face-grid{position:absolute;inset:13px;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);gap:7px}",
".face-grid{position:absolute;inset:13px;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:9px}","3x3 face grid")
css=rep(css,"  touch-action:manipulation;","  touch-action:none;","tile touch action")
css=rep(css,"  font-size:clamp(22px,3vw,34px);","  font-size:clamp(28px,3.8vw,42px);","tile font size")
old_css='''  box-shadow:0 0 0 2px rgba(255,255,255,.7),0 0 22px rgba(101,223,195,.58),0 8px 14px rgba(0,0,0,.28);
  transform:translateZ(4px);
}'''
new_css='''  box-shadow:0 0 0 3px rgba(255,255,255,.82),0 0 30px rgba(101,223,195,.8),0 9px 16px rgba(0,0,0,.32);
  transform:translateZ(7px) scale(1.035);
  outline:2px solid #65dfc3;
  outline-offset:-5px;
}'''
css=rep(css,old_css,new_css,"strong selected style")

# HTML labels.
html=html.replace('rotatable 4×4 cube','rotatable 3×3 cube')
html=html.replace('4×4 × 6','3×3 × 6')
html=html.replace('Every cube contains words that deliberately cross one or more faces.','This test cube uses fewer, larger tiles. Target words deliberately cross one or more faces.')

# Sanity checks.
assert 'const GRID = 3;' in js
assert 'chosen.length === 5' in js
assert "btn.addEventListener('pointerdown'" in js
assert 'targets.includes(candidate)' in js
assert 'validatePuzzle(words,paths,workingBoard)' in js
assert 'repeat(3,1fr)' in css
assert '3×3 × 6' in html
assert '4×4 cube' not in html

js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
html_path.write_text(html,encoding='utf-8')
