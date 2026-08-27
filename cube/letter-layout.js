(()=>{
  'use strict';

  const proto=globalThis.CanvasRenderingContext2D?.prototype;
  if(!proto||proto.__anitasOpticalLetterCenteringV2)return;
  Object.defineProperty(proto,'__anitasOpticalLetterCenteringV2',{value:true});

  const original=proto.fillText;
  const NORMALIZE=100;
  const FONT_SCALE=.79;

  proto.fillText=function(text,x,y,maxWidth){
    if(this.canvas?.id!=='cubeCanvas'||typeof text!=='string'||text.length!==1){
      return maxWidth===undefined
        ? original.call(this,text,x,y)
        : original.call(this,text,x,y,maxWidth);
    }

    const oldFont=this.font;
    const match=oldFont.match(/([0-9]*\.?[0-9]+)px/);

    /* Cube letters are drawn in a transformed local coordinate system with a
       sub-pixel font size (about 0.58px before the face transform). Safari
       reports reliable glyph bounds at that scale, while some Android canvas
       implementations round the bounding-box metrics differently. Measure the
       exact same glyph at 100x scale and compensate the transform by 100x.
       The final rendered size is unchanged, but the optical centring becomes
       stable across Safari/Chrome/Android WebView. */
    if(match&&typeof this.getTransform==='function'){
      const baseSize=parseFloat(match[1]);
      const matrix=this.getTransform();
      this.save();

      try{
        this.setTransform(
          matrix.a/NORMALIZE,
          matrix.b/NORMALIZE,
          matrix.c/NORMALIZE,
          matrix.d/NORMALIZE,
          matrix.e,
          matrix.f
        );

        const measuredSize=baseSize*FONT_SCALE*NORMALIZE;
        this.font=oldFont.replace(match[0],`${measuredSize.toFixed(4)}px`);
        this.textAlign='left';
        this.textBaseline='alphabetic';

        const metrics=this.measureText(text);
        const left=Number.isFinite(metrics.actualBoundingBoxLeft)?metrics.actualBoundingBoxLeft:0;
        const right=Number.isFinite(metrics.actualBoundingBoxRight)?metrics.actualBoundingBoxRight:metrics.width;
        const ascent=Number.isFinite(metrics.actualBoundingBoxAscent)?metrics.actualBoundingBoxAscent:measuredSize*.72;
        const descent=Number.isFinite(metrics.actualBoundingBoxDescent)?metrics.actualBoundingBoxDescent:measuredSize*.18;

        const targetX=x*NORMALIZE;
        const targetY=(Math.abs(y)<=.1?0:y)*NORMALIZE;
        const drawX=targetX+(left-right)/2;
        const drawY=targetY+(ascent-descent)/2;

        return maxWidth===undefined
          ? original.call(this,text,drawX,drawY)
          : original.call(this,text,drawX,drawY,maxWidth*NORMALIZE);
      }finally{
        this.restore();
      }
    }

    /* Conservative fallback for older canvas implementations. */
    this.save();
    try{
      if(match){
        const smaller=(parseFloat(match[1])*FONT_SCALE).toFixed(4);
        this.font=oldFont.replace(match[0],`${smaller}px`);
      }
      this.textAlign='center';
      this.textBaseline='middle';
      const targetY=Math.abs(y)<=.1?0:y;
      return maxWidth===undefined
        ? original.call(this,text,x,targetY)
        : original.call(this,text,x,targetY,maxWidth);
    }finally{
      this.restore();
    }
  };
})();
