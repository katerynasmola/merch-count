export async function handler(event) {
  try {
    const { webhook, text } = JSON.parse(event.body || '{}');
    if (!webhook || !text) {
      return { statusCode: 400, body: 'Missing webhook or text' };
    }
    
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      console.error('Slack webhook error:', response.status, response.statusText);
      return { statusCode: 502, body: 'Slack error' };
    }
    
    return { 
      statusCode: 200, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Notify slack error:', error);
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
}
