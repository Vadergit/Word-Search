from pathlib import Path
p=Path('cube/index.html')
text=p.read_text(encoding='utf-8')
text=text.replace('cube.css?v=1.1.0','cube.css?v=1.1.1')
text=text.replace('cube.js?v=1.1.0','cube.js?v=1.1.1')
text=text.replace('themes.js?v=1.1.0','themes.js?v=1.1.1')
p.write_text(text,encoding='utf-8')
