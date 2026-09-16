import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProxyAgent, fetch as undiciFetch } from 'undici';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.SERVER_PORT || 8080;

const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxyAgent = PROXY_URL
  ? new ProxyAgent({
      uri: PROXY_URL,
      connectTimeout: 30_000,
      bodyTimeout: 120_000,
    })
  : undefined;

const DEFAULT_CORS_ORIGINS = [
  'http://127.0.0.1:8091',
  'http://localhost:8091',
  'https://xiaolitongxue.com.cn',
];

function allowedCorsOrigins() {
  const raw = process.env.GITSTARS_CORS_ORIGIN;
  if (raw && raw.trim()) {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return DEFAULT_CORS_ORIGINS;
}

function applyCorsHeaders(req, res) {
  const requestOrigin = req.headers.origin;
  const allowed = allowedCorsOrigins();
  const origin =
    requestOrigin && allowed.includes(requestOrigin) ? requestOrigin : allowed[0];
  res.set({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,Accept',
    Vary: 'Origin',
  });
}

const FORWARD_HEADERS = ['authorization', 'accept', 'content-type', 'user-agent'];

async function fetchWithProxy(url, options = {}) {
  return undiciFetch(url, {
    ...options,
    dispatcher: proxyAgent,
  });
}

async function proxyGitHubRequest(req, res, origin) {
  const targetUrl = `${origin}${req.url}`;
  const headers = {
    'user-agent': 'gitstars-selfhost',
    accept: 'application/vnd.github+json',
  };
  for (const name of FORWARD_HEADERS) {
    if (req.headers[name]) headers[name] = req.headers[name];
  }

  const init = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined) {
    init.body = JSON.stringify(req.body);
    if (!headers['content-type']) {
      headers['content-type'] = 'application/json';
    }
  }

  try {
    const upstream = await fetchWithProxy(targetUrl, init);
    const body = await upstream.text();
    res.status(upstream.status);
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('content-type', contentType);
    res.send(body);
  } catch (e) {
    console.error('[proxy]', targetUrl, e);
    res.status(502).json({ error: e.message });
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, allowedCorsOrigins().includes(origin));
    },
  }),
);
app.use(express.json());

app.options('/api/oauth/access_token', (req, res) => {
  applyCorsHeaders(req, res);
  res.status(200).send('OK');
});

app.post('/api/oauth/access_token', async (req, res) => {
  const requestBody = { ...req.body };
  if (!requestBody.client_secret) {
    requestBody.client_secret = process.env.VITE_GITSTARS_CLIENT_SECRET;
  }

  try {
    const githubRes = await fetchWithProxy('https://github.com/login/oauth/access_token', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    const data = await githubRes.json();
    applyCorsHeaders(req, res);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Browser → VPS container → mihomo:17890 → GitHub API
app.use('/api/github', (req, res) => proxyGitHubRequest(req, res, 'https://api.github.com'));
app.use('/api/github-raw', (req, res) => proxyGitHubRequest(req, res, 'https://raw.githubusercontent.com'));

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (PROXY_URL) console.log(`GitHub outbound proxy: ${PROXY_URL}`);
});
