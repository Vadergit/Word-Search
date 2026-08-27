from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8')

old='''    <div class="player-bar"><div><strong id="startPlayerName">Player</strong><span>Local profile</span></div><button class="btn secondary" id="switchProfileStartBtn" type="button">Switch player</button></div>'''
new='''    <div class="player-bar"><div><strong id="startPlayerName">Player</strong><span>Local profile</span></div><div style="display:flex;gap:7px;flex-wrap:wrap"><a class="btn secondary" href="stats.html">Statistics</a><button class="btn secondary" id="switchProfileStartBtn" type="button">Switch player</button></div></div>'''
if old in text:
    text=text.replace(old,new,1)
elif 'href="stats.html">Statistics</a>' not in text:
    raise SystemExit('Could not find start profile bar')

old='''        <button class="mode-button" id="switchProfileGameBtn" type="button">Switch player</button>
        <button class="mode-button" id="soundBtn" type="button">Sound on</button>'''
new='''        <a class="mode-button stats-link" href="stats.html">Statistics</a>
        <button class="mode-button" id="switchProfileGameBtn" type="button">Switch player</button>
        <button class="mode-button" id="soundBtn" type="button">Sound on</button>'''
if old in text:
    text=text.replace(old,new,1)
elif 'class="mode-button stats-link" href="stats.html"' not in text:
    raise SystemExit('Could not find game profile controls')

css='''
    a.btn{text-decoration:none}
    .mode-button.stats-link{text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
'''
anchor='    .layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:18px;align-items:start}'
if '.mode-button.stats-link{' not in text:
    if anchor not in text:
        raise SystemExit('Could not find CSS anchor')
    text=text.replace(anchor,css+'\n'+anchor,1)

assert text.count('href="stats.html"') >= 2
p.write_text(text,encoding='utf-8')
