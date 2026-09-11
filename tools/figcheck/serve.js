const http=require('http'),fs=require('fs'),path=require('path'),url=require('url');
const ROOT=path.resolve(__dirname,'..','..');
const T={'.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.js':'text/javascript;charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.pdf':'application/pdf','.mp4':'video/mp4','.woff2':'font/woff2'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(url.parse(req.url).pathname);
  if(p==='/')p='/index.html';
  const f=path.join(ROOT,p);
  if(!f.startsWith(path.resolve(ROOT))){res.writeHead(403).end();return;}
  fs.readFile(f,(e,d)=>{
    if(e){res.writeHead(404,{'content-type':'text/plain'}).end('404 '+p);return;}
    res.writeHead(200,{'content-type':T[path.extname(f).toLowerCase()]||'application/octet-stream','cache-control':'no-store'});
    res.end(d);
  });
}).listen(4321,()=>console.log('serving '+ROOT+' on http://localhost:4321'));
