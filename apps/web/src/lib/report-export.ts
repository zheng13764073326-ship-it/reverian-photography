import {wavePoints,wavePath,reportBars,dimensionScores,radarPoints,histogramPoints} from './report-math';
import type {PictureAnalysis} from './report-math';
export type ReportSnapshot={id:string;timestamp:string;score:number;title:string;message:string;correct:boolean[];image:HTMLImageElement;analysis:PictureAnalysis;photoTitle:string;place:string;archive:string};
export async function renderReport(s:ReportSnapshot,element:HTMLElement):Promise<Blob>{
 await document.fonts.ready;
 const css=getComputedStyle(element),ink=css.getPropertyValue('--ink').trim(),paper=css.getPropertyValue('--paper').trim(),muted=css.getPropertyValue('--muted').trim(),blue=css.getPropertyValue('--focus-color').trim(),orange=css.getPropertyValue('--miss-color').trim(),mono=css.getPropertyValue('--quiz-mono').trim(),serif=css.getPropertyValue('--serif-zh').trim();
 const source=document.createElement('canvas');source.width=1600;source.height=3400;const c=source.getContext('2d');if(!c)throw Error('无法生成图片');c.scale(2,2);c.fillStyle=paper;c.fillRect(0,0,800,1700);
 const text=(value:string,x:number,y:number,size=10,color=muted,font=mono)=>{c.font=`${size}px ${font}`;c.fillStyle=color;c.fillText(value,x,y);};
 const line=(x:number,y:number,x2:number,y2:number,color='#aeb8ae',width=.65)=>{c.beginPath();c.strokeStyle=color;c.lineWidth=width;c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();};
 const box=(x:number,y:number,w:number,h:number)=>{c.strokeStyle='#aeb8ae';c.lineWidth=.7;c.strokeRect(x,y,w,h);};
 const wrap=(value:string,x:number,y:number,width:number,size:number,lineHeight:number)=>{
  c.font=`${size}px ${serif}`;
  const count=Math.max(1,Math.ceil(c.measureText(value).width/width));
  const chars=Array.from(value);
  for(let i=0;i<count;i++){
   const start=Math.round(i*chars.length/count);
   const end=Math.round((i+1)*chars.length/count);
   text(chars.slice(start,end).join(''),x,y+i*lineHeight,size,ink,serif);
  }
 };
 const path=(d:string,color:string,width=1.2,fill?:string|CanvasGradient)=>{const p=new Path2D(d);if(fill){c.fillStyle=fill;c.fill(p);}c.strokeStyle=color;c.lineWidth=width;c.stroke(p);};
 const dot=(x:number,y:number,r:number,color:string,filled:boolean)=>{c.beginPath();c.arc(x,y,r,0,2*Math.PI);c.fillStyle=filled?color:paper;c.fill();c.strokeStyle=color;c.lineWidth=1.2;c.stroke();};
 box(10,10,780,1550);box(16,16,768,49);
 text('REVERIAN OPTICAL LAB // '+s.id,31,46,10,ink);c.fillStyle=blue;c.fillRect(667,29,102,23);text('● AF-C LOCKED',676,44,9,paper);
 const top=70,h=248;box(16,top,381.5,h);box(402.5,top,381.5,h);text('00 // SYNC',30,91);text('01 // RESONANCE RADAR',417,91);
 const cx=207,cy=192,r=69;c.strokeStyle='#91a19b';c.lineWidth=.6;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.stroke();
 for(let i=0;i<60;i++){const a=i*Math.PI/30;line(cx+Math.cos(a)*(r-4),cy+Math.sin(a)*(r-4),cx+Math.cos(a)*(r-(i%5===0?14:9)),cy+Math.sin(a)*(r-(i%5===0?14:9)));}
 c.strokeStyle='#23748925';c.beginPath();c.arc(cx,cy,53,0,2*Math.PI);c.stroke();c.strokeStyle=blue;c.lineWidth=1.5;c.beginPath();c.arc(cx,cy,53,-Math.PI/2,-Math.PI/2+Math.PI*2*s.score/10);c.stroke();
 c.textAlign='center';text(s.title,cx,117,25,blue,serif);c.textAlign='left';
 const scoreText=String(s.score), suffix='/ 10 合焦';
 c.font=`55px ${mono}`;const scoreWidth=c.measureText(scoreText).width;
 c.font=`9px ${mono}`;const suffixWidth=c.measureText(suffix).width;
 const scoreX=cx-(scoreWidth+suffixWidth+4)/2;
 text(scoreText,scoreX,cy+16,55,blue);text(suffix,scoreX+scoreWidth+4,cy+16,9);
 wrap(s.message,32,276,350,14,20);text('SYNC.00',350,307,7);
 const radarX=565,radarY=199;
 const dims=dimensionScores(s.correct),radar=radarPoints(dims,radarX,radarY,66);
 for(const radius of [16.5,33,49.5,66]){c.beginPath();c.arc(radarX,radarY,radius,0,2*Math.PI);c.strokeStyle='#aeb8ae';c.lineWidth=.6;c.stroke();}
 radarPoints([1,1,1],radarX,radarY,66).forEach(p=>line(radarX,radarY,p.x,p.y));
 path(radar.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' ')+'Z',orange,1.2,'#9a601f25');radar.forEach(p=>dot(p.x,p.y,2,orange,true));
 c.textAlign='center';[[565,121],[490,280],[640,280]].forEach(([x,y],i)=>text(`${['光影','偏爱','直觉'][i]} ${Math.round(dims[i]*100)}%`,x,y,11,ink));text('Q01–04 / Q05–07 / Q08–10',565,303,7);c.textAlign='left';
 line(710,96,710,304);for(let i=0;i<=40;i++){const y=115+i*4.1;line(i%10===0?732:736,y,743,y);}['+2','+1','0','−1','−2'].forEach((t,i)=>text(t,750,119+i*41,9));text('REL. EV',732,300,7);
 const evY=115+(2-s.analysis.relativeEV)/4*164;path(`M724 ${evY-3}L730 ${evY}L724 ${evY+3}Z`,orange,.5,orange);
 let y=323;box(16,y,768,169);text('02 // WAVEFORM',30,y+17);text('— 我',539,y+17,9,blue);text('┄ 你',581,y+17,9,orange);text('● 合焦 / ○ 失焦',627,y+17,8);
 c.save();c.translate(25,y+24);c.scale(750/600,.96);const {mine,visitor}=wavePoints(s.correct);
 for(let x=30;x<=570;x+=15)line(x,6,x,116,'#23748914');for(let yy=6;yy<=116;yy+=10)line(30,yy,570,yy,'#23748914');
 const gradient=c.createLinearGradient(0,10,0,116);gradient.addColorStop(0,'#23748924');gradient.addColorStop(1,'#23748900');c.fillStyle=gradient;c.fill(new Path2D(wavePath(mine)+'L570 116H30Z'));
 c.setLineDash([1,5]);mine.forEach(p=>line(p.x,6,p.x,116,'#23748930'));c.setLineDash([]);path(wavePath(mine),blue);c.setLineDash([4,3]);path(wavePath(visitor),orange);c.setLineDash([]);
 s.correct.forEach((same,i)=>{dot(mine[i].x,mine[i].y,3,blue,same);if(!same)dot(visitor[i].x,visitor[i].y,3,orange,false);c.textAlign='center';text(same?'LK':'DF',mine[i].x+10,Math.max(10,Math.min(mine[i].y,visitor[i].y)-9),6,same?blue:orange);text(String(i+1).padStart(2,'0'),mine[i].x,138,12);});c.textAlign='left';c.restore();
 y=497;const photoRatio=s.image.naturalWidth/s.image.naturalHeight;
 const photoHeight=Math.min(500,740/photoRatio),photoWidth=photoHeight*photoRatio;
 const imageTop=y+25;c.fillStyle='#20251f';c.fillRect(16,y,768,photoHeight+49);text('REVF // PIXEL LAB',30,y+15,8,'#c1b8a3');text(s.archive,670,y+15,8,'#c1b8a3');c.drawImage(s.image,400-photoWidth/2,imageTop,photoWidth,photoHeight);c.strokeStyle='#aeb8ae80';c.lineWidth=.6;c.strokeRect(27,imageTop-3,746,photoHeight+6);
 for(const [x,yy,sx,sy] of [[39,imageTop+9,1,1],[761,imageTop+9,-1,1],[39,imageTop+photoHeight-9,1,-1],[761,imageTop+photoHeight-9,-1,-1]]){line(x,yy,x+sx*16,yy,'#f4f1e9a0');line(x,yy,x,yy+sy*16,'#f4f1e9a0');}
 line(391,imageTop+photoHeight/2,409,imageTop+photoHeight/2,'#f4f1e970');line(400,imageTop+photoHeight/2-9,400,imageTop+photoHeight/2+9,'#f4f1e970');text(s.photoTitle,30,imageTop+photoHeight+17,9,'#c1b8a3');text('REVERIAN / VISUAL ARCHIVE',608,imageTop+photoHeight+17,8,'#c1b8a3');
 y+=photoHeight+54;box(16,y,381.5,180);box(402.5,y,381.5,180);text('03 // LUMINANCE',30,y+20);text(`${s.analysis.brightness} / 100`,333,y+20,10,blue);text('04 // CHROMATIC DNA',417,y+20);text('PIXEL OK',720,y+20,8);
 c.save();c.translate(30,y+34);const points=histogramPoints(s.analysis.histogram,352,86);for(let i=0;i<5;i++){line(i*88,0,i*88,86,'#aeb8ae60');line(0,i*21.5,352,i*21.5,'#aeb8ae60');}path(wavePath(points)+'L352 86H0Z',blue,1,'#23748935');c.setLineDash([2,2]);line(s.analysis.brightness*3.52,0,s.analysis.brightness*3.52,86,orange);c.setLineDash([]);c.restore();text('0 / SHADOW',30,y+132,7);text('255 / LIGHT',324,y+132,7);text(s.place,30,y+157,10);text('L.03',370,y+174,6);
 s.analysis.palette.forEach((color,i)=>{c.fillStyle=color;c.fillRect(417+i*70,y+37,63,38);text(color,417+i*70,y+88,8);});text('SAMPLED FROM THE MATCHED FRAME',417,y+108,7);
 const a=s.analysis,barX=417,barW=352,barY=y+126;c.fillStyle=blue;c.fillRect(barX,barY,barW*a.cool/100,4);c.fillStyle='#c8d1cd';c.fillRect(barX+barW*a.cool/100,barY,barW*a.neutral/100,4);c.fillStyle=orange;c.fillRect(barX+barW*(a.cool+a.neutral)/100,barY,barW*a.warm/100,4);
 const pointer=barX+barW*(.5+(a.warm-a.cool)/200);line(pointer,barY-5,pointer,barY+10,ink,1);text(`${a.cool}% COOL`,417,y+151,8);text(`${a.neutral}% NEUTRAL`,535,y+151,8);text(`${a.warm}% WARM`,697,y+151,8);text('C.04',757,y+174,6);
 y+=185;const qr: {size:number;bits:string}=JSON.parse(element.dataset.qr||'null');const qrSize=(qr.size+8)*2;const footerHeight=Math.max(90,qrSize+16);box(16,y,768,footerHeight);text('reverian-photography.pages.dev',30,y+35,10);text(s.timestamp,30,y+54,9);
 const bars=reportBars(s.id),sum=bars.reduce((n,w)=>n+w+1,0);let bx=535;c.fillStyle=ink;for(const w of bars){c.fillRect(bx,y+footerHeight/2-10,w/sum*132,20);bx+=(w+1)/sum*132;}
 const qx=774-qrSize,qy=y+8;c.fillStyle=paper;c.fillRect(qx,qy,qrSize,qrSize);c.fillStyle=ink;[...qr.bits].forEach((v,i)=>{if(v==='1')c.fillRect(qx+(i%qr.size+4)*2,qy+(Math.floor(i/qr.size)+4)*2,2,2);});
 const height=Math.ceil(y+footerHeight+16);const output=document.createElement('canvas');output.width=1600;output.height=height*2;const ctx=output.getContext('2d');if(!ctx)throw Error('无法生成图片');ctx.drawImage(source,0,0);ctx.strokeStyle='#aeb8ae';ctx.lineWidth=1.4;ctx.strokeRect(20,20,1560,output.height-40);
 return new Promise((resolve,reject)=>output.toBlob(blob=>blob?resolve(blob):reject(Error('图片导出失败')),'image/png'));
}
