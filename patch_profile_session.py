from pathlib import Path

SESSION_KEY='anitasWordPathActiveProfile'

# ---- index.html ----
p=Path('index.html')
text=p.read_text(encoding='utf-8')

old='''    activeProfileName=pendingProfileName;\n    playerStats=loadStats(activeProfileName);'''
new='''    activeProfileName=pendingProfileName;\n    sessionStorage.setItem("anitasWordPathActiveProfile",activeProfileName);\n    playerStats=loadStats(activeProfileName);'''
if old in text and 'sessionStorage.setItem("anitasWordPathActiveProfile",activeProfileName);' not in text:
    text=text.replace(old,new,1)

old='''    activeProfileName="";\n    pendingProfileName="";\n    playerStats=loadStats();'''
new='''    activeProfileName="";\n    pendingProfileName="";\n    sessionStorage.removeItem("anitasWordPathActiveProfile");\n    playerStats=loadStats();'''
if old in text and 'sessionStorage.removeItem("anitasWordPathActiveProfile");' not in text:
    text=text.replace(old,new,1)

old='''  window.addEventListener("resize",drawPaths);\n  updateSoundButton();\n})();'''
new='''  window.addEventListener("resize",drawPaths);\n\n  /* Resume the local profile for this browser tab. This keeps the user signed\n     in when moving between the game and the statistics page. */\n  const resumedProfile=sessionStorage.getItem("anitasWordPathActiveProfile");\n  if(resumedProfile&&LOCAL_PROFILES[resumedProfile]){\n    activeProfileName=resumedProfile;\n    pendingProfileName=resumedProfile;\n    playerStats=loadStats(activeProfileName);\n    startPlayerName.textContent=activeProfileName;\n    gamePlayerName.textContent=activeProfileName;\n    renderProfileSummary();\n    loginScreen.classList.add("hidden");\n    gameScreen.classList.add("hidden");\n    startScreen.classList.remove("hidden");\n  }\n  updateSoundButton();\n})();'''
if old in text and 'const resumedProfile=sessionStorage.getItem("anitasWordPathActiveProfile");' not in text:
    text=text.replace(old,new,1)

assert 'sessionStorage.setItem("anitasWordPathActiveProfile",activeProfileName);' in text
assert 'sessionStorage.removeItem("anitasWordPathActiveProfile");' in text
assert 'const resumedProfile=sessionStorage.getItem("anitasWordPathActiveProfile");' in text
p.write_text(text,encoding='utf-8')

# ---- stats.html ----
p=Path('stats.html')
text=p.read_text(encoding='utf-8')

old='''    render(pendingProfile);\n  }'''
new='''    sessionStorage.setItem("anitasWordPathActiveProfile",pendingProfile);\n    render(pendingProfile);\n  }'''
if old in text and 'sessionStorage.setItem("anitasWordPathActiveProfile",pendingProfile);' not in text:
    text=text.replace(old,new,1)

old='''  function reset(){\n    pendingProfile="";pinInput.value="";pinInput.disabled=true;loginBtn.disabled=true;errorEl.textContent="";'''
new='''  function reset(){\n    sessionStorage.removeItem("anitasWordPathActiveProfile");\n    pendingProfile="";pinInput.value="";pinInput.disabled=true;loginBtn.disabled=true;errorEl.textContent="";'''
if old in text and 'sessionStorage.removeItem("anitasWordPathActiveProfile");' not in text:
    text=text.replace(old,new,1)

old='''  switchBtn.addEventListener("click",reset);\n})();'''
new='''  switchBtn.addEventListener("click",reset);\n\n  /* If the game already authenticated a local profile in this tab, open its\n     statistics immediately without asking for the PIN a second time. */\n  const resumedProfile=sessionStorage.getItem("anitasWordPathActiveProfile");\n  if(resumedProfile&&PROFILES[resumedProfile]){\n    pendingProfile=resumedProfile;\n    render(resumedProfile);\n  }\n})();'''
if old in text and 'const resumedProfile=sessionStorage.getItem("anitasWordPathActiveProfile");' not in text:
    text=text.replace(old,new,1)

assert 'sessionStorage.setItem("anitasWordPathActiveProfile",pendingProfile);' in text
assert 'sessionStorage.removeItem("anitasWordPathActiveProfile");' in text
assert 'const resumedProfile=sessionStorage.getItem("anitasWordPathActiveProfile");' in text
p.write_text(text,encoding='utf-8')
