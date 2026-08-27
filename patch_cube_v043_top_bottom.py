from pathlib import Path

js_path=Path('cube/cube.js')
html_path=Path('cube/index.html')
js=js_path.read_text(encoding='utf-8')
html=html_path.read_text(encoding='utf-8')

def rep(text,old,new,label):
    if old not in text:
        raise SystemExit(f'Missing {label}')
    return text.replace(old,new,1)

js=rep(js,"  const APP_VERSION = '0.4.2';","  const APP_VERSION = '0.4.3';","app version")

old="""  const FACE_NORMALS={
    front:[0,0,1],back:[0,0,-1],right:[1,0,0],left:[-1,0,0],top:[0,1,0],bottom:[0,-1,0]
  };
"""
new="""  const FACE_NORMALS={
    front:[0,0,1],back:[0,0,-1],right:[1,0,0],left:[-1,0,0],
    /* CSS rotateX(90deg) maps the top face normal toward -Y; rotateX(-90deg)
       maps the bottom face normal toward +Y. These signs must match the rendered
       CSS faces or visible top/bottom tiles get pointer-events disabled. */
    top:[0,-1,0],bottom:[0,1,0]
  };
"""
js=rep(js,old,new,'face normals')

# Small runtime check that the default camera orientation exposes front/right/top.
anchor="""  function updateFaceHitTesting(){
"""
check="""  function validateDefaultFaceVisibility(){
    const expected=['front','right','top'];
    const missing=expected.filter(face=>rotatedNormalZ(face)<=0.035);
    if(missing.length){
      throw new Error(`Default visible face hit-test mismatch: ${missing.join(', ')}`);
    }
  }

"""
js=rep(js,anchor,check+anchor,'default visibility check')

boot="""    validateCrossFaceGeometry();
    bindEvents();
"""
js=rep(js,boot,"""    validateCrossFaceGeometry();
    validateDefaultFaceVisibility();
    bindEvents();
""",'visibility check call')

html=html.replace('v0.4.2','v0.4.3')

assert "const APP_VERSION = '0.4.3';" in js
assert 'top:[0,-1,0],bottom:[0,1,0]' in js
assert 'function validateDefaultFaceVisibility()' in js
assert 'validateDefaultFaceVisibility();' in js
assert 'v0.4.3' in html and 'v0.4.2' not in html

js_path.write_text(js,encoding='utf-8')
html_path.write_text(html,encoding='utf-8')
