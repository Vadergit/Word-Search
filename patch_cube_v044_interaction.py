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

# Version bump.
js=rep(js,"  const APP_VERSION = '0.4.3';","  const APP_VERSION = '0.4.4';","JS version")
html=html.replace('v0.4.3','v0.4.4')
html=html.replace('cube.css?v=0.4.3','cube.css?v=0.4.4')
html=html.replace('cube.js?v=0.4.3','cube.js?v=0.4.4')

# Make the path dramatically wider and easier to read, closer to the 2D game.
css=rep(css,
'''.path-segment.path-under{stroke:rgba(5,15,12,.78);stroke-width:9}
.path-segment.active-path{stroke:var(--mint);stroke-width:5;filter:drop-shadow(0 0 4px rgba(101,223,195,.72))}
.path-segment.solved-path{stroke:var(--green);stroke-width:5;filter:drop-shadow(0 0 3px rgba(155,216,102,.55))}''',
'''.path-segment.path-under{stroke:rgba(5,15,12,.86);stroke-width:25}
.path-segment.active-path{stroke:var(--mint);stroke-width:17;filter:drop-shadow(0 0 7px rgba(101,223,195,.82))}
.path-segment.solved-path{stroke:var(--green);stroke-width:16;filter:drop-shadow(0 0 6px rgba(155,216,102,.68))}''',
'path widths')

# Do not gate face interaction by our calculated normal. Browser 3D/backface handling
# is more reliable for actual hit testing, especially for top/bottom surfaces.
css=rep(css,
'''  transform-style:preserve-3d;
  pointer-events:none;
}
.face.hit-visible{pointer-events:auto}''',
'''  transform-style:preserve-3d;
  pointer-events:auto;
}
.face.hit-visible{pointer-events:auto}''',
'face pointer gating')

# Clarify in code that hit-visible is display metadata only, never input gating.
old='''  function updateFaceHitTesting(){
    document.querySelectorAll('.face').forEach(faceEl=>{
      const face=faceEl.dataset.face;
      const visible=rotatedNormalZ(face)>0.035;
      faceEl.classList.toggle('hit-visible',visible);
      faceEl.setAttribute('aria-hidden',visible?'false':'true');
    });
  }
'''
new='''  function updateFaceHitTesting(){
    /* Important: this visibility flag is used only for overlay/accessibility.
       Pointer input is NOT gated here. CSS 3D + backface-visibility decides
       which rendered face receives the event, which is much more reliable for
       top/bottom faces across mouse and touch browsers. */
    document.querySelectorAll('.face').forEach(faceEl=>{
      const face=faceEl.dataset.face;
      const visible=rotatedNormalZ(face)>0.035;
      faceEl.classList.toggle('hit-visible',visible);
      faceEl.setAttribute('aria-hidden',visible?'false':'true');
    });
  }
'''
js=rep(js,old,new,'hit testing explanation')

# The path should also not disappear merely because our display-normal threshold is
# close to an edge. If the browser lays out the tile at a usable size, draw to it.
old='''    const faceEl=el.closest('.face');
    if(!faceEl || !faceEl.classList.contains('hit-visible')) return null;
    const rect=el.getBoundingClientRect();'''
new='''    const faceEl=el.closest('.face');
    if(!faceEl) return null;
    const rect=el.getBoundingClientRect();'''
js=rep(js,old,new,'tile center visibility gate')

assert "const APP_VERSION = '0.4.4';" in js
assert 'pointer-events:auto;' in css
assert 'stroke-width:17' in css
assert 'stroke-width:16' in css
assert "classList.contains('hit-visible')" not in js
assert 'v0.4.4' in html
assert 'cube.css?v=0.4.4' in html
assert 'cube.js?v=0.4.4' in html

js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
html_path.write_text(html,encoding='utf-8')
