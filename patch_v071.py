from pathlib import Path

cube=Path('cube/cube.js')
html=Path('cube/index.html')
main=Path('index.html')
js=cube.read_text(encoding='utf-8')
h=html.read_text(encoding='utf-8')
m=main.read_text(encoding='utf-8')

def rep(text,old,new,label):
    if old not in text:
        raise SystemExit(f'Missing {label}')
    return text.replace(old,new,1)

# Cube version
js=rep(js,"const APP_VERSION = '0.7.0';","const APP_VERSION = '0.7.1';",'cube version')
h=h.replace('v0.7.0','v0.7.1').replace('cube.css?v=0.7.0','cube.css?v=0.7.1').replace('cube.js?v=0.7.0','cube.js?v=0.7.1')

# 2D: any selected tile toggles off; truncate tail to preserve a continuous path.
old='''    const last=selected[selected.length-1];

    if(idx===last){
      startAutoReset();
      return;
    }

    if(selected.length>=2&&idx===selected[selected.length-2]){
      selected.pop();
      updateSelectionUI();
      startAutoReset();
      return;
    }

    if(!isAdjacent(last,idx)||selected.includes(idx)){
      selected=[idx];
      updateSelectionUI();
      startAutoReset();
      return;
    }
'''
new='''    const last=selected[selected.length-1];
    const selectedIndex=selected.indexOf(idx);

    if(selectedIndex>=0){
      selected=selected.slice(0,selectedIndex);
      updateSelectionUI();
      if(selected.length)startAutoReset();
      else{
        clearTimeout(resetTimer);
        resetTimer=null;
        timeoutBar.style.transition="none";
        timeoutBar.style.width="0%";
      }
      return;
    }

    if(!isAdjacent(last,idx)){
      selected=[idx];
      updateSelectionUI();
      startAutoReset();
      return;
    }
'''
m=rep(m,old,new,'2d deselect block')

# Cube path drawing: clip each face segment to its actual projected face and scale width at grazing angles.
old='''  function drawSegment(a,b,color,width){
    const p1=projectPoint(a),p2=projectPoint(b); ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.strokeStyle=canvasTheme().pathUnder; ctx.lineWidth=width+10; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.strokeStyle=color; ctx.lineWidth=width; ctx.shadowColor=color; ctx.shadowBlur=8; ctx.stroke(); ctx.shadowBlur=0;
  }

  function drawPath(path,color,width){
    for(let i=1;i<path.length;i++) for(const part of pathParts(path[i-1],path[i])) if(faceVisibility(part.face)>0.025) drawSegment(part.a,part.b,color,width);
  }
'''
new='''  function facePathWidth(face,baseWidth){
    const q=faceCornerPoints(face).map(projectPoint);
    const top=Math.hypot(q[1].x-q[0].x,q[1].y-q[0].y);
    const bottom=Math.hypot(q[2].x-q[3].x,q[2].y-q[3].y);
    const left=Math.hypot(q[3].x-q[0].x,q[3].y-q[0].y);
    const right=Math.hypot(q[2].x-q[1].x,q[2].y-q[1].y);
    const tileMinor=Math.min((top+bottom)/2,(left+right)/2)/GRID;
    return Math.min(baseWidth,Math.max(3,tileMinor*.34));
  }

  function drawSegmentOnFace(face,a,b,color,baseWidth){
    const q=faceCornerPoints(face).map(projectPoint);
    const p1=projectPoint(a),p2=projectPoint(b),width=facePathWidth(face,baseWidth);
    ctx.save();
    beginPoly(q);
    ctx.clip();
    ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.strokeStyle=canvasTheme().pathUnder; ctx.lineWidth=width+Math.max(4,width*.58); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.strokeStyle=color; ctx.lineWidth=width; ctx.shadowColor=color; ctx.shadowBlur=Math.min(8,width*.6); ctx.stroke();
    ctx.restore();
  }

  function drawPath(path,color,width){
    for(let i=1;i<path.length;i++){
      for(const part of pathParts(path[i-1],path[i])){
        if(faceVisibility(part.face)>0.025) drawSegmentOnFace(part.face,part.a,part.b,color,width);
      }
    }
  }
'''
js=rep(js,old,new,'cube clipped path rendering')

# Cube labels: avoid perspective artefacts at grazing angles and remove all numbered/check badges.
old='''      if(cubeCleared) continue;

      ctx.save();
      beginPoly(q);
      ctx.clip();
      ctx.setTransform(dpr*ux,dpr*uy,dpr*vx,dpr*vy,dpr*center.x,dpr*center.y);
      ctx.font='800 0.58px Georgia, "Times New Roman", serif';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillStyle=canvasTheme().tileText;
      ctx.fillText(board[tile.id],0,0.03);
      ctx.restore();
      ctx.setTransform(dpr,0,0,dpr,0,0);

      const step=selected.indexOf(tile.id);
      if(step>=0) drawBadge(tile,step+1,'#0b1a15','#b9ffe9'); else if(solvedNodes.has(tile.id)) drawBadge(tile,'✓','#24411a','#eaffd8');
'''
new='''      if(cubeCleared) continue;

      const minorAxis=Math.min(Math.hypot(ux,uy),Math.hypot(vx,vy));
      if(faceVisibility(tile.face)<0.10 || minorAxis<10) continue;

      ctx.save();
      beginPoly(q);
      ctx.clip();
      ctx.setTransform(dpr*ux,dpr*uy,dpr*vx,dpr*vy,dpr*center.x,dpr*center.y);
      ctx.font='800 0.58px Georgia, "Times New Roman", serif';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillStyle=canvasTheme().tileText;
      ctx.fillText(board[tile.id],0,0.03);
      ctx.restore();
      ctx.setTransform(dpr,0,0,dpr,0,0);
'''
js=rep(js,old,new,'cube label/badge block')

# Remove now-unused badge renderer.
start=js.find("  function drawBadge(tile,label,bg,fg){")
if start!=-1:
    end=js.find("\n\n  function draw(){",start)
    if end==-1: raise SystemExit('Missing draw after badge')
    js=js[:start]+js[end+2:]

# Sanity
assert "const APP_VERSION = '0.7.1';" in js
assert 'drawSegmentOnFace' in js
assert 'facePathWidth' in js
assert 'drawBadge(' not in js
assert 'faceVisibility(tile.face)<0.10' in js
assert 'selected=selected.slice(0,selectedIndex);' in m
assert 'idx===last' not in m[m.find('function clickCell'):m.find('let pointerSelecting')]
assert 'v0.7.1' in h

cube.write_text(js,encoding='utf-8')
html.write_text(h,encoding='utf-8')
main.write_text(m,encoding='utf-8')
