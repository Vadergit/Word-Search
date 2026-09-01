(()=>{
  'use strict';
  if(window.__ANITAS_VARIETY_PROFILE_BRIDGE__)return;
  window.__ANITAS_VARIETY_PROFILE_BRIDGE__=true;

  const originalParse=JSON.parse;
  JSON.parse=function(text,reviver){
    const value=originalParse.call(JSON,text,reviver);
    try{
      const looksLikePlayerStats=value&&typeof value==='object'&&Array.isArray(value.recentWords)&&
        value.themeProgress&&typeof value.themeProgress==='object'&&
        (Array.isArray(value.completedPuzzles)||Array.isArray(value.completedFingerprints));
      if(!looksLikePlayerStats||!window.ANITAS_VARIETY)return value;

      const shared=window.ANITAS_VARIETY.load();
      const seen=new Set();
      const merged=[];
      for(const word of [...(value.recentWords||[]),...(shared.recentWords||[])]){
        if(typeof word!=='string'||!word||seen.has(word))continue;
        seen.add(word);
        merged.push(word);
        if(merged.length>=180)break;
      }
      value.recentWords=merged;
    }catch(_){/* keep original parsed value */}
    return value;
  };
})();
