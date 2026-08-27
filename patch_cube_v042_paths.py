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

# Version
js=rep(js,"  const APP_VERSION = '0.4.1';","  const APP_VERSION = '0.4.2';","app version")
html=html.replace('v0.4.1','v0.4.2')

# SVG overlay in the stage, above the cube visually but never intercepting input.
old='''        <div class="stage" id="stage" aria-label="3D word cube rotation area">
          <div class="rotate-hint hint-left">DRAG</div>'''
new='''        <div class="stage" id="stage" aria-label="3D word cube rotation area">
          <svg class="path-layer" id="pathLayer" aria-hidden="true"></svg>
          <div class="rotate-hint hint-left">DRAG</div>'''
html=rep(html,old,new,'path layer html')

# DOM ref + solved path state
js=rep(js,"  const cube = document.getElementById('cube');","  const cube = document.getElementById('cube');\n  const pathLayer = document.getElementById('pathLayer');","path layer ref")
js=rep(js,"  let solvedStepByNode = new Map();","  let solvedStepByNode = new Map();\n  let foundPathByWord = new Map();\n  let pathRenderFrame = null;","found path state")

# Add path renderer before renderCube.
anchor='''  function renderCube(){
'''
renderer='''  function tileCenter(id){
    const el=tileEls.get(id);
    if(!el) return null;
    const faceEl=el.closest('.face');
    if(!faceEl || !faceEl.classList.contains('hit-visible')) return null;
    const rect=el.getBoundingClientRect();
    const stageRect=stage.getBoundingClientRect();
    if(rect.width<2 || rect.height<2) return null;
    return {
      x:rect.left-stageRect.left+rect.width/2,
      y:rect.top-stageRect.top+rect.height/2,
      radius:Math.min(rect.width,rect.height)*0.33
    };
  }

  function addPathSegment(a,b,type){
    const p1=tileCenter(a),p2=tileCenter(b);
    if(!p1 || !p2) return;
    const dx=p2.x-p1.x,dy=p2.y-p1.y;
    const d=Math.hypot(dx,dy);
    if(d<1) return;
    const ux=dx/d,uy=dy/d;
    const x1=p1.x+ux*p1.radius,y1=p1.y+uy*p1.radius;
    const x2=p2.x-ux*p2.radius,y2=p2.y-uy*p2.radius;
    const ns='http://www.w3.org/2000/svg';

    const under=document.createElementNS(ns,'line');
    under.setAttribute('x1',x1);under.setAttribute('y1',y1);
    under.setAttribute('x2',x2);under.setAttribute('y2',y2);
    under.setAttribute('class',`path-segment path-under ${type}`);
    pathLayer.appendChild(under);

    const line=document.createElementNS(ns,'line');
    line.setAttribute('x1',x1);line.setAttribute('y1',y1);
    line.setAttribute('x2',x2);line.setAttribute('y2',y2);
    line.setAttribute('class',`path-segment ${type}`);
    pathLayer.appendChild(line);
  }

  function drawPath(path,type){
    for(let i=1;i<path.length;i++) addPathSegment(path[i-1],path[i],type);
  }

  function renderPathLayer(){
    if(!pathLayer) return;
    const rect=stage.getBoundingClientRect();
    pathLayer.setAttribute('viewBox',`0 0 ${Math.max(1,rect.width)} ${Math.max(1,rect.height)}`);
    pathLayer.innerHTML='';
    foundPathByWord.forEach(path=>drawPath(path,'solved-path'));
    if(selected.length>1) drawPath(selected,'active-path');
  }

  function schedulePathRender(){
    if(pathRenderFrame!==null) return;
    pathRenderFrame=requestAnimationFrame(()=>{
      pathRenderFrame=null;
      renderPathLayer();
    });
  }

'''
js=rep(js,anchor,renderer+anchor,'path renderer')

# Render after cube tiles/state updates.
js=rep(js,"    updateTileStates();\n  }\n\n  function compatible", "    updateTileStates();\n    schedulePathRender();\n  }\n\n  function compatible", 'render cube path schedule')

# Reset stored solved paths with every new cube.
js=rep(js,"    solvedStepByNode = new Map();","    solvedStepByNode = new Map();\n    foundPathByWord = new Map();","new puzzle solved paths reset")

# Update on rotation.
js=rep(js,"    updateFaceHitTesting();\n  }\n\n  function resetView", "    updateFaceHitTesting();\n    schedulePathRender();\n  }\n\n  function resetView", 'rotation path schedule')

# Update whenever selection/tile states change.
old='''      if(step >= 0) el.dataset.step = String(step+1);
      else delete el.dataset.step;
    });
  }
'''
new='''      if(step >= 0) el.dataset.step = String(step+1);
      else delete el.dataset.step;
    });
    schedulePathRender();
  }
'''
js=rep(js,old,new,'tile state path schedule')

# Persist exact successful route and redraw immediately.
old='''        pathSnapshot.forEach((id,index) => {
          solvedNodes.add(id);
          if(!solvedStepByNode.has(id)) solvedStepByNode.set(id,index+1);
        });
        updateTileStates();'''
new='''        pathSnapshot.forEach((id,index) => {
          solvedNodes.add(id);
          if(!solvedStepByNode.has(id)) solvedStepByNode.set(id,index+1);
        });
        foundPathByWord.set(word,[...pathSnapshot]);
        updateTileStates();'''
js=rep(js,old,new,'persist solved path')

# Resize redraw; use existing bindEvents anchor if available.
anchor="""    window.addEventListener('keydown',event => {
"""
if anchor in js:
    js=js.replace(anchor,"""    window.addEventListener('resize',schedulePathRender);\n\n"""+anchor,1)
else:
    # Fallback: add before try bootstrap.
    boot='''  try{\n    buildGraph();'''
    js=rep(js,boot,"  window.addEventListener('resize',schedulePathRender);\n\n"+boot,'resize fallback')

# CSS layer / paths. Put it directly after stage rotating rule.
css_anchor='.stage.rotating{cursor:grabbing}\n'
css_add='''.stage.rotating{cursor:grabbing}
.path-layer{
  position:absolute;inset:0;width:100%;height:100%;z-index:30;pointer-events:none;overflow:visible
}
.path-segment{stroke-linecap:round;vector-effect:non-scaling-stroke}
.path-segment.path-under{stroke:rgba(5,15,12,.78);stroke-width:9}
.path-segment.active-path{stroke:var(--mint);stroke-width:5;filter:drop-shadow(0 0 4px rgba(101,223,195,.72))}
.path-segment.solved-path{stroke:var(--green);stroke-width:5;filter:drop-shadow(0 0 3px rgba(155,216,102,.55))}
'''
css=rep(css,css_anchor,css_add,'path layer css')

# Make cube itself explicit below line overlay; path layer never blocks clicks.
css=rep(css,'.cube-shell{width:var(--cube-size);height:var(--cube-size);position:relative;transform-style:preserve-3d;cursor:default;touch-action:manipulation}',
'.cube-shell{width:var(--cube-size);height:var(--cube-size);position:relative;z-index:10;transform-style:preserve-3d;cursor:default;touch-action:manipulation}',
'cube z index')

# Cache busting must match visible version.
html=html.replace('cube.css?v=0.4.1','cube.css?v=0.4.2')
html=html.replace('cube.js?v=0.4.1','cube.js?v=0.4.2')

# Sanity checks
assert "const APP_VERSION = '0.4.2';" in js
assert 'function renderPathLayer()' in js
assert "foundPathByWord.set(word,[...pathSnapshot]);" in js
assert "drawPath(selected,'active-path')" in js
assert 'id="pathLayer"' in html
assert 'v0.4.2' in html and 'v0.4.1' not in html
assert '.path-segment.active-path' in css
assert '.path-segment.solved-path' in css

js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
html_path.write_text(html,encoding='utf-8')
