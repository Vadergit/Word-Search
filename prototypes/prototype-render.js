(()=>{
'use strict';const s=window.WordShapeProto,V=s.V,c=s.ctx;
function drawPyramid(){const p=s.P(),vis=s.bodyFaces.filter(f=>s.facing(f.n)>.012).map(f=>({...f,q:f.verts.map(s.proj)})).sort((a,b)=>s.depth(a.q)-s.depth(b.q));for(const f of vis){s.poly(f.q);c.fillStyle=s.shade(f.side?p.body:p.core,s.clamp(.80+s.facing(f.n)*.18,.75,1.06));c.fill();c.lineWidth=2;c.strokeStyle=p.edge;c.stroke()}}
function drawOrb(){const p=s.P(),R=2.02,o=s.proj([0,0,0]),rad=Math.min(s.w,s.h)*.92*R/s.CAM,g=c.createRadialGradient(o.x-rad*.32,o.y-rad*.36,rad*.1,o.x,o.y,rad);(s.dark?[['#4d5753',0],['#2d3331',.52],['#1b201e',1]]:[['#7a827f',0],['#555d5a',.52],['#343a38',1]]).forEach(([x,k])=>g.addColorStop(k,x));c.beginPath();c.arc(o.x,o.y,rad,0,Math.PI*2);c.fillStyle=g;c.fill();c.strokeStyle=p.edge;c.lineWidth=2;c.stroke();c.strokeStyle=p.wire;c.lineWidth=1;for(const[a,b]of s.orbEdges){const A=s.nodes[a],B=s.nodes[b];if(s.facing(A.n)<=.02||s.facing(B.n)<=.02)continue;const x=s.proj(V.mul(A.n,R+.012)),y=s.proj(V.mul(B.n,R+.012));c.beginPath();c.moveTo(x.x,x.y);c.lineTo(y.x,y.y);c.stroke()}}
const ring=(y,r,n=112)=>Array.from({length:n},(_,i)=>s.cyl(i/n*Math.PI*2,y,r));
function hull(points){
 const pts=[...points].sort((a,b)=>a.x===b.x?a.y-b.y:a.x-b.x);if(pts.length<3)return pts;
 const cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x),lo=[],up=[];
 for(const p of pts){while(lo.length>=2&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p)}
 for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(up.length>=2&&cross(up.at(-2),up.at(-1),p)<=0)up.pop();up.push(p)}
 lo.pop();up.pop();return lo.concat(up)
}
function strokeProjected(points,color,width){const q=points.map(s.proj);c.beginPath();q.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.strokeStyle=color;c.lineWidth=width;c.stroke();return q}
function drawHandle(){
 const p=s.P(),pts=[];
 for(let i=0;i<=112;i++){const a=-Math.PI*.73+i/112*Math.PI*1.46;pts.push([1.48+Math.cos(a)*.76,Math.sin(a)*.91,-.03])}
 const q=pts.map(s.proj);c.save();c.lineCap='round';c.lineJoin='round';
 c.beginPath();q.forEach((x,i)=>i?c.lineTo(x.x,x.y):c.moveTo(x.x,x.y));
 c.strokeStyle=s.dark?'#78958c':'#bdd9d0';c.lineWidth=31;c.stroke();
 c.strokeStyle=s.dark?'#9db8af':'#d5e9e2';c.lineWidth=20;c.stroke();
 c.strokeStyle=s.dark?'rgba(215,238,230,.28)':'rgba(64,112,97,.20)';c.lineWidth=1.4;c.stroke();c.restore();
}
function drawMug(){
 const p=s.P(),top=1.55,bottom=-1.55,topR=s.mugR(top),bottomR=s.mugR(bottom);
 const top3=ring(top,topR,128),bottom3=ring(bottom,bottomR,128),topQ=top3.map(s.proj),bottomQ=bottom3.map(s.proj),sil=hull(topQ.concat(bottomQ));
 if(sil.length){
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const z of sil){minX=Math.min(minX,z.x);maxX=Math.max(maxX,z.x);minY=Math.min(minY,z.y);maxY=Math.max(maxY,z.y)}
  s.poly(sil);
  const g=c.createLinearGradient(minX,minY,maxX,minY);
  if(s.dark){g.addColorStop(0,'#8ca79f');g.addColorStop(.18,'#a5beb6');g.addColorStop(.52,'#bfd2cc');g.addColorStop(.82,'#a6c0b8');g.addColorStop(1,'#829e96')}
  else{g.addColorStop(0,'#b5d3ca');g.addColorStop(.18,'#cce3dc');g.addColorStop(.52,'#e2efe9');g.addColorStop(.82,'#cbe2da');g.addColorStop(1,'#abcabf')}
  c.fillStyle=g;c.fill();
  c.strokeStyle=s.dark?'rgba(207,235,226,.22)':'rgba(48,92,78,.18)';c.lineWidth=1.3;c.stroke();
 }
 const hi0=s.proj([-.58,.55,topR-.05]),hi1=s.proj([-.36,-1.10,bottomR-.05]);
 c.save();c.beginPath();c.moveTo(hi0.x,hi0.y);c.lineTo(hi1.x,hi1.y);c.strokeStyle=s.dark?'rgba(255,255,255,.055)':'rgba(255,255,255,.24)';c.lineWidth=Math.max(14,Math.abs(hi1.x-hi0.x)*.18);c.lineCap='round';c.stroke();c.restore();
 const topFacing=s.facing([0,1,0]);
 if(topFacing>-.06){
  const outer=ring(top,topR,144),inner=ring(1.49,1.37,144),coffee=ring(1.405,1.285,144);
  const iq=inner.map(s.proj);s.poly(iq);c.fillStyle=s.dark?'#708f86':'#aacbc0';c.fill();
  const cq=coffee.map(s.proj);s.poly(cq);
  const cc=s.proj([0,1.405,0]),e=s.proj([1.285,1.405,0]),rr=Math.max(18,Math.abs(e.x-cc.x));
  const cg=c.createRadialGradient(cc.x-rr*.30,cc.y-rr*.24,rr*.05,cc.x,cc.y,rr*1.12);
  cg.addColorStop(0,s.dark?'#8b6249':'#92684c');cg.addColorStop(.45,s.dark?'#5a3927':'#613c28');cg.addColorStop(1,s.dark?'#302016':'#392318');c.fillStyle=cg;c.fill();
  c.save();c.beginPath();const sh=s.proj([-.35,1.414,.62]);c.ellipse(sh.x,sh.y,Math.max(5,rr*.18),Math.max(2,rr*.045),-.15,0,Math.PI*2);c.fillStyle='rgba(255,255,255,.12)';c.fill();c.restore();
  strokeProjected(outer,s.dark?'#d4e7e0':'#e8f4ef',10);
  strokeProjected(inner,s.dark?'#78988e':'#94b9ae',3.5);
  strokeProjected(outer,p.edge,1.1);
 } else {
  strokeProjected(top3,s.dark?'#c2d8d1':'#dcebe6',7);
 }
 strokeProjected(ring(bottom+.02,bottomR*.94,120),s.dark?'rgba(196,224,215,.18)':'rgba(42,83,70,.16)',1.5);
}
function body(){s.mode==='pyramid'?drawPyramid():s.mode==='orb'?drawOrb():(drawHandle(),drawMug())}
function makeRendered(){s.rendered=[];for(const n of s.nodes){const f=s.facing(n.n);if(f<=.05)continue;const pp=n.polygon.map(s.proj);s.rendered.push({id:n.id,pp,d:s.depth(pp),f})}s.rendered.sort((a,b)=>a.d-b.d)}
function tileFill(id){const p=s.P();return s.selected.includes(id)?p.sel:s.solved.has(id)?p.sol:(s.flash.get(id)||0)>performance.now()?p.bad:p.tile}
function drawTiles(){const p=s.P();for(const t of s.rendered){s.poly(t.pp);c.fillStyle=tileFill(t.id);c.fill();c.lineWidth=s.selected.includes(t.id)?3.5:s.solved.has(t.id)?2.2:1.3;c.strokeStyle=s.selected.includes(t.id)?p.selStroke:s.solved.has(t.id)?p.solStroke:p.stroke;c.stroke()}}
function slerp(a,b,t){a=V.norm(a);b=V.norm(b);const d=s.clamp(V.dot(a,b),-1,1),o=Math.acos(d);if(o<1e-5)return V.norm(V.lerp(a,b,t));const z=Math.sin(o);return V.add(V.mul(a,Math.sin((1-t)*o)/z),V.mul(b,Math.sin(t*o)/z))}
function shared(A,B){const out=[];for(const a of A.physical||[])for(const b of B.physical||[])if(V.len(V.sub(a,b))<1e-4&&!out.some(x=>V.len(V.sub(x,a))<1e-4))out.push(a);return out}
function samples(a,b){const A=s.byId.get(a),B=s.byId.get(b),out=[];if(s.mode==='orb'){for(let i=0;i<=12;i++){const t=i/12,n=slerp(A.n,B.n,t);out.push({p:V.mul(n,2.09),n})}return out}if(s.mode==='mug'){let d=B.th-A.th;if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;for(let i=0;i<=12;i++){const t=i/12,th=A.th+d*t,y=A.y+(B.y-A.y)*t,n=[Math.sin(th),0,Math.cos(th)];out.push({p:s.cyl(th,y,s.mugR(y)+.035),n})}return out}if(V.dot(A.n,B.n)>.999){for(let i=0;i<=8;i++){const t=i/8;out.push({p:V.add(V.lerp(A.pos,B.pos,t),V.mul(A.n,.012)),n:A.n})}return out}const sh=shared(A,B),seam=sh.length>=2?V.mul(V.add(sh[0],sh[1]),.5):sh[0]||V.lerp(A.pos,B.pos,.5),sn=V.norm(V.add(A.n,B.n));for(let i=0;i<=6;i++){const t=i/6;out.push({p:V.add(V.lerp(A.pos,seam,t),V.mul(A.n,.012)),n:A.n})}for(let i=1;i<=6;i++){const t=i/6,n=V.norm(V.lerp(sn,B.n,t));out.push({p:V.add(V.lerp(seam,B.pos,t),V.mul(n,.012)),n})}return out}
function tileSize(id){const t=s.rendered.find(x=>x.id===id);if(!t)return 44;let m=1e9;for(let i=0;i<t.pp.length;i++){const a=t.pp[i],b=t.pp[(i+1)%t.pp.length];m=Math.min(m,Math.hypot(a.x-b.x,a.y-b.y))}return m}
function drawPath(ids,color,base){const p=s.P();for(let k=1;k<ids.length;k++){let seg=[],wid=Math.min(base,Math.max(3,Math.min(tileSize(ids[k-1]),tileSize(ids[k]))*.34));const flush=()=>{if(seg.length<2){seg=[];return}const stroke=(col,wid2,glow=false)=>{c.beginPath();seg.forEach((x,i)=>i?c.lineTo(x.x,x.y):c.moveTo(x.x,x.y));c.lineCap='round';c.lineJoin='round';c.strokeStyle=col;c.lineWidth=wid2;if(glow){c.shadowColor=color;c.shadowBlur=Math.min(8,wid2*.6)}c.stroke();c.shadowBlur=0};stroke(p.under,wid+Math.max(4,wid*.58));stroke(color,wid,true);seg=[]};for(const z of samples(ids[k-1],ids[k])){if(s.facing(z.n)>.02)seg.push(s.proj(z.p));else flush()}flush()}}
function trails(){s.foundPaths.forEach(x=>drawPath(x,s.P().sol,15));if(s.selected.length>1)drawPath(s.selected,s.P().sel,17)}
function drawGlyph(ch,size,color){c.font=`700 ${size}px Georgia,"Times New Roman",serif`;c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle=color;const m=c.measureText(ch),L=Number.isFinite(m.actualBoundingBoxLeft)?m.actualBoundingBoxLeft:0,R=Number.isFinite(m.actualBoundingBoxRight)?m.actualBoundingBoxRight:m.width,A=Number.isFinite(m.actualBoundingBoxAscent)?m.actualBoundingBoxAscent:size*.72,D=Number.isFinite(m.actualBoundingBoxDescent)?m.actualBoundingBoxDescent:size*.18;c.fillText(ch,(L-R)/2,(A-D)/2)}
function labels(){const p=s.P();for(const t of s.rendered){if(t.f<.075)continue;const n=s.byId.get(t.id),o=s.proj(n.pos),L=s.proj(V.add(n.pos,V.mul(n.u,-n.hu))),R=s.proj(V.add(n.pos,V.mul(n.u,n.hu))),T=s.proj(V.add(n.pos,V.mul(n.v,-n.hv))),B=s.proj(V.add(n.pos,V.mul(n.v,n.hv))),ux=R.x-L.x,uy=R.y-L.y,vx=B.x-T.x,vy=B.y-T.y;if(Math.min(Math.hypot(ux,uy),Math.hypot(vx,vy))<9)continue;c.save();s.poly(t.pp);c.clip();c.setTransform(s.dpr*ux,s.dpr*uy,s.dpr*vx,s.dpr*vy,s.dpr*o.x,s.dpr*o.y);drawGlyph(s.board[t.id]||'',s.mode==='pyramid'?.38:s.mode==='orb'?.36:.42,p.text);c.restore();c.setTransform(s.dpr,0,0,s.dpr,0,0)}}
s.draw=()=>{c.clearRect(0,0,s.w,s.h);body();makeRendered();drawTiles();trails();labels()};s.hit=(cx,cy)=>{const r=s.canvas.getBoundingClientRect(),x=cx-r.left,y=cy-r.top,inside=(x,y,pp)=>{let yes=false;for(let i=0,j=pp.length-1;i<pp.length;j=i++){const a=pp[i],b=pp[j];if(((a.y>y)!=(b.y>y))&&(x<(b.x-a.x)*(y-a.y)/(b.y-a.y+1e-9)+a.x))yes=!yes}return yes},hits=s.rendered.filter(t=>inside(x,y,t.pp)).sort((a,b)=>b.d-a.d);return hits[0]?.id??null};
})();
