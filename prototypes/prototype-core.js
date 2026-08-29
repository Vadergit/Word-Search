(()=>{
'use strict';
const mode=document.body.dataset.mode;
const cfg={
 pyramid:{name:'Word Pyramid',words:['PEAK','ROCK','CLIMB','RIDGE','STONE','TRAIL'],rx:-20,ry:-30,route:'Edges'},
 /* Exactly 42 letters: every Orb tile belongs to one target word. */
 orb:{name:'Word Orb',words:['ORBIT','ROUND','GLOBE','SPHERE','WORLD','CURVE','ORB','AXIS','RING'],rx:-18,ry:-30,route:'Geodesic'},
 mug:{name:'Word Mug',words:['COFFEE','MUG','STEAM','BEANS','LATTE','WARM'],rx:-12,ry:-24,route:'Front'}
}[mode];
if(!cfg)throw new Error('Unknown prototype mode');
const $=id=>document.getElementById(id),stage=$('stage'),canvas=$('gameCanvas'),ctx=canvas.getContext('2d',{alpha:true});
const ui={word:$('currentWord'),meta:$('selectionMeta'),bar:$('timerBar'),targets:$('targetList'),found:$('foundStat'),score:$('scoreStat'),tiles:$('tileStat'),route:$('routeStat'),time:$('elapsedStat'),clear:$('clearBtn'),check:$('checkBtn'),newBtn:$('newBtn'),reset:$('resetViewBtn'),theme:$('themeBtn'),toast:$('toast'),win:$('win'),winText:$('winText'),next:$('nextBtn'),metaColor:$('themeColorMeta')};
const V={add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len:a=>Math.hypot(...a),norm:a=>{const l=Math.hypot(...a)||1;return a.map(x=>x/l)},lerp:(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t)};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rnd=n=>Math.floor(Math.random()*n),shuffle=a=>{a=[...a];for(let i=a.length-1;i;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a},center=pts=>V.mul(pts.reduce((s,p)=>V.add(s,p),[0,0,0]),1/pts.length),q=p=>p.map(x=>x.toFixed(5)).join(','),edge=(a,b)=>{a=q(a);b=q(b);return a<b?a+'|'+b:b+'|'+a},normAng=v=>((v+180)%360+360)%360-180;
const s={ver:'0.4.18',mode,cfg,stage,canvas,ctx,ui,V,clamp,rnd,shuffle,center,edge,normAng,nodes:[],byId:new Map(),adj:new Map(),bodyFaces:[],orbEdges:[],board:[],targets:[],targetPaths:new Map(),found:new Set(),foundPaths:new Map(),solved:new Set(),selected:[],rendered:[],rx:cfg.rx,ry:cfg.ry,w:1,h:1,dpr:1,rotating:false,pid:null,lx:0,ly:0,timer:null,timerStart:0,timerRemain:8000,timerPaused:false,score:0,startMs:0,finalMs:0,ticker:null,toastTimer:null,dark:false,flash:new Map(),SEL:8000,CAM:7.2,POOL:'EEEEEEEEEEEEAAAAAAAAAIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ'};
s.PAL={light:{body:'#555d5a',body2:'#68706d',edge:'rgba(33,111,90,.34)',core:'#414744',tile:'#fbfdfa',text:'#173028',stroke:'rgba(23,48,40,.24)',sel:'#55d7b9',selStroke:'#147e67',sol:'#b9e58f',solStroke:'#5d9634',bad:'#ef9f96',under:'rgba(255,255,255,.96)',wire:'rgba(39,91,74,.13)',rim:'#d8e3de',inner:'#27352f'},dark:{body:'#2d3331',body2:'#39413e',edge:'rgba(101,223,195,.24)',core:'#252a29',tile:'#e9eee8',text:'#10201a',stroke:'rgba(9,27,21,.24)',sel:'#65dfc3',selStroke:'#d8fff4',sol:'#aee17f',solStroke:'#d8ffb9',bad:'#ef9f96',under:'rgba(4,14,11,.88)',wire:'rgba(101,223,195,.11)',rim:'#70817a',inner:'#101916'}};
s.P=()=>s.dark?s.PAL.dark:s.PAL.light;
s.node=o=>{o.id=s.nodes.length;s.nodes.push(o);s.byId.set(o.id,o);s.adj.set(o.id,new Set());return o.id};s.link=(a,b)=>{if(a!==b){s.adj.get(a).add(b);s.adj.get(b).add(a)}};
s.rot=p=>{const Y=s.ry*Math.PI/180,X=s.rx*Math.PI/180,x=p[0]*Math.cos(Y)+p[2]*Math.sin(Y),z=-p[0]*Math.sin(Y)+p[2]*Math.cos(Y),y=p[1];return[x,y*Math.cos(X)-z*Math.sin(X),y*Math.sin(X)+z*Math.cos(X)]};
s.proj=p=>{const r=s.rot(p),f=Math.min(s.w,s.h)*.92,z=Math.max(.8,s.CAM-r[2]);return{x:s.w/2+r[0]*f/z,y:s.h/2+r[1]*f/z,z:r[2]}};s.facing=n=>s.rot(n)[2];
s.poly=a=>{if(!a.length)return;s.ctx.beginPath();s.ctx.moveTo(a[0].x,a[0].y);for(let i=1;i<a.length;i++)s.ctx.lineTo(a[i].x,a[i].y);s.ctx.closePath()};s.depth=a=>a.reduce((x,p)=>x+p.z,0)/a.length;
s.shade=(hex,k)=>{const n=parseInt(hex.slice(1),16),f=x=>Math.round(clamp(x*k,0,255)).toString(16).padStart(2,'0');return'#'+f((n>>16)&255)+f((n>>8)&255)+f(n&255)};
s.basis=(n,seed)=>{n=V.norm(n);let u=seed?V.sub(seed,V.mul(n,V.dot(seed,n))):null;if(!u||V.len(u)<1e-6)u=V.cross(Math.abs(n[1])<.9?[0,1,0]:[1,0,0],n);u=V.norm(u);return{u,v:V.norm(V.cross(n,u))}};s.ext=(c,pts,u,v)=>{let hu=.1,hv=.1;for(const p of pts){const d=V.sub(p,c);hu=Math.max(hu,Math.abs(V.dot(d,u)));hv=Math.max(hv,Math.abs(V.dot(d,v)))}return{hu,hv}};s.shrink=(pts,c,k=.91)=>pts.map(p=>V.lerp(c,p,k));
window.WordShapeProto=s;
})();
