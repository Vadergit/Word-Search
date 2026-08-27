from pathlib import Path

js_path=Path('cube/cube.js')
html_path=Path('cube/index.html')
js=js_path.read_text(encoding='utf-8')
html=html_path.read_text(encoding='utf-8')


def rep(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing {label}')
    return text.replace(old,new,1)

js=rep(js,"  const APP_VERSION = '0.5.0';","  const APP_VERSION = '0.5.1';",'version')
html=html.replace('v0.5.0','v0.5.1')
html=html.replace('cube.css?v=0.5.0','cube.css?v=0.5.1')
html=html.replace('cube.js?v=0.5.0','cube.js?v=0.5.1')

old='''  function drawTileLabels(){
    const ordered=[...renderedTiles].sort((a,b)=>a.depth-b.depth);
    for(const tile of ordered){
      const node=nodeById.get(tile.id),center=projectPoint(node.pos),def=FACE[node.face],uPoint=projectPoint(V.add(node.pos,V.mul(def.u,0.35)));
      const angle=Math.atan2(uPoint.y-center.y,uPoint.x-center.x),fontSize=Math.max(19,Math.min(46,tile.size*0.42));
      ctx.save(); ctx.translate(center.x,center.y); ctx.rotate(angle); ctx.font=`800 ${fontSize}px Georgia, "Times New Roman", serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#10201a'; ctx.fillText(board[tile.id],0,1); ctx.restore();
      const step=selected.indexOf(tile.id);
      if(step>=0) drawBadge(tile,step+1,'#0b1a15','#b9ffe9'); else if(solvedNodes.has(tile.id)) drawBadge(tile,'✓','#24411a','#eaffd8');
    }
  }
'''
new='''  function drawTileLabels(){
    const ordered=[...renderedTiles].sort((a,b)=>a.depth-b.depth);
    for(const tile of ordered){
      const q=tile.quad;
      const center={
        x:(q[0].x+q[1].x+q[2].x+q[3].x)/4,
        y:(q[0].y+q[1].y+q[2].y+q[3].y)/4
      };

      /* Build the exact same 2D face basis from the projected tile quad that is
         used to draw the tile itself. Text is then transformed by this basis,
         so it lies visually ON the face instead of remaining screen-flat. */
      const left={x:(q[0].x+q[3].x)/2,y:(q[0].y+q[3].y)/2};
      const right={x:(q[1].x+q[2].x)/2,y:(q[1].y+q[2].y)/2};
      const top={x:(q[0].x+q[1].x)/2,y:(q[0].y+q[1].y)/2};
      const bottom={x:(q[3].x+q[2].x)/2,y:(q[3].y+q[2].y)/2};
      const ux=right.x-left.x, uy=right.y-left.y;
      const vx=bottom.x-top.x, vy=bottom.y-top.y;

      ctx.save();
      beginPoly(q);
      ctx.clip();
      ctx.setTransform(dpr*ux,dpr*uy,dpr*vx,dpr*vy,dpr*center.x,dpr*center.y);
      ctx.font='800 0.58px Georgia, "Times New Roman", serif';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillStyle='#10201a';
      ctx.fillText(board[tile.id],0,0.03);
      ctx.restore();
      ctx.setTransform(dpr,0,0,dpr,0,0);

      const step=selected.indexOf(tile.id);
      if(step>=0) drawBadge(tile,step+1,'#0b1a15','#b9ffe9'); else if(solvedNodes.has(tile.id)) drawBadge(tile,'✓','#24411a','#eaffd8');
    }
  }
'''
js=rep(js,old,new,'drawTileLabels')

assert "const APP_VERSION = '0.5.1';" in js
assert "ctx.font='800 0.58px Georgia" in js
assert 'const ux=right.x-left.x' in js
assert 'cube.js?v=0.5.1' in html
assert 'cube.css?v=0.5.1' in html
assert 'v0.5.1' in html

js_path.write_text(js,encoding='utf-8')
html_path.write_text(html,encoding='utf-8')
