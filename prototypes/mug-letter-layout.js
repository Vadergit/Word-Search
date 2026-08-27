(()=>{
  'use strict';
  const proto=globalThis.CanvasRenderingContext2D?.prototype;
  if(!proto||proto.__anitasMugLetterCentering)return;
  proto.__anitasMugLetterCentering=true;
  const original=proto.fillText;

  proto.fillText=function(text,x,y,maxWidth){
    const isMugGlyph=this.canvas?.width===256&&this.canvas?.height===256&&typeof text==='string'&&text.length===1;
    if(!isMugGlyph){
      return maxWidth===undefined?original.call(this,text,x,y):original.call(this,text,x,y,maxWidth);
    }

    const oldFont=this.font;
    const oldAlign=this.textAlign;
    const oldBaseline=this.textBaseline;
    const match=oldFont.match(/([0-9]*\.?[0-9]+)px/);

    if(match){
      const smaller=(parseFloat(match[1])*.80).toFixed(2);
      this.font=oldFont.replace(match[0],`${smaller}px`);
    }

    this.textAlign='left';
    this.textBaseline='alphabetic';

    const m=this.measureText(text);
    const size=match?parseFloat(match[1])*.80:110;
    const left=Number.isFinite(m.actualBoundingBoxLeft)?m.actualBoundingBoxLeft:0;
    const right=Number.isFinite(m.actualBoundingBoxRight)?m.actualBoundingBoxRight:m.width;
    const ascent=Number.isFinite(m.actualBoundingBoxAscent)?m.actualBoundingBoxAscent:size*.72;
    const descent=Number.isFinite(m.actualBoundingBoxDescent)?m.actualBoundingBoxDescent:size*.18;
    const drawX=128+(left-right)/2;
    const drawY=128+(ascent-descent)/2;

    const result=maxWidth===undefined
      ? original.call(this,text,drawX,drawY)
      : original.call(this,text,drawX,drawY,maxWidth);

    this.font=oldFont;
    this.textAlign=oldAlign;
    this.textBaseline=oldBaseline;
    return result;
  };
})();
