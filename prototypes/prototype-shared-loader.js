(()=>{
  'use strict';
  const script=document.currentScript;
  const root=script?new URL('../',script.src):new URL('../',location.href);
  const files=[
    ['themes-data.js','1.4.4'],
    ['variety-hotfix.js','1.5.0'],
    ['variety-profile-bridge.js','1.5.0'],
    ['words.js','1.0.0']
  ];
  document.write(files.map(([file,version])=>`<script src="${new URL(file,root).href}?v=${version}"><\/script>`).join(''));
})();
