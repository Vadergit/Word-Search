(() => {
  'use strict';

  const APP_VERSION='0.3.0';
  const SELECTION_MS=8000;
  const CAMERA_Z=7.2;
  const LETTER_POOL='EEEEEEEEEEEEAAAAAAAAAIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ';
  const mode=document.body.dataset.mode;
  const MODE={
    pyramid:{name:'Word Pyramid',badge:'4 faces · 40 tiles',words:['PEAK','ROCK','CLIMB','RIDGE','STONE','TRAIL'],defaultRotX:-20,defaultRotY:-30},
    orb:{name:'Word Orb',badge:'6 × 8 · 48 tiles',words:['ORBIT','ROUND','GLOBE','SPHERE','WORLD','CURVE'],defaultRotX:-18,defaultRotY:-30},
    mug:{name:'Word Mug',badge:'6 × 6 · front grid',words:['COFFEE','MUG','STEAM','BEANS','LATTE','WARM'],defaultRotX:-12,defaultRotY:-24}
  }[mode];
  if(!MODE) throw new Error('Unknown prototype mode.');

  const stage=document.getElementById('stage');
  const canvas=document.getElementById('gameCanvas');
  const ctx=canvas.getContext('2d',{alpha:true});
  const currentWordEl=document.getElementById('currentWord');
  const selectionMetaEl=document.getElementById('selectionMeta');
  const timerBar=document.getElementById('timerBar');
  const targetList=document.getElementById('targetList');
  const foundStat=document.getElementById('foundStat');
  const scoreStat=document.getElementById('scoreStat');
  const tileStat=document.getElementById('tileStat');
  const routeStat=document.getElementById('routeStat');
  const elapsedStat=document.getElementById('elapsedStat');
  const clearBtn=document.getElementById('clearBtn');
  const checkBtn=document.getElementById('checkBtn');
  const newBtn=document.getElementById('newBtn');
  const resetViewBtn=document.getElementById('resetViewBtn');
  const themeBtn=document.getElementById('themeBtn');
  const toastEl=document.getElementById('toast');
  const winEl=document.getElementById('win');
  const winText=document.getElementById('winText');
  const nextBtn=document.getElementById('nextBtn');
  const themeColorMeta=document.getElementById('themeColorMeta');

  const V={
    add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
    sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
    mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
    dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
    cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
    len:a=>Math.hypot(a[0],a[1],a[2]),
    norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]}
  };
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const randInt=n=>Math.floor(Math.random()*n);
  const shuffle=list=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=randInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};

  const nodes=[],nodeById=new Map(),adjacency=new Map();
  let bodyFaces=[];
  let board=[],targets=[],targetPaths=new Map(),foundTargets=new Set(),foundPathByWord=new Map(),solvedNodes=new Set(),selected=[];
  let renderedTiles=[];
  let rotX=MODE.defaultRotX,rotY=MODE.defaultRotY;
  let canvasWidth=1,canvasHeight=1,dpr=1;
  let rotating=false,dragPointerId=null,lastPointerX=0,lastPointerY=0;
  let timerId=null,timerStartedAt=0,timerRemaining=SELECTION_MS,timerPausedForRotation=false;
  let solveStartedAt=0,solveFinalMs=0,solveTicker=null;
  let score=0,flashUntil=new Map(),toastTimer=null,currentTheme='light';

  const CANVAS_THEME={
    light:{
      body:'#555d5a',body2:'#68706d',bodyEdge:'rgba(33,111,90,.34)',core:'#414744',
      tile:'#fbfdfa',tileText:'#173028',tileStroke:'rgba(23,48,40,.24)',
      selected:'#55d7b9',selectedStroke:'#147e67',solved:'#b9e58f',solvedStroke:'#5d9634',
      invalid:'#ef9f96',pathUnder:'rgba(255,255,255,.96)',wire:'rgba(39,91,74,.16)',rim:'#c7d8d1'
    },
    dark:{
      body:'#2d3331',body2:'#39413e',bodyEdge:'rgba(101,223,195,.24)',core:'#252a29',
      tile:'#e9eee8',tileText:'#10201a',tileStroke:'rgba(9,27,21,.24)',
      selected:'#65dfc3',selectedStroke:'#d8fff4',solved:'#aee17f',solvedStroke:'#d8ffb9',
      invalid:'#ef9f96',pathUnder:'rgba(4,14,11,.88)',wire:'rgba(101,223,195,.13)',rim:'#60706a'
    }
  };
  const theme=()=>CANVAS_THEME[currentTheme];

  function addNode(node){
    node.id=nodes.length;
    nodes.push(node);nodeById.set(node.id,node);adjacency.set(node.id,new Set());
    return node.id;
  }
  function addLink(a,b){if(a===b)return;adjacency.get(a).add(b);adjacency.get(b).add(a)}
  function rotated(p){
    const ry=rotY*Math.PI/180,rx=rotX*Math.PI/180;
    const x1=p[0]*Math.cos(ry)+p[2]*Math.sin(ry);
    const z1=-p[0]*Math.sin(ry)+p[2]*Math.cos(ry);
    const y1=p[1];
    return [x1,y1*Math.cos(rx)-z1*Math.sin(rx),y1*Math.sin(rx)+z1*Math.cos(rx)];
  }
  function project(p){
    const r=rotated(p),f=Math.min(canvasWidth,canvasHeight)*.92,z=Math.max(.8,CAMERA_Z-r[2]);
    return{x:canvasWidth/2+r[0]*f/z,y:canvasHeight/2+r[1]*f/z,z:r[2],s:f/z};
  }
  function facing(normal){return rotated(normal)[2]}
  function beginPoly(points){if(!points.length)return;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath()}
  function averageDepth(points){return points.reduce((s,p)=>s+p.z,0)/Math.max(1,points.length)}
  function shade(hex,factor){
    const n=parseInt(hex.slice(1),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    const c=x=>Math.round(clamp(x*factor,0,255)).toString(16).padStart(2,'0');
    return `#${c(r)}${c(g)}${c(b)}`;
  }

  function buildPyramid(){
    const A=[0,2.05,0],B=[-1.95,-1.25,1.3],C=[1.95,-1.25,1.3],D=[0,-1.25,-2.25];
    const faces=[[A,B,C],[A,C,D],[A,D,B],[B,D,C]];
    bodyFaces=faces.map((verts,index)=>{
      const ab=V.sub(verts[1],verts[0]),ac=V.sub(verts[2],verts[0]);
      let normal=V.norm(V.cross(ab,ac));
      const center=V.mul(V.add(V.add(verts[0],verts[1]),verts[2]),1/3);
      if(V.dot(normal,center)<0)normal=V.mul(normal,-1);
      return{verts,normal,index};
    });
    for(const face of bodyFaces){
      const [a,b,c]=face.verts;
      const u=V.norm(V.sub(c,b));
      const v=V.norm(V.cross(face.normal,u));
      const ids=[];
      for(let row=0;row<4;row++){
        for(let col=0;col<=row;col++){
          const t=(row+.62)/4.15;
          const mix=row?col/row:.5;
          const edge=V.add(V.mul(b,1-mix),V.mul(c,mix));
          const pos=V.add(V.add(V.mul(a,1-t),V.mul(edge,t)),V.mul(face.normal,.055));
          ids.push(addNode({pos,normal:face.normal,u,v,halfU:.285,halfV:.245,region:face.index,row,col}));
        }
      }
      face.ids=ids;
    }
    for(const face of bodyFaces){
      const byRC=new Map(face.ids.map(id=>{const n=nodeById.get(id);return[`${n.row}:${n.col}`,id]}));
      for(const id of face.ids){
        const n=nodeById.get(id);
        for(const [rr,cc] of [[n.row,n.col-1],[n.row,n.col+1],[n.row-1,n.col-1],[n.row-1,n.col],[n.row+1,n.col],[n.row+1,n.col+1]]){
          const other=byRC.get(`${rr}:${cc}`);if(other!==undefined)addLink(id,other);
        }
      }
    }
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      if(nodes[i].region===nodes[j].region)continue;
      if(V.len(V.sub(nodes[i].pos,nodes[j].pos))<.78)addLink(i,j);
    }
  }

  function buildOrb(){
    const rows=6,cols=8,R=2.02;
    for(let r=0;r<rows;r++){
      const lat=(-60+r*24)*Math.PI/180;
      for(let c=0;c<cols;c++){
        const lon=c/cols*Math.PI*2;
        const normal=[Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)];
        const pos=V.mul(normal,R+.055);
        const u=V.norm([Math.cos(lon),0,-Math.sin(lon)]);
        const v=V.norm(V.cross(normal,u));
        addNode({pos,normal,u,v,halfU:.34,halfV:.29,row:r,col:c,region:r,lat,lon,surface:'orb'});
      }
    }
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const id=r*cols+c;
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
        if(!dr&&!dc)continue;const rr=r+dr;if(rr<0||rr>=rows)continue;
        const cc=(c+dc+cols)%cols;addLink(id,rr*cols+cc);
      }
    }
  }

  function buildMug(){
    const rows=6,cols=6,R=1.58;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const theta=-.72+c*(1.44/(cols-1));
      const y=1.05-r*(2.10/(rows-1));
      const normal=[Math.sin(theta),0,Math.cos(theta)];
      const pos=[Math.sin(theta)*(R+.055),y,Math.cos(theta)*(R+.055)];
      const u=V.norm([Math.cos(theta),0,-Math.sin(theta)]),v=[0,1,0];
      addNode({pos,normal,u,v,halfU:.205,halfV:.185,row:r,col:c,region:0,theta,y,surface:'mug'});
    }
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const id=r*cols+c;
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
        if(!dr&&!dc)continue;const rr=r+dr,cc=c+dc;
        if(rr>=0&&rr<rows&&cc>=0&&cc<cols)addLink(id,rr*cols+cc);
      }
    }
  }

  function buildGeometry(){
    nodes.length=0;nodeById.clear();adjacency.clear();bodyFaces=[];
    if(mode==='pyramid')buildPyramid();else if(mode==='orb')buildOrb();else buildMug();
    tileStat.textContent=nodes.length;
    routeStat.textContent=mode==='orb'?'Wrap':mode==='pyramid'?'Edges':'Front';
  }

  function tileCorners(node){
    const p=node.pos,u=node.u,v=node.v;
    return[
      V.add(p,V.add(V.mul(u,-node.halfU),V.mul(v,-node.halfV))),
      V.add(p,V.add(V.mul(u, node.halfU),V.mul(v,-node.halfV))),
      V.add(p,V.add(V.mul(u, node.halfU),V.mul(v, node.halfV))),
      V.add(p,V.add(V.mul(u,-node.halfU),V.mul(v, node.halfV)))
    ];
  }

  function drawPyramidBody(){
    const t=theme();
    const visible=bodyFaces.filter(f=>facing(f.normal)>.015).map(f=>({...f,q:f.verts.map(project)})).sort((a,b)=>averageDepth(a.q)-averageDepth(b.q));
    for(const f of visible){
      beginPoly(f.q);
      const light=clamp(.82+facing(f.normal)*.15,.78,1.06);
      ctx.fillStyle=shade(t.body,light);ctx.fill();
      ctx.lineWidth=2;ctx.strokeStyle=t.bodyEdge;ctx.stroke();
    }
  }

  function drawOrbBody(){
    const t=theme(),R=2.02,center=project([0,0,0]),edge=project([R,0,0]),radius=Math.hypot(edge.x-center.x,edge.y-center.y);
    const grad=ctx.createRadialGradient(center.x-radius*.32,center.y-radius*.36,radius*.12,center.x,center.y,radius);
    if(currentTheme==='light'){grad.addColorStop(0,'#727b77');grad.addColorStop(.55,'#555d5a');grad.addColorStop(1,'#363d3a')}
    else{grad.addColorStop(0,'#4c5652');grad.addColorStop(.55,'#2d3331');grad.addColorStop(1,'#1c211f')}
    ctx.beginPath();ctx.arc(center.x,center.y,radius,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();
    ctx.lineWidth=2;ctx.strokeStyle=t.bodyEdge;ctx.stroke();

    ctx.save();ctx.lineWidth=1;ctx.strokeStyle=t.wire;
    const drawCurve=(points,normals)=>{
      let open=false;ctx.beginPath();
      for(let i=0;i<points.length;i++){
        const vis=facing(normals[i])>.02,p=project(points[i]);
        if(vis){if(!open){ctx.moveTo(p.x,p.y);open=true}else ctx.lineTo(p.x,p.y)}
        else open=false;
      }
      ctx.stroke();
    };
    for(const latDeg of [-60,-36,-12,12,36,60]){
      const lat=latDeg*Math.PI/180,pts=[],normals=[];
      for(let i=0;i<=96;i++){const lon=i/96*Math.PI*2,n=[Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)];normals.push(n);pts.push(V.mul(n,R+.008))}
      drawCurve(pts,normals);
    }
    for(let m=0;m<8;m++){
      const lon=m/8*Math.PI*2,pts=[],normals=[];
      for(let i=0;i<=64;i++){const lat=-Math.PI/2+i/64*Math.PI,n=[Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)];normals.push(n);pts.push(V.mul(n,R+.008))}
      drawCurve(pts,normals);
    }
    ctx.restore();
  }

  function mugRingPoints(y,R=1.58,count=80){
    const pts=[];for(let i=0;i<=count;i++){const th=i/count*Math.PI*2;pts.push([Math.sin(th)*R,y,Math.cos(th)*R])}return pts;
  }
  function drawMugHandle(){
    const t=theme(),outer=[],inner=[];
    for(let i=0;i<=64;i++){
      const a=-Math.PI*.72+i/64*Math.PI*1.44;
      outer.push([1.47+Math.cos(a)*1.02,Math.sin(a)*1.02,0]);
      inner.push([1.47+Math.cos(a)*.70,Math.sin(a)*.70,0]);
    }
    const stroke=(pts,width,color)=>{ctx.beginPath();pts.forEach((p,i)=>{const q=project(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.lineWidth=width;ctx.lineCap='round';ctx.strokeStyle=color;ctx.stroke()};
    stroke(outer,18,currentTheme==='light'?'#3f4744':'#252b29');stroke(outer,13,currentTheme==='light'?'#dfeae5':'#59635f');
    stroke(inner,4,t.bodyEdge);
  }
  function drawMugBody(){
    const t=theme(),R=1.58,top=1.55,bottom=-1.55,segments=[];
    for(let i=0;i<56;i++){
      const a=-Math.PI+i/56*Math.PI*2,b=-Math.PI+(i+1)/56*Math.PI*2,mid=(a+b)/2,normal=[Math.sin(mid),0,Math.cos(mid)];
      if(facing(normal)<=.005)continue;
      const verts=[[Math.sin(a)*R,top,Math.cos(a)*R],[Math.sin(b)*R,top,Math.cos(b)*R],[Math.sin(b)*R,bottom,Math.cos(b)*R],[Math.sin(a)*R,bottom,Math.cos(a)*R]];
      const q=verts.map(project);segments.push({q,normal,depth:averageDepth(q)});
    }
    segments.sort((a,b)=>a.depth-b.depth);
    for(const s of segments){
      beginPoly(s.q);ctx.fillStyle=shade(t.body2,clamp(.76+facing(s.normal)*.25,.74,1.04));ctx.fill();
    }
    const ring=mugRingPoints(top,R+.015).map(project);
    ctx.beginPath();ring.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=t.rim;ctx.lineWidth=7;ctx.stroke();
    ctx.beginPath();ring.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=t.bodyEdge;ctx.lineWidth=1.3;ctx.stroke();
    const inner=mugRingPoints(top-.025,R-.13).map(project);
    ctx.beginPath();inner.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=currentTheme==='light'?'rgba(30,45,40,.35)':'rgba(0,0,0,.45)';ctx.lineWidth=2;ctx.stroke();
  }

  function drawBody(){
    if(mode==='pyramid')drawPyramidBody();
    else if(mode==='orb')drawOrbBody();
    else{drawMugHandle();drawMugBody()}
  }

  function buildRenderedTiles(){
    renderedTiles=[];
    for(const node of nodes){
      if(facing(node.normal)<=.055)continue;
      const quad=tileCorners(node).map(project);
      renderedTiles.push({id:node.id,quad,depth:averageDepth(quad),facing:facing(node.normal)});
    }
    renderedTiles.sort((a,b)=>a.depth-b.depth);
  }
  function tileFill(id){
    const t=theme();
    if(selected.includes(id))return t.selected;
    if(solvedNodes.has(id))return t.solved;
    if((flashUntil.get(id)||0)>performance.now())return t.invalid;
    return t.tile;
  }
  function drawTiles(){
    const t=theme();
    for(const tile of renderedTiles){
      beginPoly(tile.quad);ctx.fillStyle=tileFill(tile.id);ctx.fill();
      ctx.lineWidth=selected.includes(tile.id)?3.3:solvedNodes.has(tile.id)?2.2:1.25;
      ctx.strokeStyle=selected.includes(tile.id)?t.selectedStroke:solvedNodes.has(tile.id)?t.solvedStroke:t.tileStroke;ctx.stroke();
    }
  }

  function slerp(a,b,t){
    const na=V.norm(a),nb=V.norm(b),dot=clamp(V.dot(na,nb),-1,1),omega=Math.acos(dot);
    if(omega<1e-5)return V.norm(V.add(V.mul(na,1-t),V.mul(nb,t)));
    const s=Math.sin(omega);return V.add(V.mul(na,Math.sin((1-t)*omega)/s),V.mul(nb,Math.sin(t*omega)/s));
  }
  function surfaceSamples(a,b){
    const A=nodeById.get(a),B=nodeById.get(b),out=[];
    if(mode==='orb'){
      const R=2.10;
      for(let i=0;i<=8;i++){const t=i/8,n=slerp(A.normal,B.normal,t);out.push({p:V.mul(n,R),n})}
      return out;
    }
    if(mode==='mug'){
      let d=B.theta-A.theta;if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;
      for(let i=0;i<=7;i++){const t=i/7,th=A.theta+d*t,y=A.y+(B.y-A.y)*t,n=[Math.sin(th),0,Math.cos(th)];out.push({p:[Math.sin(th)*1.665,y,Math.cos(th)*1.665],n})}
      return out;
    }
    for(let i=0;i<=3;i++){const t=i/3,p=V.add(V.mul(A.pos,1-t),V.mul(B.pos,t));const n=V.norm(V.add(V.mul(A.normal,1-t),V.mul(B.normal,t)));out.push({p,n})}
    return out;
  }
  function drawPath(path,color,width){
    const t=theme();
    for(let k=1;k<path.length;k++){
      const samples=surfaceSamples(path[k-1],path[k]);
      let segment=[];
      const flush=()=>{
        if(segment.length<2){segment=[];return}
        const drawStroke=(stroke,wid,shadow=false)=>{
          ctx.beginPath();segment.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
          ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=stroke;ctx.lineWidth=wid;
          if(shadow){ctx.shadowColor=color;ctx.shadowBlur=7}else ctx.shadowBlur=0;
          ctx.stroke();ctx.shadowBlur=0;
        };
        drawStroke(t.pathUnder,width+7);drawStroke(color,width,true);segment=[];
      };
      for(const s of samples){
        if(facing(s.n)>.02)segment.push(project(s.p));else flush();
      }
      flush();
    }
  }
  function drawTrails(){
    foundPathByWord.forEach(path=>drawPath(path,theme().solved,13));
    if(selected.length>1)drawPath(selected,theme().selected,15);
  }

  function drawLabels(){
    const t=theme();
    for(const tile of renderedTiles){
      if(tile.facing<.075)continue;
      const q=tile.quad,center={x:(q[0].x+q[1].x+q[2].x+q[3].x)/4,y:(q[0].y+q[1].y+q[2].y+q[3].y)/4};
      const left={x:(q[0].x+q[3].x)/2,y:(q[0].y+q[3].y)/2},right={x:(q[1].x+q[2].x)/2,y:(q[1].y+q[2].y)/2};
      const top={x:(q[0].x+q[1].x)/2,y:(q[0].y+q[1].y)/2},bottom={x:(q[3].x+q[2].x)/2,y:(q[3].y+q[2].y)/2};
      const ux=right.x-left.x,uy=right.y-left.y,vx=bottom.x-top.x,vy=bottom.y-top.y;
      if(Math.min(Math.hypot(ux,uy),Math.hypot(vx,vy))<10)continue;
      ctx.save();beginPoly(q);ctx.clip();ctx.setTransform(dpr*ux,dpr*uy,dpr*vx,dpr*vy,dpr*center.x,dpr*center.y);
      ctx.font='800 0.55px Georgia, "Times New Roman", serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=t.tileText;ctx.fillText(board[tile.id]||'',0,.025);ctx.restore();
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
  }
  function draw(){
    ctx.clearRect(0,0,canvasWidth,canvasHeight);drawBody();buildRenderedTiles();drawTiles();drawTrails();drawLabels();
  }

  function pointInPoly(x,y,pts){
    let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){
      const xi=pts[i].x,yi=pts[i].y,xj=pts[j].x,yj=pts[j].y;
      if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi+1e-9)+xi))inside=!inside;
    }return inside;
  }
  function hitTile(clientX,clientY){
    const rect=canvas.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top;
    const hits=renderedTiles.filter(t=>pointInPoly(x,y,t.quad)).sort((a,b)=>b.depth-a.depth);
    return hits[0]?.id??null;
  }

  function findRoute(length,used,minRegions=1){
    const candidates=shuffle(nodes.map(n=>n.id).filter(id=>!used.has(id)));
    for(const start of candidates.slice(0,30)){
      const path=[start],seen=new Set([start]);
      const dfs=()=>{
        if(path.length===length){
          const regions=new Set(path.map(id=>nodeById.get(id).region));
          return regions.size>=minRegions;
        }
        const next=shuffle([...adjacency.get(path[path.length-1])].filter(id=>!seen.has(id)&&!used.has(id)));
        for(const id of next){seen.add(id);path.push(id);if(dfs())return true;path.pop();seen.delete(id)}
        return false;
      };
      if(dfs())return path;
    }
    return null;
  }
  function generatePuzzle(){
    for(let attempt=0;attempt<80;attempt++){
      const used=new Set(),paths=new Map();let ok=true;
      for(let i=0;i<MODE.words.length;i++){
        const word=MODE.words[i];
        let path=null;
        if(mode==='orb'&&i===0){
          const row=randInt(6),start=6+randInt(2);
          const p=[];for(let j=0;j<word.length;j++)p.push(row*8+((start+j)%8));
          if(p.every(id=>!used.has(id)))path=p;
        }
        if(!path)path=findRoute(word.length,used,mode==='pyramid'&&i<2?2:1);
        if(!path){ok=false;break}
        path.forEach(id=>used.add(id));paths.set(word,path);
      }
      if(!ok)continue;
      board=Array(nodes.length).fill('').map(()=>LETTER_POOL[randInt(LETTER_POOL.length)]);
      paths.forEach((path,word)=>path.forEach((id,i)=>board[id]=word[i]));
      targets=[...MODE.words];targetPaths=paths;return;
    }
    throw new Error('Could not build prototype routes.');
  }

  function renderTargets(){
    targetList.innerHTML='';
    for(const word of targets){
      const chip=document.createElement('div');chip.className='target-chip'+(foundTargets.has(word)?' found':'');
      chip.innerHTML=`<strong>${word}</strong><span>${foundTargets.has(word)?'Found ✓':`${word.length} letters`}</span>`;
      targetList.appendChild(chip);
    }
  }
  function selectedWord(){return selected.map(id=>board[id]).join('')}
  function updateSelectionUI(){
    const word=selectedWord();currentWordEl.textContent=word||'Tap a tile to start';
    if(selected.length&&rotating&&timerPausedForRotation)selectionMetaEl.textContent=`Timer paused while rotating · ${(timerRemaining/1000).toFixed(1)}s remaining`;
    else selectionMetaEl.textContent=selected.length?`${selected.length} tile${selected.length===1?'':'s'} · trail active · 8s timer`:'8 seconds after every tile · or press Check word';
    clearBtn.disabled=!selected.length;checkBtn.disabled=selected.length<3;
  }
  function updateStats(){foundStat.textContent=`${foundTargets.size}/${targets.length}`;scoreStat.textContent=score}
  function toast(text){toastEl.textContent=text;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),1500)}
  function flashTile(id){flashUntil.set(id,performance.now()+420);draw();setTimeout(draw,450)}

  function evaluateSelection(){
    if(!selected.length)return;
    const word=selectedWord(),path=[...selected];
    const target=targets.find(w=>w===word&&!foundTargets.has(w));
    const intended=target&&targetPaths.get(target);
    if(target&&intended&&intended.length===path.length&&intended.every((id,i)=>id===path[i])){
      foundTargets.add(target);foundPathByWord.set(target,path);path.forEach(id=>solvedNodes.add(id));score+=120;selected=[];stopSelectionTimer();renderTargets();updateSelectionUI();updateStats();draw();toast(`${target} found`);
      if(foundTargets.size===targets.length){const elapsed=stopSolveClock();setTimeout(()=>showWin(elapsed),350)}
      return;
    }
    const last=selected[selected.length-1];if(last!==undefined)flashTile(last);toast('Not a target route');selected=[];stopSelectionTimer();updateSelectionUI();draw();
  }
  function selectTile(id){
    if(rotating)return;
    const index=selected.indexOf(id);
    if(index>=0){selected=selected.slice(0,index);updateSelectionUI();selected.length?startSelectionTimer(SELECTION_MS):stopSelectionTimer();draw();return}
    const last=selected[selected.length-1];
    if(last!==undefined&&!adjacency.get(last).has(id)){flashTile(id);toast('Choose a touching tile');return}
    selected.push(id);updateSelectionUI();draw();
    const candidate=selectedWord(),target=targets.find(w=>w===candidate&&!foundTargets.has(w));
    if(target){
      const intended=targetPaths.get(target);
      if(intended&&intended.length===selected.length&&intended.every((v,i)=>v===selected[i])){stopSelectionTimer();setTimeout(()=>selectedWord()===candidate&&evaluateSelection(),120);return}
    }
    startSelectionTimer(SELECTION_MS);
  }

  function setTimerBar(percent){timerBar.style.width=`${clamp(percent,0,100)}%`}
  function timerTick(){
    if(!timerStartedAt)return;
    const remaining=Math.max(0,timerRemaining-(performance.now()-timerStartedAt));
    setTimerBar(remaining/SELECTION_MS*100);
    if(remaining<=0){stopSelectionTimer(false);evaluateSelection()}
  }
  function startSelectionTimer(ms){
    clearInterval(timerId);timerRemaining=ms;timerStartedAt=performance.now();timerPausedForRotation=false;setTimerBar(ms/SELECTION_MS*100);timerId=setInterval(timerTick,50);
  }
  function pauseSelectionTimer(){
    if(!timerStartedAt)return;timerRemaining=Math.max(0,timerRemaining-(performance.now()-timerStartedAt));timerStartedAt=0;clearInterval(timerId);timerId=null;timerPausedForRotation=true;setTimerBar(timerRemaining/SELECTION_MS*100);updateSelectionUI();
  }
  function resumeSelectionTimer(){
    if(!selected.length||!timerPausedForRotation)return;timerStartedAt=performance.now();timerPausedForRotation=false;clearInterval(timerId);timerId=setInterval(timerTick,50);updateSelectionUI();
  }
  function stopSelectionTimer(reset=true){
    clearInterval(timerId);timerId=null;timerStartedAt=0;timerPausedForRotation=false;timerRemaining=SELECTION_MS;if(reset)setTimerBar(0);
  }

  function formatTime(ms){const m=Math.floor(ms/60000),s=Math.floor(ms%60000/1000),t=Math.floor(ms%1000/100);return`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${t}`}
  function currentElapsed(){return solveStartedAt?Date.now()-solveStartedAt:solveFinalMs}
  function updateClock(){elapsedStat.textContent=formatTime(currentElapsed())}
  function startSolveClock(){clearInterval(solveTicker);solveFinalMs=0;solveStartedAt=Date.now();updateClock();solveTicker=setInterval(updateClock,100)}
  function stopSolveClock(){if(solveStartedAt)solveFinalMs=Date.now()-solveStartedAt;solveStartedAt=0;clearInterval(solveTicker);solveTicker=null;updateClock();return solveFinalMs}

  function resetView(){rotX=MODE.defaultRotX;rotY=MODE.defaultRotY;draw()}
  function newPuzzle(){
    stopSelectionTimer();stopSolveClock();selected=[];foundTargets=new Set();foundPathByWord=new Map();solvedNodes=new Set();score=0;flashUntil=new Map();winEl.classList.remove('show');
    generatePuzzle();renderTargets();updateSelectionUI();updateStats();resetView();startSolveClock();toast(`New ${MODE.name} prototype · v${APP_VERSION}`);
  }
  function showWin(elapsed){winText.textContent=`All ${targets.length} target words found in ${formatTime(elapsed)}. The trails stay attached to the 3D surface while you rotate it.`;winEl.classList.add('show')}

  function applyTheme(value){
    currentTheme=value==='dark'?'dark':'light';document.documentElement.dataset.theme=currentTheme;themeBtn.textContent=currentTheme==='light'?'Dark mode':'Light mode';
    if(themeColorMeta)themeColorMeta.setAttribute('content',currentTheme==='light'?'#f3f7f4':'#091311');
    try{localStorage.setItem('anitasPrototypeTheme',currentTheme)}catch(_){}
    draw();
  }
  function initTheme(){let saved='light';try{saved=localStorage.getItem('anitasPrototypeTheme')||'light'}catch(_){}applyTheme(saved)}

  canvas.addEventListener('pointerdown',e=>{
    const id=hitTile(e.clientX,e.clientY);
    if(id!==null){selectTile(id);return}
    rotating=true;dragPointerId=e.pointerId;lastPointerX=e.clientX;lastPointerY=e.clientY;stage.classList.add('rotating');canvas.setPointerCapture(e.pointerId);if(selected.length)pauseSelectionTimer();
  });
  canvas.addEventListener('pointermove',e=>{
    if(!rotating||e.pointerId!==dragPointerId)return;
    const dx=e.clientX-lastPointerX,dy=e.clientY-lastPointerY;rotY+=dx*.42;rotX=clamp(rotX+dy*.34,-78,78);lastPointerX=e.clientX;lastPointerY=e.clientY;draw();
  });
  function endRotation(e){
    if(!rotating)return;rotating=false;dragPointerId=null;stage.classList.remove('rotating');if(e&&canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);resumeSelectionTimer();draw();
  }
  canvas.addEventListener('pointerup',endRotation);canvas.addEventListener('pointercancel',endRotation);
  clearBtn.addEventListener('click',()=>{selected=[];stopSelectionTimer();updateSelectionUI();draw()});
  checkBtn.addEventListener('click',evaluateSelection);newBtn.addEventListener('click',newPuzzle);nextBtn.addEventListener('click',newPuzzle);
  resetViewBtn.addEventListener('click',resetView);themeBtn.addEventListener('click',()=>applyTheme(currentTheme==='light'?'dark':'light'));

  function resizeCanvas(){
    const rect=stage.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2);canvasWidth=Math.max(1,rect.width);canvasHeight=Math.max(1,rect.height);
    canvas.width=Math.round(canvasWidth*dpr);canvas.height=Math.round(canvasHeight*dpr);canvas.style.width=`${canvasWidth}px`;canvas.style.height=`${canvasHeight}px`;ctx.setTransform(dpr,0,0,dpr,0,0);draw();
  }
  window.addEventListener('resize',resizeCanvas);

  buildGeometry();initTheme();newPuzzle();resizeCanvas();
})();