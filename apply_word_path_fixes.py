from pathlib import Path
import re

path = Path('index.html')
text = path.read_text(encoding='utf-8')

text = text.replace(
    'Correct target spellings are accepted even if more than one valid route exists.',
    'Every target word is generated with one unique valid path.'
)

def sub_one(pattern, replacement, label):
    global text
    text2, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'Could not patch {label}: matches={count}')
    text = text2

sub_one(
    r'  function generateBoard\(\)\{.*?\n  \}\n  function renderBoard\(\)\{',
    '''  function generateBoard(){
    chooseTheme();

    /*
      Every target word MUST have exactly one valid spelling path in the
      finished board. If even one target can be traced in a second way, the
      entire candidate is rejected. This prevents a same-letter tile from a
      neighbouring word segment from becoming an alternative valid ending.
    */
    const boardAttempts=SIZE===6?80:SIZE===9?48:24;

    for(let attempt=0;attempt<boardAttempts;attempt++){
      const selectedWords=selectWordsExact(currentTheme.words,CELL_COUNT);
      const candidate=makeBoardCandidate(selectedWords);

      if(candidate.duplicateScore!==0)continue;

      board=candidate.grid;
      targets=shuffle(selectedWords);
      intendedPaths=candidate.paths;
      return;
    }

    throw new Error("Could not generate a puzzle with unique target paths.");
  }
  function renderBoard(){''',
    'generateBoard'
)

sub_one(
    r'  function makePolyline\(points,stroke,opacity=1\)\{.*?\n  \}\n\n  function drawPaths\(\)\{',
    '''  function trailWidth(){
    const cell=boardEl.children[0]?.getBoundingClientRect();
    const ratio=SIZE===6?.65:SIZE===9?.62:.60;
    return Math.max(16,(cell?.width||50)*ratio);
  }

  function makePolyline(points,stroke,opacity=1){
    if(!points.length)return null;
    const ns="http://www.w3.org/2000/svg";
    const p=document.createElementNS(ns,"polyline");
    p.setAttribute("points",points.map(pt=>`${pt.x},${pt.y}`).join(" "));
    p.setAttribute("fill","none");
    p.setAttribute("stroke",stroke);
    p.setAttribute("stroke-width",trailWidth());
    p.setAttribute("stroke-linecap","round");
    p.setAttribute("stroke-linejoin","round");
    p.setAttribute("opacity",opacity);
    return p;
  }

  function makeTrailDot(point,fill,opacity=1){
    if(!point)return null;
    const ns="http://www.w3.org/2000/svg";
    const circle=document.createElementNS(ns,"circle");
    circle.setAttribute("cx",point.x);
    circle.setAttribute("cy",point.y);
    circle.setAttribute("r",trailWidth()/2);
    circle.setAttribute("fill",fill);
    circle.setAttribute("opacity",opacity);
    return circle;
  }

  function drawPaths(){''',
    'trail helpers'
)

sub_one(
    r'    /\* Every active selection gets exactly the same trail, regardless of\n       whether it will later be valid, invalid, target, or bonus\. \*/\n    if\(selected\.length\)\{\n      const poly=makePolyline\(selected\.map\(cellCenter\),"#59c9c4",\.72\);\n      if\(poly\)svgEl\.appendChild\(poly\);\n    \}',
    '''    /* A one-cell selection gets the same visible trail cap as a longer path. */
    if(selected.length===1){
      const dot=makeTrailDot(cellCenter(selected[0]),"#59c9c4",.72);
      if(dot)svgEl.appendChild(dot);
    }else if(selected.length>1){
      const poly=makePolyline(selected.map(cellCenter),"#59c9c4",.72);
      if(poly)svgEl.appendChild(poly);
    }''',
    'single-cell trail'
)

sub_one(
    r'  function findTargetFromSelection\(\)\{.*?\n  \}\n\n  function evaluateAtTimeout\(\)\{',
    '''  function findTargetFromSelection(){
    const word=selectedWord();

    if(!targets.includes(word))return null;
    if(foundTargets.has(word))return null;

    /* Safety net: only the exact generator-assigned path may lock a target. */
    const intended=intendedPaths.get(word);
    if(!samePath(selected,intended))return null;

    return word;
  }

  function evaluateAtTimeout(){''',
    'target recognition'
)

path.write_text(text, encoding='utf-8')
