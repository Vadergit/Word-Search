const VERSION='0.2.0';
const mode=document.body.dataset.mode;
const canvas=document.getElementById('gameCanvas');
const currentWordEl=document.getElementById('currentWord');
const targetsEl=document.getElementById('targets');
const foundStat=document.getElementById('foundStat');
const tileStat=document.getElementById('tileStat');
const clearBtn=document.getElementById('clearBtn');
const newBtn=document.getElementById('newBtn');
const toastEl=document.getElementById('toast');

if(!window.THREE){throw new Error('Three.js failed to load.');}

const scene=new THREE.Scene();
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const camera=new THREE.PerspectiveCamera(38,1,.1,100);
camera.position.set(0,.1,7.4);
scene.add(new THREE.HemisphereLight(0xffffff,0xb9c9c1,1.35));
const keyLight=new THREE.DirectionalLight(0xffffff,1.15);keyLight.position.set(4,6,7);keyLight.castShadow=true;scene.add(keyLight);
const rimLight=new THREE.DirectionalLight(0xc8fff1,.7);rimLight.position.set(-5,2,-4);scene.add(rimLight);

const model=new THREE.Group();scene.add(model);
const bodyMeshes=[],tileObjects=[],tileHitMeshes=[];
let links=new Map(),targets=[],selected=[],found=new Set();
let dragging=false,lastX=0,lastY=0;
let rotX=mode==='mug'?-0.05:-0.22,rotY=mode==='mug'?-0.3:-0.45;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const rand=n=>Math.floor(Math.random()*n);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const BODY_MATERIAL=new THREE.MeshPhysicalMaterial({color:0xdcebe5,roughness:.42,metalness:0,clearcoat:.25,clearcoatRoughness:.55,side:THREE.DoubleSide});

function addBody(mesh){mesh.receiveShadow=true;mesh.castShadow=true;bodyMeshes.push(mesh);model.add(mesh);return mesh;}
function addLink(a,b){if(a===b)return;if(!links.has(a))links.set(a,new Set());if(!links.has(b))links.set(b,new Set());links.get(a).add(b);links.get(b).add(a);}
function normalFromTriangle(a,b,c){return new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).normalize();}
function outwardTriangleNormal(a,b,c){const n=normalFromTriangle(a,b,c);const center=new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1/3);if(n.dot(center)<0)n.multiplyScalar(-1);return n;}
function letterTexture(letter){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.clearRect(0,0,128,128);x.fillStyle='#17231f';x.font='800 72px system-ui,-apple-system,Segoe UI,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(letter,64,67);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);return t;}
function createTile(id,pos,normal,size=.42){const g=new THREE.Group();g.position.copy(pos);g.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal.clone().normalize());const base=new THREE.Mesh(new THREE.BoxGeometry(size,size*.86,.075),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.58,metalness:0}));base.castShadow=true;base.receiveShadow=true;base.userData.tileId=id;base.position.z=.015;const front=new THREE.Mesh(new THREE.PlaneGeometry(size*.84,size*.72),new THREE.MeshBasicMaterial({transparent:true,depthWrite:false}));front.position.z=.057;front.userData.tileId=id;g.add(base,front);model.add(g);const o={id,group:g,base,front,letter:'',texture:null};tileObjects.push(o);tileHitMeshes.push(front);return o;}
function setTileLetter(tile,letter){tile.letter=letter;if(tile.texture)tile.texture.dispose();tile.texture=letterTexture(letter);tile.front.material.map=tile.texture;tile.front.material.needsUpdate=true;}
function updateTileStyles(){const foundIds=new Set();for(const [word,path] of targets)if(found.has(word))path.forEach(id=>foundIds.add(id));for(const t of tileObjects){const c=foundIds.has(t.id)?0xbfe9dc:selected.includes(t.id)?0xf0c75e:0xffffff;t.base.material.color.setHex(c);t.base.material.emissive.setHex(selected.includes(t.id)?0x2c2100:0x000000);t.base.material.emissiveIntensity=selected.includes(t.id)?.08:0;}}

function buildOrb(){links=new Map();const radius=2.02;const sphere=addBody(new THREE.Mesh(new THREE.SphereGeometry(radius,64,40),BODY_MATERIAL.clone()));sphere.material.color.setHex(0xcfe6de);sphere.material.roughness=.5;const wire=new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(radius+0.008,16,10)),new THREE.LineBasicMaterial({color:0x6e9c8c,transparent:true,opacity:.08}));model.add(wire);const rows=6,cols=8;for(let r=0;r<rows;r++){const lat=THREE.MathUtils.degToRad(-60+r*24);for(let c=0;c<cols;c++){const lon=c/cols*Math.PI*2;const n=new THREE.Vector3(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)).normalize();createTile(r*cols+c,n.clone().multiplyScalar(radius+.09),n,.39);}}for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const id=r*cols+c;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const rr=r+dr;if(rr<0||rr>=rows)continue;const cc=(c+dc+cols)%cols;addLink(id,rr*cols+cc);}}targets=[['ORBIT',[0,1,2,3,4]],['ROUND',[8,9,10,11,12]],['GLOBE',[16,17,18,19,20]],['SPHERE',[24,25,26,27,28,29]],['WORLD',[32,33,34,35,36]],['CURVE',[40,41,42,43,44]]];}
function buildPyramid(){links=new Map();const A=new THREE.Vector3(0,2.05,0),B=new THREE.Vector3(-1.9,-1.18,1.28),C=new THREE.Vector3(1.9,-1.18,1.28),D=new THREE.Vector3(0,-1.18,-2.18);const faces=[[A,B,C],[A,C,D],[A,D,B],[B,D,C]];const verts=[];for(const [a,b,c] of faces)verts.push(...a.toArray(),...b.toArray(),...c.toArray());const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.computeVertexNormals();const body=addBody(new THREE.Mesh(geo,BODY_MATERIAL.clone()));body.material.color.setHex(0xd7e9e2);body.material.flatShading=true;body.material.needsUpdate=true;const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0x55786b,transparent:true,opacity:.62}));model.add(edges);let id=0;const faceIds=[];for(const face of faces){const [a,b,c]=face,normal=outwardTriangleNormal(a,b,c),ids=[];for(let row=0;row<4;row++)for(let col=0;col<=row;col++){const t=(row+.62)/4.18,u=row?col/row:.5;const edge=b.clone().lerp(c,u);const p=a.clone().lerp(edge,t).addScaledVector(normal,.07);createTile(id,p,normal,.39);ids.push(id);id++;}faceIds.push(ids);}for(const fids of faceIds){const members=fids.map(i=>tileObjects[i]);for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++)if(members[i].group.position.distanceTo(members[j].group.position)<1.0)addLink(members[i].id,members[j].id);}for(let i=0;i<tileObjects.length;i++)for(let j=i+1;j<tileObjects.length;j++)if(tileObjects[i].group.position.distanceTo(tileObjects[j].group.position)<.48)addLink(i,j);targets=[['PEAK',[6,7,8,9]],['ROCK',[16,17,18,19]],['PATH',[26,27,28,29]],['WORD',[36,37,38,39]],['TOP',[0,1,3]],['EDGE',[10,11,13,16]]];}
function buildMug(){links=new Map();const bodyMat=BODY_MATERIAL.clone();bodyMat.color.setHex(0xe6f1ed);bodyMat.side=THREE.DoubleSide;addBody(new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.37,3.15,64,4,true),bodyMat));const rim=addBody(new THREE.Mesh(new THREE.TorusGeometry(1.5,.075,16,64),new THREE.MeshStandardMaterial({color:0xc4ddd4,roughness:.38})));rim.rotation.x=Math.PI/2;rim.position.y=1.575;const bottom=addBody(new THREE.Mesh(new THREE.CylinderGeometry(1.37,1.37,.12,64),bodyMat.clone()));bottom.position.y=-1.56;const handle=addBody(new THREE.Mesh(new THREE.TorusGeometry(.78,.17,18,64),new THREE.MeshStandardMaterial({color:0xd4e8e0,roughness:.44})));handle.position.set(1.48,.05,0);handle.scale.y=1.18;const rows=6,cols=6,R=1.54;for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const theta=THREE.MathUtils.lerp(-.60,.60,c/(cols-1));const y=THREE.MathUtils.lerp(1.04,-1.04,r/(rows-1));const normal=new THREE.Vector3(Math.sin(theta),0,Math.cos(theta)).normalize();createTile(r*cols+c,new THREE.Vector3(Math.sin(theta)*(R+.075),y,Math.cos(theta)*(R+.075)),normal,.35);}for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const id=r*cols+c;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const rr=r+dr,cc=c+dc;if(rr>=0&&rr<rows&&cc>=0&&cc<cols)addLink(id,rr*cols+cc);}}targets=[['COFFEE',[0,1,2,3,4,5]],['MUG',[6,7,8]],['STEAM',[12,13,14,15,16]],['BEANS',[18,19,20,21,22]],['LATTE',[24,25,26,27,28]],['WARM',[30,31,32,33]]];}
function buildScene(){if(mode==='orb')buildOrb();else if(mode==='pyramid')buildPyramid();else buildMug();const floor=new THREE.Mesh(new THREE.CircleGeometry(3.2,64),new THREE.ShadowMaterial({color:0x0b2a20,opacity:.12}));floor.rotation.x=-Math.PI/2;floor.position.y=-2.45;floor.receiveShadow=true;scene.add(floor);tileStat.textContent=tileObjects.length;}
function newPuzzle(){selected=[];found.clear();for(const t of tileObjects)setTileLetter(t,alphabet[rand(alphabet.length)]);for(const [word,path] of targets)path.forEach((id,i)=>{if(tileObjects[id])setTileLetter(tileObjects[id],word[i]);});renderTargets();updateUI();updateTileStyles();}
function renderTargets(){targetsEl.innerHTML='';for(const [word] of targets){const d=document.createElement('div');d.className='target'+(found.has(word)?' found':'');d.innerHTML=`<span>${word}</span><span>${found.has(word)?'✓':''}</span>`;targetsEl.appendChild(d);}}
function updateUI(){currentWordEl.textContent=selected.length?selected.map(id=>tileObjects[id].letter).join(''):'Tap a tile to start';clearBtn.disabled=!selected.length;foundStat.textContent=`${found.size}/${targets.length}`;}
function toast(text){toastEl.textContent=text;toastEl.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toastEl.classList.remove('show'),1500);}
function checkSelection(){const word=selected.map(id=>tileObjects[id].letter).join('');const hit=targets.find(([w,p])=>w===word&&p.length===selected.length&&p.every((id,i)=>id===selected[i]));if(hit&&!found.has(hit[0])){found.add(hit[0]);selected=[];renderTargets();updateUI();updateTileStyles();toast(`${hit[0]} found`);if(found.size===targets.length)setTimeout(()=>toast('Prototype complete!'),250);}}
function pickTile(e){const rect=canvas.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects([...tileHitMeshes,...bodyMeshes],false);if(!hits.length)return null;const first=hits[0].object;return Number.isInteger(first.userData.tileId)?first.userData.tileId:null;}
canvas.addEventListener('pointerdown',e=>{const id=pickTile(e);if(id!==null){if(selected.includes(id)){selected=selected.slice(0,selected.indexOf(id));updateUI();updateTileStyles();return;}if(!selected.length||links.get(selected[selected.length-1])?.has(id)){selected.push(id);updateUI();updateTileStyles();checkSelection();}else toast('Tiles must touch');return;}dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;rotY+=dx*.008;rotX=clamp(rotX+dy*.007,-1.25,1.25);lastX=e.clientX;lastY=e.clientY;});
canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
clearBtn.addEventListener('click',()=>{selected=[];updateUI();updateTileStyles();});newBtn.addEventListener('click',newPuzzle);
function resize(){const rect=canvas.getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/Math.max(1,rect.height);camera.updateProjectionMatrix();}
function animate(){requestAnimationFrame(animate);model.rotation.x+=(rotX-model.rotation.x)*.16;model.rotation.y+=(rotY-model.rotation.y)*.16;renderer.render(scene,camera);}
window.addEventListener('resize',resize);buildScene();newPuzzle();resize();animate();