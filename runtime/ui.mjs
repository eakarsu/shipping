import http from 'node:http';

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.FRONTEND_PORT || 3001);
const apiPort = Number(process.env.BACKEND_PORT || 3000);
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Shipping Refund Operations</title><style>body{font:16px system-ui;margin:0;background:#eef4f8;color:#152838}main{max-width:760px;margin:10vh auto;background:white;padding:3rem;border-radius:18px;box-shadow:0 18px 50px #2342}h1{color:#075985}.tag{display:inline-block;background:#d9f1ff;padding:.4rem .8rem;border-radius:999px}</style></head><body><main><span class="tag">Runtime-ready</span><h1>Shipping Refund Operations</h1><p>Authenticate to review shipment evidence and run the AI readiness check.</p><p>API health and persistence are available through the protected runtime boundary.</p></main></body></html>`;
const server = http.createServer((req, res) => {
  if (req.url?.startsWith('/api/')) {
    const proxy = http.request({ host, port: apiPort, path: req.url, method: req.method, headers: req.headers }, (upstream) => { res.writeHead(upstream.statusCode || 502, upstream.headers); upstream.pipe(res); });
    proxy.on('error', () => { res.writeHead(502); res.end('API unavailable'); });
    req.pipe(proxy); return;
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html);
});
server.listen(port, host, () => console.log(`Shipping UI listening at http://${host}:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
