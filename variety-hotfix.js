(()=>{
  'use strict';

  if(window.__ANITAS_VARIETY_V150__)return;
  window.__ANITAS_VARIETY_V150__=true;

  const VERSION='1.5.0';
  const MAX_RECENT_THEMES=9;
  const MAX_RECENT_WORDS=180;
  const MAX_WORD_SETS=120;

  const rawStorageGet=Storage.prototype.getItem;
  const rawStorageSet=Storage.prototype.setItem;
  const priorFilter=Array.prototype.filter;
  const priorSlice=Array.prototype.slice;

  function safeParse(value,fallback={}){
    try{return JSON.parse(value)||fallback}catch(_){return fallback}
  }

  function uniqueFront(items,limit){
    const out=[];
    const seen=new Set();
    for(const item of items||[]){
      if(typeof item!=='string'||!item||seen.has(item))continue;
      seen.add(item);
      out.push(item);
      if(out.length>=limit)break;
    }
    return out;
  }

  function activeProfile(){
    try{return rawStorageGet.call(localStorage,'anitasWordPathActiveProfile')||'global'}catch(_){return'global'}
  }

  function sharedKey(){return `anitasWordGameVariety:${activeProfile()}:v150`}

  function normaliseHistory(raw){
    return {
      recentThemes:uniqueFront(raw?.recentThemes,MAX_RECENT_THEMES),
      recentWords:uniqueFront(raw?.recentWords,MAX_RECENT_WORDS),
      wordSets:uniqueFront(raw?.wordSets,MAX_WORD_SETS),
      themedWordSets:uniqueFront(raw?.themedWordSets,MAX_WORD_SETS)
    };
  }

  function loadHistory(){
    try{return normaliseHistory(safeParse(rawStorageGet.call(localStorage,sharedKey())||'null',{}))}
    catch(_){return normaliseHistory({})}
  }

  function saveHistory(history){
    try{rawStorageSet.call(localStorage,sharedKey(),JSON.stringify(normaliseHistory(history)))}catch(_){}
  }

  function wordSetSignature(words){
    return [...new Set((words||[]).filter(word=>typeof word==='string'&&word))].sort().join('|');
  }

  function themedWordSetSignature(themeName,words){
    const signature=wordSetSignature(words);
    return themeName&&signature?`${themeName}:${signature}`:'';
  }

  function remember(themeName,words=[]){
    const history=loadHistory();
    const cleanTheme=(typeof themeName==='string'&&!['Mixed','Mystery',''].includes(themeName))?themeName:'';
    const cleanWords=[...new Set((words||[]).filter(word=>typeof word==='string'&&/^[A-Z]{2,24}$/.test(word)))];

    if(cleanTheme){
      history.recentThemes=uniqueFront([cleanTheme,...history.recentThemes],MAX_RECENT_THEMES);
    }
    if(cleanWords.length){
      history.recentWords=uniqueFront([...cleanWords,...history.recentWords],MAX_RECENT_WORDS);
      const signature=wordSetSignature(cleanWords);
      if(signature)history.wordSets=uniqueFront([signature,...history.wordSets],MAX_WORD_SETS);
      const themed=themedWordSetSignature(cleanTheme,cleanWords);
      if(themed)history.themedWordSets=uniqueFront([themed,...history.themedWordSets],MAX_WORD_SETS);
    }
    saveHistory(history);
  }

  function hasWordSet(words){
    const signature=wordSetSignature(words);
    return Boolean(signature)&&loadHistory().wordSets.includes(signature);
  }

  function orderThemes(themes,randomFn=Math.random){
    const history=loadHistory();
    const recentIndex=new Map(history.recentThemes.map((name,index)=>[name,index]));
    return [...themes]
      .map(theme=>({theme,jitter:randomFn()}))
      .sort((a,b)=>{
        const ai=recentIndex.get(a.theme?.name);
        const bi=recentIndex.get(b.theme?.name);
        const ap=ai===undefined?0:(history.recentThemes.length-ai)*100;
        const bp=bi===undefined?0:(history.recentThemes.length-bi)*100;
        return ap-bp||a.jitter-b.jitter;
      })
      .map(item=>item.theme);
  }

  window.ANITAS_VARIETY=Object.freeze({
    version:VERSION,
    load:loadHistory,
    remember,
    hasWordSet,
    orderThemes,
    wordSetSignature,
    themedWordSetSignature
  });

  /* Merge the shared 2D/3D history into the cube-specific history whenever
     the cube engine reads it. This keeps both games aware of what the other
     game has shown recently without changing saved puzzle/statistics data. */
  try{
    Storage.prototype.getItem=function(key){
      const value=rawStorageGet.call(this,key);
      if(this!==localStorage||typeof key!=='string'||!key.startsWith('anitasWordCubeVariety:')||!key.endsWith(':v150'))return value;

      const local=normaliseHistory(safeParse(value||'null',{}));
      const shared=loadHistory();
      return JSON.stringify({
        recentThemes:uniqueFront([...shared.recentThemes,...local.recentThemes],MAX_RECENT_THEMES),
        recentWords:uniqueFront([...shared.recentWords,...local.recentWords],MAX_RECENT_WORDS),
        wordSets:uniqueFront([...local.themedWordSets,...local.wordSets,...shared.themedWordSets],MAX_WORD_SETS)
      });
    };

    Storage.prototype.setItem=function(key,value){
      const result=rawStorageSet.call(this,key,value);
      if(this!==localStorage||typeof key!=='string'||!key.startsWith('anitasWordCubeVariety:')||!key.endsWith(':v150'))return result;

      const cube=safeParse(value||'null',{});
      const history=loadHistory();
      history.recentThemes=uniqueFront([...(cube.recentThemes||[]),...history.recentThemes],MAX_RECENT_THEMES);
      history.recentWords=uniqueFront([...(cube.recentWords||[]),...history.recentWords],MAX_RECENT_WORDS);
      history.themedWordSets=uniqueFront([...(cube.wordSets||[]),...history.themedWordSets],MAX_WORD_SETS);
      const plainSets=(cube.wordSets||[]).map(item=>{
        if(typeof item!=='string')return'';
        const colon=item.indexOf(':');
        return colon>=0?item.slice(colon+1):item;
      });
      history.wordSets=uniqueFront([...plainSets,...history.wordSets],MAX_WORD_SETS);
      saveHistory(history);
      return result;
    };
  }catch(_){/* storage prototype patch is optional */}

  function deterministic2D(){
    if(/\/cube(?:\/|$)/i.test(location.pathname))return true;
    const mode=document.querySelector('#gameModeChoices [data-game-mode].selected')?.dataset.gameMode||'';
    const seed=document.getElementById('seedInput')?.value?.trim()||'';
    return mode==='daily'||Boolean(seed);
  }

  function looksLikeThemeList(list){
    if(!Array.isArray(list)||!list.length)return false;
    for(const item of list){
      if(!item||typeof item.name!=='string'||!Array.isArray(item.words))return false;
    }
    return true;
  }

  /* The 2D engine originally excludes only the immediately previous theme.
     Intercept only its CELL_COUNT theme-filter step and keep several recently
     played themes out of the random pool, while always leaving at least four
     choices available. Daily/share-code puzzles remain deterministic. */
  Array.prototype.filter=function(callback,thisArg){
    const result=priorFilter.call(this,callback,thisArg);
    if(deterministic2D()||!looksLikeThemeList(result)||typeof callback!=='function')return result;

    const callbackSource=Function.prototype.toString.call(callback);
    if(!callbackSource.includes('CELL_COUNT')&&!callbackSource.includes('words.reduce'))return result;

    const recent=loadHistory().recentThemes;
    const blockCount=Math.min(recent.length,Math.max(0,result.length-4),8);
    if(blockCount<=0)return result;
    const blocked=new Set(recent.slice(0,blockCount));
    const fresh=[];
    for(const theme of result)if(!blocked.has(theme.name))fresh.push(theme);
    return fresh.length>=4?fresh:result;
  };

  function candidateStateArray(value){
    if(!Array.isArray(value)||!value.length)return false;
    for(const state of value){
      if(!state||!Number.isFinite(Number(state.score))||!Array.isArray(state.words))return false;
    }
    return true;
  }

  function wordArray(value){
    if(!value||typeof value.length!=='number')return false;
    for(let i=0;i<value.length;i++){
      if(typeof value[i]!=='string'||!/^[A-Z]{2,24}$/.test(value[i]))return false;
    }
    return true;
  }

  /* Two targeted slice hooks:
     1) retain up to 180 recent words instead of the legacy 45;
     2) when selectWordsExact takes its top candidate states, prefer complete
        word combinations that have not been played before. */
  Array.prototype.slice=function(start,end){
    if(start===0&&end===45&&wordArray(this)){
      let stack='';
      try{stack=String(new Error().stack||'')}catch(_){}
      if(/record(?:Cube)?Completion/.test(stack))return priorSlice.call(this,0,MAX_RECENT_WORDS);
    }

    if(!deterministic2D()&&start===0&&Number.isInteger(end)&&end>0&&end<=6&&candidateStateArray(this)){
      const history=loadHistory();
      const fresh=[],repeated=[];
      for(const state of this){
        (history.wordSets.includes(wordSetSignature(state.words))?repeated:fresh).push(state);
      }
      if(fresh.length){
        const ordered=[...fresh,...repeated];
        return priorSlice.call(ordered,0,end);
      }
    }

    return priorSlice.call(this,start,end);
  };

  /* Prime the existing playerStats recentWords before the 2D/cube closures
     load them, so the built-in reuse penalty immediately sees the longer,
     cross-game history. */
  try{
    const profile=activeProfile();
    if(profile!=='global'){
      const statsKey=`anitasWordPathStats:${profile}`;
      const stats=safeParse(rawStorageGet.call(localStorage,statsKey)||'null',null);
      if(stats&&typeof stats==='object'){
        const history=loadHistory();
        stats.recentWords=uniqueFront([...(stats.recentWords||[]),...history.recentWords],MAX_RECENT_WORDS);
        rawStorageSet.call(localStorage,statsKey,JSON.stringify(stats));
      }
    }
  }catch(_){}

  function setup2DObservers(){
    if(/\/cube(?:\/|$)/i.test(location.pathname))return;
    const themeEl=document.getElementById('themeName');
    const wordList=document.getElementById('wordList');
    const winText=document.getElementById('winText');
    if(!themeEl||!wordList)return;

    let captureTimer=null;
    const capture=()=>{
      clearTimeout(captureTimer);
      captureTimer=setTimeout(()=>{
        if(deterministic2D())return;
        const words=[...wordList.querySelectorAll('.word-chip')].map(el=>el.textContent.trim()).filter(Boolean);
        if(!words.length)return;
        const shownTheme=themeEl.textContent.trim();
        remember(['Mixed','Mystery'].includes(shownTheme)?'':shownTheme,words);
      },0);
    };

    new MutationObserver(capture).observe(themeEl,{childList:true,characterData:true,subtree:true});
    new MutationObserver(capture).observe(wordList,{childList:true,subtree:true});

    if(winText){
      new MutationObserver(()=>{
        if(deterministic2D())return;
        const match=winText.textContent.match(/Mystery revealed:\s*([^\.]+)\./i);
        if(!match)return;
        const words=[...wordList.querySelectorAll('.word-chip')].map(el=>el.textContent.trim()).filter(Boolean);
        remember(match[1].trim(),words);
      }).observe(winText,{childList:true,characterData:true,subtree:true});
    }
  }

  function markVersion(){
    document.title=document.title.replace(/v1\.\d+\.\d+/g,`v${VERSION}`);
    document.querySelectorAll('.start-kicker,.version-badge').forEach(el=>{
      el.textContent=el.textContent.replace(/v1\.\d+\.\d+/g,`v${VERSION}`);
    });
  }

  markVersion();
  setup2DObservers();
})();
