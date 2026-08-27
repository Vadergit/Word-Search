const VERSION='0.1.0';
const mode=document.body.dataset.mode;
const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
const currentWordEl=document.getElementById('currentWord');
const targetsEl=document.getElementById('targets');
const foundStat=document.getElementById('foundStat');
const tileStat=document.getElementById('tileStat');
const clearBtn=document.getElementById('clearBtn');
const newBtn=document.getElementById('newBtn');
const toastEl=document.getElementById('toast');
let rotX=-20,rotY=-28,dragging=false,lastX=0,lastY=0,moved=false;
let selected=[],found=new Set(),nodes=[],links=new Map(),targets=[];
let dpr=1,w=0,h=0;
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=n=>Math.floor(Math.random()*n);
function rotate(p){const y=rotY*Math.PI/180,x=rotX*Math.PI/180;let X=p[0]*Math.cos(y)+p[2]*Math.sin(y),Z=-p[0]*Math.sin(y)+p[2]*Math.cos(y),Y=p[1];return [X,Y*Math.cos(x)-Z*Math.sin(x),Y*Math.sin(x)+Z*Math.cos(x)]}
function project(p){const r=rotate(p),f=Math.min(w,h)*.9,z=6.2-r[2];return {x:w/2+r[0]*f/z,y:h/2+r[1]*f/z,z:r[2],s:f/z}}
function addLink(a,b){if(a===b)return;(links.get(a)||links.set(a,new Set()).get(a)).add(b);(links.get(b)||links.set(b,new Set()).get(b)).add(a)}
function buildMug(){nodes=[];links=new Map();for(let r=0;r<6;r++)for(let c=0;c<6;c++){const id=r*6+c;const ang=(c-2.5)*.13;nodes.push({id,pos:[Math.sin(ang)*1.3,(r-2.5)*.38,Math.cos(ang)*.25+1.25],letter:'',front:true});for(let rr=Math.max(0,r-1);rr<=r;rr++)for(let cc=Math.max(0,c-1);cc<=c;cc++){const j=rr*6+cc;if(j<id&&(Math.abs(rr-r)<=1&&Math.abs(cc-c)<=1))addLink(id,j)}}targets=[['COFFEE',[0,1,2,3,4,5]],['MUG',[6,7,8]],['STEAM',[12,13,14,15,16]],['BEANS',[18,19,20,21,22]],['LATTE',[24,25,26,27,28]],['WARM',[30,31,32,33]]];}
function buildOrb(){nodes=[];links=new Map();const rows=6,cols=8;for(let r=0;r<rows;r++){const lat=(-60+r*24)*Math.PI/180;for(let c=0;c<cols;c++){const lon=(c/cols)*Math.PI*2;const id=r*cols+c;nodes.push({id,pos:[Math.cos(lat)*Math.sin(lon)*1.8,Math.sin(lat)*1.8,Math.cos(lat)*Math.cos(lon)*1.8],letter:''});}}
for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const id=r*cols+c;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const rr=r+dr;if(rr<0||rr>=rows)continue;const cc=(c+dc+cols)%cols;addLink(id,rr*cols+cc)}}targets=[['ORBIT',[0,1,2,3,4]],['ROUND',[8,9,10,11,12]],['GLOBE',[16,17,18,19,20]],['SPHERE',[24,25,26,27,28,29]],['WORLD',[32,33,34,35,36]],['CURVE',[40,41,42,43,44]]];}
function buildPyramid(){nodes=[];links=new Map();const V=[[0,-2,0],[-1.9,1.3,1.1],[1.9,1.3,1.1],[0,1.3,-2.2]],faces=[[0,1,2],[0,2,3],[0,3,1],[1,3,2]];let id=0;const faceIds=[];for(let fi=0;fi<4;fi++){const [a,b,c]=faces[fi].map(i=>V[i]);const ids=[];for(let row=0;row<4;row++){for(let col=0;col<=row;col++){const t=(row+.65)/4.25,u=row?col/row:.5;const base=[b[0]*(1-u)+c[0]*u,b[1]*(1-u)+c[1]*u,b[2]*(1-u)+c[2]*u];const p=[a[0]*(1-t)+base[0]*t,a[1]*(1-t)+base[1]*t,a[2]*(1-t)+base[2]*t];nodes.push({id,pos:p,letter:'',face:fi,row,col});ids.push(id);id++;}}faceIds.push(ids)}
for(const n of nodes)for(const m of nodes){if(m.id<=n.id)continue;const dx=n.pos[0]-m.pos[0],dy=n.pos[1]-m.pos[1],dz=n.pos[2]-m.pos[2],dist=Math.hypot(dx,dy,dz);if(dist<1.12)addLink(n.id,m.id)}targets=[['PEAK',[0,1,2,4]],['ROCK',[10,11,12,14]],['CLIMB',[20,21,22,24,27]],['RIDGE',[30,31,32,34,37]],['TOP',[3,6,9]],['STONE',[13,15,18,19,17]]];}
function setup(){if(mode==='pyramid')buildPyramid();else if(mode==='orb')buildOrb();else buildMug();newPuzzle();resize();}
function newPuzzle(){selected=[];found.clear();nodes.forEach(n=>n.letter=alphabet[rand(alphabet.length)]);for(const [word,path] of targets)path.forEach((id,i)=>{if(nodes[id])nodes[id].letter=word[i]});renderTargets();updateUI();draw();}
function renderTargets(){targetsEl.innerHTML='';for(const [word] of targets){const d=document.createElement('div');d.className='target'+(found.has(word)?' found':'');d.innerHTML=`<span>${word}</span><span>${found.has(word)?'✓':''}</span>`;targetsEl.appendChild(d)}}
function updateUI(){currentWordEl.textContent=selected.length?selected.map(id=>nodes[id].letter).join(''):'Tap a tile to start';clearBtn.disabled=!selected.length;foundStat.textContent=`${found.size}/${targets.length}`;tileStat.textContent=nodes.length;}
function toast(t){toastEl.textContent=t;toastEl.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toastEl.classList.remove('show'),1400)}
function checkSelection(){const word=selected.map(id=>nodes[id].letter).join('');const hit=targets.find(([wrd,path])=>wrd===word&&path.length===selected.length&&path.every((id,i)=>id===selected[i]));if(hit&&!found.has(hit[0])){found.add(hit[0]);toast(`${hit[0]} found`);selected=[];renderTargets();updateUI();if(found.size===targets.length)setTimeout(()=>toast('Prototype complete!'),200)} }
function visibleNodeData(){return nodes.map(n=>{const p=project(n.pos);return {...n,p}}).sort((a,b)=>a.p.z-b.p.z)}
function drawMugBody(){if(mode!=='mug')return;ctx.save();ctx.translate(w/2,h/2);const scale=Math.min(w,h)*.12;ctx.strokeStyle='#93b9aa';ctx.lineWidth=2;ctx.fillStyle='#dfeee8';ctx.beginPath();ctx.roundRect(-1.6*scale,-2.0*scale,3.2*scale,4.1*scale,.35*scale);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(2.0*scale,-.3*scale,.75*scale,1.15*scale,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
function draw(){ctx.clearRect(0,0,w,h);drawMugBody();const data=visibleNodeData();for(const n of data){if(mode==='orb'&&n.p.z<-.1)continue;const r=clamp(19*n.p.s/100,12,23);ctx.beginPath();ctx.arc(n.p.x,n.p.y,r,0,Math.PI*2);ctx.fillStyle=foundPathContains(n.id)?'#ccefe5':selected.includes(n.id)?'#f1cd69':'rgba(255,255,255,.95)';ctx.fill();ctx.strokeStyle='rgba(55,92,78,.30)';ctx.lineWidth=1.2;ctx.stroke();ctx.fillStyle='#17241f';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`800 ${clamp(r*.95,12,20)}px system-ui`;ctx.fillText(n.letter,n.p.x,n.p.y+.5)}if(selected.length>1){ctx.strokeStyle='#d4a92f';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();selected.forEach((id,i)=>{const p=project(nodes[id].pos);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.stroke()}}
function foundPathContains(id){return targets.some(([wrd,path])=>found.has(wrd)&&path.includes(id))}
function pick(x,y){let best=null;for(const n of visibleNodeData()){if(mode==='orb'&&n.p.z<-.1)continue;const r=clamp(19*n.p.s/100,13,25),d=Math.hypot(x-n.p.x,y-n.p.y);if(d<r*1.15&&(!best||n.p.z>best.p.z))best=n}return best}
function pointerPos(e){const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)*w/r.width,(e.clientY-r.top)*h/r.height]}
canvas.addEventListener('pointerdown',e=>{const [x,y]=pointerPos(e),hit=pick(x,y);moved=false;if(hit){if(selected.includes(hit.id)){selected=selected.slice(0,selected.indexOf(hit.id));updateUI();draw();return}if(!selected.length||links.get(selected[selected.length-1])?.has(hit.id)){selected.push(hit.id);updateUI();draw();checkSelection()}else toast('Tiles must touch');return}dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;if(Math.abs(dx)+Math.abs(dy)>1)moved=true;rotY+=dx*.45;rotX=clamp(rotX+dy*.35,-75,75);lastX=e.clientX;lastY=e.clientY;draw()});
canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
clearBtn.addEventListener('click',()=>{selected=[];updateUI();draw()});newBtn.addEventListener('click',newPuzzle);
function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);w=r.width;h=r.height;ctx.setTransform(dpr,0,0,dpr,0,0);draw()}
window.addEventListener('resize',resize);setup();