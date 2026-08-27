(()=>{
'use strict';const s=window.WordShapeProto,V=s.V,c=s.ctx;
function drawPyramid(){const p=s.P(),vis=s.bodyFaces.filter(f=>s.facing(f.n)>.012).map(f=>({...f,q:f.verts.map(s.proj)})).sort((a,b)=>s.depth(a.q)-s.depth(b.q));for(const f of vis){s.poly(f.q);c.fillStyle=s.shade(f.side?p.body:p.core,s.clamp(.80+s.facing(f.n)*.18,.75,1.06));c.fill();c.lineWidth=2;c.strokeStyle=p.edge;c.stroke()}}
function drawOrb(){const p=s.P(),R=2.02,o=s.proj([0,0,0]),rad=Math.min(s.w,s.h)*.92*R/s.CAM,g=c.createRadialGradient(o.x-rad*.32,o.y-rad*.36,rad*.1,o.x,o.y,rad);(s.dark?[["#4d5753",0],["#2d3331",.52],["#1b201e",1]]:[["#7a827f",0],["#555d5a",.52],["#343a38",1]]).forEach(([x,k])=>g.addColorStop(k,x));c.beginPath();c.arc(o.x,o.y,rad,0,Math.PI*2);c.fillStyle=g;c.fill();c.strokeStyle=p.edge;c.lineWidth=2;c.stroke();c.strokeStyle=p.wire;c.lineWidth=1;for(const[a,b]of s.orbEdges){const A=s.nodes[a],B=s.nodes[b];if(s.facing(A.n)<=.02||s.facing(B.n)<=.02)continue;const x=s.proj(V.mul(A.n,R+.012)),y=s.proj(V.mul(B.n,R+.012));c.beginPath();c.moveTo(x.x,x.y);c.lineTo(y.x,y.y);c.stroke()}}
const ring=(y,r,n=96)=>Array.from({length:n+1},(_,i)=>s.cyl(i/n*Math.PI*2,y,r));
function drawHandle(){
 const p=s.P(),pts=[];
 for(let i=0;i<=96;i++){const a=-Math.PI*.72+i/96*Math.PI*1.44;pts.push([1.54+Math.cos(a)*.82,Math.sin(a)*.97,0])}
 const q=pts.map(s.proj);c.save();c.lineCap='round';c.lineJoin='round';
 c.beginPath();q.forEach((x,i)=>i?c.lineTo(x.x,x.y):c.moveTo(x.x,x.y));
 c.strokeStyle=s.dark?'#90aaa2':'#b8d3ca';c.lineWidth=27;c.stroke();
 c.strokeStyle=s.dark?'#6f8981':'#97b8ae';c.lineWidth=17;c.stroke();
 c.strokeStyle=p.edge;c.lineWidth=1.2;c.stroke();c.restore();
}
function drawMug(){
 const p=s.P(),top=1.575,bottom=-1.575,segs=[];
 for(let i=0;i<120;i++){
  const a=-Math.PI+i/120*Math.PI*2,b=-Math.PI+(i+1)/120*Math.PI*2,m=(a+b)/2,n=[Math.sin(m),0,Math.cos(m)];
  if(s.facing(n)<=.008)continue;
  const q=[s.cyl(a,top,s.mugR(top)),s.cyl(b,top,s.mugR(top)),s.cyl(b,bottom,s.mugR(bottom)),s.cyl(a,bottom,s.mugR(bottom))].map(s.proj);
  segs.push({q,n,d:s.depth(q)})
 }
 segs.sort((a,b)=>a.d-b.d);
 for(const z of segs){
  s.poly(z.q);
  const f=s.clamp(.90+s.facing(z.n)*.12,.86,1.04);
  c.fillStyle=s.shade(s.dark?'#8fa9a1':'#bfd8d0',f);c.fill();
 }
 const coffee=ring(1.405,1.29,120).map(s.proj);
 s.poly(coffee);
 const cc=s.proj([0,1.405,0]),edge=s.proj([1.29,1.405,0]),rr=Math.max(10,Math.abs(edge.x-cc.x));
 const cg=c.createRadialGradient(cc.x-rr*.28,cc.y-rr*.20,rr*.06,cc.x,cc.y,rr*1.15);
 if(s.dark){cg.addColorStop(0,'#7e5940');cg.addColorStop(.48,'#5b3a28');cg.addColorStop(1,'#352117')}
 else{cg.addColorStop(0,'#8b6246');cg.addColorStop(.48,'#5f3c29');cg.addColorStop(1,'#3f281c')}
 c.fillStyle=cg;c.fill();
 const outer=ring(top,s.mugR(top),120).map(s.proj),inner=ring(1.505,1.36,120).map(s.proj);
 c.beginPath();outer.forEach((x,i)=>i?c.lineTo(x.x,x.y):c.moveTo(x.x,x.y));c.closePath();c.strokeStyle=s.dark?'#c3d7d0':'#dcebe6';c.lineWidth=9;c.stroke();
 c.beginPath();inner.forEach((x,i)=>i?c.lineTo(x.x,x.y):c.moveTo(x.x,x.y));c.closePath();c.strokeStyle=s.dark?'#7d9a91':'#95b8ad';c.lineWidth=4;c.stroke();
 c.beginPath();outer.forEach((x,i)=>i?c.lineTo(x.x,x.y):c.moveTo(x.x,x.y));c.closePath();c.strokeStyle=p.edge;c.lineWidth=1.2;c.stroke();
 const base=ring(bottom,s.mugR(bottom),120).map(s.proj);c.beginPath();base.forEach((x,i)=>i?c.lineTo(x.x,x.y):c.moveTo(x.x,x.y));c.closePath();c.strokeStyle=s.dark?'rgba(180,210,200,.22)':'rgba(52,88,77,.18)';c.lineWidth=1.3;c.stroke();
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