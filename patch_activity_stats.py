from pathlib import Path
import re

path=Path('index.html')
text=path.read_text(encoding='utf-8')

def replace_once(old,new,label):
    global text
    if old not in text:
        raise SystemExit(f'Could not find {label}')
    text=text.replace(old,new,1)

# ---------------------------------------------------------------------------
# Styling
# ---------------------------------------------------------------------------
css='''
    .stats-overlay{position:fixed;inset:0;background:rgba(10,20,12,.52);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;padding:18px;z-index:180}
    .stats-overlay.show{display:flex}
    .stats-panel{width:min(820px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:28px;box-shadow:0 30px 85px rgba(0,0,0,.24);padding:24px}
    .stats-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}
    .stats-head h2{margin:2px 0 4px;font-size:30px;letter-spacing:-.035em}
    .stats-head p{margin:0;color:var(--muted);font-size:12px}
    .stats-close{border:none;background:#eef3ee;color:#223027;border-radius:12px;padding:9px 12px;font-weight:850;cursor:pointer}
    .summary-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:18px}
    .summary-card{border:1px solid var(--line);background:#f8faf7;border-radius:16px;padding:13px}
    .summary-card span{display:block;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;margin-bottom:5px}
    .summary-card b{display:block;font-size:24px;letter-spacing:-.03em}.summary-card small{display:block;color:var(--muted);font-size:10px;margin-top:3px}
    .analytics-section{border:1px solid var(--line);border-radius:18px;padding:15px;margin-top:11px;background:#fff}
    .analytics-section-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:12px}.analytics-section-head strong{font-size:14px}.analytics-section-head span{color:var(--muted);font-size:10px}
    .week-bars{height:165px;display:grid;grid-template-columns:repeat(7,1fr);gap:8px;align-items:end}
    .day-bar{height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;min-width:0}
    .bar-value{font-size:11px;font-weight:900;margin-bottom:5px}.bar-track{height:110px;width:100%;max-width:44px;border-radius:10px;background:#edf2ed;display:flex;align-items:flex-end;overflow:hidden}.bar-fill{width:100%;min-height:0;border-radius:10px;background:linear-gradient(180deg,var(--accent),var(--accent2));transition:height .25s ease}.bar-label{font-size:10px;color:var(--muted);font-weight:800;margin-top:6px}
    .week-history{height:130px;display:grid;grid-template-columns:repeat(8,1fr);gap:8px;align-items:end}.history-bar{height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;min-width:0}.history-track{height:82px;width:100%;max-width:48px;border-radius:9px;background:#edf2ed;display:flex;align-items:flex-end;overflow:hidden}.history-fill{width:100%;background:#8dcd56;border-radius:9px}.history-label{font-size:9px;color:var(--muted);margin-top:5px;white-space:nowrap}.history-value{font-size:10px;font-weight:900;margin-bottom:4px}
    .recent-days{display:grid;gap:6px}.recent-day{display:grid;grid-template-columns:minmax(110px,1.3fr) repeat(3,minmax(65px,.7fr));gap:8px;align-items:center;padding:8px 10px;border-radius:11px;background:#f8faf7;font-size:11px}.recent-day .date{font-weight:850}.recent-day span:not(.date){text-align:right;color:var(--muted)}
    .stats-note{margin-top:12px;color:var(--muted);font-size:10px;line-height:1.5}
    @media(max-width:700px){.summary-cards{grid-template-columns:1fr 1fr}.stats-panel{padding:16px}.week-bars{gap:4px}.recent-day{grid-template-columns:1fr 1fr}.recent-day span:nth-child(3),.recent-day span:nth-child(4){display:none}}
'''
replace_once('    @media(max-width:900px){',css+'\n    @media(max-width:900px){','analytics css')

# ---------------------------------------------------------------------------
# Buttons
# ---------------------------------------------------------------------------
replace_once(
'''    <div class="player-bar"><div><strong id="startPlayerName">Player</strong><span>Local profile</span></div><button class="btn secondary" id="switchProfileStartBtn" type="button">Switch player</button></div>''',
'''    <div class="player-bar"><div><strong id="startPlayerName">Player</strong><span>Local profile</span></div><div style="display:flex;gap:7px;flex-wrap:wrap"><button class="btn secondary" id="statsStartBtn" type="button">Statistics</button><button class="btn secondary" id="switchProfileStartBtn" type="button">Switch player</button></div></div>''',
'start statistics button')

replace_once(
'''        <button class="mode-button" id="switchProfileGameBtn" type="button">Switch player</button>
        <button class="mode-button" id="soundBtn" type="button">Sound on</button>''',
'''        <button class="mode-button" id="statsGameBtn" type="button">Statistics</button>
        <button class="mode-button" id="switchProfileGameBtn" type="button">Switch player</button>
        <button class="mode-button" id="soundBtn" type="button">Sound on</button>''',
'game statistics button')

# ---------------------------------------------------------------------------
# Statistics modal
# ---------------------------------------------------------------------------
modal='''
<div class="stats-overlay" id="statsOverlay" role="dialog" aria-modal="true" aria-labelledby="statsTitle">
  <div class="stats-panel">
    <div class="stats-head">
      <div><div class="start-kicker">Local activity</div><h2 id="statsTitle">Statistics</h2><p id="statsSubtitle"></p></div>
      <button class="stats-close" id="statsCloseBtn" type="button">Close</button>
    </div>
    <div class="summary-cards">
      <div class="summary-card"><span>Today</span><b id="statToday">0</b><small>puzzles</small></div>
      <div class="summary-card"><span>This week</span><b id="statWeek">0</b><small>Monday – Sunday</small></div>
      <div class="summary-card"><span>Average / day</span><b id="statAverage">0.0</b><small>since tracking began</small></div>
      <div class="summary-card"><span>Best day</span><b id="statBestDay">0</b><small id="statBestDate">—</small></div>
    </div>
    <div class="analytics-section">
      <div class="analytics-section-head"><strong>This week</strong><span id="weekAverageLabel"></span></div>
      <div class="week-bars" id="weekBars"></div>
    </div>
    <div class="analytics-section">
      <div class="analytics-section-head"><strong>Last 8 weeks</strong><span>Puzzles per calendar week</span></div>
      <div class="week-history" id="weekHistory"></div>
    </div>
    <div class="analytics-section">
      <div class="analytics-section-head"><strong>Last 14 days</strong><span>Puzzles · score · words</span></div>
      <div class="recent-days" id="recentDays"></div>
    </div>
    <div class="stats-note" id="statsNote"></div>
  </div>
</div>
'''
replace_once('\n<script>\n(() => {',modal+'\n<script>\n(() => {','analytics modal')

# ---------------------------------------------------------------------------
# DOM refs
# ---------------------------------------------------------------------------
replace_once(
'''  const switchProfileGameBtn = document.getElementById("switchProfileGameBtn");''',
'''  const switchProfileGameBtn = document.getElementById("switchProfileGameBtn");
  const statsStartBtn = document.getElementById("statsStartBtn");
  const statsGameBtn = document.getElementById("statsGameBtn");
  const statsOverlay = document.getElementById("statsOverlay");
  const statsCloseBtn = document.getElementById("statsCloseBtn");
  const statsTitle = document.getElementById("statsTitle");
  const statsSubtitle = document.getElementById("statsSubtitle");
  const statToday = document.getElementById("statToday");
  const statWeek = document.getElementById("statWeek");
  const statAverage = document.getElementById("statAverage");
  const statBestDay = document.getElementById("statBestDay");
  const statBestDate = document.getElementById("statBestDate");
  const weekAverageLabel = document.getElementById("weekAverageLabel");
  const weekBars = document.getElementById("weekBars");
  const weekHistory = document.getElementById("weekHistory");
  const recentDays = document.getElementById("recentDays");
  const statsNote = document.getElementById("statsNote");''',
'analytics DOM refs')

# ---------------------------------------------------------------------------
# Persistent daily activity data
# ---------------------------------------------------------------------------
replace_once(
'''    completedPuzzles:[],completedFingerprints:[]
  };''',
'''    completedPuzzles:[],completedFingerprints:[],activityDays:{},analyticsStartedAt:""
  };''',
'activity defaults')

replace_once(
'''        themeProgress:raw.themeProgress||{},dailyBest:raw.dailyBest||{},recentWords:raw.recentWords||[],
        completedPuzzles:raw.completedPuzzles||[],completedFingerprints:raw.completedFingerprints||[]};''',
'''        themeProgress:raw.themeProgress||{},dailyBest:raw.dailyBest||{},recentWords:raw.recentWords||[],
        completedPuzzles:raw.completedPuzzles||[],completedFingerprints:raw.completedFingerprints||[],
        activityDays:raw.activityDays||{}};''',
'activity load migration')

# ---------------------------------------------------------------------------
# Analytics helpers immediately after previousDateKey
# ---------------------------------------------------------------------------
replace_once(
'''  function hashSeed(seed){''',
'''  function localDateFromKey(key){
    const [y,m,d]=key.split("-").map(Number);
    return new Date(y,m-1,d,12,0,0,0);
  }

  function addDays(date,amount){
    const out=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12,0,0,0);
    out.setDate(out.getDate()+amount);
    return out;
  }

  function mondayOf(date){
    const out=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12,0,0,0);
    const offset=(out.getDay()+6)%7;
    out.setDate(out.getDate()-offset);
    return out;
  }

  function activityFor(key){
    return playerStats.activityDays?.[key]||{puzzles:0,score:0,words:0,bonus:0,hints:0,mistakes:0};
  }

  function sumRange(start,days){
    const total={puzzles:0,score:0,words:0,bonus:0,hints:0,mistakes:0};
    for(let i=0;i<days;i++){
      const item=activityFor(dateKey(addDays(start,i)));
      Object.keys(total).forEach(k=>total[k]+=item[k]||0);
    }
    return total;
  }

  function formatDate(date,options={day:"2-digit",month:"short"}){
    return date.toLocaleDateString("en-GB",options);
  }

  function renderStatistics(){
    const today=new Date();
    const todayKey=dateKey(today);
    const weekStart=mondayOf(today);
    const elapsed=((today.getDay()+6)%7)+1;
    const weekTotal=sumRange(weekStart,7);
    const todayData=activityFor(todayKey);
    const entries=Object.entries(playerStats.activityDays||{}).filter(([,v])=>(v?.puzzles||0)>0);
    const trackedPuzzles=entries.reduce((sum,[,v])=>sum+(v.puzzles||0),0);

    let calendarDays=1;
    if(playerStats.analyticsStartedAt){
      const start=localDateFromKey(playerStats.analyticsStartedAt);
      calendarDays=Math.max(1,Math.floor((new Date(today.getFullYear(),today.getMonth(),today.getDate())-new Date(start.getFullYear(),start.getMonth(),start.getDate()))/86400000)+1);
    }

    let bestKey="",bestCount=0;
    entries.forEach(([key,v])=>{if((v.puzzles||0)>bestCount){bestCount=v.puzzles||0;bestKey=key}});

    statsTitle.textContent=`${activeProfileName} · Statistics`;
    statsSubtitle.textContent=`${playerStats.totalPuzzles} puzzles completed in this local profile`;
    statToday.textContent=todayData.puzzles||0;
    statWeek.textContent=weekTotal.puzzles;
    statAverage.textContent=(trackedPuzzles/calendarDays).toFixed(1);
    statBestDay.textContent=bestCount;
    statBestDate.textContent=bestKey?formatDate(localDateFromKey(bestKey),{weekday:"short",day:"2-digit",month:"short"}):"—";
    weekAverageLabel.textContent=`${(weekTotal.puzzles/elapsed).toFixed(1)} puzzles/day so far`;

    const weekItems=Array.from({length:7},(_,i)=>{
      const date=addDays(weekStart,i),data=activityFor(dateKey(date));
      return{date,count:data.puzzles||0};
    });
    const weekMax=Math.max(1,...weekItems.map(x=>x.count));
    weekBars.innerHTML=weekItems.map(({date,count})=>`<div class="day-bar"><div class="bar-value">${count}</div><div class="bar-track"><div class="bar-fill" style="height:${count?Math.max(8,count/weekMax*100):0}%"></div></div><div class="bar-label">${formatDate(date,{weekday:"short"})}</div></div>`).join("");

    const history=[];
    for(let offset=7;offset>=0;offset--){
      const start=addDays(weekStart,-offset*7);
      const total=sumRange(start,7).puzzles;
      history.push({start,total,current:offset===0});
    }
    const historyMax=Math.max(1,...history.map(x=>x.total));
    weekHistory.innerHTML=history.map(({start,total,current})=>`<div class="history-bar"><div class="history-value">${total}</div><div class="history-track"><div class="history-fill" style="height:${total?Math.max(8,total/historyMax*100):0}%"></div></div><div class="history-label">${current?"This":formatDate(start,{day:"2-digit",month:"short"})}</div></div>`).join("");

    recentDays.innerHTML=Array.from({length:14},(_,i)=>addDays(today,-i)).map(date=>{
      const data=activityFor(dateKey(date));
      return `<div class="recent-day"><span class="date">${formatDate(date,{weekday:"short",day:"2-digit",month:"short"})}</span><span>${data.puzzles||0} puzzles</span><span>${data.score||0} pts</span><span>${data.words||0} words</span></div>`;
    }).join("");

    const activeDays=entries.length;
    const activeAverage=activeDays?trackedPuzzles/activeDays:0;
    const older=Math.max(0,(playerStats.totalPuzzles||0)-trackedPuzzles);
    const startText=playerStats.analyticsStartedAt?formatDate(localDateFromKey(playerStats.analyticsStartedAt),{day:"2-digit",month:"short",year:"numeric"}):"after your next completed puzzle";
    statsNote.textContent=`Detailed daily and weekly tracking starts ${startText}. ${trackedPuzzles} puzzles are included in the calendar data; ${older} earlier puzzles remain in the overall total only. Average on active days: ${activeAverage.toFixed(1)} puzzles.`;
  }

  function openStatistics(){
    if(!activeProfileName)return;
    if(!gameScreen.classList.contains("hidden"))resetSelection();
    renderStatistics();
    statsOverlay.classList.add("show");
  }

  function closeStatistics(){statsOverlay.classList.remove("show")}

  function hashSeed(seed){''',
'analytics helper functions')

# ---------------------------------------------------------------------------
# Record completion by calendar day
# ---------------------------------------------------------------------------
replace_once(
'''    playerStats.totalPuzzles++;
    playerStats.totalWords+=targets.length;''',
'''    playerStats.totalPuzzles++;
    playerStats.totalWords+=targets.length;

    const activityKey=dateKey();
    if(!playerStats.analyticsStartedAt)playerStats.analyticsStartedAt=activityKey;
    const activity=playerStats.activityDays[activityKey]||{puzzles:0,score:0,words:0,bonus:0,hints:0,mistakes:0};
    activity.puzzles++;
    activity.score+=score;
    activity.words+=targets.length;
    activity.bonus+=foundBonus.size;
    activity.hints+=puzzleHints;
    activity.mistakes+=puzzleMistakes;
    playerStats.activityDays[activityKey]=activity;''',
'record daily activity')

# ---------------------------------------------------------------------------
# Event bindings
# ---------------------------------------------------------------------------
replace_once(
'''  switchProfileStartBtn.addEventListener("click",switchProfile);
  switchProfileGameBtn.addEventListener("click",switchProfile);''',
'''  switchProfileStartBtn.addEventListener("click",switchProfile);
  switchProfileGameBtn.addEventListener("click",switchProfile);
  statsStartBtn.addEventListener("click",openStatistics);
  statsGameBtn.addEventListener("click",openStatistics);
  statsCloseBtn.addEventListener("click",closeStatistics);
  statsOverlay.addEventListener("click",e=>{if(e.target===statsOverlay)closeStatistics()});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&statsOverlay.classList.contains("show"))closeStatistics()});''',
'analytics event bindings')

# Safety checks
assert 'activityDays:{}' in text
assert 'This week' in text
assert 'Last 8 weeks' in text
assert 'Last 14 days' in text
assert 'activity.puzzles++' in text
assert 'const RESET_DELAY = 1500;' in text
assert 'Hint tiles highlighted' in text

path.write_text(text,encoding='utf-8')
