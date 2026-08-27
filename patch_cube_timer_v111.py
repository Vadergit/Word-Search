from pathlib import Path

root=Path('index.html')
cube_html_path=Path('cube/index.html')
cube_js_path=Path('cube/cube.js')

index=root.read_text(encoding='utf-8')
cube_html=cube_html_path.read_text(encoding='utf-8')
js=cube_js_path.read_text(encoding='utf-8')


def rep(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing patch anchor: {label}')
    return text.replace(old,new,1)

# Visible/cache version bump.
index=index.replace('v1.1.0','v1.1.1')
cube_html=cube_html.replace('v1.1.0','v1.1.1')
js=js.replace("const APP_VERSION = '1.1.0';","const APP_VERSION = '1.1.1';",1)

# Make the timer freeze/resume explicit and stable.
old="""  function startSelectionTimer(duration){
    clearTimeout(timerId); timerRemaining=Math.max(1,duration); timerStartedAt=performance.now(); timerId=setTimeout(evaluateSelection,timerRemaining);
    timerBar.style.transition='none'; timerBar.style.width=`${Math.max(0,Math.min(100,timerRemaining/SELECTION_MS*100))}%`;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ timerBar.style.transition=`width ${timerRemaining}ms linear`; timerBar.style.width='0%'; }));
  }

  function pauseSelectionTimer(){
    if(!timerId) return false; timerRemaining=Math.max(0,timerRemaining-(performance.now()-timerStartedAt)); clearTimeout(timerId); timerId=null;
    timerBar.style.transition='none'; timerBar.style.width=`${Math.max(0,Math.min(100,timerRemaining/SELECTION_MS*100))}%`; return true;
  }
  function resumeSelectionTimer(){ if(selected.length && timerRemaining>0) startSelectionTimer(timerRemaining); }
  function stopSelectionTimer(){ clearTimeout(timerId); timerId=null; timerRemaining=SELECTION_MS; timerBar.style.transition='none'; timerBar.style.width='0%'; }
"""
new="""  function setTimerBarImmediate(percent){
    timerBar.style.transition='none';
    timerBar.style.width=`${Math.max(0,Math.min(100,percent))}%`;
    /* Force the browser to commit the frozen width before another transition can start. */
    void timerBar.offsetWidth;
  }

  function startSelectionTimer(duration){
    clearTimeout(timerId);
    timerRemaining=Math.max(1,duration);
    timerStartedAt=performance.now();
    timerId=setTimeout(evaluateSelection,timerRemaining);
    setTimerBarImmediate(timerRemaining/SELECTION_MS*100);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(!timerId || rotating) return;
      timerBar.style.transition=`width ${timerRemaining}ms linear`;
      timerBar.style.width='0%';
    }));
  }

  function pauseSelectionTimer(){
    if(!timerId) return false;
    timerRemaining=Math.max(1,timerRemaining-(performance.now()-timerStartedAt));
    clearTimeout(timerId);
    timerId=null;
    setTimerBarImmediate(timerRemaining/SELECTION_MS*100);
    return true;
  }

  function resumeSelectionTimer(){
    if(selected.length && timerRemaining>0) startSelectionTimer(timerRemaining);
  }

  function stopSelectionTimer(){
    clearTimeout(timerId);
    timerId=null;
    timerRemaining=SELECTION_MS;
    setTimerBarImmediate(0);
  }
"""
js=rep(js,old,new,'timer functions')

old="""  function updateSelectionUI(){
    const word=selectedWord(),faces=selectedFaceCount(); currentWordEl.textContent=word||'Tap a tile to start';
    selectionMetaEl.textContent=selected.length?`${selected.length} tile${selected.length===1?'':'s'} · ${faces} face${faces===1?'':'s'} · timer pauses while rotating`:'8 seconds after every tile · or press Check word';
    checkBtn.disabled=selected.length<3; clearBtn.disabled=selected.length===0;
  }
"""
new="""  function updateSelectionUI(){
    const word=selectedWord(),faces=selectedFaceCount();
    currentWordEl.textContent=word||'Tap a tile to start';
    if(selected.length && rotating && timerPausedForRotation){
      selectionMetaEl.textContent=`Timer paused while rotating · ${(timerRemaining/1000).toFixed(1)}s remaining`;
    }else{
      selectionMetaEl.textContent=selected.length?`${selected.length} tile${selected.length===1?'':'s'} · ${faces} face${faces===1?'':'s'} · 8s timer`:'8 seconds after every tile · or press Check word';
    }
    checkBtn.disabled=selected.length<3; clearBtn.disabled=selected.length===0;
  }
"""
js=rep(js,old,new,'selection meta')

old="""  function onPointerDown(event){
    if(event.button!==undefined && event.button!==0) return;
    const hit=hitTile(event.clientX,event.clientY);
    if(hit!==null){ event.preventDefault(); selectTile(hit); return; }
    rotating=true; dragPointerId=event.pointerId; lastPointerX=event.clientX; lastPointerY=event.clientY; canvas.setPointerCapture(event.pointerId); timerPausedForRotation=pauseSelectionTimer(); stage.classList.add('rotating');
  }
"""
new="""  function onPointerDown(event){
    if(event.button!==undefined && event.button!==0) return;
    const hit=hitTile(event.clientX,event.clientY);
    if(hit!==null){ event.preventDefault(); selectTile(hit); return; }

    rotating=true;
    dragPointerId=event.pointerId;
    lastPointerX=event.clientX;
    lastPointerY=event.clientY;
    timerPausedForRotation=pauseSelectionTimer();
    updateSelectionUI();
    try{canvas.setPointerCapture(event.pointerId)}catch(_){/* optional */}
    stage.classList.add('rotating');
  }
"""
js=rep(js,old,new,'pointer down rotation')

old="""  function onPointerEnd(event){
    if(!rotating || event.pointerId!==dragPointerId) return; rotating=false; dragPointerId=null; stage.classList.remove('rotating'); canvas.style.cursor='grab';
    if(timerPausedForRotation){ timerPausedForRotation=false; resumeSelectionTimer(); }
  }

  function bindEvents(){
    canvas.addEventListener('pointerdown',onPointerDown); canvas.addEventListener('pointermove',onPointerMove); canvas.addEventListener('pointerup',onPointerEnd); canvas.addEventListener('pointercancel',onPointerEnd);
"""
new="""  function finishRotation(event=null){
    if(!rotating) return;
    if(event && event.pointerId!==undefined && dragPointerId!==null && event.pointerId!==dragPointerId) return;
    rotating=false;
    dragPointerId=null;
    stage.classList.remove('rotating');
    canvas.style.cursor='grab';
    const shouldResume=timerPausedForRotation;
    timerPausedForRotation=false;
    updateSelectionUI();
    if(shouldResume) resumeSelectionTimer();
  }

  function onPointerEnd(event){ finishRotation(event); }

  function bindEvents(){
    canvas.addEventListener('pointerdown',onPointerDown);
    canvas.addEventListener('pointermove',onPointerMove);
    canvas.addEventListener('pointerup',onPointerEnd);
    canvas.addEventListener('pointercancel',onPointerEnd);
    canvas.addEventListener('lostpointercapture',()=>finishRotation());
    window.addEventListener('blur',()=>finishRotation());
"""
js=rep(js,old,new,'rotation end robustness')

root.write_text(index,encoding='utf-8')
cube_html_path.write_text(cube_html,encoding='utf-8')
cube_js_path.write_text(js,encoding='utf-8')
print('Applied Cube timer pause v1.1.1')
