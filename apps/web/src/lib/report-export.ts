import {wavePoints,wavePath,barcodeRuns,dimensionScores,radarPoints,histogramPoints} from './report-math';
import type {PictureAnalysis} from './report-math';
export type ReportSnapshot={id:string;timestamp:string;score:number;title:string;message:string;correct:boolean[];image:HTMLImageElement;analysis:PictureAnalysis;photoTitle:string;place:string;archive:string};

export async function renderReport(s:ReportSnapshot,element:HTMLElement):Promise<Blob>{
 const css=getComputedStyle(element),ink='#222222',paper='#F4F3EE',muted='#6c706b',blue='#1E4D54',orange='#B86B35';
 const mono=css.getPropertyValue('--quiz-mono').trim(),serif=css.getPropertyValue('--serif-zh').trim();
 await Promise.all([
  document.fonts.load(`400 28px "Noto Serif SC"`,s.photoTitle+s.place+'合焦光影偏爱直觉'),
  document.fonts.load(`600 30px "Noto Serif SC"`,s.message),
  document.fonts.load(`700 56px "Noto Serif SC"`,s.title),
 ]);
 await document.fonts.ready;

 // All geometry and type sizes are logical pixels on a 1080px artboard.
 // Only the backing store is doubled; text never shrinks to fit a module.
 const width=1080,scale=2,x=18,w=1044,gap=6,half=(w-gap)/2,right=x+half+gap,pad=14;
 const output=document.createElement('canvas'),c=output.getContext('2d');
 if(!c)throw Error('无法生成图片');
 const font=(size:number,family=mono,weight=400)=>`${weight} ${size}px ${family}`;
 const wrapLines=(value:string,maxWidth:number,size:number,weight=600)=>{
  c.font=font(size,serif,weight);
  // Closing punctuation travels with the preceding character, including after rebalancing.
  const units=value.match(/.[，。！？；：、）》」』】”’…]*/gu)||[],lines:string[]=[];let current='';
  for(const unit of units){if(current&&c.measureText(current+unit).width>maxWidth){lines.push(current);current='';}current+=unit;}
  if(current)lines.push(current);
  if(lines.length>1&&lines.at(-1)!.length<4){
   const previous=lines.at(-2)!.match(/.[，。！？；：、）》」』】”’…]*/gu)!;
   while(lines.at(-1)!.length<4&&previous.length>1){const next=previous.at(-1)!+lines.at(-1)!;if(c.measureText(next).width>maxWidth)break;lines[lines.length-1]=previous.pop()!+lines.at(-1)!;}
   lines[lines.length-2]=previous.join('');
  }
  return lines;
 };
 const message=wrapLines(s.message,half-pad*2,30),top=90,topHeight=Math.max(530,478+(message.length-1)*45+24);
 const waveY=top+topHeight+gap,waveHeight=200,photoY=waveY+waveHeight+gap;
 const photoWidth=w-40,photoHeight=Math.round(photoWidth/(s.image.naturalWidth/s.image.naturalHeight));
 const photoBand=40,photoBoxHeight=photoHeight+photoBand*2,telemetryY=photoY+photoBoxHeight+gap,telemetryHeight=230;
 const qr:{size:number;bits:string}=JSON.parse(element.dataset.qr!),cell=2,codeSize=(qr.size+8)*cell;
 const footerY=telemetryY+telemetryHeight+gap,footerHeight=Math.max(106,codeSize+24),height=footerY+footerHeight+18;
 output.width=width*scale;output.height=height*scale;c.scale(scale,scale);c.fillStyle=paper;c.fillRect(0,0,width,height);
 let seed=17;c.fillStyle='#22222209';
 for(let i=0;i<Math.round(width*height/30);i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const xx=seed%(width*2);seed=(Math.imul(seed,1664525)+1013904223)>>>0;c.fillRect(xx/2,(seed%(height*2))/2,.5,.5);}
 const text=(value:string,xx:number,yy:number,size=22,color=muted,family=mono,weight=400,align:CanvasTextAlign='left')=>{
  if(size<20)throw Error('报告文字不得小于 20px');
  c.font=font(size,family,weight);c.fillStyle=color;c.textAlign=align;c.fillText(value,xx,yy);c.textAlign='left';
 };
 const line=(x1:number,y1:number,x2:number,y2:number,color='#9ca69c',weight=1)=>{c.beginPath();c.strokeStyle=color;c.lineWidth=weight;c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();};
 const box=(xx:number,yy:number,ww:number,hh:number)=>{c.strokeStyle='#9ca69c';c.lineWidth=1;c.strokeRect(xx,yy,ww,hh);};
 const path=(d:string,color:string,weight=2,fill?:string|CanvasGradient)=>{const p=new Path2D(d);if(fill){c.fillStyle=fill;c.fill(p);}c.strokeStyle=color;c.lineWidth=weight;c.stroke(p);};
 const dot=(xx:number,yy:number,r:number,color:string,filled:boolean)=>{c.beginPath();c.arc(xx,yy,r,0,2*Math.PI);c.fillStyle=filled?color:paper;c.fill();c.strokeStyle=color;c.lineWidth=2;c.stroke();};
 const corners=(xx:number,yy:number,ww:number,hh:number,len:number,color:string)=>{
  for(const [px,py,sx,sy] of [[xx,yy,1,1],[xx+ww,yy,-1,1],[xx,yy+hh,1,-1],[xx+ww,yy+hh,-1,-1]]){line(px,py,px+sx*len,py,color,1.2);line(px,py,px,py+sy*len,color,1.2);}
 };

 box(x,18,w,66);text('REVERIAN OPTICAL LAB // '+s.id,x+pad,59,24,ink);
 const pillWidth=254,pillX=x+w-pad-pillWidth;
 c.fillStyle=blue;c.beginPath();c.roundRect(pillX,30,pillWidth,42,21);c.fill();
 text('[',pillX+16,59,24,paper);dot(pillX+47,51,4,orange,true);text('AF-C LOCKED ]',pillX+64,59,24,paper);

 box(x,top,half,topHeight);box(right,top,half,topHeight);
 text('00 // SYNC',x+pad,top+30);text('01 // RESONANCE RADAR',right+pad,top+30);
 const cx=x+half/2,cy=top+280,r=158,innerRadius=143;
 text(s.title,cx,top+94,56,blue,serif,700,'center');
 c.strokeStyle='#7a8d87';c.lineWidth=1.5;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.stroke();
 for(let i=0;i<100;i++){const angle=i*Math.PI/50;line(cx+Math.cos(angle)*(r-4),cy+Math.sin(angle)*(r-4),cx+Math.cos(angle)*(r-(i%5===0?12:8)),cy+Math.sin(angle)*(r-(i%5===0?12:8)),'#7a8d87',1.4);}
 c.strokeStyle='#1E4D5430';c.lineWidth=1.5;c.beginPath();c.arc(cx,cy,innerRadius,0,2*Math.PI);c.stroke();
 c.strokeStyle=blue;c.lineWidth=3;c.beginPath();c.arc(cx,cy,innerRadius,-Math.PI/2,-Math.PI/2+Math.PI*2*s.score/10);c.stroke();
 c.font=font(130,mono,700);const digits=[...String(s.score)],digitWidth=c.measureText('0').width,digitAdvance=digits.length>1?60:digitWidth,scoreWidth=digitWidth+(digits.length-1)*digitAdvance;
 c.font=font(34,serif);const unitWidth=c.measureText('/ 合焦').width,scoreX=cx-(scoreWidth+10+unitWidth)/2;
 digits.forEach((digit,i)=>text(digit,scoreX+i*digitAdvance,cy+40,130,blue,mono,700));text('/ 合焦',scoreX+scoreWidth+10,cy+31,34,ink,serif);
 message.forEach((row,i)=>text(row,x+pad,top+478+i*45,30,ink,serif,600));

 const radarX=right+206,radarY=top+279,radius=150,dims=dimensionScores(s.correct),radar=radarPoints(dims,radarX,radarY,radius);
 for(const ratio of [.25,.5,.75,1]){c.beginPath();c.arc(radarX,radarY,radius*ratio,0,2*Math.PI);c.strokeStyle='#89958c';c.lineWidth=1.1;c.stroke();}
 radarPoints([1,1,1],radarX,radarY,radius).forEach(p=>line(radarX,radarY,p.x,p.y,'#89958c',1.1));
 path(radar.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' ')+'Z',orange,2.4,'#B86B3530');radar.forEach(p=>dot(p.x,p.y,4,orange,true));
 [[radarX,top+87],[radarX-128,top+463],[radarX+128,top+463]].forEach(([xx,yy],i)=>{text(['光影','偏爱','直觉'][i],xx,yy,26,ink,serif,400,'center');text(Math.round(dims[i]*100)+'%',xx,yy+31,26,ink,mono,400,'center');});
 const evX=right+408,evTop=top+91,evHeight=348;
 line(evX,top+62,evX,top+topHeight-22);
 for(let i=0;i<=40;i++){const yy=evTop+i*evHeight/40;line(evX+(i%10===0?18:27),yy,evX+42,yy,'#596961',1.2);}
 ['+2','+1','0','−1','−2'].forEach((t,i)=>text(t,evX+52,evTop+8+i*evHeight/4,22,ink));text('REL. EV',evX+8,top+topHeight-17,20);
 const evY=evTop+(2-s.analysis.relativeEV)/4*evHeight;path(`M${evX+7} ${evY-5}L${evX+16} ${evY}L${evX+7} ${evY+5}Z`,orange,1,orange);

 box(x,waveY,w,waveHeight);text('02 // WAVEFORM',x+pad,waveY+30);
 const {mine,visitor}=wavePoints(s.correct),plotLeft=x+42,plotWidth=w-84;
 const mapPoint=(p:{x:number;y:number})=>({x:plotLeft+(p.x-30)/540*plotWidth,y:waveY+66+p.y*.65});
 for(let i=0;i<=90;i++){const xx=plotLeft+i*plotWidth/90,len=i%10===0?14:i%5===0?10:6;line(xx,waveY+47,xx,waveY+47+len,'#61716a',1.25);line(xx,waveY+157,xx,waveY+157-len,'#61716a',1.25);}
 const mainWave=mine.map(mapPoint),visitorWave=visitor.map(mapPoint);
 path(wavePath(mainWave),blue,2.7);c.setLineDash([7,5]);path(wavePath(visitorWave),orange,2.7);c.setLineDash([]);
 s.correct.forEach((same,i)=>{dot(mainWave[i].x,mainWave[i].y,5.5,blue,same);if(!same)dot(visitorWave[i].x,visitorWave[i].y,5.5,orange,false);text(String(i+1).padStart(2,'0'),mainWave[i].x,waveY+185,26,ink,mono,400,'center');});

 const imageX=x+20,imageTop=photoY+photoBand;
 c.fillStyle='#20251f';c.fillRect(x,photoY,w,photoBoxHeight);
 text('REVF // PIXEL LAB',imageX,photoY+26,20,'#c8c8b9');text(s.archive,x+w-20,photoY+26,20,'#c8c8b9',mono,400,'right');
 c.save();c.beginPath();c.roundRect(imageX,imageTop,photoWidth,photoHeight,5);c.clip();c.drawImage(s.image,imageX,imageTop,photoWidth,photoHeight);
 const fx=width/2,fy=imageTop+photoHeight/2,vignette=c.createRadialGradient(fx,fy,photoHeight*.35,fx,fy,photoWidth*.62);
 vignette.addColorStop(0,'#10150f00');vignette.addColorStop(1,'#10150f48');c.fillStyle=vignette;c.fillRect(imageX,imageTop,photoWidth,photoHeight);c.restore();
 corners(imageX+12,imageTop+12,photoWidth-24,photoHeight-24,25,'#f4f3ee90');
 corners(fx-56,fy-38,112,76,16,'#ffffff65');line(fx-12,fy,fx+12,fy,'#ffffff80',1.4);line(fx,fy-12,fx,fy+12,'#ffffff80',1.4);
 text(s.photoTitle,imageX,imageTop+photoHeight+26,22,'#c8c8b9',serif);text('REVERIAN / VISUAL ARCHIVE',x+w-20,imageTop+photoHeight+26,20,'#c8c8b9',mono,400,'right');

 box(x,telemetryY,half,telemetryHeight);box(right,telemetryY,half,telemetryHeight);
 text('03 // LUMINANCE',x+pad,telemetryY+31);text(`${s.analysis.brightness} / 100`,x+half-pad,telemetryY+31,22,blue,mono,400,'right');text('04 // CHROMATIC DNA',right+pad,telemetryY+31);
 const chartWidth=half-2*pad,chartHeight=102,peak=Math.max(1,...s.analysis.coolHistogram,...s.analysis.warmHistogram);
 c.save();c.translate(x+pad,telemetryY+50);line(0,chartHeight,chartWidth,chartHeight);
 path(wavePath(histogramPoints(s.analysis.coolHistogram,chartWidth,chartHeight,peak))+`L${chartWidth} ${chartHeight}H0Z`,'#537784',1.6,'#53778455');
 path(wavePath(histogramPoints(s.analysis.warmHistogram,chartWidth,chartHeight,peak))+`L${chartWidth} ${chartHeight}H0Z`,orange,1.6,'#B86B3545');c.restore();
 text('0 / SHADOW',x+pad,telemetryY+178,20);text('255 / LIGHT',x+half-pad,telemetryY+178,20,muted,mono,400,'right');text(s.place,x+pad,telemetryY+214,28,ink,serif);
 const swatchWidth=(half-2*pad)/5;
 s.analysis.palette.forEach((color,i)=>{const sx=right+pad+i*swatchWidth;c.fillStyle=color;c.fillRect(sx,telemetryY+58,swatchWidth-5,54);text(color,sx+(swatchWidth-5)/2,telemetryY+140,22,muted,mono,400,'center');});
 const a=s.analysis,barX=right+pad,barW=half-2*pad,barY=telemetryY+167,thermal=c.createLinearGradient(barX,0,barX+barW,0);
 thermal.addColorStop(0,'#537784');thermal.addColorStop(.5,'#d6d8d1');thermal.addColorStop(1,orange);c.fillStyle=thermal;c.fillRect(barX,barY,barW,7);
 const pointer=barX+barW*(.5+(a.warm-a.cool)/200);line(pointer,barY-7,pointer,barY+15,ink,1.5);
 text(`${a.cool}% COOL`,barX,telemetryY+214,22);text(`${a.neutral}% NEUTRAL`,barX+barW/2,telemetryY+214,22,muted,mono,400,'center');text(`${a.warm}% WARM`,barX+barW,telemetryY+214,22,muted,mono,400,'right');

 box(x,footerY,w,footerHeight);
 const domain=element.querySelector('[data-report-domain]')?.textContent||'',codeY=footerY+(footerHeight-codeSize)/2,qrX=x+w-12-codeSize;
 text(domain+' · '+s.timestamp,x+pad,footerY+footerHeight/2+7,22,ink);
 const barcode=element.dataset.barcode!,barWidth=(barcode.length+20)/2,barsX=qrX-38-barWidth;
 c.fillStyle='#fff';c.fillRect(barsX,codeY,barWidth,codeSize);c.fillStyle=ink;
 for(const {start,width:runWidth} of barcodeRuns(barcode))c.fillRect(barsX+(start+10)/2,codeY+8,runWidth/2,codeSize-16);
 c.save();c.translate(qrX-16,codeY+codeSize/2);c.rotate(Math.PI/2);text('DX',0,9,30,ink,mono,700,'center');c.restore();
 // Integer modules plus four white quiet modules remain crisp at 1x and 2x export size.
 c.fillStyle='#fff';c.fillRect(qrX,codeY,codeSize,codeSize);c.fillStyle=ink;
 [...qr.bits].forEach((v,i)=>{if(v==='1')c.fillRect(qrX+(i%qr.size+4)*cell,codeY+(Math.floor(i/qr.size)+4)*cell,cell,cell);});
 box(10,10,width-20,height-20);
 return new Promise((resolve,reject)=>output.toBlob(blob=>blob?resolve(blob):reject(Error('图片导出失败')),'image/png'));
}
