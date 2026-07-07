import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.SERVER_PORT || 8080;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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
    // Node 18+ fetch respects HTTP_PROXY/HTTPS_PROXY when set on the container.
    const githubRes = await fetch('https://github.com/login/oauth/access_token', {
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

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
