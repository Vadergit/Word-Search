(()=>{
  'use strict';

  /* Shared theme loader.
     Resolve helper files relative to this script itself, not relative to the
     current page. This is important for /cube/, where ../themes.js is loaded
     from a subdirectory. */
  const script=document.currentScript;
  const base=script?new URL('.',script.src):new URL('./',location.href);
  const dataUrl=new URL('themes-data.js?v=1.4.4',base).href;
  const isCube=/\/cube(?:\/|$)/i.test(location.pathname);

  let html=`<script src="${dataUrl}"><\/script>`;
  if(!isCube){
    const gridUrl=new URL('grid-7-8-hotfix.js?v=1.4.3',base).href;
    html+=`<script src="${gridUrl}"><\/script>`;
  }
  document.write(html);
})();