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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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

app.use(cors());
app.use(express.json());

app.options('/api/oauth/access_token', (_req, res) => {
  res.set(CORS_HEADERS).status(200).send('OK');
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
    res.set(CORS_HEADERS).json(data);
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
