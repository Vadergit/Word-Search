from pathlib import Path

js_path=Path('cube/cube.js')
html_path=Path('cube/index.html')
js=js_path.read_text(encoding='utf-8')
html=html_path.read_text(encoding='utf-8')

def rep(text,old,new,label):
    if old not in text:
        raise SystemExit(f'Missing {label}')
    return text.replace(old,new,1)

js=rep(js,"  const APP_VERSION = '0.4.0';","  const APP_VERSION = '0.4.1';","app version")

old='''  function facePosition(face, row, col){
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
new='''  function facePosition(face, row, col){
    /* These coordinates intentionally mirror the ACTUAL CSS transforms used to
       render each face. CSS 3D uses +x right, +y down and +z toward the viewer.
       Keeping this logical graph in the same coordinate system means a pair of
       tiles that visibly touch across an edge are exactly the pair the player
       is allowed to select across that edge. */
    const mid=(GRID-1)/2;
    const plane=GRID/2;
    const v=Array.from({length:GRID},(_,i)=>i-mid);
    switch(face){
      case 'front': return [v[col], v[row], plane];
      case 'back': return [v[GRID-1-col], v[row], -plane];
      case 'right': return [plane, v[row], v[GRID-1-col]];
      case 'left': return [-plane, v[row], v[col]];
      case 'top': return [v[col], -plane, v[row]];
      case 'bottom': return [v[col], plane, v[GRID-1-row]];
      default: return [0,0,0];
    }
  }
'''
js=rep(js,old,new,'facePosition')

# Add a runtime geometry self-check after graph construction.
anchor='''  function renderCube(){
'''
checker='''  function validateCrossFaceGeometry(){
    /* Every physical cube edge must expose exactly GRID selectable pairs. There
       are 12 edges, so the complete cube should have 12*GRID cross-face links.
       Corner tiles legitimately participate in two different edge links, but
       there must be no visual-edge pair missing from the graph. */
    let crossLinks=0;
    for(const node of nodes){
      for(const otherId of adjacency.get(node.id)){
        const other=nodeById.get(otherId);
        if(other && other.face!==node.face && node.id<other.id) crossLinks++;
      }
    }
    const expected=12*GRID;
    if(crossLinks!==expected){
      throw new Error(`Cube edge graph mismatch: ${crossLinks} cross-face links, expected ${expected}`);
    }
  }

'''
js=rep(js,anchor,checker+anchor,'geometry checker')
js=rep(js,"    buildGraph();\n    bindEvents();","    buildGraph();\n    validateCrossFaceGeometry();\n    bindEvents();","geometry checker call")

html=html.replace('v0.4.0','v0.4.1')

assert "const APP_VERSION = '0.4.1';" in js
assert "case 'front': return [v[col], v[row], plane];" in js
assert "case 'top': return [v[col], -plane, v[row]];" in js
assert 'function validateCrossFaceGeometry()' in js
assert 'const expected=12*GRID;' in js
assert 'validateCrossFaceGeometry();' in js
assert 'v0.4.1' in html and 'v0.4.0' not in html

js_path.write_text(js,encoding='utf-8')
html_path.write_text(html,encoding='utf-8')
