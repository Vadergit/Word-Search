from pathlib import Path
import re

for filename in ['index.html','cube/index.html']:
    p=Path(filename)
    text=p.read_text(encoding='utf-8')
    text=re.sub(r'themes\.js\?v=[0-9.]+','themes.js?v=1.2.0',text)
    text=re.sub(r'cube\.css\?v=[0-9.]+','cube.css?v=1.2.0',text)
    text=re.sub(r'cube\.js\?v=[0-9.]+','cube.js?v=1.2.0',text)
    p.write_text(text,encoding='utf-8')
print('v1.2.0 cache parameters fixed')
