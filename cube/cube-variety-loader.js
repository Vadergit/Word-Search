(() => {
  'use strict';

  const loaderScript = document.currentScript;
  const baseUrl = loaderScript ? new URL('.', loaderScript.src) : new URL('./', location.href);
  const sourceUrl = new URL('cube.js?v=1.4.0', baseUrl).href;

  function replaceRequired(source, pattern, replacement, label) {
    const updated = source.replace(pattern, replacement);
    if (updated === source) throw new Error(`Cube variety patch failed: ${label}`);
    return updated;
  }

  async function boot() {
    const response = await fetch(sourceUrl, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Could not load cube engine (${response.status})`);
    let source = await response.text();

    source = replaceRequired(
      source,
      "const APP_VERSION = '1.4.0';",
      "const APP_VERSION = '1.5.0';",
      'version'
    );

    const wordPickerBlock = `  const CUBE_VARIETY_KEY=\`anitasWordCubeVariety:\${activeProfileName}:\${cubeDifficulty}:v150\`;

  function loadCubeVarietyHistory(){
    try{
      const raw=JSON.parse(localStorage.getItem(CUBE_VARIETY_KEY)||'null')||{};
      return {
        recentThemes:Array.isArray(raw.recentThemes)?raw.recentThemes:[],
        recentWords:Array.isArray(raw.recentWords)?raw.recentWords:[],
        wordSets:Array.isArray(raw.wordSets)?raw.wordSets:[]
      };
    }catch(_){ return {recentThemes:[],recentWords:[],wordSets:[]}; }
  }

  function saveCubeVarietyHistory(history){
    try{ localStorage.setItem(CUBE_VARIETY_KEY,JSON.stringify(history)); }catch(_){/* optional */}
  }

  function cubeWordSetSignature(themeName,words){
    return \`\${themeName}:\${[...words].sort().join('|')}\`;
  }

  function rememberCubeVariety(themeName,words){
    const history=loadCubeVarietyHistory();
    history.recentThemes=[themeName,...history.recentThemes.filter(name=>name!==themeName)].slice(0,9);
    const wordSet=new Set(words);
    history.recentWords=[...words,...history.recentWords.filter(word=>!wordSet.has(word))].slice(0,180);
    const signature=cubeWordSetSignature(themeName,words);
    history.wordSets=[signature,...history.wordSets.filter(item=>item!==signature)].slice(0,120);
    saveCubeVarietyHistory(history);
  }

  function orderThemesForVariety(themes){
    const history=loadCubeVarietyHistory();
    const recentIndex=new Map(history.recentThemes.map((name,index)=>[name,index]));
    return shuffle(themes).sort((a,b)=>{
      const score=theme=>{
        const index=recentIndex.get(theme.name);
        const recentPenalty=index===undefined?0:(history.recentThemes.length-index)*100;
        const played=playerStats.themeProgress?.[theme.name]?.puzzles||0;
        return recentPenalty+played*3;
      };
      return score(a)-score(b);
    });
  }

  function chooseCoverWords(pool,total=TILE_COUNT){
    const cfg=CUBE_DIFFICULTIES[cubeDifficulty];
    const history=loadCubeVarietyHistory();
    const recent=new Set([...(playerStats.recentWords||[]),...history.recentWords]);

    function solve(minLen,maxLen,counts){
      const words=shuffle([...new Set(pool)].filter(w=>w.length>=minLen && w.length<=maxLen))
        .sort((a,b)=>Number(recent.has(a))-Number(recent.has(b)));
      const states=new Map([[\`0:0\`,[]]]);
      for(const word of words){
        const snapshot=[...states.entries()];
        for(const [key,list] of snapshot){
          const [sum,count]=key.split(':').map(Number);
          if(count>=12) continue;
          const next=sum+word.length;
          if(next>total) continue;
          const nextKey=\`\${next}:\${count+1}\`;
          if(!states.has(nextKey)) states.set(nextKey,[...list,word]);
        }
      }
      for(const count of counts){
        const hit=states.get(\`\${total}:\${count}\`);
        if(hit)return shuffle(hit);
      }
      return null;
    }

    return solve(cfg.minLen,cfg.maxLen,cfg.counts)
      || solve(3,14,cfg.counts)
      || solve(3,14,[7,8,9,10,6,11,5,12,4]);
  }

  function buildFullCoverCandidate`;

    source = replaceRequired(
      source,
      /  function chooseCoverWords\(pool,total=TILE_COUNT\)\{[\s\S]*?\n  \}\n\n  function buildFullCoverCandidate/,
      wordPickerBlock,
      'word picker'
    );

    const fastTemplateBlock = `  function tryFastTemplate(){
    if(!fastOrientationMaps.length) fastOrientationMaps=buildCubeOrientationMaps();
    const allowed=new Set(availableWordThemes().map(theme=>theme.name));
    const templates=(FAST_TEMPLATE_BANK[cubeDifficulty]||[]).filter(template=>allowed.has(template.theme));
    if(!templates.length) return false;
    const themeOrder=orderThemesForVariety(availableWordThemes()).map(theme=>theme.name);
    const themeRank=new Map(themeOrder.map((name,index)=>[name,index]));
    const ordered=shuffle(templates).sort((a,b)=>(themeRank.get(a.theme)??999)-(themeRank.get(b.theme)??999));
    for(const template of ordered){
      for(const orientationIndex of shuffle([...Array(fastOrientationMaps.length).keys()])){
        const candidate=fastCandidateFromTemplate(template,fastOrientationMaps[orientationIndex]);
        if(!candidate) continue;
        const fp=fingerprintForFastCandidate(candidate);
        if(playerStats.completedFingerprints.includes(fp) || fastSessionFingerprints.has(fp)) continue;
        if(!applyFastCandidate(candidate)) continue;
        fastSessionFingerprints.add(fp);
        rememberCubeVariety(candidate.theme,candidate.words);
        return true;
      }
    }
    fastSessionFingerprints.clear();
    const template=ordered[randInt(ordered.length)];
    const orientationMap=fastOrientationMaps[randInt(fastOrientationMaps.length)];
    const candidate=fastCandidateFromTemplate(template,orientationMap);
    if(!candidate || !applyFastCandidate(candidate)) return false;
    rememberCubeVariety(candidate.theme,candidate.words);
    return true;
  }

  function complexityMatches`;

    source = replaceRequired(
      source,
      /  function tryFastTemplate\(\)\{[\s\S]*?\n  \}\n\n  function complexityMatches/,
      fastTemplateBlock,
      'fast-template fallback'
    );

    const generationBlock = `  function tryGenerateFromRoute(route,strict=true,attemptsPerTheme=24){
    if(!route || route.length!==TILE_COUNT) return false;
    const history=loadCubeVarietyHistory();
    const themeOrder=orderThemesForVariety(availableWordThemes()).slice(0,6);

    for(const theme of themeOrder){
      for(let attempt=0;attempt<attemptsPerTheme;attempt++){
        const words=chooseCoverWords(theme.words);
        if(!words) break;
        const signature=cubeWordSetSignature(theme.name,words);
        if(history.wordSets.includes(signature)) continue;
        const candidate=buildFullCoverCandidate(words,route);
        if(!candidate) continue;
        const {working,paths}=candidate;
        if(!complexityMatches(words,paths,strict)) continue;
        if(!validateUniqueTargets(words,paths,working)) continue;

        if(!fastOrientationMaps.length) fastOrientationMaps=buildCubeOrientationMaps();
        const orientationMap=fastOrientationMaps[randInt(fastOrientationMaps.length)];
        const orientedBoard=Array(TILE_COUNT).fill('');
        for(let id=0;id<TILE_COUNT;id++) orientedBoard[orientationMap[id]]=working[id];
        const orientedPaths=new Map([...paths].map(([word,path])=>[word,path.map(id=>orientationMap[id])]));

        board=orientedBoard;
        targets=words;
        targetPaths=orientedPaths;
        activeWordTheme=theme;
        previousWordThemeName=theme.name;
        rememberCubeVariety(theme.name,words);
        return true;
      }
    }
    return false;
  }

  function savePuzzleCache`;

    source = replaceRequired(
      source,
      /  function tryGenerateFromRoute\(route,strict=true,attemptsPerTheme=160\)\{[\s\S]*?\n  \}\n\n  function savePuzzleCache/,
      generationBlock,
      'dynamic generator'
    );

    const puzzleBlock = `  function generatePuzzle(){
    const baseRoute=coverRoute();
    if(!baseRoute) throw new Error('Full-cover cube route is invalid.');

    // Prefer genuinely fresh combinations from the complete theme library.
    // The fixed bank remains only as a fast safety fallback.
    if(tryGenerateFromRoute(baseRoute,true,18)){ savePuzzleCache(); return; }
    if(tryGenerateFromRoute(baseRoute,false,34)){ savePuzzleCache(); return; }

    if(tryFastTemplate()) return;
    if(restorePuzzleCache()) return;
    throw new Error('Could not generate a unique full-cover cube puzzle from the available themes.');
  }

  function rotatePoint`;

    source = replaceRequired(
      source,
      /  function generatePuzzle\(\)\{[\s\S]*?\n  \}\n\n  function rotatePoint/,
      puzzleBlock,
      'generation order'
    );

    const script=document.createElement('script');
    script.textContent=`${source}\n//# sourceURL=${sourceUrl.replace(/\?.*$/, '')}?patched=v1.5.0`;
    document.head.appendChild(script);
  }

  boot().catch(error=>{
    console.error(error);
    const fallback=document.createElement('script');
    fallback.src=sourceUrl;
    document.head.appendChild(fallback);
  });
})();
