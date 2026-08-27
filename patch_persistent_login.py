from pathlib import Path

FILES = [Path('index.html'), Path('stats.html')]


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Could not find {label}')
    return text.replace(old, new, 1)

# Main game
path = Path('index.html')
text = path.read_text(encoding='utf-8')

text = replace_once(
    text,
    '    sessionStorage.setItem("anitasWordPathActiveProfile",activeProfileName);',
    '    localStorage.setItem("anitasWordPathActiveProfile",activeProfileName);',
    'game login storage',
)

text = replace_once(
    text,
    '    sessionStorage.removeItem("anitasWordPathActiveProfile");',
    '    localStorage.removeItem("anitasWordPathActiveProfile");\n    sessionStorage.removeItem("anitasWordPathActiveProfile");',
    'game switch player storage clear',
)

text = replace_once(
    text,
    '''  /* Resume the local profile for this browser tab. This keeps the user signed
     in when moving between the game and the statistics page. */
  const resumedProfile=sessionStorage.getItem("anitasWordPathActiveProfile");
  if(resumedProfile&&LOCAL_PROFILES[resumedProfile]){
    activeProfileName=resumedProfile;
    pendingProfileName=resumedProfile;
    playerStats=loadStats(activeProfileName);
    startPlayerName.textContent=activeProfileName;
    gamePlayerName.textContent=activeProfileName;
    renderProfileSummary();
    updatePausedResumeButton();
    loginScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
  }
''',
    '''  /* Automatically restore the last authenticated local profile on this device.
     The remembered value contains only the profile name; all progress and the local
     profile lock stay in this browser. Switch player clears the remembered profile. */
  const legacySessionProfile=sessionStorage.getItem("anitasWordPathActiveProfile");
  const resumedProfile=localStorage.getItem("anitasWordPathActiveProfile")||legacySessionProfile;
  if(resumedProfile&&LOCAL_PROFILES[resumedProfile]){
    localStorage.setItem("anitasWordPathActiveProfile",resumedProfile);
    sessionStorage.removeItem("anitasWordPathActiveProfile");
    activeProfileName=resumedProfile;
    pendingProfileName=resumedProfile;
    playerStats=loadStats(activeProfileName);
    startPlayerName.textContent=activeProfileName;
    gamePlayerName.textContent=activeProfileName;
    renderProfileSummary();
    updatePausedResumeButton();
    loginScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
  }else if(resumedProfile){
    localStorage.removeItem("anitasWordPathActiveProfile");
    sessionStorage.removeItem("anitasWordPathActiveProfile");
  }
''',
    'game startup restore',
)

path.write_text(text, encoding='utf-8')

# Statistics page
path = Path('stats.html')
text = path.read_text(encoding='utf-8')

text = replace_once(
    text,
    '    sessionStorage.setItem("anitasWordPathActiveProfile",pendingProfile);',
    '    localStorage.setItem("anitasWordPathActiveProfile",pendingProfile);',
    'stats login storage',
)

text = replace_once(
    text,
    '    sessionStorage.removeItem("anitasWordPathActiveProfile");',
    '    localStorage.removeItem("anitasWordPathActiveProfile");\n    sessionStorage.removeItem("anitasWordPathActiveProfile");',
    'stats switch player storage clear',
)

text = replace_once(
    text,
    '''  /* If the game already authenticated a local profile in this tab, open its
     statistics immediately without asking for the PIN a second time. */
  const resumedProfile=sessionStorage.getItem("anitasWordPathActiveProfile");
  if(resumedProfile&&PROFILES[resumedProfile]){
    pendingProfile=resumedProfile;
    render(resumedProfile);
  }
''',
    '''  /* Reuse the remembered local profile from the game, including after the
     browser has been closed and reopened. Switch player clears this device login. */
  const legacySessionProfile=sessionStorage.getItem("anitasWordPathActiveProfile");
  const resumedProfile=localStorage.getItem("anitasWordPathActiveProfile")||legacySessionProfile;
  if(resumedProfile&&PROFILES[resumedProfile]){
    localStorage.setItem("anitasWordPathActiveProfile",resumedProfile);
    sessionStorage.removeItem("anitasWordPathActiveProfile");
    pendingProfile=resumedProfile;
    render(resumedProfile);
  }else if(resumedProfile){
    localStorage.removeItem("anitasWordPathActiveProfile");
    sessionStorage.removeItem("anitasWordPathActiveProfile");
  }
''',
    'stats startup restore',
)

path.write_text(text, encoding='utf-8')

# Hard requirements / sanity checks
index = Path('index.html').read_text(encoding='utf-8')
stats = Path('stats.html').read_text(encoding='utf-8')
assert 'localStorage.setItem("anitasWordPathActiveProfile",activeProfileName)' in index
assert 'localStorage.getItem("anitasWordPathActiveProfile")||legacySessionProfile' in index
assert 'localStorage.removeItem("anitasWordPathActiveProfile")' in index
assert 'localStorage.setItem("anitasWordPathActiveProfile",pendingProfile)' in stats
assert 'localStorage.getItem("anitasWordPathActiveProfile")||legacySessionProfile' in stats
assert 'const RESET_DELAY = 1500;' in index
assert 'Hint tiles highlighted' in index
