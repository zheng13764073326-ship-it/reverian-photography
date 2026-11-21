import {wavePoints,wavePath,barcodeRuns,dimensionScores,radarPoints,histogramPoints} from './report-math';
import type {PictureAnalysis} from './report-math';
export type ReportSnapshot={id:string;timestamp:string;score:number;title:string;message:string;correct:boolean[];image:HTMLImageElement;analysis:PictureAnalysis;photoTitle:string;place:string;archive:string};
export async function renderReport(s:ReportSnapshot,element:HTMLElement):Promise<Blob>{
 const css=getComputedStyle(element),ink='#222222',paper='#F4F3EE',muted='#6c706b',blue='#1E4D54',orange='#B86B35',mono=css.getPropertyValue('--quiz-mono').trim(),serif=css.getPropertyValue('--serif-zh').trim();
 await Promise.all([document.fonts.load(`400 16px "Noto Serif SC"`,s.message+s.photoTitle+s.place+'合焦光影偏爱直觉我你'),document.fonts.load(`700 28px "Noto Serif SC"`,s.title)]);
 await document.fonts.ready;
 const source=document.createElement('canvas');source.width=1600;source.height=3000;const c=source.getContext('2d');if(!c)throw Error('无法生成图片');c.scale(2,2);c.fillStyle=paper;c.fillRect(0,0,800,1500);
 // Fine deterministic paper grain, underneath all text, photos and machine-readable codes.
 let seed=17;c.fillStyle='#22222209';for(let i=0;i<42000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%1600;seed=(Math.imul(seed,1664525)+1013904223)>>>0;c.fillRect(x/2,(seed%3000)/2,.5,.5);}
 const text=(value:string,x:number,y:number,size=10,color=muted,font=mono,weight=400)=>{c.font=`${weight} ${size}px ${font}`;c.fillStyle=color;c.fillText(value,x,y);};
 const line=(x:number,y:number,x2:number,y2:number,color='#9ca69c',width=.8)=>{c.beginPath();c.strokeStyle=color;c.lineWidth=width;c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();};
 const box=(x:number,y:number,w:number,h:number)=>{c.strokeStyle='#9ca69c';c.lineWidth=.8;c.strokeRect(x,y,w,h);};
 const wrap=(value:string,x:number,y:number,width:number,size:number,lineHeight:number)=>{
  c.font=`400 ${size}px ${serif}`;
  // Keep closing punctuation attached to its preceding character.
  const units=value.match(/.[，。！？；：、）》」』】”’…]*/gu)||[],lines:string[]=[];let current='';
  for(const unit of units){if(current&&c.measureText(current+unit).width>width){lines.push(current);current='';}current+=unit;}
  if(current)lines.push(current);
  if(lines.length>1&&lines.at(-1)!.length<4){const previous=lines.at(-2)!.match(/.[，。！？；：、）》」』】”’…]*/gu)!;while(lines.at(-1)!.length<4&&previous.length>1)lines[lines.length-1]=previous.pop()!+lines.at(-1)!;lines[lines.length-2]=previous.join('');}
  lines.forEach((row,i)=>text(row,x,y+i*lineHeight,size,ink,serif));
 };
 const path=(d:string,color:string,width=1.6,fill?:string|CanvasGradient)=>{const p=new Path2D(d);if(fill){c.fillStyle=fill;c.fill(p);}c.strokeStyle=color;c.lineWidth=width;c.stroke(p);};
 const dot=(x:number,y:number,r:number,color:string,filled:boolean)=>{c.beginPath();c.arc(x,y,r,0,2*Math.PI);c.fillStyle=filled?color:paper;c.fill();c.strokeStyle=color;c.lineWidth=1.6;c.stroke();};
 box(14,14,772,36);text('REVERIAN OPTICAL LAB // '+s.id,24,36,9,ink);
 c.fillStyle=blue;c.beginPath();c.roundRect(648,21,128,23,12);c.fill();text('[',657,37,10,paper);text('●',667,37,10,orange);text('AF-C LOCKED ]',680,37,10,paper);
 const top=54,h=250;box(14,top,384,h);box(402,top,384,h);text('00 // SYNC',24,70,9);text('01 // RESONANCE RADAR',412,70,9);
 const cx=206,cy=186,r=78;c.strokeStyle='#7a8d87';c.lineWidth=1;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.stroke();
 for(let i=0;i<90;i++){const a=i*Math.PI/45;line(cx+Math.cos(a)*(r-4),cy+Math.sin(a)*(r-4),cx+Math.cos(a)*(r-(i%5===0?16:10)) ,cy+Math.sin(a)*(r-(i%5===0?16:10)),'#7a8d87',.9);}
 c.strokeStyle='#1E4D5430';c.beginPath();c.arc(cx,cy,63,0,2*Math.PI);c.stroke();c.strokeStyle=blue;c.lineWidth=2.1;c.beginPath();c.arc(cx,cy,63,-Math.PI/2,-Math.PI/2+Math.PI*2*s.score/10);c.stroke();
 c.textAlign='center';text(s.title,cx,101,27,blue,serif,700);c.textAlign='left';
 c.font=`700 72px ${mono}`;const sw=c.measureText(String(s.score)).width;const scoreX=cx-(sw+39)/2;
 text(String(s.score),scoreX,cy+22,72,blue,mono,700);text('/ 合焦',scoreX+sw+3,cy+18,11,ink,serif);
 wrap(s.message,26,278,358,13,19);
 const radarX=565,radarY=189,radius=90,dims=dimensionScores(s.correct),radar=radarPoints(dims,radarX,radarY,radius);
 for(const r of [22.5,45,67.5,90]){c.beginPath();c.arc(radarX,radarY,r,0,2*Math.PI);c.strokeStyle='#89958c';c.lineWidth=.75;c.stroke();}
 radarPoints([1,1,1],radarX,radarY,radius).forEach(p=>line(radarX,radarY,p.x,p.y,'#89958c',.75));
 path(radar.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' ')+'Z',orange,1.6,'#B86B3530');radar.forEach(p=>dot(p.x,p.y,2.5,orange,true));
 c.textAlign='center';[[565,82],[476,274],[652,274]].forEach(([x,y],i)=>{text(['光影','偏爱','直觉'][i],x,y,12,ink,serif);text(Math.round(dims[i]*100)+'%',x,y+14,10,ink);});c.textAlign='left';
 line(714,76,714,292);for(let i=0;i<=40;i++){const y=87+i*4.6;line(i%10===0?728:733,y,741,y,'#596961');}['+2','+1','0','−1','−2'].forEach((t,i)=>text(t,748,91+i*46,10,ink));text('REL. EV',729,289,7);
 const evY=87+(2-s.analysis.relativeEV)/4*184;path(`M719 ${evY-3}L725 ${evY}L719 ${evY+3}Z`,orange,.5,orange);
 let y=308;box(14,y,772,158);text('02 // WAVEFORM',24,y+15,9);text('— 我',553,y+15,9,blue,serif);text('┄ 你',599,y+15,9,orange,serif);text('● 合焦 / ○ 失焦',649,y+15,8,muted,serif);
 c.save();c.translate(23,y+21);c.scale(754/600,.89);const {mine,visitor}=wavePoints(s.correct);
 for(let i=0;i<=90;i++){const x=30+i*6,len=i%10===0?16:i%5===0?10:5;line(x,5,x,5+len,'#61716a',.85);line(x,117,x,117-len,'#61716a',.85);}
 path(wavePath(mine),blue,2);c.setLineDash([4,3]);path(wavePath(visitor),orange,2);c.setLineDash([]);
 s.correct.forEach((same,i)=>{dot(mine[i].x,mine[i].y,4,blue,same);if(!same)dot(visitor[i].x,visitor[i].y,4,orange,false);c.textAlign='center';text(String(i+1).padStart(2,'0'),mine[i].x,139,12,ink);});c.textAlign='left';c.restore();
 y=470;const photoRatio=s.image.naturalWidth/s.image.naturalHeight,photoHeight=Math.min(400,746/photoRatio),photoWidth=photoHeight*photoRatio,imageTop=y+19,imageX=400-photoWidth/2;
 c.fillStyle='#20251f';c.fillRect(14,y,772,photoHeight+40);text('REVF // PIXEL LAB',24,y+12,8,'#c8c8b9');text(s.archive,693,y+12,8,'#c8c8b9');
 c.save();c.beginPath();c.roundRect(imageX,imageTop,photoWidth,photoHeight,4);c.clip();c.drawImage(s.image,imageX,imageTop,photoWidth,photoHeight);
 const vignette=c.createRadialGradient(400,imageTop+photoHeight/2,photoHeight*.35,400,imageTop+photoHeight/2,photoWidth*.62);vignette.addColorStop(0,'#10150f00');vignette.addColorStop(1,'#10150f48');c.fillStyle=vignette;c.fillRect(imageX,imageTop,photoWidth,photoHeight);c.restore();
 const corners=(x:number,yy:number,w:number,h:number,len:number,color:string)=>{for(const [xx,yyy,sx,sy] of [[x,yy,1,1],[x+w,yy,-1,1],[x,yy+h,1,-1],[x+w,yy+h,-1,-1]]){line(xx,yyy,xx+sx*len,yyy,color);line(xx,yyy,xx,yyy+sy*len,color);}};
 corners(imageX+8,imageTop+8,photoWidth-16,photoHeight-16,17,'#f4f3ee90');
 const fy=imageTop+photoHeight/2;corners(351,fy-32,98,64,13,'#ffffff70');line(391,fy,409,fy,'#ffffff80');line(400,fy-9,400,fy+9,'#ffffff80');
 text(s.photoTitle,24,imageTop+photoHeight+14,9,'#c8c8b9',serif);text('REVERIAN / VISUAL ARCHIVE',630,imageTop+photoHeight+14,8,'#c8c8b9');
 y+=photoHeight+44;box(14,y,384,142);box(402,y,384,142);text('03 // LUMINANCE',24,y+16,9);text(`${s.analysis.brightness} / 100`,335,y+16,9,blue);text('04 // CHROMATIC DNA',412,y+16,9);text('PIXEL OK',735,y+16,8);
 c.save();c.translate(24,y+25);line(0,74,364,74);const peak=Math.max(1,...s.analysis.coolHistogram,...s.analysis.warmHistogram);
 path(wavePath(histogramPoints(s.analysis.coolHistogram,364,74,peak))+'L364 74H0Z','#537784',1.2,'#53778455');path(wavePath(histogramPoints(s.analysis.warmHistogram,364,74,peak))+'L364 74H0Z',orange,1.2,'#B86B3545');c.restore();
 text('0 / SHADOW',24,y+110,7);text('255 / LIGHT',335,y+110,7);text(s.place,24,y+131,10,muted,mono);
 s.analysis.palette.forEach((color,i)=>{c.fillStyle=color;c.fillRect(412+i*73,y+29,69,35);text(color,412+i*73,y+78,8);});
 const a=s.analysis,barX=412,barW=364,barY=y+99,thermal=c.createLinearGradient(barX,0,barX+barW,0);thermal.addColorStop(0,'#537784');thermal.addColorStop(.5,'#d6d8d1');thermal.addColorStop(1,orange);c.fillStyle=thermal;c.fillRect(barX,barY,barW,5);
 const pointer=barX+barW*(.5+(a.warm-a.cool)/200);line(pointer,barY-5,pointer,barY+11,ink,1.2);text(`${a.cool}% COOL`,412,y+129,8);text(`${a.neutral}% NEUTRAL`,543,y+129,8);text(`${a.warm}% WARM`,719,y+129,8);
 y=Math.ceil(y+146);
 const qr:{size:number;bits:string}=JSON.parse(element.dataset.qr!),cell=2,codeSize=(qr.size+8)*cell,footerHeight=codeSize+12;
 const domain=element.querySelector('[data-report-domain]')?.textContent||'';
 box(14,y,772,footerHeight);text(domain+' · '+s.timestamp,24,y+footerHeight/2+3,8);
 const qrX=780-codeSize,codeY=y+6,barcode=element.dataset.barcode!,barWidth=(barcode.length+20)/2,barsX=qrX-33-barWidth;
 c.fillStyle='#fff';c.fillRect(barsX,codeY,barWidth,codeSize);c.fillStyle=ink;for(const {start,width} of barcodeRuns(barcode))c.fillRect(barsX+(start+10)/2,codeY+8,width/2,codeSize-16);
 c.save();c.translate(qrX-12,codeY+codeSize/2);c.rotate(Math.PI/2);c.textAlign='center';text('DX',0,6,22,ink,mono,700);c.restore();
 // Exact integer modules and an untextured four-module white quiet zone.
 c.fillStyle='#fff';c.fillRect(qrX,codeY,codeSize,codeSize);c.fillStyle=ink;
 [...qr.bits].forEach((v,i)=>{if(v==='1')c.fillRect(qrX+(i%qr.size+4)*cell,codeY+(Math.floor(i/qr.size)+4)*cell,cell,cell);});
 const height=Math.ceil(y+footerHeight+12),output=document.createElement('canvas');output.width=1600;output.height=height*2;const ctx=output.getContext('2d');if(!ctx)throw Error('无法生成图片');ctx.drawImage(source,0,0);ctx.strokeStyle='#9ca69c';ctx.lineWidth=1.5;ctx.strokeRect(16,16,1568,output.height-32);
 return new Promise((resolve,reject)=>output.toBlob(blob=>blob?resolve(blob):reject(Error('图片导出失败')),'image/png'));
}
