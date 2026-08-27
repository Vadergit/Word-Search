(()=>{
  'use strict';

  const VERSION='1.4.3';
  const cycle7=[36,42,35,43,44,37,45,46,38,39,47,48,40,41,34,33,27,20,26,32,31,25,24,30,29,23,22,14,7,1,0,8,2,3,9,17,18,12,4,5,6,13,19,11,10,16,15,21,28];

  function selectedGridSize(){
    const selected=document.querySelector('#gridChoices [data-grid].selected');
    return Number(selected?.dataset.grid)||6;
  }

  function configureGridChoices(){
    const wrap=document.getElementById('gridChoices');
    if(!wrap)return;
    const buttons=[...wrap.querySelectorAll('[data-grid]')];
    if(buttons.length<2)return;

    const set=(button,size,description)=>{
      button.hidden=false;
      button.disabled=false;
      button.dataset.grid=String(size);
      const strong=button.querySelector('strong');
      const span=button.querySelector('span');
      if(strong)strong.textContent=`${size}×${size}`;
      if(span)span.textContent=description;
    };

    set(buttons[0],6,'36 letters · compact');
    set(buttons[1],7,'49 letters · medium');

    /* 8x8 is intentionally removed for now. The current generator can still
       fail its unique-path validation on 64-cell boards. Keeping an option
       that can trap the browser in the retry loop is worse than exposing only
       the two sizes that are reliable. */
    for(let i=2;i<buttons.length;i++){
      buttons[i].classList.remove('selected');
      buttons[i].hidden=true;
      buttons[i].disabled=true;
      buttons[i].setAttribute('aria-hidden','true');
      buttons[i].tabIndex=-1;
    }

    wrap.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';
  }

  function addPrototypeLink(){
    if(document.getElementById('prototypeAccessLink'))return;
    const start=document.getElementById('startScreen');
    if(!start)return;

    const playerBar=start.querySelector('.player-bar');
    const actions=playerBar?.querySelector('div:last-child');
    if(actions){
      const link=document.createElement('a');
      link.id='prototypeAccessLink';
      link.className='btn secondary';
      link.href='prototypes/';
      link.textContent='3D Prototypes';
      link.title='Open the 3D model prototypes';
      actions.insertBefore(link,actions.firstChild);
      return;
    }

    const link=document.createElement('a');
    link.id='prototypeAccessLink';
    link.className='btn secondary';
    link.href='prototypes/';
    link.textContent='3D Prototypes';
    start.insertBefore(link,start.children[2]||null);
  }

  function markVersion(){
    document.title=document.title.replace(/v1\.4\.\d+/g,`v${VERSION}`);
    document.querySelectorAll('.start-kicker').forEach(el=>{
      el.textContent=el.textContent.replace(/v1\.4\.\d+/g,`v${VERSION}`);
    });
  }

  function sanitizeLegacyEightSeeds(){
    const startBtn=document.getElementById('startBtn');
    const seed=document.getElementById('seedInput');
    if(!startBtn||!seed)return;
    startBtn.addEventListener('click',()=>{
      if(/-(8|9|12)-/i.test(seed.value)){
        seed.value=seed.value.replace(/-(8|9|12)-/ig,'-7-');
      }
    },true);
  }

  configureGridChoices();
  addPrototypeLink();
  markVersion();
  sanitizeLegacyEightSeeds();

  if(window.ANITAS_THEME_META){
    window.ANITAS_THEME_META=Object.freeze({...window.ANITAS_THEME_META,generatorVersion:VERSION});
  }

  /* Keep 7x7 fast and deterministic by constraining the Hamiltonian search to
     one prevalidated cycle. 6x6 remains untouched. */
  if(!Array.prototype.__anitasGrid7FilterGuard){
    Object.defineProperty(Array.prototype,'__anitasGrid7FilterGuard',{value:true});
    const originalFilter=Array.prototype.filter;
    const signatures=new Map();

    function neighborSignature(idx){
      const size=7;
      const r=Math.floor(idx/size),c=idx%size,out=[];
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
        if(!dr&&!dc)continue;
        const rr=r+dr,cc=c+dc;
        if(rr>=0&&rr<size&&cc>=0&&cc<size)out.push(rr*size+cc);
      }
      return out.join(',');
    }

    for(let i=0;i<49;i++)signatures.set(neighborSignature(i),i);

    let active=null;
    Array.prototype.filter=function(callback,thisArg){
      const result=originalFilter.call(this,callback,thisArg);
      if(selectedGridSize()!==7)return result;
      if(this.length<3||this.length>8||!this.every(Number.isInteger))return result;

      const current=signatures.get(this.join(','));
      if(current===undefined)return result;

      if(!active||active.expected!==current||active.step>=cycle7.length-1){
        const at=cycle7.indexOf(current);
        if(at<0)return result;
        active={path:cycle7.slice(at).concat(cycle7.slice(0,at)),step:0,expected:current};
      }

      const next=active.path[active.step+1];
      if(next!==undefined&&result.includes(next)){
        active.step++;
        active.expected=next;
        return [next];
      }

      active=null;
      return result;
    };
  }

  /* The original word-count bounds were made for 6/9/12. 7x7 would otherwise
     request at least 13 words. Reuse a valid exact 49-letter DP state with a
     sensible 6-12 word count instead. */
  if(!Map.prototype.__anitasGrid7ExactFillGuard){
    Object.defineProperty(Map.prototype,'__anitasGrid7ExactFillGuard',{value:true});
    const originalGet=Map.prototype.get;
    const originalEntries=Map.prototype.entries;

    Map.prototype.get=function(key){
      const direct=originalGet.call(this,key);
      if(direct!==undefined)return direct;
      if(selectedGridSize()!==7||typeof key!=='string')return direct;

      const match=key.match(/^49\|(\d+)\|([01])\|([01])$/);
      if(!match||Number(match[1])<13)return direct;

      let best=null;
      for(const [candidateKey,state] of originalEntries.call(this)){
        if(typeof candidateKey!=='string'||!state||!Array.isArray(state.words))continue;
        const m=candidateKey.match(/^49\|(\d+)\|([01])\|([01])$/);
        if(!m||m[2]!==match[2]||m[3]!==match[3])continue;
        const count=Number(m[1]);
        if(count<6||count>12)continue;
        if(!best||Number(state.score)>Number(best.score))best=state;
      }
      return best||direct;
    };
  }

  function applySevenSizing(){
    const board=document.getElementById('board');
    if(!board||board.getAttribute('aria-label')!=='7 by 7 word grid')return;
    const font='clamp(21px,3.2vw,35px)';
    const radius='13px';
    board.style.gap='6px';
    document.documentElement.style.setProperty('--dynamic-cell-font',font);
    document.documentElement.style.setProperty('--dynamic-cell-radius',radius);
    board.querySelectorAll('.cell').forEach(cell=>{
      cell.style.fontSize=font;
      cell.style.borderRadius=radius;
    });
  }

  const board=document.getElementById('board');
  if(board){
    new MutationObserver(applySevenSizing).observe(board,{childList:true,attributes:true,attributeFilter:['aria-label']});
  }
})();
