from pathlib import Path

js_path = Path('cube/cube.js')
html_path = Path('cube/index.html')
js = js_path.read_text(encoding='utf-8')
html = html_path.read_text(encoding='utf-8')

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing patch anchor: {label}')
    return text.replace(old, new, 1)

# Version / cache busting.
js = replace_once(js, "const APP_VERSION = '0.7.1';", "const APP_VERSION = '0.7.2';", 'JS version')
html = html.replace('v0.7.1', 'v0.7.2')
html = html.replace('cube.css?v=0.7.1', 'cube.css?v=0.7.2')
html = html.replace('cube.js?v=0.7.1', 'cube.js?v=0.7.2')

# The old faceVisibility only checked the rotated normal's z component.
# That is correct for an orthographic camera at infinity, but not for this
# finite perspective camera. Near cube silhouettes it could classify a face
# as visible even though the actual camera lies behind that face plane.
old = """  function faceVisibility(face){ return rotatePoint(FACE[face].n)[2]; }\n"""
new = """  function faceFacingCosine(face,plane=PLANE){
    const normal=rotatePoint(FACE[face].n);
    const center=rotatePoint(V.mul(FACE[face].n,plane));
    const toCamera=[-center[0],-center[1],CAMERA_Z-center[2]];
    const distance=Math.max(1e-6,V.len(toCamera));
    const dot=normal[0]*toCamera[0]+normal[1]*toCamera[1]+normal[2]*toCamera[2];
    return dot/distance;
  }

  function faceVisible(face,plane=PLANE,margin=0.025){
    return faceFacingCosine(face,plane)>margin;
  }
"""
js = replace_once(js, old, new, 'perspective face visibility')

# Cull core faces against the real camera too. This prevents the solid inner
# cube from drawing a rear wall over a very shallow front surface.
old = """  function drawSolidCore(){
    const t=canvasTheme();
    const faces=FACE_NAMES.filter(face=>faceVisibility(face)>0.001)
      .sort((a,b)=>averageDepth(coreFaceCornerPoints(a).map(projectPoint))-averageDepth(coreFaceCornerPoints(b).map(projectPoint)));
    for(const face of faces){
      const q=coreFaceCornerPoints(face).map(projectPoint);
      beginPoly(q); ctx.fillStyle=t.core; ctx.fill();
      ctx.lineWidth=2; ctx.strokeStyle='rgba(0,0,0,.22)'; ctx.stroke();
    }
  }
"""
new = """  function drawSolidCore(){
    const t=canvasTheme();
    const faces=FACE_NAMES.filter(face=>faceVisible(face,CORE_PLANE,0.018))
      .sort((a,b)=>averageDepth(coreFaceCornerPoints(a).map(projectPoint))-averageDepth(coreFaceCornerPoints(b).map(projectPoint)));
    for(const face of faces){
      const q=coreFaceCornerPoints(face).map(projectPoint);
      beginPoly(q); ctx.fillStyle=t.core; ctx.fill();
      ctx.lineWidth=2; ctx.strokeStyle='rgba(0,0,0,.22)'; ctx.stroke();
    }
  }
"""
js = replace_once(js, old, new, 'solid core culling')

# A segment is only allowed on a genuinely camera-facing face. It remains
# clipped to that face polygon, so cross-edge paths cannot bleed behind it.
old = """  function drawSegmentOnFace(face,a,b,color,baseWidth){
    const q=faceCornerPoints(face).map(projectPoint);
    const p1=projectPoint(a),p2=projectPoint(b),width=facePathWidth(face,baseWidth);
"""
new = """  function drawSegmentOnFace(face,a,b,color,baseWidth){
    if(!faceVisible(face,PLANE,0.025)) return;
    const q=faceCornerPoints(face).map(projectPoint);
    const p1=projectPoint(a),p2=projectPoint(b),width=facePathWidth(face,baseWidth);
"""
js = replace_once(js, old, new, 'path face guard')

old = """  function drawPath(path,color,width){
    for(let i=1;i<path.length;i++){
      for(const part of pathParts(path[i-1],path[i])){
        if(faceVisibility(part.face)>0.025) drawSegmentOnFace(part.face,part.a,part.b,color,width);
      }
    }
  }
"""
new = """  function drawPath(path,color,width){
    for(let i=1;i<path.length;i++){
      for(const part of pathParts(path[i-1],path[i])){
        if(faceVisible(part.face,PLANE,0.025)) drawSegmentOnFace(part.face,part.a,part.b,color,width);
      }
    }
  }
"""
js = replace_once(js, old, new, 'path culling')

# Letters are deliberately hidden sooner than the tile face itself at grazing
# angles. This avoids mirrored / stretched-looking glyph fragments at the
# silhouette while the thin face edge can still remain visible.
old = """      const minorAxis=Math.min(Math.hypot(ux,uy),Math.hypot(vx,vy));
      if(faceVisibility(tile.face)<0.10 || minorAxis<10) continue;
"""
new = """      const minorAxis=Math.min(Math.hypot(ux,uy),Math.hypot(vx,vy));
      if(faceFacingCosine(tile.face,PLANE)<0.075 || minorAxis<12) continue;
"""
js = replace_once(js, old, new, 'label grazing culling')

# Most important change: the list used for faces, tiles AND hit testing now
# contains only perspective-correct front faces. Rear tiles therefore cannot
# be drawn or clicked at a silhouette angle.
old = """    const visible=FACE_NAMES.filter(face=>faceVisibility(face)>0.015).sort((a,b)=>averageDepth(faceCornerPoints(a).map(projectPoint))-averageDepth(faceCornerPoints(b).map(projectPoint)));
"""
new = """    const visible=FACE_NAMES.filter(face=>faceVisible(face,PLANE,0.025)).sort((a,b)=>averageDepth(faceCornerPoints(a).map(projectPoint))-averageDepth(faceCornerPoints(b).map(projectPoint)));
"""
js = replace_once(js, old, new, 'visible face list')

# Ensure no old normal-z culling remains.
if 'faceVisibility(' in js:
    raise SystemExit('Old faceVisibility calls remain after patch')
if "const APP_VERSION = '0.7.2';" not in js:
    raise SystemExit('Version bump failed')
if 'faceFacingCosine' not in js or 'faceVisible(face,PLANE,0.025)' not in js:
    raise SystemExit('Perspective culling was not installed')
if 'cube.js?v=0.7.2' not in html or 'cube.css?v=0.7.2' not in html:
    raise SystemExit('Cache busting version failed')

js_path.write_text(js, encoding='utf-8')
html_path.write_text(html, encoding='utf-8')
