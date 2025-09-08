exports.handler = async () => {
  try {
    const siteId = process.env.SITE_ID || 'default';
    const key = `inventory-${siteId}.json`;
    const url = `https://api.netlify.com/api/v1/blobs/${key}`;
    const token = process.env.NETLIFY_TOKEN;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(url, { headers });
    if (res.status === 404) {
      return { statusCode: 200, body: JSON.stringify({}) };
    }
    if (!res.ok) return { statusCode: 502, body: 'blob fetch error' };
    const json = await res.json();
    return { statusCode: 200, body: JSON.stringify(json) };
  } catch (e) {
    return { statusCode: 500, body: 'error' };
  }
};


