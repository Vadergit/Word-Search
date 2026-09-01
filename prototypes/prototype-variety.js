(()=>{
  'use strict';
  if(window.__ANITAS_PROTOTYPE_VARIETY__)return;
  window.__ANITAS_PROTOTYPE_VARIETY__=true;

  const baseThemes=Array.isArray(window.ANITAS_THEME_POOLS)?[...window.ANITAS_THEME_POOLS]:[];
  const variety=window.ANITAS_VARIETY;
  let currentShapeTheme='';

  function shuffle(list){
    const out=[...list];
    for(let i=out.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [out[i],out[j]]=[out[j],out[i]];
    }
    return out;
  }

  function history(){
    return variety?.load?.()||{recentThemes:[],recentWords:[],wordSets:[]};
  }

  function themePool(){
    if(!baseThemes.length)return[];
    const h=history();
    const blockCount=Math.min(8,Math.max(0,baseThemes.length-5),h.recentThemes?.length||0);
    const blocked=new Set((h.recentThemes||[]).slice(0,blockCount));
    let themes=baseThemes.filter(theme=>!blocked.has(theme.name));
    if(themes.length<5)themes=[...baseThemes];

    const recentWords=new Set((h.recentWords||[]).slice(0,120));
    themes=themes.map(theme=>{
      const all=[...theme.words];
      const fresh=all.filter(word=>!recentWords.has(word));
      const freshShort=fresh.filter(word=>word.length>=3&&word.length<=10);
      const usable=freshShort.length>=14&&freshShort.reduce((sum,w)=>sum+w.length,0)>=90?fresh:all;
      return{name:theme.name,words:usable};
    });
    return variety?.orderThemes?variety.orderThemes(themes,Math.random):shuffle(themes);
  }

  /* Keep Array.isArray(...) true while making every spread/iteration of the
     shared pool return a newly diversity-ranked set of themes. Wheel and Orb
     already rebuild from the pool for every new puzzle, so this makes their
     existing generators variety-aware without duplicating their logic. */
  if(baseThemes.length){
    const proxy=new Proxy(baseThemes,{
      get(target,prop,receiver){
        if(prop===Symbol.iterator){
          return function*(){for(const theme of themePool())yield theme};
        }
        return Reflect.get(target,prop,receiver);
      }
    });
    window.ANITAS_THEME_POOLS=proxy;
  }

  function cleanWords(words,maxLen){
    return [...new Set((words||[])
      .map(word=>String(word).toUpperCase().replace(/[^A-Z]/g,''))
      .filter(word=>word.length>=3&&word.length<=maxLen))];
  }

  function chooseShapeSet(mode){
    const maxLen=mode==='mug'?8:10;
    const maxTotal=mode==='mug'?30:38;
    const minTotal=mode==='mug'?24:26;
    const h=history();
    const recent=new Set(h.recentWords||[]);
    const playedSets=new Set(h.wordSets||[]);

    for(const theme of themePool()){
      const all=cleanWords(theme.words,maxLen);
      if(all.length<6)continue;
      const preferred=shuffle(all.filter(word=>!recent.has(word)));
      const fallback=shuffle(all.filter(word=>recent.has(word)));
      const source=[...preferred,...fallback];

      for(let attempt=0;attempt<80;attempt++){
        const ordered=shuffle(source);
        const chosen=[];
        let total=0;
        for(const word of ordered){
          if(chosen.length>=6)break;
          if(total+word.length>maxTotal)continue;
          chosen.push(word);total+=word.length;
        }
        if(chosen.length!==6||total<minTotal)continue;
        const signature=variety?.wordSetSignature?variety.wordSetSignature(chosen):[...chosen].sort().join('|');
        if(playedSets.has(signature)&&attempt<60)continue;
        return{theme:theme.name,words:shuffle(chosen)};
      }
    }
    return null;
  }

  function collectTargetWords(targetList){
    if(!targetList)return[];
    const words=[];
    targetList.querySelectorAll('[data-word]').forEach(el=>{
      const word=(el.dataset.word||'').trim().toUpperCase();
      if(word)words.push(word);
    });
    targetList.querySelectorAll('.target-chip strong').forEach(el=>{
      const word=el.textContent.trim().toUpperCase();
      if(word)words.push(word);
    });
    return [...new Set(words)];
  }

  function observeSharedThemeGame(){
    const themeEl=document.getElementById('wordThemeName');
    const targetList=document.getElementById('targetList');
    if(!themeEl||!targetList||!variety)return;
    let timer=null;
    const capture=()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>{
        const theme=themeEl.textContent.trim();
        const words=collectTargetWords(targetList);
        if(!theme||theme==='Loading…'||!words.length)return;
        variety.remember(theme,words);
      },0);
    };
    new MutationObserver(capture).observe(themeEl,{childList:true,characterData:true,subtree:true});
    new MutationObserver(capture).observe(targetList,{childList:true,subtree:true});
  }

  function attachShape(state){
    if(!state||!['pyramid','mug'].includes(state.mode)||state.__anitasVarietyAttached)return;
    state.__anitasVarietyAttached=true;
    const prepare=()=>{
      const pick=chooseShapeSet(state.mode);
      if(!pick)return;
      currentShapeTheme=pick.theme;
      state.cfg.words=[...pick.words];
      state.activeWordThemeName=pick.theme;
    };

    prepare();
    state.ui.newBtn?.addEventListener('click',prepare);
    state.ui.next?.addEventListener('click',prepare);

    if(variety&&state.ui.targets){
      let timer=null;
      new MutationObserver(()=>{
        clearTimeout(timer);
        timer=setTimeout(()=>{
          const words=collectTargetWords(state.ui.targets);
          if(currentShapeTheme&&words.length)variety.remember(currentShapeTheme,words);
        },0);
      }).observe(state.ui.targets,{childList:true,subtree:true});
    }
  }

  observeSharedThemeGame();
  window.ANITAS_PROTOTYPE_VARIETY=Object.freeze({attachShape,themePool,chooseShapeSet});
  if(window.WordShapeProto)attachShape(window.WordShapeProto);
})();
