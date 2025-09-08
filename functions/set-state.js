exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const body = JSON.parse(event.body || '{}');
    const siteId = process.env.SITE_ID || 'default';
    const key = `inventory-${siteId}.json`;
    const url = `https://api.netlify.com/api/v1/blobs/${key}`;
    const token = process.env.NETLIFY_TOKEN;
    if (!token) return { statusCode: 500, body: 'missing token' };
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { statusCode: 502, body: 'blob write error' };
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    return { statusCode: 500, body: 'error' };
  }
};


