import http from 'node:http';
import { query, sqlLiteral } from './db.mjs';
import { issueToken, verifyPassword, verifyToken } from './auth.mjs';

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.BACKEND_PORT || 3000);

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': process.env.CORS_ORIGIN || '*' });
  res.end(JSON.stringify(body));
}
async function body(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}
function currentUser(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return verifyToken(token);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return json(res, 204, {});
    if (req.method === 'GET' && req.url === '/api/health') {
      query('SELECT 1');
      return json(res, 200, { status: 'ready' });
    }
    if (req.method === 'POST' && req.url === '/api/auth/login') {
      const input = await body(req);
      const email = String(input.email || '').trim().toLowerCase();
      const rows = query(`SELECT id, email, password_hash, name, role FROM runtime_users WHERE email = ${sqlLiteral(email)} LIMIT 1`);
      if (!rows[0] || !verifyPassword(String(input.password || ''), rows[0][2])) return json(res, 401, { error: 'Invalid credentials' });
      const user = { id: rows[0][0], email: rows[0][1], name: rows[0][3], role: rows[0][4] };
      return json(res, 200, { token: issueToken(user), user });
    }
    if (req.method === 'GET' && req.url === '/api/auth/me') {
      const auth = currentUser(req);
      if (!auth) return json(res, 401, { error: 'Authentication required' });
      const rows = query(`SELECT id, email, name, role FROM runtime_users WHERE id = ${Number(auth.sub)}`);
      return rows[0] ? json(res, 200, { id: rows[0][0], email: rows[0][1], name: rows[0][2], role: rows[0][3] }) : json(res, 401, { error: 'Account unavailable' });
    }
    if (req.method === 'POST' && req.url === '/api/runtime-ai/shipping-readiness') {
      const auth = currentUser(req);
      if (!auth) return json(res, 401, { error: 'Authentication required' });
      const input = await body(req);
      const base = String(process.env.OPENROUTER_BASE_URL || '').replace(/\/$/, '');
      if (base !== 'https://openrouter.ai/api/v1') return json(res, 503, { error: 'OpenRouter base URL is not canonical' });
      const prompt = String(input.prompt || 'Assess shipment refund readiness and name the highest-priority evidence check.');
      const provider = await fetch(`${base}/chat/completions`, {
        method: 'POST', headers: { authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'content-type': 'application/json', 'x-title': 'Shipping Refund Runtime' },
        body: JSON.stringify({ model: process.env.OPENROUTER_MODEL, max_tokens: 220, messages: [{ role: 'system', content: 'You are a shipping refund operations analyst. Give a concise, actionable response.' }, { role: 'user', content: prompt }] })
      });
      const data = await provider.json();
      if (!provider.ok || data.error) return json(res, 502, { error: data.error?.message || `Provider status ${provider.status}` });
      const content = data.choices?.[0]?.message?.content;
      if (!data.id || !content) return json(res, 502, { error: 'Provider response lacked a receipt or content' });
      const receipt = { id: data.id, model: data.model || process.env.OPENROUTER_MODEL, usage: data.usage || null };
      const saved = query(`INSERT INTO runtime_ai_results (user_id, feature, prompt, response, provider_id, model) VALUES (${Number(auth.sub)}, 'shipping-readiness', ${sqlLiteral(JSON.stringify({ prompt }))}::jsonb, ${sqlLiteral(JSON.stringify({ content, providerReceipt: receipt }))}::jsonb, ${sqlLiteral(data.id)}, ${sqlLiteral(receipt.model)}) RETURNING id`);
      return json(res, 200, { content, providerReceipt: receipt, recordId: saved[0][0] });
    }
    return json(res, 404, { error: 'Not found' });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
});
server.listen(port, host, () => console.log(`Shipping runtime API listening at http://${host}:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
