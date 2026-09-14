import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import pkg from 'omron-fins';
import { WebSocketServer } from 'ws';
import { config } from './config.mjs';
import { PRESETS } from './presets.mjs';
import { Poller, atomicSave, authorized, validateConfig } from './core.mjs';

const file = fileURLToPath(new URL('./units.json', import.meta.url));
let units = [];
try { units=validateConfig(JSON.parse(fs.readFileSync(file,'utf8'))); }
catch(e) { console.error(e.code==='ENOENT'?'Chưa có cấu hình PLC.':'Cấu hình không hợp lệ; gateway khởi động ở trạng thái chưa cấu hình.'); }
let snapshot={blocks:[],connected:false,at:Date.now(),source:config.mock?'mock':'plc'};
const origins=new Set(config.allowedOrigins);
function originAllowed(req) { return !req.headers.origin || origins.has(req.headers.origin); }
function json(res,code,data) { res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data)); }
const poller=new Poller({mock:config.mock,makeClient(u){
  const c=pkg.FinsClient(u.port,u.host,{protocol:u.protocol,timeout:2000});
  c.on('error',()=>{});c.on('timeout',()=>{});return c;
},publish(data){snapshot=data;for(const c of wss.clients)if(c.readyState===1)c.send(JSON.stringify(snapshot));}});
const server=http.createServer((req,res)=>{
  if(!originAllowed(req))return json(res,403,{ok:false,error:'Origin không được phép.'});
  if(req.headers.origin){res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin');}
  res.setHeader('Access-Control-Allow-Methods','GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
  if(req.url==='/health'&&req.method==='GET')return json(res,200,{ok:true,source:snapshot.source,readOnly:true});
  if(req.url!=='/config')return json(res,404,{ok:false,error:'Không tìm thấy API.'});
  if(!authorized(req.headers.authorization,config.adminToken))return json(res,401,{ok:false,error:'Cần token quản trị gateway (GATEWAY_ADMIN_TOKEN, tối thiểu 24 ký tự).'});
  if(req.method==='GET')return json(res,200,{units,presets:Object.entries(PRESETS).map(([key,v])=>({key,label:v.label,capacity:v.capacity})),readOnly:true});
  if(req.method!=='PUT')return json(res,405,{ok:false,error:'Phương thức không hỗ trợ.'});
  let body='',size=0,overLimit=false;
  req.on('data',chunk=>{size+=chunk.length;if(size>65536){overLimit=true;body='';}else if(!overLimit)body+=chunk;});
  req.on('end',()=>{
    if(overLimit)return json(res,413,{ok:false,error:'Cấu hình vượt 64 KB.'});
    try {
      const next=validateConfig(JSON.parse(body));
      atomicSave(file,next); // validate and persist before replacing the working runtime
      units=next;poller.configure(next);
      json(res,200,{ok:true,count:next.filter(u=>u.enabled).length});
    }catch(e){json(res,400,{ok:false,error:e.message});}
  });
});
const wss=new WebSocketServer({noServer:true,maxPayload:65536});
server.on('upgrade',(req,socket,head)=>{
  if(!originAllowed(req)){socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
});
wss.on('connection',ws=>{
  ws.send(JSON.stringify(snapshot));
  ws.on('message',raw=>{
    let id=null;try{id=JSON.parse(String(raw)).id??null}catch{}
    ws.send(JSON.stringify({type:'write-result',id,ok:false,reason:'Gateway chỉ đọc; chưa hỗ trợ điều khiển PLC.'}));
  });
});
poller.configure(units);
let timer;
async function loop(){await poller.poll();if(!poller.stopped)timer=setTimeout(loop,config.pollMs);}
server.listen(config.wsPort,config.bindHost,()=>{
  console.log(`Gateway ${config.mock?'MOCK':'PLC'} CHỈ ĐỌC: http://${config.bindHost}:${config.wsPort}`);
  if(!config.adminToken)console.log('API cấu hình đang khóa: chưa đặt GATEWAY_ADMIN_TOKEN.');
  void loop();
});
function stop(){clearTimeout(timer);poller.stop();for(const c of wss.clients)c.close();wss.close();server.close();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
