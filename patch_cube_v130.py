from pathlib import Path
import json

index_path=Path('index.html')
html_path=Path('cube/index.html')
css_path=Path('cube/cube.css')
js_path=Path('cube/cube.js')

index=index_path.read_text(encoding='utf-8')
html=html_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')
js=js_path.read_text(encoding='utf-8')

def rep(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing anchor: {label}')
    return text.replace(old,new,1)

index=index.replace('v1.2.0','v1.3.0')
html=html.replace('v1.2.0','v1.3.0')
js=rep(js,"const APP_VERSION = '1.2.0';","const APP_VERSION = '1.3.0';",'app version')

html=rep(html,
'      <div class="stat-card"><span>Cross-face</span><strong id="crossStat">0</strong></div>',
'      <div class="stat-card"><span>Cross-face</span><strong id="crossStat">0</strong></div>\n      <div class="stat-card"><span>Time</span><strong id="elapsedStat">00:00.0</strong></div>',
'elapsed stat card')
html=rep(html,
'          <p><b>Finish:</b> target words are recognised automatically. For bonus words, wait 8 seconds or use <em>Check word</em>.</p>',
'          <p><b>Time:</b> the solve clock starts when the cube appears and stops when the last target word is found. Rotating the cube is part of the solve time.</p>\n          <p><b>Finish:</b> target words are recognised automatically. For bonus words, wait 8 seconds or use <em>Check word</em>.</p>',
'time help copy')
css=rep(css,
'.stats-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:14px}',
'.stats-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin-bottom:14px}',
'five stat columns')

js=rep(js,
"    completedPuzzles:[],completedFingerprints:[],cubePuzzles:0,cubeWords:0,cubeBonus:0,cubeBestScore:0",
"    completedPuzzles:[],completedFingerprints:[],cubePuzzles:0,cubeWords:0,cubeBonus:0,cubeBestScore:0,cubeBestTimeMs:0,cubeLastTimeMs:0",
'stats time defaults')
js=rep(js,
"  const crossStat = document.getElementById('crossStat');",
"  const crossStat = document.getElementById('crossStat');\n  const elapsedStat = document.getElementById('elapsedStat');",
'elapsed DOM ref')
js=rep(js,
"  let cubeHints = 0;\n  const PUZZLE_CACHE_KEY=",
"  let cubeHints = 0;\n  let solveStartedAt=0;\n  let solveFinalMs=0;\n  let solveTicker=null;\n  let fastOrientationMaps=[];\n  const fastSessionFingerprints=new Set();\n  const PUZZLE_CACHE_KEY=",
'solve state')

FAST_BANK = json.loads(r'''{"beginner":[{"theme":"Animals","words":["HAMSTER","DONKEY","MANTIS","CHEETAH","PANTHER","DOLPHIN","BUFFALO","PENGUIN"],"reverse":false},{"theme":"Ocean","words":["HARBOR","SEABED","LOBSTER","SALMON","COAST","BEACH","SQUID","ANCHOVY","SARDINE"],"reverse":false},{"theme":"Food","words":["SANDWICH","GINGER","WAFFLE","YOGURT","BISCUIT","PANCAKE","COCONUT","AVOCADO"],"reverse":true},{"theme":"Nature","words":["MEADOW","JUNGLE","SHADOW","BLOSSOM","THUNDER","VOLCANO","RAINBOW","MOUNTAIN"],"reverse":false},{"theme":"Space","words":["EARTH","NEBULA","ECLIPSE","ORBITER","LAUNCH","MILKYWAY","STARDUST","MERCURY"],"reverse":true},{"theme":"Fantasy","words":["DUNGEON","POTION","WARLOCK","SORCERER","PHOENIX","SHIELD","PORTAL","CRYSTAL"],"reverse":true},{"theme":"Sports","words":["MATCH","FIELD","WORKOUT","GOLF","ROWING","TROPHY","TEAM","STADIUM","RUGBY","POWER"],"reverse":true},{"theme":"Travel","words":["JOURNEY","HOSTEL","GUIDE","VILLAGE","HOLIDAY","MOUNTAIN","BRIDGE","PASSPORT"],"reverse":false},{"theme":"Music","words":["VOICE","BANJO","PIANO","MELODY","GUITAR","VIOLIN","TRUMPET","RHYTHM","PLAYLIST"],"reverse":false},{"theme":"Home","words":["BLANKET","GARDEN","PILLOW","STAIRS","CANDLE","CUPBOARD","BATHROOM","KITCHEN"],"reverse":false},{"theme":"Transport","words":["FUEL","HIGHWAY","MOTOR","BRIDGE","SUBWAY","SIGNAL","TRUCK","STEERING","SCOOTER"],"reverse":true},{"theme":"Weather","words":["THUNDER","SKY","WIND","MONSOON","HEAT","STORM","FREEZING","FORECAST","BLIZZARD"],"reverse":true},{"theme":"School","words":["COMPUTER","LIBRARY","CLASS","MUSIC","READING","SPORT","LUNCH","EXAM","LEARNING"],"reverse":true},{"theme":"City","words":["SQUARE","BRIDGE","CASTLE","OFFICE","THEATER","BUILDING","TRAFFIC","HOSPITAL"],"reverse":false},{"theme":"Tricking","words":["SPEED","COMBO","TAKEOFF","ROTATION","LANDING","HEIGHT","BACKFLIP","MOMENTUM"],"reverse":false},{"theme":"Bouldering","words":["MATCH","PROBLEM","FOOTWORK","SMEAR","CHALK","OVERHANG","SEQUENCE","CRIMP","JUG"],"reverse":false},{"theme":"Climbing","words":["NUT","FACE","CHALK","PARTNER","JAM","SLING","LOWER","SLAB","GRIP","BELAY","PITCH","ROPE"],"reverse":true},{"theme":"Technology","words":["VIDEO","SWITCH","STORAGE","DATABASE","TABLET","PRINTER","MONITOR","HARDWARE"],"reverse":false}],"middle":[{"theme":"Animals","words":["ORANGUTAN","CROCODILE","ALLIGATOR","CHIMPANZEE","BUTTERFLY","ELEPHANT"],"reverse":false},{"theme":"Ocean","words":["SALMON","SEABED","HARBOR","OCEAN","SQUID","ANCHOR","KELP","TURTLE","MARLIN","COVE"],"reverse":true},{"theme":"Food","words":["POMEGRANATE","PUMPKIN","COCONUT","SANDWICH","STRAWBERRY","CAULIFLOWER"],"reverse":false},{"theme":"Nature","words":["JUNGLE","WATERFALL","SNOW","RAIN","TREE","CLOUD","MEADOW","GLACIER","SUNFLOWER"],"reverse":true},{"theme":"Space","words":["MOONLIGHT","SPACESHIP","TELESCOPE","SUPERNOVA","BLACKHOLE","PLANETARY"],"reverse":false},{"theme":"Fantasy","words":["CASTLE","KINGDOM","SPELL","NECROMANCER","PHOENIX","WARLOCK","ENCHANTMENT"],"reverse":true},{"theme":"Technology","words":["STORAGE","WIRELESS","COMPUTER","DOWNLOAD","CIRCUIT","HARDWARE","SOFTWARE"],"reverse":true},{"theme":"Sports","words":["GYMNASTICS","VOLLEYBALL","TRAINING","SPRINTER","SWIMMING","BASKETBALL"],"reverse":true},{"theme":"Travel","words":["VILLAGE","SOUVENIR","BACKPACK","SIGHTSEEING","EXPLORATION","DEPARTURE"],"reverse":false},{"theme":"Music","words":["KEYBOARD","CONDUCTOR","MICROPHONE","PLAYLIST","HEADPHONES","ORCHESTRA"],"reverse":false},{"theme":"Home","words":["CURTAIN","BOOKSHELF","CANDLE","SHOWER","CLOCK","WINDOW","KNIFE","DISHWASHER"],"reverse":true},{"theme":"Transport","words":["STEERING","AMBULANCE","HIGHWAY","LOCOMOTIVE","MOTORCYCLE","HELICOPTER"],"reverse":false},{"theme":"Weather","words":["SNOWFLAKE","FORECAST","HURRICANE","BLIZZARD","LIGHTNING","TEMPERATURE"],"reverse":false},{"theme":"School","words":["SPORT","LUNCH","WRITING","BACKPACK","EXAM","LIBRARY","CALCULATOR","NOTEBOOK"],"reverse":true},{"theme":"Jobs","words":["ELECTRICIAN","BUILDER","FIREFIGHTER","MECHANIC","DESIGNER","ARCHITECT"],"reverse":false},{"theme":"City","words":["APARTMENT","SCHOOL","UNDERGROUND","RESTAURANT","HOSPITAL","SKYSCRAPER"],"reverse":false},{"theme":"Tricking","words":["BACKSIDE","TRANSITION","MOMENTUM","BALANCE","FLEXIBILITY","ROUNDHOUSE"],"reverse":false},{"theme":"Bouldering","words":["TOEHOOK","DYNAMIC","UNDERCLING","BODYTENSION","COMPRESSION","FOOTWORK"],"reverse":true},{"theme":"Climbing","words":["QUICKDRAW","CLIMBING","EXPOSURE","CARABINER","MULTIPITCH","PROTECTION"],"reverse":true}],"hard":[{"theme":"Animals","words":["ORANGUTAN","GORILLA","RHINOCEROS","CHEETAH","BUTTERFLY","HIPPOPOTAMUS"],"reverse":false},{"theme":"Ocean","words":["UNDERWATER","LAGOON","TURTLE","BARNACLE","SAILBOAT","PLANKTON","SEASHELL"],"reverse":true},{"theme":"Food","words":["SANDWICH","CHOCOLATE","AVOCADO","BLUEBERRY","STRAWBERRY","CAULIFLOWER"],"reverse":true},{"theme":"Nature","words":["BIODIVERSITY","SUNFLOWER","WILDFLOWERS","THUNDERCLOUD","RAINFOREST"],"reverse":true},{"theme":"Space","words":["RADIATION","ASTRONAUT","SATELLITE","SUPERNOVA","BLACKHOLE","SPACESHIP"],"reverse":false},{"theme":"Fantasy","words":["PORTAL","ENCHANTMENT","KINGDOM","SWORD","UNICORN","SCROLL","SHAPESHIFTER"],"reverse":true},{"theme":"Technology","words":["PROCESSOR","SEMICONDUCTOR","CYBERSECURITY","BLUETOOTH","SMARTPHONE"],"reverse":false},{"theme":"Sports","words":["TROPHY","BOXING","BASKETBALL","HIKING","MARATHON","FIELD","WEIGHTLIFTING"],"reverse":false},{"theme":"Travel","words":["BACKPACK","SOUVENIR","PASSPORT","DESTINATION","PLATFORM","SIGHTSEEING"],"reverse":true},{"theme":"Music","words":["HEADPHONES","PERCUSSION","KEYBOARD","CLARINET","SYNTHESIZER","CONCERT"],"reverse":true},{"theme":"Home","words":["FENCE","BOOKSHELF","DISHWASHER","BLANKET","DOORWAY","CUPBOARD","BATHROOM"],"reverse":true},{"theme":"Transport","words":["FERRY","TRUCK","TRACK","GARAGE","PEDAL","MOTORCYCLE","AMBULANCE","SPEEDBOAT"],"reverse":false},{"theme":"Weather","words":["PRECIPITATION","THUNDERSTORM","TEMPERATURE","SNOWFLAKE","LIGHTNING"],"reverse":false},{"theme":"School","words":["READING","LEARNING","HOMEWORK","CALCULATOR","DICTIONARY","MATHEMATICS"],"reverse":false},{"theme":"Jobs","words":["MECHANIC","PHOTOGRAPHER","PALEONTOLOGIST","FIREFIGHTER","ARCHITECT"],"reverse":false},{"theme":"City","words":["SIDEWALK","NEIGHBORHOOD","BUILDING","FOUNTAIN","RESTAURANT","HOSPITAL"],"reverse":true},{"theme":"Tricking","words":["TECHNIQUE","COMBINATION","ROUNDHOUSE","TRANSITION","DOUBLEBACKFLIP"],"reverse":false},{"theme":"Bouldering","words":["POWER","HANGBOARD","FLASH","UNDERCLING","SIDEPULL","COMPRESSION","CAMPUS"],"reverse":false},{"theme":"Climbing","words":["APPROACH","GEARPLACEMENT","REDPOINT","QUICKDRAW","EXPOSURE","CLIMBING"],"reverse":false}]}''')
fast_js = '  const FAST_TEMPLATE_BANK = Object.freeze(' + json.dumps(FAST_BANK,separators=(',',':')) + ');\n\n'
js=rep(js,"  function coverRoute(){",fast_js+"  function coverRoute(){",'fast bank insertion')

helpers=r'''  function positionKey(pos){
    return pos.map(value=>(Math.round(value*10)/10).toFixed(1)).join(',');
  }

  function buildCubeOrientationMaps(){
    const byPosition=new Map(nodes.map(node=>[positionKey(node.pos),node.id]));
    const permutations=[
      {p:[0,1,2],parity:1},{p:[0,2,1],parity:-1},{p:[1,0,2],parity:-1},
      {p:[1,2,0],parity:1},{p:[2,0,1],parity:1},{p:[2,1,0],parity:-1}
    ];
    const maps=[];
    for(const {p,parity} of permutations){
      for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
        if(parity*sx*sy*sz!==1) continue;
        const signs=[sx,sy,sz];
        const map=nodes.map(node=>{
          const q=[signs[0]*node.pos[p[0]],signs[1]*node.pos[p[1]],signs[2]*node.pos[p[2]]];
          return byPosition.get(positionKey(q));
        });
        if(map.some(id=>id===undefined) || new Set(map).size!==TILE_COUNT) throw new Error('Cube orientation map is invalid.');
        maps.push(map);
      }
    }
    return maps;
  }

  function fastCandidateFromTemplate(template,orientationMap){
    const base=coverRoute();
    if(!base) return null;
    const route=template.reverse?[...base].reverse():[...base];
    const rawBoard=Array(TILE_COUNT).fill(''),rawPaths=new Map();
    let offset=0;
    for(const word of template.words){
      const path=route.slice(offset,offset+word.length);
      if(path.length!==word.length) return null;
      path.forEach((id,index)=>rawBoard[id]=word[index]);
      rawPaths.set(word,path);
      offset+=word.length;
    }
    if(offset!==TILE_COUNT || rawBoard.some(letter=>!letter)) return null;
    const orientedBoard=Array(TILE_COUNT).fill('');
    for(let id=0;id<TILE_COUNT;id++) orientedBoard[orientationMap[id]]=rawBoard[id];
    const orientedPaths=new Map([...rawPaths].map(([word,path])=>[word,path.map(id=>orientationMap[id])]));
    return {theme:template.theme,words:[...template.words],board:orientedBoard,paths:orientedPaths};
  }

  function fingerprintForFastCandidate(candidate){
    const targetKey=[...candidate.words].sort().join(',');
    return `CUBE-${cubeDifficulty}-${candidate.theme}-${hashText(`${candidate.board.join('')}|${targetKey}`).toString(36).toUpperCase()}`;
  }

  function applyFastCandidate(candidate){
    const theme=WORD_THEMES.find(item=>item.name===candidate.theme);
    if(!theme) return false;
    board=[...candidate.board];
    targets=[...candidate.words];
    targetPaths=new Map([...candidate.paths].map(([word,path])=>[word,[...path]]));
    activeWordTheme=theme;
    previousWordThemeName=theme.name;
    return true;
  }

  function tryFastTemplate(){
    if(!fastOrientationMaps.length) fastOrientationMaps=buildCubeOrientationMaps();
    const allowed=new Set(availableWordThemes().map(theme=>theme.name));
    const templates=(FAST_TEMPLATE_BANK[cubeDifficulty]||[]).filter(template=>allowed.has(template.theme));
    if(!templates.length) return false;
    const preferred=shuffle(templates.filter(template=>template.theme!==previousWordThemeName));
    const fallback=shuffle(templates);
    const ordered=[...preferred,...fallback.filter(template=>!preferred.includes(template))];
    for(const template of ordered){
      for(const orientationIndex of shuffle([...Array(fastOrientationMaps.length).keys()])){
        const candidate=fastCandidateFromTemplate(template,fastOrientationMaps[orientationIndex]);
        if(!candidate) continue;
        const fp=fingerprintForFastCandidate(candidate);
        if(playerStats.completedFingerprints.includes(fp) || fastSessionFingerprints.has(fp)) continue;
        if(!applyFastCandidate(candidate)) continue;
        fastSessionFingerprints.add(fp);
        return true;
      }
    }
    fastSessionFingerprints.clear();
    const template=ordered[randInt(ordered.length)];
    const orientationMap=fastOrientationMaps[randInt(fastOrientationMaps.length)];
    const candidate=fastCandidateFromTemplate(template,orientationMap);
    return candidate?applyFastCandidate(candidate):false;
  }

'''
js=rep(js,"  function complexityMatches(words,paths,strict=true){",helpers+"  function complexityMatches(words,paths,strict=true){",'fast helper insertion')

js=rep(js,
"  function generatePuzzle(){\n    const baseRoute=coverRoute();",
"  function generatePuzzle(){\n    if(tryFastTemplate()) return;\n    if(restorePuzzleCache()) return;\n    throw new Error('No prevalidated cube template is available.');\n    const baseRoute=coverRoute();",
'fast generator short circuit')

clock=r'''  function formatSolveTime(ms){
    const safe=Math.max(0,Number(ms)||0);
    const minutes=Math.floor(safe/60000);
    const seconds=Math.floor((safe%60000)/1000);
    const tenths=Math.floor((safe%1000)/100);
    return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${tenths}`;
  }

  function currentSolveElapsed(){
    return solveStartedAt?Date.now()-solveStartedAt:solveFinalMs;
  }

  function updateSolveClockUI(){
    if(elapsedStat) elapsedStat.textContent=formatSolveTime(currentSolveElapsed());
  }

  function stopSolveClock(){
    if(solveStartedAt) solveFinalMs=Date.now()-solveStartedAt;
    solveStartedAt=0;
    clearInterval(solveTicker); solveTicker=null;
    updateSolveClockUI();
    return solveFinalMs;
  }

  function startSolveClock(){
    clearInterval(solveTicker);
    solveFinalMs=0;
    solveStartedAt=Date.now();
    updateSolveClockUI();
    solveTicker=setInterval(updateSolveClockUI,100);
  }

'''
js=rep(js,"  function updateStats(){",clock+"  function updateStats(){",'solve clock helpers')
js=rep(js,
"  function updateStats(){ foundStat.textContent=`${foundTargets.size}/${targets.length}`; scoreStat.textContent=score.toLocaleString(); bonusStat.textContent=String(foundBonus.size); crossStat.textContent=String(crossFaceFinds); }",
"  function updateStats(){ foundStat.textContent=`${foundTargets.size}/${targets.length}`; scoreStat.textContent=score.toLocaleString(); bonusStat.textContent=String(foundBonus.size); crossStat.textContent=String(crossFaceFinds); updateSolveClockUI(); }",
'update stats clock')

js=rep(js,
"  function newPuzzle(){\n    stopSelectionTimer();",
"  function newPuzzle(){\n    stopSolveClock();\n    stopSelectionTimer();",
'new puzzle stop clock')
js=rep(js,
"wordThemeNameEl.textContent=`${activeWordTheme.name} set`; cubeThemeBadge.textContent=`Theme: ${activeWordTheme.name}`; updateDifficultyUI(); renderTargets(); renderBonus(); updateSelectionUI(); updateStats(); resetView(false); draw(); toast(`New ${CUBE_DIFFICULTIES[cubeDifficulty].label} ${activeWordTheme.name} cube · ${activeProfileName} · v${APP_VERSION}`);",
"wordThemeNameEl.textContent=`${activeWordTheme.name} set`; cubeThemeBadge.textContent=`Theme: ${activeWordTheme.name}`; updateDifficultyUI(); renderTargets(); renderBonus(); updateSelectionUI(); updateStats(); resetView(false); draw(); startSolveClock(); toast(`New ${CUBE_DIFFICULTIES[cubeDifficulty].label} ${activeWordTheme.name} cube · ${activeProfileName} · v${APP_VERSION}`);",
'new puzzle start clock')

js=rep(js,
"    playerStats.cubeBestScore=Math.max(playerStats.cubeBestScore||0,score);\n    savePlayerStats();",
"    playerStats.cubeBestScore=Math.max(playerStats.cubeBestScore||0,score);\n    playerStats.cubeLastTimeMs=solveFinalMs;\n    if(solveFinalMs>0 && (!playerStats.cubeBestTimeMs || solveFinalMs<playerStats.cubeBestTimeMs)) playerStats.cubeBestTimeMs=solveFinalMs;\n    savePlayerStats();",
'time stats save')
js=rep(js,
"  function showWin(){\n    cubeCleared=true;\n    recordCubeCompletion();\n    draw();\n    winText.textContent=`${activeProfileName}, you cleared the ${CUBE_DIFFICULTIES[cubeDifficulty].label} ${activeWordTheme.name} cube: all ${TILE_COUNT} letters, ${targets.length} target words, ${crossFaceFinds} cross-face finds, ${cubeHints} hints and ${score.toLocaleString()} points.`;",
"  function showWin(){\n    cubeCleared=true;\n    const elapsed=stopSolveClock();\n    recordCubeCompletion();\n    draw();\n    winText.textContent=`${activeProfileName}, you cleared the ${CUBE_DIFFICULTIES[cubeDifficulty].label} ${activeWordTheme.name} cube in ${formatSolveTime(elapsed)}: all ${TILE_COUNT} letters, ${targets.length} target words, ${crossFaceFinds} cross-face finds, ${cubeHints} hints and ${score.toLocaleString()} points.`;",
'win elapsed time')

js=rep(js,
"buildGraph(); validateCrossFaceGeometry(); bindEvents();",
"buildGraph(); validateCrossFaceGeometry(); fastOrientationMaps=buildCubeOrientationMaps(); if(fastOrientationMaps.length!==24) throw new Error(`Cube orientation mismatch: ${fastOrientationMaps.length}`); bindEvents();",
'orientation startup')

index_path.write_text(index,encoding='utf-8')
html_path.write_text(html,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
js_path.write_text(js,encoding='utf-8')
print('Applied Cube v1.3.0 fast prevalidated bank + solve timer')
