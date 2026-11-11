import {useCallback,useEffect,useState} from 'react';
import {useClient} from 'sanity';
import {Box,Button,Card,Flex,Heading,Stack,Text,TextInput} from '@sanity/ui';

type Answer={question:string;picked:string[];answer:string[];correct:boolean};
type RecordRow={id:string;nickname:string;submitted_at:string;correct_count:number;total:number;answers:Answer[]};
const clientOptions={apiVersion:'2025-02-19'};
export function QuizRecords() {
  const client=useClient(clientOptions);
  const [rows,setRows]=useState<RecordRow[]>([]);
  const [page,setPage]=useState(0);
  const [more,setMore]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [search,setSearch]=useState('');
  const load=useCallback(async(signal?:AbortSignal)=>{
    setBusy(true);setError('');
    try{
      const token=client.config().token;
      if(!token)throw Error('请退出编辑室后重新登录，再查看答题记录。');
      const response=await fetch(`https://reverian-photography.pages.dev/api/quiz-records?page=${page}`,{headers:{Authorization:`Bearer ${token}`},signal});
      const data=await response.json();
      if(!response.ok)throw Error(data.error||'无法读取答题记录');
      setRows(data.records);setMore(data.hasMore);
    }catch(e){if(!signal?.aborted){setRows([]);setError(e instanceof Error?e.message:'读取失败');}}
    finally{if(!signal?.aborted)setBusy(false);}
  },[client,page]);
  useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort();},[load]);
  return <Card padding={[3,4]} style={{height:'100%',overflowY:'auto'}}><Box style={{maxWidth:1000,margin:'0 auto'}}><Stack gap={4}>
    <Heading size={2}>答题记录</Heading>
    <Text size={1} muted>仅你的账号可查看。名字由访客自行填写；每次完成测试会生成一条记录。</Text>
    <Flex gap={3}><Box flex={1}><TextInput aria-label="筛选本页名字" placeholder="筛选本页名字或昵称" value={search} onChange={e=>setSearch(e.currentTarget.value)}/></Box><Button text="刷新" disabled={busy} onClick={()=>void load()}/></Flex>
    {error&&<Card padding={3} tone="critical"><Text>{error}</Text></Card>}
    {busy&&<Text muted>正在读取…</Text>}
    {!busy&&!error&&rows.length===0&&<Text muted>还没有答题记录。</Text>}
    {rows.filter(row=>row.nickname.includes(search)).map(row=><Card key={row.id} padding={3} border radius={2}>
      <details><summary style={{cursor:'pointer',lineHeight:2}}><strong>{row.nickname}</strong> · {row.correct_count} / {row.total} 合焦 <span style={{fontSize:13,opacity:.65,marginLeft:12}}>{new Date(row.submitted_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}</span></summary>
        <ol style={{paddingLeft:24}}>{row.answers.map((answer,i)=><li key={i} style={{padding:'14px 0',lineHeight:1.8,borderBottom:'1px solid #ccc6'}}><strong>{answer.question}</strong> · {answer.correct?'合焦':'失焦'}<br/>你选：{answer.picked.join('、')}<br/>我选：{answer.answer.join('、')}</li>)}</ol>
      </details>
    </Card>)}
    <Flex gap={3} align="center"><Button text="上一页" disabled={busy||page===0} onClick={()=>setPage(p=>p-1)}/><Text size={1}>第 {page+1} 页</Text><Button text="下一页" disabled={busy||!more} onClick={()=>setPage(p=>p+1)}/></Flex>
  </Stack></Box></Card>;
}
