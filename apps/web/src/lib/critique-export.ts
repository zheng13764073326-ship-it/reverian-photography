import {CRITIQUE_DIMENSIONS,CRITIQUE_LABELS,CRITIQUE_TONES,validateCritique,type CritiqueReport,type CritiqueTone} from './critique-contract';
export type CritiqueExport={report:CritiqueReport;photo:File;createdAt:Date;mock:boolean;tone:CritiqueTone};
export type ReportQr={size:number;bits:string};

/** Create the same report as a local sharing image, without another AI request. */
export async function renderCritiqueReport(snapshot:CritiqueExport,element:HTMLElement,qr:ReportQr):Promise<Blob>{
 const report=validateCritique(snapshot.report);
 if(!Number.isInteger(qr.size)||qr.size<21||qr.size>57||qr.bits.length!==qr.size**2||!/^[01]+$/.test(qr.bits))throw Error('网站二维码未能加载，请刷新后重试。');
 const css=getComputedStyle(element),serif=css.getPropertyValue('--lab-serif').trim(),mono=css.getPropertyValue('--lab-mono').trim();
 const copy='AI评片综合评分四项均值构图光影色彩情绪调整建议挽风摄影作品集扫码浏览作品与光学实验室本地示例非分析'+CRITIQUE_TONES[snapshot.tone]+report.verdict+Object.values(report.analysis).join('')+report.suggestions.join('');
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{await Promise.race([Promise.all([document.fonts.load(`400 32px ${serif}`,copy),document.fonts.load(`500 54px ${serif}`,copy),document.fonts.load(`400 40px ${mono}`,'AI REVERIAN OPTICAL LAB reverian.cc 0123456789 / .')]),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('报告字体加载较慢，请稍后重新导出。')),20000);})]);}finally{clearTimeout(timer);}
 const source=URL.createObjectURL(snapshot.photo),photo=new Image(),canvas=document.createElement('canvas');
 try{
  photo.src=source;await photo.decode();if(!photo.naturalWidth||!photo.naturalHeight)throw Error('照片无法读取，请重新上传。');
  const c=canvas.getContext('2d');if(!c)throw Error('浏览器无法生成报告图片。');
  const width=1080,margin=64,inner=width-margin*2,paper='#F4F3EE',ink='#253b36',teal='#1e4d54',muted='#738071',rule='#d4dacf';
  const font=(size:number,family=serif,weight=400)=>`${weight} ${size}px ${family}`;
  const wrap=(value:string,maxWidth:number,size:number,weight=400)=>{c.font=font(size,serif,weight);const units=value.match(/.[，。！？；：、）》」』】”’…]*/gu)||[],lines:string[]=[];let line='';for(const unit of units){if(line&&c.measureText(line+unit).width>maxWidth){lines.push(line);line='';}line+=unit;}if(line)lines.push(line);return lines;};
  const scale=Math.min(inner/photo.naturalWidth,1100/photo.naturalHeight),pw=Math.round(photo.naturalWidth*scale),ph=Math.round(photo.naturalHeight*scale),photoY=214;
  const summary=wrap(report.verdict,inner,38,500),summaryY=photoY+ph+68,scoreY=summaryY+summary.length*58+16,dimensionsY=scoreY+54,column=(inner-24)/2;
  const cards=CRITIQUE_DIMENSIONS.map(key=>({key,lines:wrap(report.analysis[key],column-48,30)}));
  const rowHeights=[0,1].map(row=>Math.max(...cards.slice(row*2,row*2+2).map(card=>94+card.lines.length*48)));
  const notesY=dimensionsY+rowHeights[0]+rowHeights[1]+64,suggestions=report.suggestions.map(v=>wrap(v,inner-48,32));
  const footerY=notesY+80+suggestions.reduce((sum,lines)=>sum+lines.length*52+24,0)+30,cell=7,qrWidth=(qr.size+8)*cell,height=Math.ceil(footerY+Math.max(244,qrWidth)+82);
  if(height>8192)throw Error('报告内容过长，暂时无法生成分享图片。');
  canvas.width=width;canvas.height=height;c.fillStyle=paper;c.fillRect(0,0,width,height);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  const text=(value:string,x:number,y:number,size:number,color=ink,family=serif,weight=400,align:CanvasTextAlign='left')=>{c.font=font(size,family,weight);c.fillStyle=color;c.textAlign=align;c.fillText(value,x,y);c.textAlign='left';};
  const line=(x1:number,y1:number,x2:number,y2:number,color=rule,thickness=1)=>{c.beginPath();c.lineWidth=thickness;c.strokeStyle=color;c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();};
  const date=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(snapshot.createdAt).replaceAll('/','.');
  text('REVERIAN // OPTICAL LAB',margin,56,19,teal,mono);text(date,width-margin,56,19,muted,mono,400,'right');line(margin,78,width-margin,78);
  text('AI 评片',margin,154,58,teal,serif,500);text(snapshot.mock?'本地示例 · 非 AI 分析':CRITIQUE_TONES[snapshot.tone],margin,190,24,muted);
  c.fillStyle='#eae8e0';c.fillRect(margin,photoY,inner,ph);c.drawImage(photo,margin+(inner-pw)/2,photoY,pw,ph);
  summary.forEach((row,i)=>text(row,margin,summaryY+i*58,38,ink,serif,500));
  text(`综合评分 ${report.score.toFixed(1)} / 10`,margin,scoreY,28,teal);text('四项均值',width-margin,scoreY,22,muted,serif,400,'right');
  cards.forEach((card,i)=>{const x=margin+(i%2)*(column+24),y=dimensionsY+(i<2?0:rowHeights[0]+20),h=rowHeights[Math.floor(i/2)];c.fillStyle='#eaece3';c.fillRect(x,y,column,h);text(CRITIQUE_LABELS[card.key],x+24,y+42,30,teal,serif,500);text(`${report.dimensions[card.key].toFixed(1)} / 10`,x+column-24,y+42,23,muted,mono,400,'right');line(x+24,y+63,x+column-24,y+63,rule,2);line(x+24,y+63,x+24+(column-48)*report.dimensions[card.key]/10,y+63,teal,2);card.lines.forEach((row,j)=>text(row,x+24,y+108+j*48,30));});
  line(margin,notesY-20,width-margin,notesY-20);text('调整建议',margin,notesY+30,34,teal,serif,500);let y=notesY+90;
  suggestions.forEach((rows,i)=>{text(String(i+1),margin,y,24,muted,mono);rows.forEach((row,j)=>text(row,margin+48,y+j*52,32));y+=rows.length*52+24;});
  line(margin,footerY-12,width-margin,footerY-12,teal,1.5);const qx=width-margin-qrWidth,qy=footerY+12;c.fillStyle=ink;[...qr.bits].forEach((bit,i)=>{if(bit==='1')c.fillRect(qx+(i%qr.size+4)*cell,qy+(Math.floor(i/qr.size)+4)*cell,cell,cell);});
  text('reverian.cc',margin,footerY+85,54,teal,mono);text('挽风 · 摄影作品集',margin,footerY+133,28);text('扫码浏览作品与光学实验室',margin,footerY+178,23,muted);
  text(snapshot.mock?'本地示例，仅用于预览版式。':'AI 评片 · 建议供创作参考',margin,height-30,22,muted);
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('报告图片生成失败，请重试。')),'image/png'));
 }finally{URL.revokeObjectURL(source);canvas.width=canvas.height=1;}
}
