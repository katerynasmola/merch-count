exports.handler = async (event) => {
  try {
    const { webhook, text } = JSON.parse(event.body || '{}');
    if (!webhook || !text) {
      return { statusCode: 400, body: 'Missing webhook or text' };
    }
    const r = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!r.ok) {
      return { statusCode: 502, body: 'Slack error' };
    }
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    return { statusCode: 500, body: 'error' };
  }
};


