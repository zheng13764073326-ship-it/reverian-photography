export type Point = {x:number;y:number};
export type PictureAnalysis = {palette:string[];brightness:number;warm:number;cool:number;neutral:number;histogram:number[];coolHistogram:number[];warmHistogram:number[];samples:number;relativeEV:number};
export function dimensionScores(correct:boolean[]):number[]{
 return [[0,1,2,3],[4,5,6],[7,8,9]].map(group=>group.filter(i=>correct[i]).length/group.length);
}
export function radarPoints(values:number[],cx=120,cy=116,radius=76):Point[]{
 return values.map((v,i)=>{const angle=(-90-i*120)*Math.PI/180;return{x:cx+Math.cos(angle)*radius*v,y:cy+Math.sin(angle)*radius*v};});
}
export function histogramPoints(histogram:number[],width=240,height=80,sharedPeak?:number):Point[]{
 const smooth=histogram.map((n,i)=>((histogram[i-1]||0)+2*n+(histogram[i+1]||0))/4),peak=sharedPeak??Math.max(1,...smooth);
 return smooth.map((n,i)=>({x:i*width/(smooth.length-1),y:height-height*n/peak}));
}
export function wavePoints(correct:boolean[]): {mine:Point[];visitor:Point[]} {
  const heights=[61,42,72,52,85,58,38,68,48,76];
  const mine=correct.map((_,i)=>({x:30+i*60,y:heights[i%heights.length]}));
  return {mine,visitor:mine.map((p,i)=>({...p,y:p.y+(correct[i]?0:i%2?27:-27)}))};
}
// Horizontal tangents interpolate every answer exactly without overshooting.
export function wavePath(points:Point[]):string {
  return points.map((p,i)=>i?`C ${(points[i-1].x+p.x)/2} ${points[i-1].y}, ${(points[i-1].x+p.x)/2} ${p.y}, ${p.x} ${p.y}`:`M ${p.x} ${p.y}`).join(' ');
}
export function barcodeRuns(bits:string):{start:number;width:number}[]{
  return [...bits.matchAll(/1+/g)].map(match=>({start:match.index,width:match[0].length}));

}
export function analysePixels(data:Uint8ClampedArray):PictureAnalysis {
  const bins=new Map<number,{r:number;g:number;b:number;n:number}>();
  let total=0,luma=0,warm=0,cool=0,linearSum=0;const histogram=Array<number>(32).fill(0),coolHistogram=Array<number>(32).fill(0),warmHistogram=Array<number>(32).fill(0);
  const linear=(v:number)=>v<=10.31475?v/3294.6:((v/255+.055)/1.055)**2.4;
  for(let i=0;i<data.length;i+=4){
    if(data[i+3]<128)continue;
    const r=data[i],g=data[i+1],b=data[i+2];
    const brightness=.2126*r+.7152*g+.0722*b;
    total++;luma+=brightness;const binIndex=Math.min(31,Math.floor(brightness/8));histogram[binIndex]++;
    // Split each sample by its red/blue balance; neutral samples contribute equally.
    const warmWeight=(1+Math.max(-1,Math.min(1,(r-b)/64)))/2;
    warmHistogram[binIndex]+=warmWeight;coolHistogram[binIndex]+=1-warmWeight;
    linearSum+=.2126*linear(r)+.7152*linear(g)+.0722*linear(b);
    if(r-b>12)warm++;else if(b-r>12)cool++;
    const key=((r>>4)<<8)|((g>>4)<<4)|(b>>4);
    const bin=bins.get(key)||{r:0,g:0,b:0,n:0};bin.r+=r;bin.g+=g;bin.b+=b;bin.n++;bins.set(key,bin);
  }
  if(!total)throw Error('没有可分析的像素');
  const samples=[...bins.values()].map(p=>({v:[p.r/p.n,p.g/p.n,p.b/p.n],n:p.n})).sort((a,b)=>b.n-a.n);
  const distance=(a:number[],b:number[])=>a.reduce((sum,v,i)=>sum+(v-b[i])**2,0);
  const centers=[samples[0].v.slice()];
  while(centers.length<5){
    const chosen=samples.reduce((best,p)=>{
      const weight=Math.min(...centers.map(c=>distance(c,p.v)))*Math.sqrt(p.n);
      return weight>best.weight?{v:p.v,weight}:best;
    },{v:samples[0].v,weight:-1});
    centers.push(chosen.v.slice());
  }
  for(let iteration=0;iteration<8;iteration++){
    const sums=centers.map(()=>({v:[0,0,0],n:0}));
    for(const p of samples){let nearest=0;for(let j=1;j<5;j++)if(distance(p.v,centers[j])<distance(p.v,centers[nearest]))nearest=j;
      sums[nearest].n+=p.n;p.v.forEach((v,k)=>sums[nearest].v[k]+=v*p.n);
    }
    sums.forEach((sum,j)=>{if(sum.n)centers[j]=sum.v.map(v=>v/sum.n);});
  }
  centers.sort((a,b)=>(a[0]*.2126+a[1]*.7152+a[2]*.0722)-(b[0]*.2126+b[1]*.7152+b[2]*.0722));
  const round=(v:number)=>Math.round(v/total*100);
  const w=round(warm),c=round(cool);
  return {palette:centers.map(c=>'#'+c.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase()),brightness:Math.round(luma/total/255*100),warm:w,cool:c,neutral:100-w-c,histogram,coolHistogram,warmHistogram,samples:total,relativeEV:Math.max(-2,Math.min(2,Math.log2(Math.max(.0001,linearSum/total)/.18)))};
}
