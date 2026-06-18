// Vercel serverless function — /api/whoop-token
// Handles WHOOP OAuth token exchange and refresh server-side
// (WHOOP's token endpoint blocks direct browser requests due to CORS)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://whoop-kelvin.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId     = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'WHOOP credentials not configured on server' });
  }

  try {
    const body = req.body;
    const params = new URLSearchParams();
    params.set('client_id',     clientId);
    params.set('client_secret', clientSecret);

    if (body.grant_type === 'authorization_code') {
      params.set('grant_type',    'authorization_code');
      params.set('code',          body.code);
      params.set('redirect_uri',  body.redirect_uri);
      if (body.code_verifier) params.set('code_verifier', body.code_verifier);
    } else if (body.grant_type === 'refresh_token') {
      params.set('grant_type',    'refresh_token');
      params.set('refresh_token', body.refresh_token);
      if (body.scope) params.set('scope', body.scope);
    } else {
      return res.status(400).json({ error: 'Unsupported grant_type' });
    }

    const whoopRes = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    });

    const data = await whoopRes.json();
    return res.status(whoopRes.ok ? 200 : whoopRes.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
