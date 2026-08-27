(()=>{
  'use strict';
  const proto=globalThis.CanvasRenderingContext2D?.prototype;
  if(!proto||proto.__anitasOpticalLetterCentering)return;
  proto.__anitasOpticalLetterCentering=true;
  const original=proto.fillText;

  proto.fillText=function(text,x,y,maxWidth){
    if(this.canvas?.id!=='cubeCanvas'||typeof text!=='string'||text.length!==1){
      return maxWidth===undefined?original.call(this,text,x,y):original.call(this,text,x,y,maxWidth);
    }

    const oldFont=this.font;
    const oldAlign=this.textAlign;
    const oldBaseline=this.textBaseline;
    const match=oldFont.match(/([0-9]*\.?[0-9]+)px/);

    if(match){
      const smaller=(parseFloat(match[1])*.79).toFixed(4);
      this.font=oldFont.replace(match[0],`${smaller}px`);
    }

    this.textAlign='left';
    this.textBaseline='alphabetic';

    const metrics=this.measureText(text);
    const size=match?parseFloat(match[1])*.79:.46;
    const left=Number.isFinite(metrics.actualBoundingBoxLeft)?metrics.actualBoundingBoxLeft:0;
    const right=Number.isFinite(metrics.actualBoundingBoxRight)?metrics.actualBoundingBoxRight:metrics.width;
    const ascent=Number.isFinite(metrics.actualBoundingBoxAscent)?metrics.actualBoundingBoxAscent:size*.72;
    const descent=Number.isFinite(metrics.actualBoundingBoxDescent)?metrics.actualBoundingBoxDescent:size*.18;

    const drawX=x+(left-right)/2;
    const targetY=Math.abs(y)<=.1?0:y;
    const drawY=targetY+(ascent-descent)/2;

    const result=maxWidth===undefined
      ? original.call(this,text,drawX,drawY)
      : original.call(this,text,drawX,drawY,maxWidth);

    this.font=oldFont;
    this.textAlign=oldAlign;
    this.textBaseline=oldBaseline;
    return result;
  };
})();
