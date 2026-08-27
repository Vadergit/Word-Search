from pathlib import Path

js_path = Path('cube/cube.js')
html_path = Path('cube/index.html')
js = js_path.read_text(encoding='utf-8')
html = html_path.read_text(encoding='utf-8')

themes = {
    'Cosmic': ['ASTEROID','ECLIPSE','STELLAR','GRAVITY','CAPSULE','SHUTTLE','VOYAGER','NEBULA','GALAXY','METEOR','ROCKET','PLANET','COSMOS','SATURN','URANUS','MERCURY','JUPITER','ORBIT','COMET','LUNAR','SOLAR','VENUS','MARS','EARTH','MOON','SPACE','NOVA','QUASAR','PULSAR','PHOTON','AURORA','CRATER','MODULE','ALIEN','SIGNAL','PROBE','ROVER','TITAN','ORION','APOLLO','ZENITH','VACUUM','PLASMA','HELIUM','FUSION','COSMIC','STAR','ASTRO'],
    'Ocean': ['OCEAN','WHALE','SHARK','CORAL','REEF','TURTLE','DOLPHIN','OCTOPUS','ANCHOR','SAILOR','ISLAND','COAST','BEACH','WAVES','TIDAL','CURRENT','HARBOR','SEAL','ORCA','MANTA','CRAB','LOBSTER','SEAHORSE','PEARL','SHELL','STORMS','DEEP','ABYSS','PLANKTON','SEAGRASS','KELP','MARINE','SURF','BOAT','SHIP','DECK','PORT','BUOY','TRIDENT','NAUTILUS'],
    'Nature': ['FOREST','RIVER','VALLEY','MOUNTAIN','MEADOW','FLORA','FAUNA','LEAVES','BRANCH','ROOTS','STONE','ROCK','WATER','STREAM','LAKE','FIELD','GRASS','MOSS','FERN','MAPLE','CEDAR','PINE','BIRCH','DAISY','ROSE','TULIP','ORCHID','LOTUS','SUNSET','SUNRISE','RAIN','STORM','CLOUD','WIND','BREEZE','THUNDER','LIGHTNING','CANYON','CLIFF','GLACIER','DESERT','PRAIRIE','JUNGLE'],
    'Animals': ['TIGER','LION','BEAR','WOLF','HORSE','ZEBRA','GIRAFFE','MONKEY','GORILLA','PANDA','KOALA','RABBIT','OTTER','BEAVER','BADGER','MOOSE','DEER','CAMEL','LLAMA','ALPACA','EAGLE','FALCON','HAWK','PARROT','PUFFIN','PENGUIN','SWAN','DUCK','GECKO','LIZARD','IGUANA','TURTLE','SNAKE','FROG','TOAD','SALMON','TROUT','SHARK','WHALE','DOLPHIN','ORCA','MANTIS','BEETLE','BUTTERFLY','SPIDER'],
    'Adventure': ['TRAIL','QUEST','EXPLORE','JOURNEY','COMPASS','MAPS','CAMP','CAMPING','TENT','HIKE','CLIMB','RAFTING','KAYAK','CANOE','ROPE','SUMMIT','VALLEY','CANYON','BRIDGE','CAVE','TORCH','PACK','BACKPACK','BOOTS','GUIDE','PATH','TRACK','ROUTE','ESCAPE','TREASURE','ISLAND','SHIP','SAILING','FOREST','RIVER','MOUNTAIN','GLACIER','DESERT','JUNGLE','VOYAGE','DISCOVER','WANDER','OUTDOOR'],
    'Fantasy': ['DRAGON','WIZARD','CASTLE','KNIGHT','MAGIC','SPELL','POTION','FAIRY','GIANT','GOBLIN','TROLL','PHOENIX','UNICORN','MERMAID','THRONE','CROWN','SWORD','SHIELD','ARMOR','QUEST','TOWER','DUNGEON','CRYSTAL','RUNE','SPELLBOOK','WAND','CHARM','PORTAL','SHADOW','FOREST','KINGDOM','PRINCESS','PRINCE','QUEEN','KING','ROYAL','BEAST','MYTHIC','LEGEND','ORACLE','SPIRIT'],
    'Science': ['ATOM','MOLECULE','CELL','GENOME','LASER','PHOTON','QUANTUM','ENERGY','MATTER','FORCE','GRAVITY','ORBIT','PLASMA','FUSION','NEURON','TISSUE','PROTEIN','ENZYME','CARBON','OXYGEN','HELIUM','NEON','METAL','CRYSTAL','MINERAL','FOSSIL','PLANET','COMET','STAR','GALAXY','BEAKER','FLASK','TEST','THEORY','MODEL','DATA','LOGIC','NUMBER','VECTOR','MATRIX','ANGLE','FORMULA','REACTION','ACID','BASE','ELECTRON','PROTON','NEUTRON'],
    'Technology': ['CODE','ROBOT','SERVER','CLOUD','PIXEL','SCREEN','SENSOR','CAMERA','DEVICE','PHONE','TABLET','LAPTOP','KEYBOARD','MOUSE','ROUTER','MODEM','NETWORK','PACKET','SIGNAL','BINARY','DIGITAL','SYSTEM','KERNEL','MEMORY','STORAGE','DRIVER','BROWSER','SOCKET','CLIENT','SCRIPT','ENGINE','LOGIC','ARRAY','OBJECT','STRING','BUFFER','CACHE','THREAD','PROCESS','CHIP','CIRCUIT','FIRMWARE','HARDWARE','SOFTWARE','ANDROID','LINUX','WINDOWS'],
    'Bouldering': ['BOULDER','PROBLEM','CIRCUIT','CAMPUS','MANTLE','DYNO','HEELHOOK','TOEHOOK','CRIMP','SLOPER','PINCH','JUGS','CHALK','BRUSH','BETA','FLASH','SEND','PROJECT','SPOTTER','START','ARETE','SLAB','ROOF','VOLUME','HOLDS','GRIP','POWER','TENSION','CORE','BALANCE','STATIC','DYNAMIC','FOOTWORK','MATCH','CROSS','GASTON','UNDERCLING','SIDEPULL','LOCKOFF','ROUTE','CRUX','MOVE','REACH','SMEAR','EDGING'],
    'Climbing': ['CLIMB','CRIMP','SLOPER','PINCH','BELAY','ROPE','ANCHOR','CARABINER','HARNESS','CHALK','ROUTE','PITCH','CLIP','QUICKDRAW','ASCEND','DESCENT','LEDGE','CRUX','BETA','SLAB','ARETE','CHIMNEY','OVERHANG','MANTLE','FLAGGING','SMEAR','EDGING','CAMMING','NUTS','RAPPEL','WALL','SUMMIT','GEAR','BOLT','HANGER','FOOTHOLD','HANDHOLD','LOCKOFF','SIDEPULL','GASTON','JAMMING','BRIDGE','TRAVERSE','LEAD','TOPROPE'],
    'Tricking': ['BACKFLIP','FRONTFLIP','CARTWHEEL','TORNADO','KICK','HOOK','ROUND','AERIAL','GAINER','CORK','SCOOT','RAIZ','SWIPE','TWIST','COMBO','LANDING','TAKEOFF','SPIN','FLIP','KICKS','TRICK','STANCE','SETUP','FLOW','POWER','SPEED','HEIGHT','CONTROL','BALANCE','SWING','WRAP','HYPER','ROUNDKICK','HOOKKICK','CHEAT','MASTER','TRAIN','SESSION','FLOOR','STYLE','LINK','CHAIN','ROTATE'],
    'Food': ['APPLE','BANANA','ORANGE','GRAPE','LEMON','LIME','PEACH','MANGO','BERRY','CHERRY','MELON','BREAD','PASTA','PIZZA','RICE','CHEESE','BUTTER','CREAM','YOGURT','HONEY','SUGAR','SALT','PEPPER','SPICE','CURRY','SOUP','SALAD','STEAK','CHICKEN','FISH','SALMON','BURGER','TACO','WRAP','NOODLE','COOKIE','CAKE','MUFFIN','WAFFLE','PANCAKE','COFFEE','JUICE','COCOA','CHOCOLATE'],
    'Travel': ['AIRPORT','FLIGHT','TICKET','PASSPORT','LUGGAGE','HOTEL','HOSTEL','TRAIN','TAXI','METRO','FERRY','CRUISE','BEACH','ISLAND','CITY','VILLAGE','MARKET','MUSEUM','TEMPLE','CASTLE','SQUARE','BRIDGE','STREET','ROAD','ROUTE','MAPS','GUIDE','TOUR','PHOTO','TRIP','JOURNEY','VOYAGE','ARRIVAL','DEPARTURE','BORDER','CUSTOMS','STAMP','CAMERA','SUITCASE','RESORT','CABIN','TENT','TRAVEL','PLANE','PORT'],
    'Music': ['MUSIC','PIANO','GUITAR','DRUMS','VIOLIN','TRUMPET','FLUTE','CELLO','BASS','SAXOPHONE','CHORD','MELODY','RHYTHM','BEAT','TEMPO','SCALE','SONG','LYRICS','VOICE','SINGER','BAND','ALBUM','TRACK','STUDIO','RECORD','CONCERT','STAGE','MICROPHONE','SPEAKER','HEADSET','MIXER','CHORUS','VERSE','BRIDGE','HARMONY','OCTAVE','NOTE','SOUND','TUNE','DANCE'],
}

# Validate every curated theme before touching the game source.
def exact_fill_counts(words, total=54):
    words = list(dict.fromkeys(w for w in words if 4 <= len(w) <= 10))
    states = {(0, 0)}
    for word in words:
        length = len(word)
        for used, count in list(states):
            if count < 10 and used + length <= total:
                states.add((used + length, count + 1))
    return [count for count in range(7, 11) if (total, count) in states]

assert len(themes) == 14
assert sum(len(set(words)) for words in themes.values()) >= 600
for name, words in themes.items():
    assert len(set(words)) >= 38, (name, len(set(words)))
    assert all(word.isalpha() and word.isupper() and 4 <= len(word) <= 10 for word in words), name
    assert exact_fill_counts(words), f'{name} cannot fill 54 tiles exactly'


def js_theme_block():
    lines = ['  const WORD_THEMES = [']
    for name, words in themes.items():
        rendered = ','.join(repr(word) for word in words)
        lines.append(f"    {{name:{name!r},words:[{rendered}]}},")
    lines += [
        '  ];',
        '  const WORD_THEME_WORD_COUNT = WORD_THEMES.reduce((sum,theme)=>sum+new Set(theme.words).size,0);',
        '  const SPACE_WORDS = WORD_THEMES[0].words;',
    ]
    return '\n'.join(lines) + '\n'

# Version / cache busting.
js = js.replace("const APP_VERSION = '0.7.2';", "const APP_VERSION = '0.8.0';", 1)
html = html.replace('v0.7.2', 'v0.8.0')
html = html.replace('cube.css?v=0.7.2', 'cube.css?v=0.8.0')
html = html.replace('cube.js?v=0.7.2', 'cube.js?v=0.8.0')

# Replace the single Cosmic vocabulary with curated theme pools.
start = js.index('  const SPACE_WORDS = [')
end = js.index('  const LETTER_POOL =', start)
js = js[:start] + js_theme_block() + js[end:]

# Theme label in the sidebar.
html = html.replace('<div><span>Cosmic set</span><h2>Target words</h2></div>', '<div><span id="wordThemeName">Cosmic set</span><h2>Target words</h2></div>', 1)
html = html.replace('Every tile belongs to exactly one target route, so all 54 letters are covered. Every target has exactly one valid path across the complete cube; after the last target is found, the cube is fully cleared.', 'Each new cube rotates through 14 curated themes with 600+ target words. Every tile still belongs to exactly one target route, all 54 letters are covered, and every target has exactly one valid path.', 1)

# Wire the dynamic label.
anchor = "  const nextCubeBtn = document.getElementById('nextCubeBtn');\n"
insert = anchor + "  const wordThemeNameEl = document.getElementById('wordThemeName');\n"
if anchor not in js:
    raise SystemExit('Missing DOM anchor')
js = js.replace(anchor, insert, 1)

anchor = "  let currentTheme = 'dark';\n"
insert = anchor + "  let activeWordTheme = WORD_THEMES[0];\n  let previousWordThemeName = '';\n"
if anchor not in js:
    raise SystemExit('Missing theme-state anchor')
js = js.replace(anchor, insert, 1)

# Theme-aware exact-fill word selection. Target lengths can now range 4..10.
start = js.index('  function chooseCoverWords(')
end = js.index('\n  function buildFullCoverCandidate', start)
new_choose = """  function chooseCoverWords(pool,total=TILE_COUNT){
    const words=shuffle([...new Set(pool)].filter(w=>w.length>=4 && w.length<=10));
    const states=new Map([[`0:0`,[]]]);
    for(const word of words){
      const snapshot=[...states.entries()];
      for(const [key,list] of snapshot){
        const [sum,count]=key.split(':').map(Number);
        if(count>=10) continue;
        const next=sum+word.length;
        if(next>total) continue;
        const nextKey=`${next}:${count+1}`;
        if(!states.has(nextKey)) states.set(nextKey,[...list,word]);
      }
    }
    for(const count of [8,9,10,7]){
      const hit=states.get(`${total}:${count}`);
      if(hit) return shuffle(hit);
    }
    return null;
  }
"""
js = js[:start] + new_choose + js[end:]

# Generate from a random non-repeating theme, with bounded fallback to a few
# other themes if a particular letter combination cannot satisfy uniqueness.
start = js.index('  function generatePuzzle(){')
end = js.index('\n  function rotatePoint', start)
new_generate = """  function generatePuzzle(){
    const route=coverRoute();
    if(!route) throw new Error('Full-cover cube route is invalid.');

    const alternatives=WORD_THEMES.filter(theme=>theme.name!==previousWordThemeName);
    const themeOrder=shuffle(alternatives.length?alternatives:WORD_THEMES);
    const maxThemes=Math.min(4,themeOrder.length);

    for(let themeIndex=0;themeIndex<maxThemes;themeIndex++){
      const theme=themeOrder[themeIndex];
      for(let attempt=0;attempt<180;attempt++){
        const words=chooseCoverWords(theme.words);
        if(!words) break;
        const candidate=buildFullCoverCandidate(words,route);
        if(!candidate) continue;
        const {working,paths}=candidate;
        const crossFaceCount=words.filter(word=>new Set(paths.get(word).map(id=>nodeById.get(id).face)).size>1).length;
        if(crossFaceCount<3) continue;
        if(!validateUniqueTargets(words,paths,working)) continue;
        board=working;
        targets=words;
        targetPaths=paths;
        activeWordTheme=theme;
        previousWordThemeName=theme.name;
        return;
      }
    }
    throw new Error('Could not generate a unique full-cover cube puzzle from the available themes.');
  }
"""
js = js[:start] + new_generate + js[end:]

# Refresh UI copy after generation.
old = "generatePuzzle(); renderTargets(); renderBonus(); updateSelectionUI(); updateStats(); resetView(false); draw(); toast(`New cube ready · v${APP_VERSION}`);"
new = "generatePuzzle(); wordThemeNameEl.textContent=`${activeWordTheme.name} set`; renderTargets(); renderBonus(); updateSelectionUI(); updateStats(); resetView(false); draw(); toast(`New ${activeWordTheme.name} cube · v${APP_VERSION}`);"
if old not in js:
    raise SystemExit('Missing newPuzzle anchor')
js = js.replace(old, new, 1)

old = "winText.textContent=`You cleared all ${TILE_COUNT} letters by finding all ${targets.length} words, with ${crossFaceFinds} cross-face finds and ${score.toLocaleString()} points.`;"
new = "winText.textContent=`You cleared the ${activeWordTheme.name} cube: all ${TILE_COUNT} letters, ${targets.length} target words, ${crossFaceFinds} cross-face finds and ${score.toLocaleString()} points.`;"
if old not in js:
    raise SystemExit('Missing win copy anchor')
js = js.replace(old, new, 1)

# Final safety checks.
assert "const APP_VERSION = '0.8.0';" in js
assert 'const WORD_THEMES = [' in js
assert "name:'Bouldering'" in js and "name:'Climbing'" in js and "name:'Tricking'" in js
assert 'chooseCoverWords(theme.words)' in js
assert 'previousWordThemeName' in js
assert 'wordThemeNameEl.textContent' in js
assert 'cube.js?v=0.8.0' in html and 'cube.css?v=0.8.0' in html
assert 'id="wordThemeName"' in html

js_path.write_text(js, encoding='utf-8')
html_path.write_text(html, encoding='utf-8')
