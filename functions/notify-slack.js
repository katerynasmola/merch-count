exports.handler = async (event) => {
  try {
    const { webhook, text } = JSON.parse(event.body || '{}');
    if (!webhook || !text) return { statusCode: 400, body: 'Missing webhook or text' };
    const r = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return { statusCode: r.ok ? 200 : 502, body: r.ok ? 'ok' : 'Slack error' };
  } catch {
    return { statusCode: 500, body: 'error' };
  }
};
