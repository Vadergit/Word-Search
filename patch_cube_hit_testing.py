from pathlib import Path

js_path=Path('cube/cube.js')
css_path=Path('cube/cube.css')
js=js_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')

def rep(text,old,new,label):
    if old not in text:
        raise SystemExit(f'Missing {label}')
    return text.replace(old,new,1)

# Stable face hit testing based on current cube rotation.
anchor="""  function applyRotation(){
    cube.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  }
"""
replacement="""  const FACE_NORMALS={
    front:[0,0,1],back:[0,0,-1],right:[1,0,0],left:[-1,0,0],top:[0,1,0],bottom:[0,-1,0]
  };

  function rotatedNormalZ(face){
    const [x,y,z]=FACE_NORMALS[face];
    const rx=rotX*Math.PI/180;
    const ry=rotY*Math.PI/180;
    /* CSS transform: rotateX(...) rotateY(...) => local point is rotated by Y,
       then X. Positive resulting Z faces the viewer. */
    const x1=x*Math.cos(ry)+z*Math.sin(ry);
    const y1=y;
    const z1=-x*Math.sin(ry)+z*Math.cos(ry);
    const y2=y1*Math.cos(rx)-z1*Math.sin(rx);
    const z2=y1*Math.sin(rx)+z1*Math.cos(rx);
    return z2;
  }

  function updateFaceHitTesting(){
    document.querySelectorAll('.face').forEach(faceEl=>{
      const face=faceEl.dataset.face;
      const visible=rotatedNormalZ(face)>0.035;
      faceEl.classList.toggle('hit-visible',visible);
      faceEl.setAttribute('aria-hidden',visible?'false':'true');
    });
  }

  function applyRotation(){
    cube.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    updateFaceHitTesting();
  }
"""
js=rep(js,anchor,replacement,'applyRotation')

# CSS: only front-facing faces take pointer input and no hover geometry movement.
css=rep(css,"""  backface-visibility:hidden;
  transform-style:preserve-3d;
}""","""  backface-visibility:hidden;
  -webkit-backface-visibility:hidden;
  transform-style:preserve-3d;
  pointer-events:none;
}
.face.hit-visible{pointer-events:auto}""",'face pointer events')
css=rep(css,".tile:hover{transform:translateZ(2px) scale(1.02)}",".tile:hover{filter:brightness(1.035);box-shadow:0 8px 15px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.78)}",'tile hover')
css=rep(css,"""  transform:translateZ(7px) scale(1.035);
  outline:2px solid #65dfc3;""","""  transform:none;
  outline:2px solid #65dfc3;""",'selected transform')

# Reduce transform in transient animations too, so mouse target does not jump under cursor.
css=css.replace('transform:translateZ(6px) scale(1.05)','filter:brightness(1.12)')
css=css.replace('transform:translateZ(5px) scale(1.04)','filter:brightness(1.1)')
css=css.replace('transform:translateZ(4px) scale(.98)','filter:brightness(.95)')

assert 'function updateFaceHitTesting()' in js
assert "faceEl.classList.toggle('hit-visible',visible)" in js
assert '.face.hit-visible{pointer-events:auto}' in css
assert '.tile:hover{filter:brightness' in css
assert 'transform:translateZ(7px)' not in css

js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
