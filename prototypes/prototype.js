(() => {
  'use strict';

  const APP_VERSION='0.4.6';
  const SELECTION_MS=8000;
  const MAX_SELECTION=14;
  const CAMERA_Z=7.2;
  const LETTER_POOL='EEEEEEEEEEEEAAAAAAAAAIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ';
  const mode=document.body.dataset.mode;
  const MODE={
    pyramid:{
      name:'Word Pyramid',badge:'4 faces · 64 triangular tiles',words:['PEAK','ROCK','CLIMB','RIDGE','STONE','TRAIL'],
      defaultRotX:-20,defaultRotY:-30,route:'Edges'
    },
    orb:{
      name:'Word Orb',badge:'42 geodesic tiles · 12 pentagons + 30 hexagons',words:['ORBIT','ROUND','GLOBE','SPHERE','WORLD','CURVE'],
      defaultRotX:-18,defaultRotY:-30,route:'Geodesic'
    },
    mug:{
      name:'Word Mug',badge:'6 × 6 · 36 curved front tiles',words:['COFFEE','MUG','STEAM','BEANS','LATTE','WARM'],
      defaultRotX:-12,defaultRotY:-24,route:'Front'
    }
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
    norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]},
    lerp:(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]
  };
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const randInt=n=>Math.floor(Math.random()*n);
  const shuffle=list=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=randInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
  const qkey=p=>`${p[0].toFixed(5)},${p[1].toFixed(5)},${p[2].toFixed(5)}`;
  const edgeKey=(a,b)=>{const A=qkey(a),B=qkey(b);return A<B?`${A}|${B}`:`${B}|${A}`};

  const nodes=[],nodeById=new Map(),adjacency=new Map();
  let bodyFaces=[];
  let orbWireEdges=[];
  let board=[],targets=[],targetPaths=new Map(),foundTargets=new Set(),foundPathByWord=new Map(),solvedNodes=new Set(),selected=[];
  let renderedTiles=[];
  let rotX=MODE.defaultRotX,rotY=MODE.defaultRotY;
  let canvasWidth=1,canvasHeight=1,dpr=1;
  let rotating=false,dragPointerId=null,lastPointerX=0,lastPointerY=0;
  let timerId=null,timerStartedAt=0,timerRemaining=SELECTION_MS,timerPausedForRotation=false;
  let solveStartedAt=0,solveFinalMs=0,solveTicker=null;
  let score=0,flashUntil=new Map(),toastTimer=null,currentTheme='light',evaluating=false;

  const CANVAS_THEME={
    light:{
      body:'#555d5a',body2:'#68706d',bodyEdge:'rgba(33,111,90,.34)',core:'#414744',
      tile:'#fbfdfa',tileText:'#173028',tileStroke:'rgba(23,48,40,.24)',
      selected:'#55d7b9',selectedStroke:'#147e67',solved:'#b9e58f',solvedStroke:'#5d9634',
      invalid:'#ef9f96',pathUnder:'rgba(255,255,255,.96)',wire:'rgba(39,91,74,.13)',rim:'#d8e3de',inner:'#27352f'
    },
    dark:{
      body:'#2d3331',body2:'#39413e',bodyEdge:'rgba(101,223,195,.24)',core:'#252a29',
      tile:'#e9eee8',tileText:'#10201a',tileStroke:'rgba(9,27,21,.24)',
      selected:'#65dfc3',selectedStroke:'#d8fff4',solved:'#aee17f',solvedStroke:'#d8ffb9',
      invalid:'#ef9f96',pathUnder:'rgba(4,14,11,.88)',wire:'rgba(101,223,195,.11)',rim:'#70817a',inner:'#101916'
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
  function center3(points){return V.mul(points.reduce((s,p)=>V.add(s,p),[0,0,0]),1/points.length)}
  function shade(hex,factor){
    const n=parseInt(hex.slice(1),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    const c=x=>Math.round(clamp(x*factor,0,255)).toString(16).padStart(2,'0');
    return `#${c(r)}${c(g)}${c(b)}`;
  }
  function tangentBasis(normal,seed=null){
    const n=V.norm(normal);
    let u=seed?V.sub(seed,V.mul(n,V.dot(seed,n))):null;
    if(!u||V.len(u)<1e-6){const ref=Math.abs(n[1])<.9?[0,1,0]:[1,0,0];u=V.cross(ref,n)}
    u=V.norm(u);const v=V.norm(V.cross(n,u));return{u,v};
  }
  function polygonExtents(center,points,u,v){
    let hu=.1,hv=.1;
    for(const p of points){const d=V.sub(p,center);hu=Math.max(hu,Math.abs(V.dot(d,u)));hv=Math.max(hv,Math.abs(V.dot(d,v)))}
    return{hu,hv};
  }
  function shrinkPolygon(points,center,amount=.91){return points.map(p=>V.lerp(center,p,amount))}

  function buildPyramid(){
    const A=[0,2.15,0],B=[-2,-1.35,2],C=[2,-1.35,2],D=[2,-1.35,-2],E=[-2,-1.35,-2];
    const sideFaces=[[A,B,C],[A,C,D],[A,D,E],[A,E,B]];
    const baseFaces=[[B,E,D],[B,D,C]];
    bodyFaces=[...sideFaces,...baseFaces].map((verts,index)=>{
      let normal=V.norm(V.cross(V.sub(verts[1],verts[0]),V.sub(verts[2],verts[0])));
      const c=center3(verts);if(V.dot(normal,c)<0)normal=V.mul(normal,-1);
      return{verts,normal,index,side:index<4};
    });

    const physicalVertexToTiles=new Map();
    const n=4;
    for(let fi=0;fi<sideFaces.length;fi++){
      const [a,b,c]=sideFaces[fi];
      let normal=V.norm(V.cross(V.sub(b,a),V.sub(c,a)));
      const fc=center3([a,b,c]);if(V.dot(normal,fc)<0)normal=V.mul(normal,-1);
      const basis=tangentBasis(normal,V.sub(c,b));
      const baseGrid=[],renderGrid=[];
      for(let i=0;i<=n;i++){
        baseGrid[i]=[];renderGrid[i]=[];
        for(let j=0;j<=n-i;j++){
          const u=i/n,v=j/n,w=1-u-v;
          const bp=V.add(V.add(V.mul(a,w),V.mul(b,u)),V.mul(c,v));
          baseGrid[i][j]=bp;
          renderGrid[i][j]=V.add(bp,V.mul(normal,.035));
        }
      }
      const tris=[];
      for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){
        tris.push({base:[baseGrid[i][j],baseGrid[i+1][j],baseGrid[i][j+1]],render:[renderGrid[i][j],renderGrid[i+1][j],renderGrid[i][j+1]]});
        if(j<n-i-1)tris.push({base:[baseGrid[i+1][j],baseGrid[i+1][j+1],baseGrid[i][j+1]],render:[renderGrid[i+1][j],renderGrid[i+1][j+1],renderGrid[i][j+1]]});
      }
      for(const tri of tris){
        const center=center3(tri.render),poly=shrinkPolygon(tri.render,center,.91);
        const ex=polygonExtents(center,poly,basis.u,basis.v);
        const id=addNode({pos:center,normal,u:basis.u,v:basis.v,hu:ex.hu,hv:ex.hv,polygon:poly,physical:tri.base,region:fi,surface:'pyramid'});
        for(const p of tri.base){const k=qkey(p);if(!physicalVertexToTiles.has(k))physicalVertexToTiles.set(k,[]);physicalVertexToTiles.get(k).push(id)}
      }
    }

    // Cube-style touching rule: edge neighbours plus corner-touching diagonals.
    for(const ids of physicalVertexToTiles.values())for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)addLink(ids[i],ids[j]);
  }

  function icosahedronDetailOne(){
    const t=(1+Math.sqrt(5))/2;
    const verts=[
      [-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]
    ].map(V.norm);
    let faces=[
      [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
      [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
      [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
      [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
    ];
    const cache=new Map();
    function midpoint(a,b){
      const key=a<b?`${a}:${b}`:`${b}:${a}`;
      if(cache.has(key))return cache.get(key);
      const p=V.norm(V.add(verts[a],verts[b]));const id=verts.length;verts.push(p);cache.set(key,id);return id;
    }
    const next=[];
    for(const [a,b,c] of faces){const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);next.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca])}
    faces=next;
    return{verts,faces};
  }
  function sortAround(normal,points){
    const {u,v}=tangentBasis(normal);
    return [...points].sort((a,b)=>{
      const da=V.sub(a,V.mul(normal,V.dot(a,normal))),db=V.sub(b,V.mul(normal,V.dot(b,normal)));
      return Math.atan2(V.dot(da,v),V.dot(da,u))-Math.atan2(V.dot(db,v),V.dot(db,u));
    });
  }
  function buildOrb(){
    const R=2.02,{verts,faces}=icosahedronDetailOne();
    const incident=Array.from({length:verts.length},()=>[]),edgeSet=new Set();
    faces.forEach(face=>{
      const fc=V.norm(V.add(V.add(verts[face[0]],verts[face[1]]),verts[face[2]]));
      face.forEach(id=>incident[id].push(fc));
      [[face[0],face[1]],[face[1],face[2]],[face[2],face[0]]].forEach(([a,b])=>edgeSet.add(a<b?`${a}:${b}`:`${b}:${a}`));
    });
    orbWireEdges=[...edgeSet].map(k=>k.split(':').map(Number));
    for(let i=0;i<verts.length;i++){
      const normal=V.norm(verts[i]);
      const raw=sortAround(normal,incident[i]).map(p=>V.mul(V.norm(p),R+.055));
      const center=V.mul(normal,R+.055),poly=shrinkPolygon(raw,center,.91);
      const basis=tangentBasis(normal,poly[0]?V.sub(poly[0],center):null),ex=polygonExtents(center,poly,basis.u,basis.v);
      addNode({pos:center,normal,u:basis.u,v:basis.v,hu:ex.hu,hv:ex.hv,polygon:poly,physical:raw,region:0,surface:'orb',sides:poly.length});
    }
    for(const [a,b] of orbWireEdges)addLink(a,b);
  }

  function cylindricalPoint(theta,y,r){return[Math.sin(theta)*r,y,Math.cos(theta)*r]}
  function buildMug(){
    const rows=6,cols=6,R=1.607;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const t0=-.70+c*(1.40/cols),t1=-.70+(c+1)*(1.40/cols);
      const yTop=1.06-r*(2.12/rows),yBottom=1.06-(r+1)*(2.12/rows),tm=(t0+t1)/2;
      const normal=[Math.sin(tm),0,Math.cos(tm)],center=cylindricalPoint(tm,(yTop+yBottom)/2,R);
      const raw=[cylindricalPoint(t0,yTop,R),cylindricalPoint(t1,yTop,R),cylindricalPoint(t1,yBottom,R),cylindricalPoint(t0,yBottom,R)];
      const poly=shrinkPolygon(raw,center,.91),basis=tangentBasis(normal,[Math.cos(tm),0,-Math.sin(tm)]),ex=polygonExtents(center,poly,basis.u,basis.v);
      addNode({pos:center,normal,u:basis.u,v:basis.v,hu:ex.hu,hv:ex.hv,polygon:poly,physical:raw,row:r,col:c,region:0,theta:tm,y:center[1],surface:'mug'});
    }
    // Same 8-neighbour rule as one Cube face, including diagonals.
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const id=r*cols+c;
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
        if(!dr&&!dc)continue;const rr=r+dr,cc=c+dc;
        if(rr>=0&&rr<rows&&cc>=0&&cc<cols)addLink(id,rr*cols+cc);
      }
    }
  }

  function buildGeometry(){
    nodes.length=0;nodeById.clear();adjacency.clear();bodyFaces=[];orbWireEdges=[];
    if(mode==='pyramid')buildPyramid();else if(mode==='orb')buildOrb();else buildMug();
    tileStat.textContent=nodes.length;routeStat.textContent=MODE.route;
  }

  function drawPyramidBody(){
    const t=theme();
    const visible=bodyFaces.filter(f=>facing(f.normal)>.012).map(f=>({...f,q:f.verts.map(project)})).sort((a,b)=>averageDepth(a.q)-averageDepth(b.q));
    for(const f of visible){
      beginPoly(f.q);const light=clamp(.80+facing(f.normal)*.18,.75,1.06);
      ctx.fillStyle=shade(f.side?t.body:t.core,light);ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=t.bodyEdge;ctx.stroke();
    }
  }
  function drawOrbBody(){
    const t=theme(),R=2.02,center=project([0,0,0]),f=Math.min(canvasWidth,canvasHeight)*.92,radius=f*R/CAMERA_Z;
    const grad=ctx.createRadialGradient(center.x-radius*.32,center.y-radius*.36,radius*.10,center.x,center.y,radius);
    if(currentTheme==='light'){grad.addColorStop(0,'#7a827f');grad.addColorStop(.52,'#555d5a');grad.addColorStop(1,'#343a38')}
    else{grad.addColorStop(0,'#4d5753');grad.addColorStop(.52,'#2d3331');grad.addColorStop(1,'#1b201e')}
    ctx.beginPath();ctx.arc(center.x,center.y,radius,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=t.bodyEdge;ctx.stroke();
    ctx.save();ctx.strokeStyle=t.wire;ctx.lineWidth=1;
    for(const [a,b] of orbWireEdges){
      const A=nodes[a],B=nodes[b];if(!A||!B||facing(A.normal)<=.02||facing(B.normal)<=.02)continue;
      const p1=project(V.mul(A.normal,R+.012)),p2=project(V.mul(B.normal,R+.012));ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();
    }
    ctx.restore();
  }
  function mugRingPoints(y,R,count=88){const pts=[];for(let i=0;i<=count;i++){const th=i/count*Math.PI*2;pts.push(cylindricalPoint(th,y,R))}return pts}
  function drawMugHandle(){
    const t=theme(),outer=[];
    for(let i=0;i<=72;i++){const a=-Math.PI*.72+i/72*Math.PI*1.44;outer.push([1.53+Math.cos(a)*.82,Math.sin(a)*.97,0])}
    const q=outer.map(project);ctx.beginPath();q.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.lineCap='round';
    ctx.strokeStyle=currentTheme==='light'?'#33423c':'#222b27';ctx.lineWidth=24;ctx.stroke();ctx.strokeStyle=currentTheme==='light'?'#63736c':'#46534e';ctx.lineWidth=15;ctx.stroke();
    ctx.strokeStyle=t.bodyEdge;ctx.lineWidth=2;ctx.stroke();
  }
  function drawMugBody(){
    const t=theme(),top=1.575,bottom=-1.575,segments=[];
    for(let i=0;i<72;i++){
      const a=-Math.PI+i/72*Math.PI*2,b=-Math.PI+(i+1)/72*Math.PI*2,mid=(a+b)/2,normal=[Math.sin(mid),0,Math.cos(mid)];
      if(facing(normal)<=.003)continue;
      const rt=1.60,rb=1.48,verts=[cylindricalPoint(a,top,rt),cylindricalPoint(b,top,rt),cylindricalPoint(b,bottom,rb),cylindricalPoint(a,bottom,rb)];
      const q=verts.map(project);segments.push({q,normal,depth:averageDepth(q)});
    }
    segments.sort((a,b)=>a.depth-b.depth);
    for(const s of segments){beginPoly(s.q);ctx.fillStyle=shade(t.body2,clamp(.76+facing(s.normal)*.26,.72,1.06));ctx.fill()}
    const topOuter=mugRingPoints(top,1.60).map(project),topInner=mugRingPoints(top-.03,1.43).map(project);
    ctx.beginPath();topOuter.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=t.rim;ctx.lineWidth=8;ctx.stroke();
    ctx.beginPath();topInner.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=t.inner;ctx.lineWidth=4;ctx.stroke();
    const innerBack=[];for(let i=0;i<=44;i++){const th=Math.PI/2+i/44*Math.PI;innerBack.push(cylindricalPoint(th,top-.08,1.36))}
    const iq=innerBack.map(project);ctx.beginPath();iq.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=currentTheme==='light'?'rgba(20,34,29,.35)':'rgba(0,0,0,.5)';ctx.lineWidth=2;ctx.stroke();
  }
  function drawBody(){if(mode==='pyramid')drawPyramidBody();else if(mode==='orb')drawOrbBody();else{drawMugHandle();drawMugBody()}}

  function buildRenderedTiles(){
    renderedTiles=[];
    for(const node of nodes){
      const face=facing(node.normal);if(face<=.05)continue;
      const poly=node.polygon.map(project);renderedTiles.push({id:node.id,poly,depth:averageDepth(poly),facing:face});
    }
    renderedTiles.sort((a,b)=>a.depth-b.depth);
  }
  function tileFill(id){
    const t=theme();if(selected.includes(id))return t.selected;if(solvedNodes.has(id))return t.solved;if((flashUntil.get(id)||0)>performance.now())return t.invalid;return t.tile;
  }
  function drawTiles(){
    const t=theme();for(const tile of renderedTiles){beginPoly(tile.poly);ctx.fillStyle=tileFill(tile.id);ctx.fill();
      ctx.lineWidth=selected.includes(tile.id)?3.5:solvedNodes.has(tile.id)?2.2:1.3;
      ctx.strokeStyle=selected.includes(tile.id)?t.selectedStroke:solvedNodes.has(tile.id)?t.solvedStroke:t.tileStroke;ctx.stroke();}
  }

  function slerp(a,b,t){
    const na=V.norm(a),nb=V.norm(b),dot=clamp(V.dot(na,nb),-1,1),omega=Math.acos(dot);
    if(omega<1e-5)return V.norm(V.lerp(na,nb,t));const s=Math.sin(omega);return V.add(V.mul(na,Math.sin((1-t)*omega)/s),V.mul(nb,Math.sin(t*omega)/s));
  }
  function sharedPhysicalPoints(A,B){
    const out=[];for(const a of A.physical||[])for(const b of B.physical||[])if(V.len(V.sub(a,b))<1e-4&&!out.some(p=>V.len(V.sub(p,a))<1e-4))out.push(a);return out;
  }
  function surfaceSamples(a,b){
    const A=nodeById.get(a),B=nodeById.get(b),out=[];
    if(mode==='orb'){
      const R=2.09;for(let i=0;i<=12;i++){const t=i/12,n=slerp(A.normal,B.normal,t);out.push({p:V.mul(n,R),n})}return out;
    }
    if(mode==='mug'){
      let d=B.theta-A.theta;if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;
      for(let i=0;i<=12;i++){const t=i/12,th=A.theta+d*t,y=A.y+(B.y-A.y)*t,n=[Math.sin(th),0,Math.cos(th)];out.push({p:cylindricalPoint(th,y,1.62),n})}return out;
    }
    if(V.dot(A.normal,B.normal)>.999){
      for(let i=0;i<=8;i++){const t=i/8;out.push({p:V.add(V.lerp(A.pos,B.pos,t),V.mul(A.normal,.012)),n:A.normal})}return out;
    }
    const shared=sharedPhysicalPoints(A,B);let seam=V.lerp(A.pos,B.pos,.5);
    if(shared.length>=2)seam=V.mul(V.add(shared[0],shared[1]),.5);else if(shared.length===1)seam=shared[0];
    const seamNormal=V.norm(V.add(A.normal,B.normal));
    for(let i=0;i<=6;i++){const t=i/6;out.push({p:V.add(V.lerp(A.pos,seam,t),V.mul(A.normal,.012)),n:A.normal})}
    for(let i=1;i<=6;i++){const t=i/6,n=V.norm(V.lerp(seamNormal,B.normal,t));out.push({p:V.add(V.lerp(seam,B.pos,t),V.mul(n,.012)),n})}
    return out;
  }
  function tileVisualSize(id){
    const tile=renderedTiles.find(t=>t.id===id);if(!tile)return 44;let min=Infinity;
    for(let i=0;i<tile.poly.length;i++)min=Math.min(min,Math.hypot(tile.poly[i].x-tile.poly[(i+1)%tile.poly.length].x,tile.poly[i].y-tile.poly[(i+1)%tile.poly.length].y));
    return Number.isFinite(min)?min:44;
  }
  function drawPath(path,color,baseWidth){
    const t=theme();for(let k=1;k<path.length;k++){
      const samples=surfaceSamples(path[k-1],path[k]);let segment=[];
      const width=Math.min(baseWidth,Math.max(3,Math.min(tileVisualSize(path[k-1]),tileVisualSize(path[k]))*.34));
      const flush=()=>{if(segment.length<2){segment=[];return}
        const stroke=(col,w,glow=false)=>{ctx.beginPath();segment.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=col;ctx.lineWidth=w;if(glow){ctx.shadowColor=color;ctx.shadowBlur=Math.min(8,w*.6)}ctx.stroke();ctx.shadowBlur=0};
        stroke(t.pathUnder,width+Math.max(4,width*.58));stroke(color,width,true);segment=[];};
      for(const s of samples){if(facing(s.n)>.02)segment.push(project(s.p));else flush()}flush();
    }
  }
  function drawTrails(){foundPathByWord.forEach(path=>drawPath(path,'#9bd866',15));if(selected.length>1)drawPath(selected,'#65dfc3',17)}

  function drawLabels(){
    const t=theme();for(const tile of renderedTiles){
      if(tile.facing<.075)continue;const node=nodeById.get(tile.id),center=project(node.pos);
      const left=project(V.add(node.pos,V.mul(node.u,-node.hu))),right=project(V.add(node.pos,V.mul(node.u,node.hu)));
      const top=project(V.add(node.pos,V.mul(node.v,-node.hv))),bottom=project(V.add(node.pos,V.mul(node.v,node.hv)));
      const ux=right.x-left.x,uy=right.y-left.y,vx=bottom.x-top.x,vy=bottom.y-top.y;
      if(Math.min(Math.hypot(ux,uy),Math.hypot(vx,vy))<9)continue;
      ctx.save();beginPoly(tile.poly);ctx.clip();ctx.setTransform(dpr*ux,dpr*uy,dpr*vx,dpr*vy,dpr*center.x,dpr*center.y);
      const fontScale=mode==='pyramid'?.52:mode==='orb'?.50:.55;ctx.font=`800 ${fontScale}px Georgia, "Times New Roman", serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=t.tileText;ctx.fillText(board[tile.id]||'',0,.025);ctx.restore();ctx.setTransform(dpr,0,0,dpr,0,0);
    }
  }
  function draw(){ctx.clearRect(0,0,canvasWidth,canvasHeight);drawBody();buildRenderedTiles();drawTiles();drawTrails();drawLabels()}

  function pointInPoly(x,y,pts){let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const xi=pts[i].x,yi=pts[i].y,xj=pts[j].x,yj=pts[j].y;if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi+1e-9)+xi))inside=!inside;}return inside;}
  function hitTile(clientX,clientY){
    const rect=canvas.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top;
    const hits=renderedTiles.filter(t=>pointInPoly(x,y,t.poly)).sort((a,b)=>b.depth-a.depth);return hits[0]?.id??null;
  }

  function findRoute(length,used,minRegions=1){
    const candidates=shuffle(nodes.map(n=>n.id).filter(id=>!used.has(id)));
    for(const start of candidates.slice(0,40)){
      const path=[start],seen=new Set([start]);
      const dfs=()=>{
        if(path.length===length){const regions=new Set(path.map(id=>nodeById.get(id).region));return regions.size>=minRegions}
        const next=shuffle([...adjacency.get(path[path.length-1])].filter(id=>!seen.has(id)&&!used.has(id)));
        for(const id of next){seen.add(id);path.push(id);if(dfs())return true;path.pop();seen.delete(id)}return false;
      };
      if(dfs())return path;
    }
    return null;
  }
  function generatePuzzle(){
    for(let attempt=0;attempt<120;attempt++){
      const used=new Set(),paths=new Map();let ok=true;
      for(let i=0;i<MODE.words.length;i++){
        const word=MODE.words[i],path=findRoute(word.length,used,mode==='pyramid'&&i<2?2:1);
        if(!path){ok=false;break}path.forEach(id=>used.add(id));paths.set(word,path);
      }
      if(!ok)continue;
      board=Array(nodes.length).fill('').map(()=>LETTER_POOL[randInt(LETTER_POOL.length)]);
      paths.forEach((path,word)=>path.forEach((id,i)=>board[id]=word[i]));targets=[...MODE.words];targetPaths=paths;return;
    }
    throw new Error('Could not build prototype routes.');
  }

  function renderTargets(){
    targetList.innerHTML='';for(const word of targets){const chip=document.createElement('div');chip.className='target-chip'+(foundTargets.has(word)?' found':'');
      chip.innerHTML=`<strong>${word}</strong><span>${foundTargets.has(word)?'Found ✓':`${word.length} letters`}</span>`;targetList.appendChild(chip);}
  }
  function selectedWord(){return selected.map(id=>board[id]).join('')}
  function updateSelectionUI(){
    const word=selectedWord();currentWordEl.textContent=word||'Tap a tile to start';
    if(selected.length&&rotating&&timerPausedForRotation)selectionMetaEl.textContent=`Timer paused while rotating · ${(timerRemaining/1000).toFixed(1)}s remaining`;
    else selectionMetaEl.textContent=selected.length?`${selected.length} tile${selected.length===1?'':'s'} · Cube-style touching path · 8s timer`:'8 seconds after every tile · or press Check word';
    clearBtn.disabled=!selected.length;checkBtn.disabled=selected.length<3;
  }
  function updateStats(){foundStat.textContent=`${foundTargets.size}/${targets.length}`;scoreStat.textContent=score}
  function toast(text){toastEl.textContent=text;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),1500)}
  function flashTile(id){flashUntil.set(id,performance.now()+420);draw();setTimeout(draw,450)}

  function evaluateSelection(){
    if(!selected.length||evaluating)return;evaluating=true;stopSelectionTimer();
    const word=selectedWord(),path=[...selected];
    if(targets.includes(word)){
      if(foundTargets.has(word))toast(`${word} already found`);
      else{foundTargets.add(word);foundPathByWord.set(word,path);path.forEach(id=>solvedNodes.add(id));score+=word.length*120;toast(`${word} found`)}
    }else{const last=selected[selected.length-1];if(last!==undefined)flashTile(last);toast('Not a target word')}
    selected=[];renderTargets();updateSelectionUI();updateStats();draw();evaluating=false;
    if(foundTargets.size===targets.length){const elapsed=stopSolveClock();setTimeout(()=>showWin(elapsed),350)}
  }
  function selectTile(id){
    if(rotating||evaluating)return;
    const index=selected.indexOf(id);
    if(index>=0){selected=selected.slice(0,index);updateSelectionUI();selected.length?startSelectionTimer(SELECTION_MS):stopSelectionTimer();draw();return}
    const last=selected[selected.length-1];
    if(last!==undefined&&!adjacency.get(last).has(id)){flashTile(id);toast('Choose a touching tile');return}
    if(selected.length>=MAX_SELECTION){toast(`Maximum path length is ${MAX_SELECTION}`);return}
    selected.push(id);updateSelectionUI();draw();
    const candidate=selectedWord();
    if(targets.includes(candidate)&&!foundTargets.has(candidate)){stopSelectionTimer();setTimeout(()=>{if(!evaluating&&selectedWord()===candidate)evaluateSelection()},120)}
    else startSelectionTimer(SELECTION_MS);
  }

  function setTimerBar(percent){timerBar.style.width=`${clamp(percent,0,100)}%`}
  function timerTick(){if(!timerStartedAt)return;const remaining=Math.max(0,timerRemaining-(performance.now()-timerStartedAt));setTimerBar(remaining/SELECTION_MS*100);if(remaining<=0){stopSelectionTimer(false);evaluateSelection()}}
  function startSelectionTimer(ms){clearInterval(timerId);timerRemaining=ms;timerStartedAt=performance.now();timerPausedForRotation=false;setTimerBar(ms/SELECTION_MS*100);timerId=setInterval(timerTick,50)}
  function pauseSelectionTimer(){if(!timerStartedAt)return;timerRemaining=Math.max(0,timerRemaining-(performance.now()-timerStartedAt));timerStartedAt=0;clearInterval(timerId);timerId=null;timerPausedForRotation=true;setTimerBar(timerRemaining/SELECTION_MS*100);updateSelectionUI()}
  function resumeSelectionTimer(){if(!selected.length||!timerPausedForRotation)return;timerStartedAt=performance.now();timerPausedForRotation=false;clearInterval(timerId);timerId=setInterval(timerTick,50);updateSelectionUI()}
  function stopSelectionTimer(reset=true){clearInterval(timerId);timerId=null;timerStartedAt=0;timerPausedForRotation=false;timerRemaining=SELECTION_MS;if(reset)setTimerBar(0)}

  function formatTime(ms){const m=Math.floor(ms/60000),s=Math.floor(ms%60000/1000),t=Math.floor(ms%1000/100);return`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${t}`}
  function currentElapsed(){return solveStartedAt?Date.now()-solveStartedAt:solveFinalMs}
  function updateClock(){elapsedStat.textContent=formatTime(currentElapsed())}
  function startSolveClock(){clearInterval(solveTicker);solveFinalMs=0;solveStartedAt=Date.now();updateClock();solveTicker=setInterval(updateClock,100)}
  function stopSolveClock(){if(solveStartedAt)solveFinalMs=Date.now()-solveStartedAt;solveStartedAt=0;clearInterval(solveTicker);solveTicker=null;updateClock();return solveFinalMs}

  function resetView(){rotX=MODE.defaultRotX;rotY=MODE.defaultRotY;draw()}
  function newPuzzle(){
    stopSelectionTimer();stopSolveClock();selected=[];foundTargets=new Set();foundPathByWord=new Map();solvedNodes=new Set();score=0;flashUntil=new Map();evaluating=false;winEl.classList.remove('show');
    generatePuzzle();renderTargets();updateSelectionUI();updateStats();resetView();startSolveClock();toast(`New ${MODE.name} prototype · v${APP_VERSION}`);
  }
  function showWin(elapsed){winText.textContent=`All ${targets.length} target words found in ${formatTime(elapsed)}. The Cube-style trails stay attached to the actual ${mode} surface while you rotate it.`;winEl.classList.add('show')}

  function applyTheme(value){
    currentTheme=value==='dark'?'dark':'light';document.documentElement.dataset.theme=currentTheme;themeBtn.textContent=currentTheme==='light'?'Dark mode':'Light mode';
    if(themeColorMeta)themeColorMeta.setAttribute('content',currentTheme==='light'?'#f3f7f4':'#091311');try{localStorage.setItem('anitasPrototypeTheme',currentTheme)}catch(_){}draw();
  }
  function initTheme(){let saved='light';try{saved=localStorage.getItem('anitasPrototypeTheme')||'light'}catch(_){}applyTheme(saved)}

  canvas.addEventListener('pointerdown',e=>{
    const id=hitTile(e.clientX,e.clientY);if(id!==null){selectTile(id);return}
    rotating=true;dragPointerId=e.pointerId;lastPointerX=e.clientX;lastPointerY=e.clientY;stage.classList.add('rotating');canvas.setPointerCapture(e.pointerId);if(selected.length)pauseSelectionTimer();
  });
  canvas.addEventListener('pointermove',e=>{
    if(!rotating||e.pointerId!==dragPointerId)return;const dx=e.clientX-lastPointerX,dy=e.clientY-lastPointerY;rotY+=dx*.42;rotX=clamp(rotX+dy*.34,-78,78);lastPointerX=e.clientX;lastPointerY=e.clientY;draw();
  });
  function endRotation(e){if(!rotating)return;rotating=false;dragPointerId=null;stage.classList.remove('rotating');if(e&&canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);resumeSelectionTimer();draw()}
  canvas.addEventListener('pointerup',endRotation);canvas.addEventListener('pointercancel',endRotation);
  clearBtn.addEventListener('click',()=>{evaluating=false;selected=[];stopSelectionTimer();updateSelectionUI();draw()});
  checkBtn.addEventListener('click',evaluateSelection);newBtn.addEventListener('click',newPuzzle);nextBtn.addEventListener('click',newPuzzle);
  resetViewBtn.addEventListener('click',resetView);themeBtn.addEventListener('click',()=>applyTheme(currentTheme==='light'?'dark':'light'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){selected=[];stopSelectionTimer();updateSelectionUI();draw()}if(e.key==='Enter'&&selected.length>=3)evaluateSelection()});

  function resizeCanvas(){
    const rect=stage.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2);canvasWidth=Math.max(1,rect.width);canvasHeight=Math.max(1,rect.height);
    canvas.width=Math.round(canvasWidth*dpr);canvas.height=Math.round(canvasHeight*dpr);canvas.style.width=`${canvasWidth}px`;canvas.style.height=`${canvasHeight}px`;ctx.setTransform(dpr,0,0,dpr,0,0);draw();
  }
  if('ResizeObserver'in window)new ResizeObserver(resizeCanvas).observe(stage);else window.addEventListener('resize',resizeCanvas);

  buildGeometry();initTheme();newPuzzle();resizeCanvas();
})();
