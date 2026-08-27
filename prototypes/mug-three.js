(()=>{
'use strict';
const VERSION='0.4.9',SELECTION_MS=8000,ROWS=6,COLS=6;
const WORDS=['COFFEE','MUG','STEAM','BEANS','LATTE','WARM'];
const POOL='EEEEEEEEEEEEAAAAAAAAAIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ';
const $=id=>document.getElementById(id);
const stage=$('stage'),canvas=$('gameCanvas');
const ui={word:$('currentWord'),meta:$('selectionMeta'),bar:$('timerBar'),targets:$('targetList'),found:$('foundStat'),score:$('scoreStat'),tiles:$('tileStat'),route:$('routeStat'),time:$('elapsedStat'),clear:$('clearBtn'),check:$('checkBtn'),newBtn:$('newBtn'),reset:$('resetViewBtn'),theme:$('themeBtn'),toast:$('toast'),win:$('win'),winText:$('winText'),next:$('nextBtn'),metaColor:$('themeColorMeta')};
if(!window.THREE)throw new Error('Three.js failed to load');

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(0,.1,7.7);
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.outputEncoding=THREE.sRGBEncoding;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
scene.add(new THREE.HemisphereLight(0xffffff,0x26332e,1.45));
const key=new THREE.DirectionalLight(0xffffff,1.2);key.position.set(4,6,7);key.castShadow=true;scene.add(key);
const fill=new THREE.DirectionalLight(0xc8fff1,.7);fill.position.set(-5,2,-4);scene.add(fill);

const model=new THREE.Group(),bodyGroup=new THREE.Group(),tileGroup=new THREE.Group(),letterGroup=new THREE.Group(),trailGroup=new THREE.Group();
model.add(bodyGroup,tileGroup,trailGroup,letterGroup);scene.add(model);
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();

let dark=false,board=[],targets=[...WORDS],targetPaths=new Map(),found=new Set(),foundPaths=new Map(),solved=new Set(),selected=[];
let tiles=[],tileMeshes=[],adj=new Map(),score=0,flash=new Map(),toastTimer=null;
let rotX=-.12,rotY=-.30,targetRotX=rotX,targetRotY=rotY;
let pointerDown=false,rotating=false,moved=false,pointerId=null,downTile=null,downX=0,downY=0,lastX=0,lastY=0;
let timer=null,timerStart=0,timerRemain=SELECTION_MS,timerPaused=false;
let startMs=0,finalMs=0,ticker=null;

const COLORS={
 light:{body:0x68706d,inner:0x27352f,handle:0x596862,tile:0xfbfdfa,text:'#173028',sel:0x55d7b9,selEdge:0x147e67,sol:0xb9e58f,solEdge:0x5d9634,bad:0xef9f96,pathUnder:0xffffff,pathSel:0x55d7b9,pathSol:0x9bd866},
 dark:{body:0x39413e,inner:0x101916,handle:0x46534e,tile:0xe9eee8,text:'#10201a',sel:0x65dfc3,selEdge:0xd8fff4,sol:0xaee17f,solEdge:0xd8ffb9,bad:0xef9f96,pathUnder:0x08110e,pathSel:0x65dfc3,pathSol:0x9bd866}
};
const C=()=>dark?COLORS.dark:COLORS.light;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=n=>Math.floor(Math.random()*n);
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const cyl=(theta,y,r)=>new THREE.Vector3(Math.sin(theta)*r,y,Math.cos(theta)*r);
const mugR=y=>{const t=clamp((y+1.575)/3.15,0,1);return 1.48+(1.60-1.48)*t};

function disposeGroup(group){while(group.children.length){const o=group.children.pop();o.traverse?.(x=>{x.geometry?.dispose?.();if(x.material){const list=Array.isArray(x.material)?x.material:[x.material];list.forEach(m=>{m.map?.dispose?.();m.dispose?.()})}})}}
function addLink(a,b){if(a===b)return;if(!adj.has(a))adj.set(a,new Set());if(!adj.has(b))adj.set(b,new Set());adj.get(a).add(b);adj.get(b).add(a)}
function makeBodyMaterial(color){return new THREE.MeshPhysicalMaterial({color,roughness:.34,clearcoat:.25,clearcoatRoughness:.5,side:THREE.DoubleSide})}
function buildBody(){
 disposeGroup(bodyGroup);
 const c=C();
 const outer=new THREE.Mesh(new THREE.CylinderGeometry(1.60,1.48,3.15,64,1,true),makeBodyMaterial(c.body));outer.castShadow=true;outer.receiveShadow=true;bodyGroup.add(outer);
 const inner=new THREE.Mesh(new THREE.CylinderGeometry(1.43,1.33,2.85,64,1,true),new THREE.MeshStandardMaterial({color:c.inner,roughness:.55,side:THREE.BackSide}));inner.position.y=.11;bodyGroup.add(inner);
 const bottom=new THREE.Mesh(new THREE.CylinderGeometry(1.48,1.48,.13,64),new THREE.MeshStandardMaterial({color:c.body,roughness:.42}));bottom.position.y=-1.575;bottom.castShadow=true;bodyGroup.add(bottom);
 const rimOuter=new THREE.Mesh(new THREE.TorusGeometry(1.52,.105,18,64),new THREE.MeshStandardMaterial({color:c.body,roughness:.30}));rimOuter.rotation.x=Math.PI/2;rimOuter.position.y=1.575;bodyGroup.add(rimOuter);
 const rimInner=new THREE.Mesh(new THREE.TorusGeometry(1.36,.055,14,64),new THREE.MeshStandardMaterial({color:c.inner,roughness:.50}));rimInner.rotation.x=Math.PI/2;rimInner.position.y=1.55;bodyGroup.add(rimInner);
 const handle=new THREE.Mesh(new THREE.TorusGeometry(.82,.18,18,64),makeBodyMaterial(c.handle));handle.position.set(1.53,.02,0);handle.scale.y=1.18;handle.castShadow=true;handle.receiveShadow=true;bodyGroup.add(handle);
}
function makeLetter(letter,center,normal,theta){
 const cv=document.createElement('canvas');cv.width=cv.height=256;const x=cv.getContext('2d');x.clearRect(0,0,256,256);x.fillStyle=C().text;x.font='800 146px Georgia,serif';x.textAlign='center';x.textBaseline='middle';x.fillText(letter,128,136);
 const tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy?.()||1);
 const geom=new THREE.PlaneGeometry(.43,.43),mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(geom,mat);mesh.position.copy(center).add(normal.clone().multiplyScalar(.018));mesh.renderOrder=6;
 const u=new THREE.Vector3(Math.cos(theta),0,-Math.sin(theta)).normalize();const v=new THREE.Vector3(0,1,0);const basis=new THREE.Matrix4().makeBasis(u,v,normal);mesh.setRotationFromMatrix(basis);return mesh;
}
function makeTile(row,col,id){
 const t0=-.70+col*(1.40/COLS),t1=-.70+(col+1)*(1.40/COLS),yTop=1.06-row*(2.12/ROWS),yBottom=1.06-(row+1)*(2.12/ROWS),segX=4,segY=2;
 const verts=[],idx=[];
 for(let y=0;y<=segY;y++){
  const fy=y/segY,yy=THREE.MathUtils.lerp(yTop,yBottom,fy),r=mugR(yy)+.012;
  for(let x=0;x<=segX;x++){const fx=x/segX,th=THREE.MathUtils.lerp(t0,t1,fx),p=cyl(th,yy,r);verts.push(p.x,p.y,p.z)}
 }
 for(let y=0;y<segY;y++)for(let x=0;x<segX;x++){const a=y*(segX+1)+x,b=a+1,c0=a+(segX+1),d=c0+1;idx.push(a,b,c0,b,d,c0)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();
 const m=new THREE.MeshPhysicalMaterial({color:C().tile,roughness:.30,clearcoat:.10,side:THREE.DoubleSide});const mesh=new THREE.Mesh(g,m);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.tileId=id;mesh.renderOrder=2;
 const tm=(t0+t1)/2,ym=(yTop+yBottom)/2,normal=new THREE.Vector3(Math.sin(tm),0,Math.cos(tm)).normalize(),center=cyl(tm,ym,mugR(ym)+.025),letter=makeLetter(board[id]||'',center,normal,tm);
 tileGroup.add(mesh);letterGroup.add(letter);tileMeshes.push(mesh);tiles.push({id,row,col,mesh,letter,center,normal,theta:tm,y:ym});
}
function buildTiles(){disposeGroup(tileGroup);disposeGroup(letterGroup);tiles=[];tileMeshes=[];adj=new Map();for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const id=r*COLS+c;adj.set(id,new Set());makeTile(r,c,id)}for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const id=r*COLS+c;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const rr=r+dr,cc=c+dc;if(rr>=0&&rr<ROWS&&cc>=0&&cc<COLS)addLink(id,rr*COLS+cc)}}ui.tiles.textContent=tiles.length;ui.route.textContent='Front'}
function buildModel(){buildBody();buildTiles();updateStyles()}

function segmentSamples(a,b){const A=tiles[a],B=tiles[b],out=[];let d=B.theta-A.theta;if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;for(let i=0;i<=14;i++){const t=i/14,th=A.theta+d*t,y=THREE.MathUtils.lerp(A.y,B.y,t),n=new THREE.Vector3(Math.sin(th),0,Math.cos(th)).normalize();out.push({p:cyl(th,y,mugR(y)+.037),n})}return out}
function ribbon(samples,width,color,lift=0,order=3){if(samples.length<2)return null;const verts=[],indices=[];for(let i=0;i<samples.length;i++){const z=samples[i],prev=samples[Math.max(0,i-1)].p,next=samples[Math.min(samples.length-1,i+1)].p,tangent=next.clone().sub(prev).normalize();let side=new THREE.Vector3().crossVectors(z.n,tangent).normalize();if(side.lengthSq()<1e-6)side.set(1,0,0);const p=z.p.clone().add(z.n.clone().multiplyScalar(lift)),h=width/2,L=p.clone().add(side.clone().multiplyScalar(h)),R=p.clone().add(side.clone().multiplyScalar(-h));verts.push(L.x,L.y,L.z,R.x,R.y,R.z);if(i<samples.length-1){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,b,c,b,d,c)}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();const m=new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,depthWrite:false});const mesh=new THREE.Mesh(g,m);mesh.renderOrder=order;return mesh}
function drawPath(path,color){for(let k=0;k<path.length-1;k++){const samples=segmentSamples(path[k],path[k+1]),under=ribbon(samples,.19,C().pathUnder,0,3),inner=ribbon(samples,.105,color,.003,4);if(under)trailGroup.add(under);if(inner)trailGroup.add(inner)}}
function drawTrails(){disposeGroup(trailGroup);foundPaths.forEach(p=>drawPath(p,C().pathSol));if(selected.length>1)drawPath(selected,C().pathSel)}
function updateStyles(){const c=C(),sel=new Set(selected);tiles.forEach(t=>{let color=c.tile;if((flash.get(t.id)||0)>performance.now())color=c.bad;else if(sel.has(t.id))color=c.sel;else if(solved.has(t.id))color=c.sol;t.mesh.material.color.setHex(color);t.mesh.material.emissive?.setHex(sel.has(t.id)?0x123c31:0x000000);if(t.mesh.material.emissive)t.mesh.material.emissiveIntensity=sel.has(t.id)?.12:0});drawTrails()}

function findRoute(length,used){for(const start of shuffle([...Array(ROWS*COLS).keys()].filter(id=>!used.has(id))).slice(0,36)){const p=[start],seen=new Set([start]);const dfs=()=>{if(p.length===length)return true;for(const id of shuffle([...adj.get(p[p.length-1])].filter(id=>!seen.has(id)&&!used.has(id)))){seen.add(id);p.push(id);if(dfs())return true;p.pop();seen.delete(id)}return false};if(dfs())return p}return null}
function generatePuzzle(){if(!adj.size){for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const id=r*COLS+c;adj.set(id,new Set());for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const rr=r+dr,cc=c+dc;if(rr>=0&&rr<ROWS&&cc>=0&&cc<COLS)adj.get(id).add(rr*COLS+cc)}}}for(let attempt=0;attempt<160;attempt++){const used=new Set(),paths=new Map();let ok=true;for(const w of WORDS){const p=findRoute(w.length,used);if(!p){ok=false;break}p.forEach(id=>used.add(id));paths.set(w,p)}if(!ok)continue;board=Array(ROWS*COLS).fill('').map(()=>POOL[rnd(POOL.length)]);paths.forEach((p,w)=>p.forEach((id,i)=>board[id]=w[i]));targets=[...WORDS];targetPaths=paths;return}throw new Error('Could not build mug prototype routes')}
function renderTargets(){ui.targets.innerHTML='';for(const w of targets){const e=document.createElement('div');e.className='target-chip'+(found.has(w)?' found':'');e.innerHTML=`<strong>${w}</strong><span>${found.has(w)?'Found ✓':w.length+' letters'}</span>`;ui.targets.appendChild(e)}}
const currentWord=()=>selected.map(id=>board[id]).join('');
function updateUI(){ui.word.textContent=currentWord()||'Tap a tile to start';ui.meta.textContent=selected.length?(rotating&&timerPaused?`Timer paused while rotating · ${(timerRemain/1000).toFixed(1)}s remaining`:`${selected.length} tile${selected.length===1?'':'s'} · Cube-style touching path · 8s timer`):'8 seconds after every tile · or press Check word';ui.clear.disabled=!selected.length;ui.check.disabled=selected.length<3;ui.found.textContent=`${found.size}/${targets.length}`;ui.score.textContent=score}
function toast(text){ui.toast.textContent=text;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1500)}
function bad(id){flash.set(id,performance.now()+380);updateStyles();setTimeout(()=>{flash.delete(id);updateStyles()},400)}
function stopTimer(reset=true){clearInterval(timer);timer=null;timerStart=0;timerPaused=false;timerRemain=SELECTION_MS;if(reset)ui.bar.style.width='0%'}
function startTimer(ms=SELECTION_MS){clearInterval(timer);timerRemain=ms;timerStart=performance.now();timerPaused=false;ui.bar.style.width=ms/SELECTION_MS*100+'%';timer=setInterval(()=>{const left=Math.max(0,timerRemain-(performance.now()-timerStart));ui.bar.style.width=left/SELECTION_MS*100+'%';if(left<=0){stopTimer(false);evaluate()}},50)}
function pauseTimer(){if(!timer)return false;timerRemain=Math.max(1,timerRemain-(performance.now()-timerStart));clearInterval(timer);timer=null;timerStart=0;timerPaused=true;ui.bar.style.width=timerRemain/SELECTION_MS*100+'%';return true}
function resumeTimer(){if(selected.length)startTimer(timerRemain)}
function evaluate(){if(!selected.length)return;stopTimer();const w=currentWord(),path=[...selected];if(targets.includes(w)&&!found.has(w)){found.add(w);foundPaths.set(w,path);path.forEach(id=>solved.add(id));score+=w.length*120;toast(w+' found')}else{bad(selected[selected.length-1]);toast(targets.includes(w)?w+' already found':'Not a target word')}selected=[];renderTargets();updateUI();updateStyles();if(found.size===targets.length){const e=stopClock();ui.winText.textContent=`All ${targets.length} target words found in ${fmt(e)}.`;setTimeout(()=>ui.win.classList.add('show'),300)}}
function selectTile(id){const i=selected.indexOf(id);if(i>=0){selected=selected.slice(0,i);updateUI();selected.length?startTimer():stopTimer();updateStyles();return}const last=selected[selected.length-1];if(last!==undefined&&!adj.get(last).has(id)){bad(id);toast('Choose a touching tile');return}selected.push(id);updateUI();updateStyles();const w=currentWord();if(targets.includes(w)&&!found.has(w)){stopTimer();setTimeout(()=>currentWord()===w&&evaluate(),120)}else startTimer()}
function fmt(ms){const m=Math.floor(ms/60000),sec=Math.floor(ms%60000/1000),t=Math.floor(ms%1000/100);return`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${t}`}
function clockUI(){ui.time.textContent=fmt(startMs?Date.now()-startMs:finalMs)}
function startClock(){clearInterval(ticker);finalMs=0;startMs=Date.now();clockUI();ticker=setInterval(clockUI,100)}
function stopClock(){if(startMs)finalMs=Date.now()-startMs;startMs=0;clearInterval(ticker);ticker=null;clockUI();return finalMs}

function resetView(){targetRotX=-.12;targetRotY=-.30}
function newPuzzle(){stopTimer();stopClock();selected=[];found=new Set();foundPaths=new Map();solved=new Set();score=0;flash=new Map();ui.win.classList.remove('show');generatePuzzle();buildModel();renderTargets();updateUI();resetView();startClock();toast(`New Word Mug prototype · v${VERSION}`)}
function applyTheme(value){dark=value==='dark';document.documentElement.dataset.theme=dark?'dark':'light';ui.theme.textContent=dark?'Light mode':'Dark mode';ui.metaColor?.setAttribute('content',dark?'#091311':'#f3f7f4');try{localStorage.setItem('anitasPrototypeTheme',dark?'dark':'light')}catch(_){}buildModel()}

function pickTile(clientX,clientY){const r=canvas.getBoundingClientRect();pointer.x=((clientX-r.left)/r.width)*2-1;pointer.y=-((clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(tileMeshes,false);return hits.length?hits[0].object.userData.tileId:null}
canvas.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;pointerDown=true;moved=false;pointerId=e.pointerId;downX=lastX=e.clientX;downY=lastY=e.clientY;downTile=pickTile(e.clientX,e.clientY);rotating=downTile===null;if(rotating){timerPaused=pauseTimer();updateUI();stage.classList.add('rotating')}try{canvas.setPointerCapture(e.pointerId)}catch(_){}});
canvas.addEventListener('pointermove',e=>{if(!pointerDown||e.pointerId!==pointerId)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;if(Math.hypot(e.clientX-downX,e.clientY-downY)>5)moved=true;if(rotating){targetRotY+=dx*.008;targetRotX=clamp(targetRotX+dy*.007,-1.20,1.20)}lastX=e.clientX;lastY=e.clientY});
function endPointer(e){if(!pointerDown)return;if(e&&e.pointerId!==undefined&&pointerId!==e.pointerId)return;const wasRotating=rotating;if(!moved&&downTile!==null)selectTile(downTile);pointerDown=false;rotating=false;pointerId=null;downTile=null;stage.classList.remove('rotating');if(wasRotating&&timerPaused){const shouldResume=timerPaused;timerPaused=false;updateUI();if(shouldResume)resumeTimer()}}
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('lostpointercapture',()=>endPointer());window.addEventListener('blur',()=>endPointer());
ui.clear.addEventListener('click',()=>{selected=[];stopTimer();updateUI();updateStyles()});ui.check.addEventListener('click',evaluate);ui.newBtn.addEventListener('click',newPuzzle);ui.next.addEventListener('click',newPuzzle);ui.reset.addEventListener('click',resetView);ui.theme.addEventListener('click',()=>applyTheme(dark?'light':'dark'));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){selected=[];stopTimer();updateUI();updateStyles()}if(e.key==='Enter'&&selected.length>=3)evaluate()});

function resize(){const r=stage.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix()}
function animate(){requestAnimationFrame(animate);rotX+=(targetRotX-rotX)*.16;rotY+=(targetRotY-rotY)*.16;model.rotation.x=rotX;model.rotation.y=rotY;renderer.render(scene,camera)}
if('ResizeObserver'in window)new ResizeObserver(resize).observe(stage);else window.addEventListener('resize',resize);
let saved='light';try{saved=localStorage.getItem('anitasPrototypeTheme')||'light'}catch(_){}dark=saved==='dark';document.documentElement.dataset.theme=dark?'dark':'light';ui.theme.textContent=dark?'Light mode':'Dark mode';
generatePuzzle();buildModel();renderTargets();updateUI();resize();resetView();startClock();animate();
})();
