import {CRITIQUE_DIMENSIONS,validateCritique,type CritiqueReport} from './critique-contract';
export type CritiqueExport={report:CritiqueReport;photo:File;createdAt:Date;mock:boolean};
export type ReportQr={size:number;bits:string};

/** Draw a standalone sharing image locally; never upload the photo or call AI again. */
export async function renderCritiqueReport(snapshot:CritiqueExport,element:HTMLElement,qr:ReportQr):Promise<Blob>{
 const report=validateCritique(snapshot.report);
 if(!Number.isInteger(qr.size)||qr.size<21||qr.size>57||qr.bits.length!==qr.size**2||!/^[01]+$/.test(qr.bits))throw Error('网站二维码未能加载，请刷新后重试。');
 const css=getComputedStyle(element),serif=css.getPropertyValue('--lab-serif').trim(),mono=css.getPropertyValue('--lab-mono').trim();
 const copy='暗房评片综合显影分构图光影色彩情绪张力画面亮点暗房建议挽风摄影作品集扫码进入摄影作品与光学实验室本地示例非评片生成仅供参考不替代你的创作判断'+report.verdict+report.highlights.join('')+report.suggestions.join('');
 let fontTimer:ReturnType<typeof setTimeout>|undefined;
 try{await Promise.race([Promise.all([document.fonts.load(`400 34px ${serif}`,copy),document.fonts.load(`500 54px ${serif}`,'暗房评片画面亮点暗房建议'+report.verdict),document.fonts.load(`400 40px ${mono}`,'REVERIAN OPTICAL LAB CRITIQUE REPORT HIGHLIGHTS SUGGESTIONS reverian.cc 0123456789 / .')]),new Promise((_,reject)=>{fontTimer=setTimeout(()=>reject(Error('报告字体加载较慢，请稍后重新导出。')),20000);})]);}finally{if(fontTimer)clearTimeout(fontTimer);}
 const source=URL.createObjectURL(snapshot.photo),photo=new Image(),canvas=document.createElement('canvas');
 try{
  photo.src=source;await photo.decode();if(!photo.naturalWidth||!photo.naturalHeight)throw Error('照片无法读取，请重新上传。');
  const c=canvas.getContext('2d');if(!c)throw Error('浏览器无法生成报告图片。');
  const width=1080,margin=64,inner=width-margin*2,paper='#F4F3EE',ink='#222222',teal='#1E4D54',orange='#B86B35',muted='#68716B',rule='#D1D4CA';
  const font=(size:number,family=serif,weight=400)=>`${weight} ${size}px ${family}`;
  const wrap=(value:string,maxWidth:number,size:number,weight=400)=>{
   c.font=font(size,serif,weight);const units=value.match(/.[，。！？；：、）》」』】”’…]*/gu)||[],lines:string[]=[];let line='';
   for(const unit of units){if(line&&c.measureText(line+unit).width>maxWidth){lines.push(line);line='';}line+=unit;}if(line)lines.push(line);return lines;
  };
  const photoScale=Math.min(inner/photo.naturalWidth,1200/photo.naturalHeight),pw=Math.round(photo.naturalWidth*photoScale),ph=Math.round(photo.naturalHeight*photoScale),photoY=214;
  const verdict=wrap(report.verdict,inner-350,38,500),scoreY=photoY+ph+90,scoreHeight=Math.max(172,48+verdict.length*58),dimensionsY=scoreY+scoreHeight+24,notesY=dimensionsY+206;
  const sections=[{title:'画面亮点',english:'HIGHLIGHTS',lines:report.highlights.map(v=>wrap(v,inner-50,34))},{title:'暗房建议',english:'SUGGESTIONS',lines:report.suggestions.map(v=>wrap(v,inner-50,34))}];
  const sectionHeight=(section:typeof sections[number])=>88+section.lines.reduce((sum,lines)=>sum+lines.length*54+24,0)+20;
  const footerY=notesY+sections.reduce((sum,section)=>sum+sectionHeight(section),0)+10,cell=7,qrWidth=(qr.size+8)*cell,footerHeight=Math.max(234,qrWidth),height=Math.ceil(footerY+footerHeight+112);
  if(height>8192)throw Error('报告内容过长，暂时无法生成分享图片。');
  canvas.width=width;canvas.height=height;c.fillStyle=paper;c.fillRect(0,0,width,height);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  const text=(value:string,x:number,y:number,size:number,color=ink,family=serif,weight=400,align:CanvasTextAlign='left')=>{c.font=font(size,family,weight);c.fillStyle=color;c.textAlign=align;c.fillText(value,x,y);c.textAlign='left';};
  const line=(x1:number,y1:number,x2:number,y2:number,color=rule,thickness=1)=>{c.beginPath();c.lineWidth=thickness;c.strokeStyle=color;c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();};
  const date=[snapshot.createdAt.getFullYear(),String(snapshot.createdAt.getMonth()+1).padStart(2,'0'),String(snapshot.createdAt.getDate()).padStart(2,'0')].join('.');
  text('REVERIAN // OPTICAL LAB',margin,56,19,teal,mono);text(date,width-margin,56,19,muted,mono,400,'right');line(margin,78,width-margin,78);
  text('暗房评片',margin,154,58,teal,serif,500);text('CRITIQUE REPORT',width-margin,150,22,teal,mono,400,'right');
  text(snapshot.mock?'本地示例 · 非AI评片':'AI 摄影评片 · 重新观看这一帧',margin,190,24,muted);
  c.fillStyle='#EAE8E0';c.fillRect(margin,photoY,inner,ph);c.drawImage(photo,margin+(inner-pw)/2,photoY,pw,ph);
  const px=margin+(inner-pw)/2;for(const [x,y,sx,sy] of [[px+12,photoY+12,1,1],[px+pw-12,photoY+12,-1,1],[px+12,photoY+ph-12,1,-1],[px+pw-12,photoY+ph-12,-1,-1]]){line(x,y,x+sx*24,y,'#F4F3EEB0');line(x,y,x,y+sy*24,'#F4F3EEB0');}
  text('01 // FRAME',margin,photoY+ph+34,18,muted,mono);text('REVERIAN.CC',width-margin,photoY+ph+34,18,muted,mono,400,'right');
  text('综合显影分',margin,scoreY+20,26,teal);text(report.score.toFixed(1),margin,scoreY+128,104,orange,mono);c.font=font(104,mono);const scoreWidth=c.measureText(report.score.toFixed(1)).width;text('/ 10',margin+scoreWidth+18,scoreY+128,25,muted,mono);
  verdict.forEach((row,i)=>text(row,margin+350,scoreY+58+i*58,38,ink,serif,500));line(margin,scoreY+scoreHeight,width-margin,scoreY+scoreHeight);
  const labels=['构图','光影','色彩','情绪张力'],english=['COMPOSITION','LIGHT','COLOR','MOOD'],column=(inner-48)/2;
  CRITIQUE_DIMENSIONS.forEach((key,i)=>{const x=margin+(i%2)*(column+48),y=dimensionsY+Math.floor(i/2)*94;const value=report.dimensions[key];text(labels[i],x,y+27,28);text(english[i],x+(i===3?126:70),y+26,16,muted,mono);text(value.toFixed(1),x+column,y+27,28,teal,mono,400,'right');line(x,y+50,x+column,y+50,rule,3);line(x,y+50,x+column*value/10,y+50,teal,3);});
  let cursor=notesY;
  for(const section of sections){line(margin,cursor,width-margin,cursor);text(section.title,margin,cursor+50,34,teal,serif,500);text(section.english,width-margin,cursor+48,19,teal,mono,400,'right');let y=cursor+102;section.lines.forEach((rows,i)=>{text(String(i+1).padStart(2,'0'),margin,y,20,orange,mono);rows.forEach((row,j)=>text(row,margin+50,y+j*54,34));y+=rows.length*54+24;});cursor+=sectionHeight(section);}
  line(margin,footerY-16,width-margin,footerY-16,teal,1.5);
  const qx=width-margin-qrWidth,qy=footerY+12;c.fillStyle=paper;c.fillRect(qx,qy,qrWidth,qrWidth);c.fillStyle=ink;
  [...qr.bits].forEach((bit,i)=>{if(bit==='1')c.fillRect(qx+(i%qr.size+4)*cell,qy+(Math.floor(i/qr.size)+4)*cell,cell,cell);});
  text('reverian.cc',margin,footerY+85,54,teal,mono);text('挽风 · 摄影作品集',margin,footerY+133,28,ink);text('扫码浏览作品与光学实验室',margin,footerY+178,23,muted);
  text(snapshot.mock?'示例报告，仅用于预览版式。':'AI 生成的观看建议，不替代你的创作判断。',margin,height-38,22,muted);
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('报告图片生成失败，请重试。')),'image/png'));
 }finally{URL.revokeObjectURL(source);canvas.width=canvas.height=1;}
}
