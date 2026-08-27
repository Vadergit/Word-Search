(()=>{
  'use strict';

  const VERSION='1.4.2';
  const cycles={
    7:[36,42,35,43,44,37,45,46,38,39,47,48,40,41,34,33,27,20,26,32,31,25,24,30,29,23,22,14,7,1,0,8,2,3,9,17,18,12,4,5,6,13,19,11,10,16,15,21,28],
    8:[49,56,57,48,40,41,32,24,33,25,16,8,1,0,9,2,3,10,17,26,18,11,19,12,4,5,13,6,7,14,15,23,22,31,39,30,21,20,27,28,35,34,42,43,50,59,60,52,61,62,53,46,55,63,54,47,38,45,36,29,37,44,51,58]
  };

  function selectedGridSize(){
    const selected=document.querySelector('#gridChoices [data-grid].selected');
    return Number(selected?.dataset.grid)||6;
  }

  function replaceGridChoices(){
    const buttons=[...document.querySelectorAll('#gridChoices [data-grid]')];
    if(buttons.length<3)return;
    const set=(button,size,description)=>{
      button.dataset.grid=String(size);
      const strong=button.querySelector('strong');
      const span=button.querySelector('span');
      if(strong)strong.textContent=`${size}×${size}`;
      if(span)span.textContent=description;
    };
    set(buttons[0],6,'36 letters · compact');
    set(buttons[1],7,'49 letters · medium');
    set(buttons[2],8,'64 letters · large');
  }

  function markVersion(){
    document.title=document.title.replace(/v1\.4\.\d+/g,`v${VERSION}`);
    document.querySelectorAll('.start-kicker').forEach(el=>{
      el.textContent=el.textContent.replace(/v1\.4\.\d+/g,`v${VERSION}`);
    });
  }

  replaceGridChoices();
  markVersion();
  if(window.ANITAS_THEME_META){
    window.ANITAS_THEME_META=Object.freeze({...window.ANITAS_THEME_META,generatorVersion:VERSION});
  }

  /* Force the expensive Hamiltonian search onto a prevalidated cycle for
     7x7 and 8x8. Because each list is a cycle, the generator may start at any
     random cell and still completes the board in one linear walk. */
  if(!Array.prototype.__anitasGrid78FilterGuard){
    Object.defineProperty(Array.prototype,'__anitasGrid78FilterGuard',{value:true});
    const originalFilter=Array.prototype.filter;
    const signatures={};

    function neighborSignature(size,idx){
      const r=Math.floor(idx/size),c=idx%size,out=[];
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
        if(!dr&&!dc)continue;
        const rr=r+dr,cc=c+dc;
        if(rr>=0&&rr<size&&cc>=0&&cc<size)out.push(rr*size+cc);
      }
      return out.join(',');
    }

    for(const size of [7,8]){
      const map=new Map();
      for(let i=0;i<size*size;i++)map.set(neighborSignature(size,i),i);
      signatures[size]=map;
    }

    let active=null;
    Array.prototype.filter=function(callback,thisArg){
      const result=originalFilter.call(this,callback,thisArg);
      const size=selectedGridSize();
      if(size!==7&&size!==8)return result;
      if(this.length<3||this.length>8||!this.every(Number.isInteger))return result;

      const current=signatures[size].get(this.join(','));
      if(current===undefined)return result;
      const cycle=cycles[size];

      if(!active||active.size!==size||active.expected!==current||active.step>=cycle.length-1){
        const at=cycle.indexOf(current);
        if(at<0)return result;
        active={size,path:cycle.slice(at).concat(cycle.slice(0,at)),step:0,expected:current};
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

  /* The original count bounds were tuned for 6/9/12. On 7x7 the legacy
     fallback asks for at least 13 words, which can make some themes impossible
     to fill exactly. When the DP asks for such a missing final state, reuse the
     best exact-fill state with a sensible lower word count. */
  if(!Map.prototype.__anitasGrid78ExactFillGuard){
    Object.defineProperty(Map.prototype,'__anitasGrid78ExactFillGuard',{value:true});
    const originalGet=Map.prototype.get;
    const originalEntries=Map.prototype.entries;

    Map.prototype.get=function(key){
      const direct=originalGet.call(this,key);
      if(direct!==undefined)return direct;

      const size=selectedGridSize();
      if(size!==7&&size!==8)return direct;
      if(typeof key!=='string')return direct;

      const match=key.match(/^(49|64)\|(\d+)\|([01])\|([01])$/);
      if(!match)return direct;
      const target=Number(match[1]);
      if(target!==size*size||Number(match[2])<13)return direct;

      const minCount=size===7?6:8;
      const maxCount=12;
      let best=null;
      for(const [candidateKey,state] of originalEntries.call(this)){
        if(typeof candidateKey!=='string'||!state||!Array.isArray(state.words))continue;
        const m=candidateKey.match(/^(49|64)\|(\d+)\|([01])\|([01])$/);
        if(!m||m[1]!==match[1]||m[3]!==match[3]||m[4]!==match[4])continue;
        const count=Number(m[2]);
        if(count<minCount||count>maxCount)continue;
        if(!best||Number(state.score)>Number(best.score))best=state;
      }
      return best||direct;
    };
  }

  /* The old layout uses its 12x12 typography fallback for any unknown size.
     Correct 7x7/8x8 after the board is configured/rendered. */
  function applyLargeGridSizing(){
    const board=document.getElementById('board');
    if(!board)return;
    const label=board.getAttribute('aria-label')||'';
    const m=label.match(/^(7|8) by \1 word grid$/);
    if(!m)return;
    const size=Number(m[1]);
    const font=size===7?'clamp(21px,3.2vw,35px)':'clamp(19px,2.9vw,32px)';
    const radius=size===7?'13px':'12px';
    board.style.gap=size===7?'6px':'5px';
    document.documentElement.style.setProperty('--dynamic-cell-font',font);
    document.documentElement.style.setProperty('--dynamic-cell-radius',radius);
    board.querySelectorAll('.cell').forEach(cell=>{
      cell.style.fontSize=font;
      cell.style.borderRadius=radius;
    });
  }

  const board=document.getElementById('board');
  if(board){
    new MutationObserver(applyLargeGridSizing).observe(board,{childList:true,attributes:true,attributeFilter:['aria-label']});
  }
})();
